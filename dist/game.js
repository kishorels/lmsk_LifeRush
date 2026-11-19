import {createSound} from './sound.js?v=2.9.2';
import {CAPTURE_GESTURE_START,SWEEP_SECONDS,fresh,action,step,height,isCapture,SCHOOL_GATE} from './engine.js?v=2.9.2';
import {createRenderer} from './renderer3d.js?v=2.9.2';
import {createLiteRenderer} from './renderer-lite.js?v=2.9.2';

const $=id=>document.getElementById(id);
let canvas=$('world');
// Remove controls from a cached older HTML shell as well.
document.querySelectorAll('#btn-swag,.btn-swag-action,.select-guide-text').forEach(element=>element.remove());
let assetsReady = false;
let introFinished = false;
let boyFraction = 0, chaserFraction = 0;

function updateAssetProgress(type, fraction) {
  if (type === 'boy') boyFraction = Math.max(boyFraction, fraction);
  if (type === 'chaser') chaserFraction = Math.max(chaserFraction, fraction);
}

function activateEnterButton() {
  if (introFinished) return;
  introFinished = true;
  const wrap = $('splash-enter-wrap');
  const btn = $('btn-enter');
  const btnTxt = $('btn-enter-text');
  const arrow = $('btn-enter-arrow');

  if (wrap) wrap.hidden = false;
  if (btn) {
    btn.disabled = false;
    btn.classList.remove('loading');
    btn.classList.add('ready');
  }
  if (btnTxt) btnTxt.textContent = 'Enter LifeRush';
  if (arrow) arrow.hidden = false;
}

function setupIntroVideo() {
  const video = $('intro-video');
  if (!video) {
    activateEnterButton();
    return;
  }

  function freezeAtEnd() {
    if (introFinished) return;
    try {
      if (Number.isFinite(video.duration) && video.duration > 0.2) {
        video.currentTime = Math.max(0, video.duration - 0.05);
      }
      video.pause();
    } catch {}
    activateEnterButton();
  }

  video.addEventListener('timeupdate', () => {
    if (Number.isFinite(video.duration) && video.duration > 0.5 && video.currentTime >= video.duration - 0.08) {
      freezeAtEnd();
    }
  });
  video.addEventListener('ended', freezeAtEnd);
  video.addEventListener('error', () => activateEnterButton());

  const playPromise = video.play();
  if (playPromise && typeof playPromise.catch === 'function') {
    playPromise.catch(() => {
      video.muted = true;
      video.play().catch(() => activateEnterButton());
    });
  }
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
  { id: 'female', name: 'SCHOOL GIRL', outfit: 'School Uniform · School Campus', map: 'school', gender: 'female', lockedByCollege: false },
  { id: 'college-male', name: 'COLLEGE BOY', outfit: 'Casual Outfit · College Campus', map: 'college', gender: 'male', lockedByCollege: true },
  { id: 'college-woman', name: 'COLLEGE WOMAN', outfit: 'Blue Style · College Campus', map: 'college', gender: 'female', lockedByCollege: true },
  { id: 'college-man', name: 'COLLEGE MAN', outfit: 'Jacket Style · College Campus', map: 'college', gender: 'male', lockedByCollege: true }
];

const game = canvas.closest('.game');
let s=fresh(),best=0,totalCoins=0,collegeDistDone=false,collegeCoinsDone=false,
    equippedCharId='male',character='male',selectedMap='school',carouselIndex=0,currentHub='home',
    sound=true,prev=0,w=600,h=700;

const isDistGoalMet = () => collegeDistDone || best >= COLLEGE_UNLOCK_DISTANCE;
const isCoinsGoalMet = () => collegeCoinsDone || totalCoins >= COLLEGE_UNLOCK_COINS;
const isCollegeUnlocked = () => isDistGoalMet() && isCoinsGoalMet();
const isCharUnlocked = entry => !entry?.lockedByCollege || isCollegeUnlocked();

