import { supabase } from '../config/supabase.js';
import {
  GUEST_MAX_PROVINCES,
  bumpQuizStats,
  ensureGuestProgressRow,
  mergeCompletedGames,
  mergeProgressData,
  normalizeProgress,
  toUserProgressPayload,
} from '../utils/progressMerge.js';

/**
 * Controller Mode Tamu.
 *
 * Semua aksi tamu di-key oleh `deviceId` (per perangkat) dan disimpan di tabel
 * `guest_progress` — TIDAK ada lagi state tamu di localStorage browser.
 * Data ini dipindahkan ke akun hanya saat REGISTER (lihat authController).
 */

const isValidDeviceId = (deviceId) => Boolean(deviceId && String(deviceId).trim());
const VALID_GAME_TYPES = ['quiz', 'puzzle'];

/**
 * Cek apakah baris guest masih kosong. Dipakai agar import data legacy dari
 * localStorage hanya berjalan sekali (idempotent) — sync berulang tidak
 * menggandakan progres.
 */
const isGuestRowEmpty = (row) => {
  const progress = normalizeProgress(row);
  return (
    progress.keys === 0 &&
    progress.total_score === 0 &&
    progress.games_played === 0 &&
    progress.unlocked_provinces.length === 0 &&
    progress.claimed_rewards.length === 0 &&
    Object.keys(progress.completed_games).length === 0 &&
    Object.keys(progress.quiz_stats).length === 0
  );
};

const fail = (res, status, message, extra = {}) =>
  res.status(status).json({ success: false, message, ...extra });

const ok = (res, data, extra = {}) => res.json({ success: true, data, ...extra });

/** GET /api/guest/progress/:deviceId — ambil progres tamu (buat default jika belum ada) */
export const getGuestProgress = async (req, res) => {
  try {
    const { deviceId } = req.params;
    if (!isValidDeviceId(deviceId)) return fail(res, 400, 'deviceId wajib diisi.');

    const row = await ensureGuestProgressRow(deviceId.trim());
    return ok(res, row);
  } catch (error) {
    return fail(res, 500, error.message);
  }
};

/**
 * POST /api/guest/sync
 * Body: { deviceId, legacyProgress?, legacyWarningSeen? }
 *
 * `legacyProgress` dipakai sekali untuk memindahkan data lama dari localStorage
 * (nusaquest_user_data) ke database, setelah itu client berhenti memakai localStorage.
 */
export const syncGuestProgress = async (req, res) => {
  try {
    const { deviceId, legacyProgress, legacyWarningSeen } = req.body || {};
    if (!isValidDeviceId(deviceId)) return fail(res, 400, 'deviceId wajib diisi.');

    const row = await ensureGuestProgressRow(deviceId.trim());
    const wantsLegacyImport = Boolean(legacyProgress && typeof legacyProgress === 'object');
    // Import legacy hanya boleh masuk ke baris guest yang masih kosong.
    const hasLegacyProgress = wantsLegacyImport && isGuestRowEmpty(row);

    if (!hasLegacyProgress && !legacyWarningSeen) {
      return ok(res, row);
    }

    const current = normalizeProgress(row);
    const merged = hasLegacyProgress ? mergeProgressData(current, legacyProgress) : current;

    const { data, error } = await supabase
      .from('guest_progress')
      .update(
        toUserProgressPayload(merged, {
          guest_warning_seen: Boolean(row.guest_warning_seen || legacyWarningSeen),
          updated_at: new Date().toISOString(),
        })
      )
      .eq('id', row.id)
      .select('*')
      .single();

    if (error) throw error;
    return ok(res, data, { importedLegacy: hasLegacyProgress });
  } catch (error) {
    return fail(res, 500, error.message);
  }
};

/**
 * POST /api/guest/unlock
 * Body: { deviceId, provinceSlug }
 *
 * Tamu membuka provinsi secara GRATIS, tetapi dibatasi GUEST_MAX_PROVINCES.
 * Batas ini dipaksa di server (sebelumnya hanya di client).
 */
export const unlockGuestProvince = async (req, res) => {
  try {
    const { deviceId, provinceSlug } = req.body || {};
    if (!isValidDeviceId(deviceId)) return fail(res, 400, 'deviceId wajib diisi.');
    if (!provinceSlug) return fail(res, 400, 'provinceSlug wajib diisi.');

    const row = await ensureGuestProgressRow(deviceId.trim());
    const unlocked = Array.isArray(row.unlocked_provinces) ? row.unlocked_provinces : [];

    if (unlocked.includes(provinceSlug)) {
      return fail(res, 400, 'Provinsi sudah terbuka.');
    }

    if (unlocked.length >= GUEST_MAX_PROVINCES) {
      return fail(
        res,
        403,
        `Mode Tamu hanya bisa membuka maksimal ${GUEST_MAX_PROVINCES} provinsi. Daftar akun gratis untuk membuka semuanya.`,
        { code: 'GUEST_LIMIT_REACHED', guestLimit: GUEST_MAX_PROVINCES }
      );
    }

    const { data, error } = await supabase
      .from('guest_progress')
      .update({
        unlocked_provinces: [...unlocked, provinceSlug],
        updated_at: new Date().toISOString(),
      })
      .eq('id', row.id)
      .select('*')
      .single();

    if (error) throw error;
    return ok(res, data);
  } catch (error) {
    return fail(res, 500, error.message);
  }
};

