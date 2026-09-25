import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import '../styles/authModal.css';

export default function AuthModal() {
  const {
    isAuthModalOpen,
    closeAuthModal,
    authModalTab,
    setAuthModalTab,
    login,
    requestRegister,
    verifyRegistrationOtp,
    resendRegistrationOtp,
  } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPasswordConfirm, setRegPasswordConfirm] = useState('');

  // OTP flow states
  const [regStep, setRegStep] = useState('form'); // 'form' | 'otp'
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const otpInputRefs = useRef([]);

  // Countdown timer effect
  useEffect(() => {
    let timer;
    if (resendCountdown > 0) {
      timer = setInterval(() => {
        setResendCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [resendCountdown]);

  // Focus first OTP input when step changes to 'otp'
  useEffect(() => {
    if (regStep === 'otp' && isAuthModalOpen) {
      const timer = setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [regStep, isAuthModalOpen]);

  if (!isAuthModalOpen) return null;

  const resetForm = () => {
    setError('');
    setSuccessMsg('');
    setIdentifier('');
    setPassword('');
    setRegUsername('');
    setRegEmail('');
    setRegPassword('');
    setRegPasswordConfirm('');
    setRegStep('form');
    setOtpDigits(['', '', '', '', '', '']);
    setResendCountdown(0);
  };

  const handleClose = () => {
    resetForm();
    closeAuthModal();
  };

  const handleTabSwitch = (tab) => {
    setError('');
    setSuccessMsg('');
    setAuthModalTab(tab);
    if (tab === 'register') {
      setRegStep('form');
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);
    try {
      await login(identifier, password);
      resetForm();
    } catch (err) {
      setError(err.message || 'Gagal masuk. Periksa username dan password.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterFormSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    if (regPassword !== regPasswordConfirm) {
      setError('Password tidak cocok. Silakan coba lagi.');
      return;
    }
    setLoading(true);
    try {
      const res = await requestRegister({
        username: regUsername,
        email: regEmail,
        displayName: regUsername,
        password: regPassword,
      });
      setRegStep('otp');
      setResendCountdown(60);
      setSuccessMsg(res?.message || 'Kode verifikasi telah dikirim ke email kamu.');
      setOtpDigits(['', '', '', '', '', '']);
    } catch (err) {
      setError(err.message || 'Gagal mengirim kode verifikasi. Periksa kembali data kamu.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    const cleanVal = value.replace(/\D/g, '');

    // Jika yang masuk lebih dari 1 digit (misal paste via keyboard bar/autofill/klik kanan)
    if (cleanVal.length > 1) {
      const pastedDigits = cleanVal.slice(0, 6);
      const newDigits = ['', '', '', '', '', ''];
      for (let i = 0; i < pastedDigits.length; i++) {
        newDigits[i] = pastedDigits[i];
      }
      setOtpDigits(newDigits);
      setError('');
      const nextIdx = Math.min(pastedDigits.length, 5);
      otpInputRefs.current[nextIdx]?.focus();
      return;
    }

    if (!cleanVal && value !== '') {
      const newDigits = [...otpDigits];
      newDigits[index] = '';
      setOtpDigits(newDigits);
      return;
    }

    const newDigits = [...otpDigits];
    newDigits[index] = cleanVal;
    setOtpDigits(newDigits);
    setError('');

    if (cleanVal && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!otpDigits[index] && index > 0) {
        const newDigits = [...otpDigits];
        newDigits[index - 1] = '';
        setOtpDigits(newDigits);
        otpInputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const pastedData = (e.clipboardData?.getData('text') || '').replace(/\D/g, '').slice(0, 6);
    if (!pastedData) return;

    const newDigits = ['', '', '', '', '', ''];
    for (let i = 0; i < pastedData.length; i++) {
      newDigits[i] = pastedData[i];
    }
    setOtpDigits(newDigits);
    setError('');

    const nextIdx = Math.min(pastedData.length, 5);
    otpInputRefs.current[nextIdx]?.focus();
  };

  const handleVerifyOtpSubmit = async (e) => {
    e.preventDefault();
    const fullOtp = otpDigits.join('');
    if (fullOtp.length !== 6) {
      setError('Masukkan 6 digit kode OTP secara lengkap.');
      return;
    }

    setError('');
    setSuccessMsg('');
    setLoading(true);
    try {
      await verifyRegistrationOtp({
        email: regEmail,
        otp: fullOtp,
      });
      resetForm();
    } catch (err) {
      setError(err.message || 'Kode verifikasi tidak cocok atau telah kedaluwarsa.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCountdown > 0 || resendLoading) return;
    setError('');
    setSuccessMsg('');
    setResendLoading(true);
    try {
      const res = await resendRegistrationOtp(regEmail);
      setResendCountdown(60);
      setSuccessMsg(res?.message || 'Kode verifikasi baru berhasil dikirim!');
      setOtpDigits(['', '', '', '', '', '']);
      otpInputRefs.current[0]?.focus();
    } catch (err) {
      setError(err.message || 'Gagal mengirim ulang kode OTP.');
    } finally {
      setResendLoading(false);
    }
  };

  const handleChangeEmail = () => {
    setRegStep('form');
    setError('');
    setSuccessMsg('');
  };

  return (
    <div className="auth-modal-overlay" onClick={handleClose}>
      <div className="auth-modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="auth-modal-close" onClick={handleClose} aria-label="Tutup">
          ✕
        </button>

        <div className="auth-modal-header">
          <div className="auth-brand">
            Nusa<span>Quest</span>
          </div>
          <p className="auth-sub">
            {authModalTab === 'login'
              ? 'Masuk untuk menyimpan riwayat dan skor petualanganmu'
              : regStep === 'otp'
              ? 'Langkah terakhir: Verifikasi keaktifan email kamu'
              : 'Daftar akun penjelajah budaya Nusantara'}
          </p>
        </div>

        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab-btn ${authModalTab === 'login' ? 'active' : ''}`}
            onClick={() => handleTabSwitch('login')}
          >
            Masuk
          </button>
          <button
            type="button"
            className={`auth-tab-btn ${authModalTab === 'register' ? 'active' : ''}`}
            onClick={() => handleTabSwitch('register')}
          >
            Daftar
          </button>
        </div>

        {error && <div className="auth-error-banner">{error}</div>}
        {successMsg && !error && <div className="otp-desc-box">{successMsg}</div>}

        {authModalTab === 'login' ? (
          <form className="auth-form" onSubmit={handleLoginSubmit}>
            <div className="auth-field">
              <label htmlFor="login-identifier">Username atau Email</label>
              <input
                id="login-identifier"
                type="text"
                required
                placeholder="Masukkan username atau email"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                autoComplete="username"
              />
            </div>

            <div className="auth-field">
              <label htmlFor="login-password">Password</label>
              <input
                id="login-password"
                type="password"
                required
                placeholder="Masukkan password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? 'Memproses...' : 'Masuk Sekarang'}
            </button>

            <p className="auth-switch-text">
              Belum punya akun?{' '}
              <span onClick={() => handleTabSwitch('register')}>Daftar di sini</span>
            </p>
          </form>
        ) : regStep === 'form' ? (
          <form className="auth-form" onSubmit={handleRegisterFormSubmit}>
            <div className="auth-field">
              <label htmlFor="reg-username">Username</label>
              <input
                id="reg-username"
                type="text"
                required
                minLength={3}
                maxLength={30}
                placeholder="contoh: penjelajah01"
                value={regUsername}
                onChange={(e) => setRegUsername(e.target.value)}
                autoComplete="username"
              />
            </div>

            <div className="auth-field">
              <label htmlFor="reg-email">Email Aktif</label>
              <input
                id="reg-email"
                type="email"
                required
                placeholder="contoh: nama@email.com"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <div className="auth-field">
              <label htmlFor="reg-password">Password</label>
              <input
                id="reg-password"
                type="password"
                required
                minLength={6}
                placeholder="Minimal 6 karakter"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>

            <div className="auth-field">
              <label htmlFor="reg-password-confirm">Konfirmasi Password</label>
              <input
                id="reg-password-confirm"
                type="password"
                required
                minLength={6}
                placeholder="Ulangi password"
                value={regPasswordConfirm}
                onChange={(e) => setRegPasswordConfirm(e.target.value)}
                autoComplete="new-password"
              />
              {regPasswordConfirm && regPassword !== regPasswordConfirm && (
                <span className="auth-field-hint">Password tidak cocok</span>
              )}
            </div>

            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? 'Mengirim Kode OTP...' : 'Lanjut Verifikasi Email'}
            </button>

            <p className="auth-switch-text">
              Sudah punya akun?{' '}
              <span onClick={() => handleTabSwitch('login')}>Masuk di sini</span>
            </p>
          </form>
        ) : (
          <form className="auth-form" onSubmit={handleVerifyOtpSubmit}>
            <div className="otp-desc-box">
              Masukkan 6 digit kode rahasia yang telah dikirim ke{' '}
              <span className="otp-target-email">{regEmail}</span>
            </div>

            <div className="otp-inputs-wrapper" onPaste={handleOtpPaste}>
              {otpDigits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => (otpInputRefs.current[idx] = el)}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  className={`otp-digit-input ${digit ? 'filled' : ''}`}
                  value={digit}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                  onPaste={handleOtpPaste}
                  onFocus={(e) => e.target.select()}
                  autoComplete="one-time-code"
                />
              ))}
            </div>

            <button
              type="submit"
              className="auth-submit-btn"
              disabled={loading || otpDigits.join('').length !== 6}
            >
              {loading ? 'Memverifikasi...' : 'Verifikasi & Mulai Petualangan'}
            </button>

            <div className="otp-resend-row">
              {resendCountdown > 0 ? (
                <span className="otp-timer-text">
                  Kirim ulang kode dalam{' '}
                  <span className="otp-timer-highlight">{resendCountdown}s</span>
                </span>
              ) : (
                <button
                  type="button"
                  className="otp-resend-btn"
                  onClick={handleResendOtp}
                  disabled={resendLoading}
                >
                  {resendLoading ? 'Mengirim ulang...' : 'Kirim Ulang Kode OTP'}
                </button>
              )}

              <button
                type="button"
                className="otp-change-email-btn"
                onClick={handleChangeEmail}
              >
                Salah ketik email? <span>Ganti Email</span>
              </button>

              <p className="otp-info-note">
                Tips: Jika email belum masuk dalam 1 menit, periksa folder Spam atau Junk.
              </p>
            </div>
          </form>
        )}

        <div className="auth-guest-section">
          <div className="auth-divider">
            <span>atau</span>
          </div>
          <button
            type="button"
            className="auth-guest-btn"
            onClick={handleClose}
          >
            Lanjut Jelajah sebagai Tamu (Maks. 5 Provinsi)
          </button>
        </div>
      </div>
    </div>
  );
}
