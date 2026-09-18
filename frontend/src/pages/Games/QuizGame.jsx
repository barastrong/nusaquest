import { useState, useEffect } from 'react';
import { FiCheckCircle, FiXCircle, FiKey, FiRefreshCw } from 'react-icons/fi';
import { ClipLoader } from 'react-spinners';
import { gameApi, userApi } from '../../services/api';
import { markGameCompleted, claimProvinceReward, hasClaimedReward, getUserData, getDeviceId } from '../../utils/localStorage';
import { getDifficultyInfo } from './MapPage';

export default function QuizGame({ onBack, provinceSlug, provinceName }) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [qIdx, setQIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [finished, setFinished] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [rewardToast, setRewardToast] = useState(null);
  const [alreadyClaimed] = useState(() => provinceSlug ? hasClaimedReward(provinceSlug) : false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    setLoading(true);

    let isMounted = true;
    async function fetchQuizzes() {
      try {
        const res = await gameApi.getQuizzes(provinceSlug || 'general');
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

  const PASS_THRESHOLD = Math.ceil(questions.length * 0.6);
  const currentQuestion = questions[qIdx] || null;

  const handleAnswer = (i) => {
    if (answered || !currentQuestion) return;
    setAnswered(true);
    setSelectedAnswer(i);
    const correct = i === currentQuestion.ans;
    const newScore = correct ? score + 1 : score;
    if (correct) setScore(newScore);

    setTimeout(() => {
      if (qIdx + 1 >= questions.length) {
        const finalScore = newScore;
        const passed = finalScore >= PASS_THRESHOLD;

        if (provinceSlug) {
          markGameCompleted(provinceSlug, 'quiz');
          if (passed && !hasClaimedReward(provinceSlug)) {
            const { keyReward } = getDifficultyInfo(provinceSlug);
            const success = claimProvinceReward(provinceSlug, keyReward);
            if (success) {
              const userData = getUserData();
              setRewardToast({ keys: keyReward, total: userData.keys });
              setTimeout(() => setRewardToast(null), 4000);
            }
          }
        }

        // Record score to server / user history
        userApi.recordScore({
          deviceId: getDeviceId(),
          provinceSlug: provinceSlug || 'general',
          gameType: 'quiz',
          score: finalScore,
          passed,
        }).catch((err) => console.error('Failed to record quiz score:', err.message));

        setFinished(true);
      } else {
        setQIdx(qIdx + 1);
        setAnswered(false);
        setSelectedAnswer(null);
      }
    }, 900);
  };

  const resetQuiz = () => {
    setQIdx(0);
    setScore(0);
    setAnswered(false);
    setFinished(false);
    setSelectedAnswer(null);
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
          <div className="result-msg">
            {passed
              ? alreadyClaimed
                ? `Hebat! Kamu menjawab ${score}/${questions.length} soal benar. Reward sudah pernah diklaim sebelumnya.`
                : `Hebat! Kamu menjawab ${score}/${questions.length} soal benar. Kunci reward sudah ditambahkan!`
              : `Kamu perlu menjawab minimal ${PASS_THRESHOLD} soal dengan benar. Coba lagi!`}
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
        <div className="quiz-title">
          {provinceName ? `Quiz — ${provinceName}` : 'Quiz Budaya Indonesia'}
        </div>
      </div>
      <div className="quiz-progress-bar">
        <div className="quiz-progress-fill" style={{ width: `${((qIdx + 1) / questions.length) * 100}%` }} />
      </div>

      <div className="quiz-card">
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
