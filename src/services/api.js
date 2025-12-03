const API_URL = '/api';

export const authApi = {
  login: async (email, password) => {
    const res = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) throw await res.json();
    return res.json();
  },
  register: async (email, password) => {
    const res = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) throw await res.json();
    return res.json();
  }
};

export const campaignApi = {
  list: async (token) => {
    const res = await fetch(`${API_URL}/campaigns`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return res.json();
  },
  create: async (token, name) => {
    const res = await fetch(`${API_URL}/campaigns`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify({ name, system: 'D&D 5e' })
    });
    return res.json();
  }
};

