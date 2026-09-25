import { supabase } from '../config/supabase.js';

/**
 * Helper murni + helper Supabase untuk menyatukan & memindahkan progres antara
 * Mode Tamu (`guest_progress`, key: device_id) dan akun (`user_progress`, key: user_id).
 *
 * Aturan pemakaian:
 *  - Data tamu HANYA dipindahkan ke akun saat REGISTER (lihat authController).
 *  - Login ke akun yang sudah ada tidak menyentuh `guest_progress` sama sekali.
 */

export const GUEST_MAX_PROVINCES = 5;

const asArray = (value) => (Array.isArray(value) ? value : []);
const asObject = (value) => (value && typeof value === 'object' && !Array.isArray(value) ? value : {});
const asNumber = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};
const unique = (list) => Array.from(new Set(list.filter(Boolean)));

/** Bentuk kanonik 1 statistik provinsi (dipakai guest_progress & user_progress) */
export function normalizeQuizStat(stat = {}) {
  const source = asObject(stat);
  const attempts = asNumber(source.attempts, 0);
  const highScore = asNumber(source.high_score ?? source.highScore, 0);
  const hasGameFields = source.quiz_attempts !== undefined || source.puzzle_attempts !== undefined;

  return {
    attempts,
    high_score: highScore,
    passed: Boolean(source.passed),
    last_score: asNumber(source.last_score ?? source.lastScore, 0),
    last_played_at: source.last_played_at || source.lastPlayedAt || null,
    quiz_attempts: hasGameFields ? asNumber(source.quiz_attempts, 0) : attempts,
    quiz_high_score: hasGameFields ? asNumber(source.quiz_high_score, 0) : highScore,
    puzzle_attempts: asNumber(source.puzzle_attempts, 0),
    puzzle_high_score: asNumber(source.puzzle_high_score, 0),
  };
}

/** Normalisasi seluruh peta quiz_stats { provinceSlug: stat } */
export function normalizeQuizStats(stats = {}) {
  const source = asObject(stats);
  const result = {};
  for (const slug of Object.keys(source)) {
    result[slug] = normalizeQuizStat(source[slug]);
  }
  return result;
}

/**
 * Tambah 1 percobaan pada quiz_stats (tidak mengubah objek asal).
 * `gameType` menentukan counter quiz / puzzle yang dinaikkan.
 */
export function bumpQuizStats(currentStats, { provinceSlug, gameType = 'quiz', score = 0, passed = false, playedAt = null }) {
  const stats = { ...normalizeQuizStats(currentStats) };
  if (!provinceSlug) return stats;

  const prev = stats[provinceSlug] || normalizeQuizStat({});
  const safeScore = asNumber(score, 0);

  const next = {
    ...prev,
    attempts: prev.attempts + 1,
    high_score: Math.max(prev.high_score, safeScore),
    passed: prev.passed || Boolean(passed),
    last_score: safeScore,
    last_played_at: playedAt || new Date().toISOString(),
  };

  if (gameType === 'puzzle') {
    next.puzzle_attempts = prev.puzzle_attempts + 1;
    next.puzzle_high_score = Math.max(prev.puzzle_high_score, safeScore);
  } else {
    next.quiz_attempts = prev.quiz_attempts + 1;
    next.quiz_high_score = Math.max(prev.quiz_high_score, safeScore);
  }

  stats[provinceSlug] = next;
  return stats;
}

/**
 * Gabungkan dua peta quiz_stats.
 *
 * `attempts` / high score memakai nilai TERTINGGI (bukan dijumlahkan) supaya
 * operasi merge bersifat idempotent — dipanggil berulang tidak menggelembungkan
 * angka. Penambahan percobaan baru dilakukan oleh `bumpQuizStats`.
 */
export function mergeQuizStats(baseStats = {}, incomingStats = {}) {
  const merged = { ...normalizeQuizStats(baseStats) };
  const incoming = normalizeQuizStats(incomingStats);

  for (const slug of Object.keys(incoming)) {
    const prev = merged[slug];
    const next = incoming[slug];
    if (!prev) {
      merged[slug] = next;
      continue;
    }

    const playedTimes = [prev.last_played_at, next.last_played_at].filter(Boolean).sort();
    const latest = playedTimes.length > 0 ? playedTimes[playedTimes.length - 1] : null;
    const latestStat = latest && latest === next.last_played_at ? next : prev;

    merged[slug] = {
      attempts: Math.max(prev.attempts, next.attempts),
      high_score: Math.max(prev.high_score, next.high_score),
      passed: prev.passed || next.passed,
      last_score: latestStat.last_score,
      last_played_at: latest,
      quiz_attempts: Math.max(prev.quiz_attempts, next.quiz_attempts),
      quiz_high_score: Math.max(prev.quiz_high_score, next.quiz_high_score),
      puzzle_attempts: Math.max(prev.puzzle_attempts, next.puzzle_attempts),
      puzzle_high_score: Math.max(prev.puzzle_high_score, next.puzzle_high_score),
    };
  }

  return merged;
}

