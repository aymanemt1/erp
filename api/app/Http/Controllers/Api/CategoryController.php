<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CategoryRequest;
use App\Http\Resources\CategoryResource;
use App\Models\Category;

class CategoryController extends Controller
{
    public function index()
    {
        $categories = Category::withCount('products')->orderBy('name')->paginate(15);

        return CategoryResource::collection($categories);
    }

    public function store(CategoryRequest $request)
    {
        return new CategoryResource(Category::create($request->validated()));
    }

    public function show(Category $category)
    {
        return new CategoryResource($category->loadCount('products'));
    }

    public function update(CategoryRequest $request, Category $category)
    {
        $category->update($request->validated());

        return new CategoryResource($category);
    }

    public function destroy(Category $category)
    {
        if ($category->products()->exists()) {
            return response()->json(['message' => 'Cannot delete a category that has products.'], 422);
        }

        $category->delete();

        return response()->json(null, 204);
    }
}
