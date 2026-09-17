import { useNavigate } from 'react-router-dom';
import '../styles/hero.css';

import batikImg from '../assets/batik.jpg';
import wayangImg from '../assets/wayang.jpg';     
import candiImg from '../assets/candi.jpg';       

export default function Hero() {
  const navigate = useNavigate();

  return (
    <section className="hero">
      <div className="hero-left">
        <div className="hero-eyebrow">Platform Edukasi Budaya Indonesia</div>
        <h1 className="hero-title">
          Jelajahi<br />
          <em>Warisan</em><br />
          <span className="outline">Nusantara</span>
        </h1>
        <p className="hero-desc">
          Dari batik Jawa hingga tarian Papua — temukan keajaiban budaya 17.000 pulau Indonesia lewat peta interaktif dan game edukatif yang seru.
        </p>
        <div className="hero-actions">
          <button className="btn-gold" onClick={() => navigate('/map')}>Mulai Eksplorasi</button>
          <button className="btn-outline" onClick={() => navigate('/map-games')}>Coba Games</button>
        </div>
        <div className="hero-stats">
          <div><div className="stat-num">1,340+</div><div className="stat-label">Suku Bangsa</div></div>
          <div><div className="stat-num">746</div><div className="stat-label">Bahasa Daerah</div></div>
          <div><div className="stat-num">38</div><div className="stat-label">Provinsi</div></div>
        </div>
      </div>

      <div className="hero-right">
        {/* Gambar utama (besar) */}
        <div className="hero-img-main">
          <div className="img-placeholder p1">
            <img
              src={batikImg}
              alt="Batik Nusantara"
              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }}
            />
          </div>
        </div>

        {/* Gambar kecil kiri bawah */}
        <div className="hero-img-sm1">
          <div className="img-placeholder p2">
            <img
              src={wayangImg}
              alt="Wayang Kulit"
              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }}
            />
          </div>
          <div className="img-tag">Tradisi · 1,000 Tahun</div>
        </div>

        {/* Gambar kecil kanan bawah */}
        <div className="hero-img-sm2">
          <div className="img-placeholder p3">
            <img
              src={candiImg}
              alt="Candi Agung"
              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }}
            />
          </div>
          <div className="img-tag">Sejarah</div>
        </div>
      </div>
    </section>
  );
}