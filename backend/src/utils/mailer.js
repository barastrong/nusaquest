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
  const subject = `Kode Verifikasi Akun NusaQuest: ${otpCode}`;

  // Fallback simulator jika SMTP belum diatur (khusus lokal/dev)
  if (!isSmtpConfigured()) {
    console.log('\n============================================================');
    console.log('[NusaQuest Auth] SIMULASI EMAIL OTP (SMTP Belum Diatur)');
    console.log(`Tujuan  : ${toEmail} (${username})`);
    console.log(`Kode OTP: ${otpCode}`);
    console.log('Masa Berlaku: 10 Menit');
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
        body { margin: 0; padding: 0; background-color: #08120e; font-family: 'Segoe UI', Arial, sans-serif; color: #e5e7eb; }
        .wrapper { max-width: 540px; margin: 30px auto; background-color: #0c1a14; border-radius: 16px; border: 1px solid rgba(201,168,76,0.3); overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
        .header { background: linear-gradient(135deg, #10261e, #1a4a30); padding: 32px 24px; text-align: center; border-bottom: 2px solid #c9a84c; }
        .logo-title { margin: 0; font-size: 26px; font-weight: 800; color: #f7b24f; letter-spacing: 1px; }
        .logo-sub { margin: 6px 0 0 0; font-size: 13px; color: #a7f3d0; text-transform: uppercase; letter-spacing: 2px; }
        .content { padding: 32px 28px; text-align: center; }
        .greeting { font-size: 18px; font-weight: 600; color: #ffffff; margin-bottom: 12px; }
        .instruction { font-size: 14px; line-height: 1.6; color: #9ca3af; margin-bottom: 28px; }
        .otp-container { background: #12241c; border: 2px dashed #c9a84c; border-radius: 12px; padding: 20px; margin: 0 auto 28px auto; max-width: 280px; }
        .otp-code { font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 800; letter-spacing: 10px; color: #f7b24f; margin: 0; }
        .expiry-note { font-size: 13px; color: #fbbf24; margin-top: 10px; font-weight: 500; }
        .warning { font-size: 12px; color: #6b7280; line-height: 1.5; border-top: 1px solid #1a3025; padding-top: 20px; }
        .footer { background-color: #08120e; padding: 16px; text-align: center; font-size: 11px; color: #4b5563; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="header">
          <h1 class="logo-title">NusaQuest</h1>
          <p class="logo-sub">Jelajahi & Belajar Budaya Nusantara</p>
        </div>
        <div class="content">
          <div class="greeting">Halo, ${username}!</div>
          <p class="instruction">
            Terima kasih telah mendaftar di NusaQuest. Masukkan kode verifikasi 6-digit berikut pada jendela pendaftaran untuk mengaktifkan akunmu:
          </p>
          <div class="otp-container">
            <div class="otp-code">${otpCode}</div>
            <div class="expiry-note">Berlaku selama 10 menit</div>
          </div>
          <div class="warning">
            Jangan berikan kode ini kepada siapa pun. Jika kamu tidak merasa mendaftar di NusaQuest, silakan abaikan email ini dengan aman.
          </div>
        </div>
        <div class="footer">
          &copy; 2026 NusaQuest Nusantara. Hak cipta dilindungi undang-undang.
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `Halo ${username},\n\nKode verifikasi akun NusaQuest kamu adalah: ${otpCode}\nKode ini berlaku selama 10 menit.\nJangan berikan kode ini kepada siapa pun.\n\nSalam,\nTim NusaQuest`;

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
