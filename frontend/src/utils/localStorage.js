// Utility untuk mengelola localStorage user data

const STORAGE_KEYS = {
  USER_DATA: 'nusaquest_user_data',
  THEME: 'nusaquest_theme',
};

// Default user data
const DEFAULT_USER_DATA = {
  keys: 0, // Default 0 ketika belum login
  unlockedRegions: [], // Tidak ada region yang unlocked di awal
  quizScores: {},
  puzzleScores: {},
  totalScore: 0,
  gamesPlayed: 0,
  completedGames: {}, // { provinceId: ['quiz', 'puzzle'] }
  claimedRewards: [], // [provinceId]
  quizStats: {}, // { [provinceSlug]: { attempts: 0, highScore: 0, passed: false, lastScore: 0, lastPlayedAt: null } }
};

// Get user data
export const getUserData = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.USER_DATA);

    if (!data) {
      console.log('💾 [getUserData] No data found, initializing default:', DEFAULT_USER_DATA);
      localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(DEFAULT_USER_DATA));
      return { ...DEFAULT_USER_DATA };
    }

    const userData = JSON.parse(data);
    // Ensure all required fields exist
    const mergedData = { ...DEFAULT_USER_DATA, ...userData };
    return mergedData;
  } catch (error) {
    console.error('❌ [getUserData] Error reading user data:', error);
    return { ...DEFAULT_USER_DATA };
  }
};

// Save user data
export const saveUserData = (userData) => {
  try {
    localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
    return true;
  } catch (error) {
    console.error('❌ [saveUserData] Error saving user data:', error);
    return false;
  }
};

// Sync local user data with backend data
export const syncFromBackend = (serverData) => {
  if (!serverData) return getUserData();
  const current = getUserData();

  // Merge server quiz_stats
  const mergedQuizStats = { ...(current.quizStats || {}) };
  if (serverData.quiz_stats && typeof serverData.quiz_stats === 'object') {
    for (const [p, stat] of Object.entries(serverData.quiz_stats)) {
      const prev = mergedQuizStats[p] || { attempts: 0, highScore: 0, passed: false, lastScore: 0 };
      mergedQuizStats[p] = {
        attempts: Math.max(prev.attempts || 0, stat.attempts || stat.quiz_attempts || 0),
        highScore: Math.max(prev.highScore || 0, stat.high_score || stat.quiz_high_score || 0),
        passed: prev.passed || Boolean(stat.passed),
        lastScore: stat.last_score !== undefined ? stat.last_score : prev.lastScore,
        lastPlayedAt: stat.last_played_at || prev.lastPlayedAt,
      };
    }
  }

  const updated = {
    ...current,
    keys: serverData.keys !== undefined ? serverData.keys : current.keys,
    unlockedRegions: serverData.unlocked_provinces || serverData.unlockedRegions || current.unlockedRegions || [],
    completedGames: serverData.completed_games || serverData.completedGames || current.completedGames || {},
    claimedRewards: serverData.claimed_rewards || serverData.claimedRewards || current.claimedRewards || [],
    totalScore: serverData.total_score !== undefined ? serverData.total_score : (current.totalScore || 0),
    gamesPlayed: serverData.games_played !== undefined ? serverData.games_played : (current.gamesPlayed || 0),
    quizStats: mergedQuizStats,
  };
  saveUserData(updated);
  return updated;
};

// Update specific field
export const updateUserData = (updates) => {
  const currentData = getUserData();
  const newData = { ...currentData, ...updates };
  return saveUserData(newData);
};

// Add keys
export const addKeys = (amount) => {
  const userData = getUserData();
  userData.keys += amount;
  return saveUserData(userData);
};

// Unlock region
export const unlockRegion = (regionId, cost) => {
  const userData = getUserData();
  
  if (userData.keys >= cost && !userData.unlockedRegions.includes(regionId)) {
    userData.keys -= cost;
    userData.unlockedRegions.push(regionId);
    return saveUserData(userData);
  }
  
  console.log(`❌ [unlockRegion] Failed - Insufficient keys or already unlocked`);
  return false;
};

// Mark game as completed for a province
export const markGameCompleted = (provinceId, gameType) => {
  const userData = getUserData();
  if (!userData.completedGames) {
    userData.completedGames = {};
  }
  if (!userData.completedGames[provinceId]) {
    userData.completedGames[provinceId] = [];
  }
  if (!userData.completedGames[provinceId].includes(gameType)) {
    userData.completedGames[provinceId].push(gameType);
  }
  return saveUserData(userData);
};

// Check if user has completed any game for a province
export const hasCompletedAnyGame = (provinceId) => {
  const userData = getUserData();
  const completed = userData.completedGames && userData.completedGames[provinceId];
  return completed && completed.length > 0;
};

