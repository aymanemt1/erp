<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\InvoiceResource;
use App\Http\Resources\PurchaseOrderResource;
use App\Http\Resources\StockMovementResource;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Product;
use App\Models\PurchaseOrder;
use App\Models\StockMovement;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function index()
    {
        $now = now();

        $revenueThisMonth = (float) Payment::whereYear('paid_at', $now->year)
            ->whereMonth('paid_at', $now->month)
            ->sum('amount');

        $outstandingTotal = (float) Invoice::unpaid()
            ->selectRaw('COALESCE(SUM(total - amount_paid), 0) as agg')
            ->value('agg');

        $stockValue = (float) DB::table('stock_levels')
            ->join('products', 'products.id', '=', 'stock_levels.product_id')
            ->sum(DB::raw('stock_levels.qty * products.purchase_price'));

        $lowStockCount = Product::all()->filter(fn ($p) => $p->isLowStock())->count();

        $pendingPos = PurchaseOrder::whereIn('status', ['draft', 'ordered'])->count();
        $overdueCount = Invoice::overdue()->count();

        return response()->json([
            'revenue_this_month' => round($revenueThisMonth, 2),
            'outstanding_total' => round($outstandingTotal, 2),
            'stock_value' => round($stockValue, 2),
            'low_stock_count' => $lowStockCount,
            'pending_pos' => $pendingPos,
            'overdue_invoices_count' => $overdueCount,
            'recent_invoices' => InvoiceResource::collection(
                Invoice::with('client')->orderByDesc('id')->limit(5)->get()
            ),
            'recent_purchase_orders' => PurchaseOrderResource::collection(
                PurchaseOrder::with('supplier')->orderByDesc('id')->limit(5)->get()
            ),
            'recent_movements' => StockMovementResource::collection(
                StockMovement::with(['product', 'warehouse'])->orderByDesc('id')->limit(8)->get()
            ),
        ]);
    }
}
