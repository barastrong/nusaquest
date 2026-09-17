import { supabase } from '../config/supabase.js';

export const getUserProgress = async (req, res) => {
  try {
    const { deviceId } = req.params;

    if (!deviceId) {
      return res.status(400).json({ success: false, message: 'deviceId is required' });
    }

    let { data: user, error } = await supabase
      .from('user_progress')
      .select('*')
      .eq('device_id', deviceId)
      .maybeSingle();

    if (error) throw error;

    if (!user) {
      const defaultData = {
        device_id: deviceId,
        keys: 1,
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
    const { deviceId, provinceSlug } = req.body;

    if (!deviceId || !provinceSlug) {
      return res.status(400).json({ success: false, message: 'deviceId and provinceSlug are required' });
    }

    const { data: user, error: userErr } = await supabase
      .from('user_progress')
      .select('*')
      .eq('device_id', deviceId)
      .single();

    if (userErr || !user) {
      return res.status(404).json({ success: false, message: 'User progress not found' });
    }

    if (user.unlocked_provinces?.includes(provinceSlug)) {
      return res.status(400).json({ success: false, message: 'Province already unlocked' });
    }

    if (user.keys < 1) {
      return res.status(400).json({ success: false, message: 'Insufficient keys' });
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
      .eq('device_id', deviceId)
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
    const { deviceId, provinceSlug, gameType, score } = req.body;

    if (!deviceId || !provinceSlug || !gameType) {
      return res.status(400).json({ success: false, message: 'deviceId, provinceSlug, and gameType are required' });
    }

    const { data: user, error: userErr } = await supabase
      .from('user_progress')
      .select('*')
      .eq('device_id', deviceId)
      .single();

    if (userErr || !user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const completed = { ...(user.completed_games || {}) };
    const currentProvGames = new Set(completed[provinceSlug] || []);
    currentProvGames.add(gameType);
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
      .eq('device_id', deviceId)
      .select('*')
      .single();

    if (updateErr) throw updateErr;

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const claimReward = async (req, res) => {
  try {
    const { deviceId, provinceSlug } = req.body;

    if (!deviceId || !provinceSlug) {
      return res.status(400).json({ success: false, message: 'deviceId and provinceSlug are required' });
    }

    const { data: user, error: userErr } = await supabase
      .from('user_progress')
      .select('*')
      .eq('device_id', deviceId)
      .single();

    if (userErr || !user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.claimed_rewards?.includes(provinceSlug)) {
      return res.status(400).json({ success: false, message: 'Reward already claimed' });
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
      .eq('device_id', deviceId)
      .select('*')
      .single();

    if (updateErr) throw updateErr;

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
