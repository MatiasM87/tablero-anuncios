const BASE = '/api';

async function request(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

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

export const fetchLayout = () => request('/layout');

export const updateLayout = (data) =>
  request('/layout', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