/** Gabungkan completed_games { slug: ['quiz', 'puzzle'] } */
export function mergeCompletedGames(baseGames = {}, incomingGames = {}) {
  const merged = {};
  for (const [slug, games] of Object.entries(asObject(baseGames))) {
    merged[slug] = unique(asArray(games));
  }
  for (const [slug, games] of Object.entries(asObject(incomingGames))) {
    merged[slug] = unique([...(merged[slug] || []), ...asArray(games)]);
  }
  return merged;
}

/** Normalisasi baris DB apa pun (guest/user) ke satu bentuk progres yang seragam */
export function normalizeProgress(row = {}) {
  return {
    keys: asNumber(row.keys, 0),
    total_score: asNumber(row.total_score ?? row.totalScore, 0),
    games_played: asNumber(row.games_played ?? row.gamesPlayed, 0),
    unlocked_provinces: asArray(row.unlocked_provinces ?? row.unlockedRegions ?? row.unlockedProvinces),
    completed_games: asObject(row.completed_games ?? row.completedGames),
    claimed_rewards: asArray(row.claimed_rewards ?? row.claimedRewards),
    quiz_stats: normalizeQuizStats(row.quiz_stats ?? row.quizStats),
    guest_warning_seen: Boolean(row.guest_warning_seen ?? row.guestWarningSeen),
  };
}

/** Hitung jumlah provinsi yang tuntas (selesai game, sudah diklaim, atau lulus quiz) */
export function countCompletedProvinces(input = {}) {
  const progress = normalizeProgress(input);
  const provinces = new Set();

  for (const slug of Object.keys(progress.completed_games)) {
    if (asArray(progress.completed_games[slug]).length > 0) provinces.add(slug);
  }
  for (const slug of progress.claimed_rewards) provinces.add(slug);
  for (const slug of Object.keys(progress.quiz_stats)) {
    if (progress.quiz_stats[slug].passed) provinces.add(slug);
  }

  return provinces.size;
}

/** Bonus kunci pendaftaran: sejumlah provinsi yang diselesaikan tamu, minimal 1 */
export function computeGuestBonusKeys(completedCount) {
  return completedCount > 0 ? completedCount : 1;
}

/** Gabungkan dua progres (idempotent) untuk semua field yang dipakai UI */
export function mergeProgressData(base = {}, incoming = {}) {
  const a = normalizeProgress(base);
  const b = normalizeProgress(incoming);

  return {
    keys: Math.max(a.keys, b.keys),
    total_score: Math.max(a.total_score, b.total_score),
    games_played: Math.max(a.games_played, b.games_played),
    unlocked_provinces: unique([...a.unlocked_provinces, ...b.unlocked_provinces]),
    completed_games: mergeCompletedGames(a.completed_games, b.completed_games),
    claimed_rewards: unique([...a.claimed_rewards, ...b.claimed_rewards]),
    quiz_stats: mergeQuizStats(a.quiz_stats, b.quiz_stats),
    guest_warning_seen: a.guest_warning_seen || b.guest_warning_seen,
  };
}

/** Ubah progres ternormalisasi menjadi payload kolom `user_progress` */
export function toUserProgressPayload(progress, overrides = {}) {
  const normalized = normalizeProgress(progress);
  return {
    keys: normalized.keys,
    total_score: normalized.total_score,
    games_played: normalized.games_played,
    unlocked_provinces: normalized.unlocked_provinces,
    completed_games: normalized.completed_games,
    claimed_rewards: normalized.claimed_rewards,
    quiz_stats: normalized.quiz_stats,
    ...overrides,
  };
}

