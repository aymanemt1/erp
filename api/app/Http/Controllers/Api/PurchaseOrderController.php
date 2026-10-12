<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\PurchaseOrderRequest;
use App\Http\Resources\PurchaseOrderResource;
use App\Models\Product;
use App\Models\PurchaseOrder;
use App\Models\Warehouse;
use App\Services\NumberService;
use App\Services\StockService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PurchaseOrderController extends Controller
{
    public function __construct(protected StockService $stock) {}

    public function index(Request $request)
    {
        $query = PurchaseOrder::with(['supplier', 'warehouse'])->orderByDesc('id');

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }
        if ($request->filled('supplier_id')) {
            $query->where('supplier_id', $request->integer('supplier_id'));
        }

        return PurchaseOrderResource::collection($query->paginate(15));
    }

    public function store(PurchaseOrderRequest $request)
    {
        $data = $request->validated();

        $po = DB::transaction(function () use ($data, $request) {
            $totals = $this->totals($data['items'], $data['tax_rate'] ?? 0);

            $po = PurchaseOrder::create([
                'number' => NumberService::next('purchase_order'),
                'supplier_id' => $data['supplier_id'],
                'warehouse_id' => $data['warehouse_id'],
                'status' => 'draft',
                'subtotal' => $totals['subtotal'],
                'tax_rate' => $data['tax_rate'] ?? 0,
                'tax_amount' => $totals['tax_amount'],
                'total' => $totals['total'],
                'notes' => $data['notes'] ?? null,
                'user_id' => $request->user()->id,
            ]);

            foreach ($totals['lines'] as $line) {
                $po->items()->create($line);
            }

            return $po;
        });

        return new PurchaseOrderResource($po->load(['supplier', 'warehouse', 'items.product']));
    }

    public function show(PurchaseOrder $purchaseOrder)
    {
        return new PurchaseOrderResource(
            $purchaseOrder->load(['supplier', 'warehouse', 'items.product'])
        );
    }

    public function update(PurchaseOrderRequest $request, PurchaseOrder $purchaseOrder)
    {
        if ($purchaseOrder->status !== 'draft') {
            return response()->json(['message' => 'Only draft purchase orders can be edited.'], 422);
        }

        $data = $request->validated();

        $purchaseOrder = DB::transaction(function () use ($data, $purchaseOrder) {
            $totals = $this->totals($data['items'], $data['tax_rate'] ?? 0);

            $purchaseOrder->update([
                'supplier_id' => $data['supplier_id'],
                'warehouse_id' => $data['warehouse_id'],
                'subtotal' => $totals['subtotal'],
                'tax_rate' => $data['tax_rate'] ?? 0,
                'tax_amount' => $totals['tax_amount'],
                'total' => $totals['total'],
                'notes' => $data['notes'] ?? null,
            ]);

            $purchaseOrder->items()->delete();
            foreach ($totals['lines'] as $line) {
                $purchaseOrder->items()->create($line);
            }

            return $purchaseOrder;
        });

        return new PurchaseOrderResource($purchaseOrder->load(['supplier', 'warehouse', 'items.product']));
    }

    public function destroy(PurchaseOrder $purchaseOrder)
    {
        if ($purchaseOrder->status !== 'draft') {
            return response()->json(['message' => 'Only draft purchase orders can be deleted.'], 422);
        }

        $purchaseOrder->delete();

        return response()->json(null, 204);
    }

    /** draft -> ordered */
    public function confirm(PurchaseOrder $purchaseOrder)
    {
        if ($purchaseOrder->status !== 'draft') {
            return response()->json(['message' => 'Only draft purchase orders can be confirmed.'], 422);
        }

        $purchaseOrder->update(['status' => 'ordered']);

        return new PurchaseOrderResource($purchaseOrder->load(['supplier', 'warehouse', 'items.product']));
    }

    /** ordered -> received : books the goods into stock */
    public function receive(Request $request, PurchaseOrder $purchaseOrder)
    {
        if ($purchaseOrder->status !== 'ordered') {
            return response()->json(['message' => 'Only ordered purchase orders can be received.'], 422);
        }

        DB::transaction(function () use ($purchaseOrder, $request) {
            $warehouse = $purchaseOrder->warehouse;

            foreach ($purchaseOrder->items as $item) {
                $this->stock->add(
                    $item->product,
                    $warehouse,
                    (float) $item->qty,
                    'in',
                    $purchaseOrder->number,
                    "Received from purchase order {$purchaseOrder->number}",
                    $request->user()->id
                );
            }

            $purchaseOrder->update(['status' => 'received']);
        });

        return new PurchaseOrderResource($purchaseOrder->load(['supplier', 'warehouse', 'items.product']));
    }

    /** draft|ordered -> cancelled (nothing to restore: goods were never booked in) */
    public function cancel(PurchaseOrder $purchaseOrder)
    {
        if (! in_array($purchaseOrder->status, ['draft', 'ordered'], true)) {
            return response()->json(['message' => 'Only draft or ordered purchase orders can be cancelled.'], 422);
        }

        $purchaseOrder->update(['status' => 'cancelled']);

        return new PurchaseOrderResource($purchaseOrder->load(['supplier', 'warehouse', 'items.product']));
    }

    /**
     * Compute totals from items. unit_price falls back to the
     * product's purchase_price when not supplied (price snapshot).
     */
    protected function totals(array $items, float $taxRate): array
    {
        $subtotal = 0;
        $lines = [];

        foreach ($items as $item) {
            $product = Product::findOrFail($item['product_id']);
            $unitPrice = isset($item['unit_price']) ? (float) $item['unit_price'] : (float) $product->purchase_price;
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
        $taxAmount = round($subtotal * $taxRate / 100, 2);

        return [
            'lines' => $lines,
            'subtotal' => $subtotal,
            'tax_amount' => $taxAmount,
            'total' => round($subtotal + $taxAmount, 2),
        ];
    }
}
