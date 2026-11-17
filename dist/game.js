import {fresh,action,step,height,career,chaseRemaining} from './engine.js';
import {createRenderer} from './renderer3d.js';
import {createLiteRenderer} from './renderer-lite.js';
const $=id=>document.getElementById(id),canvas=$('world');
let draw;try{draw=createRenderer(canvas);}catch(error){console.warn('Using lightweight graphics:',error.message);draw=createLiteRenderer(canvas);document.querySelector('.edition').textContent='COAST EDITION · LITE';}
const chaseNotice = $('chase-notice');
let s=fresh(),best=0,character='male',sound=false,audio,prev=0,w=600,h=700,lastCount=0;
try{best=Number(localStorage.getItem('runverse-best'))||0;character=localStorage.getItem('runverse-character')==='female'?'female':'male';}catch{}
const save=()=>{try{localStorage.setItem('runverse-best',best);localStorage.setItem('runverse-character',character);}catch{}};
function select(c){character=c;document.querySelectorAll('[data-character]').forEach(b=>{b.classList.toggle('selected',b.dataset.character===c);b.setAttribute('aria-pressed',b.dataset.character===c);});save();}select(character);
document.querySelectorAll('[data-character]').forEach(b=>b.onclick=()=>select(b.dataset.character));
function beep(f=500){if(!sound)return;try{audio??=new AudioContext();audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.connect(g);g.connect(audio.destination);o.frequency.value=f;g.gain.setValueAtTime(.055,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.12);o.start();o.stop(audio.currentTime+.12);}catch{}}
$('sound').onclick=()=>{sound=!sound;$('sound').textContent=sound?'♪ ON':'♪ OFF';$('sound').setAttribute('aria-label',sound?'Mute sound':'Enable sound');beep();};
function start(){s=fresh();s.mode='running';lastCount=0;$('overlay').hidden=true;$('toast').textContent='Down in air: quick drop · Twice down on ground: roll';beep(660);}
function pause(){if(!['running','countdown'].includes(s.mode))return;s.mode='paused';$('countdown').hidden=true;show('Take a breath.','Your story will be right here.','RESUME RUN','PAUSED');}
function resume(){s.mode='countdown';s.countdown=3;$('overlay').hidden=true;}
function show(title,message,button,tag){$('title').textContent=title;$('message').textContent=message;$('start').innerHTML=button+' <span>↗</span>';$('tag').textContent=tag;$('selection').hidden=true;$('selection').style.display='none';$('restart').hidden=s.mode!=='paused';$('tip').textContent='Each new run starts from zero.';$('overlay').hidden=false;}
function crash(){best=Math.max(best,Math.floor(s.distance));save();beep(140);const hint={block:'Change lanes to dodge the tall crates.',jump:'Jump over the low orange barriers.',slide:'Slide under the teal overhead beams.'}[s.cause];show('A fresh start awaits.',Math.floor(s.distance)+' m · '+s.skills.reduce((a,b)=>a+b,0)+' skills. '+hint,'RUN AGAIN','RUN COMPLETE');$('tip').textContent='Career tendency: '+career(s.skills)+' · Early mechanic';}
$('start').onclick=()=>s.mode==='paused'?resume():start();$('restart').onclick=start;$('pause').onclick=()=>s.mode==='paused'?resume():pause();
function input(a){action(s,a);if(s.mode==='running'&&(a==='jump'||a==='slide'))beep(a==='jump'?440:280);}
document.querySelectorAll('[data-action]').forEach(b=>b.addEventListener('pointerdown',e=>{e.preventDefault();input(b.dataset.action);}));
window.addEventListener('keydown',e=>{if(e.target.closest('button')&&(e.key===' '||e.key==='Enter'))return;const a={ArrowLeft:'left',a:'left',ArrowRight:'right',d:'right',ArrowUp:'jump',w:'jump',' ':'jump',ArrowDown:'slide',s:'slide'}[e.key];if(a){e.preventDefault();if(!e.repeat)input(a);}if(e.key==='Escape'||e.key==='p'){s.mode==='paused'?resume():pause();}});
let touch;canvas.addEventListener('pointerdown',e=>{touch={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);});canvas.addEventListener('pointerup',e=>{if(!touch)return;const x=e.clientX-touch.x,y=e.clientY-touch.y;if(Math.max(Math.abs(x),Math.abs(y))>20)input(Math.abs(x)>Math.abs(y)?x>0?'right':'left':y>0?'slide':'jump');touch=null;});canvas.addEventListener('pointercancel',()=>touch=null);document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
function updateChaseNotice() {
  const active = s.mode === 'running' && chaseRemaining(s) > 0;
  chaseNotice.hidden = !active;
}
function frame(t){const dt=prev?(t-prev)/1000:0;prev=t;const old=s.mode,damage=s.damage;step(s,dt);updateChaseNotice();if(old==='falling'&&s.mode==='crashed')crash();if(damage===0&&s.damage===1){beep(185);$('toast').textContent='One hit left. Keep running!';}const count=s.skills.reduce((a,b)=>a+b,0);if(count>lastCount){beep(880);lastCount=count;if(!s.hit)$('toast').textContent='Skill collected. Your future is taking shape.';}const health=$('health'),left=2-s.damage;if(health.dataset.left!==String(left)){health.dataset.left=left;health.textContent=['♡ ♡','♥ ♡','♥ ♥'][left];health.setAttribute('aria-label',left===1?'1 hit left':left+' hits left');}$('distance').innerHTML=Math.floor(s.distance)+'<span> m</span>';$('best').textContent=best+' m';['k','c','s'].forEach((id,i)=>$(id).textContent=s.skills[i]);$('countdown').hidden=s.mode!=='countdown';if(s.mode==='countdown')$('countdown').textContent=Math.ceil(s.countdown);draw(s,character,dt);requestAnimationFrame(frame);}requestAnimationFrame(frame);
