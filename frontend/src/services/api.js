import { API_CONFIG, API_ENDPOINTS } from '../config/apiConfig';

async function fetchJson(endpoint, options = {}) {
  const token = localStorage.getItem('nusaquest_token');
  const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

  const config = {
    headers: {
      ...API_CONFIG.headers,
      ...authHeader,
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(`${API_CONFIG.baseURL}${endpoint}`, config);
  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.message || 'Permintaan gagal diproses');
  }
  return json;
}

export const authApi = {
  register: (data) => fetchJson(API_ENDPOINTS.auth.register, { method: 'POST', body: JSON.stringify(data) }),
  login: (data) => fetchJson(API_ENDPOINTS.auth.login, { method: 'POST', body: JSON.stringify(data) }),
  getMe: () => fetchJson(API_ENDPOINTS.auth.me),
  verifyAdminKey: (key) => fetchJson(API_ENDPOINTS.auth.verify, { method: 'POST', body: JSON.stringify({ key }) }),
};

export const provinceApi = {
  getAll: (region) => fetchJson(API_ENDPOINTS.provinces.list(region)),
  getBySlug: (slug) => fetchJson(API_ENDPOINTS.provinces.detail(slug)),
  create: (data) => fetchJson(API_ENDPOINTS.provinces.create, { method: 'POST', body: JSON.stringify(data) }),
  update: (slug, data) => fetchJson(API_ENDPOINTS.provinces.update(slug), { method: 'PUT', body: JSON.stringify(data) }),
  delete: (slug) => fetchJson(API_ENDPOINTS.provinces.delete(slug), { method: 'DELETE' }),

  addCulture: (slug, data) => fetchJson(API_ENDPOINTS.provinces.cultures.add(slug), { method: 'POST', body: JSON.stringify(data) }),
  updateCulture: (id, data) => fetchJson(API_ENDPOINTS.provinces.cultures.update(id), { method: 'PUT', body: JSON.stringify(data) }),
  deleteCulture: (id) => fetchJson(API_ENDPOINTS.provinces.cultures.delete(id), { method: 'DELETE' }),

  addTourism: (slug, data) => fetchJson(API_ENDPOINTS.provinces.tourisms.add(slug), { method: 'POST', body: JSON.stringify(data) }),
  updateTourism: (id, data) => fetchJson(API_ENDPOINTS.provinces.tourisms.update(id), { method: 'PUT', body: JSON.stringify(data) }),
  deleteTourism: (id) => fetchJson(API_ENDPOINTS.provinces.tourisms.delete(id), { method: 'DELETE' }),

  addCulinary: (slug, data) => fetchJson(API_ENDPOINTS.provinces.culinaries.add(slug), { method: 'POST', body: JSON.stringify(data) }),
  updateCulinary: (id, data) => fetchJson(API_ENDPOINTS.provinces.culinaries.update(id), { method: 'PUT', body: JSON.stringify(data) }),
  deleteCulinary: (id) => fetchJson(API_ENDPOINTS.provinces.culinaries.delete(id), { method: 'DELETE' }),
};

export const regionApi = {
  getAll: () => fetchJson(API_ENDPOINTS.regions.list),
  getById: (id) => fetchJson(API_ENDPOINTS.regions.detail(id)),
};

export const gameApi = {
  getQuizzes: (provinceSlug) => fetchJson(API_ENDPOINTS.games.quizzes(provinceSlug)),
  createQuiz: (data) => fetchJson(API_ENDPOINTS.games.createQuiz, { method: 'POST', body: JSON.stringify(data) }),
  updateQuiz: (id, data) => fetchJson(API_ENDPOINTS.games.updateQuiz(id), { method: 'PUT', body: JSON.stringify(data) }),
  deleteQuiz: (id) => fetchJson(API_ENDPOINTS.games.deleteQuiz(id), { method: 'DELETE' }),

  getPuzzles: () => fetchJson(API_ENDPOINTS.games.puzzles),
  createPuzzle: (data) => fetchJson(API_ENDPOINTS.games.createPuzzle, { method: 'POST', body: JSON.stringify(data) }),
  updatePuzzle: (id, data) => fetchJson(API_ENDPOINTS.games.updatePuzzle(id), { method: 'PUT', body: JSON.stringify(data) }),
  deletePuzzle: (id) => fetchJson(API_ENDPOINTS.games.deletePuzzle(id), { method: 'DELETE' }),
};

export const userApi = {
  getProgress: (deviceId) => fetchJson(API_ENDPOINTS.user.progress(deviceId)),
  unlockProvince: (data) => fetchJson(API_ENDPOINTS.user.unlock, { method: 'POST', body: JSON.stringify(data) }),
  recordScore: (data) => fetchJson(API_ENDPOINTS.user.score, { method: 'POST', body: JSON.stringify(data) }),
  claimReward: (data) => fetchJson(API_ENDPOINTS.user.claimReward, { method: 'POST', body: JSON.stringify(data) }),
  getHistory: () => fetchJson(API_ENDPOINTS.user.history),
  syncProgress: (data) => fetchJson(API_ENDPOINTS.user.sync, { method: 'POST', body: JSON.stringify(data) }),
};
