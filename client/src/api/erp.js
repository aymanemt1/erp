import api, { API_BASE, toList, toItem, authToken } from './client';

const crud = (path) => ({
  list: (params) => api.get(path, { params }).then(toList),
  get: (id) => api.get(`${path}/${id}`).then(toItem),
  create: (data) => api.post(path, data).then(toItem),
  update: (id, data) => api.put(`${path}/${id}`, data).then(toItem),
  remove: (id) => api.delete(`${path}/${id}`),
});

export const auth = {
  login: (email, password) =>
    api.post('/login', { email, password }).then((r) => {
      const d = r.data?.data ?? r.data;
      return { token: d.token ?? d.access_token, user: d.user };
    }),
  me: () => api.get('/me').then(toItem),
  logout: () => api.post('/logout').catch(() => {}),
};

export const fetchDashboard = () => api.get('/dashboard').then(toItem);

export const products = crud('/products');
export const categories = crud('/categories');
export const warehouses = crud('/warehouses');
export const suppliers = crud('/suppliers');
export const clients = crud('/clients');

export const movements = {
  list: (params) => api.get('/stock-movements', { params }).then(toList),
  transfer: (data) => api.post('/stock-movements/transfer', data).then(toItem),
  adjust: (data) => api.post('/stock-movements/adjust', data).then(toItem),
};

export const purchaseOrders = {
  ...crud('/purchase-orders'),
  markOrdered: (id) => api.post(`/purchase-orders/${id}/order`).then(toItem),
  receive: (id) => api.post(`/purchase-orders/${id}/receive`).then(toItem),
  cancel: (id) => api.post(`/purchase-orders/${id}/cancel`).then(toItem),
};

export const quotations = {
  ...crud('/quotations'),
  send: (id) => api.post(`/quotations/${id}/send`).then(toItem),
  accept: (id) => api.post(`/quotations/${id}/accept`).then(toItem),
  reject: (id) => api.post(`/quotations/${id}/reject`).then(toItem),
};

export const invoices = {
  ...crud('/invoices'),
  send: (id) => api.post(`/invoices/${id}/send`).then(toItem),
  recordPayment: (id, data) => api.post(`/invoices/${id}/payments`, data).then(toItem),
  cancel: (id) => api.post(`/invoices/${id}/cancel`).then(toItem),
  pdfUrl: (id) => `${API_BASE}/api/invoices/${id}/pdf?token=${encodeURIComponent(authToken())}`,
};

export const fetchLowStock = () => api.get('/alerts/low-stock').then(toList);

export const settings = {
  get: () => api.get('/settings').then(toItem),
  update: (data) => api.put('/settings', data).then(toItem),
};
