import {createSound} from './sound.js';
import {CAPTURE_GESTURE_START,SWEEP_SECONDS,fresh,action,step,height,isCapture,SCHOOL_GATE} from './engine.js';
import {createRenderer} from './renderer3d.js';
import {createLiteRenderer} from './renderer-lite.js';

const $=id=>document.getElementById(id),canvas=$('world');
// Remove controls from a cached older HTML shell as well.
document.querySelectorAll('#btn-swag,.btn-swag-action,.select-guide-text').forEach(element=>element.remove());
let assetsReady = false;
let realDownloadPct = 0;
let virtualPct = 1;
let currentDisplayPct = 1;
let boyFraction = 0, chaserFraction = 0;

function updateAssetProgress(type, fraction) {
  if (type === 'boy') boyFraction = Math.max(boyFraction, fraction);
  if (type === 'chaser') chaserFraction = Math.max(chaserFraction, fraction);
  const total = Math.min(1, boyFraction * 0.85 + chaserFraction * 0.15);
  realDownloadPct = Math.max(realDownloadPct, Math.floor(total * 100));
}

function renderProgress(pct) {
  const bar = $('splash-progress-bar');
  const txt = $('splash-status-text');
  const btnTxt = $('btn-enter-text');

  if (bar) bar.style.width = pct + '%';
  if (txt) {
    if (pct < 30) txt.textContent = `⏳ Downloading 3D Hero... ${pct}%`;
    else if (pct < 70) txt.textContent = `⚡ Downloading Campus & Mutant... ${pct}%`;
    else if (pct < 100) txt.textContent = `✨ Preparing GPU Shaders... ${pct}%`;
    else txt.textContent = `✅ 3D Assets Ready! (100%)`;
  }
  if (btnTxt && !assetsReady) {
    btnTxt.textContent = `DOWNLOADING ASSETS... ${pct}%`;
  }
}

function activateEnterButton() {
  const bar = $('splash-progress-bar');
  const txt = $('splash-status-text');
  const btn = $('btn-enter');
  const btnTxt = $('btn-enter-text');
  const arrow = $('btn-enter-arrow');
  const tip = $('splash-tip');

  if (bar) bar.style.width = '100%';
  if (txt) txt.textContent = '✅ 3D Assets Ready! (100%)';
  if (btn) {
    btn.disabled = false;
    btn.classList.remove('loading');
    btn.classList.add('ready');
  }
  if (btnTxt) btnTxt.textContent = 'ENTER GAME';
  if (arrow) arrow.hidden = false;
  if (tip) tip.textContent = '★ All 3D Assets Loaded! Click to Enter ★';
}

function startProgressTicker() {
  function tick() {
    if (assetsReady) {
      if (currentDisplayPct < 100) {
        const step = Math.max(1, Math.ceil((100 - currentDisplayPct) * 0.35));
        currentDisplayPct = Math.min(100, currentDisplayPct + step);
        renderProgress(currentDisplayPct);
        setTimeout(tick, 20);
      } else {
        renderProgress(100);
        activateEnterButton();
      }
      return;
    }

    // While downloading: smoothly climb 1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20...
    if (virtualPct < 92) {
      const inc = virtualPct < 12 ? 0.9 : virtualPct < 35 ? 0.7 : virtualPct < 70 ? 0.4 : 0.2;
      virtualPct = Math.min(92, virtualPct + inc);
    }
    const target = Math.max(virtualPct, realDownloadPct);

    if (currentDisplayPct < target) {
      const step = Math.max(1, Math.floor((target - currentDisplayPct) * 0.35));
      currentDisplayPct = Math.min(Math.floor(target), currentDisplayPct + step);
      renderProgress(currentDisplayPct);
    }

    setTimeout(tick, 60);
  }
  tick();
}
startProgressTicker();

function onAllAssetsReady() {
  if (assetsReady) return;
  assetsReady = true;
}

let draw;
try{
  draw=createRenderer(canvas, {
    onBoyProgress: f => updateAssetProgress('boy', f),
    onChaserProgress: f => updateAssetProgress('chaser', f)
  });
}catch(error){
  console.warn('Using lightweight graphics:',error.message);
  draw=createLiteRenderer(canvas);
  document.querySelector('.edition').textContent='COAST EDITION · LITE';
  onAllAssetsReady();
}
const game = canvas.closest('.game');
let s=fresh(),best=0,character='male',sound=true,prev=0,w=600,h=700;

try{
  best=Number(localStorage.getItem('runverse-best'))||0;
  character=localStorage.getItem('runverse-character')==='female'?'female':'male';
}catch{}

const save=()=>{
  try{
    localStorage.setItem('runverse-best',best);
    localStorage.setItem('runverse-character',character);
  }catch{}
};

