import { useNavigate } from 'react-router-dom';
import '../styles/sections.css';

export default function CTA() {
  const navigate = useNavigate();

  return (
    <section className="cta-section reveal">
      <h2 className="cta-title">Siap <em>Menjelajahi</em><br />Nusantara?</h2>
      <p className="cta-sub">Bergabunglah dan temukan keajaiban budaya Indonesia dari Sabang sampai Merauke.</p>
      <button className="btn-gold" onClick={() => navigate('/map')}>Mulai Eksplorasi Gratis</button>
    </section>
  );
}
