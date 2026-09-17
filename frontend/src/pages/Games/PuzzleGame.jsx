import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiRefreshCw, FiEye, FiArrowLeft, FiAward, FiCheckCircle, FiKey, FiAlertCircle, FiCheck } from 'react-icons/fi';
import { markGameCompleted, claimProvinceReward, hasClaimedReward, getUserData } from '../../utils/localStorage';
import { getDifficultyInfo } from './MapPage';
import '../../styles/puzzle.css';

const GRID = 3; // 3×3 = 9 kepingan — gambar lebih jelas, tidak terpotong

const PROVINCE_PUZZLES = {
  'aceh':             ['/images/provinces/aceh-hero.jpg', '/images/culture/Aceh/aceh-1.jpg', '/images/culture/Aceh/aceh-2.jpg'],
  'sumatera-utara':   ['/images/provinces/sumut-hero.jpg', '/images/culture/Sumatra_Utara/sumut-1.jpg', '/images/culture/Sumatra_Utara/sumut-2.jpg'],
  'sumatera-barat':   ['/images/provinces/sumbar-hero.jpg', '/images/culture/Sumatra_Barat/sumbar-1.jpg', '/images/culture/Sumatra_Barat/sumbar-2.jpg'],
  'riau':             ['/images/provinces/riau-hero.jpg', '/images/culture/Riau/riau-1.jpg', '/images/culture/Riau/riau-2.jpg'],
  'kepulauan-riau':   ['/images/provinces/kepri-hero.jpg', '/images/culture/Kepulauan_Riau/kepri-1.jpg', '/images/culture/Kepulauan_Riau/kepri-2.jpg'],
  'dki-jakarta':      ['/images/provinces/jakarta-hero.jpg', '/images/culture/Jakarta/jkt-1.jpg', '/images/culture/Jakarta/jkt-2.jpg'],
  'jawa-barat':       ['/images/provinces/jabar-hero.jpg', '/images/culture/Jawa_Barat/jabar-1.jpg', '/images/culture/Jawa_Barat/jabar-2.jpg'],
  'banten':           ['/images/provinces/banten-hero.jpg', '/images/culture/Banten/banten-1.jpg', '/images/culture/Banten/banten-2.jpg'],
  'jawa-tengah':      ['/images/provinces/jateng-hero.jpg', '/images/culture/Jawa_Tengah/jateng-1.jpg', '/images/culture/Jawa_Tengah/jateng-2.jpg'],
  'yogyakarta':       ['/images/provinces/jogja-hero.jpg', '/images/culture/Jogja/jogja-1.jpg', '/images/culture/Jogja/jogja-2.jpg'],
  'jawa-timur':       ['/images/provinces/jatim-hero.jpg', '/images/culture/Jawa_Timur/jatim-1.jpg', '/images/culture/Jawa_Timur/jatim-2.jpg'],
  'bali':             ['/images/provinces/bali-hero.jpg', '/images/culture/Bali/bali-1.jpg', '/images/culture/Bali/bali-2.jpg'],
  'sulawesi-selatan': ['/images/provinces/sulsel-hero.jpg', '/images/culture/Sulawesi_Selatan/sulsel-1.jpg', '/images/culture/Sulawesi_Selatan/sulsel-2.jpg'],
  'maluku':           ['/images/provinces/maluku-hero.jpg', '/images/culture/Maluku/maluku-1.jpg', '/images/culture/Maluku/maluku-2.jpg'],
  'papua':            ['/images/provinces/papua-hero.jpg', '/images/culture/Papua/papua-1.jpg', '/images/culture/Papua/papua-2.jpg'],
};

const FALLBACK = ['/images/provinces/bali-hero.jpg', '/images/provinces/jabar-hero.jpg', '/images/provinces/jatim-hero.jpg'];

function getPuzzleImages(slug) {
  if (slug && PROVINCE_PUZZLES[slug]) return PROVINCE_PUZZLES[slug];
  return FALLBACK;
}

