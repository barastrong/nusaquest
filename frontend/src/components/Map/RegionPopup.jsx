import { useNavigate } from 'react-router-dom';

export default function RegionPopup({ regionName, onClose }) {
  const navigate = useNavigate();
  
  const handleDetailClick = () => {
    // Map nama provinsi ke slug yang sesuai dengan provinceDetailData
    const nameToSlug = {
      'Aceh': 'aceh',
      'Sumatera Utara': 'sumatera-utara',
      'Sumatera Barat': 'sumatera-barat',
      'Riau': 'riau',
      'Kepulauan Riau': 'kepulauan-riau',
      'Jambi': 'jambi',
      'Sumatera Selatan': 'sumatera-selatan',
      'Bengkulu': 'bengkulu',
      'Lampung': 'lampung',
      'Bangka Belitung': 'bangka-belitung',
      'DKI Jakarta': 'dki-jakarta',
      'Jawa Barat': 'jawa-barat',
      'Banten': 'banten',
      'Jawa Tengah': 'jawa-tengah',
      'DIY Yogyakarta': 'yogyakarta',
      'Jawa Timur': 'jawa-timur',
      'Bali': 'bali',
      'Nusa Tenggara Barat': 'nusa-tenggara-barat',
      'Nusa Tenggara Timur': 'nusa-tenggara-timur',
      'Kalimantan Barat': 'kalimantan-barat',
      'Kalimantan Tengah': 'kalimantan-tengah',
      'Kalimantan Selatan': 'kalimantan-selatan',
      'Kalimantan Timur': 'kalimantan-timur',
      'Kalimantan Utara': 'kalimantan-utara',
      'Sulawesi Utara': 'sulawesi-utara',
      'Gorontalo': 'gorontalo',
      'Sulawesi Tengah': 'sulawesi-tengah',
      'Sulawesi Barat': 'sulawesi-barat',
      'Sulawesi Selatan': 'sulawesi-selatan',
      'Sulawesi Tenggara': 'sulawesi-tenggara',
      'Maluku': 'maluku',
      'Maluku Utara': 'maluku-utara',
      'Papua Barat': 'papua-barat',
      'Papua Barat Daya': 'papua-barat-daya',
      'Papua Tengah': 'papua-tengah',
      'Papua Selatan': 'papua-selatan',
      'Papua Pegunungan': 'papua-pegunungan',
      'Papua': 'papua',
    };

    const slug = nameToSlug[regionName] || regionName.toLowerCase().replace(/\s+/g, '-');
    const targetUrl = `/detailmap/${slug}`;
    onClose();
    setTimeout(() => navigate(targetUrl), 100);
  };
  
  return (
    <div className="region-popup-overlay" onClick={onClose}>
      <div className="region-popup" onClick={(e) => e.stopPropagation()}>
        <button className="popup-close" onClick={onClose}>
          ×
        </button>
        
        <div className="popup-header">
          <div className="popup-title-section">
            <h3 className="popup-title">{regionName}</h3>
          </div>
        </div>
        
        <div className="popup-content">
          <p className="popup-detail-text">
            Informasi detail mengenai budaya, geografis, dan potensi daerah {regionName} akan ditampilkan di sini.
          </p>

          <div className="popup-actions">
            <button className="popup-btn-primary" onClick={handleDetailClick}>
              Lihat Detail Provinsi →
            </button>
            <button className="popup-btn-secondary" onClick={onClose}>
              ← Kembali ke Peta Utama
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
