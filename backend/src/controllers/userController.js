import { supabase } from '../config/supabase.js';

export const getUserProgress = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { deviceId } = req.params;

    if (!userId && !deviceId) {
      return res.status(400).json({ success: false, message: 'Autentikasi atau deviceId diperlukan.' });
    }

    let query = supabase.from('user_progress').select('*');
    if (userId) {
      query = query.eq('user_id', userId);
    } else {
      query = query.eq('device_id', deviceId);
    }

    let { data: user, error } = await query.maybeSingle();
    if (error) throw error;

    if (!user) {
      const defaultData = {
        user_id: userId || null,
        device_id: deviceId || (userId ? `user_${userId}` : `guest_${Date.now()}`),
        keys: userId ? 1 : 0,
        total_score: 0,
        games_played: 0,
        unlocked_provinces: [],
        completed_games: {},
        claimed_rewards: [],
      };

      const { data: created, error: createErr } = await supabase
        .from('user_progress')
        .insert(defaultData)
        .select('*')
        .single();

      if (createErr) throw createErr;
      user = created;
    }

    // Hitung statistik kuis & attempt per provinsi dari game_history jika ada
    const quizStats = {};
    if (userId) {
      const { data: history } = await supabase
        .from('game_history')
        .select('province_slug, game_type, score, passed, played_at')
        .eq('user_id', userId)
        .order('played_at', { ascending: false });

      if (history && history.length > 0) {
        for (const item of history) {
          const p = item.province_slug;
          if (!quizStats[p]) {
            quizStats[p] = {
              attempts: 0,
              high_score: 0,
              passed: false,
              last_score: item.score || 0,
              last_played_at: item.played_at,
              quiz_attempts: 0,
              quiz_high_score: 0,
              puzzle_attempts: 0,
              puzzle_high_score: 0,
            };
          }
          quizStats[p].attempts += 1;
          quizStats[p].high_score = Math.max(quizStats[p].high_score, item.score || 0);
          if (item.passed) quizStats[p].passed = true;

          if (item.game_type === 'quiz') {
            quizStats[p].quiz_attempts += 1;
            quizStats[p].quiz_high_score = Math.max(quizStats[p].quiz_high_score, item.score || 0);
          } else if (item.game_type === 'puzzle') {
            quizStats[p].puzzle_attempts += 1;
            quizStats[p].puzzle_high_score = Math.max(quizStats[p].puzzle_high_score, item.score || 0);
          }
        }
      }
    }

    // Gabungkan dengan completed_games jika ada provinsi yang berstatus selesai
    if (user.completed_games && typeof user.completed_games === 'object') {
      for (const [p, games] of Object.entries(user.completed_games)) {
        if (!quizStats[p]) {
          quizStats[p] = {
            attempts: 1,
            high_score: 0,
            passed: true,
            last_score: 0,
            last_played_at: null,
            quiz_attempts: (games || []).includes('quiz') ? 1 : 0,
            quiz_high_score: 0,
            puzzle_attempts: (games || []).includes('puzzle') ? 1 : 0,
            puzzle_high_score: 0,
          };
        } else {
          quizStats[p].passed = true;
          quizStats[p].attempts = Math.max(quizStats[p].attempts, 1);
        }
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
    const { deviceId, provinceSlug, keyCost = 1 } = req.body;

    if (!provinceSlug || (!userId && !deviceId)) {
      return res.status(400).json({ success: false, message: 'provinceSlug dan user/deviceId wajib diisi.' });
    }

    let query = supabase.from('user_progress').select('*');
    if (userId) {
      query = query.eq('user_id', userId);
    } else {
      query = query.eq('device_id', deviceId);
    }

    const { data: user, error: userErr } = await query.maybeSingle();

    if (userErr || !user) {
      return res.status(404).json({ success: false, message: 'User progress tidak ditemukan.' });
    }

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
    const { deviceId, provinceSlug, gameType, score = 0, passed = true } = req.body;

    if (!provinceSlug || !gameType || (!userId && !deviceId)) {
      return res.status(400).json({
        success: false,
        message: 'provinceSlug, gameType, dan user/deviceId wajib diisi.',
      });
    }

    let query = supabase.from('user_progress').select('*');
    if (userId) {
      query = query.eq('user_id', userId);
    } else {
      query = query.eq('device_id', deviceId);
    }

    let { data: user, error: userErr } = await query.maybeSingle();

    if (!user) {
      // create progress record if none exists yet
      const { data: created, error: createErr } = await supabase
        .from('user_progress')
        .insert({
          user_id: userId || null,
          device_id: deviceId || (userId ? `user_${userId}` : `guest_${Date.now()}`),
          keys: userId ? 1 : 0,
          total_score: 0,
          games_played: 0,
          unlocked_provinces: [],
          completed_games: {},
          claimed_rewards: [],
        })
        .select('*')
        .single();

      if (createErr) throw createErr;
      user = created;
    }

    const completed = { ...(user.completed_games || {}) };
    const currentProvGames = new Set(completed[provinceSlug] || []);
    if (passed) {
      currentProvGames.add(gameType);
    }
    completed[provinceSlug] = Array.from(currentProvGames);

    const newScore = (user.total_score || 0) + (score || 0);
    const newGamesPlayed = (user.games_played || 0) + 1;

    const { data: updated, error: updateErr } = await supabase
      .from('user_progress')
      .update({
        total_score: newScore,
        games_played: newGamesPlayed,
        completed_games: completed,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select('*')
      .single();

    if (updateErr) throw updateErr;

    // Record into game_history if authenticated
    if (userId) {
      await supabase.from('game_history').insert({
        user_id: userId,
        province_slug: provinceSlug,
        game_type: gameType,
        score: score || 0,
        passed: Boolean(passed),
        played_at: new Date().toISOString(),
      });
    }

    // Ambil statistik terkini untuk provinsi ini
    let provinceStats = {
      attempts: 1,
      high_score: score || 0,
      passed: Boolean(passed),
      last_score: score || 0,
    };

    if (userId) {
      const { data: hist } = await supabase
        .from('game_history')
        .select('score, passed')
        .eq('user_id', userId)
        .eq('province_slug', provinceSlug);

      if (hist && hist.length > 0) {
        provinceStats.attempts = hist.length;
        provinceStats.high_score = Math.max(...hist.map((h) => h.score || 0));
        provinceStats.passed = hist.some((h) => h.passed);
      }
    }

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
    const { deviceId, provinceSlug, keyReward = 1 } = req.body;

    if (!provinceSlug || (!userId && !deviceId)) {
      return res.status(400).json({ success: false, message: 'provinceSlug dan user/deviceId wajib diisi.' });
    }

    let query = supabase.from('user_progress').select('*');
    if (userId) {
      query = query.eq('user_id', userId);
    } else {
      query = query.eq('device_id', deviceId);
    }

    const { data: user, error: userErr } = await query.maybeSingle();

    if (userErr || !user) {
      return res.status(404).json({ success: false, message: 'User tidak ditemukan.' });
    }

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
    const userId = req.user.id;
    const { deviceId, localProgress } = req.body;

    // Get current user progress
    let { data: userProg } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (!userProg) {
      // Find guest progress by deviceId
      if (deviceId) {
        const { data: devProg } = await supabase
          .from('user_progress')
          .select('*')
          .eq('device_id', deviceId)
          .maybeSingle();

        if (devProg) {
          const { data: linkedProg, error: linkErr } = await supabase
            .from('user_progress')
            .update({ user_id: userId, updated_at: new Date().toISOString() })
            .eq('id', devProg.id)
            .select('*')
            .single();

          if (!linkErr) return res.json({ success: true, data: linkedProg });
        }
      }

      // Create new with localProgress
      const { data: created, error: createErr } = await supabase
        .from('user_progress')
        .insert({
          user_id: userId,
          device_id: deviceId || `user_${userId}`,
          keys: Math.max(localProgress?.keys || 0, 1),
          total_score: localProgress?.total_score || localProgress?.totalScore || localProgress?.score || 0,
          games_played: localProgress?.games_played || localProgress?.gamesPlayed || 0,
          unlocked_provinces: localProgress?.unlocked_provinces || localProgress?.unlockedRegions || localProgress?.unlockedProvinces || [],
          completed_games: localProgress?.completed_games || localProgress?.completedGames || {},
          claimed_rewards: localProgress?.claimed_rewards || localProgress?.claimedRewards || [],
        })
        .select('*')
        .single();

      if (createErr) throw createErr;
      return res.json({ success: true, data: created });
    }

    // If both exist, merge them
    if (localProgress) {
      const localUnlocked = localProgress.unlocked_provinces || localProgress.unlockedRegions || localProgress.unlockedProvinces || [];
      const mergedUnlocked = Array.from(
        new Set([
          ...(userProg.unlocked_provinces || []),
          ...localUnlocked,
        ])
      );

      const mergedCompleted = { ...(userProg.completed_games || {}) };
      const localCompleted = localProgress.completed_games || localProgress.completedGames || {};
      for (const [prov, games] of Object.entries(localCompleted)) {
        mergedCompleted[prov] = Array.from(new Set([...(mergedCompleted[prov] || []), ...games]));
      }

      const localClaimed = localProgress.claimed_rewards || localProgress.claimedRewards || [];
      const mergedClaimed = Array.from(
        new Set([
          ...(userProg.claimed_rewards || []),
          ...localClaimed,
        ])
      );

      const localScore = localProgress.total_score || localProgress.totalScore || localProgress.score || 0;
      const mergedScore = Math.max(userProg.total_score || 0, localScore);

      const localKeys = localProgress.keys !== undefined ? Number(localProgress.keys) : 0;
      const mergedKeys = Math.max(userProg.keys ?? 1, localKeys);

      const localGames = localProgress.games_played || localProgress.gamesPlayed || 0;
      const mergedGamesPlayed = Math.max(userProg.games_played || 0, localGames);

      const { data: updated, error: updateErr } = await supabase
        .from('user_progress')
        .update({
          keys: mergedKeys,
          total_score: mergedScore,
          games_played: mergedGamesPlayed,
          unlocked_provinces: mergedUnlocked,
          completed_games: mergedCompleted,
          claimed_rewards: mergedClaimed,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userProg.id)
        .select('*')
        .single();

      if (updateErr) throw updateErr;
      return res.json({ success: true, data: updated });
    }

    res.json({ success: true, data: userProg });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