// Check if reward can be claimed (completed game + not claimed yet)
export const canClaimReward = (provinceId) => {
  const userData = getUserData();
  return hasCompletedAnyGame(provinceId) && !userData.claimedRewards.includes(provinceId);
};

// Claim province reward
export const claimProvinceReward = (provinceId, keyReward) => {
  const userData = getUserData();
  
  if (!canClaimReward(provinceId)) {
    console.log(`❌ [claimProvinceReward] Cannot claim - either not completed or already claimed`);
    return false;
  }
  
  userData.keys += keyReward;
  if (!userData.claimedRewards) {
    userData.claimedRewards = [];
  }
  userData.claimedRewards.push(provinceId);
  return saveUserData(userData);
};

// Check if reward already claimed
export const hasClaimedReward = (provinceId) => {
  const userData = getUserData();
  return userData.claimedRewards && userData.claimedRewards.includes(provinceId);
};

// Save quiz score
export const saveQuizScore = (regionId, score) => {
  const userData = getUserData();
  userData.quizScores[regionId] = Math.max(userData.quizScores[regionId] || 0, score);
  userData.gamesPlayed++;
  userData.totalScore += score;
  return saveUserData(userData);
};

// Record quiz attempt & stats per province
export const recordQuizAttempt = (provinceSlug, score, passed) => {
  const userData = getUserData();
  if (!userData.quizStats) userData.quizStats = {};

  const current = userData.quizStats[provinceSlug] || {
    attempts: 0,
    highScore: 0,
    passed: false,
    lastScore: 0,
    lastPlayedAt: null,
  };

  const newAttempts = (current.attempts || 0) + 1;
  const newHighScore = Math.max(current.highScore || 0, score || 0);
  const newPassed = current.passed || Boolean(passed);

  userData.quizStats[provinceSlug] = {
    attempts: newAttempts,
    highScore: newHighScore,
    passed: newPassed,
    lastScore: score,
    lastPlayedAt: new Date().toISOString(),
  };

  if (!userData.quizScores) userData.quizScores = {};
  userData.quizScores[provinceSlug] = newHighScore;

  if (passed) {
    if (!userData.completedGames) userData.completedGames = {};
    if (!userData.completedGames[provinceSlug]) userData.completedGames[provinceSlug] = [];
    if (!userData.completedGames[provinceSlug].includes('quiz')) {
      userData.completedGames[provinceSlug].push('quiz');
    }
  }

  userData.gamesPlayed = (userData.gamesPlayed || 0) + 1;
  userData.totalScore = (userData.totalScore || 0) + (score || 0);

  saveUserData(userData);
  return userData.quizStats[provinceSlug];
};

// Get quiz progress status, attempts counter, and highest score for a province
export const getProvinceQuizProgress = (provinceSlug) => {
  if (!provinceSlug) {
    return {
      isCompleted: false,
      attempts: 0,
      highScore: 0,
      lastScore: 0,
      hasAttempted: false,
      lastPlayedAt: null,
    };
  }

  const userData = getUserData();
  const stat = userData.quizStats?.[provinceSlug] || null;
  const isCompletedInGames = userData.completedGames?.[provinceSlug]?.includes('quiz') || false;
  const highScoreInScores = userData.quizScores?.[provinceSlug] || 0;

  const isCompleted = Boolean(stat?.passed || isCompletedInGames);
  const attempts = stat?.attempts || (isCompletedInGames ? 1 : 0);
  const highScore = Math.max(stat?.highScore || 0, highScoreInScores);
  const lastScore = stat?.lastScore ?? highScore;

  return {
    isCompleted,
    attempts,
    highScore,
    lastScore,
    hasAttempted: attempts > 0,
    lastPlayedAt: stat?.lastPlayedAt || null,
  };
};

// Get all provinces progress summary
export const getAllQuizProgress = () => {
  const userData = getUserData();
  return userData.quizStats || {};
};

// Save puzzle score
export const savePuzzleScore = (regionId, score) => {
  const userData = getUserData();
  userData.puzzleScores[regionId] = score;
  userData.gamesPlayed++;
  userData.totalScore += score;
  return saveUserData(userData);
};

// Get theme
export const getTheme = () => {
  const theme = localStorage.getItem(STORAGE_KEYS.THEME) || 'dark';
  return theme;
};

// Save theme
export const saveTheme = (theme) => {
  localStorage.setItem(STORAGE_KEYS.THEME, theme);
};

// Get or generate persistent guest device ID
export const getDeviceId = () => {
  let id = localStorage.getItem('nusaquest_device_id');
  if (!id) {
    id = 'dev_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
    localStorage.setItem('nusaquest_device_id', id);
  }
  return id;
};


// Reset user data
export const resetUserData = () => {
  return saveUserData(DEFAULT_USER_DATA);
};
