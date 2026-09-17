import React, { useState, useEffect } from 'react';
import ProvinceManager from './ProvinceManager';
import QuizManager from './QuizManager';
import { authApi } from '../../services/api';
import '../../styles/admin.css';

const ADMIN_STORAGE_KEY = 'nusaquest_admin_auth';

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [inputKey, setInputKey] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('provinces');

  useEffect(() => {
    const cached = sessionStorage.getItem(ADMIN_STORAGE_KEY);
    if (cached === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const res = await authApi.verifyAdminKey(inputKey);
      if (res.success) {
        setIsAuthenticated(true);
        sessionStorage.setItem(ADMIN_STORAGE_KEY, 'true');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Kode akses salah');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem(ADMIN_STORAGE_KEY);
    setIsAuthenticated(false);
    setInputKey('');
  };

  if (!isAuthenticated) {
    return (
      <div className="admin-container" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="admin-card" style={{ maxWidth: '420px', width: '100%', textAlign: 'center', padding: '36px 28px' }}>
          <h2 style={{ marginBottom: '10px', fontSize: '1.5rem', color: '#fff' }}>Akses Admin</h2>
          <p style={{ color: '#9ca3af', marginBottom: '24px', fontSize: '0.9rem' }}>
            Masukkan kode rahasia admin untuk mengelola konten NusaQuest
          </p>

          <form onSubmit={handleLogin}>
            <div className="admin-form-group" style={{ textAlign: 'left' }}>
              <label>Kode Akses</label>
              <input
                type="password"
                className="admin-input"
                placeholder="Masukkan kode..."
                required
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                autoFocus
              />
            </div>

            {errorMsg && (
              <p style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '16px' }}>
                {errorMsg}
              </p>
            )}

            <button
              type="submit"
              className="admin-btn"
              style={{ width: '100%', justifyContent: 'center' }}
              disabled={loading}
            >
              {loading ? 'Memverifikasi...' : 'Buka Dashboard'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>Nusa<span>Quest</span> Admin Panel</h1>
        <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={handleLogout}>
          Keluar
        </button>
      </div>

      <div className="admin-tabs">
        <button
          className={`admin-tab-btn ${activeTab === 'provinces' ? 'active' : ''}`}
          onClick={() => setActiveTab('provinces')}
        >
          Kelola Provinsi & Budaya
        </button>
        <button
          className={`admin-tab-btn ${activeTab === 'quizzes' ? 'active' : ''}`}
          onClick={() => setActiveTab('quizzes')}
        >
          Kelola Bank Quiz
        </button>
      </div>

      {activeTab === 'provinces' ? <ProvinceManager /> : <QuizManager />}
    </div>
  );
}
