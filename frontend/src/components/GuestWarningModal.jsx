import { useEffect } from 'react';
import { FiCompass, FiMapPin, FiSave, FiShield, FiX, FiPlay, FiUserPlus } from 'react-icons/fi';
import '../styles/guestModal.css';

export default function GuestWarningModal({ isOpen, onClose, onProceed, onRegister, provinceName }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="gwm-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="gwm-content" onClick={(e) => e.stopPropagation()}>
        <button className="gwm-close-btn" onClick={onClose} aria-label="Tutup modal">
          <FiX size={20} />
        </button>

        <div className="gwm-icon-header">
          <div className="gwm-compass-glow">
            <FiCompass className="gwm-main-icon" />
          </div>
        </div>

        <h2 className="gwm-title">Petualangan Mode Tamu</h2>
        <p className="gwm-subtitle">
          Halo, Penjelajah Cilik! Kamu sedang menjelajah kebudayaan Indonesia dalam <strong>Mode Tamu</strong>{provinceName ? ` di ${provinceName}` : ''}.
        </p>

        <div className="gwm-points">
          <div className="gwm-point-card">
            <div className="gwm-point-icon-box gold">
              <FiMapPin size={18} />
            </div>
            <div className="gwm-point-text">
              <span className="gwm-point-head">Batas 5 Provinsi</span>
              <span className="gwm-point-desc">
                Kamu dapat membuka dan memainkan mini game hingga maksimal <strong>5 provinsi</strong>.
              </span>
            </div>
          </div>

          <div className="gwm-point-card">
            <div className="gwm-point-icon-box emerald">
              <FiSave size={18} />
            </div>
            <div className="gwm-point-text">
              <span className="gwm-point-head">Progres Tersimpan Sementara</span>
              <span className="gwm-point-desc">
                Kunci, skor kuis, dan provinsi yang kamu buka tersimpan di browser perangkat ini.
              </span>
            </div>
          </div>

          <div className="gwm-point-card highlight">
            <div className="gwm-point-icon-box blue">
              <FiShield size={18} />
            </div>
            <div className="gwm-point-text">
              <span className="gwm-point-head">Simpan Selamanya dengan Akun Gratis</span>
              <span className="gwm-point-desc">
                Daftar akun gratis kapan saja untuk membuka <strong>seluruh 38 provinsi</strong>. Seluruh progres Mode Tamu akan <strong>otomatis tersinkronisasi</strong> ke akun barumu tanpa hilang!
              </span>
            </div>
          </div>
        </div>

        <div className="gwm-actions">
          <button type="button" className="gwm-btn gwm-btn-proceed" onClick={onProceed}>
            <FiPlay /> Lanjut Bermain
          </button>
          <button type="button" className="gwm-btn gwm-btn-register" onClick={onRegister}>
            <FiUserPlus /> Buat Akun Gratis Sekarang
          </button>
        </div>
      </div>
    </div>
  );
}
