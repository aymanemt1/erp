import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useFetch } from '../utils/hooks';
import { invoices } from '../api/erp';
import { errMsg } from '../api/client';
import { useAuth, useToast, useAction } from '../context/AppContext';
import { Card, Spinner, ErrorState, StatusBadge, ConfirmDialog, Modal, Field, Badge } from '../components/ui';
import { fmtMoney, fmtDate, fmtDateTime, isOverdue, cx } from '../utils/format';

function PaymentModal({ open, onClose, invoiceId, balance, onDone }) {
  const [form, setForm] = useState({ amount: balance || '', method: 'cash', notes: '' });
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async (e) => {
    e.preventDefault();
    const amount = Number(form.amount);
    if (!(amount > 0)) return toast.push('Enter a valid amount', 'error');
    setBusy(true);
    try {
      await invoices.recordPayment(invoiceId, { amount, method: form.method, notes: form.notes || null });
      toast.push('Payment recorded', 'success');
      onDone();
      onClose();
    } catch (err) {
      toast.push(errMsg(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Record payment">
      <form onSubmit={save} className="space-y-4">
        <p className="text-sm text-slate-500">Outstanding balance: <span className="font-bold text-slate-900">{fmtMoney(balance)}</span></p>
        <Field label="Amount">
          <input className="input" type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => set('amount', e.target.value)} required />
        </Field>
        <Field label="Method">
          <select className="input" value={form.method} onChange={(e) => set('method', e.target.value)}>
            <option value="cash">Cash</option>
            <option value="bank_transfer">Bank transfer</option>
            <option value="check">Check</option>
            <option value="card">Card</option>
          </select>
        </Field>
        <Field label="Notes">
          <input className="input" value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Optional reference" />
        </Field>
        <div className="flex justify-end gap-3">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Record payment'}</button>
        </div>
      </form>
    </Modal>
  );
}

export default function InvoiceDetail() {
  const { id } = useParams();
  const { canManage } = useAuth();
  const act = useAction();
  const [confirm, setConfirm] = useState(null); // 'send' | 'cancel'
  const [showPay, setShowPay] = useState(false);
  const [busy, setBusy] = useState(false);

  const { data: inv, loading, error, reload } = useFetch(() => invoices.get(id), [id]);

  const runAction = async () => {
    setBusy(true);
    try {
      if (confirm === 'send') await act(() => invoices.send(id), 'Invoice sent');
      if (confirm === 'cancel') await act(() => invoices.cancel(id), 'Invoice cancelled');
      setConfirm(null);
      reload();
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Spinner />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!inv) return <ErrorState error="Not found" onRetry={reload} />;

  const items = inv.items || [];
  const payments = inv.payments || [];
  const status = String(inv.status || 'draft');
  const overdue = isOverdue(inv.due_date, status) || status === 'overdue';
  const paid = Number(inv.paid_amount ?? inv.amount_paid ?? payments.reduce((s, p) => s + Number(p.amount || 0), 0));
  const balance = Number(inv.total || 0) - paid;
  const payable = ['sent', 'partial', 'overdue'].includes(status) && balance > 0.009;

  return (
    <div className="space-y-5">
      {overdue && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-800">
          ⚠️ This invoice is overdue since {fmtDate(inv.due_date)} — {fmtMoney(balance)} still outstanding.
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Link to="/invoices" className="btn-ghost">← Back</Link>
        <h2 className="text-xl font-extrabold text-slate-900">{inv.reference || `INV #${inv.id}`}</h2>
        <StatusBadge status={overdue ? 'overdue' : status} />
        <div className="ml-auto flex flex-wrap gap-2">
          {canManage && status === 'draft' && (
            <>
              <Link to={`/invoices/${id}/edit`} className="btn-secondary">Edit</Link>
              <button className="btn-primary" onClick={() => setConfirm('send')}>Send to client</button>
              <button className="btn-secondary" onClick={() => setConfirm('cancel')}>Cancel</button>
            </>
          )}
          {payable && <button className="btn-primary" onClick={() => setShowPay(true)}>Record payment</button>}
          <button className="btn-secondary" onClick={() => window.open(invoices.pdfUrl(id), '_blank', 'noopener')}>⬇ Download PDF</button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card title="Client">
          <p className="font-bold text-slate-900">{inv.client?.name || '—'}</p>
          <div className="mt-2 space-y-1 text-sm text-slate-600">
            {inv.client?.email && <p>✉️ {inv.client.email}</p>}
            {inv.client?.phone && <p>📞 {inv.client.phone}</p>}
            {inv.client?.address && <p>📍 {inv.client.address}</p>}
          </div>
        </Card>
        <Card title="Invoice info">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">Issued</dt><dd className="font-medium">{fmtDateTime(inv.created_at)}</dd></div>
            <div className="flex justify-between"><dt className={cx(overdue && 'font-semibold text-red-600', 'text-slate-500')}>Due</dt><dd className={cx('font-medium', overdue && 'font-semibold text-red-600')}>{fmtDate(inv.due_date)}</dd></div>
            {inv.quotation?.id && <div className="flex justify-between"><dt className="text-slate-500">From quotation</dt><dd><Link to={`/quotations/${inv.quotation.id}`} className="font-medium text-indigo-600 hover:underline">{inv.quotation.reference || `#${inv.quotation.id}`}</Link></dd></div>}
          </dl>
        </Card>
        <Card title="Totals">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">Subtotal</dt><dd className="font-medium">{fmtMoney(inv.subtotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Discount</dt><dd className="font-medium">−{fmtMoney(inv.discount)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Tax</dt><dd className="font-medium">{fmtMoney(inv.tax)}</dd></div>
            <div className="flex justify-between border-t border-slate-100 pt-2"><dt className="font-bold">Total</dt><dd className="font-extrabold text-slate-900">{fmtMoney(inv.total)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Paid</dt><dd className="font-semibold text-emerald-700">{fmtMoney(paid)}</dd></div>
            <div className="flex justify-between"><dt className="font-bold">Balance</dt><dd className={cx('font-extrabold', balance > 0.009 ? 'text-amber-700' : 'text-emerald-700')}>{fmtMoney(balance)}</dd></div>
          </dl>
        </Card>
      </div>

      {inv.notes && <Card title="Notes"><p className="text-sm text-slate-600">{inv.notes}</p></Card>}

      <Card title={`Items (${items.length})`}>
        <div className="table-wrap !border-0 !shadow-none">
          <table className="w-full">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr><th className="th">Product</th><th className="th text-right">Qty</th><th className="th text-right">Unit price</th><th className="th text-right">Line total</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((it, i) => (
                <tr key={i}>
                  <td className="td font-medium text-slate-900">{it.product?.name || it.name || '—'}</td>
                  <td className="td text-right">{it.quantity}</td>
                  <td className="td text-right">{fmtMoney(it.unit_price)}</td>
                  <td className="td text-right font-semibold">{fmtMoney(Number(it.quantity) * Number(it.unit_price))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title={`Payments (${payments.length})`} action={payable && <button className="btn-secondary" onClick={() => setShowPay(true)}>+ Record payment</button>}>
        {payments.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-400">No payments recorded yet.</p>
        ) : (
          <ol className="relative space-y-4 border-l-2 border-slate-200 pl-5">
            {payments.map((p, i) => (
              <li key={p.id || i} className="relative">
                <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full bg-emerald-500 ring-4 ring-emerald-100" />
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-slate-900">{fmtMoney(p.amount)}</span>
                  <Badge tone="slate">{String(p.method || 'payment').replace(/_/g, ' ')}</Badge>
                  <span className="text-xs text-slate-400">{fmtDateTime(p.created_at || p.date)}</span>
                </div>
                {p.notes && <p className="mt-0.5 text-sm text-slate-500">{p.notes}</p>}
              </li>
            ))}
          </ol>
        )}
      </Card>

      <PaymentModal key={`pay-${showPay}-${balance}`} open={showPay} onClose={() => setShowPay(false)} invoiceId={id} balance={balance} onDone={reload} />

      <ConfirmDialog
        open={!!confirm}
        title={confirm === 'send' ? 'Send invoice?' : 'Cancel invoice?'}
        message={confirm === 'send' ? 'The invoice will be marked as sent to the client.' : 'The invoice will be cancelled. Recorded payments are kept.'}
        confirmLabel={confirm === 'send' ? 'Send' : 'Cancel invoice'}
        busy={busy}
        onConfirm={runAction}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
