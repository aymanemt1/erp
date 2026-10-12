import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useFetch } from '../utils/hooks';
import { quotations } from '../api/erp';
import { useAuth, useAction } from '../context/AppContext';
import { Card, Spinner, ErrorState, StatusBadge, ConfirmDialog } from '../components/ui';
import { fmtMoney, fmtDate, fmtDateTime } from '../utils/format';

export default function QuotationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { canManage } = useAuth();
  const act = useAction();
  const [confirm, setConfirm] = useState(null); // 'send' | 'accept' | 'reject'
  const [busy, setBusy] = useState(false);

  const { data: q, loading, error, reload } = useFetch(() => quotations.get(id), [id]);

  const runAction = async () => {
    setBusy(true);
    try {
      if (confirm === 'send') await act(() => quotations.send(id), 'Quotation sent');
      if (confirm === 'accept') {
        const res = await act(() => quotations.accept(id), 'Accepted — invoice created');
        const invId = res?.invoice?.id || res?.invoice_id;
        setConfirm(null);
        if (invId) return navigate(`/invoices/${invId}`);
        return reload();
      }
      if (confirm === 'reject') await act(() => quotations.reject(id), 'Quotation rejected');
      setConfirm(null);
      reload();
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Spinner />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!q) return <ErrorState error="Not found" onRetry={reload} />;

  const items = q.items || [];
  const status = String(q.status || 'draft');
  const invoiceId = q.invoice?.id || q.invoice_id;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/quotations" className="btn-ghost">← Back</Link>
        <h2 className="text-xl font-extrabold text-slate-900">{q.reference || `QT #${q.id}`}</h2>
        <StatusBadge status={status} />
        <div className="ml-auto flex flex-wrap gap-2">
          {canManage && status === 'draft' && (
            <>
              <Link to={`/quotations/${id}/edit`} className="btn-secondary">Edit</Link>
              <button className="btn-primary" onClick={() => setConfirm('send')}>Send to client</button>
            </>
          )}
          {canManage && status === 'sent' && (
            <>
              <button className="btn-primary" onClick={() => setConfirm('accept')}>Accept → create invoice</button>
              <button className="btn-secondary" onClick={() => setConfirm('reject')}>Reject</button>
            </>
          )}
          {invoiceId && (
            <Link to={`/invoices/${invoiceId}`} className="btn-secondary">View invoice →</Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card title="Client">
          <p className="font-bold text-slate-900">{q.client?.name || '—'}</p>
          <div className="mt-2 space-y-1 text-sm text-slate-600">
            {q.client?.email && <p>✉️ {q.client.email}</p>}
            {q.client?.phone && <p>📞 {q.client.phone}</p>}
          </div>
        </Card>
        <Card title="Quotation info">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">Created</dt><dd className="font-medium">{fmtDateTime(q.created_at)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Valid until</dt><dd className="font-medium">{fmtDate(q.valid_until)}</dd></div>
          </dl>
        </Card>
        <Card title="Totals">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">Subtotal</dt><dd className="font-medium">{fmtMoney(q.subtotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Discount</dt><dd className="font-medium">−{fmtMoney(q.discount)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Tax</dt><dd className="font-medium">{fmtMoney(q.tax)}</dd></div>
            <div className="flex justify-between border-t border-slate-100 pt-2 text-base"><dt className="font-bold">Total</dt><dd className="font-extrabold text-indigo-700">{fmtMoney(q.total)}</dd></div>
          </dl>
        </Card>
      </div>

      {q.notes && <Card title="Notes"><p className="text-sm text-slate-600">{q.notes}</p></Card>}

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

      <ConfirmDialog
        open={!!confirm}
        title={confirm === 'accept' ? 'Accept quotation?' : confirm === 'send' ? 'Send quotation?' : 'Reject quotation?'}
        message={
          confirm === 'accept'
            ? 'An invoice will be created from this quotation.'
            : confirm === 'send'
              ? 'The quotation will be marked as sent to the client.'
              : 'The quotation will be marked as rejected.'
        }
        confirmLabel={confirm === 'accept' ? 'Accept & create invoice' : confirm === 'send' ? 'Send' : 'Reject'}
        busy={busy}
        onConfirm={runAction}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
