export const TUTORIAL_STORAGE_KEY = 'runverse-tutorial-done';
export const POWER_TUTORIAL_STORAGE_KEY = 'runverse-power-tutorial-done';

const BIG_ARROW_LEFT = '<svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>';
const BIG_ARROW_RIGHT = '<svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>';
const BIG_ARROW_UP = '<svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5"/><path d="m5 12 7-7 7 7"/></svg>';
const BIG_ARROW_DOWN = '<svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>';
const BIG_CAM_ICON = '<svg viewBox="0 0 24 24" width="40" height="40" fill="currentColor" aria-hidden="true"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>';
const BIG_POWER_ICON = '<svg viewBox="0 0 24 24" width="40" height="40" fill="currentColor" aria-hidden="true"><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z"/></svg>';

const PICKUP_IGNORE = new Set(['coin', 'magnet', 'shield', 'nitro', 'shoes', 'doubleCoins', 'doubleJump', 'slow', 'ghost', 'trail', 'wave', 'rush', 'turboPad', 'jumpPad', 'mysteryCrate', 'letter']);

function getStored(key) {
  try { return localStorage.getItem(key) === '1'; } catch { return false; }
}
function setStored(key, done) {
  try {
    if (done) localStorage.setItem(key, '1');
    else localStorage.removeItem(key);
  } catch {}
}

function pickSafeDodgeDirection(state, obstacleZ) {
  const curLane = Math.round(state.lane ?? 0);
  const candidates = [];
  if (curLane > -1) candidates.push({ dir: 'left', lane: curLane - 1 });
  if (curLane < 1) candidates.push({ dir: 'right', lane: curLane + 1 });
  const isLaneBlocked = (lane) => {
    const ev = state.entryVan;
    if (ev && ev.lane === lane && obstacleZ >= ev.ramp - 4 && obstacleZ <= ev.front + 4) return true;
    for (const o of state.items || []) {
      if (o.done || PICKUP_IGNORE.has(o.type)) continue;
      if (Math.round(o.lane) !== lane) continue;
      const len = o.length || 3;
      if (obstacleZ >= o.z - 6 && obstacleZ <= o.z + len + 6) return true;
    }
    return false;
  };
  const open = candidates.find(c => !isLaneBlocked(c.lane));
  return (open || candidates[0] || { dir: 'left' }).dir;
}

function detectAheadObstaclePrompt(state, learned) {
  const dist = state.distance || 0;
  const curLane = Math.round(state.lane ?? 0);

  // 1. Entry van ramp right ahead -> teach climbing / jumping onto the roof!
  const ev = state.entryVan;
  if (!learned.jump && ev && Math.abs(ev.lane - curLane) < 0.55) {
    const dzRamp = ev.ramp - dist;
    if (dzRamp >= 4 && dzRamp <= 16) {
      return {
        id: 'jump',
        requiredAction: 'jump',
        badge: 'CLIMB / JUMP',
        icon: BIG_ARROW_UP,
        anim: 'tut-anim-up',
        title: 'SWIPE UP TO JUMP',
        desc: 'Jump onto the bus ramp or over hurdles!'
      };
    }
  }

  // 2. Scan upcoming obstacles in the player's current lane
  let nearest = null;
  let nearestDz = Infinity;
  for (const o of state.items || []) {
    if (o.done || PICKUP_IGNORE.has(o.type)) continue;
    if (o.encounter && !o.started) continue;
    if (Math.abs((o.lane ?? 0) - curLane) >= 0.55) continue;
    const dz = o.z - dist;
    if (dz >= 5 && dz <= 21 && dz < nearestDz) {
      nearest = o;
      nearestDz = dz;
    }
  }
  if (!nearest) return null;

  if (nearest.type === 'jump' && !learned.jump) {
    return {
      id: 'jump',
      requiredAction: 'jump',
      badge: 'JUMP',
      icon: BIG_ARROW_UP,
      anim: 'tut-anim-up',
      title: 'SWIPE UP TO JUMP',
      desc: 'Swipe UP or tap JUMP to clear the obstacle!'
    };
  }
  if (nearest.type === 'slide' && !learned.slide) {
    return {
      id: 'slide',
      requiredAction: 'slide',
      badge: 'SLIDE',
      icon: BIG_ARROW_DOWN,
      anim: 'tut-anim-down',
      title: 'SWIPE DOWN TO SLIDE',
      desc: 'Swipe DOWN or tap SLIDE to go underneath!'
    };
  }
  if ((nearest.type === 'block' || nearest.type === 'bus' || nearest.type === 'sideVehicle') && !learned.move) {
    const dir = pickSafeDodgeDirection(state, nearest.z);
    return {
      id: 'move',
      requiredAction: dir,
      badge: dir === 'left' ? 'MOVE LEFT' : 'MOVE RIGHT',
      icon: dir === 'left' ? BIG_ARROW_LEFT : BIG_ARROW_RIGHT,
      anim: dir === 'left' ? 'tut-anim-left' : 'tut-anim-right',
      title: dir === 'left' ? 'SWIPE LEFT TO DODGE' : 'SWIPE RIGHT TO DODGE',
      desc: dir === 'left' ? 'Move left into the open lane to continue!' : 'Move right into the open lane to continue!'
    };
  }
  return null;
}

