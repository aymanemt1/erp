import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useFetch } from '../utils/hooks';
import { purchaseOrders, suppliers } from '../api/erp';
import { useAuth } from '../context/AppContext';
import { Card, Spinner, EmptyState, ErrorState, Pagination, StatusBadge } from '../components/ui';
import { fmtMoney, fmtDate } from '../utils/format';

export default function PurchaseOrders() {
  const [status, setStatus] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [page, setPage] = useState(1);
  const { canManage } = useAuth();

  const { data, loading, error, reload } = useFetch(
    () => purchaseOrders.list({ status: status || undefined, supplier_id: supplierId || undefined, page }),
    [status, supplierId, page]
  );
  const { data: sups } = useFetch(suppliers.list);
  const items = data?.items || [];

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <select className="input max-w-[180px]" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="ordered">Ordered</option>
            <option value="received">Received</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select className="input max-w-[220px]" value={supplierId} onChange={(e) => { setSupplierId(e.target.value); setPage(1); }}>
            <option value="">All suppliers</option>
            {(sups?.items || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <div className="ml-auto">
            {canManage && <Link to="/purchase-orders/new" className="btn-primary">+ New purchase order</Link>}
          </div>
        </div>
      </Card>

      {loading ? <Spinner /> : error ? <ErrorState error={error} onRetry={reload} /> : items.length === 0 ? (
        <Card><EmptyState title="No purchase orders" hint="Create a PO to order stock from a supplier." /></Card>
      ) : (
        <div className="table-wrap">
          <table className="w-full">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="th">Reference</th>
                <th className="th">Supplier</th>
                <th className="th">Date</th>
                <th className="th">Expected</th>
                <th className="th text-right">Total</th>
                <th className="th">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((po) => (
                <tr key={po.id} className="hover:bg-slate-50">
                  <td className="td"><Link to={`/purchase-orders/${po.id}`} className="font-semibold text-indigo-600 hover:underline">{po.reference || `#${po.id}`}</Link></td>
                  <td className="td">{po.supplier?.name || '—'}</td>
                  <td className="td text-slate-500">{fmtDate(po.created_at)}</td>
                  <td className="td text-slate-500">{fmtDate(po.expected_date)}</td>
                  <td className="td text-right font-bold">{fmtMoney(po.total)}</td>
                  <td className="td"><StatusBadge status={po.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4"><Pagination meta={data.meta} onPage={setPage} /></div>
        </div>
      )}
    </div>
  );
}
