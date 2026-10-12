<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\Warehouse;

class StockTest extends ErpTestCase
{
    protected function stockOf(int $productId, int $warehouseId): float
    {
        return (float) \App\Models\StockLevel::where('product_id', $productId)
            ->where('warehouse_id', $warehouseId)->value('qty');
    }

    public function test_transfer_moves_stock_atomically_with_two_movements(): void
    {
        $headers = $this->manager();
        $product = Product::where('sku', 'PPR-A4-BOX')->firstOrFail();
        $main = Warehouse::where('name', 'Main Warehouse')->firstOrFail();
        $tangier = Warehouse::where('name', 'Tangier Depot')->firstOrFail();

        $beforeMain = $this->stockOf($product->id, $main->id);
        $beforeTangier = $this->stockOf($product->id, $tangier->id);

        $this->postJson('/api/stock/transfer', [
            'product_id' => $product->id,
            'from_warehouse_id' => $main->id,
            'to_warehouse_id' => $tangier->id,
            'qty' => 10,
        ], $headers)->assertCreated();

        $this->assertEquals($beforeMain - 10, $this->stockOf($product->id, $main->id));
        $this->assertEquals($beforeTangier + 10, $this->stockOf($product->id, $tangier->id));

        $movements = \App\Models\StockMovement::where('type', 'transfer')
            ->where('product_id', $product->id)->orderByDesc('id')->limit(2)->get();
        $this->assertCount(2, $movements);
        $this->assertEquals(['in', 'out'], $movements->pluck('direction')->sort()->values()->all());
    }

    public function test_transfer_fails_when_stock_insufficient_and_changes_nothing(): void
    {
        $headers = $this->manager();
        $product = Product::where('sku', 'TNR-X200')->firstOrFail(); // only 3 in main
        $main = Warehouse::where('name', 'Main Warehouse')->firstOrFail();
        $tangier = Warehouse::where('name', 'Tangier Depot')->firstOrFail();

        $beforeMain = $this->stockOf($product->id, $main->id);
        $beforeTangier = $this->stockOf($product->id, $tangier->id);

        $this->postJson('/api/stock/transfer', [
            'product_id' => $product->id,
            'from_warehouse_id' => $main->id,
            'to_warehouse_id' => $tangier->id,
            'qty' => 999,
        ], $headers)->assertStatus(422);

        $this->assertEquals($beforeMain, $this->stockOf($product->id, $main->id));
        $this->assertEquals($beforeTangier, $this->stockOf($product->id, $tangier->id));
    }

    public function test_transfer_to_same_warehouse_rejected(): void
    {
        $headers = $this->admin();
        $product = Product::firstOrFail();
        $main = Warehouse::where('name', 'Main Warehouse')->firstOrFail();

        $this->postJson('/api/stock/transfer', [
            'product_id' => $product->id,
            'from_warehouse_id' => $main->id,
            'to_warehouse_id' => $main->id,
            'qty' => 1,
        ], $headers)->assertStatus(422);
    }

    public function test_adjust_up_and_down_and_never_negative(): void
    {
        $headers = $this->manager();
        $product = Product::where('sku', 'TNR-X200')->firstOrFail();
        $main = Warehouse::where('name', 'Main Warehouse')->firstOrFail();
        $before = $this->stockOf($product->id, $main->id); // 3

        $this->postJson('/api/stock/adjust', [
            'product_id' => $product->id, 'warehouse_id' => $main->id, 'qty' => 7,
        ], $headers)->assertCreated();
        $this->assertEquals($before + 7, $this->stockOf($product->id, $main->id));

        // removing more than available is rejected, stock untouched
        $this->postJson('/api/stock/adjust', [
            'product_id' => $product->id, 'warehouse_id' => $main->id, 'qty' => -100,
        ], $headers)->assertStatus(422);
        $this->assertEquals($before + 7, $this->stockOf($product->id, $main->id));
    }

    public function test_staff_cannot_transfer_or_adjust(): void
    {
        $headers = $this->staff();
        $product = Product::firstOrFail();
        $main = Warehouse::where('name', 'Main Warehouse')->firstOrFail();

        $payload = ['product_id' => $product->id, 'warehouse_id' => $main->id, 'qty' => 1];
        $this->postJson('/api/stock/adjust', $payload, $headers)->assertForbidden();
        $this->postJson('/api/stock/transfer', $payload + [
            'from_warehouse_id' => $main->id, 'to_warehouse_id' => $main->id,
        ], $headers)->assertForbidden();
    }

    public function test_stock_levels_and_movements_listing(): void
    {
        $headers = $this->staff();

        $this->getJson('/api/stock', $headers)->assertOk()->assertJsonStructure(['data', 'meta']);
        $this->getJson('/api/stock/movements', $headers)->assertOk()->assertJsonStructure(['data']);
    }
}
