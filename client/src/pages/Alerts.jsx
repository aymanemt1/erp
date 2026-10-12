import { Link } from 'react-router-dom';
import { useFetch } from '../utils/hooks';
import { fetchLowStock } from '../api/erp';
import { Card, Spinner, EmptyState, ErrorState, Badge } from '../components/ui';
import { fmtNum, productStock } from '../utils/format';

export default function Alerts() {
  const { data, loading, error, reload } = useFetch(fetchLowStock);
  const items = data?.items || [];

  const breakdown = (p) => {
    if (Array.isArray(p.warehouses)) return p.warehouses.map((w) => ({ name: w.name, qty: Number(w.pivot?.quantity ?? w.quantity ?? 0) }));
    if (Array.isArray(p.stocks)) return p.stocks.map((s) => ({ name: s.warehouse?.name || '—', qty: Number(s.quantity || 0) }));
    return [];
  };

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <p className="font-bold text-slate-900">{items.length} product{items.length === 1 ? '' : 's'} below reorder level</p>
            <p className="text-sm text-slate-500">Reorder soon to avoid stockouts. Suggested quantity tops stock back up to 2× the reorder level.</p>
          </div>
          <button className="btn-secondary ml-auto" onClick={reload}>Refresh</button>
        </div>
      </Card>

      {loading ? <Spinner /> : error ? <ErrorState error={error} onRetry={reload} /> : items.length === 0 ? (
        <Card><EmptyState title="All stocked up 🎉" hint="No product is below its reorder level right now." action={<Link to="/products" className="btn-secondary">View products</Link>} /></Card>
      ) : (
        <div className="table-wrap">
          <table className="w-full">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="th">Product</th>
                <th className="th">SKU</th>
                <th className="th">Per-warehouse stock</th>
                <th className="th text-right">Total</th>
                <th className="th text-right">Reorder level</th>
                <th className="th text-right">Suggested order</th>
                <th className="th" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((p) => {
                const total = productStock(p);
                const level = Number(p.reorder_level ?? 0);
                const suggested = Math.max(level * 2 - total, 0);
                const bd = breakdown(p);
                return (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="td font-semibold text-slate-900">{p.name}</td>
                    <td className="td font-mono text-xs text-slate-500">{p.sku || '—'}</td>
                    <td className="td">
                      {bd.length === 0 ? <span className="text-slate-400">—</span> : (
                        <div className="flex flex-wrap gap-1.5">
                          {bd.map((b, i) => (
                            <Badge key={i} tone={b.qty === 0 ? 'red' : 'slate'}>{b.name}: {fmtNum(b.qty)}</Badge>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="td text-right font-bold text-red-600">{fmtNum(total)}</td>
                    <td className="td text-right">{fmtNum(level)}</td>
                    <td className="td text-right font-semibold text-indigo-700">{fmtNum(suggested)}</td>
                    <td className="td text-right">
                      <Link to="/purchase-orders/new" className="btn-ghost text-indigo-600">Order →</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
