import { useNavigate } from 'react-router-dom';
import { getDifficultyInfo } from '../MapPage';
import { FiKey, FiCheckCircle, FiClock, FiRotateCw, FiAward } from 'react-icons/fi';
import { useAuth } from '../../../context/AuthContext';
import { getProvinceQuizProgress } from '../../../utils/localStorage';

const nameToSlug = {SXDDSAD
  'Aceh': 'aceh', 'Sumatera Utara': 'sumatera-utara', 'Sumatera Barat': 'sumatera-barat',
  'Riau': 'riau', 'Kepulauan Riau': 'kepulauan-riau', 'Jambi': 'jambi',
  'Sumatera Selatan': 'sumatera-selatan', 'Bengkulu': 'bengkulu', 'Lampung': 'lampung',
  'Bangka Belitung': 'bangka-belitung', 'DKI Jakarta': 'dki-jakarta', 'Jawa Barat': 'jawa-barat',
  'Banten': 'banten', 'Jawa Tengah': 'jawa-tengah', 'DIY Yogyakarta': 'yogyakarta',
  'Jawa Timur': 'jawa-timur', 'Bali': 'bali', 'Nusa Tenggara Barat': 'nusa-tenggara-barat',
  'Nusa Tenggara Timur': 'nusa-tenggara-timur', 'Kalimantan Barat': 'kalimantan-barat',
  'Kalimantan Tengah': 'kalimantan-tengah', 'Kalimantan Selatan': 'kalimantan-selatan',
  'Kalimantan Timur': 'kalimantan-timur', 'Kalimantan Utara': 'kalimantan-utara',
  'Sulawesi Utara': 'sulawesi-utara', 'Gorontalo': 'gorontalo', 'Sulawesi Tengah': 'sulawesi-tengah',
  'Sulawesi Barat': 'sulawesi-barat', 'Sulawesi Selatan': 'sulawesi-selatan',
  'Sulawesi Tenggara': 'sulawesi-tenggara', 'Maluku': 'maluku', 'Maluku Utara': 'maluku-utara',
  'Papua Barat': 'papua-barat', 'Papua Barat Daya': 'papua-barat-daya',
  'Papua Tengah': 'papua-tengah', 'Papua Selatan': 'papua-selatan',
  'Papua Pegunungan': 'papua-pegunungan', 'Papua': 'papua',
};

export default function RegionPopup({ regionName, regionId, onClose }) {
  const navigate = useNavigate();
  const { getProvinceProgress, user } = useAuth();
  const { label, color, keyReward } = getDifficultyInfo(regionId);
  const displayReward = !user ? 1 : keyReward;

  const slug = regionId || nameToSlug[regionName] || regionName.toLowerCase().replace(/\s+/g, '-');
  const progress = getProvinceProgress
    ? getProvinceProgress(slug, 'quiz')
    : getProvinceQuizProgress(slug);

  const handleDetailClick = () => {
    onClose();
    setTimeout(() => navigate(`/map-games-detail/${slug}`), 100);
  };

  return (
    <div className="region-popup-overlay" onClick={onClose}>
      <div className="region-popup" onClick={(e) => e.stopPropagation()}>
        <button className="popup-close" onClick={onClose}>×</button>

        <div className="popup-header">
          <div className="popup-title-section">
            <h3 className="popup-title">{regionName}</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
              <span className="htp-badge" style={{ background: color + '22', color, border: `1px solid ${color}` }}>
                Level: {label}
              </span>
              <span style={{ fontSize: 12, color: '#C9A84C', display: 'flex', alignItems: 'center', gap: 3 }}>
                +{displayReward} <FiKey size={11} /> reward
              </span>
            </div>
          </div>
        </div>

        <div className="popup-content">
          {/* Progress Tracker Pengerjaan */}
          <div className="popup-progress-tracker">
            <div className="ppt-header">
              <span className="ppt-title">Status Belajar:</span>
              <span className={`ppt-status-tag ${progress.isCompleted ? 'status-completed' : progress.hasAttempted ? 'status-in-progress' : 'status-not-started'}`}>
                {progress.isCompleted ? (
                  <><FiCheckCircle /> Sudah Selesai</>
                ) : progress.hasAttempted ? (
                  <><FiRotateCw /> Sedang Belajar</>
                ) : (
                  <><FiClock /> Belum Dikerjakan</>
                )}
              </span>
            </div>

            <div className="ppt-stats-grid">
              <div className="ppt-stat-col">
                <span className="ppt-stat-label">Jumlah Percobaan</span>
                <span className="ppt-stat-val">{progress.attempts > 0 ? `${progress.attempts} kali` : '0 kali'}</span>
              </div>
              <div className="ppt-stat-col">
                <span className="ppt-stat-label">Skor Tertinggi</span>
                <span className="ppt-stat-val highlight-gold">
                  <FiAward className="stat-award-icon" /> {progress.attempts > 0 ? `${progress.highScore}/5` : '-'}
                </span>
              </div>
            </div>
          </div>

          <p className="popup-detail-text">
            Jelajahi budaya, wisata, dan kuliner khas {regionName}. Selesaikan tantangan untuk klaim reward kunci!
          </p>
          <div className="popup-actions">
            <button className="popup-btn-primary" onClick={handleDetailClick}>
              Jelajahi Provinsi →
            </button>
            <button className="popup-btn-secondary" onClick={onClose}>
              ← Kembali ke Peta
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
