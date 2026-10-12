import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useFetch } from '../utils/hooks';
import { purchaseOrders, suppliers, products, warehouses } from '../api/erp';
import { errMsg } from '../api/client';
import { useToast } from '../context/AppContext';
import { Card, Field, Spinner } from '../components/ui';
import ItemRows from '../components/ItemRows';
import { fmtMoney } from '../utils/format';

export default function POForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const toast = useToast();

  const [supplierId, setSupplierId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [taxRate, setTaxRate] = useState(20);
  const [rows, setRows] = useState([{ product_id: '', name: '', quantity: 1, unit_price: 0 }]);
  const [busy, setBusy] = useState(false);

  const { data: sups } = useFetch(suppliers.list);
  const { data: prods } = useFetch(products.list);
  const { data: whs } = useFetch(warehouses.list);
  const { data: existing, loading } = useFetch(isEdit ? () => purchaseOrders.get(id) : () => Promise.resolve(null), [id]);

  useEffect(() => {
    if (existing) {
      setSupplierId(existing.supplier_id || existing.supplier?.id || '');
      setWarehouseId(existing.warehouse_id || existing.warehouse?.id || '');
      setExpectedDate((existing.expected_date || '').slice(0, 10));
      setNotes(existing.notes || '');
      setTaxRate(existing.tax_rate ?? existing.tax ?? 20);
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
  const tax = (subtotal * Number(taxRate || 0)) / 100;
  const total = subtotal + tax;

  const save = async (e) => {
    e.preventDefault();
    const validRows = rows.filter((r) => r.product_id && Number(r.quantity) > 0);
    if (!supplierId) return toast.push('Select a supplier', 'error');
    if (validRows.length === 0) return toast.push('Add at least one item', 'error');
    setBusy(true);
    try {
      const payload = {
        supplier_id: supplierId,
        warehouse_id: warehouseId || null,
        expected_date: expectedDate || null,
        notes: notes || null,
        tax_rate: Number(taxRate || 0),
        items: validRows.map((r) => ({ product_id: r.product_id, quantity: Number(r.quantity), unit_price: Number(r.unit_price) })),
      };
      const saved = isEdit ? await purchaseOrders.update(id, payload) : await purchaseOrders.create(payload);
      toast.push(isEdit ? 'Purchase order updated' : 'Purchase order created', 'success');
      navigate(`/purchase-orders/${saved?.id || id}`);
    } catch (err) {
      toast.push(errMsg(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  if (isEdit && loading) return <Spinner />;

  return (
    <form onSubmit={save} className="space-y-5">
      <Card title={isEdit ? 'Edit purchase order' : 'New purchase order'}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Supplier">
            <select className="input" value={supplierId} onChange={(e) => setSupplierId(e.target.value)} required>
              <option value="">— Select —</option>
              {(sups?.items || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Receiving warehouse" hint="Stock lands here on receive">
            <select className="input" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
              <option value="">— Default —</option>
              {(whs?.items || []).map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </Field>
          <Field label="Expected date">
            <input className="input" type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} />
          </Field>
          <Field label="Tax rate %">
            <input className="input" type="number" min="0" max="100" step="0.01" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} />
          </Field>
          <Field label="Notes" className="sm:col-span-2 lg:col-span-4">
            <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </div>
      </Card>

      <Card title="Items">
        <ItemRows rows={rows} setRows={setRows} products={prods?.items || []} priceField="purchase_price" />
      </Card>

      <Card>
        <div className="flex flex-col items-end gap-1 text-sm">
          <p className="text-slate-500">Subtotal: <span className="font-semibold text-slate-800">{fmtMoney(subtotal)}</span></p>
          <p className="text-slate-500">Tax ({taxRate}%): <span className="font-semibold text-slate-800">{fmtMoney(tax)}</span></p>
          <p className="text-lg">Total: <span className="font-extrabold text-indigo-700">{fmtMoney(total)}</span></p>
        </div>
        <div className="mt-4 flex justify-end gap-3">
          <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>Cancel</button>
          <button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : isEdit ? 'Save changes' : 'Create purchase order'}</button>
        </div>
      </Card>
    </form>
  );
}
