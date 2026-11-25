import {playVillageMemory} from './village-memory-player.js';
import {GRANDFATHER_GATE,reachedMemory} from './grandfather-route.js?v=3.9.2';
import {createPowerControls, POWER_ICONS} from './power-controls.js?v=3.10.14';
import {createTutorialGuide} from './tutorial-guide.js?v=3.10.22y';
import {equipPowers,availablePowers,usePower} from './engine.js?v=3.10.22x';
import {createSound,playUiClick,playEnterSound,playLaunchClick} from './sound.js?v=3.10.22r';
import {CAPTURE_GESTURE_START,SWEEP_SECONDS,NITRO_MAX_HITS,fresh,action,step,height,isCapture,reviveRun,MAX_REVIVES_PER_RUN,SCHOOL_GATE,FINALRUN_GATE,finalRunGateFor} from './engine.js?v=3.10.22x';
import {
  LOGIN_STREAK_REWARDS,
  normalizeMissionState, canClaimDailyLogin, claimDailyLogin,
  recordRunForMissions, claimMissionReward, canClaimAllMissionsBonus,
  claimAllMissionsBonus, countPendingRewards
} from './missions.js?v=3.10.22x';
import {createAdManager,requiredAdsForRevive,formatCooldown} from './ads.js?v=3.10.19';
import {createFramePacer} from './frame-pacing.js';
import {createLiteRenderer} from './renderer-lite.js?v=3.9.2';

let rendererModulePromise = null;
function loadRendererModule() {
  if (!rendererModulePromise) {
    rendererModulePromise = import('./renderer3d.js?v=3.10.22u');
  }
  return rendererModulePromise;
}

import {
  POWER_BASE_SECONDS, POWER_UPGRADE_STEP_SECONDS, POWER_UPGRADE_COSTS,
  MAP_ORDER, MAP_UNLOCK_RULES, CHARACTER_COSTS,
  powers, powerById, powerDuration, isPowerUnlocked,
  freshProfile, normalizeProfile, mapBestFor, recordMapRunDistance,
  isMapUnlocked, isMapDistanceMet, canBuyMap, buyMap,
  isCharacterUnlocked, canBuyCharacter, buyCharacter
} from './progression.js';
import {initializeBuildProfile} from './build-profile.js?v=3.10.22';
initializeBuildProfile();
const profile = freshProfile();
const $=id=>document.getElementById(id);

const IC_COIN = '<img class="ui-coin-ic" width="14" height="14" src="assets/icons/coin.svg" alt="">';
const IC_MAGNET = '<img class="ui-coin-ic" width="14" height="14" src="assets/icons/magnet.svg" alt="">';
const IC_LOCK = '<svg class="ui-icon" viewBox="0 0 24 24" width="12" height="12" fill="currentColor" aria-hidden="true"><path d="M18 8h-1V6a5 5 0 0 0-10 0v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2zm-3.1 0H9.1V6a2.9 2.9 0 0 1 5.8 0v2z"/></svg>';
const IC_CHECK = '<svg class="ui-icon" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
const IC_BOLT = '<svg class="ui-icon" viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z"/></svg>';
const IC_FIRE = '<svg class="ui-icon" viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.61 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67z"/></svg>';
const IC_JUMP = '<svg class="ui-icon" viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="m12 4-7 7h4v9h6v-9h4l-7-7z"/></svg>';
const IC_RUN = '<svg class="ui-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 6 6 6-6 6"/><path d="m13 6 6 6-6 6"/></svg>';
const IC_SCHOOL = '<svg class="ui-icon" viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden="true"><path d="M12 3 1 9l11 6 9-4.91V17h2V9L12 3zm-7 9.18v4L12 20l7-3.82v-4L12 16l-7-3.82z"/></svg>';
const IC_COLLEGE = '<svg class="ui-icon" viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden="true"><path d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3 1 9l11 6 9-4.91V17h2V9L12 3z"/></svg>';
const IC_ITPARK = '<svg class="ui-icon" viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden="true"><path d="M19 2H9a2 2 0 0 0-2 2v3H5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z"/></svg>';
const IC_SOUND_ON = '<svg class="ui-icon" viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>';
const IC_SOUND_OFF = '<svg class="ui-icon" viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3 3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4 9.91 6.09 12 8.18V4z"/></svg>';
const IC_REPLAY = '<svg class="ui-icon" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>';
const IC_VIDEO = '<svg class="ui-icon" viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-2 14.5v-9l6.5 4.5-6.5 4.5z"/></svg>';
const IC_CHAR = '<svg class="ui-icon" viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>';
const IC_EXIT = '<svg class="ui-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>';
const IC_RUSH = '<svg class="ui-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 6 6 6-6 6"/><path d="m13 6 6 6-6 6"/></svg>';
let canvas=$('world');
let lastHudDist = -1, lastHudCoins = -1, lastHudBest = -1, lastMagSec = -1, lastShield = null, lastNitroSec = -1, lastShoesSec = -1, lastCoins2xSec = -1, lastGhostSec = -1, lastComboVal = 1, lastSpeedMode = 0, lastNearMissShown = 0, lastEventBannerShown = 0, lastMilestoneShown = 0, lastLmskMask = -1, lastFeverOn = false, lastFeverPct = -1, lastFeverSec = -1, closeCallHideTimer = 0, milestoneHideTimer = 0, lastCountdown = -1, lastShowCharBlur = null, lastShowCharErr = null, menuNeedsFrame = true, warmedFirstFrame = false, lastUnlockUiKey = '', lastRenderStatus = 'loading', loadingThrottleAccum = 0, carouselSwapTimer = 0, preloaderStarted = false;
const nameModalEl = $('name-modal');
const shopModalEl = $('shop-modal');
const privacyModalEl = $('privacy-modal');
const speedLinesEl = $('speed-lines');
const closeCallEl = $('close-call-pop');
const milestoneBannerEl = $('milestone-banner');
const feverMeterEl = $('fever-meter');
const feverMeterLabelEl = $('fever-meter-label');
const feverMeterFillEl = $('fever-meter-fill');
// Remove controls from a cached older HTML shell as well.
document.querySelectorAll('#btn-swag,.btn-swag-action,.select-guide-text').forEach(element=>element.remove());
let assetsReady = false;
let introFinished = false;
let rendererStarted = false;
let boyFraction = 0, chaserFraction = 0;

function scheduleRendererInit() {
  // Zero-lag 2D image menu: defer 3D WebGL initialization until the player starts a run!
}

function updateAssetProgress(type, fraction) {
  if (type === 'boy') boyFraction = Math.max(boyFraction, fraction);
  if (type === 'chaser') chaserFraction = Math.max(chaserFraction, fraction);
}

function activateEnterButton() {
  const wrap = $('splash-enter-wrap');
  const btn = $('btn-enter');
  const btnTxt = $('btn-enter-text');
  const arrow = $('btn-enter-arrow');

  if (wrap) {
    wrap.hidden = false;
    wrap.removeAttribute('hidden');
    wrap.style.display = 'flex';
  }
  if (btn) {
    btn.disabled = false;
    btn.removeAttribute('disabled');
    btn.classList.remove('loading');
    btn.classList.add('ready');
  }
  if (btnTxt) btnTxt.textContent = 'Enter LifeRush';
  if (arrow) arrow.hidden = false;
  if (!introFinished) {
    introFinished = true;
    if (typeof scheduleRendererInit === 'function') scheduleRendererInit();
  }
}

// Prevent OS media controls / lock-screen / headset play-pause keys from pausing cutscene videos.
try {
  if (typeof navigator !== 'undefined' && navigator.mediaSession?.setActionHandler) {
    for (const act of ['pause', 'stop', 'seekbackward', 'seekforward', 'seekto']) {
      try { navigator.mediaSession.setActionHandler(act, () => {}); } catch {}
    }
  }
} catch {}

function gamePauseVideo(v) {
  if (!v) return;
  v.dataset.gamePaused = '1';
  try { v.pause(); } catch {}
}

function lockVideoNoUserPause(v, shouldStayPlaying) {
  if (!v || v.dataset.pauseLocked === '1') return;
  v.dataset.pauseLocked = '1';
  v.controls = false;
  v.tabIndex = -1;
  v.removeAttribute('controls');
  v.setAttribute('controlslist', 'nodownload noplaybackrate noremoteplayback');
  v.setAttribute('disablepictureinpicture', '');
  v.setAttribute('disableremoteplayback', '');
  v.addEventListener('contextmenu', e => e.preventDefault());
  v.addEventListener('pause', () => {
    if (v.dataset.gamePaused === '1' || v.ended || document.hidden) return;
    if (shouldStayPlaying()) {
      queueMicrotask(() => {
        if (v.dataset.gamePaused !== '1' && !v.ended && !document.hidden && shouldStayPlaying()) {
          v.play().catch(() => {});
        }
      });
    }
  });
}

function setupIntroVideo() {
  const video = $('intro-video');
  if (!video) {
    activateEnterButton();
    return;
  }
  let wantSound = true;
  try { wantSound = localStorage.getItem('runverse-sound') !== 'off'; } catch {}
  video.muted = !wantSound;
  video.defaultMuted = !wantSound;
  video.volume = 1.0;

  let logoShown = false;
  function showButtonOnLogo() {
    if (logoShown) return;
    logoShown = true;
    activateEnterButton();
  }

  let videoFrozen = false;
  lockVideoNoUserPause(video, () => !videoFrozen && !introFinished && game.classList.contains('mode-splash'));
  function freezeAtEnd() {
    if (videoFrozen) return;
    videoFrozen = true;
    gamePauseVideo(video);
    showButtonOnLogo();
  }

  video.addEventListener('timeupdate', () => {
    // LMSK LifeRush title logo slams onto screen around 7.2s
    if (video.currentTime >= 7.2) {
      showButtonOnLogo();
    }
    // Freeze cleanly at 9.2s where the logo and runner are completely stationary and vibrant
    // Crucial: never seek or let video reach 10.0s where browser decoders unload frames to black
    if (video.currentTime >= 9.2) {
      freezeAtEnd();
    }
  });
  video.addEventListener('ended', freezeAtEnd);
  video.addEventListener('error', () => activateEnterButton());

  const tryPlay = () => {
    delete video.dataset.gamePaused;
    video.muted = !wantSound;
    video.defaultMuted = !wantSound;
    video.volume = 1.0;
    const p = video.play();
    if (p && typeof p.catch === 'function') {
      p.catch(() => {
        // Fallback if browser blocks unmuted autoplay before gesture: start muted, unmute on first touch
        video.muted = true;
        const p2 = video.play();
        if (p2 && typeof p2.catch === 'function') {
          p2.catch(() => setTimeout(() => {
            if (video.hasAttribute('src') && !videoFrozen && !introFinished) {
              delete video.dataset.gamePaused;
              video.play().catch(() => activateEnterButton());
            }
          }, 180));
        }
      });
    }
  };
  if (video.readyState >= 2) tryPlay();
  else {
    video.addEventListener('canplay', tryPlay, { once: true });
    tryPlay();
  }
  // Graceful safety timeout: if video stalls or cannot play, show button after 8.5 seconds
  setTimeout(() => {
    if (!introFinished) activateEnterButton();
  }, 8500);
}
setupIntroVideo();

function onAllAssetsReady() {
  if (assetsReady) return;
  assetsReady = true;
}

const CHARACTER_ROSTER = [
  { id: 'male', name: 'SCHOOL BOY', outfit: 'School Uniform · Starter Hero', gender: 'male', cost: CHARACTER_COSTS.male },
  { id: 'female', name: 'SCHOOL GIRL', outfit: 'School Uniform · Any Map', gender: 'female', cost: CHARACTER_COSTS.female },
  { id: 'college-male', name: 'COLLEGE BOY', outfit: 'Casual Outfit · Any Map', gender: 'male', cost: CHARACTER_COSTS['college-male'] },
  { id: 'college-woman', name: 'COLLEGE WOMAN', outfit: 'Blue Style · Any Map', gender: 'female', cost: CHARACTER_COSTS['college-woman'] },
  { id: 'college-man', name: 'COLLEGE MAN', outfit: 'Jacket Style · Any Map', gender: 'male', cost: CHARACTER_COSTS['college-man'] }
];

const game = canvas.closest('.game');
let s=fresh(),best=0,totalCoins=0,
    equippedCharId='male',character='male',selectedMap='school',inspectedLockedMap='college',carouselIndex=0,currentHub='home',
    sound=true,prev=0,w=600,h=700;

export const isLocalTest = typeof window !== 'undefined' && Boolean(
  (window.location?.search?.includes('unlock=all') ||
   window.location?.search?.includes('test=1')) &&
  !window.Capacitor?.isNativePlatform?.()
);

const isMapOpen = mapId => isLocalTest || isMapUnlocked(profile, mapId);
const isCharUnlocked = entry => isLocalTest || isCharacterUnlocked(profile, typeof entry === 'string' ? entry : entry?.id);

try{
  best=Math.max(0,Math.floor(Number(localStorage.getItem('runverse-best'))||0));
  totalCoins=Math.max(0,Math.floor(Number(localStorage.getItem('runverse-total-coins'))||0));
  try {
    const stored = JSON.parse(localStorage.getItem('runverse-progression'));
    Object.assign(profile, normalizeProfile(stored));
  } catch {}
  const savedChar = localStorage.getItem('runverse-character') || 'male';
  const rawSavedMap = localStorage.getItem('runverse-map') || 'school';
  selectedMap = (MAP_ORDER.includes(rawSavedMap) && isMapOpen(rawSavedMap)) ? rawSavedMap : 'school';
  const savedCharEntry = CHARACTER_ROSTER.find(c => c.id === savedChar);
  equippedCharId = (savedCharEntry && isCharUnlocked(savedCharEntry)) ? savedCharEntry.id : 'male';
  character = (equippedCharId.includes('female') || equippedCharId.includes('woman')) ? 'female' : 'male';
  carouselIndex = Math.max(0, CHARACTER_ROSTER.findIndex(c => c.id === equippedCharId));
  inspectedLockedMap = MAP_ORDER.find(id => !isMapOpen(id)) || '';
}catch{}
s.map=selectedMap;

const initialModelKey = equippedCharId;

let draw;
let usingLiteRenderer = false;
let touch;
function bindCanvasPointer(target) {
  if (!target) return;
  target.addEventListener('pointerdown',e=>{
    touch={x:e.clientX,y:e.clientY};
    try{target.setPointerCapture(e.pointerId);}catch{}
    if((s.mode==='ready'||s.mode==='select')&&selectedMap!=='finalrun') triggerSwag();
  });
  target.addEventListener('pointerup',e=>{
    if(!touch)return;
    const x=e.clientX-touch.x,y=e.clientY-touch.y;
    if(s.mode==='ready'&&currentHub==='characters'&&Math.abs(x)>Math.abs(y)&&Math.abs(x)>24){
      moveCarousel(x<0?1:-1);
    } else if(Math.max(Math.abs(x),Math.abs(y))>20){
      input(Math.abs(x)>Math.abs(y)?x>0?'right':'left':y>0?'slide':'jump');
    }
    touch=null;
  });
  target.addEventListener('pointercancel',()=>touch=null);
}
bindCanvasPointer(canvas);

function switchToLiteRenderer(reason) {
  if (usingLiteRenderer) return;
  usingLiteRenderer = true;
  console.warn('Using lightweight graphics:', reason);
  let ctx2d = null;
  try { ctx2d = canvas.getContext('2d'); } catch {}
  if (!ctx2d && canvas?.parentNode) {
    const freshCanvas = canvas.cloneNode(false);
    canvas.replaceWith(freshCanvas);
    canvas = freshCanvas;
    bindCanvasPointer(canvas);
  }
  draw = createLiteRenderer(canvas);
  const ed = document.querySelector('.edition');
  if (ed) ed.textContent = 'COAST EDITION · LITE';
  onAllAssetsReady();
}

const framePacer = createFramePacer();
let lastDrawnRun=null, lastDrawnRunTime=0;
let graphicsQuality = 'auto';
try {
  const savedGfx = localStorage.getItem('runverse-gfx');
  if (['auto', 'low', 'med', 'high', 'ultra'].includes(savedGfx)) graphicsQuality = savedGfx;
} catch {}
const GFX_HINTS = {
  auto: 'Auto · Dynamic 60 FPS for your phone',
  low: 'Low · Max 60 FPS for low-end phones',
  med: 'Medium · Balanced shadows & speed',
  high: 'High · Full detail for flagship devices',
  ultra: 'Ultra · Realistic body physics, camera & VFX'
};
function syncGraphicsUI() {
  document.querySelectorAll('[data-gfx]').forEach(btn => {
    const active = btn.dataset.gfx === graphicsQuality;
    btn.classList.toggle('selected', active);
    btn.setAttribute('aria-pressed', String(active));
  });
  if (typeof document !== 'undefined' && document.body) {
    document.body.classList.toggle('gfx-ultra', graphicsQuality === 'ultra');
  }
  if ($('gfx-quality-hint')) $('gfx-quality-hint').textContent = GFX_HINTS[graphicsQuality] || GFX_HINTS.auto;
}
syncGraphicsUI();
document.querySelectorAll('[data-gfx]').forEach(btn => {
  btn.onclick = () => {
    const next = btn.dataset.gfx;
    if (!['auto', 'low', 'med', 'high', 'ultra'].includes(next)) return;
    graphicsQuality = next;
    framePacer.reset();
    try { localStorage.setItem('runverse-gfx', graphicsQuality); } catch {}
    syncGraphicsUI();
    draw?.setGraphicsQuality?.(graphicsQuality);
  };
});

