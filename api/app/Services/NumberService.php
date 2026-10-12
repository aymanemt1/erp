<?php

namespace App\Services;

use App\Models\Counter;
use App\Models\Setting;
use Illuminate\Support\Facades\DB;

/**
 * Sequential document numbering backed by the counters table.
 * The row lock guarantees no duplicates under concurrency.
 */
class NumberService
{
    public static function next(string $key): string
    {
        $prefix = match ($key) {
            'invoice' => Setting::get('invoice_prefix', 'INV'),
            'quotation' => Setting::get('quotation_prefix', 'QUO'),
            'purchase_order' => Setting::get('po_prefix', 'PO'),
            'sku' => 'SKU',
            default => strtoupper($key),
        };

        return DB::transaction(function () use ($key, $prefix) {
            $counter = Counter::where('key', $key)->lockForUpdate()->first();
            if (! $counter) {
                $counter = Counter::create(['key' => $key, 'value' => 0]);
            }
            $counter->increment('value');
            $counter->refresh();

            return sprintf('%s-%s-%04d', $prefix, now()->format('Y'), $counter->value);
        });
    }
}
