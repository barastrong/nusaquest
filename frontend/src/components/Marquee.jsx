import '../styles/marquee.css';

export default function Marquee() {
  const items = [
    'Batik Nusantara', 'Wayang Kulit', 'Gamelan Jawa', 'Tari Kecak',
    'Rumah Adat', 'Rempah Nusantara', 'Candi Borobudur', 'Tenun Ikat'
  ];

  return (
    <div className="marquee-wrap">
      <div className="marquee-track">
        {[...items, ...items].map((item, i) => (
          <span key={i} className="marquee-item">
            {item}
            <span className="marquee-dot"></span>
          </span>
        ))}
      </div>
    </div>
  );
}
