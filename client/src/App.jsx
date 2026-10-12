import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AppContext';
import Layout from './components/Layout';
import { Spinner } from './components/ui';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Categories from './pages/Categories';
import Warehouses from './pages/Warehouses';
import Stock from './pages/Stock';
import Suppliers from './pages/Suppliers';
import PurchaseOrders from './pages/PurchaseOrders';
import POForm from './pages/POForm';
import PODetail from './pages/PODetail';
import Clients from './pages/Clients';
import Quotations from './pages/Quotations';
import QuotationForm from './pages/QuotationForm';
import QuotationDetail from './pages/QuotationDetail';
import Invoices from './pages/Invoices';
import InvoiceForm from './pages/InvoiceForm';
import InvoiceDetail from './pages/InvoiceDetail';
import Alerts from './pages/Alerts';
import Settings from './pages/Settings';

function Protected({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner label="Loading…" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route path="/" element={<Protected><Layout /></Protected>}>
        <Route index element={<Dashboard />} />
        <Route path="products" element={<Products />} />
        <Route path="categories" element={<Categories />} />
        <Route path="warehouses" element={<Warehouses />} />
        <Route path="stock" element={<Stock />} />
        <Route path="suppliers" element={<Suppliers />} />
        <Route path="purchase-orders" element={<PurchaseOrders />} />
        <Route path="purchase-orders/new" element={<Protected roles={['admin', 'manager']}><POForm /></Protected>} />
        <Route path="purchase-orders/:id" element={<PODetail />} />
        <Route path="purchase-orders/:id/edit" element={<Protected roles={['admin', 'manager']}><POForm /></Protected>} />
        <Route path="clients" element={<Clients />} />
        <Route path="quotations" element={<Quotations />} />
        <Route path="quotations/new" element={<Protected roles={['admin', 'manager']}><QuotationForm /></Protected>} />
        <Route path="quotations/:id" element={<QuotationDetail />} />
        <Route path="quotations/:id/edit" element={<Protected roles={['admin', 'manager']}><QuotationForm /></Protected>} />
        <Route path="invoices" element={<Invoices />} />
        <Route path="invoices/new" element={<Protected roles={['admin', 'manager']}><InvoiceForm /></Protected>} />
        <Route path="invoices/:id" element={<InvoiceDetail />} />
        <Route path="invoices/:id/edit" element={<Protected roles={['admin', 'manager']}><InvoiceForm /></Protected>} />
        <Route path="alerts" element={<Alerts />} />
        <Route path="settings" element={<Protected roles={['admin']}><Settings /></Protected>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
