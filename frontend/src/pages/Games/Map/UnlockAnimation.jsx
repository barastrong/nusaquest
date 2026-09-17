import { useEffect, useRef } from 'react';
import { FiKey } from 'react-icons/fi';
import '../../../styles/unlock-anim.css';

// Generate random particles for canvas confetti
function drawParticles(canvas) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width = window.innerWidth;
  const H = canvas.height = window.innerHeight;

  const COLORS = ['#C9A84C', '#f7b24f', '#ffd082', '#40916C', '#6fcf97', '#fff'];
  const particles = Array.from({ length: 80 }, () => ({
    x: W / 2 + (Math.random() - 0.5) * 200,
    y: H / 2 + (Math.random() - 0.5) * 100,
    vx: (Math.random() - 0.5) * 14,
    vy: -(Math.random() * 12 + 4),
    size: Math.random() * 7 + 3,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    alpha: 1,
    rot: Math.random() * Math.PI * 2,
    rotV: (Math.random() - 0.5) * 0.3,
    shape: Math.random() > 0.5 ? 'rect' : 'circle',
  }));

  let frame;
  const tick = () => {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.35; // gravity
      p.alpha -= 0.012;
      p.rot += p.rotV;
      if (p.alpha <= 0) return;
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      if (p.shape === 'rect') {
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });
    if (particles.some(p => p.alpha > 0)) {
      frame = requestAnimationFrame(tick);
    }
  };
  frame = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(frame);
}

export default function UnlockAnimation({ regionName, difficulty, color, onDone }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    // Start particles after key animation (0.8s delay)
    const t = setTimeout(() => {
      if (canvasRef.current) drawParticles(canvasRef.current);
    }, 800);

    // Auto-close after 3.2s
    const done = setTimeout(onDone, 3200);
    return () => { clearTimeout(t); clearTimeout(done); };
  }, []);

  return (
    <div className="unlock-overlay" onClick={onDone}>
      {/* Particle canvas */}
      <canvas ref={canvasRef} className="unlock-canvas" />

      {/* Radial glow burst */}
      <div className="unlock-glow" style={{ '--unlock-color': color }} />

      {/* Center card */}
      <div className="unlock-card" onClick={e => e.stopPropagation()}>
        {/* Ring pulse */}
        <div className="unlock-ring" style={{ '--unlock-color': color }} />
        <div className="unlock-ring unlock-ring--2" style={{ '--unlock-color': color }} />

        {/* Key icon — spins then unlocks */}
        <div className="unlock-key-wrap">
          <div className="unlock-key-icon" style={{ color }}>
            <FiKey />
          </div>
          <div className="unlock-sparkles">
            {[...Array(6)].map((_, i) => (
              <span key={i} className="unlock-spark" style={{ '--i': i, '--c': color }} />
            ))}
          </div>
        </div>

        {/* Text */}
        <div className="unlock-label">Provinsi Terbuka!</div>
        <div className="unlock-name" style={{ color }}>{regionName}</div>
        <div className="unlock-badge" style={{ background: color + '22', border: `1px solid ${color}`, color }}>
          Level {difficulty}
        </div>
        <p className="unlock-hint">Klik di mana saja untuk melanjutkan</p>
      </div>
    </div>
  );
}
