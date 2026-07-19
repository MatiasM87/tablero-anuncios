const BASE = '/api';
const TOKEN_KEY = 'tablero-token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token) => {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
};

async function request(path, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { ...opts, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    const error = new Error(err.error || res.statusText);
    error.status = res.status;
    throw error;
  }
  return res.json();
}

export const login = async (password) => {
  const result = await request('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  setToken(result.token);
  return result;
};

export const checkAuth = () => request('/auth/check');

export const changePassword = (newPassword) =>
  request('/auth/password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ newPassword }),
  });

export const logout = async () => {
  try {
    await request('/auth/logout', { method: 'POST' });
  } catch {
    // Session already invalid server-side — clearing locally is enough
  }
  setToken(null);
};

export const fetchItems = () => request('/items');

export const uploadFile = (file, name, duration) => {
  const form = new FormData();
  form.append('file', file);
  if (name) form.append('name', name);
  if (duration) form.append('duration', String(duration));
  return request('/items', { method: 'POST', body: form });
};

export const addUrl = (url, name, duration) =>
  request('/items/url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, name, duration }),
  });

export const updateItem = (id, data) =>
  request(`/items/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

export const deleteItem = (id) =>
  request(`/items/${id}`, { method: 'DELETE' });

export const reorderItems = (orderedIds) =>
  request('/items/reorder', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderedIds }),
  });

export const fetchSettings = () => request('/settings');

export const updateSettings = (data) =>
  request('/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

export const fetchPages = () => request('/pages');

export const updatePages = (pages) =>
  request('/pages', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pages }),
  });
