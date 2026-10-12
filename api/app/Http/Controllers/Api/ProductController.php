<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ProductRequest;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use App\Services\NumberService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        $query = Product::with('category')
            ->withSum('stockLevels as total_stock', 'qty');

        if ($request->filled('search')) {
            $search = $request->string('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('sku', 'like', "%{$search}%");
            });
        }

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->integer('category_id'));
        }

        return ProductResource::collection($query->orderBy('name')->paginate(15));
    }

    public function store(ProductRequest $request)
    {
        $data = $request->validated();

        if (empty($data['sku'])) {
            $data['sku'] = NumberService::next('sku');
        }

        $product = Product::create($data);

        return new ProductResource($product->load('category'));
    }

    public function show(Product $product)
    {
        $product->load(['category', 'stockLevels.warehouse']);
        $product->total_stock = $product->totalStock();

        return new ProductResource($product);
    }

    public function update(ProductRequest $request, Product $product)
    {
        $product->update($request->validated());

        return new ProductResource($product->load('category'));
    }

    public function destroy(Product $product)
    {
        $hasStock = $product->stockLevels()->where('qty', '>', 0)->exists();
        $hasMovements = $product->movements()->exists();
        $hasDocs = DB::table('purchase_order_items')->where('product_id', $product->id)->exists()
            || DB::table('quotation_items')->where('product_id', $product->id)->exists()
            || DB::table('invoice_items')->where('product_id', $product->id)->exists();

        if ($hasStock || $hasMovements || $hasDocs) {
            return response()->json(['message' => 'Cannot delete a product with stock history or documents.'], 422);
        }

        $product->delete();

        return response()->json(null, 204);
    }
}