const effects=createSound();
try{sound=localStorage.getItem('runverse-sound')!=='off';}catch{}
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
  if(sound)effects.play('coin');
};

function triggerSwag(){
  s.styleAction = SWEEP_SECONDS;
  effects.unlock();
  effects.play('swag');
}

function select(c){
  character=c;
  if($('start')) $('start').disabled=true;
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

function setScreenMode(mode) {
  game.classList.remove('mode-splash', 'mode-select', 'mode-running', 'mode-gameover');
  game.classList.add('mode-' + mode);
}
setScreenMode('splash');

if($('btn-enter')){
  $('btn-enter').onclick=()=>{
    if (!assetsReady) return;
    effects.unlock();
    effects.play('coin');
    setScreenMode('select');
    triggerSwag();
  };
}

function start(){
  s=fresh();
  s.turnTime = 0.65;
  s.mode = 'intro';
  s.styleAction = SWEEP_SECONDS;
  s.speed = 0;
  setScreenMode('running');
  $('toast').textContent='🔔 School Bell Rang! Sprint to class · Find the next roof ramp';
  effects.setEnabled(sound);
  effects.unlock();
  effects.play('bell');
  effects.play('start');
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

if($('start')) $('start').onclick=()=>$('start').dataset.loadError==='true'?location.reload():start();
if($('btn-play-again')) $('btn-play-again').onclick=()=>{
  if(s.mode==='paused'){resume();return;}
  // After crash → go back to character select screen (LET'S RUN page)
  s=fresh();
  s.mode='ready';
  $('overlay').hidden=true;
  if($('report-grade')) $('report-grade').hidden=true;
  if($('selection')) $('selection').hidden=false;
  setScreenMode('select');
  triggerSwag();
};
if($('restart')) $('restart').onclick=start;
if($('btn-change-char')) $('btn-change-char').onclick=()=>{
  s=fresh();
  s.mode='ready';
  $('overlay').hidden=true;
  if($('report-grade')) $('report-grade').hidden=true;
  if($('selection')) $('selection').hidden=false;
  setScreenMode('select');
  triggerSwag();
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
  if(s.mode!=='running'&&e.target.closest('button')&&(e.key===' '||e.key==='Enter'))return;
  const a={ArrowLeft:'left',a:'left',ArrowRight:'right',d:'right',ArrowUp:'jump',w:'jump',' ':'jump',ArrowDown:'slide',s:'slide'}[e.key];
  if(a){e.preventDefault();if(!e.repeat)input(a);}
  if(e.key==='Escape'||e.key==='p'){s.mode==='paused'?resume():pause();}
});

let touch;
canvas.addEventListener('pointerdown',e=>{
  touch={x:e.clientX,y:e.clientY};
  canvas.setPointerCapture(e.pointerId);
  if(s.mode==='ready'||s.mode==='select') triggerSwag();
});
canvas.addEventListener('pointerup',e=>{
  if(!touch)return;
  const x=e.clientX-touch.x,y=e.clientY-touch.y;
  if(Math.max(Math.abs(x),Math.abs(y))>20)input(Math.abs(x)>Math.abs(y)?x>0?'right':'left':y>0?'slide':'jump');
  touch=null;
});
canvas.addEventListener('pointercancel',()=>touch=null);
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){
    pause();
    effects.pauseBgm?.();
  } else if(sound) {
    effects.startBgm?.();
  }
});
['pointerdown','keydown','touchstart'].forEach(type=>{
  window.addEventListener(type,()=>effects.unlock(),{once:true,passive:true});
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
    effects.play('hit',s.cause);
    game.classList.remove('impact-flash');
    void game.offsetWidth;
    game.classList.add('impact-flash');
    if (navigator.vibrate) try { navigator.vibrate([140, 60, 180]); } catch {}
  } else if (hitBefore === 0 && s.hit > 0 && !s.shieldAbsorbed) {
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
    effects.play('roofCoin');
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
  
  if (s.firstHitAt !== null && s.firstHitAt !== firstHitBefore) {
    effects.play('hit',s.cause);
  } else if (firstHitBefore !== null && s.firstHitAt === null) {
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
  
  const status=draw(s, character, dt);
  if(status==='ready'&&!assetsReady){onAllAssetsReady();}
  if(s.mode==='ready'){
    const startButton=$('start'),waiting=status==='loading',failed=status==='error';
    if(startButton){
      startButton.disabled=waiting;
      const label=waiting?'Loading runner…':failed?'Retry loading runner':"LET’S RUN 🏃💨";
      if(startButton.textContent!==label)startButton.innerHTML=`<span>${label}</span> <span class="start-arrow">➔</span>`;
      startButton.dataset.loadError=String(failed);
    }
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
