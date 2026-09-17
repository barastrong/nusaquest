import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/culture.css';

// ── Gambar card (tampilan grid) ──
import batikImg    from '../assets/batik2.jpg';
import kecakImg    from '../assets/kecak.jpg';
import rendangImg  from '../assets/rendang.jpg';
import gamelanImg  from '../assets/gamelan.jpg';
import wayangImg   from '../assets/wayang2.jpg';

// ── Gambar popup ──
import batikPopup   from '../assets/batik3.jpg';
import kecakPopup   from '../assets/kecak2.jpg';
import rendangPopup from '../assets/rendang2.jpg';
import gamelanPopup from '../assets/gamelan2.jpg';
import wayangPopup  from '../assets/wayang3.jpg';

const cultures = [
  {
    id: 1,
    tag: 'Seni Tekstil · UNESCO 2009',
    title: 'Batik',
    titleFull: 'Batik — Lukisan Jiwa Nusantara',
    sub: '3,000+ motif dari seluruh Indonesia',
    emoji: '🎨',
    className: 'c1 main',
    image: batikImg,
    popupImages: [batikPopup],
    description: `Batik adalah seni melukis di atas kain menggunakan teknik perintangan warna dengan malam (lilin) panas yang diaplikasikan memakai canting atau cap. Kata "batik" berasal dari bahasa Jawa — "amba" (menulis) dan "titik".\n\nBerkembang sejak abad ke-13 di keraton Jawa, setiap motif batik menyimpan makna filosofis mendalam. Parang melambangkan kekuatan, Kawung melambangkan kesucian, sedangkan Megamendung dari Cirebon menggambarkan awan pembawa kesuburan.\n\nPada 2 Oktober 2009, UNESCO resmi mengakui Batik Indonesia sebagai Warisan Kemanusiaan Budaya Lisan dan Nonbendawi. Tanggal ini kini diperingati sebagai Hari Batik Nasional dan dirayakan jutaan orang di seluruh Indonesia.`,
    facts: ['3,000+ motif tercatat', 'Diakui UNESCO 2 Oktober 2009', 'Tersebar di 34 provinsi', 'Ekspor ~$58 juta/tahun'],
    origin: 'Jawa (Yogyakarta, Solo, Pekalongan, Cirebon)',
    era: 'Abad ke-13 hingga kini',
  },
  {
    id: 2,
    tag: 'Tari Tradisional · UNESCO 2015',
    title: 'Tari Kecak',
    titleFull: 'Kecak — Tari Api dari Bali',
    sub: 'Ritual sakral 200+ penari',
    emoji: '🔥',
    className: 'c2',
    image: kecakImg,
    popupImages: [kecakPopup],
    description: `Tari Kecak adalah pertunjukan seni dramatari khas Bali yang menampilkan puluhan hingga ratusan pria bertelanjang dada, duduk melingkar, dan berseru "cak-cak-cak" secara ritmis tanpa iringan alat musik — hanya suara manusia sebagai orkestra.\n\nDiciptakan pada tahun 1930-an oleh seniman Wayan Limbak bersama pelukis Jerman Walter Spies, Kecak mengangkat kisah Ramayana — terutama adegan penculikan Dewi Sita dan penyelamatan oleh Rama dibantu Hanoman. Api obor yang menyala di tengah arena menciptakan atmosfer magis yang tak terlupakan.\n\nTari Bali, termasuk Kecak, diakui UNESCO pada 2015 sebagai Warisan Budaya Takbenda dalam kategori "Three Genres of Traditional Balinese Dance". Pertunjukan paling ikonik digelar di Pura Uluwatu dengan latar matahari terbenam di atas Samudra Hindia.`,
    facts: ['Diciptakan tahun 1930-an', 'Diakui UNESCO 2015', '200+ penari dalam satu pertunjukan', 'Tanpa alat musik — hanya suara manusia'],
    origin: 'Bali, Indonesia',
    era: '1930-an hingga kini',
  },
  {
    id: 3,
    tag: 'Kuliner · UNESCO 2023',
    title: 'Rendang',
    titleFull: 'Rendang — Cita Rasa Paling Dicinta Dunia',
    sub: 'Masakan terlezat versi CNN & TasteAtlas',
    emoji: '🍖',
    className: 'c3',
    image: rendangImg,
    popupImages: [rendangPopup],
    description: `Rendang adalah masakan daging sapi berbumbu kaya rempah dari tradisi Minangkabau, Sumatera Barat. Dimasak dengan santan kelapa dan lebih dari 20 jenis rempah — cabai, serai, lengkuas, kunyit, jahe, dan kayu manis — selama berjam-jam hingga bumbu meresap sempurna dan cairan mengering.\n\nProses memasak rendang yang panjang bukan sekadar teknik kuliner; ia adalah filosofi kesabaran dan kebijaksanaan Minangkabau. Rendang kering dapat bertahan hingga sebulan tanpa lemari es karena kandungan antioksidan alami dari rempah-rempahnya.\n\nCNN Travel berulang kali menempatkan Rendang sebagai makanan terlezat di dunia dari 50 daftar terbaik. Pada 2023, Budaya Sehat Jamu dan masakan tradisional Indonesia masuk dalam daftar UNESCO, memperkuat posisi kuliner Indonesia di panggung dunia.`,
    facts: ['#1 makanan terlezat versi CNN', 'Tahan 1 bulan tanpa kulkas', '20+ jenis rempah', 'Simbol diplomasi kuliner Indonesia'],
    origin: 'Minangkabau, Sumatera Barat',
    era: 'Abad ke-16 hingga kini',
  },
  {
    id: 4,
    tag: 'Musik Tradisional · UNESCO 2021',
    title: 'Gamelan',
    titleFull: 'Gamelan — Harmoni Semesta Nusantara',
    sub: 'Menginspirasi Debussy & Reich',
    emoji: '🎵',
    className: 'c4',
    image: gamelanImg,
    popupImages: [gamelanPopup],
    description: `Gamelan adalah ansambel musik tradisional dari Jawa dan Bali yang terdiri dari instrumen perkusi logam — gong, kenong, saron, gender, bonang, dan kendang. Suaranya yang bergetar dan melingkar telah menginspirasi komposer dunia, termasuk Claude Debussy yang terpesona saat mendengar gamelan di Pameran Dunia Paris 1889.\n\nGamelan bukan sekadar musik; ia adalah sistem nilai dan kosmologi. Setiap perangkat gamelan dianggap sakral, diberi nama, dan diperlakukan dengan hormat. Memainkan gamelan mengajarkan harmoni kolektif — tidak ada satu instrumen pun yang mendominasi, semua saling melengkapi dalam keselarasan.\n\nPada Desember 2021, UNESCO resmi memasukkan Gamelan dalam Daftar Warisan Budaya Takbenda. Kini gamelan dimainkan di lebih dari 40 negara dan diajarkan di ratusan universitas di seluruh dunia.`,
    facts: ['Diakui UNESCO Desember 2021', 'Dimainkan di 40+ negara', 'Ratusan jenis instrumen', 'Menginspirasi Debussy & Steve Reich'],
    origin: 'Jawa & Bali, Indonesia',
    era: 'Abad ke-9 hingga kini',
  },
  {
    id: 5,
    tag: 'Seni Pertunjukan · UNESCO 2008',
    title: 'Wayang',
    titleFull: 'Wayang — Teater Bayangan Dunia',
    sub: '1,000 tahun warisan leluhur',
    emoji: '🎭',
    className: 'c5',
    image: wayangImg,
    popupImages: [wayangPopup],
    description: `Wayang adalah seni pertunjukan boneka bayangan yang terbuat dari kulit kerbau, dipahat dengan detail luar biasa dan dimainkan di balik layar putih yang diterangi lampu. Seorang dalang memainkan puluhan karakter sekaligus, bercerita sepanjang malam diiringi gamelan dan sinden.\n\nCerita wayang bersumber dari epos Mahabharata dan Ramayana yang diadaptasi dengan nuansa lokal Jawa yang kaya. Dalang adalah figur yang dihormati — ia sekaligus guru moral, filsuf, dan pencerita ulung. Pertunjukan wayang bisa berlangsung 8 jam penuh dari malam hingga subuh.\n\nUNESCO mengakui Wayang sebagai Masterpiece of Oral and Intangible Heritage of Humanity sejak 2003 dan dimasukkan ke Daftar Representatif pada 2008. Kini ada beragam jenis wayang — kulit, golek, wong, klitik — masing-masing dengan keunikannya sendiri.`,
    facts: ['Diakui UNESCO 2003 & 2008', '1,000+ tahun sejarah', '200+ karakter tokoh', 'Dalang bisa tampil 8 jam nonstop'],
    origin: 'Jawa & Bali, Indonesia',
    era: 'Abad ke-10 hingga kini',
  },
];