const CAMERA_MODES = ['classic', 'action', 'closeup', 'fpv'];
let cameraAngle = 'classic';
try {
  const savedCam = localStorage.getItem('runverse-camera');
  if (CAMERA_MODES.includes(savedCam)) cameraAngle = savedCam;
} catch {}
const CAM_HINTS = {
  classic: 'Classic · Elevated view for spotting obstacles',
  action: 'Action · Low cinematic angle behind runner',
  closeup: 'Close · Tight over-the-shoulder action view',
  fpv: 'FPV · First-person runner view (you are running!)'
};
const CAM_LABELS = { classic: 'CAM 1', action: 'CAM 2', closeup: 'CAM 3', fpv: 'CAM 4' };
const CAM_TOASTS = { classic: 'Camera: Classic (CAM 1)', action: 'Camera: Low Action (CAM 2)', closeup: 'Camera: Close-Up (CAM 3)', fpv: 'Camera: First Person (CAM 4)' };
function syncCameraUI() {
  document.querySelectorAll('[data-cam]').forEach(btn => {
    const active = btn.dataset.cam === cameraAngle;
    btn.classList.toggle('selected', active);
    btn.setAttribute('aria-pressed', String(active));
  });
  if ($('cam-angle-hint')) $('cam-angle-hint').textContent = CAM_HINTS[cameraAngle] || CAM_HINTS.classic;
  const hudCam = $('btn-camera');
  if (hudCam) {
    hudCam.classList.toggle('is-action', cameraAngle !== 'classic');
    hudCam.setAttribute('aria-pressed', String(cameraAngle !== 'classic'));
  }
  if ($('hud-cam-label')) $('hud-cam-label').textContent = CAM_LABELS[cameraAngle] || 'CAM 1';
}
function setCameraAngleMode(next, showNotice = false) {
  cameraAngle = CAMERA_MODES.includes(next) ? next : 'classic';
  try { localStorage.setItem('runverse-camera', cameraAngle); } catch {}
  syncCameraUI();
  draw?.setCameraAngle?.(cameraAngle);
  if (showNotice && $('toast') && s.mode === 'running') {
    $('toast').textContent = CAM_TOASTS[cameraAngle] || 'Camera: Classic';
    $('toast').hidden = false;
    clearTimeout(setCameraAngleMode._t);
    setCameraAngleMode._t = setTimeout(() => { if ($('toast')) $('toast').hidden = true; }, 1100);
  }
}
function cycleCameraAngle(showNotice = true) {
  const idx = CAMERA_MODES.indexOf(cameraAngle);
  setCameraAngleMode(CAMERA_MODES[(idx + 1) % CAMERA_MODES.length], showNotice);
  tutorialGuide?.onCameraInteract?.();
}
syncCameraUI();
document.querySelectorAll('[data-cam]').forEach(btn => {
  btn.onclick = () => setCameraAngleMode(btn.dataset.cam, false);
});
if ($('btn-camera')) {
  $('btn-camera').onclick = e => {
    e.stopPropagation();
    cycleCameraAngle(true);
  };
}

let dailyState = normalizeMissionState(null);
try {
  dailyState = normalizeMissionState(JSON.parse(localStorage.getItem('runverse-missions-v1')));
} catch {}
function saveDailyState() {
  try { localStorage.setItem('runverse-missions-v1', JSON.stringify(dailyState)); } catch {}
}
function syncDailyNotifBadge() {
  const badge = $('daily-notif-badge');
  if (!badge) return;
  const pending = countPendingRewards(dailyState);
  badge.hidden = pending <= 0;
  badge.textContent = String(pending);
}
function renderDailyModal() {
  syncDailyNotifBadge();
  if ($('daily-wallet-line')) $('daily-wallet-line').textContent = `${totalCoins.toLocaleString()} Coins`;
  const streakGrid = $('daily-streak-grid');
  if (streakGrid) {
    const canLogin = canClaimDailyLogin(dailyState);
    const todayIdx = Math.max(0, Math.min(6, (dailyState.streakDay || 1) - 1));
    streakGrid.innerHTML = LOGIN_STREAK_REWARDS.map((rew, i) => {
      const done = i < todayIdx || (i === todayIdx && !canLogin);
      const isToday = i === todayIdx && canLogin;
      return `<div class="streak-cell ${done ? 'is-done' : ''} ${isToday ? 'is-today' : ''}"><span>D${i + 1}</span><b>+${rew}</b></div>`;
    }).join('');
    const loginBtn = $('btn-claim-login');
    if (loginBtn) {
      loginBtn.hidden = !canLogin;
      if (canLogin) loginBtn.textContent = `CLAIM DAY ${todayIdx + 1} LOGIN · +${LOGIN_STREAK_REWARDS[todayIdx]} COINS`;
    }
  }
  const mList = $('daily-missions-list');
  if (mList) {
    mList.innerHTML = dailyState.missions.map(m => {
      const pct = Math.min(100, Math.round((m.progress / Math.max(1, m.target)) * 100));
      const ready = !m.claimed && m.progress >= m.target;
      const btnText = m.claimed ? 'CLAIMED' : ready ? `CLAIM +${m.reward}` : `+${m.reward}`;
      return `<div class="mission-row"><div class="mission-meta"><strong>${m.title}</strong><div class="mission-bar"><i style="width:${pct}%"></i></div><small>${m.progress.toLocaleString()} / ${m.target.toLocaleString()}</small></div><button type="button" class="mission-claim-btn" data-claim-mission="${m.id}" ${ready ? '' : 'disabled'}>${btnText}</button></div>`;
    }).join('');
    mList.querySelectorAll('[data-claim-mission]').forEach(btn => {
      btn.onclick = () => {
        const res = claimMissionReward(dailyState, btn.dataset.claimMission);
        if (!res.ok) return;
        totalCoins += res.reward;
        saveDailyState();
        save(true);
        effects.play('upgrade');
        updateUnlockUI();
        updateCarouselUI();
        renderDailyModal();
      };
    });
  }
  const bonusBtn = $('btn-claim-all-bonus');
  if (bonusBtn) bonusBtn.hidden = !canClaimAllMissionsBonus(dailyState);
}
if ($('btn-daily-hub')) {
  $('btn-daily-hub').onclick = () => {
    playUiClick();
    renderDailyModal();
    $('daily-modal')?.showModal?.();
  };
}
if ($('btn-close-daily')) {
  $('btn-close-daily').onclick = () => $('daily-modal')?.close?.();
}
if ($('btn-claim-login')) {
  $('btn-claim-login').onclick = () => {
    const res = claimDailyLogin(dailyState);
    if (!res.ok) return;
    totalCoins += res.reward;
    saveDailyState();
    save(true);
    effects.play('upgrade');
    updateUnlockUI();
    updateCarouselUI();
    renderDailyModal();
  };
}
if ($('btn-claim-all-bonus')) {
  $('btn-claim-all-bonus').onclick = () => {
    const res = claimAllMissionsBonus(dailyState);
    if (!res.ok) return;
    totalCoins += res.reward;
    saveDailyState();
    save(true);
    effects.play('upgrade');
    updateUnlockUI();
    updateCarouselUI();
    renderDailyModal();
  };
}
syncDailyNotifBadge();

async function ensureRenderer(targetCharKey = equippedCharId) {
  if (rendererStarted || draw) return;
  rendererStarted = true;
  try{
    const {createRenderer} = await loadRendererModule();
    if (draw) return;
    draw=createRenderer(canvas, {
      initialModelKey: targetCharKey || initialModelKey,
      graphicsQuality,
      cameraAngle,
      onBoyProgress: f => updateAssetProgress('boy', f),
      onChaserProgress: f => updateAssetProgress('chaser', f)
    });
  }catch(error){
    switchToLiteRenderer(error?.message || error);
  }
}

let saveTimer = 0;
const flushSave = () => {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = 0; }
  try{
    localStorage.setItem('runverse-progression',JSON.stringify(profile));
    localStorage.setItem('runverse-best',best);
    localStorage.setItem('runverse-total-coins',totalCoins);
    localStorage.setItem('runverse-character',equippedCharId);
    localStorage.setItem('runverse-map',selectedMap);
  }catch{}
};
const save=(immediate = false)=>{
  if (immediate || s?.mode !== 'running') {
    flushSave();
    return;
  }
  if (!saveTimer) {
    saveTimer = setTimeout(flushSave, 2500);
  }
};
const saveDeferred=()=>{
  if (!saveTimer) {
    saveTimer = setTimeout(flushSave, 350);
  }
};
const PORTRAIT_VER = '3.8.3';
let lastUserTapAt = 0;
let menuImagesPreloaded = false;
let lastMenuBgSrc = '';
let lastMenuHeroSrc = '';
let activeBgLayer = 0;
function preloadMenuImages() {
  if (menuImagesPreloaded || typeof Image === 'undefined') return;
  menuImagesPreloaded = true;
  const urls = [
    'assets/maps/school.jpg', 'assets/maps/college.jpg', 'assets/maps/itpark.jpg', 'assets/maps/finalrun.jpg',
    ...CHARACTER_ROSTER.map(c => `assets/portraits/${c.id}.png?v=${PORTRAIT_VER}`)
  ];
  for (const url of urls) {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
  }
}
function updateMenuPreviewImages(slideDir = 0) {
  const bgA = $('menu-map-bg');
  const bgB = $('menu-map-bg-next');
  const heroEl = $('menu-hero-img');
  const stageEl = $('menu-hero-stage');
  const mapKey = ['school', 'college', 'itpark', 'finalrun'].includes(selectedMap) ? selectedMap : 'school';
  const mapSrc = `assets/maps/${mapKey}.jpg`;
  if (bgA && lastMenuBgSrc !== mapSrc) {
    const hadPrev = Boolean(lastMenuBgSrc);
    lastMenuBgSrc = mapSrc;
    if (bgB && hadPrev) {
      const incoming = activeBgLayer === 0 ? bgB : bgA;
      const outgoing = activeBgLayer === 0 ? bgA : bgB;
      activeBgLayer = activeBgLayer === 0 ? 1 : 0;
      incoming.src = mapSrc;
      incoming.classList.add('is-active');
      outgoing.classList.remove('is-active');
    } else {
      bgA.src = mapSrc;
      bgA.classList.add('is-active');
      if (bgB) bgB.classList.remove('is-active');
    }
  }
  const entry = currentHub === 'characters'
    ? (CHARACTER_ROSTER[carouselIndex] || CHARACTER_ROSTER[0])
    : (CHARACTER_ROSTER.find(c => c.id === equippedCharId) || CHARACTER_ROSTER[0]);
  const heroSrc = `assets/portraits/${entry.id}.png?v=${PORTRAIT_VER}`;
  if (heroEl && lastMenuHeroSrc !== heroSrc) {
    lastMenuHeroSrc = heroSrc;
    heroEl.src = heroSrc;
    if (slideDir !== 0) {
      heroEl.classList.remove('is-slide-next', 'is-slide-prev');
      void heroEl.offsetWidth;
      heroEl.classList.add(slideDir > 0 ? 'is-slide-next' : 'is-slide-prev');
    }
  }
  if (stageEl) {
    stageEl.classList.toggle('is-locked', currentHub === 'characters' && !isCharUnlocked(entry));
  }
}
function startBackgroundMapWarmup() {
  // Menus run purely on lightweight 2D images (zero WebGL / zero lag).
  preloadMenuImages();
  updateMenuPreviewImages();
}
const prefersReducedMotion = typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
const hudLocationEl = typeof document !== 'undefined' ? document.querySelector('.hud-top-bar .location') : null;
let lastCoinAnimTime = 0;

const effects=createSound();
let adOverlayActive = false;
const ads = createAdManager({
  onPauseAudio: () => {
    adOverlayActive = true;
    effects.pauseBgm?.();
  },
  onResumeAudio: () => {
    adOverlayActive = false;
    if (sound && !document.hidden && !creditsAudioTakeover && !game.classList.contains('mode-splash') && !finalIntroActive && !collegeIntroActive) {
      effects.startBgm?.(s.map === 'grandfather' ? 'grandfather' : 'default');
    }
  }
});
ads.init();
try{sound=localStorage.getItem('runverse-sound')!=='off';}catch{}
try{effects.setVolumes?.(JSON.parse(localStorage.getItem('runverse-volumes')||'{}'));}catch{}
function showVolumeValues(){
  const values=effects.getVolumes?.()||{music:1,coins:1,powerups:1,movement:1,damage:1,villain:1,ambience:1};
  document.querySelectorAll('[data-volume]').forEach(slider=>{
    const key=slider.dataset.volume;
    slider.value=Math.round((values[key]??1)*100);
    const label=$(`volume-${key}-value`);
    if(label)label.textContent=`${slider.value}%`;
  });
}
showVolumeValues();
document.querySelectorAll('[data-volume]').forEach(slider=>{
  slider.addEventListener('input',()=>{
    effects.setVolumes?.({[slider.dataset.volume]:Number(slider.value)/100});
    const label=$(`volume-${slider.dataset.volume}-value`);
    if(label)label.textContent=`${slider.value}%`;
    try{if(effects.getVolumes)localStorage.setItem('runverse-volumes',JSON.stringify(effects.getVolumes()));}catch{}
  });
  slider.addEventListener('change',()=>{
    const sample={coins:'coin',powerups:'shield',movement:'jump',damage:'hit',villain:'swag',ambience:'bell'}[slider.dataset.volume];
    if(sample){effects.unlock();effects.play(sample,null,character);}
  });
});
function soundButton(){
  effects.setEnabled(sound);
  $('sound').innerHTML=sound?(IC_SOUND_ON+' ON'):(IC_SOUND_OFF+' OFF');
  $('sound').setAttribute('aria-label',sound?'Mute sound':'Enable sound');
}
soundButton();
document.addEventListener('click', (e) => {
  const btn = e.target?.closest?.('button, [role="button"]');
  if (!btn || btn.disabled || btn.id === 'btn-enter' || btn.id === 'start' || btn.id === 'sound' || btn.closest('#touch-controls')) return;
  playUiClick(sound);
}, { passive: true });
$('sound').onclick=()=>{
  sound=!sound;
  soundButton();
  try{localStorage.setItem('runverse-sound',sound?'on':'off');}catch{}
  if(sound){
    if (!game.classList.contains('mode-splash')) effects.startBgm?.();
    effects.play('coin');
  }else{
    effects.pauseBgm?.();
  }
};

function triggerSwag(){
  s.styleAction = SWEEP_SECONDS;
  effects.unlock();
  effects.play('swag');
}

const MAP_SUBTITLES = {
  school: 'Unlocked · Starter campus',
  college: 'Winding hills · scooties & cars',
  itpark: 'Glass towers · Office shuttles',
  finalrun: 'Village road · School story'
};

function renderMapUnlockPanel(mapId) {
  const rule = MAP_UNLOCK_RULES[mapId];
  if (!rule || rule.free) return '';
  const bestDist = mapBestFor(profile, rule.reqMap);
  const distMet = isMapDistanceMet(profile, mapId);
  const distClamped = Math.min(rule.reqDistance, bestDist);
  const distPct = distMet ? 100 : Math.min(100, Math.round((distClamped / rule.reqDistance) * 100));
  const coinsMet = totalCoins >= rule.cost;
  const coinsClamped = Math.min(rule.cost, Math.floor(totalCoins));
  const coinsPct = coinsMet ? 100 : Math.min(100, Math.round((coinsClamped / rule.cost) * 100));
  const readyToBuy = canBuyMap(profile, mapId, totalCoins);
  const btnText = readyToBuy
    ? `UNLOCK ${rule.name.toUpperCase()} · ${rule.cost.toLocaleString()} ${IC_COIN}`
    : !distMet
      ? `REACH ${rule.reqDistance.toLocaleString()}m IN ${rule.reqMapName.toUpperCase()} FIRST`
      : `NEED ${(rule.cost - Math.floor(totalCoins)).toLocaleString()} MORE COINS`;
  return `
    <div class="unlock-panel-head">
      <span class="unlock-panel-title">UNLOCK ${rule.name}</span>
      <span class="unlock-panel-wallet">${IC_COIN} ${Math.floor(totalCoins).toLocaleString()}</span>
    </div>
    <div class="unlock-goal ${distMet ? 'is-done' : ''}">
      <div class="unlock-goal-top">
        <span>${IC_RUN} ${rule.reqLabel}</span>
        <span class="unlock-goal-status">${distMet ? `${IC_CHECK} DONE` : `${distClamped.toLocaleString()} / ${rule.reqDistance.toLocaleString()}m`}</span>
      </div>
      <div class="unlock-bar-track"><div class="unlock-bar-fill" style="width:${distPct}%"></div></div>
    </div>
    <div class="unlock-goal ${coinsMet ? 'is-done' : ''}">
      <div class="unlock-goal-top">
        <span>${IC_COIN} Spend ${rule.cost.toLocaleString()} Coins</span>
        <span class="unlock-goal-status">${coinsMet ? `${IC_CHECK} READY` : `${coinsClamped.toLocaleString()} / ${rule.cost.toLocaleString()}`}</span>
      </div>
      <div class="unlock-bar-track"><div class="unlock-bar-fill" style="width:${coinsPct}%"></div></div>
    </div>
    <button type="button" id="btn-unlock-map" class="unlock-buy-btn" data-unlock-map="${mapId}" ${readyToBuy ? '' : 'disabled'}>${btnText}</button>
  `;
}

function renderCharUnlockPanel(entry) {
  if (!entry || isCharUnlocked(entry)) return '';
  const cost = entry.cost || 0;
  const coinsMet = totalCoins >= cost;
  const coinsClamped = Math.min(cost, Math.floor(totalCoins));
  const coinsPct = cost > 0 ? Math.min(100, Math.round((coinsClamped / cost) * 100)) : 100;
  return `
    <div class="unlock-goal ${coinsMet ? 'is-done' : ''}">
      <div class="unlock-goal-top">
        <span>${IC_COIN} Unlock ${entry.name} (${cost.toLocaleString()} Coins)</span>
        <span class="unlock-goal-status">${coinsMet ? `${IC_CHECK} READY TO BUY` : `${coinsClamped.toLocaleString()} / ${cost.toLocaleString()}`}</span>
      </div>
      <div class="unlock-bar-track"><div class="unlock-bar-fill" style="width:${coinsPct}%"></div></div>
    </div>
    <div class="unlock-panel-note">Playable on any unlocked map once bought.</div>
  `;
}

function pulseChecklist(el) {
  if (!el) return;
  el.classList.remove('is-shake');
  void el.offsetWidth;
  el.classList.add('is-shake');
}

