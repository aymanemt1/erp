<?php

use App\Http\Controllers\Api\AlertController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\ClientController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\InvoiceController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\PurchaseOrderController;
use App\Http\Controllers\Api\QuotationController;
use App\Http\Controllers\Api\SettingController;
use App\Http\Controllers\Api\StockController;
use App\Http\Controllers\Api\SupplierController;
use App\Http\Controllers\Api\WarehouseController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'me']);

    /*
     * Reads are open to every authenticated user (staff included);
     * writes need admin or manager. Declared explicitly per action.
     */
    $readOnly = ['index', 'show'];

    foreach ([
        'categories' => CategoryController::class,
        'products' => ProductController::class,
        'warehouses' => WarehouseController::class,
        'suppliers' => SupplierController::class,
        'clients' => ClientController::class,
    ] as $uri => $controller) {
        Route::apiResource($uri, $controller)->only($readOnly);
        Route::apiResource($uri, $controller)->except($readOnly)->middleware('role:admin,manager');
    }

    // Stock
    Route::get('/stock', [StockController::class, 'levels']);
    Route::get('/stock/movements', [StockController::class, 'movements']);
    Route::post('/stock/transfer', [StockController::class, 'transfer'])->middleware('role:admin,manager');
    Route::post('/stock/adjust', [StockController::class, 'adjust'])->middleware('role:admin,manager');

    // Purchasing
    Route::apiResource('purchase-orders', PurchaseOrderController::class)->only($readOnly);
    Route::apiResource('purchase-orders', PurchaseOrderController::class)->except($readOnly)->middleware('role:admin,manager');
    Route::post('/purchase-orders/{purchaseOrder}/confirm', [PurchaseOrderController::class, 'confirm'])->middleware('role:admin,manager');
    Route::post('/purchase-orders/{purchaseOrder}/receive', [PurchaseOrderController::class, 'receive'])->middleware('role:admin,manager');
    Route::post('/purchase-orders/{purchaseOrder}/cancel', [PurchaseOrderController::class, 'cancel'])->middleware('role:admin,manager');

    // Sales
    Route::apiResource('quotations', QuotationController::class)->only($readOnly);
    Route::apiResource('quotations', QuotationController::class)->except($readOnly)->middleware('role:admin,manager');
    Route::post('/quotations/{quotation}/send', [QuotationController::class, 'send'])->middleware('role:admin,manager');
    Route::post('/quotations/{quotation}/accept', [QuotationController::class, 'accept'])->middleware('role:admin,manager');
    Route::post('/quotations/{quotation}/reject', [QuotationController::class, 'reject'])->middleware('role:admin,manager');

    Route::apiResource('invoices', InvoiceController::class)->only($readOnly);
    Route::apiResource('invoices', InvoiceController::class)->except($readOnly)->middleware('role:admin,manager');
    Route::post('/invoices/{invoice}/send', [InvoiceController::class, 'send'])->middleware('role:admin,manager');
    Route::post('/invoices/{invoice}/cancel', [InvoiceController::class, 'cancel'])->middleware('role:admin,manager');
    Route::get('/invoices/{invoice}/pdf', [InvoiceController::class, 'pdf']);
    Route::post('/invoices/{invoice}/payments', [PaymentController::class, 'store'])->middleware('role:admin,manager');

    Route::get('/payments', [PaymentController::class, 'index']);

    // Dashboard, alerts, settings
    Route::get('/dashboard', [DashboardController::class, 'index']);
    Route::get('/alerts/low-stock', [AlertController::class, 'lowStock']);
    Route::get('/settings', [SettingController::class, 'index']);
    Route::put('/settings', [SettingController::class, 'update'])->middleware('role:admin');
});
