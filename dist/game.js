import {GRANDFATHER_GATE} from './grandfather-route.js';
import {createPowerControls} from './power-controls.js?v=3.3.0';
import {equipPowers,availablePowers,usePower} from './engine.js?v=3.6.8';
import {createSound,playUiClick,playEnterSound,playLaunchClick} from './sound.js?v=3.9.1';
import {CAPTURE_GESTURE_START,SWEEP_SECONDS,fresh,action,step,height,isCapture,reviveRun,SCHOOL_GATE,FINALRUN_GATE} from './engine.js?v=3.6.8';
import {createRenderer} from './renderer3d.js?v=3.9.1';
import {createLiteRenderer} from './renderer-lite.js?v=3.3.1';

import {powers,powerById,playerLevel,xpForLevel,parkOpen} from './progression.js?v=3.1.7';
import {initializeBuildProfile} from './build-profile.js';
initializeBuildProfile();
const profile = {xp:0,collegeBest:0,collegeCoins:0,introduced:0,itParkUnlocked:true};
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
const IC_CHAR = '<svg class="ui-icon" viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>';
const IC_EXIT = '<svg class="ui-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>';
const IC_RUSH = '<svg class="ui-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 6 6 6-6 6"/><path d="m13 6 6 6-6 6"/></svg>';
let canvas=$('world');
let lastHudDist = -1, lastHudCoins = -1, lastHudBest = -1, lastMagSec = -1, lastShield = null, lastNitroSec = -1, lastShoesSec = -1, lastComboVal = 1, lastSpeedMode = 0, lastNearMissShown = 0, lastEventBannerShown = 0, lastLmskMask = -1, lastFeverOn = false, closeCallHideTimer = 0, lastCountdown = -1, lastShowCharBlur = null, lastShowCharErr = null, menuNeedsFrame = true, warmedFirstFrame = false, lastUnlockUiKey = '', lastRenderStatus = 'loading', loadingThrottleAccum = 0, carouselSwapTimer = 0, preloaderStarted = false;
const nameModalEl = $('name-modal');
const shopModalEl = $('shop-modal');
const speedLinesEl = $('speed-lines');
const closeCallEl = $('close-call-pop');
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
  function freezeAtEnd() {
    if (videoFrozen) return;
    videoFrozen = true;
    try {
      video.pause();
    } catch {}
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
            if (video.hasAttribute('src')) video.play().catch(() => activateEnterButton());
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

const COLLEGE_UNLOCK_DISTANCE = 10000;
const COLLEGE_UNLOCK_COINS = 20000;
const CHARACTER_ROSTER = [
  { id: 'male', name: 'SCHOOL BOY', outfit: 'School Uniform · School Campus', map: 'school', gender: 'male', lockedByCollege: false },
  { id: 'female', name: 'SCHOOL GIRL', outfit: 'Original Outfit · School Campus', map: 'school', gender: 'female', lockedByCollege: false },
  { id: 'college-male', name: 'COLLEGE BOY', outfit: 'Casual Outfit · College Campus', map: 'college', gender: 'male', lockedByCollege: true },
  { id: 'college-woman', name: 'COLLEGE WOMAN', outfit: 'Blue Style · College Campus', map: 'college', gender: 'female', lockedByCollege: true },
  { id: 'college-man', name: 'COLLEGE MAN', outfit: 'Jacket Style · College Campus', map: 'college', gender: 'male', lockedByCollege: true },
  { id: 'aged-elder', name: 'GRANDFATHER', outfit: 'Village Elder · The Final Run', gender: 'male', lockedByCollege: false }
];

const game = canvas.closest('.game');
let s=fresh(),best=0,totalCoins=0,collegeDistDone=false,collegeCoinsDone=false,
    equippedCharId='male',character='male',selectedMap='school',carouselIndex=0,currentHub='home',
    sound=true,prev=0,w=600,h=700;

export const isLocalTest = typeof window !== 'undefined' && Boolean(
  (window.location?.hostname === 'localhost' ||
   window.location?.hostname === '127.0.0.1' ||
   window.location?.hostname === '[::1]' ||
   window.location?.hostname?.startsWith('192.168.') ||
   window.location?.hostname?.startsWith('10.') ||
   window.location?.port === '3000' ||
   window.location?.port === '8080' ||
   window.location?.port === '5173' ||
   window.location?.protocol === 'file:' ||
   window.location?.search?.includes('unlock=all') ||
   window.location?.search?.includes('test=1')) &&
  !window.Capacitor?.isNativePlatform?.()
);

const isDistGoalMet = () => isLocalTest || collegeDistDone || best >= COLLEGE_UNLOCK_DISTANCE;
const isCoinsGoalMet = () => isLocalTest || collegeCoinsDone || totalCoins >= COLLEGE_UNLOCK_COINS;
const isCollegeUnlocked = () => isLocalTest || (isDistGoalMet() && isCoinsGoalMet());
const isCharUnlocked = entry => isLocalTest || !entry?.lockedByCollege || isCollegeUnlocked();

try{
  best=Number(localStorage.getItem('runverse-best'))||0;
  totalCoins=Math.max(0,Math.floor(Number(localStorage.getItem('runverse-total-coins'))||0));
  collegeDistDone=localStorage.getItem('runverse-college-dist-done')==='1' || best >= COLLEGE_UNLOCK_DISTANCE;
  collegeCoinsDone=localStorage.getItem('runverse-college-coins-done')==='1' || totalCoins >= COLLEGE_UNLOCK_COINS;
  try {
    const stored = JSON.parse(localStorage.getItem('runverse-progression'));
    for (const key of Object.keys(profile)) {
      if (Number.isSafeInteger(stored?.[key]) && stored[key] >= 0) profile[key] = stored[key];
    }
  } catch {}
  if (isLocalTest) {
    profile.itParkUnlocked = true;
  }
  const savedChar=localStorage.getItem('runverse-character')||'male';
  const rawSavedMap = localStorage.getItem('runverse-map');
  const canAccessPark = isLocalTest || parkOpen(profile);
  const canAccessCollege = isCollegeUnlocked();
  let savedMap = 'school';
  if (rawSavedMap === 'finalrun') savedMap = 'finalrun';
  else if (rawSavedMap === 'itpark' && canAccessPark) savedMap = 'itpark';
  else if (rawSavedMap === 'college' && canAccessCollege) savedMap = 'college';
  else if (rawSavedMap === 'school') savedMap = 'school';
  else if (canAccessCollege) savedMap = 'college';

  if (!canAccessCollege && !isLocalTest) {
    selectedMap = savedMap === 'finalrun' ? 'finalrun' : 'school';
    equippedCharId = savedChar === 'aged-elder' ? savedChar : (savedChar === 'female' || savedChar === 'college-woman') ? 'female' : 'male';
  } else {
    selectedMap = savedMap;
    if (CHARACTER_ROSTER.some(c => c.id === savedChar) && (isLocalTest || isCharUnlocked(CHARACTER_ROSTER.find(c => c.id === savedChar)))) {
      equippedCharId = savedChar;
    } else {
      equippedCharId = savedChar === 'female'
        ? (selectedMap === 'college' ? 'college-woman' : 'female')
        : (selectedMap === 'college' ? 'college-man' : 'male');
    }
  }
  character = (equippedCharId.includes('female') || equippedCharId.includes('woman')) ? 'female' : 'male';
  carouselIndex = Math.max(0, CHARACTER_ROSTER.findIndex(c => c.id === equippedCharId));
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

let graphicsQuality = 'auto';
try {
  const savedGfx = localStorage.getItem('runverse-gfx');
  if (['auto', 'low', 'med', 'high'].includes(savedGfx)) graphicsQuality = savedGfx;
} catch {}
const GFX_HINTS = {
  auto: 'Auto · Smooth 60 FPS for your phone',
  low: 'Low · Max 60 FPS for low-end phones',
  med: 'Medium · Balanced shadows & speed',
  high: 'High · Full detail for flagship devices'
};
function syncGraphicsUI() {
  document.querySelectorAll('[data-gfx]').forEach(btn => {
    const active = btn.dataset.gfx === graphicsQuality;
    btn.classList.toggle('selected', active);
    btn.setAttribute('aria-pressed', String(active));
  });
  if ($('gfx-quality-hint')) $('gfx-quality-hint').textContent = GFX_HINTS[graphicsQuality] || GFX_HINTS.auto;
}
syncGraphicsUI();
document.querySelectorAll('[data-gfx]').forEach(btn => {
  btn.onclick = () => {
    const next = btn.dataset.gfx;
    if (!['auto', 'low', 'med', 'high'].includes(next)) return;
    graphicsQuality = next;
    try { localStorage.setItem('runverse-gfx', graphicsQuality); } catch {}
    syncGraphicsUI();
    draw?.setGraphicsQuality?.(graphicsQuality);
  };
});

function ensureRenderer(targetCharKey = equippedCharId) {
  if (rendererStarted || draw) return;
  rendererStarted = true;
  try{
    draw=createRenderer(canvas, {
      initialModelKey: targetCharKey || initialModelKey,
      graphicsQuality,
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
    localStorage.setItem('runverse-college-dist-done',isDistGoalMet()?'1':'0');
    localStorage.setItem('runverse-college-coins-done',isCoinsGoalMet()?'1':'0');
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

function renderChecklistHtml() {
  const distMet = isDistGoalMet();
  const coinsMet = isCoinsGoalMet();
  const bestClamped = Math.min(COLLEGE_UNLOCK_DISTANCE, Math.floor(best));
  const distPct = distMet ? 100 : Math.min(100, Math.round((bestClamped / COLLEGE_UNLOCK_DISTANCE) * 100));
  const coinsClamped = Math.min(COLLEGE_UNLOCK_COINS, Math.floor(totalCoins));
  const coinsPct = coinsMet ? 100 : Math.min(100, Math.round((coinsClamped / COLLEGE_UNLOCK_COINS) * 100));
  return `
    <div class="unlock-goal ${distMet ? 'is-done' : ''}">
      <div class="unlock-goal-top">
        <span>${IC_RUN} 10,000m in 1 Play</span>
        <span class="unlock-goal-status">${distMet ? `${IC_CHECK} OPEN` : `${bestClamped.toLocaleString()} / 10,000m`}</span>
      </div>
      <div class="unlock-bar-track"><div class="unlock-bar-fill" style="width:${distPct}%"></div></div>
    </div>
    <div class="unlock-goal ${coinsMet ? 'is-done' : ''}">
      <div class="unlock-goal-top">
        <span>${IC_COIN} 20,000 Coins Bank</span>
        <span class="unlock-goal-status">${coinsMet ? `${IC_CHECK} OPEN` : `${coinsClamped.toLocaleString()} / 20,000`}</span>
      </div>
      <div class="unlock-bar-track"><div class="unlock-bar-fill" style="width:${coinsPct}%"></div></div>
    </div>
  `;
}

function pulseChecklist(el) {
  if (!el) return;
  el.classList.remove('is-shake');
  void el.offsetWidth;
  el.classList.add('is-shake');
}

function updateUnlockUI() {
  const unlocked = isCollegeUnlocked();
  const key = `${profile.xp}/${profile.collegeBest}/${profile.collegeCoins}:${Math.floor(best)}:${Math.floor(totalCoins)}:${unlocked ? 1 : 0}`;
  if (key === lastUnlockUiKey) return;
  lastUnlockUiKey = key;
  const level = playerLevel(profile.xp);
  const next = powers.find(power => power.level > level);
  if ($('player-progress')) {
    $('player-progress').textContent = 'Level ' + level + ' · ' + profile.xp + (level < 50 ? '/' + xpForLevel(level+1) : '') + ' XP' +
      (next ? ' · Next: ' + next.name + ' (Lv ' + next.level + ')' : ' · All powers open');
  }
  const park = document.querySelector('[data-map="itpark"]');
  const open = isLocalTest || parkOpen(profile);
  if (park) {
    park.classList.toggle('is-locked',!open);
    park.setAttribute('aria-disabled',String(!open));
  }
  if ($('park-goals')) $('park-goals').textContent = open ? 'Glass towers · Office shuttles' : 'College goals';
  if ($('park-badge')) $('park-badge').innerHTML = open ? IC_CHECK : IC_LOCK;
  if ($('park-distance')) $('park-distance').value = profile.collegeBest;
  if ($('park-coins')) $('park-coins').value = profile.collegeCoins;
  if ($('park-distance-value')) $('park-distance-value').textContent = Math.min(15000,profile.collegeBest).toLocaleString();
  if ($('park-coins-value')) $('park-coins-value').textContent = Math.min(40000,profile.collegeCoins).toLocaleString();
  const bankEl = $('hub-coin-bank');
  if (bankEl) {
    bankEl.innerHTML = unlocked
      ? `${IC_COIN} ${totalCoins.toLocaleString()} Coins · College Open`
      : `${IC_COIN} ${totalCoins.toLocaleString()} / 20,000`;
  }
  const collegeCard = document.querySelector('[data-map="college"]');
  if (collegeCard) {
    collegeCard.classList.toggle('is-locked', !unlocked);
    collegeCard.setAttribute('aria-disabled', String(!unlocked));
  }
  if ($('college-map-sub')) {
    $('college-map-sub').textContent = unlocked ? 'Winding hills · scooties & cars' : 'Complete 2 goals';
  }
  if ($('college-map-badge')) {
    $('college-map-badge').innerHTML = unlocked ? IC_CHECK : IC_LOCK;
  }
  const checklistHtml = renderChecklistHtml();
  if ($('map-unlock-checklist')) {
    $('map-unlock-checklist').innerHTML = checklistHtml;
    $('map-unlock-checklist').hidden = unlocked;
  }
  if ($('park-checklist')) {
    $('park-checklist').hidden = open;
  }
  if ($('char-unlock-checklist')) {
    $('char-unlock-checklist').innerHTML = checklistHtml;
    const entry = CHARACTER_ROSTER[carouselIndex] || CHARACTER_ROSTER[0];
    $('char-unlock-checklist').hidden = !entry.lockedByCollege || isCharUnlocked(entry);
  }
}

function syncMapHeaderUI() {
  document.querySelectorAll('[data-map]').forEach(button=>{
    const active=button.dataset.map===selectedMap;
    button.classList.toggle('selected',active);
    button.setAttribute('aria-pressed',String(active));
  });
  const school=selectedMap==='school', finalRun=selectedMap==='finalrun';
  if($('hub-map-name')) $('hub-map-name').textContent=selectedMap==='itpark'?'IT PARK':school?'SCHOOL CAMPUS':finalRun?'THE FINAL RUN':'COLLEGE CAMPUS';
  if($('hub-outfit-name')) $('hub-outfit-name').textContent=equippedCharId==='aged-elder'?'Village elder':(school||finalRun)?'School uniform':'Casual outfit';
  const loc = document.querySelector('.hud-top-bar .location');
  if(loc) loc.innerHTML=selectedMap==='itpark'?(IC_ITPARK+' IT PARK'):school?(IC_SCHOOL+' RUNVERSE SCHOOL'):finalRun?(IC_SCHOOL+' THE FINAL RUN'):(IC_COLLEGE+' RUNVERSE COLLEGE');
}

function updateCarouselUI() {
  const entry = CHARACTER_ROSTER[carouselIndex] || CHARACTER_ROSTER[0];
  const unlocked = isCharUnlocked(entry);
  const equipped = entry.id === equippedCharId;
  if ($('char-step-badge')) $('char-step-badge').textContent = `CHARACTER ${carouselIndex + 1} / ${CHARACTER_ROSTER.length}`;
  const lockPill = $('char-lock-pill');
  if (lockPill) {
    lockPill.classList.toggle('is-locked', !unlocked);
    lockPill.innerHTML = unlocked ? `${IC_CHECK} UNLOCKED` : `${IC_LOCK} LOCKED`;
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
    equipBtn.classList.remove('is-selected', 'is-locked');
    if (!unlocked) {
      equipBtn.classList.add('is-locked');
      equipBtn.innerHTML = `${IC_LOCK} LOCKED`;
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
  if (checklist) checklist.hidden = !entry.lockedByCollege || unlocked;
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
  if (!isLocalTest) {
    if (entry.map && selectedMap !== 'finalrun' && (selectedMap !== 'itpark' || entry.map === 'school')) selectedMap = entry.map;
  }
  s.map = selectedMap;
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
      pulseChecklist($('char-unlock-checklist'));
      effects.unlock?.();
      return;
    }
    selectUnlockedCharacter(entry.id);
  };
}

function selectMap(map, fromUser = false){
  if (map === 'itpark' && !(isLocalTest || parkOpen(profile))) { pulseChecklist($('park-checklist')); return; }
  if (map === 'college' && !isCollegeUnlocked()) {
    if (fromUser) {
      pulseChecklist($('map-unlock-checklist'));
      effects.unlock?.();
    }
    return;
  }
  selectedMap=map==='finalrun'?'finalrun':map==='itpark'?'itpark':map==='college'?'college':'school';
  if (!isLocalTest) {
    if (selectedMap === 'college' || selectedMap === 'itpark') {
      if (equippedCharId !== 'aged-elder' && !equippedCharId.startsWith('college-')) {
        equippedCharId = character === 'female' ? 'college-woman' : 'college-man';
      }
    } else {
      if (equippedCharId.startsWith('college-')) {
        equippedCharId = character === 'female' ? 'female' : 'male';
      }
    }
  }
  carouselIndex = Math.max(0, CHARACTER_ROSTER.findIndex(c => c.id === equippedCharId));
  activePreviewCharId = equippedCharId;
  syncMapHeaderUI();
  updateCarouselUI();
  updateMenuPreviewImages();
  if (fromUser) saveDeferred();
  else { s.map = selectedMap; save(); }
}
syncMapHeaderUI();
updateCarouselUI();
updateMenuPreviewImages();
document.querySelectorAll('[data-map]').forEach(button=>button.onclick=()=>{
  lastUserTapAt = performance.now();
  const targetMap = button.dataset.map;
  selectMap(targetMap, true);
  s.map = selectedMap;
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
      v.pause();
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

const UPGRADE_DEFS = [
  { id: 'magnet', icon: IC_MAGNET, name: 'Magnet Duration', values: [12, 15, 18, 21, 25], unit: 's', costs: [500, 1200, 2500, 5000] },
  { id: 'nitro', icon: IC_BOLT, name: 'Nitro Rush Boost', values: [4.5, 5.5, 6.5, 7.5, 9], unit: 's', costs: [600, 1400, 2800, 5500] },
  { id: 'shoes', icon: IC_JUMP, name: 'Super Jump Shoes', values: [9, 11, 13, 15, 18], unit: 's', costs: [500, 1200, 2400, 4800] },
  { id: 'coinBoost', icon: IC_COIN, name: 'End-of-Run Coin Bonus', values: [0, 15, 30, 50, 75], unit: '%', costs: [800, 1800, 3500, 7000] }
];
const REVIVE_COST = 250;
let upgrades = { magnet: 0, nitro: 0, shoes: 0, coinBoost: 0 };
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
      { id: 'near', label: 'Pull off 8 Close Calls today', target: 8, progress: 0, reward: 600, claimed: false }
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
function renderShopModal() {
  if ($('shop-coin-bank')) $('shop-coin-bank').innerHTML = `${IC_COIN} ${totalCoins.toLocaleString()} Coins`;
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
        if (!collegeCoinsDone && totalCoins >= COLLEGE_UNLOCK_COINS) collegeCoinsDone = true;
        save();
        saveMissionsAndUpgrades();
        effects.play('upgrade');
        updateUnlockUI();
        updateShopBadge();
        renderShopModal();
      };
    });
  }
  if (uList) {
    uList.hidden = activeShopTab !== 'upgrades';
    uList.innerHTML = UPGRADE_DEFS.filter(def => def.id === 'coinBoost').map(def => {
      const lv = upgrades[def.id] || 0;
      const required = powerById[def.id]?.level;
      if (required > playerLevel(profile.xp)) return '<div class="shop-item-row"><strong>'+def.name+'</strong><small>Unlock at Level '+required+'</small></div>';
      const maxed = lv >= def.values.length - 1;
      const cost = maxed ? 0 : def.costs[lv];
      const canBuy = !maxed && totalCoins >= cost;
      const curVal = def.values[lv], nextVal = maxed ? curVal : def.values[lv + 1];
      const pct = Math.round(((lv + 1) / def.values.length) * 100);
      return `<div class="shop-item-row"><div class="shop-item-meta"><strong>${def.icon} ${def.name} · Lv.${lv + 1}</strong><small>${maxed ? `MAX (${curVal}${def.unit})` : `${curVal}${def.unit} → ${nextVal}${def.unit}`}</small><div class="shop-bar-track"><div class="shop-bar-fill" style="width:${pct}%"></div></div></div><button type="button" class="shop-action-btn ${maxed ? 'is-done' : ''}" data-buy-upgrade="${def.id}" ${canBuy ? '' : 'disabled'}>${maxed ? 'MAXED' : `${cost.toLocaleString()} ${IC_COIN}`}</button></div>`;
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
        save();
        saveMissionsAndUpgrades();
        effects.play('upgrade');
        updateUnlockUI();
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
  };
}
if ($('btn-close-shop')) {
  $('btn-close-shop').onclick = () => {
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

async function shareReportCard(runDist, runCoins, grade, closeCalls) {
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
    ['CLOSE CALLS', `${closeCalls}`]
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

const powerControls = createPowerControls(() => s, index => usePower(s,index));
function refreshPowerSettings(){
  const el=$('settings-powers-current');if(!el)return;
  const ids=availablePowers(playerLevel(profile.xp));
  const cur=powerControls.current(ids);
  el.textContent=!ids.length?'First power unlocks at Level 10':cur.length?cur.map(id=>powerById[id]?.name||id).join(' + '):'Pick 2 on your first run';
  const btn=$('btn-change-powers');if(btn)btn.disabled=ids.length<=2;
}
if($('btn-change-powers'))$('btn-change-powers').onclick=()=>powerControls.edit(availablePowers(playerLevel(profile.xp)),refreshPowerSettings);
hubButtons.forEach(button=>button.addEventListener('click',()=>{if(button.dataset.hub==='settings')refreshPowerSettings();}));
refreshPowerSettings();
function defaultChosenPowers() {
  const ids = availablePowers(playerLevel(profile.xp));
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
let cutsceneWarmupFrames = 0;
let cutscenePrewarmedCharLoaded = false;

function prewarmFinalRunStage(targetMap, targetStage, targetCharId, chosen) {
  const powersToEquip = (chosen && chosen.length) ? chosen : (lastFinalRunChosenPowers.length ? lastFinalRunChosenPowers : defaultChosenPowers());
  lastFinalRunChosenPowers = powersToEquip;
  finalRunActiveCharId = targetCharId;
  character = 'male';
  // Lazily create WebGL renderer on first run, loading ONLY the active stage's hero & map behind the cutscene!
  ensureRenderer(targetCharId);
  draw?.preload?.(targetCharId);
  draw?.warmMapNow?.(targetMap);

  s = fresh();
  s.level = playerLevel(profile.xp);
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
  cutsceneWarmupFrames = 2;
  cutscenePrewarmedCharLoaded = Boolean(draw?.isLoaded?.(targetCharId));
}

function launchPrewarmedFinalRunStage(targetMap, targetStage, targetCharId, chosen) {
  if (!s?.isFinalRun || s.finalRunStage !== targetStage || s.map !== targetMap) {
    prewarmFinalRunStage(targetMap, targetStage, targetCharId, chosen);
  }
  // Defer next cutscene video buffering by 3s so Frame 1 of gameplay has 0 media demux contention
  const nextVidId = targetStage === 'village' ? 'college-intro-video'
    : targetStage === 'college' ? 'itrun-intro-video'
    : targetStage === 'itpark' ? 'grandfather-intro-video' : '';
  if (nextVidId) {
    setTimeout(() => {
      if (s?.isFinalRun && s.finalRunStage === targetStage && s.mode === 'running') {
        try { $(nextVidId)?.load?.(); } catch {}
      }
    }, 3000);
  }
  finalRunActiveCharId = targetCharId;
  character = 'male';
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
  lastFeverOn = false;
  if ($('fever-veil')) $('fever-veil').hidden = true;
  runReported = { dist: 0, coins: 0, nearMiss: 0, bonus: 0 };
  if ($('btn-revive')) $('btn-revive').hidden = true;
  if ($('btn-share-score')) $('btn-share-score').hidden = true;
  if (speedLinesEl) { speedLinesEl.hidden = true; speedLinesEl.classList.remove('is-nitro'); lastSpeedMode = 0; }
  setScreenMode('running');
  if ($('toast')) {
    $('toast').hidden = false;
    $('toast').textContent = targetStage === 'grandfather'
      ? `Grandfather’s village · Reach the temple at ${GRANDFATHER_GATE.toLocaleString()} m`
      : targetStage === 'itpark'
      ? `The Final Run · IT Park Stage · Reach ${FINALRUN_GATE.toLocaleString()}m`
      : targetStage === 'college'
        ? `The Final Run · College Stage · Reach ${FINALRUN_GATE.toLocaleString()}m`
        : `Village road · Reach the school at ${FINALRUN_GATE.toLocaleString()}m`;
  }
  effects.setEnabled(sound);
  effects.unlock();
  if (sound) effects.startBgm?.();
  effects.play('bell');
}

function stopCollegeIntroOverlay() {
  collegeIntroActive = false;
  cutsceneWarmupFrames = 0;
  if (collegeIntroTimer) { clearTimeout(collegeIntroTimer); collegeIntroTimer = 0; }
  if (collegeIntroRaf) { cancelAnimationFrame(collegeIntroRaf); collegeIntroRaf = 0; }
  const overlay = $('college-intro-overlay');
  const stage = $('college-countdown-stage');
  for (const id of ['college-intro-video', 'itrun-intro-video', 'grandfather-intro-video']) {
    const v = $(id);
    if (v) {
      v.onended = null;
      v.onerror = null;
      try { v.pause(); } catch {}
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
  cutsceneWarmupFrames = 0;

  effects.pauseBgm?.();
  if ($('overlay')) $('overlay').hidden = true;
  if ($('toast')) $('toast').hidden = true;
  if (closeCallEl) closeCallEl.hidden = true;
  if (speedLinesEl) { speedLinesEl.hidden = true; speedLinesEl.classList.remove('is-nitro'); lastSpeedMode = 0; }
  if ($('fever-veil')) { $('fever-veil').hidden = true; lastFeverOn = false; }

  for (const id of ['college-intro-video', 'itrun-intro-video', 'grandfather-intro-video']) {
    const v = $(id);
    if (v) {
      v.onended = null;
      v.onerror = null;
      try { v.pause(); } catch {}
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
    video.setAttribute('preload', 'auto');
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
  if ($('fever-veil')) { $('fever-veil').hidden = true; lastFeverOn = false; }

  const chosen = lastFinalRunChosenPowers.length ? lastFinalRunChosenPowers : defaultChosenPowers();

  if (!overlay || !video) {
    collegeIntroActive = false;
    if (!endToHub) launchPrewarmedFinalRunStage(targetMap, targetStage, targetCharId, chosen);
    return;
  }

  for (const id of ['college-intro-video', 'itrun-intro-video', 'grandfather-intro-video']) {
    const v = $(id);
    if (!v || v === video) continue;
    v.onended = null;
    v.onerror = null;
    try { v.pause(); } catch {}
    v.hidden = true;
    v.style.display = 'none';
  }
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

  // Pre-warm the upcoming 3D map, obstacles, shadow shaders & auto-selected character behind the black screen
  if (!endToHub && targetMap) {
    prewarmFinalRunStage(targetMap, targetStage, targetCharId, chosen);
  }

  let currentStep = '';
  let launched = false;
  let hasStartedFromBeginning = false;

  function showCountdownStep(stepLabel) {
    if (!withCountdown || currentStep === stepLabel || !stage || !textEl) return;
    currentStep = stepLabel;
    stage.hidden = false;
    const isStart = stepLabel === 'START';
    stage.classList.toggle('is-start', isStart);
    textEl.textContent = stepLabel;
    textEl.dataset.step = stepLabel;
    stage.classList.remove('is-pop');
    void stage.offsetWidth;
    stage.classList.add('is-pop');
    if (sound) {
      effects.play(isStart ? 'start' : 'tap');
    }
  }

  function finishTransitionAndLaunch() {
    if (launched || !collegeIntroActive) return;
    launched = true;
    if (collegeIntroRaf) { cancelAnimationFrame(collegeIntroRaf); collegeIntroRaf = 0; }
    if (collegeIntroTimer) { clearTimeout(collegeIntroTimer); collegeIntroTimer = 0; }
    video.onended = null;
    video.onerror = null;
    try { video.pause(); } catch {}
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
    showCountdownStep('START');
    launchPrewarmedFinalRunStage(targetMap, targetStage, targetCharId, chosen);
    collegeIntroTimer = setTimeout(() => {
      overlay.classList.add('is-fading-out');
      collegeIntroTimer = setTimeout(() => {
        stopCollegeIntroOverlay();
      }, 420);
    }, 380);
  }

  function monitorTransitionProgress() {
    if (!collegeIntroActive || launched) return;
    if (!endToHub && targetCharId && !cutscenePrewarmedCharLoaded && draw?.isLoaded?.(targetCharId)) {
      cutscenePrewarmedCharLoaded = true;
      cutsceneWarmupFrames = 1;
    }
    const dur = (Number.isFinite(video.duration) && video.duration > 3) ? video.duration : fallbackDuration;
    const cur = video.currentTime || 0;
    if (!hasStartedFromBeginning) {
      if (!video.paused && cur > 0.05 && cur < 2.5) {
        hasStartedFromBeginning = true;
      } else {
        collegeIntroRaf = requestAnimationFrame(monitorTransitionProgress);
        return;
      }
    }
    const rem = dur - cur;
    if (video.ended || (cur >= dur - 0.08 && dur > 3)) {
      finishTransitionAndLaunch();
      return;
    }
    if (withCountdown && cur >= Math.max(1.0, dur - 3.15)) {
      if (rem <= 1.05) showCountdownStep('1');
      else if (rem <= 2.05) showCountdownStep('2');
      else if (rem <= 3.05) showCountdownStep('3');
    }
    collegeIntroRaf = requestAnimationFrame(monitorTransitionProgress);
  }

  if (!video.getAttribute('src')) {
    video.setAttribute('src', videoSrc);
  }
  try {
    video.pause();
    if (video.readyState >= 1) video.currentTime = 0;
    else video.addEventListener('loadedmetadata', () => { try { video.currentTime = 0; } catch {} }, { once: true });
  } catch {}
  video.muted = !sound;
  video.defaultMuted = !sound;
  video.volume = 1.0;
  video.onended = () => {
    if (hasStartedFromBeginning) finishTransitionAndLaunch();
  };
  video.onerror = null;

  function attemptPlayVideo() {
    if (!collegeIntroActive || launched) return;
    try {
      if (video.currentTime > 1.5) video.currentTime = 0;
    } catch {}
    video.muted = !sound;
    video.defaultMuted = !sound;
    video.volume = 1.0;
    const p = video.play();
    if (p && typeof p.catch === 'function') {
      p.catch(() => {
        if (!collegeIntroActive || launched) return;
        video.muted = true;
        const p2 = video.play();
        if (p2 && typeof p2.catch === 'function') {
          p2.catch(() => {
            // If still buffering, wait for canplay instead of cutting off the video
            video.addEventListener('canplay', () => {
              if (collegeIntroActive && !launched) video.play().catch(() => {});
            }, { once: true });
          });
        }
      });
    }
  }

  // Phase 2: Play cutscene video fullscreen after the screen turn-off blackout
  collegeIntroTimer = setTimeout(() => {
    if (!collegeIntroActive) return;
    overlay.classList.remove('is-screen-off');
    overlay.classList.add('is-playing-video');
    if (video.readyState >= 2) {
      attemptPlayVideo();
    } else {
      video.addEventListener('canplay', attemptPlayVideo, { once: true });
      attemptPlayVideo();
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
  cutsceneWarmupFrames = 0;
  if (finalIntroRaf) { cancelAnimationFrame(finalIntroRaf); finalIntroRaf = 0; }
  if (finalIntroHideTimer) { clearTimeout(finalIntroHideTimer); finalIntroHideTimer = 0; }
  const overlay = $('finalrun-intro-overlay');
  const video = $('finalrun-intro-video');
  const stage = $('finalrun-countdown-stage');
  if (video) {
    try { video.pause(); } catch {}
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
    launchPrewarmedFinalRunStage('finalrun', 'village', 'male', chosen);
    return;
  }
  if (finalIntroRaf) { cancelAnimationFrame(finalIntroRaf); finalIntroRaf = 0; }
  if (finalIntroHideTimer) { clearTimeout(finalIntroHideTimer); finalIntroHideTimer = 0; }
  finalIntroActive = true;

  effects.pauseBgm?.();
  if (sound) effects.unlock?.();

  overlay.hidden = false;
  overlay.classList.remove('is-fading-out');
  if (stage) {
    stage.hidden = true;
    stage.classList.remove('is-pop', 'is-start');
  }

  // Stage 1 of The Final One: Auto-select 1st School Boy with Hat ('male') & pre-warm 3D village + obstacles + shadow shaders immediately
  prewarmFinalRunStage('finalrun', 'village', 'male', chosen);

  let currentStep = '';
  let launched = false;

  function showCountdownStep(stepLabel) {
    if (currentStep === stepLabel || !stage || !textEl) return;
    currentStep = stepLabel;
    stage.hidden = false;
    const isStart = stepLabel === 'START';
    stage.classList.toggle('is-start', isStart);
    textEl.textContent = stepLabel;
    textEl.dataset.step = stepLabel;
    stage.classList.remove('is-pop');
    void stage.offsetWidth;
    stage.classList.add('is-pop');
    if (sound) {
      effects.play(isStart ? 'start' : 'tap');
    }
  }

  function finishIntroAndLaunch() {
    if (launched || !finalIntroActive) return;
    launched = true;
    if (finalIntroRaf) { cancelAnimationFrame(finalIntroRaf); finalIntroRaf = 0; }
    try { video.pause(); } catch {}
    showCountdownStep('START');
    launchPrewarmedFinalRunStage('finalrun', 'village', 'male', chosen);
    finalIntroHideTimer = setTimeout(() => {
      overlay.classList.add('is-fading-out');
      finalIntroHideTimer = setTimeout(() => {
        stopFinalRunIntroOverlay();
      }, 420);
    }, 380);
  }

  function monitorProgress() {
    if (!finalIntroActive || launched) return;
    if (!cutscenePrewarmedCharLoaded && draw?.isLoaded?.('male')) {
      cutscenePrewarmedCharLoaded = true;
      cutsceneWarmupFrames = 1;
    }
    const dur = (Number.isFinite(video.duration) && video.duration > 3) ? video.duration : 14.93;
    const cur = video.currentTime || 0;
    const rem = dur - cur;
    if (video.ended || (cur > 1 && rem <= 0.08)) {
      finishIntroAndLaunch();
      return;
    }
    if (cur > 0.5) {
      if (rem <= 1.05) showCountdownStep('1');
      else if (rem <= 2.05) showCountdownStep('2');
      else if (rem <= 3.05) showCountdownStep('3');
    }
    finalIntroRaf = requestAnimationFrame(monitorProgress);
  }

  video.onended = finishIntroAndLaunch;
  video.onerror = finishIntroAndLaunch;

  if (!video.getAttribute('src')) {
    video.setAttribute('src', 'assets/videos/final_one_intro.mp4');
  }
  try { video.currentTime = 0; } catch {}
  video.muted = !sound;
  video.defaultMuted = !sound;
  video.volume = 1.0;

  const p = video.play();
  if (p && typeof p.catch === 'function') {
    p.catch(() => {
      video.muted = true;
      const p2 = video.play();
      if (p2 && typeof p2.catch === 'function') {
        p2.catch(() => finishIntroAndLaunch());
      }
    });
  }
  finalIntroRaf = requestAnimationFrame(monitorProgress);
}

function start(){
  if (selectedMap === 'finalrun') {
    playFinalRunIntro(defaultChosenPowers());
    return;
  }
  powerControls.choose(availablePowers(playerLevel(profile.xp)),beginRun);
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
function beginRun(chosen){
  if (!isCollegeUnlocked() && selectedMap !== 'finalrun') {
    selectedMap = 'school';
    if (equippedCharId !== 'aged-elder') equippedCharId = character === 'female' ? 'female' : 'male';
    carouselIndex = Math.max(0, CHARACTER_ROSTER.findIndex(c => c.id === equippedCharId));
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
  setTimeout(() => {
    if (launchId !== runLaunchNonce) return;
    $('start')?.classList.remove('is-launching');
    $('select-screen')?.classList.remove('is-launching-run');
    startBtnLaunching = false;
    setScreenMode('running');

    // Chunk 1: initialize WebGL renderer & kick off ONLY the chosen hero GLB download.
    ensureRenderer(targetCharId);
    draw?.preload?.(targetCharId);
    setRunLoadingProgress(32, 'Loading track & campus...');

    const pendingSteps = draw?.warmMapSteps ? draw.warmMapSteps(targetMap) : [];
    const totalSteps = Math.max(1, pendingSteps.length);
    let doneSteps = 0;
    const stepLabels = {
      base: 'Warming core shaders...',
      'school:campus': 'Building school campus...',
      'school:props': 'Loading obstacles & buses...',
      'college:campus': 'Building college hills...',
      'college:props': 'Loading college vehicles...',
      'itpark:campus': 'Building IT Park towers...',
      'itpark:events': 'Preparing Glass Bridge & metro...',
      'itpark:props': 'Loading supercars & tech props...',
      'finalrun:village': 'Building village trail...'
    };

    const runNextWarmChunk = () => {
      if (launchId !== runLaunchNonce) return;
      const stepId = draw?.warmMapStep ? draw.warmMapStep(targetMap) : null;
      if (stepId) {
        doneSteps++;
        const pct = 34 + (doneSteps / totalSteps) * 52;
        setRunLoadingProgress(pct, stepLabels[stepId] || 'Preparing track...');
        // Yield 24ms between chunks so the spinner & progress bar stay silky-smooth with ZERO struck feel!
        setTimeout(runNextWarmChunk, 24);
        return;
      }

      // All map chunks warmed -> prepare fresh run state & wait for the 1 chosen hero GLB.
      setRunLoadingProgress(90, 'Getting runner ready...');
      s = fresh();
      s.level = playerLevel(profile.xp);
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

      const startedAt = performance.now();
      const finishLaunch = () => {
        if (launchId !== runLaunchNonce) return;
        setRunLoadingProgress(100, 'Ready — Let’s Run!');
        // Render 2 warm frames behind the veil so Frame 1 after fade-out has ZERO hitch!
        try {
          draw?.(s, targetCharId, 0.016);
          draw?.(s, targetCharId, 0.016);
        } catch {}
        s.distance = 0;
        s.time = 0;
        prev = 0;
        lastNearMissShown = 0;
        lastEventBannerShown = 0;
        lastLmskMask = -1;
        lastFeverOn = false;
        if ($('fever-veil')) $('fever-veil').hidden = true;
        runReported = { dist: 0, coins: 0, nearMiss: 0, bonus: 0 };
        if ($('btn-revive')) $('btn-revive').hidden = true;
        if ($('btn-share-score')) $('btn-share-score').hidden = true;
        if (speedLinesEl) { speedLinesEl.hidden = true; speedLinesEl.classList.remove('is-nitro'); lastSpeedMode = 0; }
        $('toast').textContent = targetMap === 'finalrun' ? `Village road · Reach the school at ${FINALRUN_GATE.toLocaleString()}m` : targetMap === 'itpark' ? 'IT Park · Follow the shuttle roof ramp' : targetMap === 'college' ? 'College rush · Find the next roof ramp' : 'School rush · Find the next roof ramp';
        runLoadingActive = false;
        hideRunLoadingVeilSmooth();
        if (sound) effects.startBgm?.();
        if (targetMap !== 'finalrun') effects.play('swag');
        effects.play('bell');
      };

      const waitReady = () => {
        if (launchId !== runLaunchNonce) return;
        const loaded = usingLiteRenderer || !draw?.isLoaded || draw.isLoaded(targetCharId);
        if (loaded || (performance.now() - startedAt) > 2200) {
          requestAnimationFrame(finishLaunch);
        } else {
          setTimeout(waitReady, 35);
        }
      };
      waitReady();
    };

    setTimeout(runNextWarmChunk, 24);
  }, 150);
}

function pause(){
  if(!['running','countdown'].includes(s.mode))return;
  s.mode='paused';
  flushSave();
  $('countdown').hidden=true;
  if($('report-grade')) $('report-grade').hidden = true;
  if($('report-records')) $('report-records').hidden = true;
  if($('report-challenge-banner')) $('report-challenge-banner').hidden = true;
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
  if (isCollegeStage) profile.collegeBest = Math.max(profile.collegeBest, runDist);
  const deltaDist = Math.max(0, runDist - runReported.dist);
  const deltaCoins = Math.max(0, s.coins - runReported.coins);
  const deltaNear = Math.max(0, (s.nearMissCount || 0) - runReported.nearMiss);
  const coinBoostPct = UPGRADE_DEFS[3].values[upgrades.coinBoost] || 0;
  const deltaBonus = coinBoostPct > 0 ? Math.round(deltaCoins * (coinBoostPct / 100)) : 0;
  if (deltaBonus > 0) totalCoins += deltaBonus;
  const bonusCoins = runReported.bonus + deltaBonus;
  runReported = { dist: runDist, coins: s.coins, nearMiss: s.nearMissCount || 0, bonus: bonusCoins };
  best = Math.max(best, runDist);
  if (runDist >= COLLEGE_UNLOCK_DISTANCE) collegeDistDone = true;
  if (totalCoins >= COLLEGE_UNLOCK_COINS) collegeCoinsDone = true;
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
  if (s.map !== 'grandfather' && (s.map === 'finalrun' || s.isFinalRun) && (completed || s.distance >= FINALRUN_GATE)) {
    completeFinalRun();
    return;
  }
  if (s.map === 'college') profile.collegeBest = Math.max(profile.collegeBest,Math.floor(s.distance));
  const previousBest = best;
  const runDist = Math.floor(s.distance);
  const deltaDist = Math.max(0, runDist - runReported.dist);
  const deltaCoins = Math.max(0, s.coins - runReported.coins);
  const deltaNear = Math.max(0, (s.nearMissCount || 0) - runReported.nearMiss);
  const coinBoostPct = UPGRADE_DEFS[3].values[upgrades.coinBoost] || 0;
  const deltaBonus = coinBoostPct > 0 ? Math.round(deltaCoins * (coinBoostPct / 100)) : 0;
  if (deltaBonus > 0) totalCoins += deltaBonus;
  const bonusCoins = runReported.bonus + deltaBonus;
  runReported = { dist: runDist, coins: s.coins, nearMiss: s.nearMissCount || 0, bonus: bonusCoins };
  best=Math.max(best, runDist);
  if (runDist >= COLLEGE_UNLOCK_DISTANCE) collegeDistDone = true;
  if (totalCoins >= COLLEGE_UNLOCK_COINS) collegeCoinsDone = true;
  save();
  recordRunMissions(deltaDist, deltaCoins + deltaBonus, deltaNear);
  if (speedLinesEl) { speedLinesEl.hidden = true; speedLinesEl.classList.remove('is-nitro'); lastSpeedMode = 0; }
  if ($('fever-veil')) { $('fever-veil').hidden = true; lastFeverOn = false; }
  effects.play(completed?'bell':'over');
  setScreenMode('gameover');
  const isCol = s.map === 'college' || selectedMap === 'college';
  const isFinalRun = Boolean(s.isFinalRun || s.map === 'finalrun' || selectedMap === 'finalrun');
  const hint={
    sideVehicle:isCol?'Watch the campus side roads for scooties & cars!':'Watch the side entrance. Move into the clear lane.',
    bus:isCol?'Dodge oncoming college cars & scooties on the curve!':'Dodge the oncoming bus. Change lanes before headlights reach you.',
    van:'Take a striped ramp, or use the clear ground lane.',
    block:isCol?'Dodge the vending machines, notice boards & parked scooties.':'Change lanes to dodge the tall crates.',
    jump:isCol?'Jump over the library book carts, canteen tables & barriers.':'Jump over the school benches and hurdles.',
    slide:isCol?'Slide under the College Fest banner & solar arches.':'Slide under the teal overhead beams.'
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
    ? completed ? `Temple reached · ${runDist.toLocaleString()} m · ${s.coins} coins` : `Village trail · ${runDist} m · ${s.cause==='slide'?'Slide under the hanging cloth.':s.cause==='jump'?'Jump over the wooden obstacles.':'Follow the coins through the clearing.'}`
    : isFinalRun
    ? hint
    : completed
      ? '10,000 m · Village road complete · '+(s.coins+bonusCoins)+' coins'+(bonusCoins?' (+'+bonusCoins+' bonus)':'')+(s.nearMissCount?' · '+s.nearMissCount+' close calls':'')+'.'
      : runDist+' m | '+(s.coins+bonusCoins)+' coins'+(bonusCoins?' (+'+bonusCoins+' bonus)':'')+(s.nearMissCount?' · '+s.nearMissCount+' close calls':'')+'. '+hint;
  show(
    elderFinale&&completed?'THE FINAL RUN COMPLETE':isFinalRun?'THE FINAL RUN':completed?'SCHOOL REACHED!':'ACADEMIC REPORT CARD',
    resultMessage,
    'RUN AGAIN',
    elderFinale?'GRANDFATHER’S VILLAGE':isFinalRun?'VILLAGE ROAD':completed?'MAP COMPLETE':'REPORT CARD'
  );
  if ($('btn-revive')) {
    const canRevive = !completed && !s.revivedOnce && totalCoins >= REVIVE_COST;
    $('btn-revive').hidden = !canRevive;
  }
  if ($('btn-share-score')) {
    $('btn-share-score').hidden = isFinalRun;
    $('btn-share-score').onclick = () => shareReportCard(runDist, s.coins + bonusCoins, grade, s.nearMissCount || 0);
  }
  $('tip').textContent = elderFinale ? (completed?'All four stages complete.':`Reach the village temple at ${GRANDFATHER_GATE.toLocaleString()} m.`) : isFinalRun
    ? `Reach ${FINALRUN_GATE.toLocaleString()}m on the village road to complete The Final Run.`
    : `Coins: ${s.coins + bonusCoins} | Bank: ${totalCoins.toLocaleString()} | Grade: ${grade}`;
}

if ($('btn-revive')) {
  $('btn-revive').onclick = () => {
    if (s.revivedOnce || totalCoins < REVIVE_COST) return;
    totalCoins -= REVIVE_COST;
    save();
    updateUnlockUI();
    $('overlay').hidden = true;
    $('btn-revive').hidden = true;
    if ($('btn-share-score')) $('btn-share-score').hidden = true;
    reviveRun(s);
    setScreenMode('running');
    effects.play('shield');
    showCloseCallBanner('SHIELD ACTIVE!', true);
  };
}

if($('start')) $('start').onclick=e=>{
  e?.preventDefault?.();
  if($('start').dataset.loadError==='true'){ location.reload(); return; }
  if (runLoadingActive || startBtnLaunching) return;
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
  // After crash → go back to character select screen (LET'S RUN page)
  finalRunActiveCharId = '';
  s=fresh();
  s.map=selectedMap;
  s.mode='ready';
  $('overlay').hidden=true;
  if($('report-grade')) $('report-grade').hidden=true;
  if($('report-records')) $('report-records').hidden=true;
  if($('report-challenge-banner')) $('report-challenge-banner').hidden=true;
  if($('selection')) $('selection').hidden=false;
  syncMapHeaderUI();
  updateCarouselUI();
  setScreenMode('select');
  showHub('home');
};
if($('restart')) $('restart').onclick=start;
if($('btn-change-char')) $('btn-change-char').onclick=()=>{
  const wasPaused = s.mode === 'paused';
  finalRunActiveCharId = '';
  s=fresh();
  s.map=selectedMap;
  s.mode='ready';
  $('overlay').hidden=true;
  if($('report-grade')) $('report-grade').hidden=true;
  if($('report-records')) $('report-records').hidden=true;
  if($('report-challenge-banner')) $('report-challenge-banner').hidden=true;
  if($('selection')) $('selection').hidden=false;
  syncMapHeaderUI();
  updateCarouselUI();
  setScreenMode('select');
  showHub(wasPaused ? 'home' : 'characters');
};
$('pause').onclick=()=>s.mode==='paused'?resume():pause();

function input(a){
  const before=[s.jump,s.slide,s.roll,s.drop,s.lane];
  action(s,a);
  if(s.mode==='running'&&(s.jump!==before[0]||s.slide!==before[1]||s.roll!==before[2]||s.drop!==before[3]||s.lane!==before[4]))
    effects.play(a==='jump'?'jump':a==='slide'?'slide':'lane');
}

document.querySelectorAll('[data-action]').forEach(b=>b.addEventListener('pointerdown',e=>{
  e.preventDefault();
  input(b.dataset.action);
}));

window.addEventListener('keydown',e=>{
  if ($('power-picker')?.open) return;
  if(e.target?.closest?.('input, textarea, select')) return;
  if(s.mode!=='running'&&e.target?.closest?.('button')&&(e.key===' '||e.key==='Enter'))return;
  if(s.mode!=='running' && game.classList.contains('mode-select') && game.classList.contains('hub-characters')) {
    if(e.key==='ArrowLeft'){ e.preventDefault(); moveCarousel(-1); return; }
    if(e.key==='ArrowRight'){ e.preventDefault(); moveCarousel(1); return; }
  }
  const a={ArrowLeft:'left',a:'left',ArrowRight:'right',d:'right',ArrowUp:'jump',w:'jump',' ':'jump',ArrowDown:'slide',s:'slide'}[e.key];
  if(a){e.preventDefault();if(!e.repeat)input(a);}
  if(e.key==='Escape'||e.key==='p'){s.mode==='paused'?resume():pause();}
});

document.addEventListener('visibilitychange',()=>{
  if(document.hidden){
    pause();
    effects.pauseBgm?.();
  } else if(sound && !game.classList.contains('mode-splash') && !finalIntroActive && !collegeIntroActive) {
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
  if (runLoadingActive) return;
  if (finalIntroActive || collegeIntroActive) {
    if (draw && cutsceneWarmupFrames > 0) {
      cutsceneWarmupFrames--;
      try { draw(s, finalRunActiveCharId || equippedCharId, 0.016); } catch {}
    }
    return;
  }
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

  step(s, dt);
  const finishGate=s.map==='grandfather'?GRANDFATHER_GATE:(s.map==='finalrun'||s.isFinalRun)?FINALRUN_GATE:Infinity;
  if(old==='running'&&s.mode==='running'&&distanceBefore<finishGate&&s.distance>=finishGate){
    s.distance=finishGate;
    s.speed=0;
    s.mode='finished';
  }
  powerControls.update();
  try { effects.update(s, character); } catch (err) { if (!loopErrorLogged) { loopErrorLogged = true; console.error('Sound update error:', err); } }
  
  if(old==='running' && s.mode==='falling') {
    effects.play('hit', s.cause, character);
    game.classList.remove('impact-flash');
    void game.offsetWidth;
    game.classList.add('impact-flash');
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

  const metresXP = Math.floor(s.distance / 100) - Math.floor(distanceBefore / 100);
  const earnedCoins = Math.max(0,s.coins - coinsBefore);
  if (metresXP > 0 || earnedCoins || (s.map === 'college' && profile.collegeBest < 15000 && s.distance >= 15000)) {
    profile.xp += Math.max(0,metresXP) + earnedCoins;
    if (s.map === 'college') {
      profile.collegeBest = Math.max(profile.collegeBest,Math.floor(s.distance));
      profile.collegeCoins += earnedCoins;
    }
    const level = playerLevel(profile.xp);
    if (level > s.level) showCloseCallBanner('LEVEL ' + level,true);
    s.level = level;
    if (!earnedCoins) save();
  }
  if (s.coins > coinsBefore) {
    const gained = s.coins - coinsBefore;
    const wasUnlocked = isCollegeUnlocked();
    totalCoins += gained;
    if (!collegeCoinsDone && totalCoins >= COLLEGE_UNLOCK_COINS) {
      collegeCoinsDone = true;
      effects.play('bell');
      $('toast').textContent = isCollegeUnlocked()
        ? '20,000 COINS SAVED · COLLEGE CAMPUS & CHARACTERS UNLOCKED!'
        : 'Goal 2 Complete: 20,000 Coins Saved! Reach 10,000m in 1 run to unlock College!';
    }
    save();
    if (!wasUnlocked && isCollegeUnlocked()) updateUnlockUI();
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
  if (s.nearMissEvent && s.nearMissEvent.id !== lastNearMissShown) {
    lastNearMissShown = s.nearMissEvent.id;
    const ev = s.nearMissEvent;
    effects.play('nearMiss');
    showCloseCallBanner(`${ev.label} +${ev.bonus} Coins · x${ev.combo}`, ev.label.includes('NITRO'));
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
  if (s.isFinalRun && distanceBefore < 250 && s.distance >= 250) {
    if (s.finalRunStage === 'village') draw?.preload?.('college-male');
    else if (s.finalRunStage === 'college') draw?.preload?.('college-man');
    else if (s.finalRunStage === 'itpark') draw?.preload?.('aged-elder');
  }
  for (const m of [100, 250, 500]) {
    if (distanceBefore < m && s.distance >= m) {
      effects.play('bell');
      $('toast').textContent = `School Bell Rang at ${m}m! Keep Rushing!`;
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
    if (!collegeDistDone) {
      collegeDistDone = true;
      save();
      if (isCollegeUnlocked()) updateUnlockUI();
    }
    effects.play('bell');
    $('toast').textContent = isCollegeUnlocked()
      ? '10,000m REACHED · COLLEGE CAMPUS & CHARACTERS UNLOCKED!'
      : '10,000m · 10k Goal Open! Collect 20,000 Coins to unlock College!';
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
  const nitroPill = $('nitro-pill');
  if (nitroPill && nitroSec !== lastNitroSec) {
    lastNitroSec = nitroSec;
    nitroPill.hidden = nitroSec <= 0;
    if (nitroSec > 0 && $('nitro-timer')) $('nitro-timer').textContent = nitroSec + 's';
  }
  const shoesSec = s.shoes > 0 ? Math.ceil(s.shoes) : 0;
  const shoesPill = $('shoes-pill');
  if (shoesPill && shoesSec !== lastShoesSec) {
    lastShoesSec = shoesSec;
    shoesPill.hidden = shoesSec <= 0;
    if (shoesSec > 0 && $('shoes-timer')) $('shoes-timer').textContent = shoesSec + 's';
  }
  const curCombo = (s.mode === 'running' && s.combo > 1 && s.comboTimer > 0) ? s.combo : 1;
  const comboPill = $('combo-pill');
  if (comboPill && curCombo !== lastComboVal) {
    lastComboVal = curCombo;
    comboPill.hidden = curCombo <= 1;
    if (curCombo > 1 && $('combo-val')) $('combo-val').textContent = 'x' + curCombo;
  }
  const speedMode = s.mode !== 'running' ? 0 : (s.nitro > 0 || s.turboBoost > 0 || s.feverTimer > 0) ? 2 : s.speed >= 42 ? 1 : 0;
  if (speedLinesEl && speedMode !== lastSpeedMode) {
    lastSpeedMode = speedMode;
    speedLinesEl.hidden = speedMode === 0;
    speedLinesEl.classList.toggle('is-nitro', speedMode === 2);
  }
  const feverOn = s.mode === 'running' && s.feverTimer > 0;
  if (feverOn !== lastFeverOn) {
    lastFeverOn = feverOn;
    if ($('fever-veil')) $('fever-veil').hidden = !feverOn;
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
  const staticOverlayOpen = s.mode === 'ready' && ((currentHub === 'settings') || (nameModalEl && !nameModalEl.hidden) || (shopModalEl && !shopModalEl.hidden));
  if (staticOverlayOpen && assetsReady && warmedFirstFrame) {
    if (!menuNeedsFrame) return;
    menuNeedsFrame = false;
  }
  if (s.mode === 'ready') {
    s.time = (s.time || 0) + (dt || 0.016);
    s.previewRain = (s.map === 'college');
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
    status = draw(s, renderCharId, dt);
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