function purchaseMap(mapId) {
  const rule = MAP_UNLOCK_RULES[mapId];
  const res = buyMap(profile, mapId, totalCoins);
  if (!res.ok) {
    pulseChecklist($('map-unlock-checklist'));
    effects.unlock?.();
    return false;
  }
  totalCoins = res.coins;
  selectedMap = mapId;
  s.map = selectedMap;
  inspectedLockedMap = MAP_ORDER.find(id => !isMapOpen(id)) || '';
  lastUnlockUiKey = '';
  save(true);
  effects.unlock?.();
  effects.play('upgrade');
  effects.play('bell');
  syncMapHeaderUI();
  updateUnlockUI();
  updateCarouselUI();
  updateMenuPreviewImages();
  refreshPowerSettings();
  const powerBonus = mapId === 'college' ? ' · +2 POWERS (SHOES & 2X COINS)!' : mapId === 'itpark' ? ' · +2 POWERS (NITRO & INVISIBLE)!' : '!';
  showCloseCallBanner(`${rule.name.toUpperCase()} UNLOCKED${powerBonus}`, true);
  return true;
}

function purchaseCharacter(entry) {
  if (!entry) return false;
  const res = buyCharacter(profile, entry.id, totalCoins);
  if (!res.ok) {
    pulseChecklist($('char-unlock-checklist'));
    effects.unlock?.();
    return false;
  }
  totalCoins = res.coins;
  lastUnlockUiKey = '';
  effects.unlock?.();
  effects.play('upgrade');
  selectUnlockedCharacter(entry.id);
  save(true);
  updateUnlockUI();
  showCloseCallBanner(`${entry.name} UNLOCKED!`, true);
  return true;
}

function updateUnlockUI() {
  const lockedList = MAP_ORDER.filter(id => !isMapOpen(id));
  if (!inspectedLockedMap || isMapOpen(inspectedLockedMap)) {
    inspectedLockedMap = lockedList[0] || '';
  }
  const charEntry = CHARACTER_ROSTER[carouselIndex] || CHARACTER_ROSTER[0];
  const key = `${profile.schoolBest}/${profile.collegeBest}/${profile.itParkBest}:${profile.unlockedMaps.join(',')}:${profile.unlockedChars.join(',')}:${Math.floor(totalCoins)}:${inspectedLockedMap}:${charEntry.id}`;
  if (key === lastUnlockUiKey) return;
  lastUnlockUiKey = key;
  const openMapsCount = MAP_ORDER.filter(id => isMapOpen(id)).length;
  const openPowersCount = availablePowers(profile).length;
  if ($('player-progress')) {
    $('player-progress').textContent = `${openMapsCount}/${MAP_ORDER.length} Maps · ${openPowersCount}/${powers.length} Powers`;
  }
  const bankEl = $('hub-coin-bank');
  if (bankEl) {
    bankEl.innerHTML = `${IC_COIN} ${Math.floor(totalCoins).toLocaleString()} Coins`;
  }
  const mapSubIds = { school: 'school-map-sub', college: 'college-map-sub', itpark: 'park-goals', finalrun: 'finalrun-map-sub' };
  const mapBadgeIds = { school: 'school-map-badge', college: 'college-map-badge', itpark: 'park-badge', finalrun: 'finalrun-map-badge' };
  for (const mapId of MAP_ORDER) {
    const open = isMapOpen(mapId);
    const rule = MAP_UNLOCK_RULES[mapId];
    const card = document.querySelector(`[data-map="${mapId}"]`);
    if (card) {
      card.classList.toggle('is-locked', !open);
      card.classList.toggle('is-inspecting', !open && inspectedLockedMap === mapId);
      card.setAttribute('aria-disabled', String(!open));
    }
    const subEl = $(mapSubIds[mapId]);
    if (subEl) {
      if (open) {
        subEl.textContent = MAP_SUBTITLES[mapId];
      } else if (canBuyMap(profile, mapId, totalCoins)) {
        subEl.textContent = `Ready · Tap to unlock (${rule.cost.toLocaleString()} Coins)`;
      } else if (isMapDistanceMet(profile, mapId)) {
        subEl.textContent = `Distance met · Need ${rule.cost.toLocaleString()} Coins`;
      } else {
        subEl.textContent = `${rule.reqDistance.toLocaleString()}m ${rule.reqMapName} + ${rule.cost.toLocaleString()} Coins`;
      }
    }
    const badgeEl = $(mapBadgeIds[mapId]);
    if (badgeEl) {
      badgeEl.innerHTML = open ? IC_CHECK : IC_LOCK;
    }
  }
  const mapPanel = $('map-unlock-checklist');
  if (mapPanel) {
    if (inspectedLockedMap && !isMapOpen(inspectedLockedMap)) {
      mapPanel.innerHTML = renderMapUnlockPanel(inspectedLockedMap);
      mapPanel.hidden = false;
      const buyBtn = $('btn-unlock-map');
      if (buyBtn) buyBtn.onclick = () => purchaseMap(inspectedLockedMap);
    } else {
      mapPanel.innerHTML = '';
      mapPanel.hidden = true;
    }
  }
  const charPanel = $('char-unlock-checklist');
  if (charPanel) {
    const unlockedChar = isCharUnlocked(charEntry);
    charPanel.innerHTML = unlockedChar ? '' : renderCharUnlockPanel(charEntry);
    charPanel.hidden = unlockedChar;
  }
}

function syncMapHeaderUI() {
  document.querySelectorAll('[data-map]').forEach(button=>{
    const active=button.dataset.map===selectedMap;
    button.classList.toggle('selected',active);
    button.setAttribute('aria-pressed',String(active));
  });
  const school=selectedMap==='school', finalRun=selectedMap==='finalrun';
  const equippedEntry = CHARACTER_ROSTER.find(c => c.id === equippedCharId) || CHARACTER_ROSTER[0];
  const heroTitle = equippedEntry.name.toLowerCase().replace(/\b\w/g, ch => ch.toUpperCase());
  if($('hub-map-name')) $('hub-map-name').textContent=selectedMap==='itpark'?'IT PARK':school?'SCHOOL CAMPUS':finalRun?'THE FINAL RUN':'COLLEGE CAMPUS';
  if($('hub-outfit-name')) $('hub-outfit-name').textContent=heroTitle;
  const loc = document.querySelector('.hud-top-bar .location');
  if(loc) loc.innerHTML=selectedMap==='itpark'?(IC_ITPARK+' IT PARK'):school?(IC_SCHOOL+' RUNVERSE SCHOOL'):finalRun?(IC_SCHOOL+' THE FINAL RUN'):(IC_COLLEGE+' RUNVERSE COLLEGE');
}

function updateCarouselUI() {
  const entry = CHARACTER_ROSTER[carouselIndex] || CHARACTER_ROSTER[0];
  const unlocked = isCharUnlocked(entry);
  const equipped = entry.id === equippedCharId;
  const affordable = !unlocked && canBuyCharacter(profile, entry.id, totalCoins);
  if ($('char-step-badge')) $('char-step-badge').textContent = `CHARACTER ${carouselIndex + 1} / ${CHARACTER_ROSTER.length}`;
  const lockPill = $('char-lock-pill');
  if (lockPill) {
    lockPill.classList.toggle('is-locked', !unlocked);
    lockPill.innerHTML = unlocked
      ? `${IC_CHECK} UNLOCKED`
      : `${IC_LOCK} ${(entry.cost || 0).toLocaleString()} ${IC_COIN}`;
  }
  if ($('char-carousel-name')) $('char-carousel-name').textContent = entry.name;
  if ($('char-carousel-outfit')) $('char-carousel-outfit').textContent = entry.outfit;
  document.querySelectorAll('#char-carousel-dots .char-dot').forEach((dot, idx) => {
    const item = CHARACTER_ROSTER[idx];
    dot.classList.toggle('active', idx === carouselIndex);
    dot.classList.toggle('locked', !isCharUnlocked(item));
  });
  const equipBtn = $('char-equip-btn');
  if (equipBtn) {
    equipBtn.classList.remove('is-selected', 'is-locked', 'is-buyable');
    if (!unlocked) {
      if (affordable) {
        equipBtn.classList.add('is-buyable');
        equipBtn.innerHTML = `BUY · ${entry.cost.toLocaleString()} ${IC_COIN}`;
      } else {
        equipBtn.classList.add('is-locked');
        equipBtn.innerHTML = `${IC_LOCK} ${entry.cost.toLocaleString()} ${IC_COIN}`;
      }
    } else if (equipped) {
      equipBtn.classList.add('is-selected');
      equipBtn.innerHTML = `${IC_CHECK} SELECTED`;
    } else {
      equipBtn.textContent = 'SELECT';
    }
  }
  const prevIdx = (carouselIndex - 1 + CHARACTER_ROSTER.length) % CHARACTER_ROSTER.length;
  const nextIdx = (carouselIndex + 1) % CHARACTER_ROSTER.length;
  const prevEntry = CHARACTER_ROSTER[prevIdx];
  const nextEntry = CHARACTER_ROSTER[nextIdx];
  if ($('char-side-prev-img')) $('char-side-prev-img').src = `assets/portraits/${prevEntry.id}.png?v=${PORTRAIT_VER}`;
  if ($('char-side-next-img')) $('char-side-next-img').src = `assets/portraits/${nextEntry.id}.png?v=${PORTRAIT_VER}`;
  if ($('char-side-prev')) $('char-side-prev').classList.toggle('is-locked', !isCharUnlocked(prevEntry));
  if ($('char-side-next')) $('char-side-next').classList.toggle('is-locked', !isCharUnlocked(nextEntry));
  if ($('char-side-prev-lock')) $('char-side-prev-lock').hidden = isCharUnlocked(prevEntry);
  if ($('char-side-next-lock')) $('char-side-next-lock').hidden = isCharUnlocked(nextEntry);
  const checklist = $('char-unlock-checklist');
  if (checklist) {
    checklist.innerHTML = unlocked ? '' : renderCharUnlockPanel(entry);
    checklist.hidden = unlocked;
  }
  updateUnlockUI();
}

let activePreviewCharId = equippedCharId;
function scheduleCarouselPreview(slideDir = 0) {
  lastUserTapAt = performance.now();
  const targetId = CHARACTER_ROSTER[carouselIndex]?.id || equippedCharId;
  activePreviewCharId = targetId;
  updateMenuPreviewImages(slideDir);
}
function startHeroPreloader() {
  // Zero-lag 2D image menu: no background 3D GLB downloads while browsing!
  preloadMenuImages();
}

function selectUnlockedCharacter(id) {
  const entry = CHARACTER_ROSTER.find(c => c.id === id);
  if (!entry || !isCharUnlocked(entry)) return false;
  lastUserTapAt = performance.now();
  equippedCharId = entry.id;
  activePreviewCharId = entry.id;
  character = entry.gender;
  carouselIndex = Math.max(0, CHARACTER_ROSTER.findIndex(c => c.id === entry.id));
  syncMapHeaderUI();
  updateCarouselUI();
  updateMenuPreviewImages();
  saveDeferred();
  return true;
}

function moveCarousel(delta) {
  carouselIndex = (carouselIndex + delta + CHARACTER_ROSTER.length) % CHARACTER_ROSTER.length;
  updateCarouselUI();
  scheduleCarouselPreview(delta);
}

if ($('char-prev')) $('char-prev').onclick = () => moveCarousel(-1);
if ($('char-next')) $('char-next').onclick = () => moveCarousel(1);
if ($('char-side-prev')) $('char-side-prev').onclick = () => moveCarousel(-1);
if ($('char-side-next')) $('char-side-next').onclick = () => moveCarousel(1);
if ($('btn-quick-settings')) $('btn-quick-settings').onclick = () => showHub('settings');
if ($('char-loading-veil')) {
  $('char-loading-veil').onclick = () => {
    if (game.classList.contains('is-char-error')) location.reload();
  };
}
document.querySelectorAll('#char-carousel-dots .char-dot').forEach((dot, idx) => {
  dot.onclick = () => {
    const dir = idx === carouselIndex ? 0 : (idx > carouselIndex ? 1 : -1);
    carouselIndex = idx;
    updateCarouselUI();
    scheduleCarouselPreview(dir);
  };
});
if ($('char-equip-btn')) {
  $('char-equip-btn').onclick = () => {
    const entry = CHARACTER_ROSTER[carouselIndex];
    if (!isCharUnlocked(entry)) {
      purchaseCharacter(entry);
      return;
    }
    selectUnlockedCharacter(entry.id);
  };
}

function selectMap(map, fromUser = false){
  const target = MAP_ORDER.includes(map) ? map : 'school';
  if (!isMapOpen(target)) {
    inspectedLockedMap = target;
    lastUnlockUiKey = '';
    updateUnlockUI();
    if (fromUser) {
      pulseChecklist($('map-unlock-checklist'));
      effects.unlock?.();
    }
    return false;
  }
  selectedMap = target;
  s.map = selectedMap;
  syncMapHeaderUI();
  updateCarouselUI();
  updateMenuPreviewImages();
  if (fromUser) saveDeferred();
  else save();
  return true;
}
syncMapHeaderUI();
updateCarouselUI();
updateMenuPreviewImages();
document.querySelectorAll('[data-map]').forEach(button=>button.onclick=()=>{
  lastUserTapAt = performance.now();
  const targetMap = button.dataset.map;
  if (!selectMap(targetMap, true)) return;
  if (targetMap === 'finalrun' && selectedMap === 'finalrun') {
    s.previewRain = false;
    playFinalRunIntro(defaultChosenPowers());
    return;
  }
  s.previewRain = false;
  updateMenuPreviewImages();
});

const hubButtons = [...document.querySelectorAll('[data-hub]')];
function showHub(page='home'){
  const next=['home','characters','maps','settings'].includes(page)?page:'home';
  if (currentHub === next && game.classList.contains(`hub-${next}`)) {
    updateMenuPreviewImages();
    return;
  }
  currentHub = next;
  game.classList.remove('hub-home','hub-characters','hub-maps','hub-settings');
  game.classList.add(`hub-${next}`);
  for (const button of hubButtons) {
    const active = button.dataset.hub === next;
    button.classList.toggle('selected', active);
    if (active) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  }
  if (next === 'characters') {
    carouselIndex = Math.max(0, CHARACTER_ROSTER.findIndex(c => c.id === equippedCharId));
    activePreviewCharId = equippedCharId;
    updateCarouselUI();
    startHeroPreloader();
  } else if (next === 'maps') {
    updateUnlockUI();
  }
  updateMenuPreviewImages();
}
hubButtons.forEach(button=>button.onclick=()=>showHub(button.dataset.hub));
showHub('home');

function setScreenMode(mode) {
  game.classList.remove('mode-splash', 'mode-select', 'mode-running', 'mode-gameover');
  game.classList.add('mode-' + mode);
  game.classList.toggle('grandfather-round',s.map==='grandfather');
  if ($('splash-screen')) $('splash-screen').hidden = mode !== 'splash';
  if ($('select-screen')) $('select-screen').hidden = mode !== 'select';
}
setScreenMode('splash');

const PLAYER_NAME_KEY = 'runverse-player-name';
let playerName = '';
try {
  playerName = (localStorage.getItem(PLAYER_NAME_KEY) || '').trim();
} catch {}

function updatePlayerNameDisplays(name) {
  const display = name || playerName || 'Student';
  if ($('char-screen-player-name')) $('char-screen-player-name').textContent = display;
  if ($('report-player-name')) $('report-player-name').textContent = display;
  if ($('player-name-input')) $('player-name-input').value = display === 'Student' ? '' : display;
}
updatePlayerNameDisplays();

function showNameModal(isEdit = false) {
  const modal = $('name-modal');
  const input = $('player-name-input');
  const error = $('name-error');
  if (!modal || !input) return;
  if (error) error.hidden = true;
  input.value = playerName;
  modal.hidden = false;
  setTimeout(() => input.focus(), 100);
}

function hideNameModal() {
  const modal = $('name-modal');
  if (modal) modal.hidden = true;
}

function submitPlayerName() {
  const input = $('player-name-input');
  const error = $('name-error');
  const raw = (input ? input.value : '').trim().slice(0, 15);
  if (!raw) {
    if (error) {
      error.textContent = 'Please enter your name!';
      error.hidden = false;
    }
    input?.focus();
    return;
  }
  playerName = raw;
  try {
    localStorage.setItem(PLAYER_NAME_KEY, playerName);
  } catch {}
  input?.blur?.();
  updatePlayerNameDisplays(playerName);
  hideNameModal();
  setScreenMode('select');
  showHub('home');
  menuNeedsFrame = true;
}

if ($('btn-save-name')) {
  $('btn-save-name').onclick = submitPlayerName;
}
if ($('player-name-input')) {
  $('player-name-input').onkeydown = (e) => {
    if (e.key === 'Enter') submitPlayerName();
  };
}
if ($('btn-edit-player-name')) {
  $('btn-edit-player-name').onclick = () => showNameModal(true);
}

let enteredFromSplash = false;
function enterGameFromSplash() {
  if (enteredFromSplash) return;
  enteredFromSplash = true;
  const btn = $('btn-enter');
  btn?.classList.add('is-pressed');
  try {
    const v = $('intro-video');
    if (v) {
      v.muted = true;
      gamePauseVideo(v);
    }
  } catch {}
  playEnterSound(sound);
  if (sound) {
    effects.unlock();
    // Wait briefly until the soft entry chime finishes & splash video audio settles before starting BGM on Android.
    setTimeout(() => {
      if (sound && !game.classList.contains('mode-splash') && !finalIntroActive && !collegeIntroActive) {
        effects.startBgm();
      }
    }, 240);
  }
  setScreenMode('select');
  showHub('home');
  if (!playerName) {
    showNameModal();
  }
  // Menus stay 100% 2D-image driven (zero WebGL until LET'S RUN) for instant 60fps navigation!
  onAllAssetsReady();
  startBackgroundMapWarmup();
}
if($('btn-enter')){
  $('btn-enter').onclick = enterGameFromSplash;
}
if($('splash-screen')){
  $('splash-screen').addEventListener('click', (e) => {
    if (e.target?.closest?.('#sound')) return;
    if (!introFinished) return;
    enterGameFromSplash();
  });
}

