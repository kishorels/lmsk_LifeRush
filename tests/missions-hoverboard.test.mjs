import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LOGIN_STREAK_REWARDS, ALL_MISSIONS_BONUS,
  freshMissionState, normalizeMissionState, canClaimDailyLogin, claimDailyLogin,
  recordRunForMissions, claimMissionReward, canClaimAllMissionsBonus,
  claimAllMissionsBonus, countPendingRewards
} from '../dist/missions.js';

test('7-day login streak advances on consecutive days, resets after a gap, and awards exact coins', () => {
  const day1 = freshMissionState('2026-11-25');
  assert.equal(canClaimDailyLogin(day1, '2026-11-25'), true);
  const c1 = claimDailyLogin(day1, '2026-11-25');
  assert.equal(c1.ok, true);
  assert.equal(c1.reward, LOGIN_STREAK_REWARDS[0]);
  assert.equal(canClaimDailyLogin(day1, '2026-11-25'), false);

  const day2 = normalizeMissionState(day1, '2026-11-26');
  assert.equal(day2.streakDay, 2);
  assert.equal(canClaimDailyLogin(day2, '2026-11-26'), true);
  assert.equal(claimDailyLogin(day2, '2026-11-26').reward, LOGIN_STREAK_REWARDS[1]);

  const missed = normalizeMissionState(day2, '2026-11-29');
  assert.equal(missed.streakDay, 1);
});

test('Daily missions track run stats, pay individual rewards, and unlock +1,000 all-3 bonus', () => {
  const st = freshMissionState('2026-11-25');
  assert.equal(st.missions.length, 3);
  assert.equal(countPendingRewards(st, '2026-11-25'), 1);

  recordRunForMissions(st, { coins: 900, distance: 5000, nearmiss: 10, jumps: 12, fevers: 3, runs: 5 });
  assert.equal(countPendingRewards(st, '2026-11-25'), 4);

  for (const m of st.missions) {
    const r = claimMissionReward(st, m.id);
    assert.equal(r.ok, true);
    assert.equal(r.reward, m.reward);
    assert.equal(claimMissionReward(st, m.id).ok, false, 'Cannot double-claim mission');
  }
  assert.equal(canClaimAllMissionsBonus(st), true);
  const bonus = claimAllMissionsBonus(st);
  assert.equal(bonus.ok, true);
  assert.equal(bonus.reward, ALL_MISSIONS_BONUS);
  assert.equal(canClaimAllMissionsBonus(st), false);
});

test('Stale removed hoverboard missions in localStorage are automatically replaced with valid missions', () => {
  const staleSaved = {
    dateKey: '2026-11-25',
    streakDay: 2,
    lastLoginClaimDate: '2026-11-25',
    missions: [
      { id: 'boards_2', type: 'boards', target: 2, reward: 400, title: 'Ride Hoverboard 2 Times', progress: 0, claimed: false },
      { id: 'coins_600', type: 'coins', target: 600, reward: 600, title: 'Collect 600 Coins', progress: 120, claimed: false },
      { id: 'nearmiss_3', type: 'nearmiss', target: 3, reward: 450, title: 'Do 3 Close Calls', progress: 1, claimed: false },
    ],
    allBonusClaimed: false
  };
  const cleaned = normalizeMissionState(staleSaved, '2026-11-25');
  assert.equal(cleaned.missions.length, 3);
  assert.equal(cleaned.missions.some(m => m.id === 'boards_2' || m.type === 'boards'), false);
  assert.equal(cleaned.missions[1].progress, 120);
  assert.equal(cleaned.missions[2].progress, 1);
  assert.equal(new Set(cleaned.missions.map(m => m.type)).size, 3);
});
