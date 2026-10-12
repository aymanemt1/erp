<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\QuotationRequest;
use App\Http\Resources\InvoiceResource;
use App\Http\Resources\QuotationResource;
use App\Models\Invoice;
use App\Models\Product;
use App\Models\Quotation;
use App\Models\Setting;
use App\Services\NumberService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class QuotationController extends Controller
{
    public function index(Request $request)
    {
        $query = Quotation::with('client')->orderByDesc('id');

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }
        if ($request->filled('client_id')) {
            $query->where('client_id', $request->integer('client_id'));
        }

        return QuotationResource::collection($query->paginate(15));
    }

    public function store(QuotationRequest $request)
    {
        $data = $request->validated();

        $quotation = DB::transaction(function () use ($data, $request) {
            $totals = $this->totals($data['items'], $data['discount'] ?? 0, $data['tax_rate'] ?? (float) Setting::get('tax_rate', 20));

            $quotation = Quotation::create([
                'number' => NumberService::next('quotation'),
                'client_id' => $data['client_id'],
                'status' => 'draft',
                'discount' => $totals['discount'],
                'tax_rate' => $totals['tax_rate'],
                'subtotal' => $totals['subtotal'],
                'tax_amount' => $totals['tax_amount'],
                'total' => $totals['total'],
                'valid_until' => $data['valid_until'] ?? now()->addDays(30)->toDateString(),
                'notes' => $data['notes'] ?? null,
                'user_id' => $request->user()->id,
            ]);

            foreach ($totals['lines'] as $line) {
                $quotation->items()->create($line);
            }

            return $quotation;
        });

        return new QuotationResource($quotation->load(['client', 'items.product']));
    }

    public function show(Quotation $quotation)
    {
        return new QuotationResource($quotation->load(['client', 'items.product']));
    }

    public function update(QuotationRequest $request, Quotation $quotation)
    {
        if ($quotation->status !== 'draft') {
            return response()->json(['message' => 'Only draft quotations can be edited.'], 422);
        }

        $data = $request->validated();

        $quotation = DB::transaction(function () use ($data, $quotation) {
            $totals = $this->totals($data['items'], $data['discount'] ?? 0, $data['tax_rate'] ?? (float) $quotation->tax_rate);

            $quotation->update([
                'client_id' => $data['client_id'],
                'discount' => $totals['discount'],
                'tax_rate' => $totals['tax_rate'],
                'subtotal' => $totals['subtotal'],
                'tax_amount' => $totals['tax_amount'],
                'total' => $totals['total'],
                'valid_until' => $data['valid_until'] ?? $quotation->valid_until,
                'notes' => $data['notes'] ?? null,
            ]);

            $quotation->items()->delete();
            foreach ($totals['lines'] as $line) {
                $quotation->items()->create($line);
            }

            return $quotation;
        });

        return new QuotationResource($quotation->load(['client', 'items.product']));
    }

    public function destroy(Quotation $quotation)
    {
        if ($quotation->status !== 'draft') {
            return response()->json(['message' => 'Only draft quotations can be deleted.'], 422);
        }

        $quotation->delete();

        return response()->json(null, 204);
    }

    /** draft -> sent */
    public function send(Quotation $quotation)
    {
        if ($quotation->status !== 'draft') {
            return response()->json(['message' => 'Only draft quotations can be sent.'], 422);
        }

        $quotation->update(['status' => 'sent']);

        return new QuotationResource($quotation->load(['client', 'items.product']));
    }

    /** sent -> rejected */
    public function reject(Quotation $quotation)
    {
        if ($quotation->status !== 'sent') {
            return response()->json(['message' => 'Only sent quotations can be rejected.'], 422);
        }

        $quotation->update(['status' => 'rejected']);

        return new QuotationResource($quotation->load(['client', 'items.product']));
    }

    /**
     * sent -> accepted. Spawns a draft invoice copying the
     * quotation lines (price snapshots preserved).
     */
    public function accept(Request $request, Quotation $quotation)
    {
        if ($quotation->status !== 'sent') {
            return response()->json(['message' => 'Only sent quotations can be accepted.'], 422);
        }

        $request->validate(['warehouse_id' => ['required', 'exists:warehouses,id']]);

        $invoice = DB::transaction(function () use ($quotation, $request) {
            $invoice = Invoice::create([
                'number' => NumberService::next('invoice'),
                'client_id' => $quotation->client_id,
                'warehouse_id' => $request->integer('warehouse_id'),
                'status' => 'draft',
                'discount' => $quotation->discount,
                'tax_rate' => $quotation->tax_rate,
                'subtotal' => $quotation->subtotal,
                'tax_amount' => $quotation->tax_amount,
                'total' => $quotation->total,
                'due_date' => now()->addDays(30)->toDateString(),
                'notes' => "From quotation {$quotation->number}",
                'user_id' => $request->user()->id,
            ]);

            foreach ($quotation->items as $item) {
                $invoice->items()->create([
                    'product_id' => $item->product_id,
                    'qty' => $item->qty,
                    'unit_price' => $item->unit_price,
                    'line_total' => $item->line_total,
                ]);
            }

            $quotation->update(['status' => 'accepted']);

            return $invoice;
        });

        return (new InvoiceResource($invoice->load(['client', 'warehouse', 'items.product'])))
            ->additional(['message' => 'Quotation accepted; draft invoice created.'])
            ->response()
            ->setStatusCode(201);
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
