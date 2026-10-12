import { useEffect, useState } from 'react';
import { useFetch } from '../utils/hooks';
import { settings } from '../api/erp';
import { errMsg } from '../api/client';
import { useToast } from '../context/AppContext';
import { Card, Field, Spinner, ErrorState } from '../components/ui';

const CURRENCIES = ['MAD', 'EUR', 'USD', 'GBP', 'CAD'];

export default function Settings() {
  const toast = useToast();
  const [form, setForm] = useState({
    company_name: '', email: '', phone: '', address: '', city: '', tax_id: '',
    currency: 'MAD', tax_rate: 20, invoice_prefix: 'INV-', quotation_prefix: 'QT-', po_prefix: 'PO-',
  });
  const [busy, setBusy] = useState(false);
  const { data, loading, error, reload } = useFetch(settings.get);

  useEffect(() => {
    if (data) setForm((f) => ({ ...f, ...data }));
  }, [data]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = { ...form, tax_rate: Number(form.tax_rate || 0) };
      const saved = await settings.update(payload);
      if (saved?.currency) localStorage.setItem('erp_currency', saved.currency);
      else if (form.currency) localStorage.setItem('erp_currency', form.currency);
      toast.push('Settings saved', 'success');
      reload();
    } catch (err) {
      toast.push(errMsg(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Spinner />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  return (
    <form onSubmit={save} className="space-y-5">
      <Card title="Company information">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Company name">
            <input className="input" value={form.company_name || ''} onChange={(e) => set('company_name', e.target.value)} />
          </Field>
          <Field label="Tax ID (ICE / RC)">
            <input className="input" value={form.tax_id || ''} onChange={(e) => set('tax_id', e.target.value)} />
          </Field>
          <Field label="Email">
            <input className="input" type="email" value={form.email || ''} onChange={(e) => set('email', e.target.value)} />
          </Field>
          <Field label="Phone">
            <input className="input" value={form.phone || ''} onChange={(e) => set('phone', e.target.value)} />
          </Field>
          <Field label="Address">
            <input className="input" value={form.address || ''} onChange={(e) => set('address', e.target.value)} />
          </Field>
          <Field label="City">
            <input className="input" value={form.city || ''} onChange={(e) => set('city', e.target.value)} />
          </Field>
        </div>
      </Card>

      <Card title="Billing defaults">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Currency" hint="Used for all money formatting">
            <select className="input" value={form.currency || 'MAD'} onChange={(e) => set('currency', e.target.value)}>
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Default tax rate %" hint="Pre-filled on new documents">
            <input className="input" type="number" min="0" max="100" step="0.01" value={form.tax_rate ?? 20} onChange={(e) => set('tax_rate', e.target.value)} />
          </Field>
          <div />
          <Field label="Invoice prefix" hint="e.g. INV-2026-0001">
            <input className="input" value={form.invoice_prefix || ''} onChange={(e) => set('invoice_prefix', e.target.value)} />
          </Field>
          <Field label="Quotation prefix">
            <input className="input" value={form.quotation_prefix || ''} onChange={(e) => set('quotation_prefix', e.target.value)} />
          </Field>
          <Field label="Purchase order prefix">
            <input className="input" value={form.po_prefix || ''} onChange={(e) => set('po_prefix', e.target.value)} />
          </Field>
        </div>
      </Card>

      <div className="flex justify-end">
        <button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save settings'}</button>
      </div>
    </form>
  );
}
