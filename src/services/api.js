const API_URL = '/api';

const readResponse = async (response) => {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || `Request failed (${response.status})`);
    error.status = response.status;
    error.details = data.details;
    throw error;
  }
  return data;
};

const request = (url, options = {}) => fetch(url, { credentials: 'include', ...options });

export const authApi = {
  login: async (email, password) => {
    const res = await request(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    return readResponse(res);
  },
  register: async (email, password) => {
    const res = await request(`${API_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    return readResponse(res);
  },
  me: async () => {
    const res = await request(`${API_URL}/me`);
    return readResponse(res);
  },
  logout: async () => {
    const res = await request(`${API_URL}/logout`, { method: 'POST' });
    if (!res.ok && res.status !== 204) return readResponse(res);
  }
};

export const campaignApi = {
  list: async () => {
    const res = await request(`${API_URL}/campaigns`);
    return readResponse(res);
  },
  get: async (id) => {
    const res = await request(`${API_URL}/campaigns/${id}`);
    return readResponse(res);
  },
  create: async (name) => {
    const res = await request(`${API_URL}/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, system: 'D&D 5e' })
    });
    return readResponse(res);
  },
  update: async (id, data) => {
    const res = await request(`${API_URL}/campaigns/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return readResponse(res);
  },
  addPlayer: async (id, email) => {
    const res = await request(`${API_URL}/campaigns/${id}/players`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    return readResponse(res);
  },
  getSession: async (id) => {
    const res = await request(`${API_URL}/campaigns/${id}/session`);
    const data = await readResponse(res);
    return {
      conversation: data.conversation || [],
      summary: data.summary || '',
      characterSheet: data.character_sheet ?? null
    };
  },
  saveCharacterSheet: async (id, characterSheet) => {
    const res = await request(`${API_URL}/campaigns/${id}/session`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ characterSheet })
    });
    const data = await readResponse(res);
    return {
      conversation: data.conversation || [],
      summary: data.summary || '',
      characterSheet: data.character_sheet ?? null
    };
  }
};

export const voiceApi = {
  sendTurn: async ({ campaignId, turnId, audio }) => {
    const formData = new FormData();
    formData.append('audio', audio, 'recording.webm');
    formData.append('campaignId', String(campaignId));
    formData.append('turnId', turnId);
    const res = await request(`${API_URL}/voice/chat`, {
      method: 'POST',
      body: formData
    });
    return readResponse(res);
  }
};
