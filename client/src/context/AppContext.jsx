import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { auth } from '../api/erp';
import { errMsg } from '../api/client';

// ---------- Toast ----------
const ToastCtx = createContext(null);
let toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const push = useCallback(
    (message, type = 'success') => {
      const id = ++toastId;
      setToasts((t) => [...t, { id, message, type }]);
      setTimeout(() => dismiss(id), 4000);
    },
    [dismiss]
  );

  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-80 flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg ${
              t.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                : t.type === 'info'
                  ? 'border-indigo-200 bg-indigo-50 text-indigo-900'
                  : 'border-red-200 bg-red-50 text-red-900'
            }`}
          >
            <span className="mt-0.5 text-base">{t.type === 'success' ? '✓' : t.type === 'info' ? 'ℹ' : '⚠'}</span>
            <p className="flex-1 text-sm font-medium">{t.message}</p>
            <button onClick={() => dismiss(t.id)} className="text-lg leading-none opacity-60 hover:opacity-100">
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);

// ---------- Auth ----------
const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const token = localStorage.getItem('erp_token');
    if (!token) {
      setLoading(false);
      return;
    }
    auth
      .me()
      .then((u) => mounted.current && setUser(u))
      .catch(() => localStorage.removeItem('erp_token'))
      .finally(() => mounted.current && setLoading(false));
    return () => {
      mounted.current = false;
    };
  }, []);

  const login = async (email, password) => {
    const { token, user: u } = await auth.login(email, password);
    if (!token) throw new Error('No token returned by the API');
    localStorage.setItem('erp_token', token);
    setUser(u);
    return u;
  };

  const logout = async () => {
    try {
      await auth.logout();
    } catch {
      /* ignore */
    }
    localStorage.removeItem('erp_token');
    setUser(null);
  };

  const role = user?.role || 'staff';
  const isAdmin = role === 'admin';
  const isManager = role === 'manager' || isAdmin;
  // staff: operational actions only (no master-data or document create/edit/delete, no settings)
  const canManage = isManager;

  return (
    <AuthCtx.Provider value={{ user, loading, login, logout, role, isAdmin, isManager, canManage, setUser }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);

/** Wrap an async action with toast feedback. */
export function useAction() {
  const toast = useToast();
  return useCallback(
    async (fn, successMsg) => {
      try {
        const r = await fn();
        if (successMsg) toast.push(successMsg, 'success');
        return r;
      } catch (e) {
        toast.push(errMsg(e), 'error');
        throw e;
      }
    },
    [toast]
  );
}
