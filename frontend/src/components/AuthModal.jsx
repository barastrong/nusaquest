import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import '../styles/authModal.css';

export default function AuthModal() {
  const {
    isAuthModalOpen,
    closeAuthModal,
    authModalTab,
    setAuthModalTab,
    login,
    register,
  } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regDisplayName, setRegDisplayName] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isAuthModalOpen) return null;

  const resetForm = () => {
    setError('');
    setIdentifier('');
    setPassword('');
    setRegUsername('');
    setRegEmail('');
    setRegDisplayName('');
    setRegPassword('');
  };

  const handleTabSwitch = (tab) => {
    setError('');
    setAuthModalTab(tab);
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
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

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register({
        username: regUsername,
        email: regEmail,
        displayName: regDisplayName,
        password: regPassword,
      });
      resetForm();
    } catch (err) {
      setError(err.message || 'Gagal mendaftar. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-modal-overlay" onClick={closeAuthModal}>
      <div className="auth-modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="auth-modal-close" onClick={closeAuthModal} aria-label="Tutup">
          ✕
        </button>

        <div className="auth-modal-header">
          <div className="auth-brand">
            Nusa<span>Quest</span>
          </div>
          <p className="auth-sub">
            {authModalTab === 'login'
              ? 'Masuk untuk menyimpan riwayat dan skor petualanganmu'
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
        ) : (
          <form className="auth-form" onSubmit={handleRegisterSubmit}>
            <div className="auth-field">
              <label htmlFor="reg-username">Username</label>
              <input
                id="reg-username"
                type="text"
                required
                placeholder="contoh: penjelajah01"
                value={regUsername}
                onChange={(e) => setRegUsername(e.target.value)}
                autoComplete="username"
              />
            </div>

            <div className="auth-field">
              <label htmlFor="reg-email">Email</label>
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
              <label htmlFor="reg-display">Nama Tampilan (Opsional)</label>
              <input
                id="reg-display"
                type="text"
                placeholder="Nama panggilanmu"
                value={regDisplayName}
                onChange={(e) => setRegDisplayName(e.target.value)}
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

            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? 'Mendaftarkan...' : 'Buat Akun'}
            </button>

            <p className="auth-switch-text">
              Sudah punya akun?{' '}
              <span onClick={() => handleTabSwitch('login')}>Masuk di sini</span>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
