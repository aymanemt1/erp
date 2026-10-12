<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\SupplierRequest;
use App\Http\Resources\SupplierResource;
use App\Models\Supplier;
use Illuminate\Http\Request;

class SupplierController extends Controller
{
    public function index(Request $request)
    {
        $query = Supplier::orderBy('name');

        if ($request->filled('search')) {
            $query->where('name', 'like', '%' . $request->string('search') . '%');
        }

        return SupplierResource::collection($query->paginate(15));
    }

    public function store(SupplierRequest $request)
    {
        return new SupplierResource(Supplier::create($request->validated()));
    }

    public function show(Supplier $supplier)
    {
        return new SupplierResource($supplier);
    }

    public function update(SupplierRequest $request, Supplier $supplier)
    {
        $supplier->update($request->validated());

        return new SupplierResource($supplier);
    }

    public function destroy(Supplier $supplier)
    {
        if ($supplier->purchaseOrders()->exists()) {
            return response()->json(['message' => 'Cannot delete a supplier with purchase orders.'], 422);
        }

        $supplier->delete();

        return response()->json(null, 204);
    }
}
