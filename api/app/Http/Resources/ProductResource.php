<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'sku' => $this->sku,
            'category_id' => $this->category_id,
            'category' => new CategoryResource($this->whenLoaded('category')),
            'unit' => $this->unit,
            'purchase_price' => (float) $this->purchase_price,
            'sale_price' => (float) $this->sale_price,
            'reorder_level' => (int) $this->reorder_level,
            'total_stock' => $this->when(isset($this->total_stock), (float) $this->total_stock),
            'stock_levels' => StockLevelResource::collection($this->whenLoaded('stockLevels')),
            'is_low_stock' => $this->when(isset($this->total_stock), $this->total_stock <= $this->reorder_level),
            'created_at' => $this->created_at,
        ];
    }
}
