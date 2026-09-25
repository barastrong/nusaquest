import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipLoader } from 'react-spinners';
import { FiKey, FiInfo, FiX, FiAward, FiMap, FiGift, FiSearch, FiUnlock, FiBookOpen, FiStar, FiCompass } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { DIFFICULTY_CONFIG, getDifficultyInfo } from '../../utils/difficulty';
import MapSVG from './/Map/MapSVG';
import RegionPopup from './Map/RegionPopup';
import LockedRegionPopup from './Map/LockedRegionPopup';
import UnlockAnimation from './Map/UnlockAnimation';
import GuestWarningModal from '../../components/GuestWarningModal';
import '../../styles/map.css';
import '../../styles/guestModal.css';

const TOTAL_PROVINCES = 38;

export default function MapPage() {
  const navigate = useNavigate();
  const {
    user,
    openAuthModal,
    userProgress,
    guestWarningSeen,
    guestLimit,
    markGuestWarningSeen,
    unlockRegion,
  } = useAuth();
  const [loading, setLoading] = useState(true);
  const [hoveredRegionId, setHoveredRegionId] = useState(null);
  const [selectedRegionId, setSelectedRegionId] = useState(null);
  const [selectedRegionName, setSelectedRegionName] = useState(null);
  const [isRegionSelected, setIsRegionSelected] = useState(false);
  const [lockedRegionNamePopup, setLockedRegionNamePopup] = useState(null);
  const [lockedRegionIdPopup, setLockedRegionIdPopup] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [zoomCenterX, setZoomCenterX] = useState(403.5);
  const [zoomCenterY, setZoomCenterY] = useState(170);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  // Progres selalu berasal dari database (dipetakan oleh AuthContext).
  // Tidak ada lagi pembacaan/sinkronisasi localStorage di sini.
  const unlockedRegions = userProgress.unlockedRegions || [];
  const keyValue = userProgress.keys ?? 0;
  const [lockedRegionKeyCost, setLockedRegionKeyCost] = useState(1);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [unlockAnim, setUnlockAnim] = useState(null); // { name, difficulty, color }
  const [isGuestWarningOpen, setIsGuestWarningOpen] = useState(false);
  const [pendingRegion, setPendingRegion] = useState(null);
  const [guestWarningProvince, setGuestWarningProvince] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  const showRegion = (id) => setHoveredRegionId(id);

  const closeDetail = () => {
    setZoom(1);
    setPanX(0);
    setPanY(0);
    setTimeout(() => {
      setHoveredRegionId(null);
      setSelectedRegionId(null);
      setSelectedRegionName(null);
      setIsRegionSelected(false);
      setZoomCenterX(403.5);
      setZoomCenterY(170);
    }, 600);
  };

  const executeRegionClick = (regionId, regionName, centerX, centerY) => {
    setSelectedRegionId(regionId);
    setSelectedRegionName(regionName);
    setIsRegionSelected(true);
    const targetZoom = 2.5;
    const offsetX = (403.5 - centerX) / targetZoom;
    const offsetY = (170 - centerY) / targetZoom;
    setZoom(targetZoom);
    setZoomCenterX(centerX);
    setZoomCenterY(centerY);
    setPanX(offsetX);
    setPanY(offsetY);
  };

  const executeLockedRegionClick = (regionId, regionName, unlockCost) => {
    setSelectedRegionName(null);
    setSelectedRegionId(null);
    setLockedRegionNamePopup(regionName);
    setLockedRegionIdPopup(regionId);
    setLockedRegionKeyCost(unlockCost || getDifficultyInfo(regionId).unlockCost);
    setIsRegionSelected(true);
  };

  const handleRegionClick = (regionId, regionName, centerX, centerY) => {
    // Reset locked popup if open
    setLockedRegionNamePopup(null);
    setLockedRegionIdPopup(null);

    if (!user && !guestWarningSeen) {
      setPendingRegion({
        type: 'unlocked',
        regionId,
        regionName,
        centerX,
        centerY,
      });
      setGuestWarningProvince(regionName);
      setIsGuestWarningOpen(true);
      return;
    }

    executeRegionClick(regionId, regionName, centerX, centerY);
  };

  const handleLockedRegionClick = (regionId, regionName) => {
    const { unlockCost } = getDifficultyInfo(regionId);
    if (!user && !guestWarningSeen) {
      setPendingRegion({
        type: 'locked',
        regionId,
        regionName,
        unlockCost,
      });
      setGuestWarningProvince(regionName);
      setIsGuestWarningOpen(true);
      return;
    }

    executeLockedRegionClick(regionId, regionName, unlockCost);
  };

  const handleProceedGuest = () => {
    markGuestWarningSeen();
    setIsGuestWarningOpen(false);
    if (!pendingRegion) return;

    if (pendingRegion.type === 'unlocked') {
      executeRegionClick(
        pendingRegion.regionId,
        pendingRegion.regionName,
        pendingRegion.centerX,
        pendingRegion.centerY
      );
    } else if (pendingRegion.type === 'locked') {
      executeLockedRegionClick(
        pendingRegion.regionId,
        pendingRegion.regionName,
        pendingRegion.unlockCost
      );
    }
    setPendingRegion(null);
  };

  const handleRegisterFromGuest = () => {
    markGuestWarningSeen();
    setIsGuestWarningOpen(false);
    setPendingRegion(null);
    openAuthModal('register');
  };

  const handleCloseGuestWarning = () => {
    markGuestWarningSeen();
    setIsGuestWarningOpen(false);
    setPendingRegion(null);
  };

  const handleUnlockRegion = async (regionId, keyCost) => {
    const isGuest = !user;

    // Batas 5 provinsi untuk tamu (server juga memaksa batas ini)
    if (isGuest && unlockedRegions.length >= guestLimit) {
      openAuthModal('register');
      return;
    }

    const result = await unlockRegion(regionId, keyCost);

    if (!result.success) {
      console.error('Failed to unlock province:', result.message);
      return;
    }

    const provName = lockedRegionNamePopup;
    setLockedRegionNamePopup(null);
    setLockedRegionIdPopup(null);

    // Trigger unlock animation
    const { label, color } = getDifficultyInfo(regionId);
    setUnlockAnim({ name: provName, difficulty: label, color });
  };

  if (loading) {
    return (
      <div className="map-loading">
        <ClipLoader color="#f7b24f" loading={loading} size={60} aria-label="Loading Spinner" />
        <p className="map-loading-text">Memuat Peta...</p>
      </div>
    );
  }

  const unlockedCount = unlockedRegions.length;
  const isFullMapComplete = unlockedCount >= TOTAL_PROVINCES;

  return (
    <div className="map-page">
      <div className="map-hero">
        <div className="map-hero-header">
          <div className="section-label">Map Game</div>
          <h2 className="map-info-title">Jelajahi <em>Indonesia</em></h2>
          <div className="map-progress-bar">
            <div className="map-progress-fill" style={{ width: `${(unlockedCount / TOTAL_PROVINCES) * 100}%` }} />
            <span className="map-progress-text">{unlockedCount}/{TOTAL_PROVINCES} Provinsi</span>
          </div>
        </div>

        {isFullMapComplete && (
          <div className="fullmap-complete-banner">
            <FiAward /> Selamat! Kamu telah membuka semua provinsi!
          </div>
        )}

        {/* Top-right controls */}
        <div className="map-top-right">
          {/* Badge Mode Tamu — tampil di sebelah kiri tombol "Cara Bermain" */}
          {!user && (
            <div
              className="map-guest-badge"
              title={`Mode Tamu: ${unlockedCount}/${guestLimit} provinsi terbuka. Daftar akun gratis untuk membuka seluruh 38 provinsi dan menyimpan progresmu.`}
            >
              <FiCompass className="mgb-icon" />
              <span className="mgb-label">Mode Tamu</span>
              <span className="mgb-count">{unlockedCount}/{guestLimit}</span>
            </div>
          )}

          <div className="htp-wrapper">
            <button
              className="htp-trigger-btn"
              onClick={() => setShowHowToPlay(v => !v)}
            >
              <FiInfo />
              <span>Cara Bermain</span>
            </button>

            {showHowToPlay && (
              <div className="how-to-play-panel">
                <button className="htp-close" onClick={() => setShowHowToPlay(false)}><FiX /></button>

                <div className="htp-header">
                  <div className="htp-header-icon"><FiMap /></div>
                  <div>
                    <div className="htp-header-title">Map Explorer</div>
                    <div className="htp-header-sub">Buka semua 38 provinsi Indonesia!</div>
                  </div>
                </div>

                <div className="htp-notice">
                  <span className="htp-notice-icon"><FiGift /></span>
                  <span>{user ? 'Kumpulkan kunci dengan menyelesaikan tantangan untuk membuka provinsi!' : 'Mode Tamu: Buka hingga 5 provinsi secara gratis dan dapatkan +1 reward kunci di setiap provinsi!'}</span>
                </div>

                <div className="htp-flow">
                  <div className="htp-step">
                    <div className="htp-step-dot">1</div>
                    <div className="htp-step-line" />
                    <div className="htp-step-content">
                      <div className="htp-step-title"><FiSearch className="htp-step-icon" /> Pilih Provinsi</div>
                      <div className="htp-step-desc">Klik provinsi terkunci di peta</div>
                    </div>
                  </div>
                  <div className="htp-step">
                    <div className="htp-step-dot">2</div>
                    <div className="htp-step-line" />
                    <div className="htp-step-content">
                      <div className="htp-step-title"><FiUnlock className="htp-step-icon" /> Gunakan Kunci</div>
                      <div className="htp-step-desc">Bayar kunci sesuai level provinsi</div>
                    </div>
                  </div>
                  <div className="htp-step">
                    <div className="htp-step-dot">3</div>
                    <div className="htp-step-line" />
                    <div className="htp-step-content">
                      <div className="htp-step-title"><FiBookOpen className="htp-step-icon" /> Jelajahi Detail</div>
                      <div className="htp-step-desc">Baca budaya & info provinsi sampai selesai</div>
                    </div>
                  </div>
                  <div className="htp-step">
                    <div className="htp-step-dot">4</div>
                    <div className="htp-step-line htp-step-line--last" />
                    <div className="htp-step-content">
                      <div className="htp-step-title"><FiStar className="htp-step-icon" /> Klaim Reward</div>
                      <div className="htp-step-desc">Klik tombol klaim di halaman detail untuk dapat kunci baru</div>
                    </div>
                  </div>
                </div>

                <div className="htp-level-table">
                  <div className="htp-level-header">Level Provinsi</div>
                  {Object.entries(DIFFICULTY_CONFIG).map(([key, cfg]) => (
                    <div key={key} className="htp-level-row">
                      <span className="htp-badge" style={{ background: cfg.color + '22', color: cfg.color, border: `1px solid ${cfg.color}` }}>{cfg.label}</span>
                      <span className="htp-level-cost">Buka <strong>{user ? `${cfg.unlockCost} ` : 'Gratis '} <FiKey style={{ verticalAlign: 'middle', fontSize: 11 }} /></strong></span>
                      <span className="htp-level-reward">+{user ? cfg.keyReward : 1} <FiKey style={{ verticalAlign: 'middle', fontSize: 11 }} /> reward</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Back button positioned at top-right corner */}
        <button className="map-back-btn" onClick={() => navigate('/')}>
          ← Kembali
        </button>

        <div className="map-hero-inner">
          <div className="map-container full-map">
            <MapSVG
              onRegionHover={showRegion}
              hoveredRegionId={hoveredRegionId}
              onRegionClick={handleRegionClick}
              onLockedRegionClick={handleLockedRegionClick}
              selectedRegionId={selectedRegionId}
              isRegionSelected={isRegionSelected}
              zoom={zoom}
              zoomCenterX={zoomCenterX}
              zoomCenterY={zoomCenterY}
              panX={panX}
              panY={panY}
              unlockedRegions={unlockedRegions}
              keyValue={user ? keyValue : '∞'}
            />
          </div>
        </div>
      </div>

      {isRegionSelected && selectedRegionId && selectedRegionName && (
        <RegionPopup
          regionName={selectedRegionName}
          regionId={selectedRegionId}
          onClose={closeDetail}
        />
      )}

      {lockedRegionNamePopup && (
        <LockedRegionPopup
          regionName={lockedRegionNamePopup}
          regionId={lockedRegionIdPopup}
          onClose={() => { setLockedRegionNamePopup(null); setIsRegionSelected(false); }}
          onUnlock={() => handleUnlockRegion(lockedRegionIdPopup, lockedRegionKeyCost)}
          keyValue={user ? keyValue : '∞'}
          keyRequired={lockedRegionKeyCost}
          unlockedCount={unlockedRegions.length}
        />
      )}

      {unlockAnim && (
        <UnlockAnimation
          regionName={unlockAnim.name}
          difficulty={unlockAnim.difficulty}
          color={unlockAnim.color}
          onDone={() => setUnlockAnim(null)}
        />
      )}

      {/* Guest Mode Warning Modal on Map Click */}
      <GuestWarningModal
        isOpen={isGuestWarningOpen}
        onClose={handleCloseGuestWarning}
        onProceed={handleProceedGuest}
        onRegister={handleRegisterFromGuest}
        provinceName={guestWarningProvince}
      />
    </div>
  );
}
