import { supabase } from '../config/supabase.js';

/**
 * Store data pendaftaran yang menunggu verifikasi kode OTP.
 * Menyimpan secara persisten ke tabel Supabase `email_verifications`,
 * dengan in-memory cache sebagai fallback otomatis jika tabel belum dibuat.
 */

const pendingRegistrations = new Map();

const OTP_TTL_MS = 10 * 60 * 1000; // 10 menit
const RESEND_COOLDOWN_MS = 60 * 1000; // 60 detik
const MAX_ATTEMPTS = 5;

// Pembersihan data kedaluwarsa secara berkala (memory + Supabase)
const cleanupTimer = setInterval(async () => {
  const now = Date.now();
  for (const [key, value] of pendingRegistrations.entries()) {
    if (value.expiresAt < now) {
      pendingRegistrations.delete(key);
    }
  }

  try {
    await supabase
      .from('email_verifications')
      .delete()
      .lt('expires_at', new Date(now).toISOString());
  } catch (_) {
    // Ignored jika tabel belum ada
  }
}, 5 * 60 * 1000);

if (cleanupTimer.unref) {
  cleanupTimer.unref();
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

/**
 * Simpan data pendaftaran sementara beserta OTP ke Supabase dan memory cache
 */
export async function setPendingRegistration(email, data) {
  const cleanEmail = normalizeEmail(email);
  const now = Date.now();
  const expiresAtMs = now + OTP_TTL_MS;
  const expiresAtIso = new Date(expiresAtMs).toISOString();
  const lastSentAtIso = new Date(now).toISOString();

  // 1. Simpan di local memory cache
  pendingRegistrations.set(cleanEmail, {
    otp: String(data.otp).trim(),
    expiresAt: expiresAtMs,
    lastSentAt: now,
    attempts: 0,
    data: {
      username: data.username,
      email: cleanEmail,
      passwordHash: data.passwordHash,
      displayName: data.displayName,
      deviceId: data.deviceId,
    },
  });

  // 2. Simpan persisten ke Supabase
  try {
    const { error } = await supabase
      .from('email_verifications')
      .upsert(
        {
          email: cleanEmail,
          username: data.username,
          display_name: data.displayName || data.username,
          password_hash: data.passwordHash,
          device_id: data.deviceId || null,
          otp: String(data.otp).trim(),
          attempts: 0,
          last_sent_at: lastSentAtIso,
          expires_at: expiresAtIso,
        },
        { onConflict: 'email' }
      );

    if (error) {
      console.warn('[OTP Store] Supabase upsert notice:', error.message);
    }
  } catch (err) {
    console.warn('[OTP Store] Supabase error, using memory fallback:', err.message);
  }
}

/**
 * Ambil data pending registration dari Supabase atau memory
 */
export async function getPendingRegistration(email) {
  const cleanEmail = normalizeEmail(email);

  // Coba ambil dari Supabase
  try {
    const { data, error } = await supabase
      .from('email_verifications')
      .select('*')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (!error && data) {
      const expiresAtMs = new Date(data.expires_at).getTime();
      if (Date.now() > expiresAtMs) {
        await deletePendingRegistration(cleanEmail);
        return null;
      }

      return {
        otp: data.otp,
        expiresAt: expiresAtMs,
        lastSentAt: new Date(data.last_sent_at).getTime(),
        attempts: data.attempts || 0,
        data: {
          username: data.username,
          email: cleanEmail,
          passwordHash: data.password_hash,
          displayName: data.display_name,
          deviceId: data.device_id,
        },
      };
    }
  } catch (_) {
    // Fallback ke memory
  }

  // Memory fallback
  const item = pendingRegistrations.get(cleanEmail);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    pendingRegistrations.delete(cleanEmail);
    return null;
  }
  return item;
}

/**
 * Cek apakah pengiriman ulang OTP diperbolehkan (cooldown 60 detik)
 */
