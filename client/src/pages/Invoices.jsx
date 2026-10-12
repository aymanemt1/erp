import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useFetch } from '../utils/hooks';
import { invoices } from '../api/erp';
import { useAuth } from '../context/AppContext';
import { Card, Spinner, EmptyState, ErrorState, Pagination, StatusBadge, Badge } from '../components/ui';
import { fmtMoney, fmtDate, isOverdue, cx } from '../utils/format';

export default function Invoices() {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const { canManage } = useAuth();

  const { data, loading, error, reload } = useFetch(
    () => invoices.list({ status: status || undefined, page }),
    [status, page]
  );
  const items = data?.items || [];

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <select className="input max-w-[180px]" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="partial">Partially paid</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <div className="ml-auto">
            {canManage && <Link to="/invoices/new" className="btn-primary">+ New invoice</Link>}
          </div>
        </div>
      </Card>

      {loading ? <Spinner /> : error ? <ErrorState error={error} onRetry={reload} /> : items.length === 0 ? (
        <Card><EmptyState title="No invoices" hint="Create an invoice directly, or accept a quotation to generate one." /></Card>
      ) : (
        <div className="table-wrap">
          <table className="w-full">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="th">Reference</th>
                <th className="th">Client</th>
                <th className="th">Issued</th>
                <th className="th">Due</th>
                <th className="th text-right">Total</th>
                <th className="th text-right">Paid</th>
                <th className="th text-right">Balance</th>
                <th className="th">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((inv) => {
                const overdue = isOverdue(inv.due_date, inv.status) || String(inv.status).toLowerCase() === 'overdue';
                const paid = Number(inv.paid_amount ?? inv.amount_paid ?? 0);
                const balance = Number(inv.total || 0) - paid;
                return (
                  <tr key={inv.id} className={cx('hover:bg-slate-50', overdue && 'bg-red-50/60 hover:bg-red-50')}>
                    <td className="td">
                      <Link to={`/invoices/${inv.id}`} className="font-semibold text-indigo-600 hover:underline">{inv.reference || `#${inv.id}`}</Link>
                      {overdue && <Badge tone="red" className="ml-2">overdue</Badge>}
                    </td>
                    <td className="td">{inv.client?.name || '—'}</td>
                    <td className="td text-slate-500">{fmtDate(inv.created_at)}</td>
                    <td className={cx('td', overdue ? 'font-semibold text-red-600' : 'text-slate-500')}>{fmtDate(inv.due_date)}</td>
                    <td className="td text-right font-bold">{fmtMoney(inv.total)}</td>
                    <td className="td text-right text-emerald-700">{fmtMoney(paid)}</td>
                    <td className="td text-right font-semibold">{fmtMoney(balance)}</td>
                    <td className="td"><StatusBadge status={overdue ? 'overdue' : inv.status} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="px-4"><Pagination meta={data.meta} onPage={setPage} /></div>
        </div>
      )}
    </div>
  );
}
