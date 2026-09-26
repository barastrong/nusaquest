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

/**
 * Jumlah soal kuis per sesi. Backend melayani sejumlah ini per permintaan
 * (fallback ke jumlah tersedia bila provinsi punya soal lebih sedikit).
 * Dipakai bersama oleh QuizGame (permintaan soal) dan GamesPage (penyebut
 * "Skor Terbaik" dan deskripsi card) agar tidak ada angka yang diketik dua kali.
 */
export const QUIZ_QUESTION_COUNT = 10;

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

  // Tanpa tipe game: perilaku lama — campuran quiz + puzzle (untuk tampilan umum)
  if (!gameType) {
    const anyCompleted = completedTypes.length > 0;
    const attempts = Math.max(stat.attempts, anyCompleted ? 1 : 0);
    return {
      isCompleted: Boolean(stat.passed || anyCompleted),
      attempts,
      highScore: stat.highScore,
      lastScore: stat.lastScore,
      hasAttempted: attempts > 0,
      lastPlayedAt: stat.lastPlayedAt,
    };
  }

  const isPuzzle = gameType === 'puzzle';
  const isCompletedForType = completedTypes.includes(gameType);
  const attemptsForType = isPuzzle ? stat.puzzleAttempts : stat.quizAttempts;
  const highScoreForType = isPuzzle ? stat.puzzleHighScore : stat.quizHighScore;
  const hasTypeData = attemptsForType > 0 || highScoreForType > 0;

  // `stat.passed` / `stat.attempts` / `stat.highScore` di backend adalah gabungan
  // quiz + puzzle. Dulu angka gabungan ini ikut dipakai untuk tiap card sehingga
  // skor Puzzle (angkanya jauh lebih besar) tampil di card Quiz — "Skor Terbaik"
  // quiz tampak tidak pernah ter-update. Sekarang per-tipe saja.
  //
  // Satu-satunya pengecualian: data lama yang belum punya pemisahan per tipe
  // (quiz_high_score / puzzle_high_score). Bila hanya SATU tipe yang punya data,
  // nilai gabungan pasti milik tipe itu, jadi aman dipakai.
  const otherTypeHasData = isPuzzle
    ? stat.quizAttempts > 0 || stat.quizHighScore > 0
    : stat.puzzleAttempts > 0 || stat.puzzleHighScore > 0;
  const inheritOverall = !hasTypeData && !otherTypeHasData && !isCompletedForType
    ? 'none'
    : !otherTypeHasData ? 'this-type-only' : 'per-type';

  const attemptsSource =
    inheritOverall === 'this-type-only' ? stat.attempts
    : inheritOverall === 'per-type' ? attemptsForType
    : 0;
  const highScoreSource =
    inheritOverall === 'this-type-only' ? stat.highScore
    : inheritOverall === 'per-type' ? highScoreForType
    : 0;

  const attempts = Math.max(attemptsSource, isCompletedForType ? 1 : 0);
  const typePassed = isCompletedForType
    || (stat.passed && inheritOverall === 'this-type-only' && attemptsSource > 0);

  return {
    isCompleted: Boolean(typePassed),
    attempts,
    highScore: highScoreSource,
    lastScore: attempts > 0 ? stat.lastScore : 0,
    hasAttempted: attempts > 0,
    lastPlayedAt: attempts > 0 ? stat.lastPlayedAt : null,
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
