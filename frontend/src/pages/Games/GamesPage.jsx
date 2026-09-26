import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiCheckCircle, FiClock, FiRotateCw, FiAward } from 'react-icons/fi';
import QuizGame from './QuizGame';
import PuzzleGame from './PuzzleGame';
import { provinceApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import GuestWarningModal from '../../components/GuestWarningModal';
import { QUIZ_QUESTION_COUNT } from '../../utils/progress';
import '../../styles/games.css';
import '../../styles/guestModal.css';

export default function GamesPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const {
    user,
    loading: authLoading,
    progressLoading,
    openAuthModal,
    getProvinceProgress,
    isRegionUnlocked,
    guestWarningSeen,
    markGuestWarningSeen,
  } = useAuth();
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
    // Tunggu verifikasi token & pemuatan progres selesai sebelum cek data
    if (authLoading || progressLoading) return;

    if (!slug) return;

    const isUnlocked = isRegionUnlocked(slug);
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
  }, [slug, navigate, user, authLoading, progressLoading, isRegionUnlocked]);

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
    if (!user && !guestWarningSeen) {
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
          {/* Quiz Card */}
          <div className="game-select-card reveal">
            <div
              className="gsc-top gsc-top-quiz"
              style={province?.heroImage ? {
                backgroundImage: `url(${province.heroImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              } : {}}
            >
              <div className="gsc-top-overlay" />
              <div className="gsc-top-content">
                <div className="gsc-badge-group">
                  <div className="gsc-badge b-quiz">Quiz Budaya</div>
                  <div className={`gsc-status-indicator ${quizProgress.isCompleted ? 'status-completed' : quizProgress.hasAttempted ? 'status-in-progress' : 'status-not-started'}`}>
                    {quizProgress.isCompleted ? <><FiCheckCircle /> Selesai</> : quizProgress.hasAttempted ? <><FiRotateCw /> Sedang Belajar</> : <><FiClock /> Belum Dikerjakan</>}
                  </div>
                </div>
                <div className="gsc-top-bottom">
                  <div className="gsc-icon" style={{background:'rgba(45,155,94,0.25)', border:'1px solid rgba(45,155,94,0.4)'}}>
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#6fcf97" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                      <line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                  </div>
                  <div className="gsc-top-label">
                    <span className="gsc-top-title">Quiz Budaya</span>
                    <span className="gsc-top-sub">{province ? province.name : 'Nusantara'}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="gsc-body">
              <div className="gsc-desc">
                {province
                  ? `Jawab ${QUIZ_QUESTION_COUNT} pertanyaan tentang ${province.name}. Jawab semua dengan benar untuk klaim reward!`
                  : `Jawab ${QUIZ_QUESTION_COUNT} pertanyaan tentang budaya, sejarah, dan tradisi Indonesia.`}
              </div>
              <div className="gsc-stats">
                <div className="gsc-stat">
                  <span className="gsc-stat-value">{quizProgress.attempts || 0}</span>
                  <span className="gsc-stat-label">Percobaan</span>
                </div>
                <div className="gsc-stat">
                  <span className="gsc-stat-value highlight-gold">
                    <FiAward className="stat-award-icon" /> {quizProgress.attempts > 0 ? `${quizProgress.highScore}/${QUIZ_QUESTION_COUNT}` : '-'}
                  </span>
                  <span className="gsc-stat-label">Skor Terbaik</span>
                </div>
                <div className="gsc-stat">
                  <span className={`gsc-stat-value ${quizProgress.isCompleted ? 'highlight-green' : ''}`}>
                    {quizProgress.isCompleted ? 'Lulus' : quizProgress.hasAttempted ? 'Belum' : '—'}
                  </span>
                  <span className="gsc-stat-label">Status</span>
                </div>
              </div>
              <div className="gsc-pills">
                <span className="gsc-pill">{`${QUIZ_QUESTION_COUNT} Soal`}</span>
                <span className="gsc-pill">Pilihan Ganda</span>
                <span className="gsc-pill">Skor Akhir</span>
              </div>
              <button className="gsc-cta" onClick={() => handleLaunchGame('quiz')}>
                {quizProgress.isCompleted ? 'Mainkan Lagi' : quizProgress.hasAttempted ? 'Lanjutkan Percobaan' : 'Mulai Quiz'}
              </button>
            </div>
          </div>

          {/* Puzzle Card */}
          <div className="game-select-card reveal">
            <div
              className="gsc-top gsc-top-puzzle"
              style={province?.heroImage ? {
                backgroundImage: `url(${province.heroImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center top',
              } : {}}
            >
              <div className="gsc-top-overlay gsc-top-overlay-gold" />
              <div className="gsc-top-content">
                <div className="gsc-badge-group">
                  <div className="gsc-badge b-puzzle">Puzzle</div>
                  <div className={`gsc-status-indicator ${puzzleProgress.isCompleted ? 'status-completed' : puzzleProgress.hasAttempted ? 'status-in-progress' : 'status-not-started'}`}>
                    {puzzleProgress.isCompleted ? <><FiCheckCircle /> Selesai</> : puzzleProgress.hasAttempted ? <><FiRotateCw /> Sedang Belajar</> : <><FiClock /> Belum Dikerjakan</>}
                  </div>
                </div>
                <div className="gsc-top-bottom">
                  <div className="gsc-icon" style={{background:'rgba(201,168,76,0.2)', border:'1px solid rgba(201,168,76,0.4)'}}>
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
                      <line x1="7" y1="7" x2="7.01" y2="7"/>
                    </svg>
                  </div>
                  <div className="gsc-top-label">
                    <span className="gsc-top-title">Puzzle Nusantara</span>
                    <span className="gsc-top-sub">{province ? province.name : 'Nusantara'}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="gsc-body">
              <div className="gsc-desc">
                {province
                  ? `Susun gambar budaya ${province.name} menjadi sempurna untuk klaim reward!`
                  : 'Susun kepingan gambar budaya Indonesia menjadi gambar yang sempurna.'}
              </div>
              <div className="gsc-stats">
                <div className="gsc-stat">
                  <span className="gsc-stat-value">{puzzleProgress.attempts || 0}</span>
                  <span className="gsc-stat-label">Percobaan</span>
                </div>
                <div className="gsc-stat">
                  <span className="gsc-stat-value highlight-gold">
                    <FiAward className="stat-award-icon" /> {puzzleProgress.attempts > 0 ? `${puzzleProgress.highScore}` : '-'}
                  </span>
                  <span className="gsc-stat-label">Skor Terbaik</span>
                </div>
                <div className="gsc-stat">
                  <span className={`gsc-stat-value ${puzzleProgress.isCompleted ? 'highlight-green' : ''}`}>
                    {puzzleProgress.isCompleted ? 'Selesai' : puzzleProgress.hasAttempted ? 'Belum' : '—'}
                  </span>
                  <span className="gsc-stat-label">Status</span>
                </div>
              </div>
              <div className="gsc-pills">
                <span className="gsc-pill">3x3 Grid</span>
                <span className="gsc-pill">Drag & Drop</span>
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
          markGuestWarningSeen();
          setIsGuestWarningOpen(false);
          setPendingGame(null);
        }}
        onProceed={() => {
          markGuestWarningSeen();
          setIsGuestWarningOpen(false);
          if (pendingGame) {
            setActiveGame(pendingGame);
            setPendingGame(null);
          }
        }}
        onRegister={() => {
          markGuestWarningSeen();
          setIsGuestWarningOpen(false);
          setPendingGame(null);
          openAuthModal('register');
        }}
        provinceName={province?.name}
      />
    </div>
  );
}