const POWER_UPGRADE_VALUES = Array.from(
  { length: POWER_UPGRADE_COSTS.length + 1 },
  (_, tier) => POWER_BASE_SECONDS + tier * POWER_UPGRADE_STEP_SECONDS
);
const UPGRADE_DEFS = powers.map(p => ({
  id: p.id,
  icon: POWER_ICONS[p.id] || IC_BOLT,
  name: p.name,
  unlockMap: p.unlockMap,
  unlockMapName: p.unlockMapName,
  values: POWER_UPGRADE_VALUES,
  unit: 's',
  costs: POWER_UPGRADE_COSTS
}));
const REVIVE_COST = 250;
let upgrades = Object.fromEntries(UPGRADE_DEFS.map(def => [def.id, 0]));
try {
  const savedUpg = JSON.parse(localStorage.getItem('runverse-upgrades') || '{}');
  for (const def of UPGRADE_DEFS) {
    upgrades[def.id] = Math.max(0, Math.min(def.values.length - 1, Math.floor(Number(savedUpg[def.id]) || 0)));
  }
} catch {}
const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const MISSION_ICONS = { dist: IC_RUN, coins: IC_COIN, near: IC_FIRE };
function freshMissions(day) {
  return {
    day,
    items: [
      { id: 'dist', label: 'Run 1,500m total today', target: 1500, progress: 0, reward: 350, claimed: false },
      { id: 'coins', label: 'Collect 150 coins today', target: 150, progress: 0, reward: 450, claimed: false },
      { id: 'jumps', label: 'Jump over 8 obstacles today', target: 8, progress: 0, reward: 600, claimed: false }
    ]
  };
}
let dailyMissions = freshMissions(todayKey());
try {
  const raw = JSON.parse(localStorage.getItem('runverse-daily-missions') || 'null');
  if (raw && raw.day === todayKey() && Array.isArray(raw.items) && raw.items.length === 3) dailyMissions = raw;
} catch {}
function saveMissionsAndUpgrades() {
  try {
    localStorage.setItem('runverse-upgrades', JSON.stringify(upgrades));
    localStorage.setItem('runverse-daily-missions', JSON.stringify(dailyMissions));
  } catch {}
}
function recordRunMissions(runDist, runCoins, runCloseCalls) {
  if (dailyMissions.day !== todayKey()) dailyMissions = freshMissions(todayKey());
  const byId = Object.fromEntries(dailyMissions.items.map(m => [m.id, m]));
  if (byId.dist) byId.dist.progress = Math.min(byId.dist.target, byId.dist.progress + Math.max(0, Math.floor(runDist)));
  if (byId.coins) byId.coins.progress = Math.min(byId.coins.target, byId.coins.progress + Math.max(0, Math.floor(runCoins)));
  if (byId.near) byId.near.progress = Math.min(byId.near.target, byId.near.progress + Math.max(0, Math.floor(runCloseCalls)));
  saveMissionsAndUpgrades();
  updateShopBadge();
}
function updateShopBadge() {
  const dot = $('shop-badge-dot');
  if (!dot) return;
  const hasClaim = dailyMissions.items.some(m => !m.claimed && m.progress >= m.target);
  dot.hidden = !hasClaim;
}
let activeShopTab = 'missions';
let shopCooldownTimer = 0;
let shopAdClaimBusy = false;

function updateShopAdCard() {
  const card = $('shop-free-coins-card');
  const btn = $('btn-shop-ad-coins');
  const sub = $('shop-ad-sub');
  if (!card || !btn) return;
  const available = ads.isAvailable();
  card.hidden = !available;
  if (!available) return;
  if (shopAdClaimBusy) {
    btn.disabled = true;
    btn.textContent = 'LOADING AD...';
    return;
  }
  const rem = ads.getShopCooldownRemaining();
  if (rem > 0) {
    btn.disabled = true;
    btn.textContent = `READY ${formatCooldown(rem)}`;
    if (sub) sub.textContent = 'Next free coin bonus recharging';
  } else {
    btn.disabled = false;
    btn.innerHTML = `${IC_VIDEO} WATCH AD +${ads.config.shopRewardCoins}`;
    if (sub) sub.textContent = `Watch a short video for +${ads.config.shopRewardCoins} Coins`;
  }
}

function stopShopCooldownTimer() {
  if (shopCooldownTimer) {
    clearInterval(shopCooldownTimer);
    shopCooldownTimer = 0;
  }
}

function startShopCooldownTimer() {
  stopShopCooldownTimer();
  shopCooldownTimer = setInterval(() => {
    if (!shopModalEl || shopModalEl.hidden) {
      stopShopCooldownTimer();
      return;
    }
    updateShopAdCard();
  }, 1000);
}

if ($('btn-shop-ad-coins')) {
  $('btn-shop-ad-coins').onclick = async () => {
    if (shopAdClaimBusy || ads.getShopCooldownRemaining() > 0) return;
    shopAdClaimBusy = true;
    updateShopAdCard();
    const res = await ads.claimShopCoinAd();
    shopAdClaimBusy = false;
    if (res.rewarded) {
      totalCoins += res.coins;
      lastUnlockUiKey = '';
      save(true);
      effects.play('upgrade');
      updateUnlockUI();
      updateCarouselUI();
      renderShopModal();
      showCloseCallBanner(`+${res.coins} FREE COINS!`, true);
    } else {
      updateShopAdCard();
      const sub = $('shop-ad-sub');
      if (sub) {
        sub.textContent = res.reason === 'dismissed'
          ? 'Watch full video to earn +500 Coins'
          : 'Ad not ready right now — try again soon';
      }
    }
  };
}

function renderShopModal() {
  if ($('shop-coin-bank')) $('shop-coin-bank').innerHTML = `${IC_COIN} ${totalCoins.toLocaleString()} Coins`;
  updateShopAdCard();
  const mList = $('shop-missions-list');
  const uList = $('shop-upgrades-list');
  if (mList) {
    mList.hidden = activeShopTab !== 'missions';
    mList.innerHTML = dailyMissions.items.map(m => {
      const pct = Math.min(100, Math.round((m.progress / m.target) * 100));
      const ready = !m.claimed && m.progress >= m.target;
      const btnCls = m.claimed ? 'shop-action-btn is-done' : ready ? 'shop-action-btn is-claim' : 'shop-action-btn';
      const btnTxt = m.claimed ? `${IC_CHECK} CLAIMED` : ready ? `CLAIM +${m.reward} ${IC_COIN}` : `${m.progress}/${m.target}`;
      const ic = MISSION_ICONS[m.id] || IC_RUN;
      return `<div class="shop-item-row"><div class="shop-item-meta"><strong>${ic} ${m.label}</strong><small>Reward: +${m.reward} Coins</small><div class="shop-bar-track"><div class="shop-bar-fill" style="width:${pct}%"></div></div></div><button type="button" class="${btnCls}" data-claim-mission="${m.id}" ${ready ? '' : 'disabled'}>${btnTxt}</button></div>`;
    }).join('');
    mList.querySelectorAll('[data-claim-mission]').forEach(btn => {
      btn.onclick = () => {
        const m = dailyMissions.items.find(x => x.id === btn.dataset.claimMission);
        if (!m || m.claimed || m.progress < m.target) return;
        m.claimed = true;
        totalCoins += m.reward;
        lastUnlockUiKey = '';
        save();
        saveMissionsAndUpgrades();
        effects.play('upgrade');
        updateUnlockUI();
        updateCarouselUI();
        updateShopBadge();
        renderShopModal();
      };
    });
  }
  if (uList) {
    uList.hidden = activeShopTab !== 'upgrades';
    uList.innerHTML = UPGRADE_DEFS.map(def => {
      const lv = upgrades[def.id] || 0;
      if (!isPowerUnlocked(profile, def.id)) {
        const shortMap = def.unlockMap === 'college' ? 'College' : def.unlockMap === 'itpark' ? 'IT Park' : def.unlockMapName;
        return `<div class="shop-item-row"><div class="shop-item-meta"><strong>${def.icon} ${def.name}</strong><small>Unlocks with ${def.unlockMapName} · Base ${POWER_BASE_SECONDS}s (+${POWER_UPGRADE_STEP_SECONDS}s / upgrade)</small></div><button type="button" class="shop-action-btn" disabled>${IC_LOCK} ${shortMap}</button></div>`;
      }
      const maxed = lv >= def.values.length - 1;
      const cost = maxed ? 0 : def.costs[lv];
      const canBuy = !maxed && totalCoins >= cost;
      const curVal = def.values[lv], nextVal = maxed ? curVal : def.values[lv + 1];
      const pct = Math.round(((lv + 1) / def.values.length) * 100);
      return `<div class="shop-item-row"><div class="shop-item-meta"><strong>${def.icon} ${def.name} · Tier ${lv + 1}/${def.values.length}</strong><small>${maxed ? `MAX (${curVal}${def.unit})` : `${curVal}${def.unit} → ${nextVal}${def.unit} (+${POWER_UPGRADE_STEP_SECONDS}s)`}</small><div class="shop-bar-track"><div class="shop-bar-fill" style="width:${pct}%"></div></div></div><button type="button" class="shop-action-btn ${maxed ? 'is-done' : ''}" data-buy-upgrade="${def.id}" ${canBuy ? '' : 'disabled'}>${maxed ? 'MAXED' : `${cost.toLocaleString()} ${IC_COIN}`}</button></div>`;
    }).join('');
    uList.querySelectorAll('[data-buy-upgrade]').forEach(btn => {
      btn.onclick = () => {
        const def = UPGRADE_DEFS.find(x => x.id === btn.dataset.buyUpgrade);
        if (!def) return;
        const lv = upgrades[def.id] || 0;
        if (lv >= def.values.length - 1) return;
        const cost = def.costs[lv];
        if (totalCoins < cost) return;
        totalCoins -= cost;
        upgrades[def.id] = lv + 1;
        if (s?.powerUpgrades) s.powerUpgrades[def.id] = upgrades[def.id];
        lastUnlockUiKey = '';
        save();
        saveMissionsAndUpgrades();
        effects.play('upgrade');
        updateUnlockUI();
        updateCarouselUI();
        renderShopModal();
      };
    });
  }
  updateShopBadge();
}
if ($('btn-open-shop')) {
  $('btn-open-shop').onclick = () => {
    if (!shopModalEl) return;
    renderShopModal();
    shopModalEl.hidden = false;
    startShopCooldownTimer();
  };
}
if ($('btn-close-shop')) {
  $('btn-close-shop').onclick = () => {
    stopShopCooldownTimer();
    if (shopModalEl) shopModalEl.hidden = true;
    menuNeedsFrame = true;
  };
}
document.querySelectorAll('[data-shop-tab]').forEach(tab => {
  tab.onclick = () => {
    activeShopTab = tab.dataset.shopTab === 'upgrades' ? 'upgrades' : 'missions';
    document.querySelectorAll('[data-shop-tab]').forEach(b => {
      const on = b.dataset.shopTab === activeShopTab;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', String(on));
    });
    renderShopModal();
  };
});
updateShopBadge();

function showCloseCallBanner(text, isNitro = false) {
  if (!closeCallEl) return;
  closeCallEl.textContent = text;
  closeCallEl.classList.toggle('is-nitro', Boolean(isNitro));
  closeCallEl.hidden = false;
  closeCallEl.style.animation = 'none';
  void closeCallEl.offsetWidth;
  closeCallEl.style.animation = '';
  clearTimeout(closeCallHideTimer);
  closeCallHideTimer = setTimeout(() => { if (closeCallEl) closeCallEl.hidden = true; }, 740);
}

function showMilestoneBanner(title, subtitle) {
  if (!milestoneBannerEl) return;
  milestoneBannerEl.innerHTML = `<strong>${title}</strong><span>${subtitle}</span>`;
  milestoneBannerEl.hidden = false;
  milestoneBannerEl.style.animation = 'none';
  void milestoneBannerEl.offsetWidth;
  milestoneBannerEl.style.animation = '';
  clearTimeout(milestoneHideTimer);
  milestoneHideTimer = setTimeout(() => { if (milestoneBannerEl) milestoneBannerEl.hidden = true; }, 2150);
}

function resetFeverMilestoneHud() {
  lastFeverOn = false;
  lastFeverPct = -1;
  lastFeverSec = -1;
  lastMilestoneShown = 0;
  if ($('fever-veil')) $('fever-veil').hidden = true;
  if (feverMeterEl) { feverMeterEl.hidden = true; feverMeterEl.classList.remove('is-active', 'is-hot', 'is-bump'); }
  if (milestoneBannerEl) milestoneBannerEl.hidden = true;
  clearTimeout(milestoneHideTimer);
}

async function shareReportCard(runDist, runCoins, grade, feverCount) {
  const cv = document.createElement('canvas');
  cv.width = 720; cv.height = 960;
  const ctx = cv.getContext('2d');
  if (!ctx) return;
  const bg = ctx.createLinearGradient(0, 0, 0, 960);
  bg.addColorStop(0, '#0a1f42'); bg.addColorStop(0.55, '#123366'); bg.addColorStop(1, '#071429');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, 720, 960);
  ctx.strokeStyle = '#ffd754'; ctx.lineWidth = 10; ctx.strokeRect(24, 24, 672, 912);
  ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 3; ctx.strokeRect(38, 38, 644, 884);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#7dd3fc'; ctx.font = '900 28px system-ui, sans-serif';
  ctx.fillText('LMSK LIFE RUSH', 360, 108);
  ctx.fillStyle = '#ffe268'; ctx.font = '900 54px system-ui, sans-serif';
  ctx.fillText('REPORT CARD', 360, 178);
  ctx.fillStyle = '#ffffff'; ctx.font = '800 32px system-ui, sans-serif';
  ctx.fillText(`STUDENT: ${(playerName || 'Student').toUpperCase()}`, 360, 240);
  ctx.fillStyle = 'rgba(255,215,84,0.16)'; ctx.fillRect(190, 280, 340, 130);
  ctx.strokeStyle = '#ffd754'; ctx.lineWidth = 4; ctx.strokeRect(190, 280, 340, 130);
  ctx.fillStyle = '#fde68a'; ctx.font = '900 72px system-ui, sans-serif';
  ctx.fillText(grade, 360, 370);
  const rows = [
    ['DISTANCE', `${runDist.toLocaleString()} m`],
    ['HIGHEST RECORD', `${best.toLocaleString()} m`],
    ['COINS EARNED', `${runCoins.toLocaleString()} Coins`],
    ['JUMPS OVER', `${feverCount || 0}`]
  ];
  rows.forEach(([k, v], i) => {
    const y = 480 + i * 86;
    ctx.fillStyle = 'rgba(8,22,48,0.85)'; ctx.fillRect(88, y - 48, 544, 68);
    ctx.textAlign = 'left'; ctx.fillStyle = '#9ec8ee'; ctx.font = '800 24px system-ui, sans-serif';
    ctx.fillText(k, 118, y - 6);
    ctx.textAlign = 'right'; ctx.fillStyle = '#ffe268'; ctx.font = '900 30px system-ui, sans-serif';
    ctx.fillText(v, 602, y - 4);
  });
  ctx.textAlign = 'center';
  ctx.fillStyle = '#7dd3fc'; ctx.font = '800 26px system-ui, sans-serif';
  ctx.fillText('CAN YOU BEAT MY RECORD?!', 360, 868);
  const shareText = `LMSK LifeRush Report Card - ${playerName || 'Student'} ran ${runDist}m (${grade})! Record: ${best}m. Can you beat me?!`;
  try {
    const blob = await new Promise(res => cv.toBlob(res, 'image/png'));
    const file = blob ? new File([blob], 'lmsk-liferush-score.png', { type: 'image/png' }) : null;
    if (file && navigator.canShare?.({ files: [file] }) && navigator.share) {
      await navigator.share({ title: 'LMSK LifeRush Score', text: shareText, files: [file] });
      return;
    }
    if (navigator.share) {
      await navigator.share({ title: 'LMSK LifeRush Score', text: shareText });
      return;
    }
    if (blob) {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'lmsk-liferush-score.png';
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    }
  } catch {}
}

const tutorialGuide = createTutorialGuide({
  getState: () => s,
  onNoticeToggle: open => { if (!open) menuNeedsFrame = true; },
  onToast: msg => showCloseCallBanner(msg, false)
});
const powerControls = createPowerControls(
  () => s,
  index => { if (usePower(s, index)) tutorialGuide.onPowerInteract(); },
  () => tutorialGuide.onPowerInteract()
);
function refreshPowerSettings(){
  const el=$('settings-powers-current');if(!el)return;
  const ids=availablePowers(profile);
  const cur=powerControls.current(ids);
  el.textContent=!ids.length?'Unlock College Campus for 2 powers':cur.length?cur.map(id=>powerById[id]?.name||id).join(' + '):'Pick 2 on your next run';
  const btn=$('btn-change-powers');if(btn)btn.disabled=ids.length<=2;
}
if($('btn-change-powers'))$('btn-change-powers').onclick=()=>powerControls.edit(availablePowers(profile),refreshPowerSettings);
const openPrivacyModal = () => { if (privacyModalEl) { privacyModalEl.hidden = false; menuNeedsFrame = true; } };
const closePrivacyModal = () => { if (privacyModalEl) { privacyModalEl.hidden = true; menuNeedsFrame = true; } };
if ($('btn-privacy-policy')) $('btn-privacy-policy').onclick = openPrivacyModal;
if ($('btn-close-privacy')) $('btn-close-privacy').onclick = closePrivacyModal;
if ($('btn-privacy-done')) $('btn-privacy-done').onclick = closePrivacyModal;
if (privacyModalEl) privacyModalEl.addEventListener('click', ev => { if (ev.target === privacyModalEl) closePrivacyModal(); });
hubButtons.forEach(button=>button.addEventListener('click',()=>{if(button.dataset.hub==='settings')refreshPowerSettings();}));
refreshPowerSettings();
function defaultChosenPowers() {
  const ids = availablePowers(profile);
  const cur = powerControls.current(ids);
  return cur.length ? cur : ids.slice(0, 2);
}