function hasHazardVeryClose(state) {
  const dist = state.distance || 0;
  const curLane = Math.round(state.lane ?? 0);
  for (const o of state.items || []) {
    if (o.done || PICKUP_IGNORE.has(o.type)) continue;
    if (Math.abs((o.lane ?? 0) - curLane) < 0.55 && o.z >= dist - 2 && o.z <= dist + 15) return true;
  }
  return false;
}

export function createTutorialGuide({ getState, onNoticeToggle, onToast } = {}) {
  const get = id => (typeof document !== 'undefined' ? document.getElementById(id) : null);
  const modal = get('howto-modal');
  const openBtn = get('btn-open-howto');
  const settingsBtn = get('btn-settings-howto');
  const closeBtn = get('btn-close-howto');
  const gotItBtn = get('btn-howto-gotit');
  const replayBtn = get('btn-replay-tutorial');

  const banner = get('run-tutorial-banner');
  const stepBadgeEl = get('tut-step-badge');
  const iconEl = get('tut-icon');
  const titleEl = get('tut-title');
  const descEl = get('tut-desc');
  const skipBtn = get('btn-tut-skip');
  const powerTrigger = get('power-trigger');
  const camBtn = get('btn-camera');

  let coreCompleted = getStored(TUTORIAL_STORAGE_KEY);
  let powerCompleted = getStored(POWER_TUTORIAL_STORAGE_KEY);
  let active = false;
  let powerOnlyRun = false;
  let activeCue = null; // When non-null, simulation is FROZEN until player performs the move!
  let learned = { move: false, jump: false, slide: false, camera: false, power: false };
  let lastCueEndedAt = -10;
  let celebrateUntil = 0;
  let lastRenderKey = '';

  function openNotice() {
    if (!modal) return;
    modal.hidden = false;
    onNoticeToggle?.(true);
  }
  function closeNotice() {
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    onNoticeToggle?.(false);
  }

  if (openBtn) openBtn.onclick = openNotice;
  if (settingsBtn) settingsBtn.onclick = openNotice;
  if (closeBtn) closeBtn.onclick = closeNotice;
  if (gotItBtn) gotItBtn.onclick = closeNotice;
  if (modal) {
    modal.addEventListener('click', event => {
      if (event.target === modal) closeNotice();
    });
  }
  if (replayBtn) {
    replayBtn.onclick = () => {
      resetTutorial();
      closeNotice();
      onToast?.('Live interactive tutorial will play on your next run');
    };
  }
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('keydown', event => {
      if (event.key === 'Escape' && modal && !modal.hidden) closeNotice();
    });
  }

  function clearHighlights() {
    powerTrigger?.classList?.remove('tutorial-highlight');
    camBtn?.classList?.remove('tutorial-highlight');
  }

  function hideBanner() {
    if (banner && !banner.hidden) banner.hidden = true;
    banner?.classList?.remove('is-frozen', 'is-complete');
    clearHighlights();
    lastRenderKey = '';
  }

  function finishCore(celebrate = true) {
    coreCompleted = true;
    setStored(TUTORIAL_STORAGE_KEY, true);
    if (learned.power && getState?.()?.slots?.length) {
      powerCompleted = true;
      setStored(POWER_TUTORIAL_STORAGE_KEY, true);
    }
    activeCue = null;
    active = false;
    clearHighlights();
    if (celebrate && banner) {
      celebrateUntil = (getState?.()?.time || 0) + 1.8;
      renderDone();
    } else {
      celebrateUntil = 0;
      hideBanner();
    }
  }

  function resetTutorial() {
    coreCompleted = false;
    powerCompleted = false;
    setStored(TUTORIAL_STORAGE_KEY, false);
    setStored(POWER_TUTORIAL_STORAGE_KEY, false);
    active = false;
    powerOnlyRun = false;
    activeCue = null;
    learned = { move: false, jump: false, slide: false, camera: false, power: false };
    celebrateUntil = 0;
    hideBanner();
  }

  if (skipBtn) {
    skipBtn.onclick = event => {
      event.preventDefault();
      event.stopPropagation();
      if (powerOnlyRun) {
        powerCompleted = true;
        setStored(POWER_TUTORIAL_STORAGE_KEY, true);
      } else {
        coreCompleted = true;
        setStored(TUTORIAL_STORAGE_KEY, true);
        if (getState?.()?.slots?.length) {
          powerCompleted = true;
          setStored(POWER_TUTORIAL_STORAGE_KEY, true);
        }
      }
      activeCue = null;
      active = false;
      celebrateUntil = 0;
      hideBanner();
    };
    skipBtn.addEventListener?.('pointerdown', event => event.stopPropagation());
  }

  function startRun(state) {
    celebrateUntil = 0;
    activeCue = null;
    lastCueEndedAt = -10;
    lastRenderKey = '';
    if (!state || state.map === 'grandfather') {
      active = false;
      hideBanner();
      return;
    }
    const hasPowers = Boolean(state.slots?.length);
    if (!coreCompleted) {
      active = true;
      powerOnlyRun = false;
      learned = { move: false, jump: false, slide: false, camera: false, power: !hasPowers };
      hideBanner();
      update(state);
    } else if (hasPowers && !powerCompleted) {
      // Player just unlocked/equipped Powers for the first time -> teach Power button!
      active = true;
      powerOnlyRun = true;
      learned = { move: true, jump: true, slide: true, camera: true, power: false };
      hideBanner();
      update(state);
    } else {
      active = false;
      hideBanner();
    }
  }

  function clearActiveCue(state) {
    activeCue = null;
    lastCueEndedAt = state?.time || 0;
    hideBanner();
    const hasPowers = Boolean(state?.slots?.length);
    const coreDoneNow = learned.camera && (learned.move || learned.jump || learned.slide);
    if (powerOnlyRun && learned.power) {
      powerCompleted = true;
      setStored(POWER_TUTORIAL_STORAGE_KEY, true);
      active = false;
      celebrateUntil = (state?.time || 0) + 1.8;
      renderDone();
    } else if (!powerOnlyRun && coreDoneNow && (!hasPowers || learned.power)) {
      finishCore(true);
    }
  }

  function onAction(actionName) {
    if (!active) return false;
    const s = getState?.();
    if (s?.mode !== 'running') return false;

    if (activeCue) {
      if (activeCue.id === 'move' && (actionName === activeCue.requiredAction || actionName === 'left' || actionName === 'right')) {
        learned.move = true;
        clearActiveCue(s);
        return true;
      }
      if (activeCue.id === 'jump' && actionName === 'jump') {
        learned.jump = true;
        clearActiveCue(s);
        return true;
      }
      if (activeCue.id === 'slide' && actionName === 'slide') {
        learned.slide = true;
        clearActiveCue(s);
        return true;
      }
      return false;
    }
    return false;
  }

  function onCameraInteract() {
    if (!active || activeCue?.id !== 'camera') return;
    learned.camera = true;
    clearActiveCue(getState?.());
  }

  function onPowerInteract() {
    if (!active || activeCue?.id !== 'power') return;
    learned.power = true;
    clearActiveCue(getState?.());
  }

  function renderCue(cue) {
    if (!banner || !cue) return;
    const key = `${cue.id}:${cue.requiredAction || ''}`;
    if (lastRenderKey !== key) {
      lastRenderKey = key;
      banner.classList.remove('is-complete');
      banner.classList.add('is-frozen');
      if (stepBadgeEl) stepBadgeEl.textContent = cue.badge;
      if (iconEl) {
        iconEl.className = `tut-arrow-stage ${cue.anim}`;
        iconEl.innerHTML = cue.icon;
      }
      if (titleEl) titleEl.textContent = cue.title;
      if (descEl) descEl.textContent = cue.desc;
      if (skipBtn) skipBtn.hidden = false;
    }
    if (banner.hidden) banner.hidden = false;
    camBtn?.classList?.toggle('tutorial-highlight', cue.id === 'camera');
    powerTrigger?.classList?.toggle('tutorial-highlight', cue.id === 'power');
  }

  function renderDone() {
    if (!banner) return;
    const key = 'done';
    if (lastRenderKey === key) return;
    lastRenderKey = key;
    banner.hidden = false;
    banner.classList.remove('is-frozen');
    banner.classList.add('is-complete');
    if (stepBadgeEl) stepBadgeEl.textContent = 'READY';
    if (iconEl) {
      iconEl.className = 'tut-arrow-stage';
      iconEl.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
    }
    if (titleEl) titleEl.textContent = 'ALL SET! HAVE FUN!';
    if (descEl) descEl.textContent = 'Replay anytime from How to Play';
    if (skipBtn) skipBtn.hidden = true;
    clearHighlights();
  }

  function update(state = getState?.()) {
    if (!banner) return;
    if (!state || state.mode !== 'running') {
      if (!banner.hidden) banner.hidden = true;
      clearHighlights();
      return;
    }
    if (celebrateUntil > 0) {
      if ((state.time || 0) >= celebrateUntil) {
        celebrateUntil = 0;
        hideBanner();
      } else {
        renderDone();
      }
      return;
    }
    if (!active) {
      if (!banner.hidden) banner.hidden = true;
      return;
    }

    // If already frozen on an active cue, keep showing it until player completes it (or clicks Skip)
    if (activeCue) {
      renderCue(activeCue);
      return;
    }

    const now = state.time || 0;
    const dist = state.distance || 0;
    const hasPowers = Boolean(state.slots?.length);

    // Power-only run (when player unlocked powers on a later run)
    if (powerOnlyRun) {
      if (hasPowers && !learned.power && dist >= 30 && !hasHazardVeryClose(state)) {
        activeCue = {
          id: 'power',
          badge: 'POWER BUTTON',
          icon: BIG_POWER_ICON,
          anim: 'tut-anim-pulse',
          title: 'USE YOUR POWER!',
          desc: 'Hold the glowing POWER button & swipe to activate!'
        };
        renderCue(activeCue);
      }
      return;
    }

    // 1. Live obstacle-triggered movement cues (pause right before real obstacles!)
    const obsCue = detectAheadObstaclePrompt(state, learned);
    if (obsCue) {
      activeCue = obsCue;
      renderCue(activeCue);
      return;
    }

    // 2. Camera angle cue (after learning at least 2 moves or reaching 95m in a clear spot)
    const movesLearned = (learned.move ? 1 : 0) + (learned.jump ? 1 : 0) + (learned.slide ? 1 : 0);
    if (!learned.camera && (movesLearned >= 2 || dist >= 95) && (now - lastCueEndedAt) >= 1.2 && !hasHazardVeryClose(state)) {
      activeCue = {
        id: 'camera',
        badge: 'CAMERA VIEW',
        icon: BIG_CAM_ICON,
        anim: 'tut-anim-pulse',
        title: 'TAP CAM TO CHANGE VIEW',
        desc: 'Tap the glowing CAM button at the top to switch angle!'
      };
      renderCue(activeCue);
      return;
    }

    // 3. Power button cue (ONLY if player has equipped powers!)
    if (learned.camera && hasPowers && !learned.power && (now - lastCueEndedAt) >= 1.5 && !hasHazardVeryClose(state)) {
      activeCue = {
        id: 'power',
        badge: 'POWER BUTTON',
        icon: BIG_POWER_ICON,
        anim: 'tut-anim-pulse',
        title: 'USE YOUR POWER!',
        desc: 'Hold the glowing POWER button & swipe to activate!'
      };
      renderCue(activeCue);
    }
  }

  return {
    openNotice,
    closeNotice,
    isNoticeOpen: () => Boolean(modal && !modal.hidden),
    startRun,
    update,
    onAction,
    onCameraInteract,
    onPowerInteract,
    resetTutorial,
    isFrozen: () => Boolean(active && activeCue),
    isActive: () => active,
    isCompleted: () => coreCompleted,
    currentStepId: () => (active && activeCue ? activeCue.id : null),
  };
}
