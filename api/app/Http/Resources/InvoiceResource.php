<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class InvoiceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'number' => $this->number,
            'client' => new ClientResource($this->whenLoaded('client')),
            'warehouse' => new WarehouseResource($this->whenLoaded('warehouse')),
            'status' => $this->status,
            'discount' => (float) $this->discount,
            'tax_rate' => (float) $this->tax_rate,
            'subtotal' => (float) $this->subtotal,
            'tax_amount' => (float) $this->tax_amount,
            'total' => (float) $this->total,
            'amount_paid' => (float) $this->amount_paid,
            'balance' => $this->balance(),
            'is_overdue' => $this->isOverdue(),
            'due_date' => $this->due_date,
            'notes' => $this->notes,
            'items' => $this->whenLoaded('items', fn () => $this->items->map(fn ($i) => [
                'id' => $i->id,
                'product_id' => $i->product_id,
                'product' => new ProductResource($i->product),
                'qty' => (float) $i->qty,
                'unit_price' => (float) $i->unit_price,
                'line_total' => (float) $i->line_total,
            ])),
            'payments' => PaymentResource::collection($this->whenLoaded('payments')),
            'created_at' => $this->created_at,
        ];
    }
}
