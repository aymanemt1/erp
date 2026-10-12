<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\InvoiceRequest;
use App\Http\Resources\InvoiceResource;
use App\Models\Invoice;
use App\Models\Product;
use App\Models\Setting;
use App\Services\NumberService;
use App\Services\StockService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class InvoiceController extends Controller
{
    public function __construct(protected StockService $stock) {}

    public function index(Request $request)
    {
        $query = Invoice::with(['client', 'warehouse'])->orderByDesc('id');

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }
        if ($request->filled('client_id')) {
            $query->where('client_id', $request->integer('client_id'));
        }
        if ($request->boolean('overdue')) {
            $query->overdue();
        }

        return InvoiceResource::collection($query->paginate(15));
    }

    public function store(InvoiceRequest $request)
    {
        $data = $request->validated();

        $invoice = DB::transaction(function () use ($data, $request) {
            $totals = $this->totals($data['items'], $data['discount'] ?? 0, $data['tax_rate'] ?? (float) Setting::get('tax_rate', 20));

            $invoice = Invoice::create([
                'number' => NumberService::next('invoice'),
                'client_id' => $data['client_id'],
                'warehouse_id' => $data['warehouse_id'],
                'status' => 'draft',
                'discount' => $totals['discount'],
                'tax_rate' => $totals['tax_rate'],
                'subtotal' => $totals['subtotal'],
                'tax_amount' => $totals['tax_amount'],
                'total' => $totals['total'],
                'due_date' => $data['due_date'] ?? now()->addDays(30)->toDateString(),
                'notes' => $data['notes'] ?? null,
                'user_id' => $request->user()->id,
            ]);

            foreach ($totals['lines'] as $line) {
                $invoice->items()->create($line);
            }

            return $invoice;
        });

        return new InvoiceResource($invoice->load(['client', 'warehouse', 'items.product']));
    }

    public function show(Invoice $invoice)
    {
        return new InvoiceResource($invoice->load(['client', 'warehouse', 'items.product', 'payments']));
    }

    public function update(InvoiceRequest $request, Invoice $invoice)
    {
        if ($invoice->status !== 'draft') {
            return response()->json(['message' => 'Only draft invoices can be edited.'], 422);
        }

        $data = $request->validated();

        $invoice = DB::transaction(function () use ($data, $invoice) {
            $totals = $this->totals($data['items'], $data['discount'] ?? 0, $data['tax_rate'] ?? (float) $invoice->tax_rate);

            $invoice->update([
                'client_id' => $data['client_id'],
                'warehouse_id' => $data['warehouse_id'],
                'discount' => $totals['discount'],
                'tax_rate' => $totals['tax_rate'],
                'subtotal' => $totals['subtotal'],
                'tax_amount' => $totals['tax_amount'],
                'total' => $totals['total'],
                'due_date' => $data['due_date'] ?? $invoice->due_date,
                'notes' => $data['notes'] ?? null,
            ]);

            $invoice->items()->delete();
            foreach ($totals['lines'] as $line) {
                $invoice->items()->create($line);
            }

            return $invoice;
        });

        return new InvoiceResource($invoice->load(['client', 'warehouse', 'items.product']));
    }

    public function destroy(Invoice $invoice)
    {
        if ($invoice->status !== 'draft') {
            return response()->json(['message' => 'Only draft invoices can be deleted.'], 422);
        }

        $invoice->delete();

        return response()->json(null, 204);
    }

    /**
     * draft -> sent. Verifies stock for every line first, then
     * deducts it (out movements). All-or-nothing.
     */
    public function send(Request $request, Invoice $invoice)
    {
        if ($invoice->status !== 'draft') {
            return response()->json(['message' => 'Only draft invoices can be sent.'], 422);
        }

        DB::transaction(function () use ($invoice, $request) {
            $warehouse = $invoice->warehouse;

            // Lock every involved stock row and verify availability up front.
            foreach ($invoice->items as $item) {
                $level = $this->stock->level($item->product_id, $warehouse->id, true);
                if ((float) $level->qty < (float) $item->qty) {
                    throw ValidationException::withMessages([
                        'stock' => ["Insufficient stock for {$item->product->name} in {$warehouse->name} (need {$item->qty}, have {$level->qty})."],
                    ]);
                }
            }

            foreach ($invoice->items as $item) {
                $this->stock->remove(
                    $item->product,
                    $warehouse,
                    (float) $item->qty,
                    'out',
                    $invoice->number,
                    "Invoice {$invoice->number} sent",
                    $request->user()->id
                );
            }

            $invoice->update(['status' => 'sent']);
        });

        return new InvoiceResource($invoice->load(['client', 'warehouse', 'items.product']));
    }

    /**
     * sent -> cancelled. Puts the invoiced quantities back into stock.
     */
    public function cancel(Request $request, Invoice $invoice)
    {
        if (! in_array($invoice->status, ['draft', 'sent'], true)) {
            return response()->json(['message' => 'Only draft or sent invoices can be cancelled.'], 422);
        }

        DB::transaction(function () use ($invoice, $request) {
            if ($invoice->status === 'sent') {
                $warehouse = $invoice->warehouse;

                foreach ($invoice->items as $item) {
                    $this->stock->add(
                        $item->product,
                        $warehouse,
                        (float) $item->qty,
                        'in',
                        $invoice->number,
                        "Invoice {$invoice->number} cancelled — stock restored",
                        $request->user()->id
                    );
                }
            }

            $invoice->update(['status' => 'cancelled']);
        });

        return new InvoiceResource($invoice->load(['client', 'warehouse', 'items.product']));
    }

    /** Stream a printable PDF of the invoice. */
    public function pdf(Invoice $invoice)
    {
        $invoice->load(['client', 'warehouse', 'items.product']);
        $settings = Setting::allKeyed();

        $pdf = Pdf::loadView('invoices.pdf', [
            'invoice' => $invoice,
            'settings' => $settings,
        ]);

        return $pdf->stream("{$invoice->number}.pdf");
    }

    protected function totals(array $items, float $discount, float $taxRate): array
    {
        $subtotal = 0;
        $lines = [];

        foreach ($items as $item) {
            $product = Product::findOrFail($item['product_id']);
            $unitPrice = isset($item['unit_price']) ? (float) $item['unit_price'] : (float) $product->sale_price;
            $qty = (float) $item['qty'];
            $lineTotal = round($qty * $unitPrice, 2);
            $subtotal += $lineTotal;

            $lines[] = [
                'product_id' => $product->id,
                'qty' => $qty,
                'unit_price' => $unitPrice,
                'line_total' => $lineTotal,
            ];
        }

        $subtotal = round($subtotal, 2);
        $afterDiscount = max(0, round($subtotal - $discount, 2));
        $taxAmount = round($afterDiscount * $taxRate / 100, 2);

        return [
            'lines' => $lines,
            'subtotal' => $subtotal,
            'discount' => round($discount, 2),
            'tax_rate' => $taxRate,
            'tax_amount' => $taxAmount,
            'total' => round($afterDiscount + $taxAmount, 2),
        ];
    }
}
