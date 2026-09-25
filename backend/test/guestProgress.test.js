import assert from 'node:assert/strict';
import test from 'node:test';
import {
  bumpQuizStats,
  computeGuestBonusKeys,
  countCompletedProvinces,
  mergeProgressData,
  mergeQuizStats,
  normalizeProgress,
  toUserProgressPayload,
} from '../src/utils/progressMerge.js';

test('normalizeProgress menerima bentuk snake_case dari DB', () => {
  const progress = normalizeProgress({
    keys: 3,
    total_score: 120,
    games_played: 4,
    unlocked_provinces: ['bali'],
    completed_games: { bali: ['quiz'] },
    claimed_rewards: ['bali'],
    quiz_stats: { bali: { attempts: 2, high_score: 5, passed: true } },
    guest_warning_seen: true,
  });

  assert.equal(progress.keys, 3);
  assert.equal(progress.total_score, 120);
  assert.equal(progress.games_played, 4);
  assert.deepEqual(progress.unlocked_provinces, ['bali']);
  assert.deepEqual(progress.claimed_rewards, ['bali']);
  assert.equal(progress.quiz_stats.bali.quiz_attempts, 2);
  assert.equal(progress.guest_warning_seen, true);
});

test('normalizeProgress menerima data legacy localStorage (camelCase)', () => {
  const progress = normalizeProgress({
    keys: 2,
    unlockedRegions: ['jawa-barat'],
    completedGames: { 'jawa-barat': ['quiz'] },
    claimedRewards: ['jawa-barat'],
    quizStats: { 'jawa-barat': { attempts: 1, highScore: 4, passed: true, lastScore: 4, lastPlayedAt: '2026-01-01T00:00:00.000Z' } },
    totalScore: 40,
    gamesPlayed: 1,
  });

  assert.deepEqual(progress.unlocked_provinces, ['jawa-barat']);
  assert.deepEqual(progress.completed_games, { 'jawa-barat': ['quiz'] });
  assert.deepEqual(progress.claimed_rewards, ['jawa-barat']);
  assert.equal(progress.total_score, 40);
  assert.equal(progress.games_played, 1);
  assert.equal(progress.quiz_stats['jawa-barat'].high_score, 4);
  assert.equal(progress.quiz_stats['jawa-barat'].quiz_attempts, 1);
});

test('mergeProgressData menggabungkan unlocked, claimed, completed, dan keys', () => {
  const merged = mergeProgressData(
    { keys: 2, unlocked_provinces: ['bali'], completed_games: { bali: ['quiz'] }, claimed_rewards: ['bali'], total_score: 10, games_played: 1 },
    { keys: 5, unlocked_provinces: ['aceh'], completed_games: { aceh: ['puzzle'] }, claimed_rewards: [], total_score: 30, games_played: 2 }
  );

  assert.equal(merged.keys, 5);
  assert.equal(merged.total_score, 30);
  assert.equal(merged.games_played, 2);
  assert.deepEqual(merged.unlocked_provinces.sort(), ['aceh', 'bali']);
  assert.deepEqual(merged.claimed_rewards, ['bali']);
  assert.deepEqual(merged.completed_games.bali, ['quiz']);
  assert.deepEqual(merged.completed_games.aceh, ['puzzle']);
});

test('mergeProgressData bersifat idempotent (tidak menggandakan attempts)', () => {
  const guest = { quiz_stats: { bali: { attempts: 2, high_score: 5, passed: true, quiz_attempts: 2, quiz_high_score: 5 } } };
  const once = mergeProgressData({ keys: 1 }, guest);
  const twice = mergeProgressData(once, once);

  assert.equal(twice.quiz_stats.bali.attempts, 2);
  assert.equal(twice.quiz_stats.bali.quiz_attempts, 2);
});

test('mergeQuizStats mengambil nilai tertinggi & bersifat idempotent', () => {
  const merged = mergeQuizStats(
    { bali: { attempts: 1, high_score: 3, quiz_attempts: 1, quiz_high_score: 3 } },
    { bali: { attempts: 2, high_score: 5, quiz_attempts: 1, puzzle_attempts: 1, puzzle_high_score: 50, quiz_high_score: 5 } }
  );

  assert.equal(merged.bali.attempts, 2);
  assert.equal(merged.bali.high_score, 5);
  assert.equal(merged.bali.quiz_attempts, 1);
  assert.equal(merged.bali.puzzle_attempts, 1);
  assert.equal(merged.bali.puzzle_high_score, 50);

  // merge berulang tidak menambah angka
  const again = mergeQuizStats(merged, merged);
  assert.equal(again.bali.attempts, 2);
  assert.equal(again.bali.puzzle_attempts, 1);
});

test('bumpQuizStats menambah percobaan sesuai tipe game', () => {
  const first = bumpQuizStats({}, { provinceSlug: 'bali', gameType: 'quiz', score: 4, passed: false });
  const second = bumpQuizStats(first, { provinceSlug: 'bali', gameType: 'puzzle', score: 50, passed: true, playedAt: '2026-02-01T00:00:00.000Z' });

  assert.equal(second.bali.attempts, 2);
  assert.equal(second.bali.quiz_attempts, 1);
  assert.equal(second.bali.quiz_high_score, 4);
  assert.equal(second.bali.puzzle_attempts, 1);
  assert.equal(second.bali.puzzle_high_score, 50);
  assert.equal(second.bali.passed, true);
  assert.equal(second.bali.last_played_at, '2026-02-01T00:00:00.000Z');
  // objek asal tidak boleh termutasi
  assert.deepEqual(first.bali.puzzle_attempts, 0);
});

test('countCompletedProvinces menghitung provinsi yang tuntas', () => {
  const count = countCompletedProvinces({
    completed_games: { bali: ['quiz'], aceh: [] },
    claimed_rewards: ['jawa-barat'],
    quiz_stats: { papua: { passed: true } },
  });

  assert.equal(count, 3);
});

test('computeGuestBonusKeys minimal 1 dan mengikuti jumlah provinsi selesai', () => {
  assert.equal(computeGuestBonusKeys(0), 1);
  assert.equal(computeGuestBonusKeys(3), 3);
});

test('toUserProgressPayload tidak membawa kolom guest-only', () => {
  const payload = toUserProgressPayload({ keys: 1, guest_warning_seen: true }, { keys: 7 });

  assert.equal(payload.keys, 7);
  assert.equal('guest_warning_seen' in payload, false);
  assert.deepEqual(payload.unlocked_provinces, []);
  assert.deepEqual(payload.quiz_stats, {});
});
