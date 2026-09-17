import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipLoader } from 'react-spinners';
import { regionData, regionToIslandMap } from '../../data/regionData';
import MapSVG from '../../components/Map/MapSVG';
import RegionPopup from '../../components/Map/RegionPopup';
import '../../styles/map.css';

export default function MapPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [hoveredRegionId, setHoveredRegionId] = useState(null);
  const [selectedRegionId, setSelectedRegionId] = useState(null);
  const [selectedRegionName, setSelectedRegionName] = useState(null);
  const [isRegionSelected, setIsRegionSelected] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [zoomCenterX, setZoomCenterX] = useState(403.5);
  const [zoomCenterY, setZoomCenterY] = useState(170);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  
  const selectedRegion = selectedRegionId ? regionData[regionToIslandMap[selectedRegionId]] : null;

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const showRegion = (id) => {
    setHoveredRegionId(id);
  };

  const closeDetail = () => {
    // Smooth zoom out
    setZoom(1);
    setPanX(0);
    setPanY(0);
    
    // Reset state setelah animasi selesai
    setTimeout(() => {
      setHoveredRegionId(null);
      setSelectedRegionId(null);
      setSelectedRegionName(null);
      setIsRegionSelected(false);
      setZoomCenterX(403.5);
      setZoomCenterY(170);
    }, 600);
  };

  const handleRegionClick = (regionId, regionName, centerX, centerY) => {
    // Jika sudah ada region yang dipilih, jangan izinkan klik region lain
    if (isRegionSelected) {
      console.log('Region already selected. Click ignored.');
      return;
    }
    
    console.log('=== MAP PAGE - REGION CLICKED ===');
    console.log('Region ID:', regionId);
    console.log('Region Name:', regionName);
    console.log('Center X:', centerX);
    console.log('Center Y:', centerY);
    
    setSelectedRegionId(regionId);
    setSelectedRegionName(regionName);
    setIsRegionSelected(true);
    
    console.log('State updated - selectedRegionName:', regionName);
    console.log('State updated - isRegionSelected: true');
    
    // Smooth zoom dengan center ke region yang diklik
    const targetZoom = 2.5;
    const viewBoxCenterX = 403.5; // Center of viewBox (-10 to 807) = (807 - 10) / 2 = 403.5
    const viewBoxCenterY = 170; // Center of viewBox (0 to 340) = 340 / 2 = 170
    
    // Hitung offset untuk center ke region
    const offsetX = (viewBoxCenterX - centerX) / targetZoom;
    const offsetY = (viewBoxCenterY - centerY) / targetZoom;
    
    setZoom(targetZoom);
    setZoomCenterX(centerX);
    setZoomCenterY(centerY);
    setPanX(offsetX);
    setPanY(offsetY);
  };

  if (loading) {
    return (
      <div className="map-loading">
        <ClipLoader
          color="#f7b24f"
          loading={loading}
          size={60}
          aria-label="Loading Spinner"
        />
        <p className="map-loading-text">Memuat Peta...</p>
      </div>
    );
  }

  return (
    <div className="map-page">
      <div className="map-hero">
        <div className="map-hero-header">
          <div className="section-label">Peta Interaktif</div>
          <h2 className="map-info-title">Jelajahi <em>Indonesia</em></h2>
        </div>
        <button className="map-back-btn" onClick={() => navigate('/')} title="Kembali ke Beranda">
          ← Kembali
        </button>
        <div className="map-hero-inner">
          <div className="map-container full-map">
            <MapSVG 
              onRegionHover={showRegion} 
              hoveredRegionId={hoveredRegionId}
              onRegionClick={handleRegionClick}
              selectedRegionId={selectedRegionId}
              isRegionSelected={isRegionSelected}
              zoom={zoom}
              zoomCenterX={zoomCenterX}
              zoomCenterY={zoomCenterY}
              panX={panX}
              panY={panY}
            />
          </div>
        </div>
      </div>

      {selectedRegion && selectedRegionName && (
        <RegionPopup 
          regionName={selectedRegionName}
          onClose={closeDetail}
        />
      )}


    </div>
  );
}
