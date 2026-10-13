<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Product;
use App\Models\StockMovement;
use App\Models\Supplier;
use App\Models\Warehouse;

class CatalogTest extends ErpTestCase
{
    public function test_category_crud_and_unique_name(): void
    {
        $headers = $this->admin();

        $create = $this->postJson('/api/categories', ['name' => 'Test Cat'], $headers)
            ->assertCreated();
        $id = $create->json('data.id');

        // duplicate name rejected
        $this->postJson('/api/categories', ['name' => 'Test Cat'], $headers)->assertStatus(422);

        $this->putJson("/api/categories/{$id}", ['name' => 'Renamed Cat'], $headers)
            ->assertOk()
            ->assertJsonPath('data.name', 'Renamed Cat');

        // staff can read
        $this->getJson('/api/categories', $this->staff())->assertOk();

        // fresh admin headers: the staff() call above reset the cached guard
        $headers = $this->admin();
        $this->deleteJson("/api/categories/{$id}", [], $headers)->assertNoContent();
    }

    public function test_category_with_products_cannot_be_deleted(): void
    {
        $headers = $this->admin();
        $categoryId = $this->postJson('/api/categories', ['name' => 'Has Products'], $headers)->json('data.id');

        $this->postJson('/api/products', [
            'name' => 'Linked Product', 'category_id' => $categoryId,
            'purchase_price' => 5, 'sale_price' => 10,
        ], $headers)->assertCreated();

        $this->deleteJson("/api/categories/{$categoryId}", [], $headers)->assertStatus(422);
    }

    public function test_product_crud_and_sku_auto_generated_when_blank(): void
    {
        $headers = $this->admin();

        $create = $this->postJson('/api/products', [
            'name' => 'Auto SKU Product',
            'purchase_price' => 100,
            'sale_price' => 150,
        ], $headers)->assertCreated();

        $sku = $create->json('data.sku');
        $this->assertNotEmpty($sku);
        $this->assertStringStartsWith('SKU-', $sku);
        $id = $create->json('data.id');

        // duplicate sku rejected
        $this->postJson('/api/products', [
            'name' => 'Dup SKU', 'sku' => $sku, 'purchase_price' => 1, 'sale_price' => 2,
        ], $headers)->assertStatus(422);

        $this->getJson("/api/products/{$id}", $headers)
            ->assertOk()
            ->assertJsonPath('data.sku', $sku);

        $response = $this->putJson("/api/products/{$id}", [
            'name' => 'Auto SKU Product', 'sale_price' => 175,
        ], $headers)->assertOk();
        $this->assertEquals(175, $response->json('data.sale_price'));
    }

    public function test_product_search_and_filter(): void
    {
        $headers = $this->staff();

        $this->getJson('/api/products?search=toner', $headers)
            ->assertOk()
            ->assertJsonFragment(['sku' => 'TNR-X200']);
    }

    public function test_warehouse_default_flag_is_exclusive(): void
    {
        $headers = $this->admin();

        $this->postJson('/api/warehouses', [
            'name' => 'New Default WH', 'location' => 'Rabat', 'is_default' => true,
        ], $headers)->assertCreated();

        $warehouses = $this->getJson('/api/warehouses', $headers)->json('data');
        $defaults = array_filter($warehouses, fn ($w) => $w['is_default']);
        $this->assertCount(1, $defaults);
    }

    public function test_warehouse_with_documents_or_movements_cannot_be_deleted(): void
    {
        $headers = $this->admin();
        $product = Product::where('sku', 'PPR-A4-BOX')->firstOrFail();

        $unusedId = $this->postJson('/api/warehouses', [
            'name' => 'Unused Depot', 'location' => 'Agadir',
        ], $headers)->json('data.id');
        $this->deleteJson("/api/warehouses/{$unusedId}", [], $headers)->assertNoContent();
        $this->assertNull(Warehouse::find($unusedId));

        $invoiceWarehouseId = $this->postJson('/api/warehouses', [
            'name' => 'Invoice Depot', 'location' => 'Fes',
        ], $headers)->json('data.id');
        $this->postJson('/api/invoices', [
            'client_id' => Client::firstOrFail()->id,
            'warehouse_id' => $invoiceWarehouseId,
            'items' => [['product_id' => $product->id, 'qty' => 1]],
        ], $headers)->assertCreated();

        $this->deleteJson("/api/warehouses/{$invoiceWarehouseId}", [], $headers)->assertStatus(422);
        $this->assertNotNull(Warehouse::find($invoiceWarehouseId));

        $poWarehouseId = $this->postJson('/api/warehouses', [
            'name' => 'PO Depot', 'location' => 'Oujda',
        ], $headers)->json('data.id');
        $this->postJson('/api/purchase-orders', [
            'supplier_id' => Supplier::firstOrFail()->id,
            'warehouse_id' => $poWarehouseId,
            'items' => [['product_id' => $product->id, 'qty' => 1]],
        ], $headers)->assertCreated();

        $this->deleteJson("/api/warehouses/{$poWarehouseId}", [], $headers)->assertStatus(422);
        $this->assertNotNull(Warehouse::find($poWarehouseId));

        // Qty can return to zero while the movement ledger must stay.
        $movementWarehouseId = $this->postJson('/api/warehouses', [
            'name' => 'Adjusted Depot', 'location' => 'Tangier',
        ], $headers)->json('data.id');
        $this->postJson('/api/stock/adjust', [
            'product_id' => $product->id, 'warehouse_id' => $movementWarehouseId, 'qty' => 2,
        ], $headers)->assertCreated();
        $this->postJson('/api/stock/adjust', [
            'product_id' => $product->id, 'warehouse_id' => $movementWarehouseId, 'qty' => -2,
        ], $headers)->assertCreated();

        $this->deleteJson("/api/warehouses/{$movementWarehouseId}", [], $headers)->assertStatus(422);
        $this->assertNotNull(Warehouse::find($movementWarehouseId));
        $this->assertTrue(
            StockMovement::where('warehouse_id', $movementWarehouseId)->exists()
        );
    }
}