/** Baca baris guest_progress (null jika belum ada) */
export async function readGuestProgressRow(deviceId) {
  if (!deviceId) return null;
  const { data, error } = await supabase
    .from('guest_progress')
    .select('*')
    .eq('device_id', deviceId)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

/** Ambil baris guest_progress, buat menjadi default bila belum ada */
export async function ensureGuestProgressRow(deviceId) {
  const existing = await readGuestProgressRow(deviceId);
  if (existing) return existing;

  const { data: created, error } = await supabase
    .from('guest_progress')
    .insert({ device_id: deviceId })
    .select('*')
    .single();

  if (error) throw error;
  return created;
}

/**
 * Kolom `user_progress.quiz_stats` ditambahkan oleh migration
 * `database/migrations/001_guest_progress.sql`.
 *
 * Bila migration belum dijalankan, penulisan tetap dilakukan tanpa kolom
 * tersebut supaya aplikasi tidak error (hanya statistik per provinsi yang
 * belum tersimpan). Peringatan tetap dicatat agar migration segera dijalankan.
 */
const isQuizStatsColumnMissing = (error) => {
  if (!error) return false;
  const message = String(error.message || '');
  return message.includes('quiz_stats') && /could not find|does not exist|schema cache/i.test(message);
};

const warnMissingQuizStats = () => {
  console.warn(
    '[progressMerge] Kolom user_progress.quiz_stats belum ada. Jalankan backend/database/migrations/001_guest_progress.sql di Supabase SQL Editor.'
  );
};

/** Insert baris user_progress (fallback tanpa quiz_stats bila kolomnya belum ada) */
export async function insertUserProgressRow(payload) {
  const { data, error } = await supabase.from('user_progress').insert(payload).select('*').single();
  if (!isQuizStatsColumnMissing(error)) return { data, error };

  warnMissingQuizStats();
  const fallback = { ...payload };
  delete fallback.quiz_stats;
  return supabase.from('user_progress').insert(fallback).select('*').single();
}

/** Update baris user_progress (fallback tanpa quiz_stats bila kolomnya belum ada) */
export async function updateUserProgressRow(id, payload) {
  const { data, error } = await supabase
    .from('user_progress')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (!isQuizStatsColumnMissing(error)) return { data, error };

  warnMissingQuizStats();
  const fallback = { ...payload };
  delete fallback.quiz_stats;
  return supabase.from('user_progress').update(fallback).eq('id', id).select('*').single();
}

/** Ambil baris user_progress milik user, buat default (1 kunci) bila belum ada */
export async function ensureUserProgressRow(userId) {
  if (!userId) return null;

  const { data: existing, error } = await supabase
    .from('user_progress')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (existing) return existing;

  const { data, error: createErr } = await insertUserProgressRow({
    user_id: userId,
    // device_id user selalu memakai prefix user_ agar tidak pernah bentrok
    device_id: `user_${userId}`,
    keys: 1,
    total_score: 0,
    games_played: 0,
    unlocked_provinces: [],
    completed_games: {},
    claimed_rewards: [],
    quiz_stats: {},
  });

  if (createErr) throw createErr;
  return data;
}

/**
 * Pindahkan seluruh progres Mode Tamu milik `deviceId` ke akun `userId`,
 * lalu hapus baris guest_progress-nya.
 *
 * User menerima keys, unlocked_provinces, completed_games, claimed_rewards,
 * quiz_stats, total_score, dan games_played milik tamu + bonus kunci.
 */
export async function mergeGuestProgressIntoUser(deviceId, userId) {
  const result = { transferred: false, completedCount: 0, bonusKeys: 1, progress: null };
  if (!userId) return result;

  const guestRow = await readGuestProgressRow(deviceId);
  const guest = normalizeProgress(guestRow || {});
  result.completedCount = countCompletedProvinces(guest);
  result.bonusKeys = computeGuestBonusKeys(result.completedCount);

  const { data: userRow, error: userErr } = await supabase
    .from('user_progress')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (userErr) throw userErr;

  const merged = mergeProgressData(userRow || {}, guest);
  const baseKeys = userRow ? Math.max(asNumber(userRow.keys, 0), guest.keys) : guest.keys;

  const payload = toUserProgressPayload(merged, {
    keys: baseKeys + result.bonusKeys,
    updated_at: new Date().toISOString(),
  });

  let saved;
  if (userRow) {
    const { data, error } = await updateUserProgressRow(userRow.id, payload);
    if (error) throw error;
    saved = data;
  } else {
    const { data, error } = await insertUserProgressRow({
      ...payload,
      user_id: userId,
      device_id: `user_${userId}`,
    });
    if (error) throw error;
    saved = data;
  }

  if (guestRow) {
    const { error: deleteErr } = await supabase
      .from('guest_progress')
      .delete()
      .eq('id', guestRow.id);

    if (deleteErr) {
      console.warn('[progressMerge] Gagal menghapus guest_progress:', deleteErr.message);
    } else {
      result.transferred = true;
    }
  }

  result.progress = saved;
  return result;
}

/**
 * Versi aman untuk dipakai saat registrasi: kegagalan transfer tidak boleh
 * membuat proses pembuatan akun ikut gagal.
 */
export async function transferGuestProgress(deviceId, userId) {
  try {
    return await mergeGuestProgressIntoUser(deviceId, userId);
  } catch (error) {
    console.error('[progressMerge] Transfer data tamu gagal:', error.message);
    try {
      await ensureUserProgressRow(userId);
    } catch (fallbackError) {
      console.error('[progressMerge] Gagal membuat user_progress default:', fallbackError.message);
    }
    return { transferred: false, completedCount: 0, bonusKeys: 1, progress: null };
  }
}