let finalIntroActive = false;
let finalIntroRaf = 0;
let finalIntroHideTimer = 0;
let collegeIntroActive = false;
let collegeIntroTimer = 0;
let collegeIntroRaf = 0;
let finalRunActiveCharId = '';
let lastFinalRunChosenPowers = [];
let finalRunRevealing = false;

function finalRunCutsceneBlocking() {
  return (finalIntroActive || collegeIntroActive) && !finalRunRevealing;
}

function createFinalRunCountdown(stage, textEl) {
  let currentStep = '';
  return label => {
    if (!stage || !textEl || label === currentStep) return;
    currentStep = label;
    const isStart = label === 'START';
    stage.hidden = false;
    stage.classList.toggle('is-start', isStart);
    textEl.textContent = label;
    textEl.dataset.step = label;
    stage.classList.add('is-pop');
    for (const animation of stage.getAnimations?.({ subtree: true }) || []) {
      animation.currentTime = 0;
      animation.play();
    }
    if (sound) effects.play(isStart ? 'start' : 'tap');
  };
}

async function playFinalRunVideo(video, isActive, onFailure) {
  delete video.dataset.gamePaused;
  try {
    await video.play();
  } catch {
    if (!isActive()) return;
    video.muted = true;
    try {
      await video.play();
    } catch {
      if (isActive()) onFailure();
    }
  }
}

function updateFinalRunCountdown(video, fallbackDuration, showStep) {
  const duration = Number.isFinite(video.duration) && video.duration > 3 ? video.duration : fallbackDuration;
  if (video.currentTime <= 0.5) return;
  const remaining = duration - video.currentTime;
  if (remaining <= 1.05) showStep('1');
  else if (remaining <= 2.05) showStep('2');
  else if (remaining <= 3.05) showStep('3');
}

function initFinalRunStageState(targetMap, targetStage, targetCharId, chosen) {
  const powersToEquip = (chosen && chosen.length) ? chosen : (lastFinalRunChosenPowers.length ? lastFinalRunChosenPowers : defaultChosenPowers());
  lastFinalRunChosenPowers = powersToEquip;
  finalRunActiveCharId = targetCharId;
  character = 'male';

  s = fresh();
  s.unlockedMaps = [...profile.unlockedMaps];
  s.powerUpgrades = { ...upgrades };
  equipPowers(s, powersToEquip);
  s.enableForks = targetMap === 'itpark';
  s.map = targetMap;
  s.isFinalRun = true;
  s.finalRunStage = targetStage;
  s.turnTime = 0;
  s.mode = 'running';
  s.styleAction = 0;
  s.speed = 28;
  // Pre-spawn initial 340m of obstacles and reset distance/time to 0 so frame 1 after video has 0 work
  step(s, 0.001);
  s.distance = 0;
  s.time = 0;
}

function prepareFinalRunStage(map, stage, charId, chosen, duringVideo = false) {
  initFinalRunStageState(map, stage, charId, chosen);
  if (stage === 'grandfather') effects.preloadBgm?.('grandfather');
  // Give video frames time to paint between renderer setup, scene builds, and the first draw.
  const yieldFrame = duringVideo ? async () => {
    await new Promise(resolve => setTimeout(resolve, 180));
    await nextLoadingFrame();
  } : nextLoadingFrame;
  return prepareLevelRun(map, charId, ++runLaunchNonce, yieldFrame);
}

function activateFinalRunStage(targetStage) {
  s.distance = 0;
  s.time = 0;
  s.turnTime = 0;
  s.mode = 'running';
  s.styleAction = 0;
  s.speed = 28;
  prev = 0;
  lastNearMissShown = 0;
  lastEventBannerShown = 0;
  lastLmskMask = -1;
  resetFeverMilestoneHud();
  runReported = { dist: 0, coins: 0, nearMiss: 0, bonus: 0 };
  if ($('btn-revive')) $('btn-revive').hidden = true;
  if ($('btn-share-score')) $('btn-share-score').hidden = true;
  if (speedLinesEl) { speedLinesEl.hidden = true; speedLinesEl.classList.remove('is-nitro'); lastSpeedMode = 0; }
  setScreenMode('running');
  if ($('toast')) {
    $('toast').hidden = false;
    $('toast').textContent = targetStage === 'grandfather'
      ? `Grandfather’s village · Follow the soil trail & school road home (${GRANDFATHER_GATE.toLocaleString()} m)`
      : targetStage === 'itpark'
      ? `The Final Run · IT Park Stage · Reach ${finalRunGateFor('itpark').toLocaleString()}m`
      : targetStage === 'college'
        ? `The Final Run · College Stage · Reach ${finalRunGateFor('college').toLocaleString()}m`
        : `Village road · Reach the school at ${finalRunGateFor('village').toLocaleString()}m`;
  }
  effects.setEnabled(sound);
  effects.unlock();
  if (targetStage === 'grandfather') {
    if (sound) effects.startBgm?.('grandfather', { restart: true });
    else effects.setBgmTrack?.('grandfather', { restart: true });
  } else {
    if (sound) effects.startBgm?.('default');
    else effects.setBgmTrack?.('default');
    effects.play('bell');
  }
}

async function revealFinalRunStage({ preparation, targetStage, overlay, showStep, schedule, stop, isActive }) {
  if (!await preparation || !isActive()) return;
  activateFinalRunStage(targetStage);
  showStep?.('START');
  schedule(() => {
    overlay.classList.add('is-fading-out');
    prev = 0;
    framePacer.reset();
    finalRunRevealing = true;
    schedule(stop, 340);
  }, 250);
}

function stopCollegeIntroOverlay() {
  collegeIntroActive = false;
  finalRunRevealing = false;
  if (collegeIntroTimer) { clearTimeout(collegeIntroTimer); collegeIntroTimer = 0; }
  if (collegeIntroRaf) { cancelAnimationFrame(collegeIntroRaf); collegeIntroRaf = 0; }
  const overlay = $('college-intro-overlay');
  const stage = $('college-countdown-stage');
  for (const id of ['college-intro-video', 'itrun-intro-video', 'grandfather-intro-video']) {
    const v = $(id);
    if (v) {
      v.onended = null;
      v.onerror = null;
      gamePauseVideo(v);
    }
  }
  if (stage) {
    stage.hidden = true;
    stage.classList.remove('is-pop', 'is-start');
  }
  if (overlay) {
    overlay.hidden = true;
    overlay.classList.remove('is-screen-off', 'is-playing-video', 'is-fading-out');
  }
}

function turnScreenOffAfterFinalCollegeStage() {
  const overlay = $('college-intro-overlay');
  const stage = $('college-countdown-stage');
  if (collegeIntroTimer) { clearTimeout(collegeIntroTimer); collegeIntroTimer = 0; }
  if (collegeIntroRaf) { cancelAnimationFrame(collegeIntroRaf); collegeIntroRaf = 0; }
  collegeIntroActive = true;

  effects.pauseBgm?.();
  if ($('overlay')) $('overlay').hidden = true;
  if ($('toast')) $('toast').hidden = true;
  if (closeCallEl) closeCallEl.hidden = true;
  if (speedLinesEl) { speedLinesEl.hidden = true; speedLinesEl.classList.remove('is-nitro'); lastSpeedMode = 0; }
  resetFeverMilestoneHud();

  for (const id of ['college-intro-video', 'itrun-intro-video', 'grandfather-intro-video']) {
    const v = $(id);
    if (v) {
      v.onended = null;
      v.onerror = null;
      gamePauseVideo(v);
    }
  }
  if (stage) {
    stage.hidden = true;
    stage.classList.remove('is-pop', 'is-start');
  }
  if (overlay) {
    overlay.hidden = false;
    overlay.classList.remove('is-playing-video', 'is-fading-out', 'is-screen-off');
    void overlay.offsetWidth;
    overlay.classList.add('is-screen-off');
  }
}

function getOrCreateCutsceneVideo(videoId, videoSrc) {
  const overlay = $('college-intro-overlay');
  let video = $(videoId);
  if (!video && overlay) {
    video = document.createElement('video');
    video.id = videoId;
    video.className = 'intro-video college-intro-video';
    video.setAttribute('playsinline', '');
    video.setAttribute('preload', 'none');
    video.setAttribute('tabindex', '-1');
    video.setAttribute('controlslist', 'nodownload noplaybackrate noremoteplayback');
    video.setAttribute('disablepictureinpicture', '');
    video.setAttribute('disableremoteplayback', '');
    video.src = videoSrc;
    const stageNode = $('college-countdown-stage');
    if (stageNode) overlay.insertBefore(video, stageNode);
    else overlay.appendChild(video);
  }
  return video;
}

function playStageTransitionCutscene({ videoId, videoSrc, fallbackDuration, targetMap, targetStage, targetCharId, withCountdown = true, endToHub = false }) {
  const overlay = $('college-intro-overlay');
  const video = getOrCreateCutsceneVideo(videoId, videoSrc) || $('college-intro-video');
  const stage = $('college-countdown-stage');
  const textEl = $('college-countdown-text');
  if (collegeIntroTimer) { clearTimeout(collegeIntroTimer); collegeIntroTimer = 0; }
  if (collegeIntroRaf) { cancelAnimationFrame(collegeIntroRaf); collegeIntroRaf = 0; }
  collegeIntroActive = true;

  effects.pauseBgm?.();
  if (sound) effects.unlock?.();
  if ($('overlay')) $('overlay').hidden = true;
  if ($('toast')) $('toast').hidden = true;
  if (closeCallEl) closeCallEl.hidden = true;
  if (speedLinesEl) { speedLinesEl.hidden = true; speedLinesEl.classList.remove('is-nitro'); lastSpeedMode = 0; }
  resetFeverMilestoneHud();

  const chosen = lastFinalRunChosenPowers.length ? lastFinalRunChosenPowers : defaultChosenPowers();

  if (!overlay || !video) {
    collegeIntroActive = false;
    if (!endToHub) prepareFinalRunStage(targetMap, targetStage, targetCharId, chosen).then(ready => {
      if (ready) activateFinalRunStage(targetStage);
    });
    return;
  }

  for (const id of ['college-intro-video', 'itrun-intro-video', 'grandfather-intro-video']) {
    const v = $(id);
    if (!v || v === video) continue;
    v.onended = null;
    v.onerror = null;
    gamePauseVideo(v);
    v.hidden = true;
    v.style.display = 'none';
  }
  overlay.oncontextmenu = e => e.preventDefault();
  lockVideoNoUserPause(video, () => collegeIntroActive && !video.hidden);
  video.hidden = false;
  video.style.display = 'block';
  if (video.getAttribute('src') !== videoSrc) {
    video.setAttribute('src', videoSrc);
    try { video.load(); } catch {}
  }

  // Phase 1: Screen turns off to pitch black
  overlay.hidden = false;
  overlay.classList.remove('is-playing-video', 'is-fading-out', 'is-screen-off');
  if (stage) {
    stage.hidden = true;
    stage.classList.remove('is-pop', 'is-start');
  }
  void overlay.offsetWidth;
  overlay.classList.add('is-screen-off');

  let preparation;
  let launched = false;
  const showStep = withCountdown ? createFinalRunCountdown(stage, textEl) : null;

  async function finishTransitionAndLaunch() {
    if (launched || !collegeIntroActive) return;
    launched = true;
    if (collegeIntroRaf) { cancelAnimationFrame(collegeIntroRaf); collegeIntroRaf = 0; }
    if (collegeIntroTimer) { clearTimeout(collegeIntroTimer); collegeIntroTimer = 0; }
    video.onended = null;
    video.onerror = null;
    gamePauseVideo(video);
    if (endToHub) {
      finalRunActiveCharId = '';
      s = fresh();
      s.map = selectedMap;
      s.mode = 'ready';
      if ($('overlay')) $('overlay').hidden = true;
      if ($('report-grade')) $('report-grade').hidden = true;
      if ($('report-records')) $('report-records').hidden = true;
      if ($('report-challenge-banner')) $('report-challenge-banner').hidden = true;
      if ($('selection')) $('selection').hidden = false;
      syncMapHeaderUI();
      updateCarouselUI();
      updateUnlockUI();
      setScreenMode('select');
      showHub('home');
      menuNeedsFrame = true;
      overlay.classList.add('is-fading-out');
      collegeIntroTimer = setTimeout(() => {
        stopCollegeIntroOverlay();
        if (sound) effects.startBgm?.();
      }, 450);
      return;
    }
    preparation ??= prepareFinalRunStage(targetMap, targetStage, targetCharId, chosen);
    await revealFinalRunStage({
      preparation, targetStage, overlay, showStep,
      schedule: (callback, delay) => { collegeIntroTimer = setTimeout(callback, delay); },
      stop: stopCollegeIntroOverlay,
      isActive: () => collegeIntroActive
    });
  }

  function monitorTransitionProgress() {
    if (!collegeIntroActive || launched) return;
    if (showStep) updateFinalRunCountdown(video, fallbackDuration, showStep);
    collegeIntroRaf = requestAnimationFrame(monitorTransitionProgress);
  }

  if (!video.getAttribute('src')) {
    video.setAttribute('src', videoSrc);
  }
  try {
    gamePauseVideo(video);
    if (video.readyState >= 1) video.currentTime = 0;
  } catch {}
  video.muted = !sound;
  video.defaultMuted = !sound;
  video.volume = 1.0;
  video.onended = finishTransitionAndLaunch;
  video.onerror = finishTransitionAndLaunch;
  const skipCollegeBtn = $('btn-skip-college');
  if (skipCollegeBtn) {
    skipCollegeBtn.hidden = false;
    skipCollegeBtn.onclick = e => {
      e.stopPropagation();
      skipCollegeBtn.hidden = true;
      finishTransitionAndLaunch();
    };
  }

  // Phase 2: Play cutscene video fullscreen after the screen turn-off blackout
  collegeIntroTimer = setTimeout(() => {
    if (!collegeIntroActive) return;
    overlay.classList.remove('is-screen-off');
    overlay.classList.add('is-playing-video');
    playFinalRunVideo(video, () => collegeIntroActive && !launched, finishTransitionAndLaunch);
    if (!endToHub && targetMap) {
      preparation ??= prepareFinalRunStage(targetMap, targetStage, targetCharId, chosen, true);
    }
    collegeIntroRaf = requestAnimationFrame(monitorTransitionProgress);
  }, 850);
}

function playCollegeIntroAfterFinalRun() {
  // Stage 2 of The Final One: play college_intro.mp4 -> last 3s countdown -> College map with Funk Hair character ('college-male')
  playStageTransitionCutscene({
    videoId: 'college-intro-video',
    videoSrc: 'assets/videos/college_intro.mp4',
    fallbackDuration: 14.93,
    targetMap: 'college',
    targetStage: 'college',
    targetCharId: 'college-male',
    withCountdown: true,
    endToHub: false
  });
}

function playItRunIntroAfterCollege() {
  // Stage 3 of The Final One: play cropped Video Project 1 (it_run.mp4, 11.263s, no black bars) -> last 3s countdown -> IT Park map with Black Shirt character ('college-man')
  playStageTransitionCutscene({
    videoId: 'itrun-intro-video',
    videoSrc: 'assets/videos/it_run.mp4?v=3.6.9',
    fallbackDuration: 11.263,
    targetMap: 'itpark',
    targetStage: 'itpark',
    targetCharId: 'college-man',
    withCountdown: true,
    endToHub: false
  });
}

function playGrandfatherIntroAfterItPark() {
  // After IT Park 1,000m in The Final One: screen turns off and plays granfather_intro.mp4 (13.667s)
  playStageTransitionCutscene({
    videoId: 'grandfather-intro-video',
    videoSrc: 'assets/videos/granfather_intro.mp4?v=3.7.0',
    fallbackDuration: 13.667,
    targetMap: 'grandfather',
    targetStage: 'grandfather',
    targetCharId: 'aged-elder',
    withCountdown: true
  });
}

function stopFinalRunIntroOverlay() {
  finalIntroActive = false;
  finalRunRevealing = false;
  if (finalIntroRaf) { cancelAnimationFrame(finalIntroRaf); finalIntroRaf = 0; }
  if (finalIntroHideTimer) { clearTimeout(finalIntroHideTimer); finalIntroHideTimer = 0; }
  const overlay = $('finalrun-intro-overlay');
  const video = $('finalrun-intro-video');
  const stage = $('finalrun-countdown-stage');
  if (video) {
    video.onended = null;
    video.onerror = null;
    gamePauseVideo(video);
  }
  if (stage) {
    stage.hidden = true;
    stage.classList.remove('is-pop', 'is-start');
  }
  if (overlay) {
    overlay.hidden = true;
    overlay.classList.remove('is-fading-out');
  }
}

