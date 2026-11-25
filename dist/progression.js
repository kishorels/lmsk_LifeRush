export const NITRO_MAX_HITS = 5;
export const POWER_BASE_SECONDS = 10;
export const POWER_UPGRADE_STEP_SECONDS = 2;
export const POWER_UPGRADE_COSTS = [500, 1000, 2000, 3500, 5000];
export const powers = [
  {unlockMap:'college',unlockMapName:'College Campus',id:'shoes',name:'Super Jump Shoes',icon:'▲'},
  {unlockMap:'college',unlockMapName:'College Campus',id:'doubleCoins',name:'2x Coins',icon:'×2'},
  {unlockMap:'itpark',unlockMapName:'IT Park',id:'nitro',name:'Nitro Rush',icon:'»'},
  {unlockMap:'itpark',unlockMapName:'IT Park',id:'ghost',name:'Invisible',icon:'◌'}
];
export const powerById = Object.fromEntries(powers.map(power => [power.id,power]));
export const pickupTypes = new Set(['coin','magnet','shield',...powers.map(power => power.id)]);

export const PROFILE_VERSION = 2;
export const MAP_ORDER = ['school', 'college', 'itpark', 'finalrun'];
export const MAP_UNLOCK_RULES = {
  school: {
    id: 'school',
    name: 'School Campus',
    free: true,
    reqMap: null,
    reqMapName: '',
    reqDistance: 0,
    cost: 0,
    reqLabel: ''
  },
  college: {
    id: 'college',
    name: 'College Campus',
    free: false,
    reqMap: 'school',
    reqMapName: 'School',
    reqDistance: 15000,
    cost: 20000,
    reqLabel: '15,000m in 1 School run'
  },
  itpark: {
    id: 'itpark',
    name: 'IT Park',
    free: false,
    reqMap: 'college',
    reqMapName: 'College',
    reqDistance: 10000,
    cost: 20000,
    reqLabel: '10,000m in 1 College run'
  },
  finalrun: {
    id: 'finalrun',
    name: 'The Final Run',
    free: false,
    reqMap: 'itpark',
    reqMapName: 'IT Park',
    reqDistance: 10000,
    cost: 30000,
    reqLabel: '10,000m in 1 IT Park run'
  }
};

export const CHARACTER_COSTS = {
  male: 0,
  female: 10000,
  'college-male': 12000,
  'college-woman': 15000,
  'college-man': 20000
};
export const ALL_CHARACTER_IDS = Object.keys(CHARACTER_COSTS);

export function freshProfile() {
  return {
    profileVersion: PROFILE_VERSION,
    xp: 0,
    introduced: 0,
    schoolBest: 0,
    collegeBest: 0,
    itParkBest: 0,
    collegeCoins: 0,
    unlockedMaps: ['school'],
    unlockedChars: ['male']
  };
}

export function normalizeProfile(raw) {
  const base = freshProfile();
  if (!raw || typeof raw !== 'object') return base;
  for (const key of ['xp', 'introduced', 'schoolBest', 'collegeBest', 'itParkBest', 'collegeCoins']) {
    const val = Number(raw[key]);
    if (Number.isFinite(val) && val >= 0) base[key] = Math.floor(val);
  }
  if (Number(raw.profileVersion) >= PROFILE_VERSION) {
    const validMaps = new Set(MAP_ORDER);
    const savedMaps = Array.isArray(raw.unlockedMaps)
      ? raw.unlockedMaps.filter(id => validMaps.has(id))
      : [];
    base.unlockedMaps = [...new Set(['school', ...savedMaps])];

    const validChars = new Set(ALL_CHARACTER_IDS);
    const savedChars = Array.isArray(raw.unlockedChars)
      ? raw.unlockedChars.filter(id => validChars.has(id))
      : [];
    base.unlockedChars = [...new Set(['male', ...savedChars])];
  }
  return base;
}

export function mapBestFor(profile, mapId) {
  if (mapId === 'school') return Math.max(0, Math.floor(Number(profile?.schoolBest) || 0));
  if (mapId === 'college') return Math.max(0, Math.floor(Number(profile?.collegeBest) || 0));
  if (mapId === 'itpark') return Math.max(0, Math.floor(Number(profile?.itParkBest) || 0));
  return 0;
}

export function recordMapRunDistance(profile, mapId, distance) {
  if (!profile) return 0;
  const dist = Math.max(0, Math.floor(Number(distance) || 0));
  if (mapId === 'school') {
    profile.schoolBest = Math.max(profile.schoolBest || 0, dist);
    return profile.schoolBest;
  }
  if (mapId === 'college') {
    profile.collegeBest = Math.max(profile.collegeBest || 0, dist);
    return profile.collegeBest;
  }
  if (mapId === 'itpark') {
    profile.itParkBest = Math.max(profile.itParkBest || 0, dist);
    return profile.itParkBest;
  }
  return 0;
}

