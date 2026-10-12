import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AppContext';
import { initials, cx } from '../utils/format';

const I = {
  grid: <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />,
  alert: <path d="M12 3 2 20h20L12 3zm0 6v5m0 3v.5" />,
  box: <path d="M21 8l-9-5-9 5v8l9 5 9-5V8zM3 8l9 5 9-5M12 13v8" />,
  tag: <path d="M20 12l-8 8-9-9V4h7l10 8zM7 7h.01" />,
  home: <path d="M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10" />,
  swap: <path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />,
  truck: <path d="M1 8h13v8H1zM14 11h4l4 4v1h-8M5 20a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm13 0a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />,
  users: <path d="M17 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2M10 11a4 4 0 100-8 4 4 0 000 8zm14 10v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />,
  doc: <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM14 2v6h6M9 13h6M9 17h6" />,
  file: <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM14 2v6h6" />,
  gear: <path d="M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33h.01a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51h.01a1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82v.01a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" />,
  cart: <path d="M9 22a1 1 0 100-2 1 1 0 000 2zm11 0a1 1 0 100-2 1 1 0 000 2zM1 2h4l2.7 12.4a1 1 0 001 .6h8.7a1 1 0 001-.76L21 7H6" />,
};

const Icon = ({ d, className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={cx('h-5 w-5', className)}>
    {d}
  </svg>
);

const NAV = [
  { section: 'Overview' },
  { to: '/', label: 'Dashboard', icon: I.grid, end: true },
  { to: '/alerts', label: 'Alerts', icon: I.alert },
  { section: 'Inventory' },
  { to: '/products', label: 'Products', icon: I.box },
  { to: '/categories', label: 'Categories', icon: I.tag },
  { to: '/warehouses', label: 'Warehouses', icon: I.home },
  { to: '/stock', label: 'Stock movements', icon: I.swap },
  { section: 'Purchasing' },
  { to: '/suppliers', label: 'Suppliers', icon: I.truck },
  { to: '/purchase-orders', label: 'Purchase orders', icon: I.cart },
  { section: 'Sales' },
  { to: '/clients', label: 'Clients', icon: I.users },
  { to: '/quotations', label: 'Quotations', icon: I.file },
  { to: '/invoices', label: 'Invoices', icon: I.doc },
  { section: 'System', admin: true },
  { to: '/settings', label: 'Settings', icon: I.gear, admin: true },
];

const TITLES = {
  '/': 'Dashboard',
  '/alerts': 'Stock alerts',
  '/products': 'Products',
  '/categories': 'Categories',
  '/warehouses': 'Warehouses',
  '/stock': 'Stock movements',
  '/suppliers': 'Suppliers',
  '/purchase-orders': 'Purchase orders',
  '/clients': 'Clients',
  '/quotations': 'Quotations',
  '/invoices': 'Invoices',
  '/settings': 'Settings',
};

function Sidebar({ open, onClose, user, isAdmin }) {
  return (
    <>
      <div className={cx('fixed inset-0 z-30 bg-slate-900/60 lg:hidden', open ? 'block' : 'hidden')} onClick={onClose} />
      <aside
        className={cx(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-slate-900 transition-transform lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center gap-3 px-5 py-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-lg font-extrabold text-white">N</div>
          <div>
            <p className="text-base font-extrabold text-white">Nexus ERP</p>
            <p className="text-[11px] uppercase tracking-widest text-slate-500">Stock · Billing</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
          {NAV.filter((n) => !n.admin || isAdmin).map((n, i) =>
            n.section ? (
              <p key={i} className="px-3 pb-1 pt-4 text-[11px] font-bold uppercase tracking-widest text-slate-500 first:pt-1">
                {n.section}
              </p>
            ) : (
              <NavLink key={n.to} to={n.to} end={n.end} onClick={onClose}
                className={({ isActive }) => cx('navlink', isActive && 'navlink-active')}>
                <Icon d={n.icon} />
                {n.label}
              </NavLink>
            )
          )}
        </nav>
        <div className="border-t border-slate-800 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
              {initials(user?.name)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{user?.name}</p>
              <p className="text-xs capitalize text-slate-400">{user?.role}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

export default function Layout() {
  const [open, setOpen] = useState(false);
  const { user, logout, isAdmin } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const base = '/' + pathname.split('/')[1];
  const title = TITLES[pathname] || TITLES[base] || (base === '/purchase-orders' ? 'Purchase orders' : 'Nexus ERP');

  const doLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar open={open} onClose={() => setOpen(false)} user={user} isAdmin={isAdmin} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-4 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur sm:px-6">
          <button className="btn-ghost lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">☰</button>
          <h1 className="text-lg font-bold text-slate-900">{title}</h1>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold capitalize text-indigo-700 sm:inline">
              {user?.role}
            </span>
            <button className="btn-ghost" onClick={doLogout} title="Log out">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" /></svg>
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
