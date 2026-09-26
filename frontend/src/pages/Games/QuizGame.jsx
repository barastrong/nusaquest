import { useState, useEffect } from 'react';
import { FiCheckCircle, FiXCircle, FiKey, FiRefreshCw, FiAward, FiClock, FiRotateCw } from 'react-icons/fi';
import { ClipLoader } from 'react-spinners';
import { gameApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { getDifficultyInfo } from '../../utils/difficulty';
import successSfx from '../../sounds/success.mp3';
import failedSfx from '../../sounds/failed.mp3';

const sfx = { success: new Audio(successSfx), failed: new Audio(failedSfx) };
const playSfx = (ok) => {
  const a = ok ? sfx.success : sfx.failed;
  a.currentTime = 0;
  a.play().catch(() => {});
};

/**
 * Durasi tampil umpan balik langsung (immediate feedback) per soal.
 *
 * Jawaban benar cukup singkat karena user hanya perlu konfirmasi; jawaban SALAH
 * diperlama supaya teks "Jawaban benar: ..." sempat terbaca — inilah bagian yang
 * memperkuat retensi pemahaman.
 */
const FEEDBACK_DURATION_MS = { correct: 900, wrong: 2500 };

// Konstanta kuis — target 10 soal acak per sesi kuis agar retensi lebih kuat
// dan setiap percobaan menantang. Backend fallback ke jumlah tersedia bila kurang.
const QUIZ_QUESTION_COUNT = 10;

/**
 * PASS_THRESHOLD konsisten di 60% (bukan 60% untuk 5 soal tapi 70% untuk 10 soal).
 * `Math.round` daripada `Math.ceil`:
 *   5 soal → round(3.0) = 3  benar (60%)
 *  10 soal → round(6.0) = 6  benar (60%)
 *  15 soal → round(9.0) = 9  benar (60%)
 */
const PASS_RATIO = 0.6;

export default function QuizGame({ onBack, provinceSlug, provinceName }) {
  const {
    user,
    getProvinceProgress,
    hasClaimedReward,
    claimProvinceReward,
    recordGameScore,
  } = useAuth();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [qIdx, setQIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [finished, setFinished] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [confetti, setConfetti] = useState([]);
  const [rewardToast, setRewardToast] = useState(null);
  const [alreadyClaimed] = useState(() => provinceSlug ? hasClaimedReward(provinceSlug) : false);
  const [postQuizStats, setPostQuizStats] = useState(null);

  const prevProgress = getProvinceProgress(provinceSlug, 'quiz');

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    setLoading(true);

    let isMounted = true;
    async function fetchQuizzes() {
      try {
        const res = await gameApi.getQuizzes(provinceSlug || 'general', {
          count: QUIZ_QUESTION_COUNT,
          random: true,
        });
        if (isMounted && res.data && res.data.length > 0) {
          const mapped = res.data.map(q => ({
            q: q.question,
            opts: q.options,
            ans: q.answer_index,
          }));
          setQuestions(mapped);
        }
      } catch (err) {
        console.error('Failed to fetch quiz from API:', err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchQuizzes();
    return () => { isMounted = false; };
  }, [provinceSlug]);

  const PASS_THRESHOLD = Math.max(1, Math.round(questions.length * PASS_RATIO));
  const currentQuestion = questions[qIdx] || null;

  const handleAnswer = (i) => {
    if (answered || !currentQuestion) return;
    setAnswered(true);
    setSelectedAnswer(i);
    const correct = i === currentQuestion.ans;
    const newScore = correct ? score + 1 : score;
    if (correct) setScore(newScore);

    playSfx(correct);
    setFeedback({ correct, show: true });

    // Jeda sebelum pindah soal mengikuti jenis jawaban (lihat FEEDBACK_DURATION_MS)
    const feedbackMs = correct ? FEEDBACK_DURATION_MS.correct : FEEDBACK_DURATION_MS.wrong;

    if (correct) {
      const pieces = Array.from({ length: 50 }, (_, j) => ({
        id: j,
        x: Math.random() * 100,
        delay: Math.random() * 0.4,
        color: ['#6fcf97','#f7b24f','#e57373','#5a9bd5','#c89b3c','#f472b6','#38bdf8'][j % 7],
        drift: (Math.random() - 0.5) * 120,
        size: 5 + Math.random() * 6,
        round: Math.random() > 0.5,
      }));
      setConfetti(pieces);
    }

    setTimeout(async () => {
      setFeedback(null);
      setConfetti([]);
      if (qIdx + 1 >= questions.length) {
        const finalScore = newScore;
        const passed = finalScore >= PASS_THRESHOLD;

        // Catat percobaan ke database — tamu maupun akun sama-sama tercatat.
        let recorded = null;
        if (provinceSlug) {
          recorded = await recordGameScore({
            provinceSlug,
            gameType: 'quiz',
            score: finalScore,
            passed,
          });

          if (passed && !hasClaimedReward(provinceSlug)) {
            const { keyReward } = getDifficultyInfo(provinceSlug);
            const rewardKeys = user ? keyReward : 1;
            const claim = await claimProvinceReward(provinceSlug, rewardKeys);

            if (claim.success) {
              setRewardToast({ keys: rewardKeys, total: user ? claim.progress.keys : '∞' });
              setTimeout(() => setRewardToast(null), 4000);
            }
          }
        }

        const recordedStat = recorded?.provinceStats;
        setPostQuizStats({
          attempts: recordedStat?.attempts ?? (prevProgress.attempts || 0) + 1,
          highScore: recordedStat?.high_score ?? Math.max(prevProgress.highScore || 0, finalScore),
          isCompleted: Boolean(recordedStat?.passed || prevProgress.isCompleted || passed),
          isNewRecord: prevProgress.attempts > 0 && finalScore > (prevProgress.highScore || 0),
        });

        setFinished(true);
      } else {
        setQIdx(qIdx + 1);
        setAnswered(false);
        setSelectedAnswer(null);
      }
    }, feedbackMs);
  };

  const resetQuiz = () => {
    setQIdx(0);
    setScore(0);
    setAnswered(false);
    setFinished(false);
    setSelectedAnswer(null);
    setPostQuizStats(null);
    setFeedback(null);
    setConfetti([]);
  };

  const passed = score >= PASS_THRESHOLD;

  if (finished) {
    return (
      <div className="quiz-game show">
        {rewardToast && (
          <div className="reward-toast-popup">
            <FiKey className="rtp-icon" />
            <div className="rtp-text">
              <span className="rtp-title">+{rewardToast.keys} Kunci Didapat!</span>
              <span className="rtp-sub">Total kunci: {rewardToast.total}</span>
            </div>
          </div>
        )}

        <div className="quiz-result show">
          <div className={`result-icon-wrap ${passed ? 'result-pass' : 'result-fail'}`}>
            {passed ? <FiCheckCircle /> : <FiXCircle />}
          </div>
          <div className="result-score">{score}</div>
          <div className="result-label">dari {questions.length} soal benar</div>
          <div className={`result-verdict ${passed ? 'verdict-pass' : 'verdict-fail'}`}>
            {passed ? 'Lulus!' : 'Belum Lulus'}
          </div>

          {/* Child-friendly Progress Tracker Recap */}
          {provinceSlug && (
            <div className="result-progress-card">
              <div className="rpc-header">
                <span className="rpc-title">Perkembangan Belajar Kamu</span>
                <span className={`rpc-status-tag ${(postQuizStats?.isCompleted || passed || prevProgress.isCompleted) ? 'status-completed' : 'status-in-progress'}`}>
                  {(postQuizStats?.isCompleted || passed || prevProgress.isCompleted) ? (
                    <><FiCheckCircle /> Sudah Selesai</>
                  ) : (
                    <><FiRotateCw /> Sedang Belajar</>
                  )}
                </span>
              </div>
              <div className="rpc-stats-grid">
                <div className="rpc-stat-box">
                  <span className="rpc-stat-label">Jumlah Percobaan</span>
                  <span className="rpc-stat-value">{postQuizStats?.attempts ?? ((prevProgress.attempts || 0) + 1)} kali</span>
                </div>
                <div className="rpc-stat-box">
                  <span className="rpc-stat-label">Skor Tertinggi</span>
                  <span className="rpc-stat-value highlight-gold">
                    <FiAward className="stat-award-icon" /> {postQuizStats?.highScore ?? Math.max(prevProgress.highScore || 0, score)}/{questions.length}
                  </span>
                  {postQuizStats?.isNewRecord && (
                    <span className="rpc-badge-new">Rekor Baru!</span>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="result-msg">
            {passed
              ? alreadyClaimed
                ? `Hebat! Kamu berhasil menjawab ${score}/${questions.length} soal dengan benar. Terus pertahankan prestasimu!`
                : `Hebat! Kamu berhasil menjawab ${score}/${questions.length} soal dengan benar. Kunci reward sudah ditambahkan!`
              : `Bagus sekali sudah mencoba! Kamu menjawab ${score} dari ${questions.length} soal. Butuh minimal ${PASS_THRESHOLD} benar untuk lulus. Ayo coba lagi, kamu pasti bisa!`}
          </div>

          {passed && !alreadyClaimed && rewardToast === null && (
            <div className="result-reward-badge">
              <FiKey /> Reward kunci berhasil diklaim!
            </div>
          )}

          <div className="result-actions">
            {!passed && (
              <button className="result-btn result-btn-retry" onClick={resetQuiz}>
                <FiRefreshCw /> Coba Lagi
              </button>
            )}
            <button className="result-btn" onClick={onBack}>Kembali</button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="quiz-game show" style={{ textAlign: 'center', padding: '60px 20px' }}>
        <ClipLoader color="#f7b24f" size={50} />
        <p style={{ marginTop: '16px', color: '#9ca3af' }}>Memuat Soal Quiz...</p>
      </div>
    );
  }

  if (!currentQuestion || questions.length === 0) {
    return (
      <div className="quiz-game show" style={{ textAlign: 'center', padding: '60px 20px' }}>
        <p style={{ color: '#ef4444', marginBottom: '16px' }}>Belum ada soal quiz untuk provinsi ini.</p>
        <button className="result-btn" onClick={onBack}>Kembali</button>
      </div>
    );
  }

  return (
    <div className="quiz-game show">
      <div className="quiz-header">
        <button className="quiz-back" onClick={onBack}>← Kembali</button>
        <div className="quiz-title-wrap">
          <div className="quiz-title">
            {provinceName ? `Quiz — ${provinceName}` : 'Quiz Budaya Indonesia'}
          </div>
          {provinceSlug && (
            <div className="quiz-header-progress">
              <span className={`quiz-status-chip ${prevProgress.isCompleted ? 'status-completed' : prevProgress.hasAttempted ? 'status-in-progress' : 'status-not-started'}`}>
                {prevProgress.isCompleted ? (
                  <><FiCheckCircle /> Sudah Pernah Lulus</>
                ) : prevProgress.hasAttempted ? (
                  <><FiRotateCw /> Percobaan ke-{(prevProgress.attempts || 0) + 1}</>
                ) : (
                  <><FiClock /> Belum Dikerjakan</>
                )}
              </span>
              {prevProgress.attempts > 0 && (
                <span className="quiz-highscore-chip">
                  <FiAward /> Rekor Terbaik: {prevProgress.highScore}/{questions.length}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <div
        className={`quiz-feedback quiz-feedback-${feedback?.correct ? 'correct' : 'wrong'} ${feedback?.show ? 'show' : ''}`}
        style={{ '--qf-duration': `${feedback?.correct ? FEEDBACK_DURATION_MS.correct : FEEDBACK_DURATION_MS.wrong}ms` }}
      >
        <div className="qf-icon">
          {feedback?.correct ? <FiCheckCircle /> : <FiXCircle />}
        </div>
        <div className="qf-title">{feedback?.correct ? 'Benar!' : 'Salah!'}</div>
        <div className="qf-sub">
          {feedback?.correct
            ? 'Jawaban kamu tepat, hebat!'
            : <>Jawaban benar: <span className="qf-ans">{currentQuestion?.opts[currentQuestion?.ans]}</span></>}
        </div>
      </div>

      {confetti.map(c => (
        <span
          key={c.id}
          className="qf-confetti"
          style={{
            left: `${c.x}%`,
            background: c.color,
            animationDelay: `${c.delay}s`,
            width: `${c.size}px`,
            height: `${c.size}px`,
            borderRadius: c.round ? '50%' : '2px',
            '--drift': `${c.drift}px`,
          }}
        />
      ))}

      <div className="quiz-progress-bar">
        <div className="quiz-progress-fill" style={{ width: `${((qIdx + 1) / questions.length) * 100}%` }} />
      </div>

      <div className={`quiz-card ${feedback?.show && !feedback?.correct ? 'quiz-shake' : ''}`}>
        <div className="quiz-num">Soal {qIdx + 1} dari {questions.length}</div>
        <div className="quiz-question">{currentQuestion.q}</div>
        <div className="quiz-options">
          {currentQuestion.opts.map((opt, i) => (
            <button
              key={i}
              className={`quiz-opt ${answered && i === currentQuestion.ans ? 'correct' : ''} ${answered && i === selectedAnswer && i !== currentQuestion.ans ? 'wrong' : ''}`}
              onClick={() => handleAnswer(i)}
            >
              {opt}
            </button>
          ))}
        </div>
        {provinceSlug && (
          <div className="quiz-pass-hint">
            Butuh {PASS_THRESHOLD}/{questions.length} benar untuk lulus & dapat reward kunci
          </div>
        )}
      </div>
    </div>
  );
}
