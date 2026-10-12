import { SimpleCrud } from './Categories';
import { warehouses } from '../api/erp';
import { Badge } from '../components/ui';

export default function Warehouses() {
  return (
    <SimpleCrud
      title="Warehouses"
      singular="Warehouse"
      api={warehouses}
      emptyHint="Track stock separately per location (e.g. Main depot, Casablanca store)."
      fields={[
        { key: 'name', label: 'Name', required: true, placeholder: 'e.g. Main warehouse' },
        { key: 'location', label: 'Location', placeholder: 'e.g. Tangier, Zone franche' },
        { key: 'is_default', label: 'Default', type: 'checkbox', checkboxLabel: 'Default warehouse for new stock' },
      ]}
      columns={[
        { key: 'name', label: 'Name', render: (w) => <span className="font-semibold text-slate-900">{w.name}</span> },
        { key: 'location', label: 'Location' },
        { key: 'is_default', label: 'Default', render: (w) => (w.is_default ? <Badge tone="indigo">Default</Badge> : <span className="text-slate-400">—</span>) },
      ]}
    />
  );
}
