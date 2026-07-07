const API_URL = (() => {
  const configured = import.meta.env.VITE_API_URL;
  if (configured) return configured.replace(/\/$/, '');
  if (typeof window !== 'undefined' && window.location?.hostname) {
    const protocol = window.location.protocol || 'http:';
    const host = window.location.hostname;
    if (['localhost', '127.0.0.1', '0.0.0.0'].includes(host)) {
      return `${protocol}//${host}:3000/api`;
    }
    return `${window.location.origin}/api`;
  }
  return '/api';
})();

export function getApiUrl() {
  return API_URL;
}

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
    const error = new Error(message || `Request failed: ${res.status}`);
    error.status = res.status;
    error.data = data;
    error.isAuthError = res.status === 401 || res.status === 403;
    throw error;
  }
  return data;
}

export const api = {
  login: (email, password) => apiRequest('/auth/login', { method: 'POST', body: { email, password }, token: '' }),
  me: () => apiRequest('/auth/me'),
  users: {
    list: () => apiRequest('/users'),
    mechanics: () => apiRequest('/users/mechanics'),
    create: (payload) => apiRequest('/users', { method: 'POST', body: payload }),
    update: (id, payload) => apiRequest(`/users/${id}`, { method: 'PATCH', body: payload }),
    resetPassword: (id, password) => apiRequest(`/users/${id}/reset-password`, { method: 'PATCH', body: { password } }),
    remove: (id) => apiRequest(`/users/${id}`, { method: 'DELETE' })
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
    get: (id) => apiRequest(`/inventory/${id}`),
    lowStock: () => apiRequest('/inventory/low-stock'),
    movements: () => apiRequest('/inventory/movements'),
    create: (payload) => apiRequest('/inventory', { method: 'POST', body: payload }),
    update: (id, payload) => apiRequest(`/inventory/${id}`, { method: 'PATCH', body: payload }),
    addStock: (id, payload) => apiRequest(`/inventory/${id}/add-stock`, { method: 'POST', body: payload })
  },

  partsIssues: {
    list: (query='') => apiRequest(`/parts-issues${query}`),
    summary: (query='') => apiRequest(`/parts-issues/summary${query}`),
    create: (payload) => apiRequest('/parts-issues', { method: 'POST', body: payload })
  },
  transactions: {
    list: () => apiRequest('/transactions'),
    create: (payload) => apiRequest('/transactions', { method: 'POST', body: payload }),
    update: (id, payload) => apiRequest(`/transactions/${id}`, { method: 'PATCH', body: payload }),
    completeWithGrn: (id, payload) => apiRequest(`/transactions/${id}/complete-with-grn`, { method: 'POST', body: payload })
  },
  reports: {
    dashboard: () => apiRequest('/reports/dashboard'),
    history: () => apiRequest('/reports/maintenance-history'),
    fuel: (query='') => apiRequest(`/reports/fuel-consumption${query}`),
    vehicleOut: (query='') => apiRequest(`/reports/vehicle-out${query}`),
    mechanicHours: (query='') => apiRequest(`/reports/mechanic-hours${query}`),
    vehiclePartsCost: (query='') => apiRequest(`/reports/vehicle-parts-cost${query}`),
    garageSummary: (query='') => apiRequest(`/reports/garage-summary${query}`),
    analytics: (query='') => apiRequest(`/reports/analytics${query}`),
    logExport: (payload) => apiRequest('/reports/export-log', { method: 'POST', body: payload })
  },
  fuelConsumptions: {
    list: () => apiRequest('/fuel-consumptions'),
    create: (payload) => apiRequest('/fuel-consumptions', { method: 'POST', body: payload })
  },
  fuelStock: {
    list: () => apiRequest('/fuel-stock'),
    create: (payload) => apiRequest('/fuel-stock', { method: 'POST', body: payload })
  },
  vehicleOut: {
    list: () => apiRequest('/vehicle-out'),
    create: (payload) => apiRequest('/vehicle-out', { method: 'POST', body: payload }),
    update: (id, payload) => apiRequest(`/vehicle-out/${id}`, { method: 'PATCH', body: payload })
  },
  wheels: {
    list: () => apiRequest('/wheels'),
    stock: () => apiRequest('/wheels/stock'),
    create: (payload) => apiRequest('/wheels', { method: 'POST', body: payload }),
    update: (id, payload) => apiRequest(`/wheels/${id}`, { method: 'PATCH', body: payload }),
    updateStock: (id, payload) => apiRequest(`/wheels/stock/${id}`, { method: 'PATCH', body: payload })
  },

  guestTickets: {
    list: () => apiRequest('/guest-tickets'),
    create: (payload) => apiRequest('/guest-tickets', { method: 'POST', body: payload, token: '' }),
    update: (id, payload) => apiRequest(`/guest-tickets/${id}`, { method: 'PATCH', body: payload })
  },
  supportRequests: {
    list: (filters = {}) => {
      const q = typeof filters === 'string' ? filters : new URLSearchParams(Object.entries(filters).filter(([,v]) => v !== undefined && v !== '')).toString();
      return apiRequest(`/support-requests${q ? `?${q}` : ''}`);
    },
    create: (payload) => apiRequest('/support-requests', { method: 'POST', body: payload }),
    update: (id, payload) => apiRequest(`/support-requests/${id}`, { method: 'PATCH', body: payload })
  },
  notifications: {
    list: (role) => apiRequest(role ? `/notifications?role=${role}` : '/notifications')
  },
  time: {
    now: () => apiRequest('/system-time/now', { token: '' })
  },
  auditTrail: {
    list: (filters = {}) => { const q = new URLSearchParams(Object.entries(filters).filter(([,v]) => v !== undefined && v !== '')).toString(); return apiRequest(`/audit-trail${q ? `?${q}` : ''}`); }
  },
  attachments: {
    list: (entityType, entityId) => apiRequest(`/attachments?entityType=${encodeURIComponent(entityType || '')}&entityId=${encodeURIComponent(entityId || '')}`),
    upload: async ({ file, entityType, entityId, category }) => {
      const token = getToken();
      const form = new FormData();
      form.append('file', file);
      form.append('entityType', entityType || 'GENERAL');
      form.append('entityId', entityId || '');
      form.append('category', category || 'GENERAL');
      const res = await fetch(`${API_URL}/attachments/upload`, { method:'POST', headers: token ? { Authorization:`Bearer ${token}` } : {}, body: form });
      const data = await res.json().catch(()=>null);
      if(!res.ok) throw new Error(data?.message || 'Upload failed');
      return data;
    }
  }
};
