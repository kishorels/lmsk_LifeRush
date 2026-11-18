import {createSound} from './sound.js';
import {fresh,action,step,height,career,chaseRemaining,isCapture,SCHOOL_GATE,SCHOOL_VAN} from './engine.js';
import {createRenderer} from './renderer3d.js';
import {createLiteRenderer} from './renderer-lite.js';
const $=id=>document.getElementById(id),canvas=$('world');
let draw;try{draw=createRenderer(canvas);}catch(error){console.warn('Using lightweight graphics:',error.message);draw=createLiteRenderer(canvas);document.querySelector('.edition').textContent='COAST EDITION · LITE';}
const chaseNotice = $('chase-notice'), game = canvas.closest('.game');
let s=fresh(),best=0,character='male',sound=true,prev=0,w=600,h=700,lastCount=0;
try{best=Number(localStorage.getItem('runverse-best'))||0;character=localStorage.getItem('runverse-character')==='female'?'female':'male';}catch{}
const save=()=>{try{localStorage.setItem('runverse-best',best);localStorage.setItem('runverse-character',character);}catch{}};
function select(c){character=c;document.querySelectorAll('[data-character]').forEach(b=>{b.classList.toggle('selected',b.dataset.character===c);b.setAttribute('aria-pressed',b.dataset.character===c);});save();}select(character);
document.querySelectorAll('[data-character]').forEach(b=>b.onclick=()=>select(b.dataset.character));
const effects=createSound();
try{sound=localStorage.getItem('runverse-sound')!=='off';}catch{}
function soundButton(){effects.setEnabled(sound);$('sound').textContent=sound?'♪ ON':'♪ OFF';$('sound').setAttribute('aria-label',sound?'Mute sound':'Enable sound');}
$('sound').textContent=sound?'♪ ON':'♪ OFF';$('sound').setAttribute('aria-label',sound?'Mute sound':'Enable sound');
$('sound').onclick=()=>{sound=!sound;soundButton();try{localStorage.setItem('runverse-sound',sound?'on':'off');}catch{}if(sound)effects.play('coin');};
function start(){s=fresh();s.mode='running';lastCount=0;$('overlay').hidden=true;$('toast').textContent='Enter the school gate · Ramp ahead in the right lane';effects.setEnabled(sound);effects.unlock();effects.play('start');}
function pause(){if(!['running','countdown'].includes(s.mode))return;s.mode='paused';$('countdown').hidden=true;show('Take a breath.','Your story will be right here.','RESUME RUN','PAUSED');}
function resume(){effects.unlock();s.mode='countdown';s.countdown=3;$('overlay').hidden=true;}
function show(title,message,button,tag){$('title').textContent=title;$('message').textContent=message;$('start').innerHTML=button+' <span>↗</span>';$('tag').textContent=tag;$('selection').hidden=true;$('selection').style.display='none';$('restart').hidden=s.mode!=='paused';$('tip').textContent='Each new run starts from zero.';$('overlay').hidden=false;}
function crash(){best=Math.max(best,Math.floor(s.distance));save();effects.play('over');const hint={sideVehicle:'Watch the side entrance. Use the opposite outside lane.',bus:'Dodge the oncoming bus. Change lanes before its headlights reach you.',van:'Take a striped ramp, or use the clear ground lane.',block:'Change lanes to dodge the tall crates.',jump:'Jump over the low orange barriers.',slide:'Slide under the teal overhead beams.'}[s.cause];show('A fresh start awaits.',Math.floor(s.distance)+' m · '+s.skills.reduce((a,b)=>a+b,0)+' skills. '+hint,'RUN AGAIN','RUN COMPLETE');$('tip').textContent='Career tendency: '+career(s.skills)+' · Early mechanic';}
$('start').onclick=()=>s.mode==='paused'?resume():start();$('restart').onclick=start;$('pause').onclick=()=>s.mode==='paused'?resume():pause();
function input(a){const before=[s.jump,s.slide,s.roll,s.drop,s.lane];action(s,a);if(s.mode==='running'&&(s.jump!==before[0]||s.slide!==before[1]||s.roll!==before[2]||s.drop!==before[3]||s.lane!==before[4]))effects.play(a==='jump'?'jump':a==='slide'?'slide':'lane');}
document.querySelectorAll('[data-action]').forEach(b=>b.addEventListener('pointerdown',e=>{e.preventDefault();input(b.dataset.action);}));
window.addEventListener('keydown',e=>{if(s.mode!=='running'&&e.target.closest('button')&&(e.key===' '||e.key==='Enter'))return;const a={ArrowLeft:'left',a:'left',ArrowRight:'right',d:'right',ArrowUp:'jump',w:'jump',' ':'jump',ArrowDown:'slide',s:'slide'}[e.key];if(a){e.preventDefault();if(!e.repeat)input(a);}if(e.key==='Escape'||e.key==='p'){s.mode==='paused'?resume():pause();}});
let touch;canvas.addEventListener('pointerdown',e=>{touch={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);});canvas.addEventListener('pointerup',e=>{if(!touch)return;const x=e.clientX-touch.x,y=e.clientY-touch.y;if(Math.max(Math.abs(x),Math.abs(y))>20)input(Math.abs(x)>Math.abs(y)?x>0?'right':'left':y>0?'slide':'jump');touch=null;});canvas.addEventListener('pointercancel',()=>touch=null);document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
function updateChaseNotice() {
  const warning=$('encounter-notice');warning.hidden=!(s.mode==='running'&&s.warning&&s.time<s.warning.until);if(!warning.hidden)warning.textContent=s.warning.side===1?'← ESCAPE LEFT · SIDE TRAFFIC':'SIDE TRAFFIC · ESCAPE RIGHT →';
  const active = s.mode === 'running' && chaseRemaining(s) > 0;
  chaseNotice.hidden = !active;
  game.classList.toggle('capture', isCapture(s));
}
function frame(t) {
  const dt = prev ? (t-prev)/1000 : 0;
  prev = t;
  const old = s.mode, firstHitBefore = s.firstHitAt, captureBefore = s.capture;
  const distanceBefore = s.distance, coinsBefore = s.coins;
  step(s, dt);
  effects.update(s);
  if(old==='running' && s.mode==='falling')effects.play('hit',s.cause);
  updateChaseNotice();
  if (old !== 'crashed' && s.mode === 'crashed') crash();
  if (old === 'captured' && captureBefore < 1.30 && s.capture >= 1.30) effects.play('laugh');

  if(distanceBefore<75 && s.distance>=75) $('toast').textContent='Oncoming school buses · Watch the headlights and switch lanes';
  if (coinsBefore !== s.coins) effects.play('coin');
  if (s.mode === 'running' && distanceBefore < SCHOOL_GATE && s.distance >= SCHOOL_GATE) {
    $('toast').textContent = 'Campus pickup zone · Keep right to climb the ramp';
  }
  if (s.mode === 'running' && distanceBefore < SCHOOL_VAN.rear && s.distance >= SCHOOL_VAN.rear && s.floor > 1) {
    $('toast').textContent = 'Roof route · Follow the coins and run off the far end';
  }
  if(s.mode==='running'&&s.items.some(o=>o.roofRide&&o.started&&o.lane===s.lane&&o.z-s.distance<20&&o.z+o.length>s.distance))$('toast').textContent='Jump onto the moving bus · Follow the roof coins';
  const count = s.skills.reduce((a,b) => a+b, 0);
  if (count > lastCount) {
    effects.play('coin');
    lastCount = count;
    if (!s.hit) $('toast').textContent = 'Skill collected. Your future is taking shape.';
  }
  if (s.firstHitAt !== null && s.firstHitAt !== firstHitBefore) {
    effects.play('hit',s.cause);
    $('toast').textContent = s.cause==='bus'?'Moved to a clear lane · Escape the mutant!':'One hit left. Keep running!';
  } else if (firstHitBefore !== null && s.firstHitAt === null) {
    $('toast').textContent = 'You escaped. Both hearts restored.';
  }
  if(s.mode==='running'&&s.warning&&s.time<s.warning.until)$('toast').textContent=s.warning.side===1?'SIDE TRAFFIC + BUS · SWIPE LEFT ←':'SIDE TRAFFIC + BUS · SWIPE RIGHT →';
  const health = $('health'), left = 2-s.damage;
  if (health.dataset.left !== String(left)) {
    health.dataset.left = left;
    health.textContent = ['♡ ♡','♥ ♡','♥ ♥'][left];
    health.setAttribute('aria-label', left === 1 ? '1 hit left' : left+' hits left');
  }
  $('distance').innerHTML = Math.floor(s.distance)+'<span> m</span>';
  $('coins').textContent = s.coins;
  $('best').textContent = best+' m';
  ['k','c','s'].forEach((id,i) => $(id).textContent = s.skills[i]);
  $('countdown').hidden = s.mode !== 'countdown';
  if (s.mode === 'countdown') $('countdown').textContent = Math.ceil(s.countdown);
  draw(s, character, dt);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
