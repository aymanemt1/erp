import { useState } from 'react';
import { useFetch } from '../utils/hooks';
import { categories } from '../api/erp';
import { errMsg } from '../api/client';
import { useAuth, useToast, useAction } from '../context/AppContext';
import { Card, Modal, Field, ConfirmDialog, Spinner, EmptyState, ErrorState } from '../components/ui';

/** Generic simple CRUD screen (used for Categories and Warehouses). */
export function SimpleCrud({ title, singular, api, fields, columns, emptyHint }) {
  const [modal, setModal] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [busyDel, setBusyDel] = useState(false);
  const { canManage } = useAuth();
  const toast = useToast();
  const act = useAction();

  const { data, loading, error, reload } = useFetch(api.list);
  const items = data?.items || [];

  const save = async (e, form, setBusy) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (form.id) await api.update(form.id, form);
      else await api.create(form);
      toast.push(form.id ? `${singular} updated` : `${singular} created`, 'success');
      setModal(null);
      reload();
    } catch (err) {
      toast.push(errMsg(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const doDelete = async () => {
    setBusyDel(true);
    try {
      await act(() => api.remove(confirmId), `${singular} deleted`);
      setConfirmId(null);
      reload();
    } finally {
      setBusyDel(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{items.length} {title.toLowerCase()}</p>
        {canManage && <button className="btn-primary" onClick={() => setModal({})}>+ New {singular.toLowerCase()}</button>}
      </div>

      {loading ? <Spinner /> : error ? <ErrorState error={error} onRetry={reload} /> : items.length === 0 ? (
        <Card><EmptyState title={`No ${title.toLowerCase()} yet`} hint={emptyHint} /></Card>
      ) : (
        <div className="table-wrap">
          <table className="w-full">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                {columns.map((c) => <th key={c.key} className="th">{c.label}</th>)}
                {canManage && <th className="th" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((it) => (
                <tr key={it.id} className="hover:bg-slate-50">
                  {columns.map((c) => <td key={c.key} className="td">{c.render ? c.render(it) : (it[c.key] ?? '—')}</td>)}
                  {canManage && (
                    <td className="td whitespace-nowrap text-right">
                      <button className="btn-ghost" onClick={() => setModal(it)}>Edit</button>
                      <button className="btn-ghost text-red-600" onClick={() => setConfirmId(it.id)}>Delete</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CrudModal open={!!modal} onClose={() => setModal(null)} singular={singular} initial={modal} fields={fields} onSave={save} />
      <ConfirmDialog
        open={!!confirmId}
        title={`Delete ${singular.toLowerCase()}?`}
        message="This cannot be undone."
        busy={busyDel}
        onConfirm={doDelete}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}

function CrudModal({ open, onClose, singular, initial, fields, onSave }) {
  const blank = Object.fromEntries(fields.map((f) => [f.key, f.type === 'checkbox' ? false : '']));
  const [form, setForm] = useState({ ...(initial?.id ? initial : blank), id: initial?.id });
  const [busy, setBusy] = useState(false);

  // reset when a different record opens
  const key = initial?.id || 'new';
  const [lastKey, setLastKey] = useState(key);
  if (key !== lastKey) {
    setLastKey(key);
    setForm({ ...(initial?.id ? initial : blank), id: initial?.id });
  }

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Modal open={open} onClose={onClose} title={initial?.id ? `Edit ${singular.toLowerCase()}` : `New ${singular.toLowerCase()}`}>
      <form onSubmit={(e) => onSave(e, form, setBusy)} className="space-y-4">
        {fields.map((f) => (
          <Field key={f.key} label={f.label} hint={f.hint}>
            {f.type === 'textarea' ? (
              <textarea className="input" rows={2} value={form[f.key] || ''} onChange={(e) => set(f.key, e.target.value)} />
            ) : f.type === 'checkbox' ? (
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" className="h-4 w-4 accent-indigo-600" checked={!!form[f.key]} onChange={(e) => set(f.key, e.target.checked)} />
                {f.checkboxLabel}
              </label>
            ) : (
              <input className="input" type={f.type || 'text'} value={form[f.key] || ''} onChange={(e) => set(f.key, e.target.value)} required={f.required} placeholder={f.placeholder} />
            )}
          </Field>
        ))}
        <div className="flex justify-end gap-3">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
    </Modal>
  );
}

export default function Categories() {
  return (
    <SimpleCrud
      title="Categories"
      singular="Category"
      api={categories}
      emptyHint="Group your products (e.g. Electronics, Furniture, Office supplies)."
      fields={[
        { key: 'name', label: 'Name', required: true, placeholder: 'e.g. Electronics' },
        { key: 'description', label: 'Description', type: 'textarea' },
      ]}
      columns={[
        { key: 'name', label: 'Name', render: (c) => <span className="font-semibold text-slate-900">{c.name}</span> },
        { key: 'description', label: 'Description' },
        { key: 'products_count', label: 'Products', render: (c) => c.products_count ?? c.products?.length ?? '—' },
      ]}
    />
  );
}
