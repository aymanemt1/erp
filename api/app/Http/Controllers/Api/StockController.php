<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\AdjustStockRequest;
use App\Http\Requests\TransferStockRequest;
use App\Http\Resources\StockLevelResource;
use App\Http\Resources\StockMovementResource;
use App\Models\Product;
use App\Models\StockLevel;
use App\Models\StockMovement;
use App\Models\Warehouse;
use App\Services\StockService;
use Illuminate\Http\Request;

class StockController extends Controller
{
    public function __construct(protected StockService $stock) {}

    public function levels(Request $request)
    {
        $query = StockLevel::with(['product.category', 'warehouse']);

        if ($request->filled('product_id')) {
            $query->where('product_id', $request->integer('product_id'));
        }
        if ($request->filled('warehouse_id')) {
            $query->where('warehouse_id', $request->integer('warehouse_id'));
        }

        return StockLevelResource::collection($query->paginate(20));
    }

    public function movements(Request $request)
    {
        $query = StockMovement::with(['product', 'warehouse', 'user'])
            ->orderByDesc('id');

        if ($request->filled('product_id')) {
            $query->where('product_id', $request->integer('product_id'));
        }
        if ($request->filled('warehouse_id')) {
            $query->where('warehouse_id', $request->integer('warehouse_id'));
        }
        if ($request->filled('type')) {
            $query->where('type', $request->string('type'));
        }

        return StockMovementResource::collection($query->paginate(20));
    }

    public function transfer(TransferStockRequest $request)
    {
        $data = $request->validated();

        [$out, $in] = $this->stock->transfer(
            Product::findOrFail($data['product_id']),
            Warehouse::findOrFail($data['from_warehouse_id']),
            Warehouse::findOrFail($data['to_warehouse_id']),
            (float) $data['qty'],
            $data['notes'] ?? null,
            $request->user()->id
        );

        return response()->json([
            'message' => 'Stock transferred.',
            'movements' => StockMovementResource::collection(collect([$out, $in])),
        ], 201);
    }

    public function adjust(AdjustStockRequest $request)
    {
        $data = $request->validated();

        $movement = $this->stock->adjust(
            Product::findOrFail($data['product_id']),
            Warehouse::findOrFail($data['warehouse_id']),
            (float) $data['qty'],
            $data['notes'] ?? null,
            $request->user()->id
        );

        return response()->json([
            'message' => 'Stock adjusted.',
            'movement' => new StockMovementResource($movement),
        ], 201);
    }
}
