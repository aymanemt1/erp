import { Link } from 'react-router-dom';
import { useFetch } from '../utils/hooks';
import { fetchDashboard } from '../api/erp';
import { Card, StatCard, Spinner, ErrorState, StatusBadge } from '../components/ui';
import { BarChart } from '../components/Charts';
import { fmtMoney, fmtNum, fmtDate } from '../utils/format';

export default function Dashboard() {
  const { data: d, loading, error, reload } = useFetch(fetchDashboard);

  if (loading) return <Spinner label="Loading dashboard…" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const s = d?.stats || d || {};
  const chart = d?.revenue_chart || d?.revenueChart || [];
  const lowStock = d?.low_stock || d?.lowStock || [];
  const recentInvoices = d?.recent_invoices || d?.recentInvoices || [];
  const recentPOs = d?.recent_pos || d?.recentPOs || d?.recent_purchase_orders || [];
  const recentMoves = d?.recent_movements || d?.recentMovements || [];

  const stats = [
    { label: 'Revenue this month', value: fmtMoney(s.revenue_month ?? s.revenueMonth), icon: '💰', tone: 'emerald' },
    { label: 'Outstanding', value: fmtMoney(s.outstanding ?? s.unpaid_total), icon: '⏳', tone: 'amber', sub: `${s.overdue_invoices ?? s.overdueInvoices ?? 0} overdue invoices` },
    { label: 'Stock value', value: fmtMoney(s.stock_value ?? s.stockValue), icon: '📦', tone: 'indigo' },
    { label: 'Low stock items', value: fmtNum(s.low_stock_count ?? s.lowStockCount), icon: '⚠️', tone: 'red', sub: 'below reorder level' },
    { label: 'Pending POs', value: fmtNum(s.pending_pos ?? s.pendingPOs), icon: '🚚', tone: 'blue' },
    { label: 'Products', value: fmtNum(s.products_count ?? s.productsCount), icon: '🏷️', tone: 'slate' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map((x) => (
          <StatCard key={x.label} {...x} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card title="Revenue" className="xl:col-span-2" action={<Link to="/invoices" className="btn-ghost text-sm">View invoices →</Link>}>
          {chart.length > 0 ? (
            <BarChart data={chart.map((c) => ({ label: c.label || c.month, value: c.total }))} format={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)} />
          ) : (
            <p className="py-10 text-center text-sm text-slate-400">No revenue data yet.</p>
          )}
        </Card>

        <Card title="Low stock" action={<Link to="/alerts" className="btn-ghost text-sm">All alerts →</Link>}>
          {lowStock.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">All stocked up. 🎉</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {lowStock.slice(0, 6).map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">{p.name}</p>
                    <p className="text-xs text-slate-400">{p.sku}</p>
                  </div>
                  <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700">
                    {p.total_stock ?? p.stock ?? 0} left
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card title="Recent invoices" action={<Link to="/invoices" className="btn-ghost text-sm">All →</Link>}>
          {recentInvoices.length === 0 ? <p className="py-6 text-center text-sm text-slate-400">No invoices yet.</p> : (
            <ul className="divide-y divide-slate-100">
              {recentInvoices.slice(0, 5).map((inv) => (
                <li key={inv.id} className="flex items-center justify-between gap-2 py-2.5">
                  <div className="min-w-0">
                    <Link to={`/invoices/${inv.id}`} className="text-sm font-semibold text-indigo-600 hover:underline">{inv.reference || `#${inv.id}`}</Link>
                    <p className="truncate text-xs text-slate-400">{inv.client?.name} · {fmtDate(inv.due_date || inv.created_at)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-sm font-bold text-slate-800">{fmtMoney(inv.total)}</span>
                    <StatusBadge status={inv.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Recent purchase orders" action={<Link to="/purchase-orders" className="btn-ghost text-sm">All →</Link>}>
          {recentPOs.length === 0 ? <p className="py-6 text-center text-sm text-slate-400">No purchase orders yet.</p> : (
            <ul className="divide-y divide-slate-100">
              {recentPOs.slice(0, 5).map((po) => (
                <li key={po.id} className="flex items-center justify-between gap-2 py-2.5">
                  <div className="min-w-0">
                    <Link to={`/purchase-orders/${po.id}`} className="text-sm font-semibold text-indigo-600 hover:underline">{po.reference || `#${po.id}`}</Link>
                    <p className="truncate text-xs text-slate-400">{po.supplier?.name}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-sm font-bold text-slate-800">{fmtMoney(po.total)}</span>
                    <StatusBadge status={po.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Latest stock movements" action={<Link to="/stock" className="btn-ghost text-sm">All →</Link>}>
          {recentMoves.length === 0 ? <p className="py-6 text-center text-sm text-slate-400">No movements yet.</p> : (
            <ul className="divide-y divide-slate-100">
              {recentMoves.slice(0, 5).map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-2 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">{m.product?.name}</p>
                    <p className="truncate text-xs text-slate-400">{m.warehouse?.name} · {fmtDate(m.created_at)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={`text-sm font-bold ${Number(m.quantity) < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {Number(m.quantity) > 0 ? '+' : ''}{m.quantity}
                    </span>
                    <StatusBadge status={m.type} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
