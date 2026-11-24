import {ALL_CHARACTER_IDS, MAP_ORDER, MAX_LEVEL, PROFILE_VERSION, xpForLevel} from './progression.js';

export function initializeBuildProfile() {
  if (typeof window !== 'undefined') window.__LMSK_TEST_ADS__ = true;
  const profile = {
    profileVersion: PROFILE_VERSION,
    xp: xpForLevel(MAX_LEVEL),
    introduced: MAX_LEVEL,
    schoolBest: 25000,
    collegeBest: 25000,
    itParkBest: 25000,
    collegeCoins: 50000,
    unlockedMaps: [...MAP_ORDER],
    unlockedChars: [...ALL_CHARACTER_IDS]
  };
  localStorage.setItem('runverse-progression', JSON.stringify(profile));
  const firstSeed = !localStorage.getItem('level25-initialized');
  if (firstSeed) {
    try {
      const curCoins = parseInt(localStorage.getItem('runverse-total-coins') || '0', 10);
      if (isNaN(curCoins) || curCoins < 50000) {
        localStorage.setItem('runverse-total-coins', '50000');
      }
    } catch {
      localStorage.setItem('runverse-total-coins', '50000');
    }
    localStorage.setItem('runverse-upgrades', JSON.stringify({shoes: 0, doubleCoins: 0, nitro: 0, ghost: 0}));
    localStorage.setItem('level25-initialized', '1');
  }
  localStorage.setItem('runverse-best', '25000');
  if (!localStorage.getItem('runverse-character')) {
    localStorage.setItem('runverse-character', 'college-man');
  }
  if (!localStorage.getItem('runverse-map')) {
    localStorage.setItem('runverse-map', 'itpark');
  }
}
