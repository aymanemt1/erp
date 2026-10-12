import { useState } from 'react';
import { useFetch } from '../utils/hooks';
import { movements, products, warehouses } from '../api/erp';
import { errMsg } from '../api/client';
import { useToast } from '../context/AppContext';
import { Card, Modal, Field, Spinner, EmptyState, ErrorState, Pagination, StatusBadge } from '../components/ui';
import { fmtNum, fmtDateTime } from '../utils/format';

function TransferModal({ open, onClose, onDone, products: prods, warehouses: whs }) {
  const [form, setForm] = useState({ product_id: '', from_warehouse_id: '', to_warehouse_id: '', quantity: 1, notes: '' });
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async (e) => {
    e.preventDefault();
    if (form.from_warehouse_id === form.to_warehouse_id) {
      toast.push('Source and destination warehouses must differ', 'error');
      return;
    }
    setBusy(true);
    try {
      await movements.transfer({ ...form, quantity: Number(form.quantity) });
      toast.push('Stock transferred', 'success');
      onDone();
      onClose();
    } catch (err) {
      toast.push(errMsg(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Transfer stock">
      <form onSubmit={save} className="space-y-4">
        <Field label="Product">
          <select className="input" value={form.product_id} onChange={(e) => set('product_id', e.target.value)} required>
            <option value="">— Select —</option>
            {prods.map((p) => <option key={p.id} value={p.id}>{p.sku ? `${p.sku} · ` : ''}{p.name}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="From warehouse">
            <select className="input" value={form.from_warehouse_id} onChange={(e) => set('from_warehouse_id', e.target.value)} required>
              <option value="">— Select —</option>
              {whs.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </Field>
          <Field label="To warehouse">
            <select className="input" value={form.to_warehouse_id} onChange={(e) => set('to_warehouse_id', e.target.value)} required>
              <option value="">— Select —</option>
              {whs.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Quantity">
          <input className="input" type="number" min="1" step="1" value={form.quantity} onChange={(e) => set('quantity', e.target.value)} required />
        </Field>
        <Field label="Notes">
          <input className="input" value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Optional reason" />
        </Field>
        <div className="flex justify-end gap-3">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={busy}>{busy ? 'Transferring…' : 'Transfer'}</button>
        </div>
      </form>
    </Modal>
  );
}

function AdjustModal({ open, onClose, onDone, products: prods, warehouses: whs }) {
  const [form, setForm] = useState({ product_id: '', warehouse_id: '', quantity: '', reason: '' });
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await movements.adjust({ ...form, quantity: Number(form.quantity) });
      toast.push('Stock adjusted', 'success');
      onDone();
      onClose();
    } catch (err) {
      toast.push(errMsg(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Adjust stock">
      <form onSubmit={save} className="space-y-4">
        <Field label="Product">
          <select className="input" value={form.product_id} onChange={(e) => set('product_id', e.target.value)} required>
            <option value="">— Select —</option>
            {prods.map((p) => <option key={p.id} value={p.id}>{p.sku ? `${p.sku} · ` : ''}{p.name}</option>)}
          </select>
        </Field>
        <Field label="Warehouse">
          <select className="input" value={form.warehouse_id} onChange={(e) => set('warehouse_id', e.target.value)} required>
            <option value="">— Select —</option>
            {whs.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </Field>
        <Field label="New quantity (absolute)" hint="Sets the stock level to this exact number; a movement is logged for the difference.">
          <input className="input" type="number" min="0" step="1" value={form.quantity} onChange={(e) => set('quantity', e.target.value)} required />
        </Field>
        <Field label="Reason">
          <input className="input" value={form.reason} onChange={(e) => set('reason', e.target.value)} placeholder="e.g. Year-end inventory count" required />
        </Field>
        <div className="flex justify-end gap-3">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Apply adjustment'}</button>
        </div>
      </form>
    </Modal>
  );
}

const TYPE_TONE = { in: 'emerald', out: 'amber', transfer: 'indigo', adjustment: 'purple' };

export default function Stock() {
  const [type, setType] = useState('');
  const [productId, setProductId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [page, setPage] = useState(1);
  const [showTransfer, setShowTransfer] = useState(false);
  const [showAdjust, setShowAdjust] = useState(false);

  const { data, loading, error, reload } = useFetch(
    () => movements.list({ type: type || undefined, product_id: productId || undefined, warehouse_id: warehouseId || undefined, page }),
    [type, productId, warehouseId, page]
  );
  const { data: prods } = useFetch(products.list);
  const { data: whs } = useFetch(warehouses.list);
  const items = data?.items || [];
  const prodItems = prods?.items || [];
  const whItems = whs?.items || [];

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <select className="input max-w-[180px]" value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}>
            <option value="">All types</option>
            <option value="in">Stock in</option>
            <option value="out">Stock out</option>
            <option value="transfer">Transfer</option>
            <option value="adjustment">Adjustment</option>
          </select>
          <select className="input max-w-[220px]" value={productId} onChange={(e) => { setProductId(e.target.value); setPage(1); }}>
            <option value="">All products</option>
            {prodItems.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select className="input max-w-[220px]" value={warehouseId} onChange={(e) => { setWarehouseId(e.target.value); setPage(1); }}>
            <option value="">All warehouses</option>
            {whItems.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
          <div className="ml-auto flex gap-2">
            <button className="btn-secondary" onClick={() => setShowAdjust(true)}>Adjust stock</button>
            <button className="btn-primary" onClick={() => setShowTransfer(true)}>Transfer stock</button>
          </div>
        </div>
      </Card>

      {loading ? <Spinner /> : error ? <ErrorState error={error} onRetry={reload} /> : items.length === 0 ? (
        <Card><EmptyState title="No movements found" hint="Stock ins, outs, transfers and adjustments will appear here." /></Card>
      ) : (
        <div className="table-wrap">
          <table className="w-full">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="th">Date</th>
                <th className="th">Product</th>
                <th className="th">Warehouse</th>
                <th className="th">Type</th>
                <th className="th text-right">Quantity</th>
                <th className="th">Reference</th>
                <th className="th">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="td whitespace-nowrap text-slate-500">{fmtDateTime(m.created_at)}</td>
                  <td className="td font-semibold text-slate-900">{m.product?.name || '—'}</td>
                  <td className="td">{m.warehouse?.name || m.to_warehouse?.name || '—'}</td>
                  <td className="td"><StatusBadge status={m.type} /></td>
                  <td className={`td text-right font-bold ${Number(m.quantity) < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {Number(m.quantity) > 0 ? '+' : ''}{fmtNum(m.quantity)}
                  </td>
                  <td className="td font-mono text-xs text-slate-500">{m.reference || '—'}</td>
                  <td className="td max-w-[200px] truncate text-slate-500">{m.notes || m.reason || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4"><Pagination meta={data.meta} onPage={setPage} /></div>
        </div>
      )}

      <TransferModal key={`t-${showTransfer}`} open={showTransfer} onClose={() => setShowTransfer(false)} onDone={reload} products={prodItems} warehouses={whItems} />
      <AdjustModal key={`a-${showAdjust}`} open={showAdjust} onClose={() => setShowAdjust(false)} onDone={reload} products={prodItems} warehouses={whItems} />
    </div>
  );
}
