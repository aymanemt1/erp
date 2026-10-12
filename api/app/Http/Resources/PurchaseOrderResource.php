<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PurchaseOrderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'number' => $this->number,
            'supplier' => new SupplierResource($this->whenLoaded('supplier')),
            'warehouse' => new WarehouseResource($this->whenLoaded('warehouse')),
            'status' => $this->status,
            'subtotal' => (float) $this->subtotal,
            'tax_rate' => (float) $this->tax_rate,
            'tax_amount' => (float) $this->tax_amount,
            'total' => (float) $this->total,
            'notes' => $this->notes,
            'items' => $this->whenLoaded('items', fn () => $this->items->map(fn ($i) => [
                'id' => $i->id,
                'product_id' => $i->product_id,
                'product' => new ProductResource($i->product),
                'qty' => (float) $i->qty,
                'unit_price' => (float) $i->unit_price,
                'line_total' => (float) $i->line_total,
            ])),
            'created_at' => $this->created_at,
        ];
    }
}
