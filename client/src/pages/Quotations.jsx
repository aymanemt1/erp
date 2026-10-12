import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useFetch } from '../utils/hooks';
import { quotations, clients } from '../api/erp';
import { useAuth } from '../context/AppContext';
import { Card, Spinner, EmptyState, ErrorState, Pagination, StatusBadge } from '../components/ui';
import { fmtMoney, fmtDate } from '../utils/format';

export default function Quotations() {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const { canManage } = useAuth();

  const { data, loading, error, reload } = useFetch(
    () => quotations.list({ status: status || undefined, page }),
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
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
            <option value="expired">Expired</option>
          </select>
          <div className="ml-auto">
            {canManage && <Link to="/quotations/new" className="btn-primary">+ New quotation</Link>}
          </div>
        </div>
      </Card>

      {loading ? <Spinner /> : error ? <ErrorState error={error} onRetry={reload} /> : items.length === 0 ? (
        <Card><EmptyState title="No quotations" hint="Send a quotation to a client — accepted ones convert into invoices." /></Card>
      ) : (
        <div className="table-wrap">
          <table className="w-full">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="th">Reference</th>
                <th className="th">Client</th>
                <th className="th">Date</th>
                <th className="th">Valid until</th>
                <th className="th text-right">Total</th>
                <th className="th">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((q) => (
                <tr key={q.id} className="hover:bg-slate-50">
                  <td className="td"><Link to={`/quotations/${q.id}`} className="font-semibold text-indigo-600 hover:underline">{q.reference || `#${q.id}`}</Link></td>
                  <td className="td">{q.client?.name || '—'}</td>
                  <td className="td text-slate-500">{fmtDate(q.created_at)}</td>
                  <td className="td text-slate-500">{fmtDate(q.valid_until)}</td>
                  <td className="td text-right font-bold">{fmtMoney(q.total)}</td>
                  <td className="td"><StatusBadge status={q.status} /></td>
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
