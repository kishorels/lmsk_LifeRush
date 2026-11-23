import {MAX_LEVEL, xpForLevel} from './progression.js';

export function initializeBuildProfile() {
  const profile = {xp:xpForLevel(MAX_LEVEL),collegeBest:25000,collegeCoins:50000,introduced:MAX_LEVEL,itParkUnlocked:true};
  localStorage.setItem('runverse-progression',JSON.stringify(profile));
  const firstSeed = !localStorage.getItem('level25-initialized');
  if (firstSeed) {
    try {
      const curCoins = parseInt(localStorage.getItem('runverse-total-coins') || '0', 10);
      if (isNaN(curCoins) || curCoins < 50000) {
        localStorage.setItem('runverse-total-coins','50000');
      }
    } catch {
      localStorage.setItem('runverse-total-coins','50000');
    }
    localStorage.setItem('runverse-upgrades',JSON.stringify({shoes:0,doubleCoins:0,nitro:0,ghost:0}));
    localStorage.setItem('level25-initialized','1');
  }
  localStorage.setItem('runverse-best','25000');
  localStorage.setItem('runverse-college-dist-done','1');
  localStorage.setItem('runverse-college-coins-done','1');
  if (!localStorage.getItem('runverse-character')) {
    localStorage.setItem('runverse-character','college-man');
  }
  if (!localStorage.getItem('runverse-map')) {
    localStorage.setItem('runverse-map','itpark');
  }
}
