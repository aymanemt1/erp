<?php

namespace App\Console\Commands;

use App\Models\Invoice;
use Illuminate\Console\Command;

class MarkOverdueInvoices extends Command
{
    protected $signature = 'invoices:mark-overdue';

    protected $description = 'Mark sent invoices past their due date as overdue';

    public function handle(): int
    {
        $count = Invoice::where('status', 'sent')
            ->whereNotNull('due_date')
            ->whereDate('due_date', '<', now()->toDateString())
            ->whereColumn('amount_paid', '<', 'total')
            ->update(['status' => 'overdue']);

        $this->info("Marked {$count} invoice(s) as overdue.");

        return self::SUCCESS;
    }
}
