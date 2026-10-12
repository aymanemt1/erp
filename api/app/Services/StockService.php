<?php

namespace App\Services;

use App\Models\Product;
use App\Models\StockLevel;
use App\Models\StockMovement;
use App\Models\Warehouse;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Central place for every stock mutation. All methods run inside a
 * transaction and lock the stock_levels rows so concurrent requests
 * can never drive stock negative.
 */
class StockService
{
    /**
     * Get (and lock) the stock level row for a product/warehouse,
     * creating it at 0 when it does not exist yet.
     */
    public function level(int $productId, int $warehouseId, bool $lock = false): StockLevel
    {
        $query = StockLevel::where('product_id', $productId)
            ->where('warehouse_id', $warehouseId);

        if ($lock) {
            $query->lockForUpdate();
        }

        return $query->firstOrCreate(
            ['product_id' => $productId, 'warehouse_id' => $warehouseId],
            ['qty' => 0]
        );
    }

    public function available(int $productId, int $warehouseId): float
    {
        return (float) StockLevel::where('product_id', $productId)
            ->where('warehouse_id', $warehouseId)
            ->value('qty') ?? 0.0;
    }

    /**
     * Add stock (purchase receipt, invoice cancellation, positive adjustment...).
     */
    public function add(
        Product $product,
        Warehouse $warehouse,
        float $qty,
        string $type,
        ?string $reference = null,
        ?string $notes = null,
        ?int $userId = null
    ): StockMovement {
        if ($qty <= 0) {
            throw ValidationException::withMessages(['qty' => 'Quantity must be greater than zero.']);
        }

        return DB::transaction(function () use ($product, $warehouse, $qty, $type, $reference, $notes, $userId) {
            $level = $this->level($product->id, $warehouse->id, true);
            $level->increment('qty', $qty);

            return $this->record($product, $warehouse, $type, 'in', $qty, $reference, $notes, $userId);
        });
    }

    /**
     * Remove stock (sale, transfer out, negative adjustment...).
     * Throws when there is not enough stock — nothing is persisted.
     */
    public function remove(
        Product $product,
        Warehouse $warehouse,
        float $qty,
        string $type,
        ?string $reference = null,
        ?string $notes = null,
        ?int $userId = null
    ): StockMovement {
        if ($qty <= 0) {
            throw ValidationException::withMessages(['qty' => 'Quantity must be greater than zero.']);
        }

        return DB::transaction(function () use ($product, $warehouse, $qty, $type, $reference, $notes, $userId) {
            $level = $this->level($product->id, $warehouse->id, true);

            if ((float) $level->qty < $qty) {
                throw ValidationException::withMessages([
                    'qty' => "Insufficient stock for {$product->name} in {$warehouse->name} (available: {$level->qty}).",
                ]);
            }

            $level->decrement('qty', $qty);

            return $this->record($product, $warehouse, $type, 'out', $qty, $reference, $notes, $userId);
        });
    }

    /**
     * Move stock between two warehouses atomically: either both
     * legs happen or neither does.
     */
    public function transfer(
        Product $product,
        Warehouse $from,
        Warehouse $to,
        float $qty,
        ?string $notes = null,
        ?int $userId = null
    ): array {
        if ($from->id === $to->id) {
            throw ValidationException::withMessages([
                'to_warehouse_id' => 'Source and destination warehouses must differ.',
            ]);
        }

        if ($qty <= 0) {
            throw ValidationException::withMessages(['qty' => 'Quantity must be greater than zero.']);
        }

        return DB::transaction(function () use ($product, $from, $to, $qty, $notes, $userId) {
            // Lock in a stable order to avoid deadlocks.
            $ids = [$from->id, $to->id];
            sort($ids);
            foreach ($ids as $id) {
                $this->level($product->id, $id, true);
            }

            $fromLevel = $this->level($product->id, $from->id);
            if ((float) $fromLevel->qty < $qty) {
                throw ValidationException::withMessages([
                    'qty' => "Insufficient stock for {$product->name} in {$from->name} (available: {$fromLevel->qty}).",
                ]);
            }

            $reference = 'TRF-' . now()->format('YmdHis');

            $fromLevel->decrement('qty', $qty);
            $out = $this->record($product, $from, 'transfer', 'out', $qty, $reference, $notes, $userId);

            $toLevel = $this->level($product->id, $to->id);
            $toLevel->increment('qty', $qty);
            $in = $this->record($product, $to, 'transfer', 'in', $qty, $reference, $notes, $userId);

            return [$out, $in];
        });
    }

    /**
     * Manual stock correction. $qty is a delta: positive adds,
     * negative removes (never below zero).
     */
    public function adjust(
        Product $product,
        Warehouse $warehouse,
        float $qty,
        ?string $notes = null,
        ?int $userId = null
    ): StockMovement {
        if ($qty == 0) {
            throw ValidationException::withMessages(['qty' => 'Adjustment quantity cannot be zero.']);
        }

        return $qty > 0
            ? $this->add($product, $warehouse, $qty, 'adjustment', null, $notes, $userId)
            : $this->remove($product, $warehouse, abs($qty), 'adjustment', null, $notes, $userId);
    }

    protected function record(
        Product $product,
        Warehouse $warehouse,
        string $type,
        string $direction,
        float $qty,
        ?string $reference,
        ?string $notes,
        ?int $userId
    ): StockMovement {
        return StockMovement::create([
            'product_id' => $product->id,
            'warehouse_id' => $warehouse->id,
            'type' => $type,
            'direction' => $direction,
            'qty' => $qty,
            'reference' => $reference,
            'notes' => $notes,
            'user_id' => $userId,
        ]);
    }
}
