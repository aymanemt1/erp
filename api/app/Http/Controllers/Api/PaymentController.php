<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\PaymentRequest;
use App\Http\Resources\PaymentResource;
use App\Models\Invoice;
use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PaymentController extends Controller
{
    public function index(Request $request)
    {
        $query = Payment::with('invoice')->orderByDesc('id');

        if ($request->filled('invoice_id')) {
            $query->where('invoice_id', $request->integer('invoice_id'));
        }

        return PaymentResource::collection($query->paginate(15));
    }

    public function store(PaymentRequest $request, Invoice $invoice)
    {
        if (! in_array($invoice->status, ['sent', 'overdue'], true)) {
            return response()->json(['message' => 'Payments can only be recorded on sent or overdue invoices.'], 422);
        }

        $data = $request->validated();
        $amount = round((float) $data['amount'], 2);
        $balance = $invoice->balance();

        if ($amount > $balance + 0.001) {
            throw ValidationException::withMessages([
                'amount' => ["Amount exceeds the invoice balance of {$balance}."],
            ]);
        }

        $payment = DB::transaction(function () use ($invoice, $data, $amount, $request) {
            $payment = $invoice->payments()->create([
                'amount' => $amount,
                'method' => $data['method'] ?? 'cash',
                'paid_at' => $data['paid_at'] ?? now(),
                'notes' => $data['notes'] ?? null,
                'user_id' => $request->user()->id,
            ]);

            $invoice->increment('amount_paid', $amount);
            $invoice->refresh();

            if ($invoice->isFullyPaid()) {
                $invoice->update(['status' => 'paid']);
            }

            return $payment;
        });

        return response()->json([
            'message' => 'Payment recorded.',
            'payment' => new PaymentResource($payment),
            'invoice_status' => $invoice->fresh()->status,
            'balance' => $invoice->fresh()->balance(),
        ], 201);
    }
}