export function isMapUnlocked(profile, mapId) {
  const rule = MAP_UNLOCK_RULES[mapId];
  if (!rule) return false;
  if (rule.free) return true;
  return Array.isArray(profile?.unlockedMaps) && profile.unlockedMaps.includes(mapId);
}

export function isMapDistanceMet(profile, mapId) {
  const rule = MAP_UNLOCK_RULES[mapId];
  if (!rule) return false;
  if (rule.free || !rule.reqMap || !rule.reqDistance) return true;
  return mapBestFor(profile, rule.reqMap) >= rule.reqDistance;
}

export function canBuyMap(profile, mapId, coins) {
  const rule = MAP_UNLOCK_RULES[mapId];
  if (!rule || rule.free) return false;
  if (isMapUnlocked(profile, mapId)) return false;
  const wallet = Math.max(0, Math.floor(Number(coins) || 0));
  return isMapDistanceMet(profile, mapId) && wallet >= rule.cost;
}

export function buyMap(profile, mapId, coins) {
  const rule = MAP_UNLOCK_RULES[mapId];
  const wallet = Math.max(0, Math.floor(Number(coins) || 0));
  if (!profile || !rule) return { ok: false, coins: wallet, cost: 0, reason: 'invalid' };
  if (isMapUnlocked(profile, mapId)) return { ok: false, coins: wallet, cost: 0, reason: 'already-unlocked' };
  if (!isMapDistanceMet(profile, mapId)) return { ok: false, coins: wallet, cost: rule.cost, reason: 'distance' };
  if (wallet < rule.cost) return { ok: false, coins: wallet, cost: rule.cost, reason: 'coins' };
  const remaining = Math.max(0, wallet - rule.cost);
  if (!Array.isArray(profile.unlockedMaps)) profile.unlockedMaps = ['school'];
  if (!profile.unlockedMaps.includes(mapId)) profile.unlockedMaps.push(mapId);
  return { ok: true, coins: remaining, cost: rule.cost, reason: 'unlocked' };
}

export function characterCost(charId) {
  return Math.max(0, Math.floor(Number(CHARACTER_COSTS[charId] ?? 0)));
}

export function isCharacterUnlocked(profile, charId) {
  if (!(charId in CHARACTER_COSTS)) return false;
  if (characterCost(charId) === 0) return true;
  return Array.isArray(profile?.unlockedChars) && profile.unlockedChars.includes(charId);
}

export function canBuyCharacter(profile, charId, coins) {
  if (!(charId in CHARACTER_COSTS)) return false;
  if (isCharacterUnlocked(profile, charId)) return false;
  const wallet = Math.max(0, Math.floor(Number(coins) || 0));
  return wallet >= characterCost(charId);
}

export function buyCharacter(profile, charId, coins) {
  const wallet = Math.max(0, Math.floor(Number(coins) || 0));
  if (!profile || !(charId in CHARACTER_COSTS)) return { ok: false, coins: wallet, cost: 0, reason: 'invalid' };
  if (isCharacterUnlocked(profile, charId)) return { ok: false, coins: wallet, cost: 0, reason: 'already-unlocked' };
  const cost = characterCost(charId);
  if (wallet < cost) return { ok: false, coins: wallet, cost, reason: 'coins' };
  const remaining = Math.max(0, wallet - cost);
  if (!Array.isArray(profile.unlockedChars)) profile.unlockedChars = ['male'];
  if (!profile.unlockedChars.includes(charId)) profile.unlockedChars.push(charId);
  return { ok: true, coins: remaining, cost, reason: 'unlocked' };
}

export function powerDuration(id, upgradeLevels = null) {
  const maxTier = POWER_UPGRADE_COSTS.length;
  const raw = Number(upgradeLevels?.[id] ?? 0);
  const lv = Math.max(0, Math.min(maxTier, Math.floor(Number.isFinite(raw) ? raw : 0)));
  return POWER_BASE_SECONDS + lv * POWER_UPGRADE_STEP_SECONDS;
}
export function unlockedMapsList(profileOrMaps) {
  if (Array.isArray(profileOrMaps)) return profileOrMaps;
  if (Array.isArray(profileOrMaps?.unlockedMaps)) return profileOrMaps.unlockedMaps;
  return ['school'];
}
export function isPowerUnlocked(profileOrMaps, powerId) {
  const power = powerById[powerId];
  if (!power) return false;
  if (!power.unlockMap || power.unlockMap === 'school') return true;
  return unlockedMapsList(profileOrMaps).includes(power.unlockMap);
}
export function unlockedPowersForProfile(profileOrMaps) {
  return powers.filter(power => isPowerUnlocked(profileOrMaps, power.id)).map(power => power.id);
}
export const parkOpen = profile => isMapUnlocked(profile, 'itpark');
export function runPickup(profileOrMaps, seed, index, featured) {
  if (featured && index === 0 && isPowerUnlocked(profileOrMaps, featured)) return featured;
  const pool = ['magnet', 'shield', ...unlockedPowersForProfile(profileOrMaps)];
  return pool[((seed >>> 0) + index) % pool.length];
}
