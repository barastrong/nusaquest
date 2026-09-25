import '../../../styles/map.css';
import '../../../styles/guestModal.css';
import { FiKey, FiLock, FiAlertCircle, FiCompass, FiUserPlus } from "react-icons/fi";
import { getDifficultyInfo } from '../MapPage';
import { useAuth } from '../../../context/AuthContext';
import { GUEST_MAX_PROVINCES } from '../../../utils/localStorage';

export default function LockedRegionPopup({
  regionName,
  regionId,
  onClose,
  onUnlock,
  keyValue = 0,
  keyRequired = 1,
  unlockedCount = 0,
}) {
  const { user, openAuthModal } = useAuth();
  const isGuest = !user;
  const isGuestQuotaReached = isGuest && unlockedCount >= GUEST_MAX_PROVINCES;
  const canUnlock = isGuest ? !isGuestQuotaReached : keyValue >= keyRequired;
  const { difficulty, label, color, keyReward } = getDifficultyInfo(regionId);
  const displayReward = isGuest ? 1 : keyReward;

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

          {isGuestQuotaReached ? (
            <div className="lrp-quota-limit-box">
              <div className="lrp-quota-head">
                <FiAlertCircle size={18} /> Batas Mode Tamu Tercapai ({GUEST_MAX_PROVINCES}/{GUEST_MAX_PROVINCES})
              </div>
              <div className="lrp-quota-desc">
                Hebat! Kamu sudah membuka kuota maksimal {GUEST_MAX_PROVINCES} provinsi di Mode Tamu. Daftarkan akun gratis sekarang untuk membuka ke-38 provinsi Indonesia dan simpan pencapaianmu selamanya tanpa hilang!
              </div>
            </div>
          ) : (
            <div className="popup-section">
              {isGuest && (
                <div className="lrp-guest-badge">
                  <FiCompass size={13} /> Mode Tamu: {unlockedCount}/{GUEST_MAX_PROVINCES} Provinsi Terbuka
                </div>
              )}

              <div className="key-requirement-box">
                <span className="key-icon"><FiKey /></span>
                <span className="key-amount">
                  {isGuest ? 'Gratis di Mode Tamu' : `${keyRequired} kunci dibutuhkan`}
                </span>
              </div>
              <p style={{ fontSize: 12, color: '#888', marginTop: 8, marginBottom: 0 }}>
                Kunci kamu: <strong style={{ color: canUnlock ? '#40916C' : '#e74c3c' }}>
                  {isGuest ? '∞ (Unlimited)' : keyValue}
                </strong>
                {' · '}Reward setelah dibuka: <strong style={{ color: '#C9A84C' }}>
                  +{displayReward} <FiKey style={{ verticalAlign: 'middle', fontSize: 11 }} />
                </strong>
              </p>
              {!isGuest && !canUnlock && (
                <p style={{ color: '#e74c3c', marginTop: 6, fontSize: 12 }}>
                  Butuh {keyRequired - keyValue} kunci lagi
                </p>
              )}
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <button className="popup-btn-secondary" onClick={onClose} style={{ flex: 1 }}>
              {isGuestQuotaReached ? 'Nanti Saja' : 'Batal'}
            </button>
            {isGuestQuotaReached ? (
              <button
                className="popup-btn-primary"
                onClick={() => {
                  onClose();
                  openAuthModal('register');
                }}
                style={{ flex: 1.4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                <FiUserPlus size={14} /> Buat Akun Gratis
              </button>
            ) : (
              <button
                className="popup-btn-primary"
                onClick={() => {
                  if (canUnlock) {
                    onUnlock();
                    onClose();
                  }
                }}
                style={{ flex: 1, opacity: canUnlock ? 1 : 0.5, cursor: canUnlock ? 'pointer' : 'not-allowed' }}
                disabled={!canUnlock}
              >
                {canUnlock ? (isGuest ? 'Buka Provinsi' : 'Buka Provinsi') : 'Kunci Kurang'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
