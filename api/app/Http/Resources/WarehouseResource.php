<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class WarehouseResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'location' => $this->location,
            'is_default' => (bool) $this->is_default,
            'stock_value' => $this->when(isset($this->stock_value), (float) $this->stock_value),
            'created_at' => $this->created_at,
        ];
    }
}
