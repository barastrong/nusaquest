// Pemetaan progres dari API (snake_case) ke bentuk yang dipakai UI (camelCase),
// plus fungsi turunan (status reward, statistik per provinsi).
//
// Sumber data progres SELALU dari database (guest_progress / user_progress),
// tidak ada lagi pembacaan/pengelolaan progres di localStorage.

export const GUEST_MAX_PROVINCES = 5;

const asArray = (value) => (Array.isArray(value) ? value : []);
const asObject = (value) => (value && typeof value === 'object' && !Array.isArray(value) ? value : {});
const asNumber = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

export const EMPTY_PROGRESS = {
  keys: 0,
  unlockedRegions: [],
  completedGames: {},
  claimedRewards: [],
  quizStats: {},
  totalScore: 0,
  gamesPlayed: 0,
  guestWarningSeen: false,
};

export const EMPTY_PROVINCE_STAT = {
  isCompleted: false,
  attempts: 0,
  highScore: 0,
  lastScore: 0,
  hasAttempted: false,
  lastPlayedAt: null,
};

/** Normalisasi satu statistik provinsi ke bentuk camelCase */
export function mapQuizStat(stat = {}) {
  const source = asObject(stat);
  const attempts = asNumber(source.attempts, 0);
  const highScore = asNumber(source.highScore ?? source.high_score, 0);

  return {
    attempts,
    highScore,
    passed: Boolean(source.passed),
    lastScore: asNumber(source.lastScore ?? source.last_score, 0),
    lastPlayedAt: source.lastPlayedAt || source.last_played_at || null,
    quizAttempts: asNumber(source.quizAttempts ?? source.quiz_attempts, attempts),
    quizHighScore: asNumber(source.quizHighScore ?? source.quiz_high_score, highScore),
    puzzleAttempts: asNumber(source.puzzleAttempts ?? source.puzzle_attempts, 0),
    puzzleHighScore: asNumber(source.puzzleHighScore ?? source.puzzle_high_score, 0),
  };
}

/** Baris API (guest_progress / user_progress) -> progres UI */
export function mapProgressFromApi(row) {
  if (!row || typeof row !== 'object') return { ...EMPTY_PROGRESS };

  const quizStats = {};
  for (const [slug, stat] of Object.entries(asObject(row.quizStats ?? row.quiz_stats))) {
    quizStats[slug] = mapQuizStat(stat);
  }

  return {
    keys: asNumber(row.keys, 0),
    unlockedRegions: asArray(row.unlockedRegions ?? row.unlocked_provinces),
    completedGames: asObject(row.completedGames ?? row.completed_games),
    claimedRewards: asArray(row.claimedRewards ?? row.claimed_rewards),
    quizStats,
    totalScore: asNumber(row.totalScore ?? row.total_score, 0),
    gamesPlayed: asNumber(row.gamesPlayed ?? row.games_played, 0),
    guestWarningSeen: Boolean(row.guestWarningSeen ?? row.guest_warning_seen),
  };
}

/** Tipe game yang sudah diselesaikan untuk sebuah provinsi */
export function getCompletedGameTypes(progress, provinceSlug) {
  if (!provinceSlug) return [];
  return asArray((progress || EMPTY_PROGRESS).completedGames?.[provinceSlug]);
}

/** Statistik progres sebuah provinsi untuk tipe game tertentu */
export function getProvinceStat(progress, provinceSlug, gameType = 'quiz') {
  if (!provinceSlug) return { ...EMPTY_PROVINCE_STAT };

  const data = progress || EMPTY_PROGRESS;
  const stat = mapQuizStat(data.quizStats?.[provinceSlug] || {});
  const completedTypes = getCompletedGameTypes(data, provinceSlug);
  const isCompletedForType = gameType ? completedTypes.includes(gameType) : completedTypes.length > 0;

  const attemptsForType = gameType === 'puzzle' ? stat.puzzleAttempts : stat.quizAttempts;
  const highScoreForType = gameType === 'puzzle' ? stat.puzzleHighScore : stat.quizHighScore;
  const attempts = Math.max(stat.attempts, attemptsForType, isCompletedForType ? 1 : 0);
  const highScore = Math.max(stat.highScore, highScoreForType);

  return {
    isCompleted: Boolean(stat.passed || isCompletedForType),
    attempts,
    highScore,
    lastScore: stat.lastScore,
    hasAttempted: attempts > 0,
    lastPlayedAt: stat.lastPlayedAt,
  };
}

/** Apakah reward provinsi sudah pernah diklaim */
export function hasClaimedReward(progress, provinceSlug) {
  if (!provinceSlug) return false;
  return asArray((progress || EMPTY_PROGRESS).claimedRewards).includes(provinceSlug);
}

/** Reward bisa diklaim bila ada game selesai dan belum pernah diklaim */
export function canClaimReward(progress, provinceSlug) {
  if (!provinceSlug) return false;
  const data = progress || EMPTY_PROGRESS;
  return getCompletedGameTypes(data, provinceSlug).length > 0 && !hasClaimedReward(data, provinceSlug);
}

/** Jumlah provinsi yang tuntas (dipakai untuk bonus kunci saat registrasi) */
export function countCompletedProvinces(progress) {
  const data = progress || EMPTY_PROGRESS;
  const provinces = new Set();

  for (const slug of Object.keys(data.completedGames || {})) {
    if (asArray(data.completedGames[slug]).length > 0) provinces.add(slug);
  }
  for (const slug of asArray(data.claimedRewards)) provinces.add(slug);
  for (const slug of Object.keys(data.quizStats || {})) {
    if (data.quizStats[slug]?.passed) provinces.add(slug);
  }

  return provinces.size;
}
