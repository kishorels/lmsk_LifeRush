import {createSound} from './sound.js';
import {SWEEP_SECONDS,fresh,action,step,height,career,isCapture,SCHOOL_GATE,SCHOOL_VAN} from './engine.js';
import {createRenderer} from './renderer3d.js';
import {createLiteRenderer} from './renderer-lite.js';

const $=id=>document.getElementById(id),canvas=$('world');
let draw;
try{
  draw=createRenderer(canvas);
}catch(error){
  console.warn('Using lightweight graphics:',error.message);
  draw=createLiteRenderer(canvas);
  document.querySelector('.edition').textContent='COAST EDITION · LITE';
}
const game = canvas.closest('.game');
let s=fresh(),best=0,character='male',sound=true,prev=0,w=600,h=700,lastCount=0;

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
  $('toast').textContent='🔥 Thalapathy Swag! Mass Action ✨';
}
if($('btn-swag')) $('btn-swag').onclick = triggerSwag;

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
  lastCount=0;
  setScreenMode('running');
  $('toast').textContent='🔔 School Bell Rang! Sprint to class · Ramp in right lane';
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
    sideVehicle:'Watch the side entrance. Use the opposite outside lane.',
    bus:'Dodge the oncoming bus. Change lanes before headlights reach you.',
    van:'Take a striped ramp, or use the clear ground lane.',
    block:'Change lanes to dodge the tall crates.',
    jump:'Jump over the school benches and hurdles.',
    slide:'Slide under the teal overhead beams.'
  }[s.cause]||'Keep practicing!';
  
  const totalScore = Math.floor(s.distance) + (s.books || 0) * 50;
  const grade = totalScore >= 450 ? 'A+ 🌟' : totalScore >= 220 ? 'A 🥇' : 'B 🥈';
  if($('grade-badge')) $('grade-badge').textContent = grade;
  if($('report-grade')) $('report-grade').hidden = false;
  
  show(
    'ACADEMIC REPORT CARD',
    Math.floor(s.distance)+' m · 📚 '+(s.books||0)+' books · '+s.skills.reduce((a,b)=>a+b,0)+' skills. '+hint,
    'RUN AGAIN',
    'REPORT CARD'
  );
  $('tip').textContent='Career tendency: '+career(s.skills)+' · Grade: '+grade;
}

if($('start')) $('start').onclick=()=>$('start').dataset.loadError==='true'?location.reload():start();
if($('btn-play-again')) $('btn-play-again').onclick=()=>s.mode==='paused'?resume():start();
if($('restart')) $('restart').onclick=start;
if($('btn-change-char')) $('btn-change-char').onclick=()=>{
  s.mode='ready';
  $('overlay').hidden=true;
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
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});

function frame(t) {
  const dt = prev ? (t-prev)/1000 : 0;
  prev = t;
  const old = s.mode, firstHitBefore = s.firstHitAt, captureBefore = s.capture;
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
  
  if(old==='running' && s.mode==='falling')effects.play('hit',s.cause);
  game.classList.toggle('capture', isCapture(s));
  if (old !== 'crashed' && s.mode === 'crashed') crash();
  if (old === 'captured' && captureBefore < 1.30 && s.capture >= 1.30) effects.play('laugh');

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
    $('toast').textContent = '🧲 School Magnet! Pulling all books & coins!';
    s.collectedPowerup = null;
  } else if (s.collectedPowerup === 'shield') {
    effects.play('shield');
    $('toast').textContent = '🛡️ School Bag Shield Active! 1 Hit Protected!';
    s.collectedPowerup = null;
  } else if (s.collectedPowerup === 'book') {
    effects.play('book');
    $('toast').textContent = '📚 Textbook Collected! Exam Score Boost!';
    s.collectedPowerup = null;
  }
  if (s.shieldAbsorbed) {
    effects.play('shield');
    $('toast').textContent = '🛡️ Shield Absorbed Obstacle Crash!';
    s.shieldAbsorbed = false;
  }

  // School Bell Milestones
  for (const m of [100, 250, 500, 1000]) {
    if (distanceBefore < m && s.distance >= m) {
      effects.play('bell');
      $('toast').textContent = `🔔 School Bell Rang at ${m}m! Keep Rushing!`;
    }
  }

  if (s.mode === 'running' && distanceBefore < SCHOOL_GATE && s.distance >= SCHOOL_GATE) {
    $('toast').textContent = 'Campus pickup zone · Keep right to climb the ramp';
  }
  if (s.mode === 'running' && distanceBefore < SCHOOL_VAN.rear && s.distance >= SCHOOL_VAN.rear && s.floor > 1) {
    $('toast').textContent = 'Roof route · Follow the coins and run off the far end';
  }
  if(s.mode==='running'&&s.items.some(o=>o.roofRide&&o.started&&o.lane===s.lane&&o.z-s.distance<20&&o.z+o.length>s.distance)){
    $('toast').textContent='Jump onto the moving bus · Follow the roof coins';
  }
  
  const count = s.skills.reduce((a,b) => a+b, 0);
  if (count > lastCount) {
    effects.play('coin');
    lastCount = count;
    if (!s.hit) $('toast').textContent = 'Skill collected. Your future is taking shape.';
  }
  if (s.firstHitAt !== null && s.firstHitAt !== firstHitBefore) {
    effects.play('hit',s.cause);
  } else if (firstHitBefore !== null && s.firstHitAt === null) {
    $('toast').textContent = 'You escaped. Both hearts restored.';
  }
  
  const health = $('health'), left = 2-s.damage;
  if (health.dataset.left !== String(left)) {
    health.dataset.left = left;
    health.textContent = ['♡ ♡','♥ ♡','♥ ♥'][left];
    health.setAttribute('aria-label', left === 1 ? '1 hit left' : left+' hits left');
  }
  $('distance').innerHTML = Math.floor(s.distance)+'<span> m</span>';
  $('coins').textContent = s.coins;
  if($('books')) $('books').textContent = s.books || 0;
  $('best').textContent = best+' m';
  ['k','c','s'].forEach((id,i) => $(id).textContent = s.skills[i]);
  
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