export default function PuzzleGame({ onBack, provinceSlug, province }) {
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const stageRef = useRef(null);
  const imgRef = useRef(null);
  const piecesRef = useRef([]);
  const draggingRef = useRef(null);
  const dropTargetRef = useRef(null);
  const sizeRef = useRef({ w: 480, h: 360, pw: 120, ph: 90 });

  const puzzleImages = getPuzzleImages(provinceSlug);
  const TOTAL_ROUNDS = puzzleImages.length;

  const [round, setRound] = useState(0);
  const [moves, setMoves] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [checkResult, setCheckResult] = useState(null);
  const [allDone, setAllDone] = useState(false);
  const [rewardToast, setRewardToast] = useState(null); // { keys, total }
  const [alreadyClaimed] = useState(() => provinceSlug ? hasClaimedReward(provinceSlug) : false);

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, []);

  // Compute canvas size — use canvas rendered size (CSS aspect-ratio handles height)
  const computeSize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const w = Math.round(rect.width)  || canvas.offsetWidth  || 480;
    const h = Math.round(rect.height) || canvas.offsetHeight || 360;
    const pw = w / GRID;
    const ph = h / GRID;
    // Set canvas internal resolution to match display size
    canvas.width = w;
    canvas.height = h;
    sizeRef.current = { w, h, pw, ph };
    return { w, h, pw, ph };
  }, []);

  function buildPieces(img, w, h, pw, ph) {
    const scaleX = w / img.width;
    const scaleY = h / img.height;
    const scale = Math.max(scaleX, scaleY);
    const scaledW = img.width * scale;
    const scaledH = img.height * scale;
    const offsetX = (scaledW - w) / 2;
    const offsetY = (scaledH - h) / 2;

    const pieces = [];
    for (let row = 0; row < GRID; row++) {
      for (let col = 0; col < GRID; col++) {
        pieces.push({
          id: row * GRID + col,
          sx: (offsetX + col * pw) / scale,
          sy: (offsetY + row * ph) / scale,
          sw: pw / scale,
          sh: ph / scale,
          correctX: col * pw,
          correctY: row * ph,
          xPos: col * pw,
          yPos: row * ph,
        });
      }
    }
    return pieces;
  }

  function drawPieces(ctx, img, pieces) {
    const { w, h, pw, ph } = sizeRef.current;
    ctx.clearRect(0, 0, w, h);
    pieces.forEach(p => {
      ctx.drawImage(img, p.sx, p.sy, p.sw, p.sh, p.xPos, p.yPos, pw, ph);
      ctx.strokeStyle = 'rgba(201,168,76,0.5)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(p.xPos + 0.75, p.yPos + 0.75, pw - 1.5, ph - 1.5);
    });
  }

  function initPuzzle(img) {
    const { w, h, pw, ph } = sizeRef.current;
    const pieces = buildPieces(img, w, h, pw, ph);
    const positions = pieces.map(p => ({ xPos: p.xPos, yPos: p.yPos }));
    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [positions[i], positions[j]] = [positions[j], positions[i]];
    }
    pieces.forEach((p, i) => { p.xPos = positions[i].xPos; p.yPos = positions[i].yPos; });
    piecesRef.current = pieces;
    drawPieces(stageRef.current, img, pieces);
  }

  // Load image when round changes — use rAF to ensure canvas is rendered first
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const load = () => {
      const size = computeSize();
      if (!size) return;
      stageRef.current = canvas.getContext('2d');

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        imgRef.current = img;
        initPuzzle(img);
        setMoves(0);
        setCheckResult(null);
      };
      img.src = puzzleImages[round];
    };

    // rAF ensures CSS aspect-ratio has been applied before we read dimensions
    const raf = requestAnimationFrame(load);
    return () => cancelAnimationFrame(raf);
  }, [round]);

  // Resize observer — rebuild pieces preserving grid positions
  useEffect(() => {
    let lastW = 0;
    const ro = new ResizeObserver(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const newW = Math.round(canvas.getBoundingClientRect().width);
      if (Math.abs(newW - lastW) < 2) return;
      lastW = newW;
      const oldPw = sizeRef.current.pw;
      const oldPh = sizeRef.current.ph;
      const oldPieces = [...piecesRef.current];
      const size = computeSize();
      if (!size || !imgRef.current || !stageRef.current) return;
      // Rebuild pieces, preserve grid slot positions
      const pieces = buildPieces(imgRef.current, size.w, size.h, size.pw, size.ph);
      if (oldPw > 0) {
        pieces.forEach((p, i) => {
          if (oldPieces[i]) {
            const col = Math.round(oldPieces[i].xPos / oldPw);
            const row = Math.round(oldPieces[i].yPos / oldPh);
            p.xPos = Math.max(0, col) * size.pw;
            p.yPos = Math.max(0, row) * size.ph;
          }
        });
      }
      piecesRef.current = pieces;
      drawPieces(stageRef.current, imgRef.current, pieces);
    });
    if (canvasRef.current) ro.observe(canvasRef.current);
    return () => ro.disconnect();
  }, []);

  function getPos(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    const { w, h } = sizeRef.current;
    const scaleX = w / rect.width;
    const scaleY = h / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  }

  function hitPiece(x, y) {
    const { pw, ph } = sizeRef.current;
    return piecesRef.current.find(p => x >= p.xPos && x < p.xPos + pw && y >= p.yPos && y < p.yPos + ph) || null;
  }

  function onMouseDown(e) {
    e.preventDefault();
    const { x, y } = getPos(e);
    draggingRef.current = hitPiece(x, y);
  }

  function onMouseMove(e) {
    e.preventDefault();
    if (!draggingRef.current) return;
    const pos = getPos(e);
    const { pw, ph } = sizeRef.current;
    const ctx = stageRef.current;
    const img = imgRef.current;
    dropTargetRef.current = null;

    const { w, h } = sizeRef.current;
    ctx.clearRect(0, 0, w, h);
    piecesRef.current.forEach(piece => {
      if (piece === draggingRef.current) return;
      ctx.drawImage(img, piece.sx, piece.sy, piece.sw, piece.sh, piece.xPos, piece.yPos, pw, ph);
      ctx.strokeStyle = 'rgba(201,168,76,0.5)'; ctx.lineWidth = 1.5;
      ctx.strokeRect(piece.xPos + 0.75, piece.yPos + 0.75, pw - 1.5, ph - 1.5);
      const hit = hitPiece(pos.x, pos.y);
      if (!dropTargetRef.current && hit === piece) {
        dropTargetRef.current = piece;
        ctx.save(); ctx.globalAlpha = 0.3; ctx.fillStyle = '#C9A84C';
        ctx.fillRect(piece.xPos, piece.yPos, pw, ph); ctx.restore();
      }
    });
    ctx.save(); ctx.globalAlpha = 0.85;
    ctx.drawImage(img, draggingRef.current.sx, draggingRef.current.sy, draggingRef.current.sw, draggingRef.current.sh,
      pos.x - pw / 2, pos.y - ph / 2, pw, ph);
    ctx.restore();
    ctx.strokeStyle = '#C9A84C'; ctx.lineWidth = 2;
    ctx.strokeRect(pos.x - pw / 2 + 0.75, pos.y - ph / 2 + 0.75, pw - 1.5, ph - 1.5);
  }

  function onMouseUp(e) {
    e.preventDefault();
    if (draggingRef.current && dropTargetRef.current) {
      const a = draggingRef.current, b = dropTargetRef.current;
      [a.xPos, b.xPos] = [b.xPos, a.xPos];
      [a.yPos, b.yPos] = [b.yPos, a.yPos];
      setMoves(m => m + 1);
    }
    if (imgRef.current) drawPieces(stageRef.current, imgRef.current, piecesRef.current);
    draggingRef.current = null;
    dropTargetRef.current = null;
  }

  function checkAnswer() {
    const correct = piecesRef.current.every(p =>
      Math.abs(p.xPos - p.correctX) < 4 && Math.abs(p.yPos - p.correctY) < 4
    );
    setCheckResult(correct ? 'correct' : 'wrong');
  }

  function handleCorrectNext() {
    setCheckResult(null);
    if (round + 1 >= TOTAL_ROUNDS) {
      // Semua round selesai — auto-claim reward
      if (provinceSlug) {
        markGameCompleted(provinceSlug, 'puzzle');
        if (!hasClaimedReward(provinceSlug)) {
          const { keyReward } = getDifficultyInfo(provinceSlug);
          const success = claimProvinceReward(provinceSlug, keyReward);
          if (success) {
            const userData = getUserData();
            setRewardToast({ keys: keyReward, total: userData.keys });
            setTimeout(() => setRewardToast(null), 4000);
          }
        }
      }
      setAllDone(true);
    } else {
      setRound(r => r + 1);
    }
  }

  function handleWrongRetry() {
    setCheckResult(null);
    if (imgRef.current) initPuzzle(imgRef.current);
    setMoves(0);
  }

  function handleRestart() {
    setRound(0);
    setAllDone(false);
    setCheckResult(null);
    setMoves(0);
  }

  const currentSrc = puzzleImages[round];
  const provinceName = province?.name || provinceSlug || 'Nusantara';
  const diffInfo = provinceSlug ? getDifficultyInfo(provinceSlug) : { keyReward: 1 };

  return (
    <div className="puzzle-page">
      <div className="puzzle-bg-deco" />

      {/* Toast popup kanan atas */}
      {rewardToast && (
        <div className="reward-toast-popup">
          <FiKey className="rtp-icon" />
          <div className="rtp-text">
            <span className="rtp-title">+{rewardToast.keys} Kunci Didapat!</span>
            <span className="rtp-sub">Total kunci: {rewardToast.total}</span>
          </div>
        </div>
      )}

      {/* Topbar */}
      <div className="puzzle-topbar">
        <button className="puzzle-back-btn" onClick={onBack || (() => navigate('/games'))}>
          <FiArrowLeft /> Kembali
        </button>
        <div className="puzzle-topbar-center">
          <span className="puzzle-topbar-label">Puzzle Nusantara</span>
          <span className="puzzle-topbar-sub">{provinceName} — Gambar {round + 1}/{TOTAL_ROUNDS}</span>
        </div>
        <div className="puzzle-stat-chip">
          <span className="puzzle-stat-val">{moves}</span>
          <span className="puzzle-stat-lbl">Langkah</span>
        </div>
      </div>

      {/* Round progress dots */}
      <div className="puzzle-rounds">
        {Array.from({ length: TOTAL_ROUNDS }).map((_, i) => (
          <div key={i} className={`puzzle-round-dot ${i < round ? 'done' : i === round ? 'active' : ''}`} />
        ))}
      </div>

      {/* Main */}
      <div className="puzzle-main">
        {/* Canvas Area */}
        <div className="puzzle-canvas-area">
          <div className="puzzle-canvas-frame">
            <canvas
              ref={canvasRef}
              className="puzzle-canvas noselect"
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseUp}
              onTouchStart={onMouseDown}
              onTouchMove={onMouseMove}
              onTouchEnd={onMouseUp}
            />
          </div>
          <div className="puzzle-canvas-below">
            <p className="puzzle-canvas-hint">Drag & drop kepingan untuk menukar posisi</p>
            <button className="puzzle-check-btn" onClick={checkAnswer}>
              <FiCheck /> Cek Jawaban
            </button>
          </div>
        </div>

        {/* Side panel */}
        <div className="puzzle-side">
          <div className="puzzle-side-section">
            <div className="puzzle-side-label">Aksi</div>
            <button className="puzzle-action-btn" onClick={() => { if (imgRef.current) initPuzzle(imgRef.current); setMoves(0); }}>
              <FiRefreshCw /> Acak Ulang
            </button>
            <button className="puzzle-action-btn puzzle-action-hint" onClick={() => setShowHint(true)}>
              <FiEye /> Lihat Petunjuk
            </button>
          </div>

          <div className="puzzle-side-section">
            <div className="puzzle-side-label">Gambar {round + 1} dari {TOTAL_ROUNDS}</div>
            <div className="puzzle-thumb-item active">
              <img src={currentSrc} alt={provinceName} />
              <span>{provinceName}</span>
            </div>
          </div>

          <div className="puzzle-side-section">
            <div className="puzzle-side-label">Progress</div>
            <div className="puzzle-progress-info">
              {Array.from({ length: TOTAL_ROUNDS }).map((_, i) => (
                <div key={i} className={`puzzle-progress-item ${i < round ? 'done' : i === round ? 'active' : ''}`}>
                  <span className="puzzle-progress-num">{i + 1}</span>
                  <span className="puzzle-progress-lbl">{i < round ? 'Selesai' : i === round ? 'Sedang' : 'Belum'}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="puzzle-side-section">
            <div className="puzzle-side-label">Tingkat</div>
            <div className="puzzle-difficulty-info">
              <span className="puzzle-diff-badge">{GRID}×{GRID}</span>
              <span className="puzzle-diff-text">{GRID * GRID} kepingan</span>
            </div>
          </div>

          {provinceSlug && (
            <div className="puzzle-side-section">
              <div className="puzzle-side-label">Reward</div>
              {alreadyClaimed
                ? <div className="puzzle-reward-done"><FiCheckCircle /> Reward diklaim</div>
                : <p className="puzzle-reward-hint">Selesaikan 3 puzzle untuk dapat +{diffInfo.keyReward} kunci otomatis!</p>
              }
            </div>
          )}
        </div>
      </div>

      {/* Hint Modal */}
      {showHint && (
        <div className="puzzle-modal-overlay" onClick={() => setShowHint(false)}>
          <div className="puzzle-modal" onClick={e => e.stopPropagation()}>
            <div className="puzzle-modal-header">
              <span>Petunjuk Gambar {round + 1}</span>
              <button onClick={() => setShowHint(false)}>×</button>
            </div>
            <img src={currentSrc} alt="Hint" className="puzzle-hint-img" />
            <p className="puzzle-hint-caption">{provinceName}</p>
          </div>
        </div>
      )}

      {/* Check Result Modal */}
      {checkResult && (
        <div className="puzzle-modal-overlay">
          <div className={`puzzle-modal puzzle-check-modal ${checkResult}`}>
            <div className={`puzzle-check-icon ${checkResult}`}>
              {checkResult === 'correct' ? <FiCheckCircle /> : <FiAlertCircle />}
            </div>
            <h2 className="puzzle-check-title">
              {checkResult === 'correct' ? 'Benar!' : 'Belum Tepat'}
            </h2>
            <p className="puzzle-check-msg">
              {checkResult === 'correct'
                ? round + 1 < TOTAL_ROUNDS
                  ? `Gambar ${round + 1} selesai! Lanjut ke gambar berikutnya.`
                  : 'Semua gambar berhasil disusun! Kamu luar biasa!'
                : 'Susunan belum tepat. Coba lagi dan perhatikan petunjuk gambar!'}
            </p>
            {checkResult === 'correct' ? (
              <button className="puzzle-win-btn puzzle-win-btn--primary" onClick={handleCorrectNext}>
                {round + 1 < TOTAL_ROUNDS ? 'Gambar Berikutnya →' : 'Lihat Hasil'}
              </button>
            ) : (
              <button className="puzzle-win-btn puzzle-win-btn--retry" onClick={handleWrongRetry}>
                <FiRefreshCw /> Coba Lagi
              </button>
            )}
          </div>
        </div>
      )}

      {/* All Done Modal */}
      {allDone && (
        <div className="puzzle-modal-overlay">
          <div className="puzzle-modal puzzle-win-modal">
            <div className="puzzle-win-icon"><FiAward /></div>
            <h2 className="puzzle-win-title">Semua Puzzle Selesai!</h2>
            <p className="puzzle-win-sub">Kamu berhasil menyusun <strong>3 gambar {provinceName}</strong></p>

            {provinceSlug && (
              <div className="puzzle-win-reward">
                {alreadyClaimed ? (
                  <div className="claim-reward-done"><FiCheckCircle /> Reward sudah pernah diklaim</div>
                ) : (
                  <div className="claim-reward-done"><FiKey /> +{diffInfo.keyReward} Kunci berhasil ditambahkan!</div>
                )}
              </div>
            )}

            <div className="puzzle-win-actions">
              <button className="puzzle-win-btn puzzle-win-btn--primary" onClick={handleRestart}>
                <FiRefreshCw /> Main Lagi
              </button>
              <button className="puzzle-win-btn" onClick={onBack}>
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
