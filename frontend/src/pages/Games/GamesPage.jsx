import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiCheckCircle, FiClock, FiRotateCw, FiAward } from 'react-icons/fi';
import QuizGame from './QuizGame';
import PuzzleGame from './PuzzleGame';
import { provinceApi } from '../../services/api';
import { getUserData, hasSeenGuestWarning, setGuestWarningSeen } from '../../utils/localStorage';
import { useAuth } from '../../context/AuthContext';
import GuestWarningModal from '../../components/GuestWarningModal';
import '../../styles/games.css';
import '../../styles/guestModal.css';

export default function GamesPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading, openAuthModal, getProvinceProgress, userProgress } = useAuth();
  const [activeGame, setActiveGame] = useState(null);
  const [province, setProvince] = useState(null);
  const [isGuestWarningOpen, setIsGuestWarningOpen] = useState(false);
  const [pendingGame, setPendingGame] = useState(null);

  const quizProgress = getProvinceProgress ? getProvinceProgress(slug, 'quiz') : { isCompleted: false, attempts: 0, highScore: 0, hasAttempted: false };
  const puzzleProgress = getProvinceProgress ? getProvinceProgress(slug, 'puzzle') : { isCompleted: false, attempts: 0, highScore: 0, hasAttempted: false };

  // Scroll to top on mount
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, []);

  // Check unlock status, then fetch province data (supports Guest Mode)
  useEffect(() => {
    // Tunggu verifikasi token / session selesai dulu sebelum cek data
    if (authLoading) return;

    if (!slug) return;

    const userData = getUserData();
    const isUnlocked = userData.unlockedRegions?.includes(slug);
    if (!isUnlocked) {
      navigate('/map-games');
      return;
    }

    let isMounted = true;
    async function fetchProvince() {
      try {
        const res = await provinceApi.getBySlug(slug);
        if (isMounted && res?.data) {
          setProvince({
            ...res.data,
            heroImage: res.data.hero_image || res.data.heroImage,
          });
          return;
        }
      } catch (err) {
        console.error('Failed to fetch province from API:', err.message);
      }
    }

    fetchProvince();
    return () => { isMounted = false; };
  }, [slug, navigate, user, authLoading, openAuthModal]);

  // Reveal animation on scroll
  useEffect(() => {
    const reveals = document.querySelectorAll('.reveal');
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
    }, { threshold: 0.12 });
    reveals.forEach(r => obs.observe(r));
    return () => obs.disconnect();
  }, [activeGame, province]);

  const handleBack = () => {
    if (activeGame) {
      setActiveGame(null);
    } else if (slug) {
      navigate(`/map-games-detail/${slug}`);
    } else {
      navigate('/');
    }
  };

  const handleLaunchGame = (gameType) => {
    if (!user && !hasSeenGuestWarning()) {
      setPendingGame(gameType);
      setIsGuestWarningOpen(true);
      return;
    }
    setActiveGame(gameType);
  };

  return (
    <div className="games-page">
      {!activeGame && (
        <div className="games-header reveal">
          {slug && (
            <button className="games-back-btn" onClick={handleBack}>
              ← Kembali ke Artikel
            </button>
          )}
          <div className="section-label">Mini Games</div>
          <h2 className="games-title">
            {province ? <>Tantangan <em>{province.name}</em></> : <>Belajar Sambil <em>Bermain</em></>}
          </h2>
          <p className="games-sub">
            {province
              ? `Uji pemahamanmu tentang ${province.name} — pilih Quiz atau Puzzle untuk mendapatkan reward!`
              : 'Dua game seru untuk menguji dan memperdalam pengetahuanmu tentang budaya Indonesia.'}
          </p>
          {province && (
            <div className="games-province-badge">
              <span className="games-province-region">{province.region}</span>
              <span className="games-province-name">{province.name}</span>
            </div>
          )}
        </div>
      )}

      {!activeGame && (
        <div className="games-select">
          <div className="game-select-card reveal">
            <div className="gsc-top" style={{background:'linear-gradient(135deg,#0A1A14,#1A4A30)'}}>
              <div className="gsc-badge-group">
                <div className="gsc-badge b-quiz">Quiz Budaya</div>
                <div className={`gsc-status-indicator ${quizProgress.isCompleted ? 'status-completed' : quizProgress.hasAttempted ? 'status-in-progress' : 'status-not-started'}`}>
                  {quizProgress.isCompleted ? (
                    <><FiCheckCircle /> Selesai</>
                  ) : quizProgress.hasAttempted ? (
                    <><FiRotateCw /> Sedang Belajar</>
                  ) : (
                    <><FiClock /> Belum Dikerjakan</>
                  )}
                </div>
              </div>
              <div className="gsc-icon" style={{background:'rgba(45,155,94,0.2)'}}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#40916C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
            </div>
            <div className="gsc-body">
              <div className="gsc-title">Quiz Budaya</div>
              <div className="gsc-desc">
                {province
                  ? `Jawab 5 pertanyaan tentang ${province.name}. Jawab semua dengan benar untuk klaim reward!`
                  : 'Jawab 10 pertanyaan tentang budaya, sejarah, dan tradisi Indonesia.'}
              </div>

              {/* Progress Tracker Card */}
              <div className="gsc-progress-box">
                <div className="gsc-progress-row">
                  <span className="gsc-progress-label">Status Pengerjaan:</span>
                  <span className={`gsc-progress-tag ${quizProgress.isCompleted ? 'status-completed' : quizProgress.hasAttempted ? 'status-in-progress' : 'status-not-started'}`}>
                    {quizProgress.isCompleted ? (
                      <><FiCheckCircle /> Sudah Selesai</>
                    ) : quizProgress.hasAttempted ? (
                      <><FiRotateCw /> Belum Lulus</>
                    ) : (
                      <><FiClock /> Belum Dikerjakan</>
                    )}
                  </span>
                </div>
                <div className="gsc-progress-stats">
                  <div className="gsc-stat-col">
                    <span className="gsc-stat-title">Jumlah Percobaan</span>
                    <span className="gsc-stat-number">{quizProgress.attempts > 0 ? `${quizProgress.attempts} kali` : '0 kali'}</span>
                  </div>
                  <div className="gsc-stat-col">
                    <span className="gsc-stat-title">Skor Tertinggi</span>
                    <span className="gsc-stat-number highlight-gold">
                      <FiAward className="stat-award-icon" /> {quizProgress.attempts > 0 ? `${quizProgress.highScore}/5` : '-'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="gsc-pills">
                <span className="gsc-pill">{province ? '5 Soal' : '10 Soal'}</span>
                <span className="gsc-pill">Pilihan Ganda</span>
                {province && <span className="gsc-pill">{province.name}</span>}
                <span className="gsc-pill">Skor Akhir</span>
              </div>
              <button className="gsc-cta" onClick={() => handleLaunchGame('quiz')}>
                {quizProgress.isCompleted ? 'Mainkan Lagi' : quizProgress.hasAttempted ? 'Lanjutkan Percobaan' : 'Mulai Quiz'}
              </button>
            </div>
          </div>

          <div className="game-select-card reveal">
            <div className="gsc-top" style={{background:'linear-gradient(135deg,#1A1508,#3D2E08)'}}>
              <div className="gsc-badge-group">
                <div className="gsc-badge b-puzzle">Puzzle</div>
                <div className={`gsc-status-indicator ${puzzleProgress.isCompleted ? 'status-completed' : puzzleProgress.hasAttempted ? 'status-in-progress' : 'status-not-started'}`}>
                  {puzzleProgress.isCompleted ? (
                    <><FiCheckCircle /> Selesai</>
                  ) : puzzleProgress.hasAttempted ? (
                    <><FiRotateCw /> Sedang Belajar</>
                  ) : (
                    <><FiClock /> Belum Dikerjakan</>
                  )}
                </div>
              </div>
              <div className="gsc-icon" style={{background:'rgba(201,168,76,0.15)'}}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
                  <line x1="7" y1="7" x2="7.01" y2="7"/>
                </svg>
              </div>
            </div>
            <div className="gsc-body">
              <div className="gsc-title">Puzzle Nusantara</div>
              <div className="gsc-desc">
                {province
                  ? `Susun gambar budaya ${province.name} menjadi sempurna untuk klaim reward!`
                  : 'Susun kepingan gambar budaya Indonesia menjadi gambar yang sempurna.'}
              </div>

              {/* Progress Tracker Card */}
              <div className="gsc-progress-box">
                <div className="gsc-progress-row">
                  <span className="gsc-progress-label">Status Pengerjaan:</span>
                  <span className={`gsc-progress-tag ${puzzleProgress.isCompleted ? 'status-completed' : puzzleProgress.hasAttempted ? 'status-in-progress' : 'status-not-started'}`}>
                    {puzzleProgress.isCompleted ? (
                      <><FiCheckCircle /> Sudah Selesai</>
                    ) : puzzleProgress.hasAttempted ? (
                      <><FiRotateCw /> Belum Selesai</>
                    ) : (
                      <><FiClock /> Belum Dikerjakan</>
                    )}
                  </span>
                </div>
                <div className="gsc-progress-stats">
                  <div className="gsc-stat-col">
                    <span className="gsc-stat-title">Jumlah Percobaan</span>
                    <span className="gsc-stat-number">{puzzleProgress.attempts > 0 ? `${puzzleProgress.attempts} kali` : '0 kali'}</span>
                  </div>
                  <div className="gsc-stat-col">
                    <span className="gsc-stat-title">Skor Tertinggi</span>
                    <span className="gsc-stat-number highlight-gold">
                      <FiAward className="stat-award-icon" /> {puzzleProgress.attempts > 0 ? `${puzzleProgress.highScore}` : '-'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="gsc-pills">
                <span className="gsc-pill">Drag & Drop</span>
                <span className="gsc-pill">4x4 Grid</span>
                {province && <span className="gsc-pill">{province.name}</span>}
                <span className="gsc-pill">Hitung Langkah</span>
              </div>
              <button className="gsc-cta" onClick={() => handleLaunchGame('puzzle')}>
                {puzzleProgress.isCompleted ? 'Mainkan Lagi' : puzzleProgress.hasAttempted ? 'Lanjutkan Percobaan' : 'Mulai Puzzle'}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeGame === 'quiz' && (
        <QuizGame
          onBack={() => setActiveGame(null)}
          provinceSlug={slug}
          provinceName={province?.name}
        />
      )}
      {activeGame === 'puzzle' && (
        <PuzzleGame
          onBack={() => setActiveGame(null)}
          provinceSlug={slug}
          province={province}
        />
      )}

      {/* Guest Mode Warning Modal */}
      <GuestWarningModal
        isOpen={isGuestWarningOpen}
        onClose={() => {
          setGuestWarningSeen();
          setIsGuestWarningOpen(false);
          setPendingGame(null);
        }}
        onProceed={() => {
          setGuestWarningSeen();
          setIsGuestWarningOpen(false);
          if (pendingGame) {
            setActiveGame(pendingGame);
            setPendingGame(null);
          }
        }}
        onRegister={() => {
          setGuestWarningSeen();
          setIsGuestWarningOpen(false);
          setPendingGame(null);
          openAuthModal('register');
        }}
        provinceName={province?.name}
      />
    </div>
  );
}