/**
 * POST /api/guest/score
 * Body: { deviceId, provinceSlug, gameType, score, passed }
 *
 * Mencatat percobaan game tamu ke guest_progress (quiz_stats + completed_games).
 * Sebelumnya data ini hilang karena hanya tersimpan di localStorage.
 */
export const recordGuestScore = async (req, res) => {
  try {
    const { deviceId, provinceSlug, gameType = 'quiz', score = 0, passed = false } = req.body || {};
    if (!isValidDeviceId(deviceId)) return fail(res, 400, 'deviceId wajib diisi.');
    if (!provinceSlug) return fail(res, 400, 'provinceSlug wajib diisi.');
    if (!VALID_GAME_TYPES.includes(gameType)) {
      return fail(res, 400, `gameType harus salah satu dari: ${VALID_GAME_TYPES.join(', ')}.`);
    }

    const row = await ensureGuestProgressRow(deviceId.trim());
    const progress = normalizeProgress(row);
    const safeScore = Number(score) || 0;
    const playedAt = new Date().toISOString();

    const quizStats = bumpQuizStats(progress.quiz_stats, {
      provinceSlug,
      gameType,
      score: safeScore,
      passed,
      playedAt,
    });

    const completedGames = mergeCompletedGames(
      progress.completed_games,
      passed ? { [provinceSlug]: [gameType] } : {}
    );

    const { data, error } = await supabase
      .from('guest_progress')
      .update({
        quiz_stats: quizStats,
        completed_games: completedGames,
        total_score: progress.total_score + safeScore,
        games_played: progress.games_played + 1,
        updated_at: playedAt,
      })
      .eq('id', row.id)
      .select('*')
      .single();

    if (error) throw error;

    const stat = quizStats[provinceSlug];
    return ok(res, {
      ...data,
      province_stats: {
        attempts: stat.attempts,
        high_score: stat.high_score,
        passed: stat.passed,
        last_score: stat.last_score,
      },
    });
  } catch (error) {
    return fail(res, 500, error.message);
  }
};

/**
 * POST /api/guest/claim
 * Body: { deviceId, provinceSlug }
 *
 * Reward tamu selalu +1 kunci (dipaksa di server, bukan dari nilai client).
 */
export const claimGuestReward = async (req, res) => {
  try {
    const { deviceId, provinceSlug } = req.body || {};
    if (!isValidDeviceId(deviceId)) return fail(res, 400, 'deviceId wajib diisi.');
    if (!provinceSlug) return fail(res, 400, 'provinceSlug wajib diisi.');

    const row = await ensureGuestProgressRow(deviceId.trim());
    const claimed = Array.isArray(row.claimed_rewards) ? row.claimed_rewards : [];

    if (claimed.includes(provinceSlug)) {
      return fail(res, 400, 'Hadiah sudah diklaim.');
    }

    const { data, error } = await supabase
      .from('guest_progress')
      .update({
        keys: (row.keys || 0) + 1,
        claimed_rewards: [...claimed, provinceSlug],
        updated_at: new Date().toISOString(),
      })
      .eq('id', row.id)
      .select('*')
      .single();

    if (error) throw error;
    return ok(res, data);
  } catch (error) {
    return fail(res, 500, error.message);
  }
};

/** POST /api/guest/warning-seen — modal peringatan tamu hanya tampil sekali per perangkat */
export const markGuestWarningSeen = async (req, res) => {
  try {
    const { deviceId } = req.body || {};
    if (!isValidDeviceId(deviceId)) return fail(res, 400, 'deviceId wajib diisi.');

    const row = await ensureGuestProgressRow(deviceId.trim());
    if (row.guest_warning_seen) return ok(res, row);

    const { data, error } = await supabase
      .from('guest_progress')
      .update({ guest_warning_seen: true, updated_at: new Date().toISOString() })
      .eq('id', row.id)
      .select('*')
      .single();

    if (error) throw error;
    return ok(res, data);
  } catch (error) {
    return fail(res, 500, error.message);
  }
};

/** DELETE /api/guest/progress/:deviceId — reset total progres tamu untuk perangkat ini */
export const resetGuestProgress = async (req, res) => {
  try {
    const { deviceId } = req.params;
    if (!isValidDeviceId(deviceId)) return fail(res, 400, 'deviceId wajib diisi.');

    const { error } = await supabase
      .from('guest_progress')
      .delete()
      .eq('device_id', deviceId.trim());

    if (error) throw error;
    return res.json({ success: true, message: 'Progres Mode Tamu berhasil direset.' });
  } catch (error) {
    return fail(res, 500, error.message);
  }
};

