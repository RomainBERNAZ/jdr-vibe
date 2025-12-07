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
  get: async (token, id) => {
    const res = await fetch(`${API_URL}/campaigns/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw await res.json();
    return res.json();
  },
  create: async (token, data) => {
    const payload = typeof data === 'string' 
        ? { name: data, system: 'D&D 5e' } 
        : { system: 'D&D 5e', ...data };

    const res = await fetch(`${API_URL}/campaigns`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify(payload)
    });
    return res.json();
  },
  update: async (token, id, data) => {
    const res = await fetch(`${API_URL}/campaigns/${id}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw await res.json();
    return res.json();
  },
  delete: async (token, id) => {
    const res = await fetch(`${API_URL}/campaigns/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw await res.json();
    return res.json();
  },
  addPlayer: async (token, id, email) => {
    const res = await fetch(`${API_URL}/campaigns/${id}/players`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify({ email })
    });
    if (!res.ok) throw await res.json();
    return res.json();
  }
};

export const characterApi = {
    list: async (token) => {
      const res = await fetch(`${API_URL}/characters`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return res.json();
    },
    get: async (token, id) => {
      const res = await fetch(`${API_URL}/characters/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw await res.json();
      return res.json();
    },
    create: async (token, charData) => {
      const res = await fetch(`${API_URL}/characters`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(charData)
      });
      if (!res.ok) throw await res.json();
      return res.json();
    },
    update: async (token, id, data) => {
      const res = await fetch(`${API_URL}/characters/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw await res.json();
      return res.json();
    },
    delete: async (token, id) => {
        const res = await fetch(`${API_URL}/characters/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw await res.json();
        return res.json();
    }
  };
