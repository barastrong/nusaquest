import nodemailer from 'nodemailer';

/**
 * Cek apakah kredensial SMTP lengkap di environment
 */
export function isSmtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

/**
 * Buat instance transporter Nodemailer jika terkonfigurasi
 */
function getTransporter() {
  if (!isSmtpConfigured()) return null;

  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

/**
 * Kirim email berisi kode OTP pendaftaran
 * @param {string} toEmail - Alamat email penerima
 * @param {string} otpCode - Kode OTP 6-digit
 * @param {string} [username] - Nama pengguna/display name
 */
export async function sendOtpEmail(toEmail, otpCode, username = 'Petualang') {
  const from = process.env.EMAIL_FROM || '"NusaQuest" <no-reply@nusaquest.web.id>';
  const subject = `${otpCode} adalah kode verifikasi NusaQuest kamu`;

  // Fallback simulator jika SMTP belum diatur (khusus lokal/dev)
  if (!isSmtpConfigured()) {
    console.log('\n============================================================');
    console.log('[NusaQuest Auth] SIMULASI EMAIL OTP');
    console.log(`Tujuan  : ${toEmail}`);
    console.log(`Kode OTP: ${otpCode}`);
    console.log('============================================================\n');
    return { success: true, simulated: true };
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Kode Verifikasi NusaQuest</title>
      <style>
        body { margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #18181b; }
        .wrapper { max-width: 480px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e4e4e7; padding: 36px 32px; box-sizing: border-box; }
        .brand { font-size: 20px; font-weight: 700; color: #09090b; margin-bottom: 24px; letter-spacing: -0.02em; }
        .brand span { color: #d97706; }
        .title { font-size: 16px; font-weight: 600; color: #18181b; margin: 0 0 12px 0; }
        .text { font-size: 14px; line-height: 1.6; color: #52525b; margin: 0 0 24px 0; }
        .otp-box { background-color: #fafafa; border: 1px solid #e4e4e7; border-radius: 8px; padding: 18px; text-align: center; margin: 0 0 24px 0; }
        .otp-code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #09090b; margin: 0; }
        .meta-text { font-size: 13px; color: #71717a; line-height: 1.5; margin: 0 0 8px 0; }
        .footer { border-top: 1px solid #f4f4f5; margin-top: 28px; padding-top: 20px; font-size: 12px; color: #a1a1aa; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="brand">Nusa<span>Quest</span></div>
        <p class="title">Verifikasi email kamu</p>
        <p class="text">
          Gunakan kode di bawah ini untuk memverifikasi pendaftaran akun NusaQuest kamu:
        </p>
        <div class="otp-box">
          <div class="otp-code">${otpCode}</div>
        </div>
        <p class="meta-text">Kode ini berlaku selama 10 menit. Jangan bagikan kode ini kepada siapa pun.</p>
        <p class="meta-text">Jika kamu tidak merasa mendaftar di NusaQuest, abaikan email ini.</p>
        <div class="footer">
          NusaQuest &bull; Platform Pembelajaran Budaya Nusantara
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `Kode verifikasi NusaQuest kamu: ${otpCode}\n\nKode berlaku selama 10 menit. Jangan bagikan kode ini kepada siapa pun.\n\nJika kamu tidak merasa mendaftar, abaikan email ini.`;

  const transporter = getTransporter();
  const info = await transporter.sendMail({
    from,
    to: toEmail,
    subject,
    text: textContent,
    html: htmlContent,
  });

  return { success: true, messageId: info.messageId };
}
