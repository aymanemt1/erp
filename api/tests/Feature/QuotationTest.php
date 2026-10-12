<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Product;
use App\Models\Warehouse;

class QuotationTest extends ErpTestCase
{
    protected function quotationPayload(): array
    {
        $product = Product::where('sku', 'CHR-PRO-01')->firstOrFail(); // sale 1150

        return [
            'client_id' => Client::firstOrFail()->id,
            'discount' => 50,
            'tax_rate' => 20,
            'items' => [
                ['product_id' => $product->id, 'qty' => 2], // unit_price falls back to sale_price
            ],
        ];
    }

    public function test_create_computes_totals_with_sale_price_fallback(): void
    {
        $response = $this->postJson('/api/quotations', $this->quotationPayload(), $this->admin())
            ->assertCreated();

        // subtotal 2300, discount 50 -> 2250, tax 20% = 450, total 2700
        $data = $response->json('data');
        $this->assertEquals(2300, $data['subtotal']);
        $this->assertEquals(450, $data['tax_amount']);
        $this->assertEquals(2700, $data['total']);
        $response->assertJsonPath('data.status', 'draft');
        $this->assertStringStartsWith('QUO-', $response->json('data.number'));
    }

    public function test_send_then_accept_creates_draft_invoice_copying_items(): void
    {
        $headers = $this->manager();
        $quoId = $this->postJson('/api/quotations', $this->quotationPayload(), $headers)->json('data.id');
        $quoNumber = \App\Models\Quotation::find($quoId)->number;

        // accept from draft rejected
        $this->postJson("/api/quotations/{$quoId}/accept", [
            'warehouse_id' => Warehouse::firstOrFail()->id,
        ], $headers)->assertStatus(422);

        $this->postJson("/api/quotations/{$quoId}/send", [], $headers)
            ->assertOk()->assertJsonPath('data.status', 'sent');

        $response = $this->postJson("/api/quotations/{$quoId}/accept", [
            'warehouse_id' => Warehouse::where('name', 'Main Warehouse')->firstOrFail()->id,
        ], $headers)->assertCreated();

        $invoice = $response->json('data');
        $this->assertEquals('draft', $invoice['status']);
        $this->assertEquals(2700.0, $invoice['total']);
        $this->assertCount(1, $invoice['items']);
        $this->assertEquals(1150.0, $invoice['items'][0]['unit_price']); // snapshot preserved
        $this->assertStringStartsWith('INV-', $invoice['number']);
        $this->assertStringContainsString($quoNumber, $invoice['notes']);

        $this->assertEquals('accepted', \App\Models\Quotation::find($quoId)->status);

        // double accept rejected
        $this->postJson("/api/quotations/{$quoId}/accept", [
            'warehouse_id' => Warehouse::firstOrFail()->id,
        ], $headers)->assertStatus(422);
    }

    public function test_reject_from_sent(): void
    {
        $headers = $this->admin();
        $quoId = $this->postJson('/api/quotations', $this->quotationPayload(), $headers)->json('data.id');
        $this->postJson("/api/quotations/{$quoId}/send", [], $headers)->assertOk();
        $this->postJson("/api/quotations/{$quoId}/reject", [], $headers)
            ->assertOk()->assertJsonPath('data.status', 'rejected');
    }
}
