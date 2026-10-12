<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StockMovementResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'product' => new ProductResource($this->whenLoaded('product')),
            'warehouse' => new WarehouseResource($this->whenLoaded('warehouse')),
            'type' => $this->type,
            'direction' => $this->direction,
            'qty' => (float) $this->qty,
            'reference' => $this->reference,
            'notes' => $this->notes,
            'created_at' => $this->created_at,
        ];
    }
}
