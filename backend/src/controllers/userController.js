import { supabase } from '../config/supabase.js';
import {
  bumpQuizStats,
  ensureUserProgressRow,
  mergeCompletedGames,
  mergeProgressData,
  mergeQuizStats,
  normalizeQuizStat,
  normalizeQuizStats,
  toUserProgressPayload,
  updateUserProgressRow,
} from '../utils/progressMerge.js';

/**
 * Catatan arsitektur:
 *  - Progres akun selalu di-key oleh `user_id` dari token JWT (1 baris per user).
 *  - Progres Mode Tamu TIDAK dibaca di sini; tamu memakai endpoint /api/guest/*
 *    dan datanya baru dipindahkan ke akun saat register (lihat authController).
 */

export const getUserProgress = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Autentikasi diperlukan.' });
    }

    const user = await ensureUserProgressRow(userId);

    // Statistik kuis & attempt per provinsi dari game_history
    const historyStats = {};
    const { data: history } = await supabase
      .from('game_history')
      .select('province_slug, game_type, score, passed, played_at')
      .eq('user_id', userId)
      .order('played_at', { ascending: true });

    for (const item of history || []) {
      Object.assign(
        historyStats,
        bumpQuizStats(historyStats, {
          provinceSlug: item.province_slug || 'general',
          gameType: item.game_type,
          score: item.score || 0,
          passed: item.passed,
          playedAt: item.played_at,
        })
      );
    }

    // Gabungkan dengan quiz_stats tersimpan (mis. hasil transfer data tamu saat register)
    const quizStats = mergeQuizStats(normalizeQuizStats(user.quiz_stats), historyStats);

    // Pastikan provinsi berstatus selesai (completed_games) tetap terhitung
    for (const [province, games] of Object.entries(user.completed_games || {})) {
      const played = Array.isArray(games) ? games : [];
      if (played.length === 0) continue;

      if (!quizStats[province]) {
        quizStats[province] = normalizeQuizStat({
          attempts: 1,
          high_score: 0,
          passed: true,
          quiz_attempts: played.includes('quiz') ? 1 : 0,
          puzzle_attempts: played.includes('puzzle') ? 1 : 0,
        });
      } else {
        quizStats[province].passed = true;
        quizStats[province].attempts = Math.max(quizStats[province].attempts, 1);
      }
    }

    res.json({ success: true, data: { ...user, quiz_stats: quizStats } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const unlockProvince = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { provinceSlug, keyCost = 1 } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Autentikasi diperlukan.' });
    }

    if (!provinceSlug) {
      return res.status(400).json({ success: false, message: 'provinceSlug wajib diisi.' });
    }

    const user = await ensureUserProgressRow(userId);

    if (user.unlocked_provinces?.includes(provinceSlug)) {
      return res.status(400).json({ success: false, message: 'Provinsi sudah terbuka.' });
    }

    const cost = Math.max(1, Number(keyCost) || 1);
    if ((user.keys || 0) < cost) {
      return res.status(400).json({ success: false, message: 'Kunci tidak cukup.' });
    }

    const updatedUnlocked = [...(user.unlocked_provinces || []), provinceSlug];
    const updatedKeys = Math.max(0, (user.keys || 0) - cost);

    const { data: updated, error: updateErr } = await supabase
      .from('user_progress')
      .update({
        keys: updatedKeys,
        unlocked_provinces: updatedUnlocked,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select('*')
      .single();

    if (updateErr) throw updateErr;

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const recordGameScore = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { provinceSlug, gameType, score = 0, passed = true } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Autentikasi diperlukan.' });
    }

    if (!provinceSlug || !gameType) {
      return res.status(400).json({
        success: false,
        message: 'provinceSlug dan gameType wajib diisi.',
      });
    }

    const user = await ensureUserProgressRow(userId);
    const progress = normalizeProgress(user);
    const playedAt = new Date().toISOString();

    const quizStats = bumpQuizStats(progress.quiz_stats, {
      provinceSlug,
      gameType,
      score,
      passed,
      playedAt,
    });

    const completedGames = mergeCompletedGames(
      progress.completed_games,
      passed ? { [provinceSlug]: [gameType] } : {}
    );

    const { data: updated, error: updateErr } = await updateUserProgressRow(user.id, {
      total_score: progress.total_score + (Number(score) || 0),
      games_played: progress.games_played + 1,
      completed_games: completedGames,
      quiz_stats: quizStats,
      updated_at: playedAt,
    });

    if (updateErr) throw updateErr;

    await supabase.from('game_history').insert({
      user_id: userId,
      province_slug: provinceSlug,
      game_type: gameType,
      score: score || 0,
      passed: Boolean(passed),
      played_at: playedAt,
    });

    // Statistik terkini untuk provinsi ini (sumber: quiz_stats yang baru di-update)
    const stat = quizStats[provinceSlug] || normalizeQuizStat({});
    const provinceStats = {
      attempts: stat.attempts,
      high_score: stat.high_score,
      passed: stat.passed,
      last_score: stat.last_score,
    };

    res.json({
      success: true,
      data: {
        ...updated,
        province_stats: provinceStats,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const claimReward = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { provinceSlug, keyReward = 1 } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Autentikasi diperlukan.' });
    }

    if (!provinceSlug) {
      return res.status(400).json({ success: false, message: 'provinceSlug wajib diisi.' });
    }

    const user = await ensureUserProgressRow(userId);

    if (user.claimed_rewards?.includes(provinceSlug)) {
      return res.status(400).json({ success: false, message: 'Hadiah sudah diklaim.' });
    }

    const reward = Math.max(1, Number(keyReward) || 1);
    const updatedClaimed = [...(user.claimed_rewards || []), provinceSlug];
    const updatedKeys = (user.keys || 0) + reward;

    const { data: updated, error: updateErr } = await supabase
      .from('user_progress')
      .update({
        keys: updatedKeys,
        claimed_rewards: updatedClaimed,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select('*')
      .single();

    if (updateErr) throw updateErr;

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getGameHistory = async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: history, error } = await supabase
      .from('game_history')
      .select('*')
      .eq('user_id', userId)
      .order('played_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    res.json({ success: true, data: history || [] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const syncProgress = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Autentikasi diperlukan.' });
    }

    // PENTING: progres akun selalu di-key oleh user_id.
    // Tidak ada lagi pencarian/penempelan baris berdasarkan device_id, karena
    // cara itu membuat progres milik user lain (yang memakai perangkat sama)
    // ikut terbawa / berpindah pemilik.
    //
    // `localProgress` hanya dipertahankan untuk kompatibilitas client lama
    // (data sisa localStorage). Client baru selalu membaca data dari database.
    const { localProgress } = req.body || {};

    let userProg = await ensureUserProgressRow(userId);

    if (localProgress && typeof localProgress === 'object') {
      const merged = mergeProgressData(userProg, localProgress);

      const { data: updated, error } = await updateUserProgressRow(
        userProg.id,
        toUserProgressPayload(merged, { updated_at: new Date().toISOString() })
      );

      if (error) throw error;
      userProg = updated;
    }

    res.json({ success: true, data: userProg });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
