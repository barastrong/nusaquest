import crypto from 'crypto';

const envSecret = process.env.JWT_SECRET;
const JWT_SECRET = envSecret || 'nusaquest_secure_jwt_secret_key_2026';

// Peringatan penting: tanpa JWT_SECRET, backend memakai secret default yang
// tertulis di kode ini (repo publik) sehingga token siapa pun bisa dipalsukan.
if (!envSecret) {
  const advice =
    'Set JWT_SECRET di backend/.env (nilai acak panjang), lalu restart backend. ' +
    'Set sekali dan jangan diubah lagi — mengubahnya membuat semua sesi login lama tidak berlaku.';
  console.warn(
    '[auth] JWT_SECRET belum diset — memakai secret default dari kode' +
      (process.env.NODE_ENV === 'production'
        ? ' (BERBAHAYA di production: token bisa dipalsukan). '
        : '. ') +
      advice
  );
}

function base64UrlEncode(str) {
  return Buffer.from(str).toString('base64url');
}

function base64UrlDecode(str) {
  return Buffer.from(str, 'base64url').toString('utf8');
}

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  try {
    const [salt, originalHash] = stored.split(':');
    if (!salt || !originalHash) return false;
    const testHash = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(testHash), Buffer.from(originalHash));
  } catch {
    return false;
  }
}

export function createToken(payload, expiresInSeconds = 7 * 86400) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const fullPayload = { ...payload, exp };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [header, payload, signature] = parts;
  const expectedSig = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest('base64url');

  if (signature !== expectedSig) return null;

  try {
    const decoded = JSON.parse(base64UrlDecode(payload));
    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}
