import { FiAward, FiKey, FiCheck } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import '../styles/guestModal.css';

export default function GuestKeyRewardModal() {
  const { isRewardModalOpen, guestRewardInfo, closeRewardModal } = useAuth();

  if (!isRewardModalOpen || !guestRewardInfo) return null;

  const { keysEarned = 1, completedCount = 0 } = guestRewardInfo;

  return (
    <div className="gwm-overlay" onClick={closeRewardModal}>
      <div className="gwm-content gkrm-content" onClick={(e) => e.stopPropagation()}>
        <div className="gwm-icon-header">
          <div className="gwm-compass-glow">
            <FiAward className="gwm-main-icon" />
          </div>
        </div>
        <h3 className="gwm-title">Selamat! Hadiah Petualanganmu Tiba</h3>
        <p className="gwm-subtitle">
          Kamu telah menyelesaikan <strong>{completedCount} provinsi</strong> selama Mode Tamu.
        </p>
        <div
          className="lrp-quota-limit-box"
          style={{
            background: 'rgba(201, 168, 76, 0.12)',
            borderColor: 'rgba(201, 168, 76, 0.4)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: '1.25rem',
              fontWeight: 800,
              color: '#f7b24f',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <FiKey size={24} /> +{keysEarned} Kunci Baru Ditambahkan!
          </div>
          <p style={{ margin: '8px 0 0', fontSize: '0.85rem', color: '#e2e8f0', lineHeight: 1.5 }}>
            Kunci ini sudah otomatis masuk ke akun barumu. Sekarang kamu dapat melanjutkan petualangan untuk membuka seluruh 38 provinsi di Nusantara!
          </p>
        </div>
        <div className="gwm-actions" style={{ marginTop: 18 }}>
          <button className="gwm-btn gwm-btn-proceed" onClick={closeRewardModal}>
            <FiCheck /> Mulai Petualangan Penuh
          </button>
        </div>
      </div>
    </div>
  );
}
