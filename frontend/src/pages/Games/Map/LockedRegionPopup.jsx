import '../../../styles/map.css';
import { FiKey, FiLock } from "react-icons/fi";
import { getDifficultyInfo } from '../MapPage';
import { useAuth } from '../../../context/AuthContext';

export default function LockedRegionPopup({ regionName, regionId, onClose, onUnlock, keyValue = 0, keyRequired = 1 }) {
  const { user, openAuthModal } = useAuth();
  const canUnlock = Boolean(user && keyValue >= keyRequired);
  const { difficulty, label, color, keyReward } = getDifficultyInfo(regionId);

  return (
    <div className="region-popup-overlay" onClick={onClose}>
      <div className="region-popup" onClick={(e) => e.stopPropagation()}>
        <button className="popup-close" onClick={onClose}>×</button>
        <div className="popup-content">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <FiLock size={16} color={color} />
            <h3 className="popup-title" style={{ margin: 0, fontSize: 18 }}>Provinsi Terkunci</h3>
          </div>
          <p className="popup-section-title" style={{ marginBottom: 8 }}>{regionName}</p>

          {/* Difficulty badge */}
          <span className="htp-badge" style={{ background: color + '22', color, border: `1px solid ${color}`, marginBottom: 12, display: 'inline-block' }}>
            Level: {label}
          </span>

          <div className="popup-section">
            <div className="key-requirement-box">
              <span className="key-icon"><FiKey /></span>
              <span className="key-amount">{keyRequired} kunci dibutuhkan</span>
            </div>
            <p style={{ fontSize: 12, color: '#888', marginTop: 8, marginBottom: 0 }}>
              Kunci kamu: <strong style={{ color: canUnlock ? '#40916C' : '#e74c3c' }}>{user ? keyValue : 0}</strong>
              {' · '}Reward setelah dibuka: <strong style={{ color: '#C9A84C' }}>{keyReward} <FiKey style={{ verticalAlign: 'middle', fontSize: 11 }} /></strong>
            </p>
            {user ? (
              !canUnlock && (
                <p style={{ color: '#e74c3c', marginTop: 6, fontSize: 12 }}>
                  Butuh {keyRequired - keyValue} kunci lagi
                </p>
              )
            ) : (
              <p style={{ color: '#e74c3c', marginTop: 6, fontSize: 12 }}>
                Silakan login untuk membuka provinsi
              </p>
            )}
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <button className="popup-btn-secondary" onClick={onClose} style={{ flex: 1 }}>Batal</button>
            <button
              className="popup-btn-primary"
              onClick={() => {
                if (!user) {
                  onClose();
                  openAuthModal('login');
                  return;
                }
                if (canUnlock) {
                  onUnlock();
                  onClose();
                }
              }}
              style={{ flex: 1, opacity: !user || canUnlock ? 1 : 0.5, cursor: !user || canUnlock ? 'pointer' : 'not-allowed' }}
            >
              {user ? (canUnlock ? 'Buka Provinsi' : 'Kunci Kurang') : 'Masuk Akun'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
