import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useFetch } from '../utils/hooks';
import { quotations, clients, products } from '../api/erp';
import { errMsg } from '../api/client';
import { useToast } from '../context/AppContext';
import { Card, Field, Spinner } from '../components/ui';
import ItemRows from '../components/ItemRows';
import { fmtMoney } from '../utils/format';

export default function QuotationForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const toast = useToast();

  const [clientId, setClientId] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [discount, setDiscount] = useState(0);
  const [taxRate, setTaxRate] = useState(20);
  const [notes, setNotes] = useState('');
  const [rows, setRows] = useState([{ product_id: '', name: '', quantity: 1, unit_price: 0 }]);
  const [busy, setBusy] = useState(false);

  const { data: cls } = useFetch(clients.list);
  const { data: prods } = useFetch(products.list);
  const { data: existing, loading } = useFetch(isEdit ? () => quotations.get(id) : () => Promise.resolve(null), [id]);

  useEffect(() => {
    if (existing) {
      setClientId(existing.client_id || existing.client?.id || '');
      setValidUntil((existing.valid_until || '').slice(0, 10));
      setDiscount(existing.discount ?? 0);
      setTaxRate(existing.tax_rate ?? existing.tax ?? 20);
      setNotes(existing.notes || '');
      const its = existing.items || [];
      if (its.length) setRows(its.map((it) => ({
        product_id: it.product_id || it.product?.id || '',
        name: it.product?.name || it.name || '',
        quantity: it.quantity,
        unit_price: it.unit_price,
      })));
    }
  }, [existing]);

  const subtotal = rows.reduce((s, r) => s + Number(r.quantity || 0) * Number(r.unit_price || 0), 0);
  const afterDiscount = subtotal - Number(discount || 0);
  const tax = (Math.max(afterDiscount, 0) * Number(taxRate || 0)) / 100;
  const total = Math.max(afterDiscount, 0) + tax;

  const save = async (e) => {
    e.preventDefault();
    const validRows = rows.filter((r) => r.product_id && Number(r.quantity) > 0);
    if (!clientId) return toast.push('Select a client', 'error');
    if (validRows.length === 0) return toast.push('Add at least one item', 'error');
    setBusy(true);
    try {
      const payload = {
        client_id: clientId,
        valid_until: validUntil || null,
        discount: Number(discount || 0),
        tax_rate: Number(taxRate || 0),
        notes: notes || null,
        items: validRows.map((r) => ({ product_id: r.product_id, quantity: Number(r.quantity), unit_price: Number(r.unit_price) })),
      };
      const saved = isEdit ? await quotations.update(id, payload) : await quotations.create(payload);
      toast.push(isEdit ? 'Quotation updated' : 'Quotation created', 'success');
      navigate(`/quotations/${saved?.id || id}`);
    } catch (err) {
      toast.push(errMsg(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  if (isEdit && loading) return <Spinner />;

  return (
    <form onSubmit={save} className="space-y-5">
      <Card title={isEdit ? 'Edit quotation' : 'New quotation'}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Client">
            <select className="input" value={clientId} onChange={(e) => setClientId(e.target.value)} required>
              <option value="">— Select —</option>
              {(cls?.items || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Valid until">
            <input className="input" type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
          </Field>
          <Field label="Discount (flat)">
            <input className="input" type="number" min="0" step="0.01" value={discount} onChange={(e) => setDiscount(e.target.value)} />
          </Field>
          <Field label="Tax rate %">
            <input className="input" type="number" min="0" max="100" step="0.01" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} />
          </Field>
          <Field label="Notes" className="sm:col-span-2 lg:col-span-4">
            <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Terms, delivery info…" />
          </Field>
        </div>
      </Card>

      <Card title="Items">
        <ItemRows rows={rows} setRows={setRows} products={prods?.items || []} priceField="sale_price" />
      </Card>

      <Card>
        <div className="flex flex-col items-end gap-1 text-sm">
          <p className="text-slate-500">Subtotal: <span className="font-semibold text-slate-800">{fmtMoney(subtotal)}</span></p>
          <p className="text-slate-500">Discount: <span className="font-semibold text-slate-800">−{fmtMoney(discount)}</span></p>
          <p className="text-slate-500">Tax ({taxRate}%): <span className="font-semibold text-slate-800">{fmtMoney(tax)}</span></p>
          <p className="text-lg">Total: <span className="font-extrabold text-indigo-700">{fmtMoney(total)}</span></p>
        </div>
        <div className="mt-4 flex justify-end gap-3">
          <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>Cancel</button>
          <button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : isEdit ? 'Save changes' : 'Create quotation'}</button>
        </div>
      </Card>
    </form>
  );
}
