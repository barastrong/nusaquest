import { useAuth } from '../context/AuthContext';
import '../styles/gameHistoryModal.css';

export default function GameHistoryModal() {
  const {
    user,
    gameHistory,
    isHistoryModalOpen,
    closeHistoryModal,
  } = useAuth();

  if (!isHistoryModalOpen) return null;

  const totalScore = gameHistory.reduce((acc, curr) => acc + (curr.score || 0), 0);
  const totalPassed = gameHistory.filter((item) => item.passed).length;

  const formatDate = (isoString) => {
    if (!isoString) return '-';
    const date = new Date(isoString);
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatProvince = (slug) => {
    if (!slug) return '';
    return slug
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  };

  return (
    <div className="history-modal-overlay" onClick={closeHistoryModal}>
      <div className="history-modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="history-modal-close" onClick={closeHistoryModal} aria-label="Tutup">
          ✕
        </button>

        <div className="history-modal-header">
          <div className="history-user-info">
            <div className="history-avatar">
              {(user?.display_name || user?.username || 'U').charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="history-user-name">{user?.display_name || user?.username}</h2>
              <p className="history-user-handle">@{user?.username}</p>
            </div>
          </div>
          <div className="history-stats-bar">
            <div className="history-stat-item">
              <span className="stat-num">{gameHistory.length}</span>
              <span className="stat-lbl">Sesi Main</span>
            </div>
            <div className="history-stat-item">
              <span className="stat-num">{totalScore}</span>
              <span className="stat-lbl">Total Skor</span>
            </div>
            <div className="history-stat-item">
              <span className="stat-num">{totalPassed}</span>
              <span className="stat-lbl">Lulus</span>
            </div>
          </div>
        </div>

        <div className="history-content">
          <h3 className="history-section-title">Riwayat Sesi Game</h3>

          {gameHistory.length === 0 ? (
            <div className="history-empty-state">
              <div className="history-empty-icon">🎮</div>
              <h4>Belum Ada Riwayat</h4>
              <p>Kamu belum memainkan game di akun ini. Ayo jelajahi peta dan selesaikan tantangan budaya!</p>
            </div>
          ) : (
            <div className="history-list">
              {gameHistory.map((item) => (
                <div key={item.id} className="history-item">
                  <div className="history-item-left">
                    <div className={`history-game-icon ${item.game_type}`}>
                      {item.game_type === 'quiz' ? '🧠' : '🧩'}
                    </div>
                    <div>
                      <div className="history-prov-title">
                        {formatProvince(item.province_slug)}
                      </div>
                      <div className="history-game-type">
                        {item.game_type === 'quiz' ? 'Quiz Budaya' : 'Puzzle Budaya'} ·{' '}
                        <span className="history-time">{formatDate(item.played_at)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="history-item-right">
                    <div className="history-score-tag">+{item.score} Skor</div>
                    <div className={`history-status-badge ${item.passed ? 'passed' : 'failed'}`}>
                      {item.passed ? '✓ Lulus' : '✕ Belum'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
