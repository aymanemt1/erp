import { useState } from 'react';
import { useFetch } from '../utils/hooks';
import { suppliers } from '../api/erp';
import { errMsg } from '../api/client';
import { useAuth, useToast, useAction } from '../context/AppContext';
import { Card, Modal, Field, ConfirmDialog, Spinner, EmptyState, ErrorState } from '../components/ui';

const EMPTY = { name: '', email: '', phone: '', address: '', tax_id: '', notes: '' };

function SupplierModal({ open, onClose, initial, onSaved }) {
  const [form, setForm] = useState(initial?.id ? initial : EMPTY);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (initial?.id) await suppliers.update(initial.id, form);
      else await suppliers.create(form);
      toast.push(initial?.id ? 'Supplier updated' : 'Supplier created', 'success');
      onSaved();
      onClose();
    } catch (err) {
      toast.push(errMsg(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={initial?.id ? 'Edit supplier' : 'New supplier'}>
      <form onSubmit={save} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Name" className="sm:col-span-2">
          <input className="input" value={form.name || ''} onChange={(e) => set('name', e.target.value)} required placeholder="e.g. Atlas Wholesale" />
        </Field>
        <Field label="Email">
          <input className="input" type="email" value={form.email || ''} onChange={(e) => set('email', e.target.value)} />
        </Field>
        <Field label="Phone">
          <input className="input" value={form.phone || ''} onChange={(e) => set('phone', e.target.value)} />
        </Field>
        <Field label="Tax ID">
          <input className="input" value={form.tax_id || ''} onChange={(e) => set('tax_id', e.target.value)} placeholder="ICE / RC" />
        </Field>
        <Field label="Address" className="sm:col-span-2">
          <input className="input" value={form.address || ''} onChange={(e) => set('address', e.target.value)} />
        </Field>
        <Field label="Notes" className="sm:col-span-2">
          <textarea className="input" rows={2} value={form.notes || ''} onChange={(e) => set('notes', e.target.value)} />
        </Field>
        <div className="flex justify-end gap-3 sm:col-span-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save supplier'}</button>
        </div>
      </form>
    </Modal>
  );
}

export default function Suppliers() {
  const [modal, setModal] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [busyDel, setBusyDel] = useState(false);
  const { canManage } = useAuth();
  const act = useAction();

  const { data, loading, error, reload } = useFetch(suppliers.list);
  const items = data?.items || [];

  const doDelete = async () => {
    setBusyDel(true);
    try {
      await act(() => suppliers.remove(confirmId), 'Supplier deleted');
      setConfirmId(null);
      reload();
    } finally {
      setBusyDel(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{items.length} suppliers</p>
        {canManage && <button className="btn-primary" onClick={() => setModal({ mode: 'create' })}>+ New supplier</button>}
      </div>

      {loading ? <Spinner /> : error ? <ErrorState error={error} onRetry={reload} /> : items.length === 0 ? (
        <Card><EmptyState title="No suppliers yet" hint="Add the vendors you buy stock from." /></Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((s) => (
            <div key={s.id} className="card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-bold text-slate-900">{s.name}</p>
                  <p className="text-xs text-slate-400">{s.tax_id || ''}</p>
                </div>
                {canManage && (
                  <div className="flex gap-1">
                    <button className="btn-ghost" onClick={() => setModal({ mode: 'edit', supplier: s })}>Edit</button>
                    <button className="btn-ghost text-red-600" onClick={() => setConfirmId(s.id)}>Delete</button>
                  </div>
                )}
              </div>
              <div className="mt-3 space-y-1 text-sm text-slate-600">
                {s.email && <p>✉️ {s.email}</p>}
                {s.phone && <p>📞 {s.phone}</p>}
                {s.address && <p>📍 {s.address}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      <SupplierModal key={modal ? `${modal.mode}-${modal.supplier?.id || 'new'}` : 'closed'} open={!!modal} onClose={() => setModal(null)} initial={modal?.mode === 'edit' ? modal.supplier : null} onSaved={reload} />
      <ConfirmDialog open={!!confirmId} title="Delete supplier?" message="This cannot be undone." busy={busyDel} onConfirm={doDelete} onCancel={() => setConfirmId(null)} />
    </div>
  );
}
