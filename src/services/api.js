const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/$/, '');

export function getToken() {
  return localStorage.getItem('valle-token') || localStorage.getItem('token') || '';
}

export function saveSession(token, user) {
  if (token) {
    localStorage.setItem('valle-token', token);
    localStorage.setItem('token', token);
  }
  if (user) localStorage.setItem('valle-user', JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem('valle-token');
  localStorage.removeItem('token');
  localStorage.removeItem('valle-user');
}

export async function apiRequest(endpoint, options = {}) {
  const token = options.token ?? getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_URL}${endpoint}`, {
    method: options.method || 'GET',
    headers,
    body: options.body !== undefined && options.body !== null ? JSON.stringify(options.body) : undefined
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    const message = typeof data === 'object' ? data?.message || data?.error || JSON.stringify(data) : data;
    throw new Error(message || `Request failed: ${res.status}`);
  }
  return data;
}

export const api = {
  login: (email, password) => apiRequest('/auth/login', { method: 'POST', body: { email, password }, token: '' }),
  me: () => apiRequest('/auth/me'),
  users: {
    list: () => apiRequest('/users'),
    create: (payload) => apiRequest('/users', { method: 'POST', body: payload }),
    update: (id, payload) => apiRequest(`/users/${id}`, { method: 'PATCH', body: payload })
  },
  vehicles: {
    list: () => apiRequest('/vehicles'),
    create: (payload) => apiRequest('/vehicles', { method: 'POST', body: payload }),
    update: (id, payload) => apiRequest(`/vehicles/${id}`, { method: 'PATCH', body: payload })
  },
  assessments: {
    list: () => apiRequest('/assessments'),
    create: (payload) => apiRequest('/assessments', { method: 'POST', body: payload }),
    update: (id, payload) => apiRequest(`/assessments/${id}`, { method: 'PATCH', body: payload }),
    reopen: (id, reason) => apiRequest(`/assessments/${id}/reopen`, { method: 'POST', body: { reason, reopenReason: reason } }),
    issueParts: (id, payload) => apiRequest(`/assessments/${id}/issue-parts`, { method: 'POST', body: payload }),
    complete: (id) => apiRequest(`/assessments/${id}/complete`, { method: 'POST', body: {} })
  },
  garageOps: {
    list: () => apiRequest('/garage-ops'),
    create: (payload) => apiRequest('/garage-ops', { method: 'POST', body: payload }),
    update: (id, payload) => apiRequest(`/garage-ops/${id}`, { method: 'PATCH', body: payload })
  },
  inventory: {
    list: () => apiRequest('/inventory'),
    lowStock: () => apiRequest('/inventory/low-stock'),
    create: (payload) => apiRequest('/inventory', { method: 'POST', body: payload }),
    update: (id, payload) => apiRequest(`/inventory/${id}`, { method: 'PATCH', body: payload })
  },
  transactions: {
    list: () => apiRequest('/transactions'),
    create: (payload) => apiRequest('/transactions', { method: 'POST', body: payload }),
    update: (id, payload) => apiRequest(`/transactions/${id}`, { method: 'PATCH', body: payload }),
    completeWithGrn: (id, payload) => apiRequest(`/transactions/${id}/complete-with-grn`, { method: 'POST', body: payload })
  },
  reports: {
    dashboard: () => apiRequest('/reports/dashboard'),
    history: () => apiRequest('/reports/maintenance-history')
  },
  notifications: {
    list: (role) => apiRequest(role ? `/notifications?role=${role}` : '/notifications')
  }
};
