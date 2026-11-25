// =============================================================================
// DAILY MISSIONS & 7-DAY LOGIN STREAK
// Pure deterministic state helpers (Node-testable & zero external dependencies)
// =============================================================================

export const LOGIN_STREAK_REWARDS = [250, 400, 600, 900, 1200, 1800, 3000];
export const ALL_MISSIONS_BONUS = 1000;

const MISSION_POOL = [
  { id: 'coins_300',    type: 'coins',    target: 300,  reward: 350, title: 'Collect 300 Coins' },
  { id: 'coins_600',    type: 'coins',    target: 600,  reward: 600, title: 'Collect 600 Coins' },
  { id: 'dist_1500',    type: 'distance', target: 1500, reward: 400, title: 'Run 1,500m Total' },
  { id: 'dist_3000',    type: 'distance', target: 3000, reward: 700, title: 'Run 3,000m Total' },
  { id: 'fever_1',      type: 'fevers',   target: 1,    reward: 450, title: 'Trigger Fever Rush 1 Time' },
  { id: 'fever_2',      type: 'fevers',   target: 2,    reward: 800, title: 'Trigger Fever Rush 2 Times' },
  { id: 'jumps_8',      type: 'jumps',    target: 8,    reward: 400, title: 'Jump Over 8 Obstacles' },
  { id: 'runs_3',       type: 'runs',     target: 3,    reward: 500, title: 'Complete 3 Runs' }
];
const VALID_MISSION_BY_ID = new Map(MISSION_POOL.map(m => [m.id, m]));

export function todayDateKey(now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function dateDiffDays(prevKey, curKey) {
  if (!prevKey || !curKey) return 999;
  const a = new Date(`${prevKey}T00:00:00Z`).getTime();
  const b = new Date(`${curKey}T00:00:00Z`).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 999;
  return Math.round((b - a) / 86400000);
}

export function generateDailyMissions(dateKey) {
  let hash = 2166136261;
  for (let i = 0; i < dateKey.length; i++) {
    hash = Math.imul(hash ^ dateKey.charCodeAt(i), 16777619) >>> 0;
  }
  const byType = new Map();
  const chosen = [];
  for (let step = 0; step < MISSION_POOL.length && chosen.length < 3; step++) {
    const idx = (hash + step * 3) % MISSION_POOL.length;
    const tpl = MISSION_POOL[idx];
    if (byType.has(tpl.type)) continue;
    byType.set(tpl.type, true);
    chosen.push({ ...tpl, progress: 0, claimed: false });
  }
  return chosen;
}

export function freshMissionState(dateKey = todayDateKey()) {
  return {
    dateKey,
    streakDay: 1,
    lastLoginClaimDate: '',
    missions: generateDailyMissions(dateKey),
    allBonusClaimed: false
  };
}

export function normalizeMissionState(raw, dateKey = todayDateKey()) {
  const base = freshMissionState(dateKey);
  if (!raw || typeof raw !== 'object') return base;

  const prevClaim = typeof raw.lastLoginClaimDate === 'string' ? raw.lastLoginClaimDate : '';
  base.lastLoginClaimDate = prevClaim;
  const savedStreak = Math.max(1, Math.min(7, Math.floor(Number(raw.streakDay) || 1)));
  if (!prevClaim) {
    base.streakDay = 1;
  } else {
    const diff = dateDiffDays(prevClaim, dateKey);
    if (diff <= 0) base.streakDay = savedStreak;
    else if (diff === 1) base.streakDay = (savedStreak % 7) + 1;
    else base.streakDay = 1;
  }

  if (raw.dateKey === dateKey && Array.isArray(raw.missions) && raw.missions.length === 3) {
    const usedTypes = new Set();
    const cleaned = [];
    for (const m of raw.missions) {
      const tpl = m && VALID_MISSION_BY_ID.get(m.id);
      if (tpl && !usedTypes.has(tpl.type)) {
        usedTypes.add(tpl.type);
        cleaned.push({
          ...tpl,
          progress: Math.max(0, Math.min(tpl.target, Math.floor(Number(m.progress) || 0))),
          claimed: Boolean(m.claimed)
        });
      } else {
        cleaned.push(null);
      }
    }
    const fallbacks = [...base.missions, ...MISSION_POOL];
    base.missions = cleaned.map(entry => {
      if (entry) return entry;
      const pick = fallbacks.find(f => !usedTypes.has(f.type)) || MISSION_POOL[0];
      usedTypes.add(pick.type);
      return { ...pick, progress: 0, claimed: false };
    });
    base.allBonusClaimed = Boolean(raw.allBonusClaimed);
  }
  return base;
}

export function canClaimDailyLogin(state, dateKey = todayDateKey()) {
  return Boolean(state && state.lastLoginClaimDate !== dateKey);
}

export function claimDailyLogin(state, dateKey = todayDateKey()) {
  if (!canClaimDailyLogin(state, dateKey)) return { ok: false, reward: 0 };
  const idx = Math.max(0, Math.min(6, (state.streakDay || 1) - 1));
  const reward = LOGIN_STREAK_REWARDS[idx];
  state.lastLoginClaimDate = dateKey;
  return { ok: true, reward, day: idx + 1 };
}

export function recordRunForMissions(state, { coins = 0, distance = 0, nearmiss = 0, jumps = 0, fevers = 0, runs = 1 } = {}) {
  if (!state || !Array.isArray(state.missions)) return 0;
  let newlyCompleted = 0;
  const deltas = { coins, distance, nearmiss, jumps, fevers, runs };
  for (const m of state.missions) {
    const add = Math.max(0, Math.floor(Number(deltas[m.type]) || 0));
    if (add <= 0) continue;
    const wasDone = m.progress >= m.target;
    m.progress = Math.min(m.target, m.progress + add);
    if (!wasDone && m.progress >= m.target) newlyCompleted++;
  }
  return newlyCompleted;
}

export function claimMissionReward(state, missionId) {
  if (!state || !Array.isArray(state.missions)) return { ok: false, reward: 0 };
  const m = state.missions.find(x => x.id === missionId);
  if (!m || m.claimed || m.progress < m.target) return { ok: false, reward: 0 };
  m.claimed = true;
  return { ok: true, reward: m.reward };
}

export function canClaimAllMissionsBonus(state) {
  if (!state || state.allBonusClaimed || !Array.isArray(state.missions) || state.missions.length < 3) return false;
  return state.missions.every(m => m.claimed);
}

export function claimAllMissionsBonus(state) {
  if (!canClaimAllMissionsBonus(state)) return { ok: false, reward: 0 };
  state.allBonusClaimed = true;
  return { ok: true, reward: ALL_MISSIONS_BONUS };
}

export function countPendingRewards(state, dateKey = todayDateKey()) {
  if (!state) return 0;
  let n = canClaimDailyLogin(state, dateKey) ? 1 : 0;
  if (Array.isArray(state.missions)) {
    for (const m of state.missions) {
      if (!m.claimed && m.progress >= m.target) n++;
    }
  }
  if (canClaimAllMissionsBonus(state)) n++;
  return n;
}