export default function CultureGrid() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState(null);

  const handleClose = () => setSelected(null);
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) handleClose();
  };

  return (
    <section className="section reveal">
      <div className="culture-header">
        <div>
          <div className="section-label">Koleksi Budaya</div>
          <h2 className="section-title">Temukan <em>Keajaiban</em><br />di Setiap Sudut</h2>
        </div>
        <p className="section-sub">
          Setiap budaya punya cerita. Jelajahi koleksi seni, tradisi, dan warisan dari seluruh Nusantara yang telah diakui UNESCO — dikurasi untuk pengalaman belajar terbaik.
        </p>
      </div>

      <div className="culture-grid">
        {cultures.map(culture => (
          <div
            key={culture.id}
            className={`culture-card ${culture.className}`}
            onClick={() => setSelected(culture)}
          >
            <div className="cc-bg">
              <img src={culture.image} alt={culture.title} className="cc-bg-img" />
            </div>
            <div className="cc-overlay"></div>
            <div className="cc-content">
              <div className="cc-tag">{culture.tag}</div>
              <div className="cc-title">{culture.title}</div>
              <div className="cc-sub">{culture.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ====== POPUP MODAL ====== */}
      {selected && (
        <div className="culture-modal-overlay" onClick={handleOverlayClick}>
          <div className="culture-modal">

            {/* Hero gambar — DIAM */}
            <div className="modal-hero-img">
              <img src={selected.popupImages[0]} alt={selected.titleFull} />
              <div className="modal-hero-gradient" />
              <button className="modal-close" onClick={handleClose}>✕</button>
              <div className="modal-hero-badge">{selected.tag}</div>
              <h2 className="modal-hero-title">{selected.titleFull}</h2>
            </div>

            {/* Scrollable content — HANYA BAGIAN INI YANG SCROLL */}
            <div className="modal-body">

              {/* Meta info strip */}
              <div className="modal-meta">
                <div className="modal-meta-item">
                  <span className="modal-meta-icon">📍</span>
                  <div>
                    <div className="modal-meta-label">Asal Daerah</div>
                    <div className="modal-meta-value">{selected.origin}</div>
                  </div>
                </div>
                <div className="modal-meta-divider" />
                <div className="modal-meta-item">
                  <span className="modal-meta-icon">⏳</span>
                  <div>
                    <div className="modal-meta-label">Periode</div>
                    <div className="modal-meta-value">{selected.era}</div>
                  </div>
                </div>
              </div>

              {/* Deskripsi */}
              <div className="modal-section">
                <h3 className="modal-section-title">
                  <span className="modal-section-bar" />
                  Sejarah & Deskripsi
                </h3>
                {selected.description.split('\n\n').map((para, i) => (
                  <p key={i} className="modal-desc-para">{para}</p>
                ))}
              </div>

              {/* Galeri — tampil jika ada lebih dari 1 gambar popup */}
              {selected.popupImages.length > 1 && (
                <div className="modal-section">
                  <h3 className="modal-section-title">
                    <span className="modal-section-bar" />
                    Galeri
                  </h3>
                  <div className="modal-gallery">
                    {selected.popupImages.map((img, i) => (
                      <img key={i} src={img} alt={`${selected.title} ${i + 1}`} className="modal-gallery-img" />
                    ))}
                  </div>
                </div>
              )}

              {/* Fakta */}
              <div className="modal-section">
                <h3 className="modal-section-title">
                  <span className="modal-section-bar" />
                  Fakta Menarik
                </h3>
                <div className="modal-facts">
                  {selected.facts.map((fact, i) => (
                    <div key={i} className="modal-fact-chip">
                      <span className="modal-fact-dot" />
                      {fact}
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </section>
  );
}
