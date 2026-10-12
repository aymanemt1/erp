import { useEffect } from 'react';
import { cx } from '../utils/format';

/* ---------- Cards & stats ---------- */
export function Card({ title, action, children, className }) {
  return (
    <div className={cx('card p-5', className)}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700">{title}</h3>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

const TONE_RING = {
  indigo: 'border-indigo-100 bg-indigo-50 text-indigo-600',
  emerald: 'border-emerald-100 bg-emerald-50 text-emerald-600',
  amber: 'border-amber-100 bg-amber-50 text-amber-600',
  red: 'border-red-100 bg-red-50 text-red-600',
  slate: 'border-slate-200 bg-slate-100 text-slate-600',
  blue: 'border-blue-100 bg-blue-50 text-blue-600',
};

export function StatCard({ label, value, sub, icon, tone = 'indigo', loading }) {
  return (
    <div className="card flex items-center gap-4 p-5">
      <div className={cx('flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border text-xl', TONE_RING[tone] || TONE_RING.indigo)}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        {loading ? (
          <div className="mt-1 h-7 w-24 animate-pulse rounded bg-slate-200" />
        ) : (
          <p className="truncate text-2xl font-extrabold text-slate-900">{value}</p>
        )}
        {sub && <p className="truncate text-xs text-slate-500">{sub}</p>}
      </div>
    </div>
  );
}

/* ---------- Badges ---------- */
const BADGE_TONES = {
  slate: 'bg-slate-100 text-slate-700 ring-slate-200',
  blue: 'bg-blue-100 text-blue-700 ring-blue-200',
  emerald: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
  amber: 'bg-amber-100 text-amber-800 ring-amber-200',
  red: 'bg-red-100 text-red-700 ring-red-200',
  indigo: 'bg-indigo-100 text-indigo-700 ring-indigo-200',
  purple: 'bg-purple-100 text-purple-700 ring-purple-200',
};

export function Badge({ tone = 'slate', children, className }) {
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset', BADGE_TONES[tone] || BADGE_TONES.slate, className)}>
      {children}
    </span>
  );
}

const STATUS_TONE = {
  draft: 'slate',
  sent: 'blue',
  ordered: 'blue',
  pending: 'amber',
  partial: 'amber',
  paid: 'emerald',
  received: 'emerald',
  accepted: 'emerald',
  in: 'emerald',
  rejected: 'red',
  cancelled: 'slate',
  overdue: 'red',
  out: 'amber',
  transfer: 'indigo',
  adjustment: 'purple',
  expired: 'amber',
};

export function StatusBadge({ status }) {
  const s = String(status || 'draft').toLowerCase();
  return <Badge tone={STATUS_TONE[s] || 'slate'}>{s.replace(/_/g, ' ')}</Badge>;
}

/* ---------- Forms ---------- */
export function Field({ label, error, hint, children, className }) {
  return (
    <div className={className}>
      {label && <label className="label">{label}</label>}
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      {hint && !error && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

/* ---------- Modal ---------- */
export function Modal({ open, onClose, title, children, wide }) {
  useEffect(() => {
    const fn = (e) => e.key === 'Escape' && onClose?.();
    if (open) window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className={cx('relative max-h-[90vh] w-full overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl', wide ? 'max-w-3xl' : 'max-w-lg')}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <button onClick={onClose} className="btn-ghost text-xl leading-none">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, title = 'Are you sure?', message, confirmLabel = 'Delete', onConfirm, onCancel, busy }) {
  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <p className="text-sm text-slate-600">{message}</p>
      <div className="mt-6 flex justify-end gap-3">
        <button className="btn-secondary" onClick={onCancel} disabled={busy}>Cancel</button>
        <button className="btn-danger" onClick={onConfirm} disabled={busy}>
          {busy ? 'Working…' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

/* ---------- States ---------- */
export function Spinner({ label }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-slate-500">
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600" />
      {label && <span className="text-sm font-medium">{label}</span>}
    </div>
  );
}

export function EmptyState({ title = 'Nothing here yet', hint, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl">📦</div>
      <p className="mt-2 font-semibold text-slate-700">{title}</p>
      {hint && <p className="max-w-sm text-sm text-slate-500">{hint}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-2xl">⚠</div>
      <p className="mt-2 font-semibold text-slate-700">Failed to load</p>
      <p className="max-w-sm text-sm text-slate-500">{String(error?.message || error || 'Unknown error')}</p>
      {onRetry && <button className="btn-secondary mt-3" onClick={onRetry}>Retry</button>}
    </div>
  );
}

/* ---------- Pagination ---------- */
export function Pagination({ meta, onPage }) {
  if (!meta || !meta.last_page || meta.last_page <= 1) return null;
  const { current_page: cur, last_page: last } = meta;
  const pages = [];
  for (let p = Math.max(1, cur - 2); p <= Math.min(last, cur + 2); p++) pages.push(p);
  return (
    <div className="flex items-center justify-between px-1 py-3">
      <p className="text-xs text-slate-500">
        Page {cur} of {last}{meta.total != null ? ` · ${meta.total} records` : ''}
      </p>
      <div className="flex gap-1">
        <button className="btn-ghost" disabled={cur <= 1} onClick={() => onPage(cur - 1)}>← Prev</button>
        {pages.map((p) => (
          <button
            key={p}
            onClick={() => onPage(p)}
            className={cx('rounded-lg px-3 py-1.5 text-sm font-medium', p === cur ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100')}
          >
            {p}
          </button>
        ))}
        <button className="btn-ghost" disabled={cur >= last} onClick={() => onPage(cur + 1)}>Next →</button>
      </div>
    </div>
  );
}
