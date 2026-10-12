import axios from 'axios';

// Base URL of the Laravel API. Override with VITE_API_URL in .env
// (e.g. VITE_API_URL=https://erp.example.com). Defaults to local dev server.
export const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '');

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('erp_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401 && !window.location.pathname.startsWith('/login')) {
      localStorage.removeItem('erp_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

/**
 * Normalize a list response. Accepts:
 *  - bare array            -> [{...}]
 *  - { data: [...], meta }  -> Laravel paginated resource
 *  - { items: [...] }       -> plain envelope
 */
export const toList = (res) => {
  const d = res?.data;
  if (Array.isArray(d)) return { items: d, meta: null };
  if (d && typeof d === 'object') {
    if (Array.isArray(d.data)) return { items: d.data, meta: d.meta ?? null };
    if (Array.isArray(d.items)) return { items: d.items, meta: d.meta ?? null };
  }
  return { items: [], meta: null };
};

/** Normalize a single-resource response: { data: {...} } or bare {...}. */
export const toItem = (res) => {
  const d = res?.data;
  if (d && typeof d === 'object' && !Array.isArray(d) && d.data !== undefined && d.data !== null && typeof d.data === 'object' && !Array.isArray(d.data)) {
    return d.data;
  }
  return d;
};

/** Human readable message from an axios error (incl. Laravel validation errors). */
export const errMsg = (e, fallback = 'Something went wrong') => {
  const d = e?.response?.data;
  if (d?.errors && typeof d.errors === 'object') {
    const first = Object.values(d.errors).flat()[0];
    if (first) return String(first);
  }
  return d?.message || d?.error || fallback;
};

export const authToken = () => localStorage.getItem('erp_token') || '';

export default api;
