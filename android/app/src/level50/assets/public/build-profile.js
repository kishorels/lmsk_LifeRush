import {xpForLevel} from './progression.js';

export function initializeBuildProfile() {
  if (localStorage.getItem('level50-initialized')) return;
  const profile = {xp:xpForLevel(50),collegeBest:15000,collegeCoins:40000,introduced:50};
  localStorage.setItem('runverse-progression',JSON.stringify(profile));
  localStorage.setItem('runverse-total-coins','40000');
  localStorage.setItem('runverse-best','15000');
  localStorage.setItem('runverse-college-dist-done','1');
  localStorage.setItem('runverse-college-coins-done','1');
  localStorage.setItem('runverse-character','college-man');
  localStorage.setItem('runverse-map','itpark');
  localStorage.setItem('runverse-upgrades',JSON.stringify({magnet:4,nitro:4,shoes:4,coinBoost:4}));
  localStorage.setItem('level50-initialized','1');
}
