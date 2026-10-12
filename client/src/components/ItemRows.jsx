import { fmtMoney } from '../utils/format';

/**
 * Dynamic line-item editor shared by PO / quotation / invoice forms.
 * rows: [{ product_id, name?, quantity, unit_price }]
 */
export default function ItemRows({ rows, setRows, products = [], priceField = 'sale_price', currency }) {
  const update = (i, patch) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const pickProduct = (i, pid) => {
    const p = products.find((x) => String(x.id) === String(pid));
    update(i, {
      product_id: pid,
      name: p?.name || '',
      unit_price: p ? Number(p[priceField] ?? p.sale_price ?? p.purchase_price ?? 0) : 0,
    });
  };

  const subtotal = rows.reduce((s, r) => s + Number(r.quantity || 0) * Number(r.unit_price || 0), 0);

  return (
    <div>
      <div className="table-wrap">
        <table className="w-full">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="th">Product</th>
              <th className="th w-24">Qty</th>
              <th className="th w-36">Unit price</th>
              <th className="th w-32 text-right">Line total</th>
              <th className="th w-12" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r, i) => (
              <tr key={i}>
                <td className="td">
                  <select className="input" value={r.product_id || ''} onChange={(e) => pickProduct(i, e.target.value)}>
                    <option value="">— Select product —</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.sku ? `${p.sku} · ` : ''}{p.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="td">
                  <input type="number" min="1" step="1" className="input" value={r.quantity} onChange={(e) => update(i, { quantity: e.target.value })} />
                </td>
                <td className="td">
                  <input type="number" min="0" step="0.01" className="input" value={r.unit_price} onChange={(e) => update(i, { unit_price: e.target.value })} />
                </td>
                <td className="td text-right font-semibold">{fmtMoney(Number(r.quantity || 0) * Number(r.unit_price || 0), currency)}</td>
                <td className="td">
                  <button type="button" className="btn-ghost text-red-500" onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))} title="Remove row">
                    ×
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="td py-8 text-center text-slate-400">
                  No items yet — add the first row below.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <button
          type="button"
          className="btn-secondary"
          onClick={() => setRows((rs) => [...rs, { product_id: '', name: '', quantity: 1, unit_price: 0 }])}
        >
          + Add item
        </button>
        <p className="text-sm text-slate-600">
          Subtotal: <span className="text-base font-bold text-slate-900">{fmtMoney(subtotal, currency)}</span>
        </p>
      </div>
    </div>
  );
}
