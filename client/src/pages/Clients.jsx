import { useState } from 'react';
import { useFetch } from '../utils/hooks';
import { clients } from '../api/erp';
import { errMsg } from '../api/client';
import { useAuth, useToast, useAction } from '../context/AppContext';
import { Card, Modal, Field, ConfirmDialog, Spinner, EmptyState, ErrorState } from '../components/ui';
import { initials } from '../utils/format';

const EMPTY = { name: '', email: '', phone: '', address: '', tax_id: '', notes: '' };

function ClientModal({ open, onClose, initial, onSaved }) {
  const [form, setForm] = useState(initial?.id ? initial : EMPTY);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (initial?.id) await clients.update(initial.id, form);
      else await clients.create(form);
      toast.push(initial?.id ? 'Client updated' : 'Client created', 'success');
      onSaved();
      onClose();
    } catch (err) {
      toast.push(errMsg(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={initial?.id ? 'Edit client' : 'New client'}>
      <form onSubmit={save} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Name" className="sm:col-span-2">
          <input className="input" value={form.name || ''} onChange={(e) => set('name', e.target.value)} required placeholder="e.g. Café Central" />
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
          <button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save client'}</button>
        </div>
      </form>
    </Modal>
  );
}

export default function Clients() {
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [busyDel, setBusyDel] = useState(false);
  const { canManage } = useAuth();
  const act = useAction();

  const { data, loading, error, reload } = useFetch(() => clients.list({ search: search || undefined }), [search]);
  const items = data?.items || [];

  const doDelete = async () => {
    setBusyDel(true);
    try {
      await act(() => clients.remove(confirmId), 'Client deleted');
      setConfirmId(null);
      reload();
    } finally {
      setBusyDel(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <input className="input max-w-xs" placeholder="Search clients…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <p className="text-sm text-slate-500">{items.length} clients</p>
          <div className="ml-auto">
            {canManage && <button className="btn-primary" onClick={() => setModal({ mode: 'create' })}>+ New client</button>}
          </div>
        </div>
      </Card>

      {loading ? <Spinner /> : error ? <ErrorState error={error} onRetry={reload} /> : items.length === 0 ? (
        <Card><EmptyState title="No clients yet" hint="Add the customers you sell to — quotations and invoices link to them." /></Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((c) => (
            <div key={c.id} className="card flex gap-4 p-5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
                {initials(c.name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate font-bold text-slate-900">{c.name}</p>
                  {canManage && (
                    <div className="flex shrink-0 gap-1">
                      <button className="btn-ghost" onClick={() => setModal({ mode: 'edit', client: c })}>Edit</button>
                      <button className="btn-ghost text-red-600" onClick={() => setConfirmId(c.id)}>Delete</button>
                    </div>
                  )}
                </div>
                <div className="mt-1 space-y-0.5 text-sm text-slate-600">
                  {c.email && <p className="truncate">✉️ {c.email}</p>}
                  {c.phone && <p>📞 {c.phone}</p>}
                  {c.address && <p className="truncate">📍 {c.address}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ClientModal key={modal ? `${modal.mode}-${modal.client?.id || 'new'}` : 'closed'} open={!!modal} onClose={() => setModal(null)} initial={modal?.mode === 'edit' ? modal.client : null} onSaved={reload} />
      <ConfirmDialog open={!!confirmId} title="Delete client?" message="This cannot be undone." busy={busyDel} onConfirm={doDelete} onCancel={() => setConfirmId(null)} />
    </div>
  );
}
