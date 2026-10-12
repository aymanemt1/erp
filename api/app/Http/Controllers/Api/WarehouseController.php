<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\WarehouseRequest;
use App\Http\Resources\WarehouseResource;
use App\Models\Warehouse;
use Illuminate\Support\Facades\DB;

class WarehouseController extends Controller
{
    public function index()
    {
        $warehouses = Warehouse::orderBy('name')->paginate(15);

        // Attach live stock valuation per warehouse.
        $warehouses->getCollection()->transform(function ($w) {
            $w->stock_value = (float) DB::table('stock_levels')
                ->join('products', 'products.id', '=', 'stock_levels.product_id')
                ->where('stock_levels.warehouse_id', $w->id)
                ->sum(DB::raw('stock_levels.qty * products.purchase_price'));

            return $w;
        });

        return WarehouseResource::collection($warehouses);
    }

    public function store(WarehouseRequest $request)
    {
        $data = $request->validated();

        if (! empty($data['is_default'])) {
            Warehouse::query()->update(['is_default' => false]);
        }

        return new WarehouseResource(Warehouse::create($data));
    }

    public function show(Warehouse $warehouse)
    {
        return new WarehouseResource($warehouse);
    }

    public function update(WarehouseRequest $request, Warehouse $warehouse)
    {
        $data = $request->validated();

        if (! empty($data['is_default'])) {
            Warehouse::where('id', '!=', $warehouse->id)->update(['is_default' => false]);
        }

        $warehouse->update($data);

        return new WarehouseResource($warehouse);
    }

    public function destroy(Warehouse $warehouse)
    {
        if ($warehouse->stockLevels()->where('qty', '>', 0)->exists()) {
            return response()->json(['message' => 'Cannot delete a warehouse that holds stock.'], 422);
        }

        $warehouse->delete();

        return response()->json(null, 204);
    }
}
