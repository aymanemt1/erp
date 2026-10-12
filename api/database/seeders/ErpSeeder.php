<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Client;
use App\Models\Counter;
use App\Models\Product;
use App\Models\Setting;
use App\Models\Supplier;
use App\Models\User;
use App\Models\Warehouse;
use App\Services\StockService;
use Illuminate\Database\Seeder;

class ErpSeeder extends Seeder
{
    public function run(): void
    {
        // Demo accounts (password: password)
        foreach ([
            ['Admin User', 'admin@erp.test', 'admin'],
            ['Manager User', 'manager@erp.test', 'manager'],
            ['Staff User', 'staff@erp.test', 'staff'],
        ] as [$name, $email, $role]) {
            User::firstOrCreate(['email' => $email], [
                'name' => $name,
                'password' => 'password',
                'role' => $role,
            ]);
        }

        // Company settings
        $settings = [
            'company_name' => 'WebStack Demo SARL',
            'company_address' => '123 Ave Mohammed V, Tangier 90000, Morocco',
            'company_phone' => '+212 539 00 00 00',
            'company_email' => 'contact@webstack-demo.ma',
            'currency' => 'MAD',
            'tax_rate' => '20',
            'invoice_prefix' => 'INV',
            'quotation_prefix' => 'QUO',
            'po_prefix' => 'PO',
        ];
        foreach ($settings as $key => $value) {
            Setting::updateOrCreate(['key' => $key], ['value' => $value]);
        }

        foreach (['invoice', 'quotation', 'purchase_order', 'sku'] as $key) {
            Counter::firstOrCreate(['key' => $key], ['value' => 0]);
        }

        // Warehouses
        $main = Warehouse::firstOrCreate(['name' => 'Main Warehouse'], [
            'location' => 'Casablanca', 'is_default' => true,
        ]);
        $tangier = Warehouse::firstOrCreate(['name' => 'Tangier Depot'], [
            'location' => 'Tangier', 'is_default' => false,
        ]);

        // Categories
        $raw = Category::firstOrCreate(['name' => 'Raw Materials']);
        $finished = Category::firstOrCreate(['name' => 'Finished Goods']);
        $office = Category::firstOrCreate(['name' => 'Office Supplies']);

        // Suppliers & clients
        Supplier::firstOrCreate(['name' => 'Atlas Materials SARL'], [
            'email' => 'sales@atlas-materials.ma', 'phone' => '+212 522 11 22 33',
            'address' => 'Zone Industrielle, Casablanca', 'tax_id' => 'IF 12345678',
        ]);
        Supplier::firstOrCreate(['name' => 'Sahara Office Supply'], [
            'email' => 'contact@sahara-office.ma', 'phone' => '+212 537 44 55 66',
            'address' => 'Rue de Fes, Rabat', 'tax_id' => 'IF 87654321',
        ]);
        Client::firstOrCreate(['name' => 'Café Nord SARL'], [
            'email' => 'hello@cafenord.ma', 'phone' => '+212 539 77 88 99',
            'address' => 'Marina Bay, Tangier', 'tax_id' => 'IF 11223344',
        ]);
        Client::firstOrCreate(['name' => 'Hotel Marina Bay'], [
            'email' => 'purchasing@hotelmarinabay.ma', 'phone' => '+212 539 12 34 56',
            'address' => 'Corniche, Tangier', 'tax_id' => 'IF 44332211',
        ]);

        // Products with opening stock
        $stock = app(StockService::class);
        $admin = User::where('email', 'admin@erp.test')->first();

        $products = [
            // name, sku, category, unit, purchase, sale, reorder, [main_qty, tangier_qty]
            ['Steel Beam 6m', 'STL-BEAM-6M', $raw, 'pcs', 450, 620, 20, [100, 30]],
            ['Cement Bag 50kg', 'CMT-BAG-50KG', $raw, 'bag', 65, 85, 50, [200, 40]],
            ['Office Chair Pro', 'CHR-PRO-01', $finished, 'pcs', 800, 1150, 10, [25, 8]],
            ['Laptop Stand Alu', 'LTP-STAND-AL', $finished, 'pcs', 120, 199, 15, [60, 20]],
            ['A4 Paper Box', 'PPR-A4-BOX', $office, 'box', 90, 130, 30, [100, 50]],
            ['Printer Toner X200', 'TNR-X200', $office, 'pcs', 300, 450, 5, [3, 1]], // low stock on purpose
            ['Safety Helmet', 'SFT-HLM-01', $raw, 'pcs', 45, 75, 40, [120, 0]],
            ['Wooden Desk 140', 'DSK-WD-140', $finished, 'pcs', 950, 1400, 8, [12, 5]],
        ];

        foreach ($products as [$name, $sku, $category, $unit, $purchase, $sale, $reorder, [$qMain, $qTangier]]) {
            $product = Product::firstOrCreate(['sku' => $sku], [
                'name' => $name,
                'category_id' => $category->id,
                'unit' => $unit,
                'purchase_price' => $purchase,
                'sale_price' => $sale,
                'reorder_level' => $reorder,
            ]);

            if ($qMain > 0 && $product->totalStock() == 0) {
                $stock->add($product, $main, $qMain, 'in', 'OPENING', 'Opening stock', $admin->id);
            }
            if ($qTangier > 0 && $product->totalStock() == $qMain) {
                $stock->add($product, $tangier, $qTangier, 'in', 'OPENING', 'Opening stock', $admin->id);
            }
        }
    }
}
