<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AdjustStockRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'product_id' => ['required', 'exists:products,id'],
            'warehouse_id' => ['required', 'exists:warehouses,id'],
            // Delta: positive adds stock, negative removes (never below zero).
            'qty' => ['required', 'numeric', 'not_in:0'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
