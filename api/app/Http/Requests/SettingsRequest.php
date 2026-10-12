<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'company_name' => ['nullable', 'string', 'max:255'],
            'company_address' => ['nullable', 'string'],
            'company_phone' => ['nullable', 'string', 'max:50'],
            'company_email' => ['nullable', 'email', 'max:255'],
            'currency' => ['nullable', 'string', 'max:10'],
            'tax_rate' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'invoice_prefix' => ['nullable', 'string', 'max:10'],
            'quotation_prefix' => ['nullable', 'string', 'max:10'],
            'po_prefix' => ['nullable', 'string', 'max:10'],
        ];
    }
}
