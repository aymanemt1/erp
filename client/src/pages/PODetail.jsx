import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useFetch } from '../utils/hooks';
import { purchaseOrders } from '../api/erp';
import { useAuth, useToast, useAction } from '../context/AppContext';
import { Card, Spinner, ErrorState, StatusBadge, ConfirmDialog, Badge } from '../components/ui';
import { fmtMoney, fmtDate, fmtDateTime } from '../utils/format';

export default function PODetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { canManage } = useAuth();
  const toast = useToast();
  const act = useAction();
  const [confirm, setConfirm] = useState(null); // 'order' | 'receive' | 'cancel'
  const [busy, setBusy] = useState(false);

  const { data: po, loading, error, reload } = useFetch(() => purchaseOrders.get(id), [id]);

  const runAction = async () => {
    setBusy(true);
    try {
      if (confirm === 'order') await act(() => purchaseOrders.markOrdered(id), 'Marked as ordered');
      if (confirm === 'receive') await act(() => purchaseOrders.receive(id), 'Stock received — inventory updated');
      if (confirm === 'cancel') await act(() => purchaseOrders.cancel(id), 'Purchase order cancelled');
      setConfirm(null);
      reload();
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Spinner />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!po) return <ErrorState error="Not found" onRetry={reload} />;

  const items = po.items || [];
  const status = String(po.status || 'draft');
  const canAct = canManage;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/purchase-orders" className="btn-ghost">← Back</Link>
        <h2 className="text-xl font-extrabold text-slate-900">{po.reference || `PO #${po.id}`}</h2>
        <StatusBadge status={status} />
        <div className="ml-auto flex flex-wrap gap-2">
          {canAct && status === 'draft' && (
            <>
              <Link to={`/purchase-orders/${id}/edit`} className="btn-secondary">Edit</Link>
              <button className="btn-primary" onClick={() => setConfirm('order')}>Mark as ordered</button>
              <button className="btn-secondary" onClick={() => setConfirm('cancel')}>Cancel</button>
            </>
          )}
          {canAct && status === 'ordered' && (
            <>
              <button className="btn-primary" onClick={() => setConfirm('receive')}>Receive stock</button>
              <button className="btn-secondary" onClick={() => setConfirm('cancel')}>Cancel</button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card title="Supplier" className="lg:col-span-1">
          <p className="font-bold text-slate-900">{po.supplier?.name || '—'}</p>
          <div className="mt-2 space-y-1 text-sm text-slate-600">
            {po.supplier?.email && <p>✉️ {po.supplier.email}</p>}
            {po.supplier?.phone && <p>📞 {po.supplier.phone}</p>}
            {po.supplier?.address && <p>📍 {po.supplier.address}</p>}
          </div>
        </Card>
        <Card title="Order info" className="lg:col-span-1">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">Created</dt><dd className="font-medium">{fmtDateTime(po.created_at)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Expected</dt><dd className="font-medium">{fmtDate(po.expected_date)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Warehouse</dt><dd className="font-medium">{po.warehouse?.name || 'Default'}</dd></div>
            {po.received_at && <div className="flex justify-between"><dt className="text-slate-500">Received</dt><dd className="font-medium">{fmtDateTime(po.received_at)}</dd></div>}
          </dl>
        </Card>
        <Card title="Totals" className="lg:col-span-1">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">Subtotal</dt><dd className="font-medium">{fmtMoney(po.subtotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Tax</dt><dd className="font-medium">{fmtMoney(po.tax)}</dd></div>
            <div className="flex justify-between border-t border-slate-100 pt-2 text-base"><dt className="font-bold">Total</dt><dd className="font-extrabold text-indigo-700">{fmtMoney(po.total)}</dd></div>
          </dl>
        </Card>
      </div>

      {po.notes && <Card title="Notes"><p className="text-sm text-slate-600">{po.notes}</p></Card>}

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
        title={confirm === 'receive' ? 'Receive this order?' : confirm === 'order' ? 'Mark as ordered?' : 'Cancel this order?'}
        message={
          confirm === 'receive'
            ? 'Received quantities will be added to stock. This cannot be undone.'
            : confirm === 'order'
              ? 'The supplier will be notified the order is placed (status → ordered).'
              : 'The purchase order will be cancelled.'
        }
        confirmLabel={confirm === 'receive' ? 'Receive stock' : confirm === 'order' ? 'Mark ordered' : 'Cancel order'}
        busy={busy}
        onConfirm={runAction}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