function playFinalRunIntro(chosen) {
  const overlay = $('finalrun-intro-overlay');
  const video = $('finalrun-intro-video');
  const stage = $('finalrun-countdown-stage');
  const textEl = $('finalrun-countdown-text');
  if (!overlay || !video) {
    prepareFinalRunStage('finalrun', 'village', 'male', chosen).then(ready => {
      if (ready) activateFinalRunStage('village');
    });
    return;
  }
  if (finalIntroRaf) { cancelAnimationFrame(finalIntroRaf); finalIntroRaf = 0; }
  if (finalIntroHideTimer) { clearTimeout(finalIntroHideTimer); finalIntroHideTimer = 0; }
  finalIntroActive = true;

  effects.pauseBgm?.();
  if (sound) effects.unlock?.();

  overlay.hidden = false;
  overlay.classList.remove('is-fading-out');
  overlay.oncontextmenu = e => e.preventDefault();
  lockVideoNoUserPause(video, () => finalIntroActive);
  if (stage) {
    stage.hidden = true;
    stage.classList.remove('is-pop', 'is-start');
  }

  let preparation;
  let launched = false;
  const showStep = createFinalRunCountdown(stage, textEl);

  async function finishIntroAndLaunch() {
    if (launched || !finalIntroActive) return;
    launched = true;
    if (finalIntroRaf) { cancelAnimationFrame(finalIntroRaf); finalIntroRaf = 0; }
    gamePauseVideo(video);
    preparation ??= prepareFinalRunStage('finalrun', 'village', 'male', chosen);
    await revealFinalRunStage({
      preparation, targetStage: 'village', overlay, showStep,
      schedule: (callback, delay) => { finalIntroHideTimer = setTimeout(callback, delay); },
      stop: stopFinalRunIntroOverlay,
      isActive: () => finalIntroActive
    });
  }

  function monitorProgress() {
    if (!finalIntroActive || launched) return;
    updateFinalRunCountdown(video, 14.93, showStep);
    finalIntroRaf = requestAnimationFrame(monitorProgress);
  }

  video.onended = finishIntroAndLaunch;
  video.onerror = finishIntroAndLaunch;
  const skipFinalBtn = $('btn-skip-finalrun');
  if (skipFinalBtn) {
    skipFinalBtn.hidden = false;
    skipFinalBtn.onclick = e => {
      e.stopPropagation();
      skipFinalBtn.hidden = true;
      finishIntroAndLaunch();
    };
  }

  if (!video.getAttribute('src')) {
    video.setAttribute('src', 'assets/videos/final_one_intro.mp4');
  }
  try {
    if (video.readyState >= 1) video.currentTime = 0;
  } catch {}
  video.muted = !sound;
  video.defaultMuted = !sound;
  video.volume = 1.0;

  // Start the intro video FIRST with zero WebGL contention on Frame 0!
  playFinalRunVideo(video, () => finalIntroActive && !launched, finishIntroAndLaunch);

  preparation ??= prepareFinalRunStage('finalrun', 'village', 'male', chosen, true);
  finalIntroRaf = requestAnimationFrame(monitorProgress);
}

function start(){
  if (runLoadingActive || finalIntroActive || collegeIntroActive) return;
  if (selectedMap === 'finalrun') {
    playFinalRunIntro(defaultChosenPowers());
    return;
  }
  powerControls.choose(availablePowers(profile),beginRun);
}
let runLoadingActive = false;
let runLaunchNonce = 0;
let startBtnLaunching = false;
function setRunLoadingProgress(pct, subText) {
  const bar = $('run-loading-bar');
  if (bar) bar.style.width = `${Math.max(8, Math.min(100, Math.round(pct)))}%`;
  if (subText && $('run-loading-sub')) $('run-loading-sub').textContent = subText;
}
function hideRunLoadingVeilSmooth() {
  const veil = $('run-loading-veil');
  if (!veil || veil.hidden) return;
  veil.classList.remove('is-visible');
  veil.classList.add('is-fading-out');
  setTimeout(() => {
    veil.hidden = true;
    veil.classList.remove('is-fading-out');
  }, 290);
}
const nextLoadingFrame=()=>new Promise(resolve=>requestAnimationFrame(resolve));
async function prepareLevelRun(map,key,launchId, yieldFrame=nextLoadingFrame) {
  runLoadingActive=true;
  framePacer.reset();
  const veil=$('run-loading-veil');
  try {
    setRunLoadingProgress(18,'Loading 3D engine...');
    await yieldFrame();
    if(launchId!==runLaunchNonce)return false;
    await ensureRenderer(key);
    if(launchId!==runLaunchNonce)return false;
    draw.selectLevel?.(map,key);
    draw.preload?.(key);
    const steps=draw.warmMapSteps?.(map) || [];
    for(let i=0;i<steps.length;i++){
      setRunLoadingProgress(32+50*i/steps.length,'Preparing track and effects...');
      await yieldFrame();
      if(launchId!==runLaunchNonce)return false;
      draw.warmMapStep(map);
    }
    setRunLoadingProgress(85,'Preparing characters...');
    await draw.waitForCharacters?.(key);
    if(launchId!==runLaunchNonce)return false;
    // Render the first running view under cover. The opening gesture keeps its own state.
    if(s.mode==='intro'){
      const preview=fresh();
      Object.assign(preview,{map,mode:'running',enableForks:s.enableForks,unlockedMaps:s.unlockedMaps});
      step(preview,.001);
      draw(preview,key,0);
    }
    if(draw(s,key,0)==='context-lost'){
      switchToLiteRenderer('WebGL context lost');
      draw(s,key,0);
    }
    if (yieldFrame !== nextLoadingFrame) await yieldFrame();
    if(launchId!==runLaunchNonce)return false;
    setRunLoadingProgress(94,'Preparing local textures and lighting...');
    await draw.finishPreparation?.();
    await yieldFrame();
    if(launchId!==runLaunchNonce)return false;
    draw(s,key,0);
    setRunLoadingProgress(100,'Ready!');
    prev=0;
    runLoadingActive=false;
    return true;
  } catch(error) {
    if(launchId!==runLaunchNonce)return false;
    console.error('Level preparation failed:',error);
    runLoadingActive=false;
    if(collegeIntroActive)stopCollegeIntroOverlay();
    if(finalIntroActive)stopFinalRunIntroOverlay();
    if(veil)veil.hidden=true;
    s=fresh();
    s.map=selectedMap;
    finalRunActiveCharId='';
    setScreenMode('select');
    if($('selection'))$('selection').hidden=false;
    if($('overlay'))$('overlay').hidden=true;
    const start=$('start');
    start.dataset.loadError='true';
    start.textContent='Could not load level · Tap to retry';
    return false;
  }
}
function beginRun(chosen){
  if (!isMapOpen(selectedMap)) {
    selectedMap = 'school';
    syncMapHeaderUI();
  }
  if (!isCharUnlocked(equippedCharId)) {
    equippedCharId = 'male';
    character = 'male';
    carouselIndex = 0;
    syncMapHeaderUI();
  }
  finalRunActiveCharId = '';
  lastFinalRunChosenPowers = (chosen && chosen.length) ? chosen : defaultChosenPowers();
  const launchId = ++runLaunchNonce;
  const targetMap = selectedMap;
  const targetCharId = targetMap === 'finalrun' ? 'male' : equippedCharId;
  const veil = $('run-loading-veil');
  const mapLabel = targetMap === 'itpark' ? 'IT PARK' : targetMap === 'college' ? 'COLLEGE CAMPUS' : targetMap === 'finalrun' ? 'THE FINAL RUN' : 'SCHOOL CAMPUS';
  if (veil) {
    if ($('run-loading-title')) $('run-loading-title').textContent = `PREPARING ${mapLabel}...`;
    setRunLoadingProgress(14, 'Starting 3D engine...');
    veil.classList.remove('is-fading-out', 'is-visible');
    veil.hidden = false;
    void veil.offsetWidth;
    veil.classList.add('is-visible');
  }
  runLoadingActive = true;
  effects.setEnabled(sound);
  effects.unlock();

  // Let the animated loading veil fade in cleanly BEFORE doing any WebGL/shader work (zero freeze feel!).
  setTimeout(async () => {
    if (launchId !== runLaunchNonce) return;
    $('start')?.classList.remove('is-launching');
    $('select-screen')?.classList.remove('is-launching-run');
    startBtnLaunching = false;
    setScreenMode('running');

    s = fresh();
    s.unlockedMaps = [...profile.unlockedMaps];
    s.powerUpgrades = { ...upgrades };
    equipPowers(s, chosen);
    s.enableForks = targetMap === 'itpark';
    s.map = targetMap;
    if (targetMap === 'finalrun') {
      finalRunActiveCharId = 'male';
      character = 'male';
      s.isFinalRun = true;
      s.finalRunStage = 'village';
      s.turnTime = 0;
      s.mode = 'running';
      s.styleAction = 0;
      s.speed = 28;
    } else {
      s.turnTime = 0.65;
      s.mode = 'intro';
      s.styleAction = SWEEP_SECONDS;
      s.speed = 0;
    }
    step(s, 0.001);
    s.distance = 0;
    s.time = 0;

    if (!await prepareLevelRun(targetMap,targetCharId,launchId)) return;
    s.distance = 0;
    s.time = 0;
    prev = 0;
    lastNearMissShown = 0;
    lastEventBannerShown = 0;
    lastLmskMask = -1;
    resetFeverMilestoneHud();
    runReported = { dist: 0, coins: 0, nearMiss: 0, bonus: 0 };
    crashReviveAdsWatched = 0;
    runCoinsDoubled = false;
    lastCrashReport = null;
    if ($('report-ad-actions')) $('report-ad-actions').hidden = true;
    if ($('btn-revive-ad')) $('btn-revive-ad').hidden = true;
    if ($('btn-double-coins')) $('btn-double-coins').hidden = true;
    if ($('btn-revive')) $('btn-revive').hidden = true;
    if ($('btn-share-score')) $('btn-share-score').hidden = true;
    if (speedLinesEl) { speedLinesEl.hidden = true; speedLinesEl.classList.remove('is-nitro'); lastSpeedMode = 0; }
    $('toast').textContent = targetMap === 'finalrun' ? `Village road · Reach the school at ${FINALRUN_GATE.toLocaleString()}m` : targetMap === 'itpark' ? 'IT Park · Follow the shuttle roof ramp' : targetMap === 'college' ? 'College rush · Find the next roof ramp' : 'School rush · Find the next roof ramp';
    runLoadingActive = false;
    hideRunLoadingVeilSmooth();
    tutorialGuide.startRun(s);
    if (sound) effects.startBgm?.('default');
    else effects.setBgmTrack?.('default');
    if (targetMap !== 'finalrun') effects.play('swag');
    effects.play('bell');
  }, 150);
}

function pause(){
  if(finalRunCutsceneBlocking() || !['running','countdown'].includes(s.mode))return;
  s.mode='paused';
  flushSave();
  $('countdown').hidden=true;
  if($('report-grade')) $('report-grade').hidden = true;
  if($('report-records')) $('report-records').hidden = true;
  if($('report-challenge-banner')) $('report-challenge-banner').hidden = true;
  if($('report-ad-actions')) $('report-ad-actions').hidden = true;
  if($('btn-revive-ad')) $('btn-revive-ad').hidden = true;
  if($('btn-double-coins')) $('btn-double-coins').hidden = true;
  if($('btn-revive')) $('btn-revive').hidden = true;
  if($('btn-share-score')) $('btn-share-score').hidden = true;
  setScreenMode('gameover');
  const mapName = selectedMap === 'finalrun' ? 'The Final Run' : selectedMap === 'itpark' ? 'IT Park' : selectedMap === 'college' ? 'College' : 'School';
  show('Take a breath.', `Your ${mapName} run will be right here.`, 'RESUME RUN', 'PAUSED');
}

function resume(){
  effects.unlock();
  s.mode='countdown';
  s.countdown=3;
  setScreenMode('running');
  $('overlay').hidden=true;
}

function show(title,message,button,tag){
  $('title').textContent=title;
  $('message').textContent=message;
  if($('btn-play-again')) $('btn-play-again').innerHTML=button+' <span aria-hidden="true">'+IC_REPLAY+'</span>';
  $('tag').textContent=tag;
  if($('selection')) $('selection').hidden=true;
  if($('restart')) $('restart').hidden=s.mode!=='paused';
  if($('btn-change-char')) {
    if(s.mode==='paused'){
      $('btn-change-char').innerHTML=IC_EXIT+' EXIT GAME';
      $('btn-change-char').setAttribute('aria-label', 'Exit game to main menu');
    } else {
      $('btn-change-char').innerHTML=IC_CHAR+' CHARACTER';
      $('btn-change-char').setAttribute('aria-label', 'Change character');
    }
  }
  $('tip').textContent=s.mode==='paused'?'Paused. Resume run or exit to menu.':'Each new run starts from zero.';
  updatePlayerNameDisplays(playerName);
  $('overlay').hidden=false;
}

let runReported = { dist: 0, coins: 0, nearMiss: 0, bonus: 0 };
function completeFinalRun() {
  if (s.map === 'grandfather') { crash(true); return; }
  const stage = s.finalRunStage || (s.map === 'itpark' ? 'itpark' : s.map === 'college' ? 'college' : 'village');
  const isCollegeStage = stage === 'college';
  const isItParkStage = stage === 'itpark';
  const runDist = Math.floor(s.distance);
  if (isCollegeStage) recordMapRunDistance(profile, 'college', runDist);
  if (isItParkStage) recordMapRunDistance(profile, 'itpark', runDist);
  const deltaDist = Math.max(0, runDist - runReported.dist);
  const deltaCoins = Math.max(0, s.coins - runReported.coins);
  const deltaNear = Math.max(0, (s.nearMissCount || 0) - runReported.nearMiss);
  const deltaBonus = 0;
  const bonusCoins = runReported.bonus + deltaBonus;
  runReported = { dist: runDist, coins: s.coins, nearMiss: s.nearMissCount || 0, bonus: bonusCoins };
  best = Math.max(best, runDist);
  save(true);
  recordRunMissions(deltaDist, deltaCoins + deltaBonus, deltaNear);
  updateUnlockUI();
  if (isItParkStage) {
    // Final One IT Park stage completion (1,000m): screen turns off and plays granfather_intro.mp4
    playGrandfatherIntroAfterItPark();
  } else if (isCollegeStage) {
    // Final One College stage completion: screen turns off, plays it_run.mp4, 3-2-1-START in last 3s, then links into IT Park map with Black Shirt character ('college-man')
    playItRunIntroAfterCollege();
  } else {
    // Final One Village stage completion: screen turns off, plays college_intro.mp4, 3-2-1-START in last 3s, then links into College map with Funk Hair character ('college-male')
    playCollegeIntroAfterFinalRun();
  }
}

function crash(completed=false){
  if (s.map !== 'grandfather' && (s.map === 'finalrun' || s.isFinalRun) && (completed || s.distance >= finalRunGateFor(s.map))) {
    completeFinalRun();
    return;
  }
  if (['school', 'college', 'itpark'].includes(s.map)) {
    recordMapRunDistance(profile, s.map, Math.floor(s.distance));
  }
  recordRunForMissions(dailyState, {
    coins: Math.floor(s.coins || 0),
    distance: Math.floor(s.distance || 0),
    nearmiss: Math.floor(s.nearMissCount || 0),
    jumps: Math.floor(s.jumpsOver || 0),
    fevers: Math.floor(s.feverCount || 0),
    runs: 1
  });
  saveDailyState();
  syncDailyNotifBadge();
  const previousBest = best;
  const runDist = Math.floor(s.distance);
  const deltaDist = Math.max(0, runDist - runReported.dist);
  const deltaCoins = Math.max(0, s.coins - runReported.coins);
  const deltaNear = Math.max(0, (s.nearMissCount || 0) - runReported.nearMiss);
  const deltaBonus = 0;
  const bonusCoins = runReported.bonus + deltaBonus;
  runReported = { dist: runDist, coins: s.coins, nearMiss: s.nearMissCount || 0, bonus: bonusCoins };
  best=Math.max(best, runDist);
  save();
  updateUnlockUI();
  recordRunMissions(deltaDist, deltaCoins + deltaBonus, deltaNear);
  if (speedLinesEl) { speedLinesEl.hidden = true; speedLinesEl.classList.remove('is-nitro'); lastSpeedMode = 0; }
  resetFeverMilestoneHud();
  if (!(s.map === 'grandfather' && completed)) effects.play(completed?'bell':'over');
  setScreenMode('gameover');
  const isCol = s.map === 'college' || selectedMap === 'college';
  const isFinalRun = Boolean(s.isFinalRun || s.map === 'finalrun' || selectedMap === 'finalrun');
  const hint={
    sideVehicle:isCol?'Watch the campus side roads for scooties & cars!':'Watch the side entrance. Move into the clear lane.',
    bus:isCol?'Dodge oncoming college cars & scooties on the curve!':'Dodge the oncoming bus. Change lanes before headlights reach you.',
    van:'Take a striped ramp, or use the clear ground lane.',
    block:isCol?'Dodge the vending machines, notice boards & parked scooties.':'Change lanes to dodge the tall crates.',
    jump:isCol?'Jump over the library book carts, canteen tables & barriers.':'Jump over the school benches and hurdles.',
    slide:isCol?'Slide under the College Fest banner & solar arches.':'Slide under the teal overhead beams.',
    nitroOverload:`Nitro overloads after ${NITRO_MAX_HITS} obstacle hits — dodge obstacles during Nitro Rush!`
  }[s.cause]||'Keep practicing!';
  
  const totalScore = runDist + s.coins * 10;
  const grade = totalScore >= 450 ? 'A+' : totalScore >= 220 ? 'A' : 'B';
  if($('grade-badge')) $('grade-badge').textContent = grade;
  if($('report-grade')) $('report-grade').hidden = isFinalRun;

  if($('report-current-score')) $('report-current-score').textContent = `${runDist} m`;
  if($('report-best-score')) $('report-best-score').textContent = `${best} m`;
  const pct = best > 0 ? Math.min(100, Math.round((runDist / best) * 100)) : (runDist > 0 ? 100 : 0);
  if($('report-record-fill')) $('report-record-fill').style.width = `${pct}%`;
  if($('report-record-pct')) $('report-record-pct').textContent = `${pct}% of Record`;
  if($('report-records')) $('report-records').hidden = isFinalRun;

  const challengeBanner = $('report-challenge-banner');
  if (challengeBanner) {
    challengeBanner.hidden = isFinalRun;
    challengeBanner.classList.remove('is-loser-taunt', 'is-new-record');
    if (completed) {
      challengeBanner.classList.add('is-new-record');
      challengeBanner.innerHTML = '<span class="challenge-headline">SCHOOL REACHED · 10,000m!</span><span class="challenge-sub">The village road run is complete. Your school journey starts here.</span>';
    } else if (previousBest > 0 && runDist < previousBest) {
      const gap = previousBest - runDist;
      challengeBanner.classList.add('is-loser-taunt');
      challengeBanner.innerHTML = `<span class="challenge-headline">ARE YOU A LOSER?!</span><span class="challenge-sub">You stopped ${gap.toLocaleString()}m short of your ${previousBest.toLocaleString()}m record (${pct}%) - try again to beat it!</span>`;
    } else if (runDist > 0) {
      const nextTarget = Math.ceil((runDist + 250) / 100) * 100;
      challengeBanner.classList.add('is-new-record');
      challengeBanner.innerHTML = `<span class="challenge-headline">NEW HIGHEST RECORD: ${runDist.toLocaleString()}m!</span><span class="challenge-sub">You smashed the record - push for ${nextTarget.toLocaleString()}m next!</span>`;
    } else {
      challengeBanner.classList.add('is-loser-taunt');
      challengeBanner.innerHTML = `<span class="challenge-headline">ARE YOU A LOSER?!</span><span class="challenge-sub">0m doesn't count - run now to set your Highest Record!</span>`;
    }
  }
  
  const elderFinale=s.map==='grandfather';
  const resultMessage=elderFinale
    ? completed ? `Home reached · ${runDist.toLocaleString()} m` : `Village trail · ${runDist} m · ${s.cause==='slide'?'Slide under the hanging cloth.':s.cause==='jump'?'Jump over the wooden obstacles.':'Follow the clear village path.'}`
    : isFinalRun
    ? hint
    : completed
      ? '10,000 m · Village road complete · '+(s.coins+bonusCoins)+' coins'+(bonusCoins?' (+'+bonusCoins+' bonus)':'')+'.'
      : runDist+' m | '+(s.coins+bonusCoins)+' coins'+(bonusCoins?' (+'+bonusCoins+' bonus)':'')+'. '+hint;
  show(
    elderFinale&&completed?'THE FINAL RUN COMPLETE':isFinalRun?'THE FINAL RUN':completed?'SCHOOL REACHED!':'ACADEMIC REPORT CARD',
    resultMessage,
    'RUN AGAIN',
    elderFinale?'GRANDFATHER’S VILLAGE':isFinalRun?'VILLAGE ROAD':completed?'MAP COMPLETE':'REPORT CARD'
  );
  lastCrashReport = { completed, isFinalRun, elderFinale, runDist, baseCoins: s.coins + bonusCoins, grade, feverCount: s.feverCount || 0 };
  crashReviveAdsWatched = 0;
  updateCrashAdButtons();
  if ($('btn-share-score')) {
    $('btn-share-score').hidden = isFinalRun;
    $('btn-share-score').onclick = () => {
      const doubledExtra = runCoinsDoubled ? Math.max(0, Math.floor(s.coins)) : 0;
      shareReportCard(runDist, s.coins + bonusCoins + doubledExtra, grade, s.feverCount || 0);
    };
  }
  $('tip').textContent = elderFinale ? (completed?'All four stages complete.':`Reach his childhood home at ${GRANDFATHER_GATE.toLocaleString()} m.`) : isFinalRun
    ? `Reach ${finalRunGateFor(s.map).toLocaleString()}m to complete this stage of The Final Run.`
    : `Coins: ${s.coins + bonusCoins} | Bank: ${totalCoins.toLocaleString()} | Grade: ${grade}`;
}

