/**
 * In-memory store untuk pendaftaran yang menunggu verifikasi kode OTP
 */

const pendingRegistrations = new Map();

const OTP_TTL_MS = 10 * 60 * 1000; // 10 menit
const RESEND_COOLDOWN_MS = 60 * 1000; // 60 detik
const MAX_ATTEMPTS = 5;

// Bersihkan data kedaluwarsa secara berkala setiap 2 menit
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, value] of pendingRegistrations.entries()) {
    if (value.expiresAt < now) {
      pendingRegistrations.delete(key);
    }
  }
}, 2 * 60 * 1000);

if (cleanupTimer.unref) {
  cleanupTimer.unref();
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

/**
 * Simpan data pendaftaran sementara beserta OTP
 */
export function setPendingRegistration(email, data) {
  const cleanEmail = normalizeEmail(email);
  const now = Date.now();

  pendingRegistrations.set(cleanEmail, {
    otp: String(data.otp).trim(),
    expiresAt: now + OTP_TTL_MS,
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
}

/**
 * Cek apakah user sedang dalam status pending registration
 */
export function getPendingRegistration(email) {
  const cleanEmail = normalizeEmail(email);
  const item = pendingRegistrations.get(cleanEmail);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    pendingRegistrations.delete(cleanEmail);
    return null;
  }
  return item;
}

/**
 * Cek apakah pengiriman ulang OTP diperbolehkan (cooldown 60s)
 */
export function canResendOtp(email) {
  const cleanEmail = normalizeEmail(email);
  const item = pendingRegistrations.get(cleanEmail);
  if (!item) {
    return { allowed: false, message: 'Tidak ada sesi pendaftaran aktif untuk email ini.' };
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
 * Perbarui kode OTP dan refresh masa berlaku
 */
export function updatePendingOtp(email, newOtp) {
  const cleanEmail = normalizeEmail(email);
  const item = pendingRegistrations.get(cleanEmail);
  if (!item) return false;

  const now = Date.now();
  item.otp = String(newOtp).trim();
  item.expiresAt = now + OTP_TTL_MS;
  item.lastSentAt = now;
  item.attempts = 0; // reset attempts for new OTP

  pendingRegistrations.set(cleanEmail, item);
  return true;
}

/**
 * Verifikasi kode OTP
 */
export function verifyRegistrationOtp(email, inputOtp) {
  const cleanEmail = normalizeEmail(email);
  const item = pendingRegistrations.get(cleanEmail);

  if (!item) {
    return {
      success: false,
      message: 'Sesi verifikasi tidak ditemukan atau sudah kedaluwarsa. Silakan daftar kembali.',
    };
  }

  if (Date.now() > item.expiresAt) {
    pendingRegistrations.delete(cleanEmail);
    return {
      success: false,
      message: 'Kode OTP telah kedaluwarsa (lebih dari 10 menit). Silakan minta kode baru.',
    };
  }

  if (item.attempts >= MAX_ATTEMPTS) {
    pendingRegistrations.delete(cleanEmail);
    return {
      success: false,
      message: 'Batas percobaan verifikasi telah terlampaui. Silakan daftar kembali.',
    };
  }

  const cleanInput = String(inputOtp || '').trim();
  if (cleanInput !== item.otp) {
    item.attempts += 1;
    const remaining = MAX_ATTEMPTS - item.attempts;
    return {
      success: false,
      message: remaining > 0
        ? `Kode OTP salah. Sisa kesempatan: ${remaining} kali.`
        : 'Kode OTP salah. Batas kesempatan habis. Silakan daftar kembali.',
    };
  }

  // Jika benar, ambil data dan hapus dari pending
  const userData = { ...item.data };
  pendingRegistrations.delete(cleanEmail);
  return {
    success: true,
    data: userData,
  };
}

/**
 * Hapus pending registration secara manual (misal user ganti email)
 */
export function deletePendingRegistration(email) {
  const cleanEmail = normalizeEmail(email);
  return pendingRegistrations.delete(cleanEmail);
}
