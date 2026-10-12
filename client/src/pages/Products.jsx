import { useState } from 'react';
import { useFetch } from '../utils/hooks';
import { products, categories, warehouses } from '../api/erp';
import { errMsg } from '../api/client';
import { useAuth, useToast, useAction } from '../context/AppContext';
import { Card, Modal, Field, ConfirmDialog, Spinner, EmptyState, ErrorState, Pagination, Badge } from '../components/ui';
import { fmtMoney, fmtNum, productStock, cx } from '../utils/format';

const EMPTY = { name: '', sku: '', category_id: '', purchase_price: '', sale_price: '', reorder_level: 5, description: '' };

function ProductModal({ open, onClose, initial, onSaved }) {
  const [form, setForm] = useState(initial || EMPTY);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const { data: cats } = useFetch(categories.list);
  const catItems = cats?.items || [];

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = {
        ...form,
        category_id: form.category_id || null,
        purchase_price: Number(form.purchase_price || 0),
        sale_price: Number(form.sale_price || 0),
        reorder_level: Number(form.reorder_level || 0),
      };
      if (initial?.id) await products.update(initial.id, payload);
      else await products.create(payload);
      toast.push(initial?.id ? 'Product updated' : 'Product created', 'success');
      onSaved();
      onClose();
    } catch (err) {
      toast.push(errMsg(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={initial?.id ? 'Edit product' : 'New product'} wide>
      <form onSubmit={save} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Name" className="sm:col-span-2">
          <input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} required placeholder="e.g. Office Chair Pro" />
        </Field>
        <Field label="SKU">
          <input className="input" value={form.sku} onChange={(e) => set('sku', e.target.value)} placeholder="PRD-001" />
        </Field>
        <Field label="Category">
          <select className="input" value={form.category_id} onChange={(e) => set('category_id', e.target.value)}>
            <option value="">— None —</option>
            {catItems.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Purchase price">
          <input className="input" type="number" min="0" step="0.01" value={form.purchase_price} onChange={(e) => set('purchase_price', e.target.value)} />
        </Field>
        <Field label="Sale price">
          <input className="input" type="number" min="0" step="0.01" value={form.sale_price} onChange={(e) => set('sale_price', e.target.value)} />
        </Field>
        <Field label="Reorder level">
          <input className="input" type="number" min="0" step="1" value={form.reorder_level} onChange={(e) => set('reorder_level', e.target.value)} hint="Alert triggers below this quantity" />
        </Field>
        <Field label="Description" className="sm:col-span-2">
          <textarea className="input" rows={2} value={form.description} onChange={(e) => set('description', e.target.value)} />
        </Field>
        <div className="flex justify-end gap-3 sm:col-span-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save product'}</button>
        </div>
      </form>
    </Modal>
  );
}

export default function Products() {
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [lowOnly, setLowOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null); // null | {mode:'create'} | {mode:'edit', product}
  const [confirmId, setConfirmId] = useState(null);
  const [busyDel, setBusyDel] = useState(false);
  const { canManage } = useAuth();
  const toast = useToast();
  const act = useAction();

  const { data, loading, error, reload } = useFetch(
    () => products.list({ search: search || undefined, category_id: catFilter || undefined, low_stock: lowOnly ? 1 : undefined, page }),
    [search, catFilter, lowOnly, page]
  );
  const { data: cats } = useFetch(categories.list);
  const catItems = cats?.items || [];
  const items = data?.items || [];
  const { data: whs } = useFetch(warehouses.list);
  const whItems = whs?.items || [];

  const doDelete = async () => {
    setBusyDel(true);
    try {
      await act(() => products.remove(confirmId), 'Product deleted');
      setConfirmId(null);
      reload();
    } finally {
      setBusyDel(false);
    }
  };

  const stockFor = (p, wid) => {
    if (Array.isArray(p.stocks)) {
      const s = p.stocks.find((x) => String(x.warehouse_id ?? x.warehouse?.id) === String(wid));
      return s ? Number(s.quantity || 0) : 0;
    }
    return null;
  };

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <input className="input max-w-xs" placeholder="Search name or SKU…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          <select className="input max-w-[200px]" value={catFilter} onChange={(e) => { setCatFilter(e.target.value); setPage(1); }}>
            <option value="">All categories</option>
            {catItems.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-600">
            <input type="checkbox" className="h-4 w-4 accent-indigo-600" checked={lowOnly} onChange={(e) => { setLowOnly(e.target.checked); setPage(1); }} />
            Low stock only
          </label>
          <div className="ml-auto">
            {canManage && <button className="btn-primary" onClick={() => setModal({ mode: 'create' })}>+ New product</button>}
          </div>
        </div>
      </Card>

      {loading ? <Spinner /> : error ? <ErrorState error={error} onRetry={reload} /> : items.length === 0 ? (
        <Card><EmptyState title="No products found" hint="Try adjusting the filters, or create your first product." /></Card>
      ) : (
        <div className="table-wrap">
          <table className="w-full">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="th">SKU</th>
                <th className="th">Product</th>
                <th className="th">Category</th>
                <th className="th text-right">Purchase</th>
                <th className="th text-right">Sale</th>
                {whItems.slice(0, 3).map((w) => <th key={w.id} className="th text-right">{w.name?.slice(0, 12)}</th>)}
                <th className="th text-right">Total</th>
                <th className="th text-right">Status</th>
                {canManage && <th className="th" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((p) => {
                const total = productStock(p);
                const low = total <= Number(p.reorder_level ?? 0);
                return (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="td font-mono text-xs text-slate-500">{p.sku || '—'}</td>
                    <td className="td font-semibold text-slate-900">{p.name}</td>
                    <td className="td">{p.category?.name || '—'}</td>
                    <td className="td text-right">{fmtMoney(p.purchase_price)}</td>
                    <td className="td text-right font-semibold">{fmtMoney(p.sale_price)}</td>
                    {whItems.slice(0, 3).map((w) => {
                      const q = stockFor(p, w.id);
                      return <td key={w.id} className="td text-right">{q == null ? '—' : fmtNum(q)}</td>;
                    })}
                    <td className="td text-right font-bold">{fmtNum(total)}</td>
                    <td className="td text-right">
                      <Badge tone={low ? 'red' : 'emerald'}>{low ? 'Low stock' : 'OK'}</Badge>
                    </td>
                    {canManage && (
                      <td className="td whitespace-nowrap text-right">
                        <button className="btn-ghost" onClick={() => setModal({ mode: 'edit', product: p })}>Edit</button>
                        <button className="btn-ghost text-red-600" onClick={() => setConfirmId(p.id)}>Delete</button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="px-4"><Pagination meta={data.meta} onPage={setPage} /></div>
        </div>
      )}

      <ProductModal
        key={modal ? `${modal.mode}-${modal.product?.id || 'new'}` : 'closed'}
        open={!!modal}
        onClose={() => setModal(null)}
        initial={modal?.mode === 'edit' ? modal.product : null}
        onSaved={reload}
      />
      <ConfirmDialog
        open={!!confirmId}
        title="Delete product?"
        message="This will permanently delete the product and its stock records. This cannot be undone."
        confirmLabel="Delete"
        busy={busyDel}
        onConfirm={doDelete}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}