export async function canResendOtp(email) {
  const cleanEmail = normalizeEmail(email);
  const item = await getPendingRegistration(cleanEmail);

  if (!item) {
    return { allowed: true };
  }

  const elapsed = Date.now() - item.lastSentAt;
  if (elapsed < RESEND_COOLDOWN_MS) {
    const remainingSeconds = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
    return {
      allowed: false,
      remainingSeconds,
      message: `Mohon tunggu ${remainingSeconds} detik sebelum meminta kode baru.`,
    };
  }

  return { allowed: true };
}

/**
 * Perbarui kode OTP dan reset timer kedaluwarsa
 */
export async function updatePendingOtp(email, newOtp) {
  const cleanEmail = normalizeEmail(email);
  const now = Date.now();
  const cleanNewOtp = String(newOtp).trim();
  const expiresAtMs = now + OTP_TTL_MS;
  const expiresAtIso = new Date(expiresAtMs).toISOString();
  const lastSentAtIso = new Date(now).toISOString();

  // Update memory
  const memItem = pendingRegistrations.get(cleanEmail);
  if (memItem) {
    memItem.otp = cleanNewOtp;
    memItem.expiresAt = expiresAtMs;
    memItem.lastSentAt = now;
    memItem.attempts = 0;
    pendingRegistrations.set(cleanEmail, memItem);
  }

  // Update Supabase
  try {
    const { error } = await supabase
      .from('email_verifications')
      .update({
        otp: cleanNewOtp,
        expires_at: expiresAtIso,
        last_sent_at: lastSentAtIso,
        attempts: 0,
      })
      .eq('email', cleanEmail);

    if (!error) return true;
  } catch (err) {
    console.warn('[OTP Store] Failed to update OTP in Supabase:', err.message);
  }

  return Boolean(memItem);
}

/**
 * Verifikasi kode OTP dengan pembatasan percobaan maks 5 kali
 */
export async function verifyRegistrationOtp(email, inputOtp) {
  const cleanEmail = normalizeEmail(email);
  const item = await getPendingRegistration(cleanEmail);

  if (!item) {
    return {
      success: false,
      message: 'Sesi verifikasi tidak ditemukan atau sudah kedaluwarsa. Silakan daftar kembali.',
    };
  }

  if (Date.now() > item.expiresAt) {
    await deletePendingRegistration(cleanEmail);
    return {
      success: false,
      message: 'Kode OTP telah kedaluwarsa (lebih dari 10 menit). Silakan minta kode baru.',
    };
  }

  if (item.attempts >= MAX_ATTEMPTS) {
    await deletePendingRegistration(cleanEmail);
    return {
      success: false,
      message: 'Batas percobaan verifikasi telah terlampaui. Silakan daftar kembali.',
    };
  }

  const cleanInput = String(inputOtp || '').trim();
  if (cleanInput !== item.otp) {
    const newAttempts = item.attempts + 1;

    try {
      await supabase
        .from('email_verifications')
        .update({ attempts: newAttempts })
        .eq('email', cleanEmail);
    } catch (_) {}

    const memItem = pendingRegistrations.get(cleanEmail);
    if (memItem) {
      memItem.attempts = newAttempts;
    }

    const remaining = MAX_ATTEMPTS - newAttempts;
    return {
      success: false,
      message:
        remaining > 0
          ? `Kode OTP salah. Sisa kesempatan: ${remaining} kali.`
          : 'Kode OTP salah. Batas kesempatan habis. Silakan daftar kembali.',
    };
  }

  // Jika benar, ambil data registrasi dan bersihkan record sesi
  const userData = { ...item.data };
  await deletePendingRegistration(cleanEmail);

  return {
    success: true,
    data: userData,
  };
}

/**
 * Hapus pending registration dari Supabase dan memory
 */
export async function deletePendingRegistration(email) {
  const cleanEmail = normalizeEmail(email);
  pendingRegistrations.delete(cleanEmail);

  try {
    await supabase.from('email_verifications').delete().eq('email', cleanEmail);
    return true;
  } catch (_) {
    return false;
  }
}
