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

    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const unlockProvince = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { deviceId, provinceSlug } = req.body;

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

    if (user.keys < 1) {
      return res.status(400).json({ success: false, message: 'Kunci tidak cukup.' });
    }

    const updatedUnlocked = [...(user.unlocked_provinces || []), provinceSlug];
    const updatedKeys = user.keys - 1;

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

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const claimReward = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { deviceId, provinceSlug } = req.body;

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

    const updatedClaimed = [...(user.claimed_rewards || []), provinceSlug];
    const updatedKeys = user.keys + 1;

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
          keys: localProgress?.keys || 1,
          total_score: localProgress?.total_score || localProgress?.score || 0,
          games_played: localProgress?.games_played || 0,
          unlocked_provinces: localProgress?.unlocked_provinces || localProgress?.unlockedProvinces || [],
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
      const mergedUnlocked = Array.from(
        new Set([
          ...(userProg.unlocked_provinces || []),
          ...(localProgress.unlocked_provinces || localProgress.unlockedProvinces || []),
        ])
      );

      const mergedCompleted = { ...(userProg.completed_games || {}) };
      const localCompleted = localProgress.completed_games || localProgress.completedGames || {};
      for (const [prov, games] of Object.entries(localCompleted)) {
        mergedCompleted[prov] = Array.from(new Set([...(mergedCompleted[prov] || []), ...games]));
      }

      const mergedClaimed = Array.from(
        new Set([
          ...(userProg.claimed_rewards || []),
          ...(localProgress.claimed_rewards || localProgress.claimedRewards || []),
        ])
      );

      const mergedScore = Math.max(userProg.total_score || 0, localProgress.total_score || localProgress.score || 0);
      const mergedKeys = Math.max(userProg.keys || 1, localProgress.keys || 1);
      const mergedGamesPlayed = Math.max(userProg.games_played || 0, localProgress.games_played || 0);

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
