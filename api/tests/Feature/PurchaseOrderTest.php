<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\StockLevel;
use App\Models\Supplier;
use App\Models\Warehouse;

class PurchaseOrderTest extends ErpTestCase
{
    protected function poPayload(): array
    {
        $product = Product::where('sku', 'PPR-A4-BOX')->firstOrFail();

        return [
            'supplier_id' => Supplier::firstOrFail()->id,
            'warehouse_id' => Warehouse::where('name', 'Main Warehouse')->firstOrFail()->id,
            'tax_rate' => 20,
            'items' => [
                ['product_id' => $product->id, 'qty' => 10, 'unit_price' => 90],
            ],
        ];
    }

    public function test_create_computes_and_saves_totals(): void
    {
        $response = $this->postJson('/api/purchase-orders', $this->poPayload(), $this->admin())
            ->assertCreated();

        // subtotal 900, tax 20% = 180, total 1080
        $data = $response->json('data');
        $this->assertEquals(900, $data['subtotal']);
        $this->assertEquals(180, $data['tax_amount']);
        $this->assertEquals(1080, $data['total']);
        $response->assertJsonPath('data.status', 'draft');
        $this->assertStringStartsWith('PO-', $response->json('data.number'));
    }

    public function test_confirm_then_receive_adds_stock_and_movements(): void
    {
        $headers = $this->manager();
        $poId = $this->postJson('/api/purchase-orders', $this->poPayload(), $headers)->json('data.id');
        $number = \App\Models\PurchaseOrder::find($poId)->number;

        // cannot receive from draft
        $this->postJson("/api/purchase-orders/{$poId}/receive", [], $headers)->assertStatus(422);

        $this->postJson("/api/purchase-orders/{$poId}/confirm", [], $headers)
            ->assertOk()->assertJsonPath('data.status', 'ordered');

        $product = Product::where('sku', 'PPR-A4-BOX')->firstOrFail();
        $warehouseId = Warehouse::where('name', 'Main Warehouse')->firstOrFail()->id;
        $before = (float) StockLevel::where('product_id', $product->id)->where('warehouse_id', $warehouseId)->value('qty');

        $this->postJson("/api/purchase-orders/{$poId}/receive", [], $headers)
            ->assertOk()->assertJsonPath('data.status', 'received');

        $after = (float) StockLevel::where('product_id', $product->id)->where('warehouse_id', $warehouseId)->value('qty');
        $this->assertEquals($before + 10, $after);

        $this->assertTrue(
            \App\Models\StockMovement::where('reference', $number)->where('type', 'in')->exists()
        );

        // double receive rejected
        $this->postJson("/api/purchase-orders/{$poId}/receive", [], $headers)->assertStatus(422);
    }

    public function test_cancel_from_draft_and_reject_cancel_from_received(): void
    {
        $headers = $this->admin();

        $draftId = $this->postJson('/api/purchase-orders', $this->poPayload(), $headers)->json('data.id');
        $this->postJson("/api/purchase-orders/{$draftId}/cancel", [], $headers)
            ->assertOk()->assertJsonPath('data.status', 'cancelled');

        $poId = $this->postJson('/api/purchase-orders', $this->poPayload(), $headers)->json('data.id');
        $this->postJson("/api/purchase-orders/{$poId}/confirm", [], $headers)->assertOk();
        $this->postJson("/api/purchase-orders/{$poId}/receive", [], $headers)->assertOk();
        $this->postJson("/api/purchase-orders/{$poId}/cancel", [], $headers)->assertStatus(422);
    }

    public function test_only_draft_po_can_be_edited_or_deleted(): void
    {
        $headers = $this->admin();
        $poId = $this->postJson('/api/purchase-orders', $this->poPayload(), $headers)->json('data.id');
        $this->postJson("/api/purchase-orders/{$poId}/confirm", [], $headers)->assertOk();

        $this->putJson("/api/purchase-orders/{$poId}", $this->poPayload(), $headers)->assertStatus(422);
        $this->deleteJson("/api/purchase-orders/{$poId}", [], $headers)->assertStatus(422);
    }
}
