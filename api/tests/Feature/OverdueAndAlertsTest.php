<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Product;
use App\Models\Warehouse;

class OverdueAndAlertsTest extends ErpTestCase
{
    public function test_overdue_command_marks_past_due_sent_invoices(): void
    {
        $headers = $this->admin();
        $product = Product::where('sku', 'PPR-A4-BOX')->firstOrFail();

        $invId = $this->postJson('/api/invoices', [
            'client_id' => Client::firstOrFail()->id,
            'warehouse_id' => Warehouse::where('name', 'Main Warehouse')->firstOrFail()->id,
            'due_date' => now()->subDays(5)->toDateString(),
            'items' => [['product_id' => $product->id, 'qty' => 1]],
        ], $headers)->json('data.id');

        $this->postJson("/api/invoices/{$invId}/send", [], $headers)->assertOk();
        $this->assertEquals('sent', Invoice::find($invId)->status);

        $this->artisan('invoices:mark-overdue')->assertSuccessful();
        $this->assertEquals('overdue', Invoice::find($invId)->status);

        // paying an overdue invoice in full flips it to paid
        $balance = Invoice::find($invId)->balance();
        $this->postJson("/api/invoices/{$invId}/payments", ['amount' => $balance], $headers)
            ->assertCreated()->assertJsonPath('invoice_status', 'paid');
    }

    public function test_overdue_filter_on_invoice_index(): void
    {
        $headers = $this->staff();
        $product = Product::where('sku', 'PPR-A4-BOX')->firstOrFail();

        $invId = $this->postJson('/api/invoices', [
            'client_id' => Client::firstOrFail()->id,
            'warehouse_id' => Warehouse::where('name', 'Main Warehouse')->firstOrFail()->id,
            'due_date' => now()->subDays(2)->toDateString(),
            'items' => [['product_id' => $product->id, 'qty' => 1]],
        ], $this->admin())->json('data.id');

        $this->postJson("/api/invoices/{$invId}/send", [], $this->admin())->assertOk();
        $this->artisan('invoices:mark-overdue')->assertSuccessful();

        $this->getJson('/api/invoices?overdue=1', $headers)
            ->assertOk()
            ->assertJsonFragment(['id' => $invId]);
    }

    public function test_low_stock_alert_triggers_with_per_warehouse_breakdown(): void
    {
        $response = $this->getJson('/api/alerts/low-stock', $this->staff())->assertOk();

        $products = collect($response->json('products'));
        $toner = $products->firstWhere('sku', 'TNR-X200');

        $this->assertNotNull($toner, 'Seeded low-stock toner should trigger the alert');
        $this->assertEquals(4.0, $toner['total_stock']);
        $this->assertEquals(5, $toner['reorder_level']);
        $this->assertNotEmpty($toner['breakdown']);
        $this->assertContains('Main Warehouse', collect($toner['breakdown'])->pluck('warehouse')->all());
    }

    public function test_dashboard_returns_sane_numbers(): void
    {
        $headers = $this->admin();
        $product = Product::where('sku', 'PPR-A4-BOX')->firstOrFail();

        // Create + send an invoice, then pay it fully this month.
        $invId = $this->postJson('/api/invoices', [
            'client_id' => Client::firstOrFail()->id,
            'warehouse_id' => Warehouse::where('name', 'Main Warehouse')->firstOrFail()->id,
            'items' => [['product_id' => $product->id, 'qty' => 2]],
        ], $headers)->json('data.id');
        $this->postJson("/api/invoices/{$invId}/send", [], $headers)->assertOk();
        $total = Invoice::find($invId)->total;
        $this->postJson("/api/invoices/{$invId}/payments", ['amount' => (float) $total], $headers)->assertCreated();

        $dashboard = $this->getJson('/api/dashboard', $headers)->assertOk()->json();

        $this->assertEquals(round((float) $total, 2), $dashboard['revenue_this_month']);
        $this->assertGreaterThan(0, $dashboard['stock_value']);
        $this->assertGreaterThanOrEqual(1, $dashboard['low_stock_count']);
        $this->assertArrayHasKey('outstanding_total', $dashboard);
        $this->assertArrayHasKey('pending_pos', $dashboard);
        $this->assertArrayHasKey('overdue_invoices_count', $dashboard);
        $this->assertNotEmpty($dashboard['recent_invoices']);
        $this->assertNotEmpty($dashboard['recent_movements']);
    }

    public function test_settings_roundtrip(): void
    {
        $headers = $this->admin();

        $this->getJson('/api/settings', $headers)
            ->assertOk()
            ->assertJsonPath('company_name', 'WebStack Demo SARL')
            ->assertJsonPath('currency', 'MAD');
    }
}
