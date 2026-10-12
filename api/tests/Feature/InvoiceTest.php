<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Invoice;
use App\Models\Product;
use App\Models\StockLevel;
use App\Models\StockMovement;
use App\Models\Warehouse;

class InvoiceTest extends ErpTestCase
{
    protected function invoicePayload(int $qty = 2): array
    {
        $product = Product::where('sku', 'PPR-A4-BOX')->firstOrFail(); // sale 130

        return [
            'client_id' => Client::firstOrFail()->id,
            'warehouse_id' => Warehouse::where('name', 'Main Warehouse')->firstOrFail()->id,
            'tax_rate' => 20,
            'items' => [
                ['product_id' => $product->id, 'qty' => $qty],
            ],
        ];
    }

    protected function stockOf(string $sku, string $warehouse): float
    {
        $p = Product::where('sku', $sku)->firstOrFail();
        $w = Warehouse::where('name', $warehouse)->firstOrFail();

        return (float) StockLevel::where('product_id', $p->id)->where('warehouse_id', $w->id)->value('qty');
    }

    public function test_numbering_is_sequential_and_unique(): void
    {
        $headers = $this->admin();
        $year = now()->format('Y');

        $n1 = $this->postJson('/api/invoices', $this->invoicePayload(), $headers)->json('data.number');
        $n2 = $this->postJson('/api/invoices', $this->invoicePayload(), $headers)->json('data.number');

        $this->assertEquals("INV-{$year}-0001", $n1);
        $this->assertEquals("INV-{$year}-0002", $n2);
        $this->assertNotEquals($n1, $n2);
    }

    public function test_send_deducts_stock_and_creates_out_movements(): void
    {
        $headers = $this->manager();
        $invId = $this->postJson('/api/invoices', $this->invoicePayload(5), $headers)->json('data.id');
        $number = Invoice::find($invId)->number;

        $before = $this->stockOf('PPR-A4-BOX', 'Main Warehouse');

        $this->postJson("/api/invoices/{$invId}/send", [], $headers)
            ->assertOk()->assertJsonPath('data.status', 'sent');

        $this->assertEquals($before - 5, $this->stockOf('PPR-A4-BOX', 'Main Warehouse'));
        $this->assertTrue(
            StockMovement::where('reference', $number)->where('type', 'out')->where('direction', 'out')->exists()
        );

        // double send rejected
        $this->postJson("/api/invoices/{$invId}/send", [], $headers)->assertStatus(422);
    }

    public function test_send_fails_with_insufficient_stock_and_deducts_nothing(): void
    {
        $headers = $this->admin();
        // TNR-X200 has 3 in Main Warehouse
        $product = Product::where('sku', 'TNR-X200')->firstOrFail();
        $payload = $this->invoicePayload();
        $payload['items'] = [['product_id' => $product->id, 'qty' => 50]];

        $invId = $this->postJson('/api/invoices', $payload, $headers)->json('data.id');
        $before = $this->stockOf('TNR-X200', 'Main Warehouse');

        $this->postJson("/api/invoices/{$invId}/send", [], $headers)->assertStatus(422);

        $this->assertEquals($before, $this->stockOf('TNR-X200', 'Main Warehouse'));
        $this->assertEquals('draft', Invoice::find($invId)->status);
    }

    public function test_cancel_sent_invoice_restores_stock(): void
    {
        $headers = $this->manager();
        $invId = $this->postJson('/api/invoices', $this->invoicePayload(4), $headers)->json('data.id');
        $number = Invoice::find($invId)->number;
        $before = $this->stockOf('PPR-A4-BOX', 'Main Warehouse');

        $this->postJson("/api/invoices/{$invId}/send", [], $headers)->assertOk();
        $this->assertEquals($before - 4, $this->stockOf('PPR-A4-BOX', 'Main Warehouse'));

        $this->postJson("/api/invoices/{$invId}/cancel", [], $headers)
            ->assertOk()->assertJsonPath('data.status', 'cancelled');

        $this->assertEquals($before, $this->stockOf('PPR-A4-BOX', 'Main Warehouse'));
        $this->assertTrue(
            StockMovement::where('reference', $number)->where('type', 'in')->exists()
        );
    }

    public function test_payments_partial_then_full_marks_paid(): void
    {
        $headers = $this->admin();
        $invId = $this->postJson('/api/invoices', $this->invoicePayload(2), $headers)->json('data.id');
        // subtotal 260, tax 20% = 52, total 312
        $this->postJson("/api/invoices/{$invId}/send", [], $headers)->assertOk();

        // payment on draft is tested separately; here invoice is sent
        $this->postJson("/api/invoices/{$invId}/payments", [
            'amount' => 100, 'method' => 'cash',
        ], $headers)->assertCreated()->assertJsonPath('invoice_status', 'sent');

        $this->assertEquals(212.0, Invoice::find($invId)->balance());

        $this->postJson("/api/invoices/{$invId}/payments", [
            'amount' => 212, 'method' => 'bank',
        ], $headers)->assertCreated()->assertJsonPath('invoice_status', 'paid');

        $this->assertEquals('paid', Invoice::find($invId)->status);
    }

    public function test_overpayment_rejected_and_payment_on_draft_rejected(): void
    {
        $headers = $this->admin();
        $invId = $this->postJson('/api/invoices', $this->invoicePayload(1), $headers)->json('data.id');

        // draft invoice: payment rejected
        $this->postJson("/api/invoices/{$invId}/payments", ['amount' => 10], $headers)->assertStatus(422);

        $this->postJson("/api/invoices/{$invId}/send", [], $headers)->assertOk();
        $balance = Invoice::find($invId)->balance();

        $this->postJson("/api/invoices/{$invId}/payments", [
            'amount' => $balance + 1,
        ], $headers)->assertStatus(422);
    }

    public function test_staff_cannot_send_invoice_but_can_read(): void
    {
        $headers = $this->admin();
        $invId = $this->postJson('/api/invoices', $this->invoicePayload(), $headers)->json('data.id');

        $this->getJson("/api/invoices/{$invId}", $this->staff())->assertOk();
        $this->postJson("/api/invoices/{$invId}/send", [], $this->staff())->assertForbidden();
    }

    public function test_pdf_streams_invoice(): void
    {
        $headers = $this->admin();
        $invId = $this->postJson('/api/invoices', $this->invoicePayload(), $headers)->json('data.id');

        $response = $this->get("/api/invoices/{$invId}/pdf", $headers);
        $response->assertOk();
        $this->assertStringContainsString('pdf', strtolower($response->headers->get('Content-Type')));
        $this->assertTrue(strlen($response->getContent()) > 1000);
    }
}
