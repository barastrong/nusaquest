import crypto from 'crypto';
import { supabase } from '../config/supabase.js';
import { hashPassword, verifyPassword, createToken } from '../utils/auth.js';
import { sendOtpEmail } from '../utils/mailer.js';
import {
  setPendingRegistration,
  getPendingRegistration,
  canResendOtp,
  updatePendingOtp,
  verifyRegistrationOtp,
} from '../utils/otpStore.js';
import { ensureUserProgressRow, transferGuestProgress } from '../utils/progressMerge.js';

/**
 * Step 1 Registrasi: Validasi data, buat OTP 6 digit, dan kirim ke email
 */
export const requestRegister = async (req, res) => {
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

    // Cek apakah username atau email sudah ada di database
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

    // Cek apakah email sedang dalam cooldown resend
    const resendCheck = await canResendOtp(cleanEmail);
    if (!resendCheck.allowed && resendCheck.remainingSeconds) {
      return res.status(429).json({
        success: false,
        message: resendCheck.message,
        remainingSeconds: resendCheck.remainingSeconds,
      });
    }

    // Generate kode OTP 6-digit numerik acak
    const otpCode = crypto.randomInt(100000, 1000000).toString();
    const passwordHash = hashPassword(password);
    const finalDisplayName = displayName ? String(displayName).trim() : cleanUsername;

    // Simpan ke pending store (Supabase dengan fallback memory)
    await setPendingRegistration(cleanEmail, {
      username: cleanUsername,
      email: cleanEmail,
      passwordHash,
      displayName: finalDisplayName,
      deviceId,
      otp: otpCode,
    });

    // Kirim email OTP via Nodemailer (atau log console jika di dev)
    await sendOtpEmail(cleanEmail, otpCode, finalDisplayName);

    return res.json({
      success: true,
      message: 'Kode OTP verifikasi telah dikirim ke email kamu.',
      email: cleanEmail,
    });
  } catch (error) {
    console.error('Error in requestRegister:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Step 2 Registrasi: Verifikasi kode OTP dan simpan user baru ke database
 */
export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email dan kode OTP wajib diisi.',
      });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanOtp = String(otp).trim();

    // Verifikasi dari pending store (Supabase dengan fallback memory)
    const verifyResult = await verifyRegistrationOtp(cleanEmail, cleanOtp);
    if (!verifyResult.success) {
      return res.status(400).json({
        success: false,
        message: verifyResult.message,
      });
    }

    const { username, passwordHash, displayName, deviceId } = verifyResult.data;

    // Double check agar tidak duplikat di Supabase
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, username, email')
      .or(`username.eq.${username},email.eq.${cleanEmail}`)
      .limit(1);

    if (existingUser && existingUser.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Akun dengan username atau email ini sudah terdaftar.',
      });
    }

    // Simpan user baru ke Supabase
    const { data: newUser, error: insertErr } = await supabase
      .from('users')
      .insert({
        username,
        email: cleanEmail,
        password_hash: passwordHash,
        display_name: displayName,
      })
      .select('id, username, email, display_name, created_at')
      .single();

    if (insertErr) throw insertErr;

    // Pindahkan SELURUH progres Mode Tamu dari perangkat ini ke akun baru.
    // Ini satu-satunya titik transfer: login ke akun lain TIDAK menyentuh data tamu.
    const guestTransfer = await transferGuestProgress(deviceId, newUser.id);

    const token = createToken({
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
    });

    return res.status(201).json({
      success: true,
      message: 'Email berhasil diverifikasi! Akun kamu telah aktif.',
      token,
      user: newUser,
      guestTransfer: {
        transferred: guestTransfer.transferred,
        completedCount: guestTransfer.completedCount,
        bonusKeys: guestTransfer.bonusKeys,
      },
    });
  } catch (error) {
    console.error('Error in verifyOtp:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Kirim ulang kode OTP jika belum kedaluwarsa atau hilang
 */
export const resendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Alamat email wajib diisi.',
      });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const pending = await getPendingRegistration(cleanEmail);

    if (!pending) {
      return res.status(400).json({
        success: false,
        message: 'Sesi pendaftaran tidak ditemukan atau sudah kedaluwarsa. Silakan lakukan pendaftaran ulang.',
      });
    }

    const resendCheck = await canResendOtp(cleanEmail);
    if (!resendCheck.allowed) {
      return res.status(429).json({
        success: false,
        message: resendCheck.message,
        remainingSeconds: resendCheck.remainingSeconds,
      });
    }

    const newOtp = crypto.randomInt(100000, 1000000).toString();
    await updatePendingOtp(cleanEmail, newOtp);

    await sendOtpEmail(cleanEmail, newOtp, pending.data.displayName);

    return res.json({
      success: true,
      message: 'Kode OTP baru telah berhasil dikirim ke email kamu.',
    });
  } catch (error) {
    console.error('Error in resendOtp:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

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

    // Pindahkan SELURUH progres Mode Tamu dari perangkat ini ke akun baru.
    const guestTransfer = await transferGuestProgress(deviceId, newUser.id);

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
      guestTransfer: {
        transferred: guestTransfer.transferred,
        completedCount: guestTransfer.completedCount,
        bonusKeys: guestTransfer.bonusKeys,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { identifier, password } = req.body;

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

    // Pastikan akun punya baris progres sendiri (1 baris per user_id).
    // CATATAN: data Mode Tamu di perangkat ini TIDAK diambil di sini —
    // transfer data tamu hanya terjadi saat REGISTER.
    await ensureUserProgressRow(user.id);

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