let crashReviveAdsWatched = 0;
let runCoinsDoubled = false;
let lastCrashReport = null;
let adActionBusy = false;

function updateCrashAdButtons() {
  const rep = lastCrashReport;
  const wrap = $('report-ad-actions');
  const adRevBtn = $('btn-revive-ad');
  const dblBtn = $('btn-double-coins');
  const coinRevBtn = $('btn-revive');
  if (!rep) {
    if (wrap) wrap.hidden = true;
    if (adRevBtn) adRevBtn.hidden = true;
    if (dblBtn) dblBtn.hidden = true;
    if (coinRevBtn) coinRevBtn.hidden = true;
    return;
  }
  const neededAds = rep.completed ? 0 : requiredAdsForRevive(s.reviveCount || 0);
  const canAd = ads.isAvailable();
  const showAdRevive = neededAds > 0 && canAd;
  const showCoinRevive = !rep.completed && neededAds > 0 && !showAdRevive && totalCoins >= REVIVE_COST;
  const showDoubleCoins = !rep.isFinalRun && s.coins > 0 && canAd;

  if (adRevBtn) {
    adRevBtn.hidden = !showAdRevive;
    adRevBtn.disabled = adActionBusy;
    if (showAdRevive) {
      if (neededAds === 1) {
        adRevBtn.innerHTML = `${IC_VIDEO} SAVE ME · 1 AD`;
      } else if (crashReviveAdsWatched === 1) {
        adRevBtn.innerHTML = `${IC_VIDEO} AD 1/2 · WATCH 2ND`;
      } else {
        adRevBtn.innerHTML = `${IC_VIDEO} SAVE ME · 2 ADS`;
      }
    }
  }
  if (dblBtn) {
    dblBtn.hidden = !showDoubleCoins;
    dblBtn.classList.toggle('is-claimed', runCoinsDoubled);
    dblBtn.disabled = adActionBusy || runCoinsDoubled;
    if (showDoubleCoins) {
      const gain = Math.max(0, Math.floor(s.coins));
      dblBtn.innerHTML = runCoinsDoubled
        ? `${IC_CHECK} 2X CLAIMED (+${gain})`
        : `${IC_VIDEO} 2X COINS (+${gain})`;
    }
  }
  if (wrap) {
    wrap.hidden = !(showAdRevive || showDoubleCoins);
  }
  if (coinRevBtn) {
    coinRevBtn.hidden = !showCoinRevive;
  }
}

function finishReviveIntoRun() {
  if (!reviveRun(s)) return false;
  crashReviveAdsWatched = 0;
  lastCrashReport = null;
  $('overlay').hidden = true;
  if ($('report-ad-actions')) $('report-ad-actions').hidden = true;
  if ($('btn-revive-ad')) $('btn-revive-ad').hidden = true;
  if ($('btn-double-coins')) $('btn-double-coins').hidden = true;
  if ($('btn-revive')) $('btn-revive').hidden = true;
  if ($('btn-share-score')) $('btn-share-score').hidden = true;
  setScreenMode('running');
  effects.play('shield');
  showCloseCallBanner((s.reviveCount || 0) >= MAX_REVIVES_PER_RUN ? 'FINAL SAVE · SHIELD!' : 'SHIELD ACTIVE!', true);
  return true;
}

if ($('btn-revive-ad')) {
  $('btn-revive-ad').onclick = async () => {
    if (adActionBusy) return;
    const needed = requiredAdsForRevive(s.reviveCount || 0);
    if (needed <= 0) return;
    adActionBusy = true;
    const btn = $('btn-revive-ad');
    try {
      while (crashReviveAdsWatched < needed) {
        if (btn) {
          btn.disabled = true;
          btn.textContent = needed > 1 ? `LOADING AD ${crashReviveAdsWatched + 1}/${needed}...` : 'LOADING AD...';
        }
        const res = await ads.showRewardedAd();
        if (!res.rewarded) {
          if ($('tip')) {
            $('tip').textContent = res.reason === 'dismissed'
              ? 'Watch the full video to continue your run.'
              : 'Ad unavailable right now — try again.';
          }
          return;
        }
        crashReviveAdsWatched++;
        if (crashReviveAdsWatched < needed) {
          if (btn) btn.textContent = `AD ${crashReviveAdsWatched}/${needed} DONE · NEXT AD...`;
          if ($('tip')) $('tip').textContent = `Ad ${crashReviveAdsWatched}/${needed} complete — loading next video to Save Me...`;
          await new Promise(r => setTimeout(r, 320));
        }
      }
      finishReviveIntoRun();
    } finally {
      adActionBusy = false;
      if (s.mode === 'crashed') updateCrashAdButtons();
    }
  };
}

if ($('btn-double-coins')) {
  $('btn-double-coins').onclick = async () => {
    if (adActionBusy || runCoinsDoubled || s.coins <= 0) return;
    const bonus = Math.max(0, Math.floor(s.coins));
    adActionBusy = true;
    const btn = $('btn-double-coins');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'LOADING AD...';
    }
    try {
      const res = await ads.showRewardedAd();
      if (!res.rewarded) {
        if ($('tip')) {
          $('tip').textContent = res.reason === 'dismissed'
            ? 'Watch the full video to double your run coins.'
            : 'Ad unavailable right now — try again.';
        }
        return;
      }
      runCoinsDoubled = true;
      totalCoins += bonus;
      lastUnlockUiKey = '';
      save(true);
      effects.play('upgrade');
      updateUnlockUI();
      updateCarouselUI();
      showCloseCallBanner(`+${bonus} COINS DOUBLED!`, true);
      if ($('tip') && lastCrashReport) {
        $('tip').textContent = `2X Coins Claimed (+${bonus}) | Bank: ${totalCoins.toLocaleString()} | Grade: ${lastCrashReport.grade}`;
      }
    } finally {
      adActionBusy = false;
      updateCrashAdButtons();
    }
  };
}

if ($('btn-revive')) {
  $('btn-revive').onclick = () => {
    if (requiredAdsForRevive(s.reviveCount || 0) <= 0 || totalCoins < REVIVE_COST) return;
    totalCoins -= REVIVE_COST;
    lastUnlockUiKey = '';
    save();
    updateUnlockUI();
    updateCarouselUI();
    finishReviveIntoRun();
  };
}

async function exitGameOverToHub(targetHub, countForInterstitial) {
  if (adActionBusy) return;
  adActionBusy = true;
  try {
    if (countForInterstitial) {
      await ads.maybeShowInterstitialForRun();
    }
  } finally {
    adActionBusy = false;
  }
  const wasGrandfather = s.map === 'grandfather';
  finalRunActiveCharId = '';
  crashReviveAdsWatched = 0;
  runCoinsDoubled = false;
  lastCrashReport = null;
  s = fresh();
  s.map = selectedMap;
  s.mode = 'ready';
  $('overlay').hidden = true;
  if ($('report-grade')) $('report-grade').hidden = true;
  if ($('report-records')) $('report-records').hidden = true;
  if ($('report-challenge-banner')) $('report-challenge-banner').hidden = true;
  if ($('report-ad-actions')) $('report-ad-actions').hidden = true;
  if ($('btn-revive-ad')) $('btn-revive-ad').hidden = true;
  if ($('btn-double-coins')) $('btn-double-coins').hidden = true;
  if ($('btn-revive')) $('btn-revive').hidden = true;
  if ($('selection')) $('selection').hidden = false;
  syncMapHeaderUI();
  updateCarouselUI();
  setScreenMode('select');
  showHub(targetHub);
  if (wasGrandfather) {
    if (sound) effects.startBgm?.('default');
    else effects.setBgmTrack?.('default');
  }
}

if($('start')) $('start').onclick=e=>{
  e?.preventDefault?.();
  if($('start').dataset.loadError==='true'){ location.reload(); return; }
  if (runLoadingActive || startBtnLaunching || finalIntroActive || collegeIntroActive) return;
  startBtnLaunching = true;
  playLaunchClick(sound);
  if (navigator.vibrate) try { navigator.vibrate(18); } catch {}
  $('start').classList.remove('is-launching');
  void $('start').offsetWidth;
  $('start').classList.add('is-launching');
  $('select-screen')?.classList.add('is-launching-run');
  // Let the tactile 3D button punch-down & launch glow animate cleanly before entering the run!
  setTimeout(() => {
    if (!runLoadingActive) {
      $('start')?.classList.remove('is-launching');
      $('select-screen')?.classList.remove('is-launching-run');
      startBtnLaunching = false;
    }
    start();
  }, 200);
};
if($('btn-play-again')) $('btn-play-again').onclick=()=>{
  if(s.mode==='paused'){resume();return;}
  exitGameOverToHub('home', true);
};
if($('restart')) $('restart').onclick=start;
if($('btn-change-char')) $('btn-change-char').onclick=()=>{
  const wasPaused = s.mode === 'paused';
  exitGameOverToHub(wasPaused ? 'home' : 'characters', !wasPaused);
};
$('pause').onclick=()=>s.mode==='paused'?resume():pause();

function input(a){
  if(runLoadingActive || finalRunCutsceneBlocking())return;
  if (tutorialGuide.isFrozen()) {
    const accepted = tutorialGuide.onAction(a);
    if (!accepted) return;
  }
  const before=[s.jump,s.slide,s.roll,s.drop,s.lane];
  action(s,a);
  if(s.mode==='running'){
    tutorialGuide.onAction(a);
    if(s.jump!==before[0]||s.slide!==before[1]||s.roll!==before[2]||s.drop!==before[3]||s.lane!==before[4])
      effects.play(a==='jump'?'jump':a==='slide'?'slide':'lane');
  }
}

document.querySelectorAll('[data-action]').forEach(b=>b.addEventListener('pointerdown',e=>{
  e.preventDefault();
  input(b.dataset.action);
}));

window.addEventListener('keydown',e=>{
  if ($('power-picker')?.open) return;
  if(e.target?.closest?.('input, textarea, select')) return;
  if((e.key==='c'||e.key==='C')&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&s.mode==='running'){
    e.preventDefault();
    cycleCameraAngle(true);
    return;
  }
  // Never allow keyboard shortcuts or media keys to pause/interrupt active videos.
  if (finalRunCutsceneBlocking() || game.classList.contains('mode-splash')) {
    if ([' ', 'k', 'K', 'p', 'P', 'Escape', 'MediaPlayPause', 'MediaPause', 'MediaStop'].includes(e.key)) {
      e.preventDefault();
      return;
    }
  }
  if(s.mode!=='running'&&e.target?.closest?.('button')&&(e.key===' '||e.key==='Enter'))return;
  if(s.mode!=='running' && game.classList.contains('mode-select') && game.classList.contains('hub-characters')) {
    if(e.key==='ArrowLeft'){ e.preventDefault(); moveCarousel(-1); return; }
    if(e.key==='ArrowRight'){ e.preventDefault(); moveCarousel(1); return; }
  }
  const a={ArrowLeft:'left',a:'left',ArrowRight:'right',d:'right',ArrowUp:'jump',w:'jump',' ':'jump',ArrowDown:'slide',s:'slide'}[e.key];
  if(a){e.preventDefault();if(!e.repeat)input(a);}
  if(e.key==='Escape'||e.key==='p'){s.mode==='paused'?resume():pause();}
});

let creditsAudioTakeover = false;

document.addEventListener('visibilitychange',()=>{
  framePacer.reset();
  if(document.hidden){
    pause();
    effects.pauseBgm?.();
  } else if(sound && !adOverlayActive && !creditsAudioTakeover && (s.mode!=='remembering' || s.map==='grandfather') && !game.classList.contains('mode-splash') && !finalIntroActive && !collegeIntroActive) {
    effects.startBgm?.();
  }
});
['pointerdown','keydown'].forEach(type=>{
  window.addEventListener(type,()=>{
    if(game.classList.contains('mode-splash')){
      const v=$('intro-video');
      if(v){
        if(sound) v.muted=false;
        if(v.paused && !introFinished) v.play().catch(()=>{});
      }
      return;
    }
    if (sound) effects.unlock();
  },{passive:true});
});

