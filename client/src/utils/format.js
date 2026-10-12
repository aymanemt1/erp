export const cx = (...parts) => parts.filter(Boolean).join(' ');

export const getCurrency = () => localStorage.getItem('erp_currency') || 'MAD';

export const fmtMoney = (n, currency) => {
  const cur = currency || getCurrency();
  try {
    return new Intl.NumberFormat('fr-MA', {
      style: 'currency',
      currency: cur,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(n || 0));
  } catch {
    return `${Number(n || 0).toFixed(2)} ${cur}`;
  }
};

export const fmtNum = (n) => new Intl.NumberFormat('en-US').format(Number(n || 0));

export const fmtDate = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '—';
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(dt);
};

export const fmtDateTime = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(dt);
};

export const isOverdue = (dueDate, status) => {
  if (!dueDate || ['paid', 'cancelled'].includes(status)) return false;
  return new Date(dueDate) < new Date(new Date().toDateString());
};

/** Total stock of a product across warehouses (defensive over API shapes). */
export const productStock = (p) => {
  if (p == null) return 0;
  if (typeof p.total_stock === 'number') return p.total_stock;
  if (typeof p.stock === 'number') return p.stock;
  if (Array.isArray(p.stocks)) return p.stocks.reduce((s, x) => s + Number(x.quantity || 0), 0);
  if (Array.isArray(p.warehouses)) return p.warehouses.reduce((s, x) => s + Number(x.pivot?.quantity ?? x.quantity ?? 0), 0);
  return 0;
};

export const initials = (name = '') =>
  name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
