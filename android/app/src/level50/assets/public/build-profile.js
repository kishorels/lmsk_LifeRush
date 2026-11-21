import {xpForLevel} from './progression.js';

export function initializeBuildProfile() {
  const profile = {xp:xpForLevel(50),collegeBest:25000,collegeCoins:50000,introduced:50,itParkUnlocked:true};
  localStorage.setItem('runverse-progression',JSON.stringify(profile));
  try {
    const curCoins = parseInt(localStorage.getItem('runverse-total-coins') || '0', 10);
    if (isNaN(curCoins) || curCoins < 50000) {
      localStorage.setItem('runverse-total-coins','50000');
    }
  } catch {
    localStorage.setItem('runverse-total-coins','50000');
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
  localStorage.setItem('runverse-upgrades',JSON.stringify({magnet:4,nitro:4,shoes:4,coinBoost:4}));
  localStorage.setItem('level50-initialized','1');
}
