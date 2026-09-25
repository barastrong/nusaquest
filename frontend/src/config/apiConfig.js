const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export const API_CONFIG = {
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
};

export const API_ENDPOINTS = {
  auth: {
    registerRequest: '/auth/register-request',
    verifyOtp: '/auth/verify-otp',
    resendOtp: '/auth/resend-otp',
    register: '/auth/register',
    login: '/auth/login',
    me: '/auth/me',
    verify: '/auth/verify',
  },
  provinces: {
    list: (region) => `/provinces${region ? `?region=${region}` : ''}`,
    detail: (slug) => `/provinces/${slug}`,
    create: '/provinces',
    update: (slug) => `/provinces/${slug}`,
    delete: (slug) => `/provinces/${slug}`,
    cultures: {
      add: (slug) => `/provinces/${slug}/cultures`,
      update: (id) => `/provinces/cultures/${id}`,
      delete: (id) => `/provinces/cultures/${id}`,
    },
    tourisms: {
      add: (slug) => `/provinces/${slug}/tourisms`,
      update: (id) => `/provinces/tourisms/${id}`,
      delete: (id) => `/provinces/tourisms/${id}`,
    },
    culinaries: {
      add: (slug) => `/provinces/${slug}/culinaries`,
      update: (id) => `/provinces/culinaries/${id}`,
      delete: (id) => `/provinces/culinaries/${id}`,
    },
  },
  regions: {
    list: '/regions',
    detail: (id) => `/regions/${id}`,
  },
  games: {
    quizzes: (provinceSlug) => `/games/quizzes${provinceSlug ? `?province=${provinceSlug}` : ''}`,
    generateAiQuiz: '/games/quizzes/generate-ai',
    createQuiz: '/games/quizzes',
    updateQuiz: (id) => `/games/quizzes/${id}`,
    deleteQuiz: (id) => `/games/quizzes/${id}`,
    puzzles: '/games/puzzles',
    createPuzzle: '/games/puzzles',
    updatePuzzle: (id) => `/games/puzzles/${id}`,
    deletePuzzle: (id) => `/games/puzzles/${id}`,
  },
  user: {
    progress: (deviceId) => `/user/progress${deviceId ? `/${deviceId}` : ''}`,
    unlock: '/user/unlock',
    score: '/user/score',
    claimReward: '/user/claim',
    history: '/user/history',
    sync: '/user/sync',
  },
  guest: {
    progress: (deviceId) => `/guest/progress/${encodeURIComponent(deviceId)}`,
    reset: (deviceId) => `/guest/progress/${encodeURIComponent(deviceId)}`,
    sync: '/guest/sync',
    unlock: '/guest/unlock',
    score: '/guest/score',
    claimReward: '/guest/claim',
    warningSeen: '/guest/warning-seen',
  },
};
