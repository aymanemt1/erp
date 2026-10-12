<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;

class AlertController extends Controller
{
    /**
     * Products whose total stock across all warehouses is at or
     * below their reorder level, with a per-warehouse breakdown.
     */
    public function lowStock()
    {
        $products = Product::with(['category', 'stockLevels.warehouse'])
            ->withSum('stockLevels as total_stock', 'qty')
            ->get()
            ->filter(fn ($p) => (float) ($p->total_stock ?? 0) <= $p->reorder_level)
            ->values();

        return response()->json([
            'count' => $products->count(),
            'products' => $products->map(fn ($p) => [
                'id' => $p->id,
                'name' => $p->name,
                'sku' => $p->sku,
                'unit' => $p->unit,
                'reorder_level' => (int) $p->reorder_level,
                'total_stock' => (float) ($p->total_stock ?? 0),
                'breakdown' => $p->stockLevels->map(fn ($l) => [
                    'warehouse_id' => $l->warehouse_id,
                    'warehouse' => $l->warehouse->name,
                    'qty' => (float) $l->qty,
                ])->values(),
            ]),
        ]);
    }
}
