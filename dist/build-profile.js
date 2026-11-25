import {ALL_CHARACTER_IDS, MAP_ORDER, PROFILE_VERSION} from './progression.js';

export function initializeBuildProfile() {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  const isNative = Boolean(window.Capacitor?.isNativePlatform?.());
  const isLocalHttp = !isNative && window.location?.protocol === 'http:' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  if (!isLocalHttp) return;

  const params = new URLSearchParams(window.location.search || '');
  if (params.get('reset') === '1') {
    for (const k of Object.keys(localStorage)) {
      if (k.startsWith('runverse-') || k === 'level25-initialized') localStorage.removeItem(k);
    }
    return;
  }

  const gfx = params.get('gfx');
  if (gfx && ['auto', 'low', 'med', 'high', 'ultra'].includes(gfx)) {
    try { localStorage.setItem('runverse-gfx', gfx); } catch {}
  }

  if (params.get('unlock') === '1') {
    const profile = {
      profileVersion: PROFILE_VERSION,
      xp: 0,
      introduced: 0,
      schoolBest: 25000,
      collegeBest: 25000,
      itParkBest: 25000,
      collegeCoins: 50000,
      unlockedMaps: [...MAP_ORDER],
      unlockedChars: [...ALL_CHARACTER_IDS]
    };
    try {
      localStorage.setItem('runverse-progression', JSON.stringify(profile));
      const curCoins = parseInt(localStorage.getItem('runverse-total-coins') || '0', 10);
      if (isNaN(curCoins) || curCoins < 50000) localStorage.setItem('runverse-total-coins', '50000');
      if (!localStorage.getItem('runverse-player-name')) localStorage.setItem('runverse-player-name', 'Kishore');
    } catch {}
  }
}
