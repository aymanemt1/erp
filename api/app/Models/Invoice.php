<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Invoice extends Model
{
    protected $fillable = [
        'number', 'client_id', 'warehouse_id', 'status', 'discount', 'tax_rate',
        'subtotal', 'tax_amount', 'total', 'amount_paid', 'due_date', 'notes', 'user_id',
    ];

    protected function casts(): array
    {
        return [
            'discount' => 'decimal:2',
            'tax_rate' => 'decimal:2',
            'subtotal' => 'decimal:2',
            'tax_amount' => 'decimal:2',
            'total' => 'decimal:2',
            'amount_paid' => 'decimal:2',
            'due_date' => 'date',
        ];
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(InvoiceItem::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function balance(): float
    {
        return round((float) $this->total - (float) $this->amount_paid, 2);
    }

    public function isFullyPaid(): bool
    {
        return $this->balance() <= 0;
    }

    public function isOverdue(): bool
    {
        return in_array($this->status, ['sent', 'overdue'], true)
            && $this->due_date
            && $this->due_date->isPast()
            && ! $this->isFullyPaid();
    }

    public function scopeOverdue(Builder $query): Builder
    {
        return $query->whereIn('status', ['sent', 'overdue'])
            ->whereNotNull('due_date')
            ->whereDate('due_date', '<', now()->toDateString())
            ->whereColumn('amount_paid', '<', 'total');
    }

    public function scopeUnpaid(Builder $query): Builder
    {
        return $query->whereIn('status', ['sent', 'overdue'])
            ->whereColumn('amount_paid', '<', 'total');
    }
}
