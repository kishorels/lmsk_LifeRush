export const TUTORIAL_STORAGE_KEY = 'runverse-tutorial-done';

export const TUTORIAL_STEPS = [
  {
    id: 'move',
    badge: 'STEP 1',
    icon: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 7 3 12l5 5"/><path d="M16 7l5 5-5 5"/><path d="M3 12h18"/></svg>',
    title: 'SWIPE LEFT OR RIGHT',
    desc: 'Switch lanes to dodge buses & barriers',
    anim: 'tut-anim-lr',
    timeout: 5.5,
  },
  {
    id: 'jump',
    badge: 'STEP 2',
    icon: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5"/><path d="m6 11 6-6 6 6"/></svg>',
    title: 'SWIPE UP TO JUMP',
    desc: 'Clear barriers & climb onto bus roofs',
    anim: 'tut-anim-up',
    timeout: 5.5,
  },
  {
    id: 'slide',
    badge: 'STEP 3',
    icon: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14"/><path d="m6 13 6 6 6-6"/></svg>',
    title: 'SWIPE DOWN · 2x ROLL',
    desc: 'Slide under arches · Double-swipe Down to roll',
    anim: 'tut-anim-down',
    timeout: 5.5,
  },
  {
    id: 'power',
    badge: 'STEP 4',
    icon: '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z"/></svg>',
    title: 'HOLD POWER & SWIPE ↑ / ←',
    desc: 'Hold POWER button, swipe up or left to activate',
    anim: 'tut-anim-pulse',
    timeout: 6.5,
  },
];

function isDoneStored() {
  try { return localStorage.getItem(TUTORIAL_STORAGE_KEY) === '1'; } catch { return false; }
}
function setDoneStored(done) {
  try {
    if (done) localStorage.setItem(TUTORIAL_STORAGE_KEY, '1');
    else localStorage.removeItem(TUTORIAL_STORAGE_KEY);
  } catch {}
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

  let completed = isDoneStored();
  let active = false;
  let steps = [];
  let stepIndex = 0;
  let stepStartedAt = 0;
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
      onToast?.('Interactive tutorial will play on your next run');
    };
  }
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('keydown', event => {
      if (event.key === 'Escape' && modal && !modal.hidden) closeNotice();
    });
  }

  function clearPowerHighlight() {
    powerTrigger?.classList?.remove('tutorial-highlight');
  }

  function hideBanner() {
    if (banner && !banner.hidden) banner.hidden = true;
    clearPowerHighlight();
    lastRenderKey = '';
  }

  function finish(celebrate = false) {
    completed = true;
    setDoneStored(true);
    clearPowerHighlight();
    if (celebrate && banner) {
      active = false;
      celebrateUntil = (getState?.()?.time || 0) + 1.8;
      renderDone();
    } else {
      active = false;
      celebrateUntil = 0;
      hideBanner();
    }
  }

  function resetTutorial() {
    completed = false;
    setDoneStored(false);
    active = false;
    celebrateUntil = 0;
    steps = [];
    stepIndex = 0;
    hideBanner();
  }

  if (skipBtn) {
    skipBtn.onclick = event => {
      event.preventDefault();
      event.stopPropagation();
      finish(false);
    };
    skipBtn.addEventListener?.('pointerdown', event => event.stopPropagation());
  }

  function startRun(state) {
    celebrateUntil = 0;
    if (completed || !state || state.map === 'grandfather') {
      active = false;
      hideBanner();
      return;
    }
    const hasPowers = Boolean(state.slots?.length);
    steps = hasPowers ? TUTORIAL_STEPS.slice() : TUTORIAL_STEPS.filter(st => st.id !== 'power');
    stepIndex = 0;
    stepStartedAt = state.time || 0;
    active = steps.length > 0;
    lastRenderKey = '';
    update(state);
  }

  function advance(state) {
    if (!active) return;
    stepIndex++;
    if (stepIndex >= steps.length) {
      finish(true);
      return;
    }
    stepStartedAt = state?.time || 0;
    lastRenderKey = '';
    update(state);
  }

  function onAction(actionName) {
    if (!active) return;
    const cur = steps[stepIndex];
    if (!cur) return;
    const s = getState?.();
    if (s?.mode !== 'running') return;
    if (cur.id === 'move' && (actionName === 'left' || actionName === 'right')) advance(s);
    else if (cur.id === 'jump' && actionName === 'jump') advance(s);
    else if (cur.id === 'slide' && actionName === 'slide') advance(s);
  }

  function onPowerInteract() {
    if (!active) return;
    const cur = steps[stepIndex];
    if (cur?.id === 'power') advance(getState?.());
  }

  function renderDone() {
    if (!banner) return;
    const key = 'done';
    if (lastRenderKey === key) return;
    lastRenderKey = key;
    banner.hidden = false;
    banner.classList.add('is-complete');
    if (stepBadgeEl) stepBadgeEl.textContent = 'READY';
    if (iconEl) {
      iconEl.className = 'tut-icon';
      iconEl.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
    }
    if (titleEl) titleEl.textContent = 'ALL SET! GOOD LUCK!';
    if (descEl) descEl.textContent = 'Check How to Play anytime from the menu';
    if (skipBtn) skipBtn.hidden = true;
    clearPowerHighlight();
  }

  function update(state = getState?.()) {
    if (!banner) return;
    if (!state || state.mode !== 'running') {
      if (!banner.hidden) banner.hidden = true;
      clearPowerHighlight();
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
    const cur = steps[stepIndex];
    if (!cur) { finish(false); return; }
    // Gentle timeout auto-advance so a player who focuses on dodging is never stuck on one cue.
    if ((state.time || 0) - stepStartedAt >= cur.timeout) {
      advance(state);
      return;
    }
    const key = `${cur.id}:${stepIndex}/${steps.length}`;
    if (lastRenderKey !== key) {
      lastRenderKey = key;
      banner.classList.remove('is-complete');
      if (stepBadgeEl) stepBadgeEl.textContent = `${stepIndex + 1} / ${steps.length}`;
      if (iconEl) {
        iconEl.className = `tut-icon ${cur.anim}`;
        iconEl.innerHTML = cur.icon;
      }
      if (titleEl) titleEl.textContent = cur.title;
      if (descEl) descEl.textContent = cur.desc;
      if (skipBtn) skipBtn.hidden = false;
    }
    if (banner.hidden) banner.hidden = false;
    powerTrigger?.classList?.toggle('tutorial-highlight', cur.id === 'power');
  }

  return {
    openNotice,
    closeNotice,
    resetTutorial,
    startRun,
    onAction,
    onPowerInteract,
    update,
    isNoticeOpen: () => Boolean(modal && !modal.hidden),
    isCompleted: () => completed,
    isActive: () => active,
    currentStepId: () => (active ? steps[stepIndex]?.id || null : null),
  };
}
