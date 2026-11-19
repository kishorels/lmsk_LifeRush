import {createSound} from './sound.js?v=2.8.5';
import {CAPTURE_GESTURE_START,SWEEP_SECONDS,fresh,action,step,height,isCapture,SCHOOL_GATE} from './engine.js?v=2.8.5';
import {createRenderer} from './renderer3d.js?v=2.8.5';
import {createLiteRenderer} from './renderer-lite.js?v=2.8.5';

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

const game = canvas.closest('.game');
let s=fresh(),best=0,character='male',selectedMap='school',sound=true,prev=0,w=600,h=700;

try{
  best=Number(localStorage.getItem('runverse-best'))||0;
  character=localStorage.getItem('runverse-character')==='female'?'female':'male';
  selectedMap=localStorage.getItem('runverse-map')==='college'?'college':'school';
}catch{}
s.map=selectedMap;

const initialModelKey = selectedMap === 'college' ? ('college-' + character) : character;

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
    if(Math.max(Math.abs(x),Math.abs(y))>20)input(Math.abs(x)>Math.abs(y)?x>0?'right':'left':y>0?'slide':'jump');
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
    localStorage.setItem('runverse-character',character);
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

function select(c){
  character=c;
  document.querySelectorAll('[data-character]').forEach(b=>{
    const match = b.dataset.character===c;
    b.classList.toggle('selected', match);
    b.setAttribute('aria-pressed', match);
  });
  save();
  triggerSwag();
}
select(character);
document.querySelectorAll('[data-character]').forEach(b=>b.onclick=()=>select(b.dataset.character));

function selectMap(map){
  selectedMap=map==='college'?'college':'school';
  s.map=selectedMap;
  document.querySelectorAll('[data-map]').forEach(button=>{
    const active=button.dataset.map===selectedMap;
    button.classList.toggle('selected',active);
    button.setAttribute('aria-pressed',String(active));
  });
  const school=selectedMap==='school';
  $('hub-map-name').textContent=school?'SCHOOL CAMPUS':'COLLEGE CAMPUS';
  $('hub-outfit-name').textContent=school?'School uniform':'Casual outfit';
  $('boy-outfit').textContent=school?'School uniform':'Original casual look';
  $('girl-outfit').textContent=school?'School uniform':'Original casual look';
  document.querySelector('.hud-top-bar .location').textContent=school?'🏫 RUNVERSE SCHOOL':'🎓 RUNVERSE COLLEGE';
  save();
}
selectMap(selectedMap);
document.querySelectorAll('[data-map]').forEach(button=>button.onclick=()=>{selectMap(button.dataset.map);triggerSwag();});

function showHub(page='home'){
  const next=['home','characters','maps','settings'].includes(page)?page:'home';
  game.classList.remove('hub-home','hub-characters','hub-maps','hub-settings');
  game.classList.add(`hub-${next}`);
  document.querySelectorAll('[data-hub]').forEach(button=>{
    const active=button.dataset.hub===next;
    button.classList.toggle('selected',active);
    if(active)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');
  });
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
  best=Math.max(best,Math.floor(s.distance));
  save();
  effects.play('over');
  setScreenMode('gameover');
  const hint={
    sideVehicle:'Watch the side entrance. Move into the clear lane.',
    bus:'Dodge the oncoming bus. Change lanes before headlights reach you.',
    van:'Take a striped ramp, or use the clear ground lane.',
    block:'Change lanes to dodge the tall crates.',
    jump:'Jump over the school benches and hurdles.',
    slide:'Slide under the teal overhead beams.'
  }[s.cause]||'Keep practicing!';
  
  const totalScore = Math.floor(s.distance) + s.coins * 10;
  const grade = totalScore >= 450 ? 'A+ 🌟' : totalScore >= 220 ? 'A 🥇' : 'B 🥈';
  if($('grade-badge')) $('grade-badge').textContent = grade;
  if($('report-grade')) $('report-grade').hidden = false;
  
  show(
    'ACADEMIC REPORT CARD',
    Math.floor(s.distance)+' m | '+s.coins+' coins. '+hint,
    'RUN AGAIN',
    'REPORT CARD'
  );
  $('tip').textContent='Coins: '+s.coins+' | Grade: '+grade;
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
  if($('selection')) $('selection').hidden=false;
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
  if($('selection')) $('selection').hidden=false;
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
  if(e.target.closest('input, textarea, select')) return;
  if(s.mode!=='running'&&e.target.closest('button')&&(e.key===' '||e.key==='Enter'))return;
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

function frame(t) {
  const dt = prev ? (t-prev)/1000 : 0;
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
  effects.update(s);
  
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

  // School Bell Milestones & High-Intensity Zones
  for (const m of [100, 250, 500, 1000]) {
    if (distanceBefore < m && s.distance >= m) {
      effects.play('bell');
      $('toast').textContent = `🔔 School Bell Rang at ${m}m! Keep Rushing!`;
    }
  }
  if (distanceBefore < 5000 && s.distance >= 5000) {
    effects.play('bell');
    $('toast').textContent = '⚠️ 5,000m REACHED! Heavy targeted obstacles incoming!';
  }
  if (distanceBefore < 8000 && s.distance >= 8000) {
    effects.play('bell');
    $('toast').textContent = '⚡ 8,000m REACHED! 2X HYPER SPEED ACTIVATED! 🚀';
  }
  if (distanceBefore < 10000 && s.distance >= 10000) {
    effects.play('bell');
    $('toast').textContent = '💀 10,000m SUDDEN DEATH! 1 Hit = Game Over! 🔥';
  }

  if (s.mode === 'running' && distanceBefore < SCHOOL_GATE && s.distance >= SCHOOL_GATE) {
    $('toast').textContent = 'Campus pickup zone · Look for the next roof ramp';
  }
  if (s.mode === 'running' && distanceBefore < s.entryVan.rear && s.distance >= s.entryVan.rear && s.floor > 1) {
    $('toast').textContent = 'Roof route · Follow the coins and run off the far end';
  }
  if(s.mode==='running'&&s.items.some(o=>o.roofRide&&o.started&&o.lane===s.lane&&o.z-s.distance<20&&o.z+o.length>s.distance)){
    $('toast').textContent='Jump onto the moving bus · Follow the roof coins';
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
  try {
    status = draw(s, character, dt);
    if (status === 'context-lost') {
      switchToLiteRenderer('WebGL context lost');
      status = draw(s, character, dt);
    }
  } catch (err) {
    switchToLiteRenderer(err?.message || err);
    try { status = draw(s, character, dt); } catch {}
  }
  if(status==='ready'&&!assetsReady){onAllAssetsReady();}
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
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
