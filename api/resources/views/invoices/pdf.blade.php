<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 12px; color: #1f2937; }
        .header { border-bottom: 3px solid #1e40af; padding-bottom: 12px; margin-bottom: 20px; }
        .company { font-size: 20px; font-weight: bold; color: #1e40af; }
        .doc-title { font-size: 26px; font-weight: bold; text-align: right; color: #111827; }
        .meta { width: 100%; margin-bottom: 20px; }
        .meta td { vertical-align: top; padding: 4px 8px 4px 0; }
        .box { background: #f3f4f6; border-radius: 4px; padding: 10px; }
        table.items { width: 100%; border-collapse: collapse; margin-top: 10px; }
        table.items th { background: #1e40af; color: #fff; text-align: left; padding: 8px; }
        table.items td { border-bottom: 1px solid #e5e7eb; padding: 8px; }
        .totals { width: 40%; margin-left: auto; margin-top: 12px; }
        .totals td { padding: 4px 0; }
        .grand { font-size: 15px; font-weight: bold; border-top: 2px solid #1e40af; }
        .status { display: inline-block; padding: 4px 10px; border-radius: 4px; font-size: 11px; font-weight: bold; text-transform: uppercase; }
        .status-sent { background: #dbeafe; color: #1e40af; }
        .status-paid { background: #d1fae5; color: #065f46; }
        .status-draft { background: #f3f4f6; color: #4b5563; }
        .status-overdue { background: #fee2e2; color: #991b1b; }
        .status-cancelled { background: #f3f4f6; color: #9ca3af; }
        .footer { margin-top: 40px; font-size: 10px; color: #6b7280; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 10px; }
    </style>
</head>
<body>
    <table style="width:100%">
        <tr>
            <td>
                <div class="company">{{ $settings['company_name'] ?? 'Company' }}</div>
                <div>{{ $settings['company_address'] ?? '' }}</div>
                <div>{{ $settings['company_phone'] ?? '' }} {{ $settings['company_email'] ?? '' }}</div>
            </td>
            <td style="text-align:right">
                <div class="doc-title">INVOICE</div>
                <div style="font-size:14px">{{ $invoice->number }}</div>
                <div style="margin-top:6px"><span class="status status-{{ $invoice->status }}">{{ $invoice->status }}</span></div>
            </td>
        </tr>
    </table>

    <table class="meta">
        <tr>
            <td style="width:50%">
                <div class="box">
                    <strong>Bill to</strong><br>
                    {{ $invoice->client->name }}<br>
                    {{ $invoice->client->address }}<br>
                    {{ $invoice->client->email }} {{ $invoice->client->phone }}
                    @if($invoice->client->tax_id)<br>Tax ID: {{ $invoice->client->tax_id }}@endif
                </div>
            </td>
            <td style="width:50%">
                <div class="box">
                    <strong>Issue date:</strong> {{ $invoice->created_at->format('Y-m-d') }}<br>
                    <strong>Due date:</strong> {{ $invoice->due_date?->format('Y-m-d') ?? '—' }}<br>
                    <strong>Warehouse:</strong> {{ $invoice->warehouse->name }}<br>
                    <strong>Currency:</strong> {{ $settings['currency'] ?? 'MAD' }}
                </div>
            </td>
        </tr>
    </table>

    <table class="items">
        <thead>
            <tr>
                <th>#</th>
                <th>Product</th>
                <th>SKU</th>
                <th style="text-align:right">Qty</th>
                <th style="text-align:right">Unit price</th>
                <th style="text-align:right">Line total</th>
            </tr>
        </thead>
        <tbody>
            @foreach($invoice->items as $i => $item)
            <tr>
                <td>{{ $i + 1 }}</td>
                <td>{{ $item->product->name }}</td>
                <td>{{ $item->product->sku }}</td>
                <td style="text-align:right">{{ $item->qty }} {{ $item->product->unit }}</td>
                <td style="text-align:right">{{ number_format($item->unit_price, 2) }}</td>
                <td style="text-align:right">{{ number_format($item->line_total, 2) }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>

    <table class="totals">
        <tr><td>Subtotal</td><td style="text-align:right">{{ number_format($invoice->subtotal, 2) }}</td></tr>
        <tr><td>Discount</td><td style="text-align:right">{{ number_format($invoice->discount, 2) }}</td></tr>
        <tr><td>Tax ({{ $invoice->tax_rate }}%)</td><td style="text-align:right">{{ number_format($invoice->tax_amount, 2) }}</td></tr>
        <tr class="grand"><td>Total</td><td style="text-align:right">{{ number_format($invoice->total, 2) }} {{ $settings['currency'] ?? 'MAD' }}</td></tr>
        <tr><td>Paid</td><td style="text-align:right">{{ number_format($invoice->amount_paid, 2) }}</td></tr>
        <tr><td><strong>Balance due</strong></td><td style="text-align:right"><strong>{{ number_format($invoice->balance(), 2) }}</strong></td></tr>
    </table>

    @if($invoice->notes)
    <p><strong>Notes:</strong> {{ $invoice->notes }}</p>
    @endif

    <div class="footer">
        {{ $settings['company_name'] ?? '' }} — Thank you for your business.
    </div>
</body>
</html>
