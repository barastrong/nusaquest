import { supabase } from '../config/supabase.js';
import { hashPassword, verifyPassword, createToken } from '../utils/auth.js';

export const register = async (req, res) => {
  try {
    const { username, email, password, displayName, deviceId } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username, email, dan password wajib diisi.',
      });
    }

    const cleanUsername = String(username).trim().toLowerCase();
    const cleanEmail = String(email).trim().toLowerCase();

    if (cleanUsername.length < 3 || cleanUsername.length > 30) {
      return res.status(400).json({
        success: false,
        message: 'Username harus memiliki panjang 3-30 karakter.',
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Format email tidak valid.',
      });
    }

    if (String(password).length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password minimal 6 karakter.',
      });
    }

    // Check if username or email already exists
    const { data: existingUser, error: checkErr } = await supabase
      .from('users')
      .select('id, username, email')
      .or(`username.eq.${cleanUsername},email.eq.${cleanEmail}`)
      .limit(1);

    if (checkErr) throw checkErr;

    if (existingUser && existingUser.length > 0) {
      const match = existingUser[0];
      if (match.username === cleanUsername) {
        return res.status(400).json({ success: false, message: 'Username sudah digunakan.' });
      }
      return res.status(400).json({ success: false, message: 'Email sudah terdaftar.' });
    }

    const passwordHash = hashPassword(password);
    const finalDisplayName = displayName ? String(displayName).trim() : cleanUsername;

    const { data: newUser, error: insertErr } = await supabase
      .from('users')
      .insert({
        username: cleanUsername,
        email: cleanEmail,
        password_hash: passwordHash,
        display_name: finalDisplayName,
      })
      .select('id, username, email, display_name, created_at')
      .single();

    if (insertErr) throw insertErr;

    // Link or create user_progress
    if (deviceId) {
      const { data: existingProgress } = await supabase
        .from('user_progress')
        .select('id, user_id')
        .eq('device_id', deviceId)
        .maybeSingle();

      if (existingProgress && !existingProgress.user_id) {
        await supabase
          .from('user_progress')
          .update({ user_id: newUser.id, updated_at: new Date().toISOString() })
          .eq('id', existingProgress.id);
      } else {
        await supabase.from('user_progress').insert({
          user_id: newUser.id,
          device_id: deviceId,
          keys: 1,
          total_score: 0,
          games_played: 0,
          unlocked_provinces: [],
          completed_games: {},
          claimed_rewards: [],
        });
      }
    } else {
      await supabase.from('user_progress').insert({
        user_id: newUser.id,
        device_id: `user_${newUser.id}`,
        keys: 1,
        total_score: 0,
        games_played: 0,
        unlocked_provinces: [],
        completed_games: {},
        claimed_rewards: [],
      });
    }

    const token = createToken({
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
    });

    res.status(201).json({
      success: true,
      message: 'Registrasi berhasil.',
      token,
      user: newUser,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { identifier, password, deviceId } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username/email dan password wajib diisi.',
      });
    }

    const cleanIdentifier = String(identifier).trim().toLowerCase();

    // Find user by username or email
    const { data: users, error: findErr } = await supabase
      .from('users')
      .select('id, username, email, password_hash, display_name, created_at')
      .or(`username.eq.${cleanIdentifier},email.eq.${cleanIdentifier}`)
      .limit(1);

    if (findErr) throw findErr;

    if (!users || users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Username atau password salah.',
      });
    }

    const user = users[0];
    const isMatch = verifyPassword(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Username atau password salah.',
      });
    }

    // If deviceId provided and user has no progress linked, link it
    if (deviceId) {
      const { data: userProg } = await supabase
        .from('user_progress')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!userProg) {
        const { data: devProg } = await supabase
          .from('user_progress')
          .select('id, user_id')
          .eq('device_id', deviceId)
          .maybeSingle();

        if (devProg && !devProg.user_id) {
          await supabase
            .from('user_progress')
            .update({ user_id: user.id, updated_at: new Date().toISOString() })
            .eq('id', devProg.id);
        } else if (!devProg) {
          await supabase.from('user_progress').insert({
            user_id: user.id,
            device_id: deviceId,
            keys: 1,
            total_score: 0,
            games_played: 0,
            unlocked_provinces: [],
            completed_games: {},
            claimed_rewards: [],
          });
        }
      }
    }

    const token = createToken({
      id: user.id,
      username: user.username,
      email: user.email,
    });

    const sanitizedUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      display_name: user.display_name,
      created_at: user.created_at,
    };

    res.json({
      success: true,
      message: 'Login berhasil.',
      token,
      user: sanitizedUser,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMe = async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, email, display_name, created_at')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan.' });
    }

    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const verifyAdminKey = async (req, res) => {
  try {
    const { key } = req.body;
    const adminKey = process.env.ADMIN_SECRET_KEY || 'nusaquest2026';

    if (!key || key !== adminKey) {
      return res.status(401).json({ success: false, message: 'Kode akses admin tidak valid' });
    }

    res.json({ success: true, message: 'Akses disetujui' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
