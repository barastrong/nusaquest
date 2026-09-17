import { useNavigate } from 'react-router-dom';
import '../styles/features.css';

export default function Features() {
  const navigate = useNavigate();

  return (
    <section className="section section-alt reveal">
      <div className="section-label">Fitur Platform</div>
      <h2 className="section-title">Belajar dengan Cara <em>Baru</em></h2>
      <div className="features-grid">
        <div className="feat-card" onClick={() => navigate('/map')}>
          <div className="feat-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{color:'var(--gold)'}}>
              <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
              <line x1="9" y1="3" x2="9" y2="18"/>
              <line x1="15" y1="6" x2="15" y2="21"/>
            </svg>
          </div>
          <div className="feat-title">Peta Interaktif</div>
          <div className="feat-desc">Klik provinsi manapun di peta Indonesia untuk menjelajahi kekayaan budaya, sejarah, dan tradisi daerah tersebut secara mendalam.</div>
        </div>
        <div className="feat-card" onClick={() => navigate('/map-games')}>
          <div className="feat-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{color:'var(--gold)'}}>
              <circle cx="12" cy="12" r="10"/>
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <div className="feat-title">Quiz Budaya AI</div>
          <div className="feat-desc">Uji pengetahuanmu tentang budaya Indonesia dengan soal-soal yang di-generate AI — segar, beragam, dan tidak pernah sama!</div>
        </div>
        <div className="feat-card" onClick={() => navigate('/map-games')}>
          <div className="feat-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{color:'var(--gold)'}}>
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
              <line x1="7" y1="7" x2="7.01" y2="7"/>
            </svg>
          </div>
          <div className="feat-title">Puzzle Nusantara</div>
          <div className="feat-desc">Susun potongan gambar budaya Indonesia — dari motif batik, candi, hingga tarian tradisional. Seru untuk semua umur!</div>
        </div>
      </div>
    </section>
  );
}