function tick(t) {
  const dt = prev ? Math.min(0.1, (t-prev)/1000) : 0;
  prev = t;
  if (runLoadingActive || s.mode === 'remembering') return;
  if (finalRunCutsceneBlocking()) return;
  // Zero-lag 2D image menus: pause 100% of WebGL rendering & game simulation during Splash and Menu hubs!
  if (game.classList.contains('mode-splash') || game.classList.contains('mode-select') || s.mode === 'ready') {
    if (!assetsReady) onAllAssetsReady();
    return;
  }
  if (!draw) return;
  const old = s.mode, firstHitBefore = s.firstHitAt, captureBefore = s.capture, hitBefore = s.hit;
  const distanceBefore = s.distance, coinsBefore = s.coins;
  
  if (s.mode === 'starting') {
    s.turnTime -= dt;
    const progress = 1 - Math.max(0, s.turnTime) / 0.65;
    s.speed = 28 * Math.min(1, progress * progress * 1.5);
    s.distance += s.speed * dt;
    s.time += dt;
    if (s.turnTime <= 0) {
      s.mode = 'running';
      s.speed = 28;
    }
  }

  // ULTRA-only brief slow-motion knockdown impact punch at start of fatal fall (untouched on AUTO/LOW/MED/HIGH)
  const simDt = tutorialGuide.isFrozen()
    ? 0
    : (graphicsQuality === 'ultra' && s.mode === 'falling' && s.fall > 0.64) ? dt * 0.36 : dt;
  if (simDt > 0) step(s, simDt);
  const finishGate=s.map==='grandfather'?GRANDFATHER_GATE:(s.map==='finalrun'||s.isFinalRun)?finalRunGateFor(s.map):Infinity;
  const memory=old==='running' && reachedMemory(s,distanceBefore);
  if(memory) {
    const run=s;
    run.distance=memory.at;
    run.speed=0;
    run.mode='remembering';
    // Keep Courtyard Sunset playing across Grandfather's road & memories 1-5; fade it out cleanly right before finalvideo & credits start!
    if (run.map !== 'grandfather') effects.pauseBgm?.();
    playVillageMemory(memory, sound, () => {
      creditsAudioTakeover = false;
      if(s!==run) return;
      if(memory.at===GRANDFATHER_GATE) {run.mode='finished';completeFinalRun();}
      else {run.mode='running';if(sound && run.map !== 'grandfather') effects.startBgm?.();}
    }, {
      keepBgmPlaying: run.map === 'grandfather',
      onCreditsStart: () => {
        creditsAudioTakeover = true;
        effects.fadeOutBgm?.(1.25);
      }
    });
  }
  if(old==='running'&&s.mode==='running'&&distanceBefore<finishGate&&s.distance>=finishGate){
    s.distance=finishGate;
    s.speed=0;
    s.mode='finished';
  }
  powerControls.update();
  tutorialGuide.update(s);
  try { effects.update(s, character); } catch (err) { if (!loopErrorLogged) { loopErrorLogged = true; console.error('Sound update error:', err); } }
  
  if(old==='running' && s.mode==='falling') {
    effects.play('hit', s.cause, character);
    game.classList.remove('impact-flash');
    void game.offsetWidth;
    game.classList.add('impact-flash');
    if (s.nitroOverloaded) {
      showCloseCallBanner(`NITRO OVERLOAD · ${NITRO_MAX_HITS}/${NITRO_MAX_HITS} OUT!`, true);
    }
    if (navigator.vibrate) try { navigator.vibrate([140, 60, 180]); } catch {}
  } else if (hitBefore === 0 && s.hit > 0 && !s.shieldAbsorbed) {
    effects.play('hit', s.cause, character);
    game.classList.remove('impact-flash');
    void game.offsetWidth;
    game.classList.add('impact-flash');
    if (navigator.vibrate) try { navigator.vibrate(80); } catch {}
  }
  game.classList.toggle('capture', isCapture(s));
  if(old==='running'&&s.mode==='finished') completeFinalRun();
  else if (old !== 'crashed' && s.mode === 'crashed') crash();
  if (old === 'captured' && captureBefore < 1.30 && s.capture >= 1.30) effects.play('laugh');
  if (old === 'captured' && captureBefore < CAPTURE_GESTURE_START && s.capture >= CAPTURE_GESTURE_START) effects.play('swag');

  const earnedCoins = Math.max(0,s.coins - coinsBefore);
  const reachedMapGoal =
    (s.map === 'school' && profile.schoolBest < MAP_UNLOCK_RULES.college.reqDistance && s.distance >= MAP_UNLOCK_RULES.college.reqDistance) ||
    (s.map === 'college' && profile.collegeBest < MAP_UNLOCK_RULES.itpark.reqDistance && s.distance >= MAP_UNLOCK_RULES.itpark.reqDistance) ||
    (s.map === 'itpark' && profile.itParkBest < MAP_UNLOCK_RULES.finalrun.reqDistance && s.distance >= MAP_UNLOCK_RULES.finalrun.reqDistance);
  if (earnedCoins || reachedMapGoal) {
    if (['school', 'college', 'itpark'].includes(s.map)) {
      recordMapRunDistance(profile, s.map, s.distance);
      if (s.map === 'college') profile.collegeCoins += earnedCoins;
    }
    if (!earnedCoins) save();
  }
  if (s.coins > coinsBefore) {
    const gained = s.coins - coinsBefore;
    totalCoins += gained;
    save();
    if (s.y > 1.2 || s.roofRide) effects.play('roofCoin');
    else effects.play('coin');
    if (!prefersReducedMotion && (t - lastCoinAnimTime) > 220) {
      lastCoinAnimTime = t;
      const counter=$('coins').parentElement;
      if (counter?.animate) {
        counter.animate([{transform:'scale(1)'},{transform:'scale(1.15)',offset:.3},{transform:'scale(1)'}],
          {duration:220,easing:'ease-out'});
      }
    }
  }

  // Powerup sound & toasts
  if (s.collectedPowerup === 'magnet') {
    effects.play('magnet');
    $('toast').textContent='Magnet active! Collect nearby gold coins.';
    showCloseCallBanner(`MAGNET · ${Math.round(s.magnet)}s`, false);
    s.collectedPowerup = null;
  } else if (s.collectedPowerup === 'shield') {
    effects.play('shield');
    $('toast').textContent='Shield active for 10 seconds.';
    showCloseCallBanner('SHIELD ACTIVE!', true);
    s.collectedPowerup = null;
  } else if (s.collectedPowerup === 'nitro') {
    effects.play('nitro');
    showCloseCallBanner(`NITRO RUSH · ${Math.ceil(s.nitro)}s!`, true);
    s.collectedPowerup = null;
  } else if (s.collectedPowerup === 'shoes') {
    effects.play('shoes');
    showCloseCallBanner(`SUPER JUMP · ${Math.ceil(s.shoes)}s!`, false);
    s.collectedPowerup = null;
  }

  if (powerById[s.collectedPowerup]) {
    showCloseCallBanner(powerById[s.collectedPowerup].name.toUpperCase(),true);
    effects.play('magnet');
    s.collectedPowerup = null;
  }
  if (s.milestoneEvent && s.milestoneEvent.id !== lastMilestoneShown) {
    lastMilestoneShown = s.milestoneEvent.id;
    const mv = s.milestoneEvent;
    effects.play('milestone');
    showMilestoneBanner(mv.label, `+${mv.coins} BONUS COINS`);
    $('toast').textContent = `${mv.label} +${mv.coins} Bonus Coins!`;
  }
  if (s.lastRoadSound) {
    effects.play(s.lastRoadSound);
    s.lastRoadSound = null;
  }
  if (s.eventBanner && s.eventBanner.id !== lastEventBannerShown) {
    lastEventBannerShown = s.eventBanner.id;
    const isHighlight = ['turbo', 'mystery', 'fever', 'skybridge', 'underpass'].includes(s.eventBanner.kind);
    showCloseCallBanner(s.eventBanner.text, isHighlight);
    $('toast').textContent = s.eventBanner.text;
  }

  if (s.shieldAbsorbed) {
    effects.play('shield');
    $('toast').textContent='Shield absorbed the crash!';
    s.shieldAbsorbed = false;
  }

  // School Bell Milestones & Continuous Speed Tiers
  if (s.map !== 'grandfather') {
    for (const m of [100, 250, 500]) {
      if (distanceBefore < m && s.distance >= m) {
        effects.play('bell');
        $('toast').textContent = `School Bell Rang at ${m}m! Keep Rushing!`;
      }
    }
  }
  if (distanceBefore < 1000 && s.distance >= 1000 && s.map !== 'finalrun' && !s.isFinalRun) {
    effects.play('bell');
    $('toast').textContent = '1,000m · NORMAL FAST SPEED!';
  }
  if (distanceBefore < 2000 && s.distance >= 2000) {
    effects.play('bell');
    $('toast').textContent = '2,000m · HIGH SPEED & MORE OBSTACLES!';
  }
  if (distanceBefore < 5000 && s.distance >= 5000) {
    effects.play('bell');
    $('toast').textContent = '5,000m · EXTRA SPEED & HEAVY OBSTACLES!';
  }
  if (distanceBefore < 8000 && s.distance >= 8000) {
    effects.play('bell');
    $('toast').textContent = '8,000m · MORE MORE SPEED! 2X HYPER MODE!';
  }
  if (distanceBefore < 10000 && s.distance >= 10000 && s.map !== 'finalrun' && !s.isFinalRun) {
    recordMapRunDistance(profile, s.map, s.distance);
    save();
    effects.play('bell');
    if (s.map === 'college' && !isMapOpen('itpark')) {
      showCloseCallBanner('10,000m · IT PARK GOAL MET!', true);
      $('toast').textContent = '10,000m College Goal Done! Spend 20,000 Coins in Maps to unlock IT Park!';
    } else if (s.map === 'itpark' && !isMapOpen('finalrun')) {
      showCloseCallBanner('10,000m · FINAL RUN GOAL MET!', true);
      $('toast').textContent = '10,000m IT Park Goal Done! Spend 30,000 Coins in Maps to unlock The Final Run!';
    } else {
      $('toast').textContent = '10,000m REACHED · LEGENDARY RUN!';
    }
  }
  if (distanceBefore < 15000 && s.distance >= 15000 && s.map === 'school') {
    recordMapRunDistance(profile, 'school', s.distance);
    save();
    effects.play('bell');
    if (!isMapOpen('college')) {
      showCloseCallBanner('15,000m · COLLEGE GOAL MET!', true);
      $('toast').textContent = '15,000m School Goal Done! Spend 20,000 Coins in Maps to unlock College Campus!';
    } else {
      $('toast').textContent = '15,000m SCHOOL LEGEND!';
    }
  }

  if (s.mode === 'running' && s.map === 'school' && distanceBefore < SCHOOL_GATE && s.distance >= SCHOOL_GATE) {
    $('toast').textContent = 'Campus pickup zone · Look for the next roof ramp';
  }
  if (s.mode === 'running' && distanceBefore < s.entryVan.rear && s.distance >= s.entryVan.rear && s.floor > 1) {
    $('toast').textContent = 'Roof route · Follow the coins and run off the far end';
  }
  if(s.mode==='running'&&s.items.some(o=>o.roofRide&&o.started&&o.lane===s.lane&&o.z-s.distance<20&&o.z+o.length>s.distance)){
    $('toast').textContent=s.map==='itpark'?'IT Park · Follow the shuttle roof ramp':s.map==='college'?'Jump onto the moving campus SUV · Follow the roof coins':'Jump onto the moving bus · Follow the roof coins';
  }
  
  if (firstHitBefore !== null && s.firstHitAt === null) {
    $('toast').textContent = 'You escaped the chaser!';
  }
  
  const distInt = Math.floor(s.distance);
  if (distInt !== lastHudDist) {
    lastHudDist = distInt;
    $('distance').innerHTML = distInt+'<span> m</span>';
  }
  if (s.coins !== lastHudCoins) {
    lastHudCoins = s.coins;
    $('coins').textContent = s.coins;
  }
  if (best !== lastHudBest) {
    lastHudBest = best;
    $('best').textContent = best+' m';
  }

  // Dynamic Location HUD update matching active branch & map
  const locEl = hudLocationEl || document.querySelector('.hud-top-bar .location');
  if (locEl) {
    const activeMap = s.map || selectedMap;
    let locText = activeMap === 'itpark' ? (IC_ITPARK + ' IT PARK') : (activeMap === 'school' ? (IC_SCHOOL + ' RUNVERSE SCHOOL') : activeMap === 'finalrun' ? (IC_SCHOOL + ' THE FINAL RUN') : (IC_COLLEGE + ' RUNVERSE COLLEGE'));
    if (activeMap === 'grandfather') locText = 'GRANDFATHER’S VILLAGE';
    if (activeMap === 'itpark') {
      if (s.activeBranch === 'skybridge') locText = IC_ITPARK + ' SKY BRIDGE';
      else if (s.activeBranch === 'underpass') locText = IC_ITPARK + ' METRO TUNNEL';
    }
    if (locEl._lastText !== locText) {
      locEl._lastText = locText;
      locEl.innerHTML = locText;
    }
  }
  
  // Powerup HUD indicators
  const magActive = s.magnet > 0;
  const magSec = magActive ? Math.ceil(s.magnet) : 0;
  const magPill = $('magnet-pill');
  if (magPill && magSec !== lastMagSec) {
    lastMagSec = magSec;
    magPill.hidden = !magActive;
    if (magActive && $('magnet-timer')) $('magnet-timer').textContent = magSec + 's';
  }
  const shieldActive = s.shield || s.slots?.some(slot => slot.id === 'shield' && slot.until > s.time);
  const shieldPill = $('shield-pill');
  if (shieldPill && shieldActive !== lastShield) {
    lastShield = shieldActive;
    shieldPill.hidden = !shieldActive;
  }
  const nitroSec = s.nitro > 0 ? Math.ceil(s.nitro) : 0;
  const nitroHitsNow = s.nitro > 0 ? (s.nitroHits || 0) : 0;
  const nitroHudKey = `${nitroSec}:${nitroHitsNow}`;
  const nitroPill = $('nitro-pill');
  if (nitroPill && nitroHudKey !== lastNitroSec) {
    lastNitroSec = nitroHudKey;
    nitroPill.hidden = nitroSec <= 0;
    nitroPill.classList.toggle('is-danger', nitroSec > 0 && nitroHitsNow >= NITRO_MAX_HITS - 1);
    if (nitroSec > 0 && $('nitro-timer')) $('nitro-timer').textContent = `${nitroSec}s · ${nitroHitsNow}/${NITRO_MAX_HITS}`;
  }
  const shoesSec = s.shoes > 0 ? Math.ceil(s.shoes) : 0;
  const shoesPill = $('shoes-pill');
  if (shoesPill && shoesSec !== lastShoesSec) {
    lastShoesSec = shoesSec;
    shoesPill.hidden = shoesSec <= 0;
    if (shoesSec > 0 && $('shoes-timer')) $('shoes-timer').textContent = shoesSec + 's';
  }
  const coins2xSec = s.doubleCoins > 0 ? Math.ceil(s.doubleCoins) : 0;
  const coins2xPill = $('coins2x-pill');
  if (coins2xPill && coins2xSec !== lastCoins2xSec) {
    lastCoins2xSec = coins2xSec;
    coins2xPill.hidden = coins2xSec <= 0;
    if (coins2xSec > 0 && $('coins2x-timer')) $('coins2x-timer').textContent = coins2xSec + 's';
  }
  const ghostSec = s.ghost > 0 ? Math.ceil(s.ghost) : 0;
  const ghostPill = $('ghost-pill');
  if (ghostPill && ghostSec !== lastGhostSec) {
    lastGhostSec = ghostSec;
    ghostPill.hidden = ghostSec <= 0;
    if (ghostSec > 0 && $('ghost-timer')) $('ghost-timer').textContent = ghostSec + 's';
  }
  const speedMode = s.mode !== 'running' ? 0 : (s.nitro > 0 || s.turboBoost > 0) ? 2 : s.speed >= 42 ? 1 : 0;
  if (speedLinesEl && speedMode !== lastSpeedMode) {
    lastSpeedMode = speedMode;
    speedLinesEl.hidden = speedMode === 0;
    speedLinesEl.classList.toggle('is-nitro', speedMode === 2);
  }
  const curMask = s.lmskMask || 0;
  if (curMask !== lastLmskMask) {
    lastLmskMask = curMask;
    document.querySelectorAll('#lmsk-letters [data-lmsk]').forEach(el => {
      const bit = Number(el.dataset.lmsk);
      el.classList.toggle('is-lit', Boolean(curMask & (1 << bit)));
    });
  }

  const cdSec = s.mode === 'countdown' ? Math.ceil(s.countdown) : -1;
  if (cdSec !== lastCountdown) {
    lastCountdown = cdSec;
    $('countdown').hidden = cdSec < 0;
    if (cdSec >= 0) $('countdown').textContent = cdSec;
  }

  // Pause 3D WebGL rendering completely while static modal dialogs (Name/Shop modals) are open
  // (after warming up 1 ready frame behind the name modal so clicking Start Adventure is 0ms instant)
  const staticOverlayOpen = s.mode === 'ready' && ((currentHub === 'settings') || (nameModalEl && !nameModalEl.hidden) || (shopModalEl && !shopModalEl.hidden) || (privacyModalEl && !privacyModalEl.hidden) || tutorialGuide.isNoticeOpen());
  if (staticOverlayOpen && assetsReady && warmedFirstFrame) {
    if (!menuNeedsFrame) return;
    menuNeedsFrame = false;
  }
  if (s.mode === 'ready') {
    s.time = (s.time || 0) + (dt || 0.016);
    s.previewRain = (s.map === 'college');
  }

  let renderDt = dt;
  // Let the dynamic GPU resolution/quality auto-scaler reach smooth 60 FPS first;
  // engage steady 30 FPS pacing only if an entry-level phone is already at its performance floor.
  if (graphicsQuality === 'auto' && s.mode === 'running' && !usingLiteRenderer && draw?.isAtPerformanceFloor?.()) {
    if (framePacer.frame(t) === null) return;
    // Keep the rig in step with the simulated runner even when a display frame is skipped.
    renderDt=lastDrawnRun===s ? Math.max(0,s.time-lastDrawnRunTime) : Math.min(dt,.05);
    lastDrawnRun=s;
    lastDrawnRunTime=s.time;
  } else {
    lastDrawnRun=null;
    framePacer.reset();
  }
  let status = 'ready';
  const renderCharId = (s.mode === 'ready' && currentHub === 'characters' && !collegeIntroActive)
    ? (activePreviewCharId || CHARACTER_ROSTER[carouselIndex]?.id || equippedCharId)
    : ((s.isFinalRun && finalRunActiveCharId) ? finalRunActiveCharId : equippedCharId);
  if (s.mode === 'ready' && lastRenderStatus === 'loading' && !draw?.isLoaded?.(renderCharId)) {
    loadingThrottleAccum += dt || 0.016;
    if (loadingThrottleAccum < 0.12) return;
    loadingThrottleAccum = 0;
  }
  try {
    status = draw(s, renderCharId, renderDt);
    if (status === 'context-lost') {
      switchToLiteRenderer('WebGL context lost');
      status = draw(s, renderCharId, dt);
    }
  } catch (err) {
    switchToLiteRenderer(err?.message || err);
    try { status = draw(s, renderCharId, dt); } catch {}
  }
  lastRenderStatus = status;
  if (status === 'ready') {
    warmedFirstFrame = true;
    if (!assetsReady) onAllAssetsReady();
  }
  const showCharBlur = (s.mode === 'ready' && !usingLiteRenderer && status !== 'ready' && currentHub === 'characters');
  const showCharErr = showCharBlur && status === 'error';
  if (showCharBlur !== lastShowCharBlur || showCharErr !== lastShowCharErr) {
    lastShowCharBlur = showCharBlur;
    lastShowCharErr = showCharErr;
    game.classList.toggle('is-char-loading', showCharBlur);
    game.classList.toggle('is-char-error', showCharErr);
    if ($('char-loading-veil')) {
      $('char-loading-veil').hidden = !showCharBlur;
      if (showCharBlur && $('char-loading-label')) {
        $('char-loading-label').textContent = showCharErr
          ? "Character didn't load — Tap Retry"
          : 'Loading 3D Hero...';
      }
    }
  }
  if(s.mode==='ready'){
    const startButton=$('start'),failed=status==='error';
    if(startButton){
      startButton.disabled=false;
      const label=failed?'Retry loading runner':"LET'S RUN";
      if(startButton.dataset.currentLabel!==label){
        startButton.dataset.currentLabel=label;
        startButton.innerHTML=`<span>${label}</span> <span class="rush-arrow" aria-hidden="true">${IC_RUSH}</span>`;
      }
      startButton.dataset.loadError=String(failed);
    }
  }
}
let loopErrorLogged = false;
function frame(t) {
  requestAnimationFrame(frame);
  try {
    tick(t);
  } catch (err) {
    if (!loopErrorLogged) { loopErrorLogged = true; console.error('Frame error:', err); }
  }
}
requestAnimationFrame(frame);
