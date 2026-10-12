import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, useToast } from '../context/AppContext';
import { errMsg } from '../api/client';

const DEMOS = [
  { email: 'admin@erp.test', role: 'Admin', desc: 'Full access' },
  { email: 'manager@erp.test', role: 'Manager', desc: 'Inventory, purchasing & sales' },
  { email: 'staff@erp.test', role: 'Staff', desc: 'Operational actions' },
];

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const submit = async (e, em = email, pw = password) => {
    e?.preventDefault();
    if (!em || !pw) return;
    setBusy(true);
    try {
      await login(em, pw);
      toast.push('Welcome back!', 'success');
      navigate('/', { replace: true });
    } catch (err) {
      toast.push(errMsg(err, 'Login failed — check your credentials'), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      <div className="hidden w-1/2 flex-col justify-between bg-slate-900 p-12 lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-xl font-extrabold text-white">N</div>
          <p className="text-xl font-extrabold text-white">Nexus ERP</p>
        </div>
        <div>
          <h1 className="text-4xl font-extrabold leading-tight text-white">
            Run your stock,<br />billing & purchasing<br />from one place.
          </h1>
          <p className="mt-4 max-w-md text-slate-400">
            Multi-warehouse inventory, purchase orders, quotations and invoices — with low-stock alerts,
            payments tracking and PDF documents.
          </p>
          <div className="mt-8 grid max-w-md grid-cols-3 gap-3">
            {[['📦', 'Inventory'], ['🧾', 'Invoicing'], ['🚚', 'Purchasing']].map(([e, t]) => (
              <div key={t} className="rounded-xl bg-slate-800 p-4 text-center">
                <p className="text-2xl">{e}</p>
                <p className="mt-1 text-xs font-semibold text-slate-300">{t}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-slate-500">Nexus ERP · demo workspace</p>
      </div>

      <div className="flex w-full items-center justify-center bg-slate-100 p-6 lg:w-1/2">
        <div className="card w-full max-w-md p-8">
          <h2 className="text-2xl font-extrabold text-slate-900">Sign in</h2>
          <p className="mt-1 text-sm text-slate-500">Access your ERP workspace</p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" required />
            </div>
            <div>
              <label className="label">Password</label>
              <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
            </div>
            <button className="btn-primary w-full" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="mt-6 border-t border-slate-200 pt-5">
            <p className="label">One-click demo accounts</p>
            <div className="space-y-2">
              {DEMOS.map((d) => (
                <button
                  key={d.email}
                  onClick={() => submit(null, d.email, 'password')}
                  disabled={busy}
                  className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-4 py-2.5 text-left transition hover:border-indigo-300 hover:bg-indigo-50"
                >
                  <span>
                    <span className="block text-sm font-semibold text-slate-800">{d.role}</span>
                    <span className="block text-xs text-slate-500">{d.email} · {d.desc}</span>
                  </span>
                  <span className="text-indigo-600">→</span>
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-slate-400">Password for all demo accounts: <code className="font-mono">password</code></p>
          </div>
        </div>
      </div>
    </div>
  );
}