try{
  best=Number(localStorage.getItem('runverse-best'))||0;
  totalCoins=Math.max(0,Math.floor(Number(localStorage.getItem('runverse-total-coins'))||0));
  collegeDistDone=localStorage.getItem('runverse-college-dist-done')==='1' || best >= COLLEGE_UNLOCK_DISTANCE;
  collegeCoinsDone=localStorage.getItem('runverse-college-coins-done')==='1' || totalCoins >= COLLEGE_UNLOCK_COINS;
  const savedChar=localStorage.getItem('runverse-character')||'male';
  const savedMap=localStorage.getItem('runverse-map')==='college'?'college':'school';
  if (!isCollegeUnlocked()) {
    selectedMap = 'school';
    equippedCharId = (savedChar === 'female' || savedChar === 'college-woman') ? 'female' : 'male';
  } else {
    selectedMap = savedMap;
    if (CHARACTER_ROSTER.some(c => c.id === savedChar)) {
      equippedCharId = savedChar;
    } else {
      equippedCharId = savedChar === 'female'
        ? (selectedMap === 'college' ? 'college-woman' : 'female')
        : (selectedMap === 'college' ? 'college-male' : 'male');
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
    if(s.mode==='ready'||s.mode==='select') triggerSwag();
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

try{
  draw=createRenderer(canvas, {
    initialModelKey,
    onBoyProgress: f => updateAssetProgress('boy', f),
    onChaserProgress: f => updateAssetProgress('chaser', f)
  });
}catch(error){
  switchToLiteRenderer(error?.message || error);
}

const save=()=>{
  try{
    localStorage.setItem('runverse-best',best);
    localStorage.setItem('runverse-total-coins',totalCoins);
    localStorage.setItem('runverse-college-dist-done',isDistGoalMet()?'1':'0');
    localStorage.setItem('runverse-college-coins-done',isCoinsGoalMet()?'1':'0');
    localStorage.setItem('runverse-character',equippedCharId);
    localStorage.setItem('runverse-map',selectedMap);
  }catch{}
};

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
  $('sound').textContent=sound?'♪ ON':'♪ OFF';
  $('sound').setAttribute('aria-label',sound?'Mute sound':'Enable sound');
}
soundButton();
$('sound').onclick=()=>{
  sound=!sound;
  soundButton();
  try{localStorage.setItem('runverse-sound',sound?'on':'off');}catch{}
  if(sound){
    effects.startBgm?.();
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
        <span>🏃 10,000m in 1 Play</span>
        <span class="unlock-goal-status">${distMet ? '✅ OPEN!' : `${bestClamped.toLocaleString()} / 10,000m`}</span>
      </div>
      <div class="unlock-bar-track"><div class="unlock-bar-fill" style="width:${distPct}%"></div></div>
    </div>
    <div class="unlock-goal ${coinsMet ? 'is-done' : ''}">
      <div class="unlock-goal-top">
        <span>🪙 20,000 Coins Bank</span>
        <span class="unlock-goal-status">${coinsMet ? '✅ OPEN!' : `${coinsClamped.toLocaleString()} / 20,000`}</span>
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
  const bankEl = $('hub-coin-bank');
  if (bankEl) {
    bankEl.textContent = unlocked
      ? `🪙 ${totalCoins.toLocaleString()} Coins · ★ College Open`
      : `🪙 ${totalCoins.toLocaleString()} / 20,000`;
  }
  const collegeCard = document.querySelector('[data-map="college"]');
  if (collegeCard) {
    collegeCard.classList.toggle('is-locked', !unlocked);
    collegeCard.setAttribute('aria-disabled', String(!unlocked));
  }
  if ($('college-map-sub')) {
    $('college-map-sub').textContent = unlocked ? 'Winding hills · scooties & cars' : '🔒 Complete 2 goals';
  }
  if ($('college-map-badge')) {
    $('college-map-badge').textContent = unlocked ? '✓' : '🔒';
  }
  const checklistHtml = renderChecklistHtml();
  if ($('map-unlock-checklist')) $('map-unlock-checklist').innerHTML = checklistHtml;
  if ($('char-unlock-checklist')) $('char-unlock-checklist').innerHTML = checklistHtml;
}

function syncMapHeaderUI() {
  document.querySelectorAll('[data-map]').forEach(button=>{
    const active=button.dataset.map===selectedMap;
    button.classList.toggle('selected',active);
    button.setAttribute('aria-pressed',String(active));
  });
  const school=selectedMap==='school';
  if($('hub-map-name')) $('hub-map-name').textContent=school?'SCHOOL CAMPUS':'COLLEGE CAMPUS';
  if($('hub-outfit-name')) $('hub-outfit-name').textContent=school?'School uniform':'Casual outfit';
  const loc = document.querySelector('.hud-top-bar .location');
  if(loc) loc.textContent=school?'🏫 RUNVERSE SCHOOL':'🎓 RUNVERSE COLLEGE';
}

function updateCarouselUI() {
  const entry = CHARACTER_ROSTER[carouselIndex] || CHARACTER_ROSTER[0];
  const unlocked = isCharUnlocked(entry);
  const equipped = entry.id === equippedCharId;
  if ($('char-step-badge')) $('char-step-badge').textContent = `CHARACTER ${carouselIndex + 1} / ${CHARACTER_ROSTER.length}`;
  const lockPill = $('char-lock-pill');
  if (lockPill) {
    lockPill.classList.toggle('is-locked', !unlocked);
    lockPill.textContent = unlocked ? '✓ UNLOCKED' : '🔒 LOCKED';
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
      equipBtn.textContent = '🔒 LOCKED';
    } else if (equipped) {
      equipBtn.classList.add('is-selected');
      equipBtn.textContent = '✓ SELECTED';
    } else {
      equipBtn.textContent = 'SELECT';
    }
  }
  const prevIdx = (carouselIndex - 1 + CHARACTER_ROSTER.length) % CHARACTER_ROSTER.length;
  const nextIdx = (carouselIndex + 1) % CHARACTER_ROSTER.length;
  const prevEntry = CHARACTER_ROSTER[prevIdx];
  const nextEntry = CHARACTER_ROSTER[nextIdx];
  if ($('char-side-prev-img')) $('char-side-prev-img').src = `assets/portraits/${prevEntry.id}.png`;
  if ($('char-side-next-img')) $('char-side-next-img').src = `assets/portraits/${nextEntry.id}.png`;
  if ($('char-side-prev')) $('char-side-prev').classList.toggle('is-locked', !isCharUnlocked(prevEntry));
  if ($('char-side-next')) $('char-side-next').classList.toggle('is-locked', !isCharUnlocked(nextEntry));
  if ($('char-side-prev-lock')) $('char-side-prev-lock').hidden = isCharUnlocked(prevEntry);
  if ($('char-side-next-lock')) $('char-side-next-lock').hidden = isCharUnlocked(nextEntry);
  const checklist = $('char-unlock-checklist');
  if (checklist) checklist.hidden = !entry.lockedByCollege;
  updateUnlockUI();
}

function selectUnlockedCharacter(id) {
  const entry = CHARACTER_ROSTER.find(c => c.id === id);
  if (!entry || !isCharUnlocked(entry)) return false;
  equippedCharId = entry.id;
  character = entry.gender;
  selectedMap = entry.map;
  s.map = selectedMap;
  carouselIndex = Math.max(0, CHARACTER_ROSTER.findIndex(c => c.id === entry.id));
  syncMapHeaderUI();
  updateCarouselUI();
  save();
  triggerSwag();
  return true;
}

function moveCarousel(delta) {
  carouselIndex = (carouselIndex + delta + CHARACTER_ROSTER.length) % CHARACTER_ROSTER.length;
  updateCarouselUI();
  triggerSwag();
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
    carouselIndex = idx;
    updateCarouselUI();
    triggerSwag();
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
  if (map === 'college' && !isCollegeUnlocked()) {
    if (fromUser) {
      pulseChecklist($('map-unlock-checklist'));
      effects.unlock?.();
    }
    return;
  }
  selectedMap=map==='college'?'college':'school';
  s.map=selectedMap;
  if (selectedMap === 'college') {
    if (!equippedCharId.startsWith('college-')) {
      equippedCharId = character === 'female' ? 'college-woman' : 'college-male';
    }
  } else {
    if (equippedCharId.startsWith('college-')) {
      equippedCharId = character === 'female' ? 'female' : 'male';
    }
  }
  carouselIndex = Math.max(0, CHARACTER_ROSTER.findIndex(c => c.id === equippedCharId));
  syncMapHeaderUI();
  updateCarouselUI();
  save();
}
syncMapHeaderUI();
updateCarouselUI();
document.querySelectorAll('[data-map]').forEach(button=>button.onclick=()=>{
  const before = selectedMap;
  selectMap(button.dataset.map, true);
  if (selectedMap !== before || button.dataset.map === 'school') triggerSwag();
});

function showHub(page='home'){
  const next=['home','characters','maps','settings'].includes(page)?page:'home';
  currentHub = next;
  game.classList.remove('hub-home','hub-characters','hub-maps','hub-settings');
  game.classList.add(`hub-${next}`);
  document.querySelectorAll('[data-hub]').forEach(button=>{
    const active=button.dataset.hub===next;
    button.classList.toggle('selected',active);
    if(active)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');
  });
  if (next === 'characters') {
    carouselIndex = Math.max(0, CHARACTER_ROSTER.findIndex(c => c.id === equippedCharId));
    updateCarouselUI();
  } else if (next === 'maps') {
    updateUnlockUI();
  }
  if(next==='home'||next==='characters')triggerSwag();
}
document.querySelectorAll('[data-hub]').forEach(button=>button.onclick=()=>showHub(button.dataset.hub));
showHub('home');

function setScreenMode(mode) {
  game.classList.remove('mode-splash', 'mode-select', 'mode-running', 'mode-gameover');
  game.classList.add('mode-' + mode);
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
  updatePlayerNameDisplays(playerName);
  hideNameModal();
  setScreenMode('select');
  showHub('home');
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

if($('btn-enter')){
  $('btn-enter').onclick=()=>{
    assetsReady = true;
    try { $('intro-video')?.pause(); } catch {}
    effects.setEnabled(sound);
    effects.unlock();
    if(sound) effects.startBgm?.();
    if (!playerName) {
      showNameModal();
    } else {
      setScreenMode('select');
      showHub('home');
    }
  };
}

function start(){
  if (!isCollegeUnlocked()) {
    selectedMap = 'school';
    equippedCharId = character === 'female' ? 'female' : 'male';
    carouselIndex = Math.max(0, CHARACTER_ROSTER.findIndex(c => c.id === equippedCharId));
    syncMapHeaderUI();
  }
  s=fresh();
  s.map=selectedMap;
  s.turnTime = 0.65;
  s.mode = 'intro';
  s.styleAction = SWEEP_SECONDS;
  s.speed = 0;
  setScreenMode('running');
  $('toast').textContent=selectedMap==='college'?'College rush · Find the next roof ramp':'School rush · Find the next roof ramp';
  effects.setEnabled(sound);
  effects.unlock();
  if(sound) effects.startBgm?.();
  effects.play('swag');
  effects.play('bell');
}

function pause(){
  if(!['running','countdown'].includes(s.mode))return;
  s.mode='paused';
  $('countdown').hidden=true;
  if($('report-grade')) $('report-grade').hidden = true;
  if($('report-records')) $('report-records').hidden = true;
  if($('report-challenge-banner')) $('report-challenge-banner').hidden = true;
  setScreenMode('gameover');
  show('Take a breath.','Your school run will be right here.','RESUME RUN','PAUSED');
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
  if($('btn-play-again')) $('btn-play-again').innerHTML=button+' <span>↗</span>';
  $('tag').textContent=tag;
  if($('selection')) $('selection').hidden=true;
  if($('restart')) $('restart').hidden=s.mode!=='paused';
  $('tip').textContent='Each new run starts from zero.';
  updatePlayerNameDisplays(playerName);
  $('overlay').hidden=false;
}

function crash(){
  const previousBest = best;
  const runDist = Math.floor(s.distance);
  best=Math.max(best, runDist);
  if (runDist >= COLLEGE_UNLOCK_DISTANCE) collegeDistDone = true;
  if (totalCoins >= COLLEGE_UNLOCK_COINS) collegeCoinsDone = true;
  save();
  effects.play('over');
  setScreenMode('gameover');
  const isCol=selectedMap==='college';
  const hint={
    sideVehicle:isCol?'Watch the campus side roads for scooties & cars!':'Watch the side entrance. Move into the clear lane.',
    bus:isCol?'Dodge oncoming college cars & scooties on the curve!':'Dodge the oncoming bus. Change lanes before headlights reach you.',
    van:'Take a striped ramp, or use the clear ground lane.',
    block:isCol?'Dodge the vending machines, notice boards & parked scooties.':'Change lanes to dodge the tall crates.',
    jump:isCol?'Jump over the library book carts, canteen tables & barriers.':'Jump over the school benches and hurdles.',
    slide:isCol?'Slide under the College Fest banner & solar arches.':'Slide under the teal overhead beams.'
  }[s.cause]||'Keep practicing!';
  
  const totalScore = runDist + s.coins * 10;
  const grade = totalScore >= 450 ? 'A+ 🌟' : totalScore >= 220 ? 'A 🥇' : 'B 🥈';
  if($('grade-badge')) $('grade-badge').textContent = grade;
  if($('report-grade')) $('report-grade').hidden = false;

  if($('report-current-score')) $('report-current-score').textContent = `${runDist} m`;
  if($('report-best-score')) $('report-best-score').textContent = `${best} m`;
  const pct = best > 0 ? Math.min(100, Math.round((runDist / best) * 100)) : (runDist > 0 ? 100 : 0);
  if($('report-record-fill')) $('report-record-fill').style.width = `${pct}%`;
  if($('report-record-pct')) $('report-record-pct').textContent = `${pct}% of Record`;
  if($('report-records')) $('report-records').hidden = false;

  const challengeBanner = $('report-challenge-banner');
  if (challengeBanner) {
    challengeBanner.hidden = false;
    challengeBanner.classList.remove('is-loser-taunt', 'is-new-record');
    if (previousBest > 0 && runDist < previousBest) {
      const gap = previousBest - runDist;
      challengeBanner.classList.add('is-loser-taunt');
      challengeBanner.textContent = `😤 ARE YOU A LOSER?! You stopped ${gap}m short of your ${previousBest}m Highest Record (${pct}%) — try quick to achieve it!`;
    } else if (runDist > 0) {
      const nextTarget = Math.ceil((runDist + 250) / 100) * 100;
      challengeBanner.classList.add('is-new-record');
      challengeBanner.textContent = `🏆 NEW HIGHEST RECORD: ${runDist}m! You smashed the record — try quick to reach ${nextTarget}m next!`;
    } else {
      challengeBanner.classList.add('is-loser-taunt');
      challengeBanner.textContent = `😤 ARE YOU A LOSER?! 0m doesn't count — try quick to set a Highest Record!`;
    }
  }
  
  show(
    'ACADEMIC REPORT CARD',
    runDist+' m | '+s.coins+' coins. '+hint,
    'RUN AGAIN',
    'REPORT CARD'
  );
  $('tip').textContent=`Coins: ${s.coins} | Bank: ${totalCoins.toLocaleString()} | Grade: ${grade}`;
}

if($('start')) $('start').onclick=e=>{
  e?.preventDefault?.();
  if($('start').dataset.loadError==='true') location.reload();
  else start();
};
if($('btn-play-again')) $('btn-play-again').onclick=()=>{
  if(s.mode==='paused'){resume();return;}
  // After crash → go back to character select screen (LET'S RUN page)
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
  showHub('characters');
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
  } else if(sound && !game.classList.contains('mode-splash')) {
    effects.startBgm?.();
  }
});
['pointerdown','click','keydown','touchstart'].forEach(type=>{
  window.addEventListener(type,()=>{
    effects.unlock();
    if(game.classList.contains('mode-splash')){
      const v=$('intro-video');
      if(v && sound){ v.muted=false; }
      return;
    }
    if(sound) effects.startBgm?.();
  },{passive:true});
});

function tick(t) {
  const dt = prev ? Math.min(0.1, (t-prev)/1000) : 0;
  prev = t;
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
  try { effects.update(s); } catch (err) { if (!loopErrorLogged) { loopErrorLogged = true; console.error('Sound update error:', err); } }
  
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
  if (old !== 'crashed' && s.mode === 'crashed') crash();
  if (old === 'captured' && captureBefore < 1.30 && s.capture >= 1.30) effects.play('laugh');
  if (old === 'captured' && captureBefore < CAPTURE_GESTURE_START && s.capture >= CAPTURE_GESTURE_START) effects.play('swag');

  if (s.coins > coinsBefore) {
    const gained = s.coins - coinsBefore;
    const wasUnlocked = isCollegeUnlocked();
    totalCoins += gained;
    if (!collegeCoinsDone && totalCoins >= COLLEGE_UNLOCK_COINS) {
      collegeCoinsDone = true;
      effects.play('bell');
      $('toast').textContent = isCollegeUnlocked()
        ? '🎓 20,000 COINS SAVED · COLLEGE CAMPUS & CHARACTERS UNLOCKED!'
        : '🪙 Goal 2 Complete: 20,000 Coins Saved! Reach 10,000m in 1 run to unlock College!';
    }
    save();
    if (!wasUnlocked && isCollegeUnlocked()) updateUnlockUI();
    if (s.y > 1.2 || s.roofRide) effects.play('roofCoin');
    else effects.play('coin');
    const counter=$('coins').parentElement;
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      counter.getAnimations().forEach(animation=>animation.cancel());
      counter.animate([{transform:'scale(1)',boxShadow:'0 0 0 1px #ffe09a'},
        {transform:'scale(1.16)',offset:.28},{transform:'scale(1)',boxShadow:'0 0 0 8px transparent'}],
        {duration:260,easing:'ease-out'});
    }
  }

  // Powerup sound & toasts
  if (s.collectedPowerup === 'magnet') {
    effects.play('magnet');
    $('toast').textContent='Magnet active! Collect nearby gold coins.';
    s.collectedPowerup = null;
  } else if (s.collectedPowerup === 'shield') {
    effects.play('shield');
    $('toast').textContent='Shield active! Protected from one hit.';
    s.collectedPowerup = null;
  }

  if (s.shieldAbsorbed) {
    effects.play('shield');
    $('toast').textContent='Shield absorbed the crash!';
    s.shieldAbsorbed = false;
  }

  // School Bell Milestones & Continuous Speed Tiers
  for (const m of [100, 250, 500]) {
    if (distanceBefore < m && s.distance >= m) {
      effects.play('bell');
      $('toast').textContent = `🔔 School Bell Rang at ${m}m! Keep Rushing!`;
    }
  }
  if (distanceBefore < 1000 && s.distance >= 1000) {
    effects.play('bell');
    $('toast').textContent = '🏃 1,000m · NORMAL FAST SPEED!';
  }
  if (distanceBefore < 2000 && s.distance >= 2000) {
    effects.play('bell');
    $('toast').textContent = '🔥 2,000m · HIGH SPEED & MORE OBSTACLES!';
  }
  if (distanceBefore < 5000 && s.distance >= 5000) {
    effects.play('bell');
    $('toast').textContent = '⚡ 5,000m · EXTRA SPEED & HEAVY OBSTACLES!';
  }
  if (distanceBefore < 8000 && s.distance >= 8000) {
    effects.play('bell');
    $('toast').textContent = '🚀 8,000m · MORE MORE SPEED! 2X HYPER MODE!';
  }
  if (distanceBefore < 10000 && s.distance >= 10000) {
    if (!collegeDistDone) {
      collegeDistDone = true;
      save();
      if (isCollegeUnlocked()) updateUnlockUI();
    }
    effects.play('bell');
    $('toast').textContent = isCollegeUnlocked()
      ? '🎓 10,000m REACHED · COLLEGE CAMPUS & CHARACTERS UNLOCKED!'
      : '💀 10,000m · 10k Goal Open! Collect 20,000 Coins to unlock College!';
  }

  if (s.mode === 'running' && distanceBefore < SCHOOL_GATE && s.distance >= SCHOOL_GATE) {
    $('toast').textContent = 'Campus pickup zone · Look for the next roof ramp';
  }
  if (s.mode === 'running' && distanceBefore < s.entryVan.rear && s.distance >= s.entryVan.rear && s.floor > 1) {
    $('toast').textContent = 'Roof route · Follow the coins and run off the far end';
  }
  if(s.mode==='running'&&s.items.some(o=>o.roofRide&&o.started&&o.lane===s.lane&&o.z-s.distance<20&&o.z+o.length>s.distance)){
    $('toast').textContent=selectedMap==='college'?'Jump onto the moving campus SUV · Follow the roof coins':'Jump onto the moving bus · Follow the roof coins';
  }
  
  if (firstHitBefore !== null && s.firstHitAt === null) {
    $('toast').textContent = 'You escaped the chaser!';
  }
  
  $('distance').innerHTML = Math.floor(s.distance)+'<span> m</span>';
  $('coins').textContent = s.coins;
  $('best').textContent = best+' m';
  
  // Powerup HUD indicators
  const magPill = $('magnet-pill');
  if (magPill) {
    magPill.hidden = !(s.magnet > 0);
    if (s.magnet > 0 && $('magnet-timer')) $('magnet-timer').textContent = Math.ceil(s.magnet) + 's';
  }
  const shieldPill = $('shield-pill');
  if (shieldPill) shieldPill.hidden = !s.shield;

  $('countdown').hidden = s.mode !== 'countdown';
  if (s.mode === 'countdown') $('countdown').textContent = Math.ceil(s.countdown);
  
  let status = 'ready';
  const renderCharId = (s.mode === 'ready' && currentHub === 'characters')
    ? (CHARACTER_ROSTER[carouselIndex]?.id || equippedCharId)
    : equippedCharId;
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
  if(status==='ready'&&!assetsReady){onAllAssetsReady();}
  const showCharBlur = (s.mode === 'ready' && !usingLiteRenderer && status !== 'ready');
  game.classList.toggle('is-char-loading', showCharBlur);
  game.classList.toggle('is-char-error', showCharBlur && status === 'error');
  if ($('char-loading-veil')) {
    $('char-loading-veil').hidden = !showCharBlur;
    if (showCharBlur && $('char-loading-label')) {
      $('char-loading-label').textContent = status === 'error'
        ? "Character didn't load — Tap Retry"
        : 'Loading 3D Hero...';
    }
  }
  if(s.mode==='ready'){
    const startButton=$('start'),failed=status==='error';
    if(startButton){
      startButton.disabled=false;
      const label=failed?'Retry loading runner':"LET'S RUN";
      if(startButton.dataset.currentLabel!==label){
        startButton.dataset.currentLabel=label;
        startButton.innerHTML=`<span>${label}</span> <span class="rush-arrow">🏃💨</span>`;
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
