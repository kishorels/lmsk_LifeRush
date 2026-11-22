import {branchForkClearance} from './road-events.js';
import {pickupTypes} from './progression.js';
import {drawLitePowerup} from './pickup-models.js';
import {drawLiteCoin} from './coin.js';
import {createLiteScenery} from './lite-scenery.js?v=1.0.6';
import {createLiteCollegeRain} from './college-rain-lite.js';
import {sceneWeather,hasCollegeRain,weatherColor} from './weather.js';
import {campusAnchor,campusKind,CAMPUS_SLOTS,roadCurveX} from './campus-layout.js';
import {drawAirliner,flightPhase} from './airliner.js';
import {repeatedVans,sideVehicleX} from './traffic-rules.js';
import {CAPTURE_GESTURE_START,SWEEP_SECONDS,height,chasePose,capturePose,isCapture,SCHOOL_GATE,FINALRUN_GATE,ROLL_DURATION,FALL_DURATION,HIT_DURATION} from './engine.js';
export function createLiteRenderer(canvas){let s,character,w=600,h=700;const ctx=canvas.getContext('2d');
function resize(){const r=canvas.getBoundingClientRect();w=r.width||390;h=r.height||780;const d=Math.min(devicePixelRatio||1,2);canvas.width=w*d;canvas.height=h*d;ctx?.setTransform(d,0,0,d,0,0);}new ResizeObserver(resize).observe(canvas);
const poly=(points,color)=>{ctx.fillStyle=color;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();};
function project(x,z,y=0){const p=10/(z+10);const curveX=(s?.map==='college'&&z>0)?(roadCurveX((s.distance||0)+Math.max(0,z-3),'college')-roadCurveX(s.distance||0,'college'))*.38:0;return {x:w/2+(x+curveX-s.x*.55)*w*.15*p,y:h*.30+h*.75*p-y*h*.12*p,k:h*.12*p};}
function box(x,z,width,height,depth,front,side='#a46e43',top='#d0a46b',y=0,visibleSide){
  const left=x-width/2,right=x+width/2,far=z+depth,high=y+height;
  const shape=(points,color)=>poly(points.map(point=>{const p=project(...point);return [p.x,p.y];}),color);
  const edge=x+(visibleSide ?? (project(x,z).x<w/2?1:-1))*width/2;
  shape([[edge,z,y],[edge,far,y],[edge,far,high],[edge,z,high]],side);
  shape([[left,z,high],[right,z,high],[right,far,high],[left,far,high]],top);
  shape([[left,z,y],[right,z,y],[right,z,high],[left,z,high]],front);
}
const sceneryArt=createLiteScenery(ctx,project,poly,box);

function campusBuilding(x,z,depth,height,kind) {
  if (s.map === 'itpark') {
    const side = x < 0 ? 1 : -1;
    const style = (kind + (x > 0 ? 2 : 0)) % 5;
    if (style === 0) {
      // Ref 1: Neoclassical Limestone & White-Cornice Tower
      box(x,z,8.2,17,depth,'#e4dcc8','#d3c8b2','#f6f4ee',0,side);
      for(const cy of [4.2,13.5,16.8]) box(x,z-.06,8.7,.34,depth+.2,'#f6f4ee','#ece8de','#ffffff',cy,side);
      for(let fy=5.2;fy<16.2;fy+=2.1) box(x,z-.04,8.3,.85,depth-.6,'#5c93c4','#3e6c96','#7eb2e0',fy,side);
    } else if (style === 1) {
      // Ref 2: White-Concrete & Dark-Charcoal Exoskeleton Cyan-Glass HQ
      box(x,z,8.2,13,depth,'#edf1f6','#d5dbe4','#ffffff',0,side);
      box(x,z-.04,8.35,12.2,depth*.55,'#5fa8be','#3f7c91','#7fc2d6',.5,side);
      for(let fy=2.2;fy<12.5;fy+=2.2) box(x,z-.08,8.55,.26,depth*.58,'#3a4149','#292f36','#4b535d',fy,side);
    } else if (style === 2) {
      // Ref 3: Sleek White Portal-Frame Mirror-Blue Skyscraper Cluster
      box(x,z,7.8,19,depth*.75,'#eef2f7','#dce2ea','#ffffff',0,side);
      box(x,z-.05,6.1,16.8,depth*.68,'#6fb0e8','#4f8ec4','#98ccf5',.6,side);
      box(x+side*1.2,z-.1,4.8,4.6,4.8,'#ffffff','#dce2ea','#f8fafc',0,side);
    } else if (style === 3) {
      // Ref 4: Rounded Beige Bauhaus Studio + Rooftop Antenna Mast
      box(x,z,7.8,9.2,depth,'#cfa97e','#b89066','#dcba93',0,side);
      for(const fy of [1.6,4.4,7.0]) box(x,z-.05,8.0,1.25,depth*.7,'#144a63','#0e374a','#1c6180',fy,side);
      box(x,z-.08,4.0,3.4,2.8,'#152f47','#0e2236','#244666',0,side);
      box(x,z+1,0.22,8.5,0.22,'#82a9c4','#5e839e','#a2c5de',9.2,side);
    } else {
      // Ref 5: Futuristic S-Curved White-Ribbon Smoked-Glass Hub with Warm Glow
      box(x,z,7.6,12.2,depth,'#262e36','#1d242b','#343e47',0,side);
      for(let fy=2.4;fy<=12.0;fy+=2.4){
        box(x,z-.04,7.75,.32,depth+.1,'#f6d482','#e0b85c','#ffe6a6',fy-.42,side);
        box(x,z-.10,8.6,.42,depth+.4,'#f5f7fa','#dfe4ec','#ffffff',fy,side);
      }
    }
    return;
  }
  const width=7.5, side=x<0?1:-1, facade=x+side*width/2;
  const walls=s.map==='college'?['#aabec8','#9eb7c6','#b2c4cb']:['#c5b393','#b9b7a4','#beaa92'];
  const awning=['#8b5b42','#5e716d','#705e51'];
  box(x,z,width,height,depth,walls[kind], '#b9a28a', '#8d8270',0,side);
  box(x,z-.12,width+.26,.22,depth+.22,'#b4a384','#ad9a83','#d1c2a6',height-.12,side);
  box(x,z-.08,width+.08,.36,depth+.16,'#a48c74','#98836c','#bdaa8f',0,side);
  const window=(a,b,y)=>{
    const face=(from,to,base,top,color)=>poly([
      [facade,from,base],[facade,to,base],[facade,to,top],[facade,from,top]
    ].map(point=>{const p=project(...point);return [p.x,p.y];}),color);
    face(a,b,y,y+.96,'#9b8973');
    face(a+.08,b-.08,y+.09,y+.87,'#4b6268');
    face(a+.08,b-.08,y+.55,y+.81,'#788f90');
    const mid=(a+b)/2;
    face(mid-.035,mid+.035,y+.09,y+.87,'#c2b8a0');
    face(a-.06,b+.06,y-.08,y+.025,'#d4c7ae');
  };
  for(let from=z+.65;from+1.35<z+depth-.3;from+=2.9) {
    window(from,from+1.35,1.2);
    if(height>4) window(from,from+1.35,3.1);
  }
  for(const offset of [-2.5,-.8,.8,2.5]) {
    box(x+offset,z-.015,1.1,1.05,.025,'#8e7e66','#817361','#d4c8af',height-1.63);
    box(x+offset,z-.027,.92,.88,.023,'#566f75','#4d5b5b','#bba98c',height-1.54);
  }
  box(x,z-.03,2.1,2.27,.024,'#69655a','#716353','#8e8370',.15);
  box(x,z-.5,2.7,.15,.55,awning[kind],awning[kind],'#baa88b',2.42);
}
let lastCoins=0, pickupFlash;
function drawPickupFlash() {
  if (s.coins < lastCoins || !s.time) pickupFlash=null;
  if (s.coins > lastCoins) {
    pickupFlash={time:s.time,distance:s.distance,x:s.x*2.2,y:height(s)+.75};
  }
  lastCoins=s.coins;
  if (!pickupFlash) return;
  const progress=(s.time-pickupFlash.time)/.32;
  if (progress>=1 || progress<0) { pickupFlash=null; return; }
  const z=Math.max(-1,3-(s.distance-pickupFlash.distance)*.24);
  const p=project(pickupFlash.x,z,pickupFlash.y+.4*progress);
  ctx.save();
  ctx.globalAlpha=1-progress;
  ctx.strokeStyle='#ffedb0';
  ctx.lineWidth=Math.max(1,p.k*.047*(1-progress));
  ctx.lineCap='round';
  ctx.beginPath();
  for(let i=0;i<8;i++) {
    const angle=i*Math.PI/4+.18, reach=p.k*(.13+.45*progress);
    const dx=Math.cos(angle),dy=Math.sin(angle);
    ctx.moveTo(p.x+dx*reach,p.y+dy*reach);
    ctx.lineTo(p.x+dx*(reach+p.k*.10),p.y+dy*(reach+p.k*.10));
  }
  ctx.stroke();
  ctx.restore();
}
function girlUniform(k,cycle){
 const sway=cycle*k*.018;
 ctx.fillStyle='#191b21';ctx.beginPath();ctx.moveTo(-k*.28,-k*.91);ctx.lineTo(k*.28,-k*.91);ctx.lineTo(k*.43+sway,-k*.48);ctx.lineTo(-k*.43+sway,-k*.48);ctx.closePath();ctx.fill();
 ctx.strokeStyle='#30323a';ctx.lineWidth=k*.013;
 for(const side of [-.7,-.35,0,.35,.7]){ctx.beginPath();ctx.moveTo(side*k*.26,-k*.88);ctx.lineTo(side*k*.42+sway,-k*.49);ctx.stroke();}
 ctx.strokeStyle='#d92b36';ctx.lineWidth=k*.025;
 for(const y of [-.55,-.62]){ctx.beginPath();ctx.moveTo(-k*.40+sway,k*y);ctx.lineTo(k*.40+sway,k*y);ctx.stroke();}
 ctx.fillStyle='#e13943';for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(0,-k*1.28);ctx.lineTo(side*k*.15,-k*1.35);ctx.lineTo(side*k*.14,-k*1.18);ctx.closePath();ctx.fill();}
 ctx.fillStyle='#f0efea';ctx.fillRect(-k*.02,-k*1.30,k*.04,k*.07);
 for(const y of [1.12,1.06,1,.94])for(const side of [-1,1]){ctx.beginPath();ctx.arc(side*k*.07,-k*y,k*.014,0,Math.PI*2);ctx.fill();}
}
function podiumHero(){
 const cx=w*.5,cy=h*.66,k=Math.min(w,h*.62)*.26,female=String(character).includes('female')||String(character).includes('woman'),college=String(character).startsWith('college-')||s.map==='college';
 const breath=Math.sin((s.time||0)*3.2)*k*.018;
 const swag=s.styleAction>0?Math.sin(Math.PI*(1-s.styleAction/SWEEP_SECONDS)):0;
 ctx.save();ctx.translate(cx,cy);
 // Podium cylinder & glowing neon blue ring
 ctx.fillStyle='rgba(0,180,255,0.28)';ctx.beginPath();ctx.ellipse(0,k*.14,k*1.18,k*.30,0,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#091c3a';ctx.beginPath();ctx.ellipse(0,k*.08,k*1.04,k*.24,0,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#0e2b57';ctx.fillRect(-k*1.04,-k*.03,k*2.08,k*.11);
 ctx.fillStyle='#123970';ctx.beginPath();ctx.ellipse(0,-k*.03,k*1.04,k*.23,0,0,Math.PI*2);ctx.fill();
 ctx.strokeStyle='#00e5ff';ctx.lineWidth=Math.max(2.5,k*.045);ctx.beginPath();ctx.ellipse(0,-k*.03,k*.92,k*.19,0,0,Math.PI*2);ctx.stroke();
 ctx.fillStyle='rgba(10,25,35,0.32)';ctx.beginPath();ctx.ellipse(0,-k*.02,k*.52,k*.11,0,0,Math.PI*2);ctx.fill();
 // Legs, socks & shoes
 for(const side of [-1,1]){
  const lx=side*k*.20;
  ctx.strokeStyle=college?'#243b55':female?'#d89a72':'#d9986f';ctx.lineWidth=k*.16;ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(lx,-k*.82);ctx.lineTo(lx,-k*.25);ctx.stroke();
  if(!college){
   ctx.strokeStyle='#f5f7fa';ctx.lineWidth=k*.165;
   ctx.beginPath();ctx.moveTo(lx,-k*.33);ctx.lineTo(lx,-k*.10);ctx.stroke();
  }
  ctx.fillStyle=college?'#f8fafc':'#181c24';
  ctx.beginPath();ctx.ellipse(lx+side*k*.02,-k*.06,k*.14,k*.08,0,0,Math.PI*2);ctx.fill();
  if(college){ctx.fillStyle='#ef4444';ctx.fillRect(lx-k*.10,-k*.08,k*.20,k*.03);}
 }
 // Shorts or pleated skirt
 ctx.save();ctx.translate(0,breath);
 if(female&&!college){
  girlUniform(k,swag*.5);
 }else if(female&&college){
  ctx.fillStyle='#2b4c7e';ctx.beginPath();ctx.moveTo(-k*.30,-k*.92);ctx.lineTo(k*.30,-k*.92);ctx.lineTo(k*.38,-k*.50);ctx.lineTo(-k*.38,-k*.50);ctx.closePath();ctx.fill();
 }else{
  ctx.fillStyle=college?'#1e3a5f':'#1b4d3e';
  ctx.beginPath();ctx.roundRect(-k*.33,-k*.92,k*.31,k*.40,k*.06);ctx.roundRect(k*.02,-k*.92,k*.31,k*.40,k*.06);ctx.fill();
 }
 // Torso / Shirt / Uniform
 const shirtColor=female?(college?'#e8dff5':'#191b21'):(college?'#1e88a8':'#f4f6f8');
 ctx.fillStyle=shirtColor;
 ctx.beginPath();ctx.roundRect(-k*.37,-k*1.58,k*.74,k*.72,k*.16);ctx.fill();
 if(female&&!college){
  girlUniform(k,swag*.4);
 }else if(!female&&!college){
  // Backpack straps, navy tie, gold tie clip, school crest badge
  ctx.fillStyle='#16243a';ctx.fillRect(-k*.31,-k*1.55,k*.08,k*.62);ctx.fillRect(k*.23,-k*1.55,k*.08,k*.62);
  ctx.fillStyle='#10254c';ctx.beginPath();ctx.moveTo(-k*.05,-k*1.48);ctx.lineTo(k*.05,-k*1.48);ctx.lineTo(k*.07,-k*1.04);ctx.lineTo(0,-k*.95);ctx.lineTo(-k*.07,-k*1.04);ctx.closePath();ctx.fill();
  ctx.fillStyle='#ffd700';ctx.fillRect(-k*.055,-k*1.28,k*.11,k*.032);
  ctx.fillStyle='#12326b';ctx.strokeStyle='#ffd700';ctx.lineWidth=k*.02;
  ctx.beginPath();ctx.roundRect(k*.11,-k*1.36,k*.11,k*.13,k*.03);ctx.fill();ctx.stroke();
 }else if(college){
  ctx.fillStyle=female?'#c084fc':'#ffd166';
  ctx.beginPath();ctx.roundRect(-k*.16,-k*1.42,k*.32,k*.12,k*.04);ctx.fill();
 }
 // Arms (with shoulder-sweep gesture support)
 for(const side of [-1,1]){
  const gestureArm=side===1&&swag>0;
  ctx.strokeStyle=shirtColor;ctx.lineWidth=k*.15;ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(side*k*.36,-k*1.46);
  const ex=gestureArm?side*k*(.52-.18*swag):side*k*.46;
  const ey=gestureArm?-k*(1.22+.32*swag):-k*1.15;
  ctx.lineTo(ex,ey);ctx.stroke();
  ctx.strokeStyle='#d99470';ctx.lineWidth=k*.13;
  const hx=gestureArm?-k*.12*swag:side*k*.42;
  const hy=gestureArm?-k*(1.46+.06*swag):-k*.86;
  ctx.beginPath();ctx.moveTo(ex,ey);ctx.lineTo(hx,hy);ctx.stroke();
  ctx.fillStyle='#e2a380';ctx.beginPath();ctx.arc(hx,hy,k*.07,0,Math.PI*2);ctx.fill();
 }
 // Neck & Head
 ctx.fillStyle='#c98663';ctx.fillRect(-k*.09,-k*1.68,k*.18,k*.14);
 ctx.fillStyle='#df9b76';ctx.beginPath();ctx.ellipse(0,-k*1.92,k*.31,k*.34,0,0,Math.PI*2);ctx.fill();
 // Hair & Cap
 ctx.fillStyle='#231f28';
 if(female){
  ctx.beginPath();ctx.ellipse(0,-k*2.04,k*.34,k*.24,0,Math.PI,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.ellipse(-k*.28,-k*1.86,k*.10,k*.28,.2,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.ellipse(k*.29,-k*1.82,k*.12,k*.32,-.25,0,Math.PI*2);ctx.fill();
 }else{
  ctx.beginPath();ctx.ellipse(0,-k*2.04,k*.32,k*.19,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#ff5722';ctx.beginPath();ctx.ellipse(0,-k*2.13,k*.33,k*.16,0,Math.PI,Math.PI*2);ctx.fill();
  ctx.fillStyle='#d84315';ctx.beginPath();ctx.ellipse(k*.16,-k*2.11,k*.28,k*.06,.12,0,Math.PI*2);ctx.fill();
 }
 // Eyes, brows, glasses (for boy), and smile
 for(const side of [-1,1]){
  const ex=side*k*.12,ey=-k*1.91;
  ctx.fillStyle='#ffffff';ctx.beginPath();ctx.ellipse(ex,ey,k*.058,k*.046,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#1f2430';ctx.beginPath();ctx.arc(ex,ey,k*.032,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#ffffff';ctx.beginPath();ctx.arc(ex-k*.01,ey-k*.01,k*.011,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#231f28';ctx.lineWidth=k*.024;
  ctx.beginPath();ctx.moveTo(ex-k*.06,ey-k*.075);ctx.quadraticCurveTo(ex,ey-k*.095,ex+k*.06,ey-k*.07);ctx.stroke();
  if(!female){
   ctx.strokeStyle='#151922';ctx.lineWidth=k*.024;
   ctx.beginPath();ctx.roundRect(ex-k*.09,ey-k*.06,k*.18,k*.12,k*.03);ctx.stroke();
  }
 }
 if(!female){ctx.strokeStyle='#151922';ctx.lineWidth=k*.024;ctx.beginPath();ctx.moveTo(-k*.03,-k*1.91);ctx.lineTo(k*.03,-k*1.91);ctx.stroke();}
 ctx.strokeStyle='#7c3638';ctx.lineWidth=k*.026;ctx.beginPath();ctx.arc(0,-k*1.77,k*.065,.15*Math.PI,.85*Math.PI);ctx.stroke();
 ctx.restore();ctx.restore();
}
function runner(){if(s.mode==='ready'||s.mode==='select'||s.mode==='intro'){podiumHero();return;}const female=String(character).includes('female')||String(character).includes('woman'),college=String(character).startsWith('college-')||s.map==='college';const p=project(s.x*2.2,3),k=p.k*1.12,y=p.y-height(s)*k,slide=!!(s.slide||s.roll);ctx.save();ctx.translate(p.x,p.y);ctx.fillStyle='#172f3740';ctx.beginPath();ctx.ellipse(0,3,k*.43,k*.15,0,0,Math.PI*2);ctx.fill();ctx.restore();ctx.save();ctx.translate(p.x,y);const cycle=s.mode==='running'?Math.sin(s.time*16):.15;if(s.roll){const angle=2*Math.PI*(1-s.roll/ROLL_DURATION);ctx.translate(0,-k*.65);ctx.rotate(angle);ctx.scale(.84,.7);ctx.translate(0,k*.65);}else if(slide){ctx.rotate(-.25);ctx.scale(1,.5);}else if(s.hit){ctx.rotate(.32*Math.sin(Math.PI*s.hit/HIT_DURATION));}else if(s.mode==='crashed'||s.mode==='falling'){const progress=1-s.fall/FALL_DURATION;ctx.rotate(-.85*progress);ctx.scale(1,1-.45*progress);}ctx.lineCap='round';ctx.strokeStyle='#213c4b';ctx.lineWidth=k*.18;for(const sign of [-1,1]){ctx.beginPath();ctx.moveTo(sign*k*.16,-k*.65);ctx.lineTo(sign*k*.18+cycle*sign*k*.15,-k*.3);ctx.lineTo(sign*k*.18-cycle*sign*k*.2,0);ctx.stroke();ctx.strokeStyle=female?'#171b21':'#e8e8d8';ctx.lineWidth=k*.16;ctx.beginPath();ctx.moveTo(sign*k*.18-cycle*sign*k*.2,0);ctx.lineTo(sign*k*.18-cycle*sign*k*.2+k*.13,0);ctx.stroke();ctx.strokeStyle='#213c4b';ctx.lineWidth=k*.18;}ctx.fillStyle=female?(college?'#e8e2d2':'#191b21'):(college?'#368399':'#eef0e9');ctx.beginPath();ctx.roundRect(-k*.32,-k*1.4,k*.64,k*.8,k*.15);ctx.fill();ctx.strokeStyle=female?'#191b21':'#e4ae83';ctx.lineWidth=k*.15;for(const sign of [-1,1]){ctx.beginPath();ctx.moveTo(sign*k*.31,-k*1.28);ctx.lineTo(sign*k*.46,-k*.9+cycle*sign*k*.18);ctx.lineTo(sign*k*.35,-k*.75+cycle*sign*k*.25);ctx.stroke();}ctx.fillStyle='#d99470';ctx.beginPath();ctx.arc(0,-k*1.63,k*.27,0,Math.PI*2);ctx.fill();ctx.fillStyle='#273a38';ctx.beginPath();ctx.ellipse(0,-k*1.78,k*.29,k*.18,0,0,Math.PI*2);ctx.fill();if(female){ctx.beginPath();ctx.ellipse(k*.2,-k*1.51,k*.16,k*.35,-.3,0,Math.PI*2);ctx.fill();}if(female&&!college)girlUniform(k,cycle);else{ctx.fillStyle='#0c1b33';ctx.strokeStyle='#ffd700';ctx.lineWidth=k*.018;ctx.beginPath();ctx.roundRect(-k*.15,-k*1.28,k*.30,k*.22,k*.04);ctx.fill();ctx.stroke();ctx.fillStyle='#ffd700';ctx.font='bold '+(k*.07)+'px sans-serif';ctx.textAlign='center';ctx.fillText('LMSK',0,-k*1.20);ctx.fillStyle='#ffffff';ctx.font='bold '+(k*.042)+'px sans-serif';ctx.fillText('—LifeRush—',0,-k*1.11);}ctx.restore();}
function mutant(pose, z){
  const p = project(pose.x, z), k = p.k;
  const cycle = Math.sin(pose.stride*17) * (1-pose.stop);
  ctx.save();
  ctx.translate(p.x,p.y);
  ctx.lineCap = 'round';
  ctx.lineWidth = k*.26;
  ctx.strokeStyle = '#48423d';
  for (const side of [-1,1]) {
    ctx.beginPath();
    ctx.moveTo(side*k*.16,-k*.72);
    ctx.lineTo(side*k*.23+side*cycle*k*.17,-k*.33);
    ctx.lineTo(side*k*.19-side*cycle*k*.20,0);
    ctx.stroke();
    ctx.strokeStyle = '#77705a';
    ctx.beginPath();
    ctx.moveTo(side*k*.34,-k*1.25);
    ctx.lineTo(side*k*.61,-k*.99+side*cycle*k*.12);
    ctx.lineTo(side*k*.55,-k*.72+side*cycle*k*.17);
    ctx.stroke();
    ctx.strokeStyle = '#48423d';
  }
  ctx.fillStyle = '#817761';
  ctx.beginPath();
  ctx.ellipse(0,-k*1.08,k*.44,k*.4,0,0,Math.PI*2);
  ctx.fill();
  ctx.fillStyle = '#48423d';
  ctx.fillRect(-k*.26,-k*.88,k*.52,k*.23);
  ctx.fillStyle = '#a09372';
  ctx.beginPath();
  ctx.ellipse(0,-k*1.44,k*.24,k*.25,0,0,Math.PI*2);
  ctx.fill();
  ctx.restore();
}
function school(scenery) {
  const finalRun=s.map==='finalrun',gateDistance=finalRun?FINALRUN_GATE:SCHOOL_GATE,shift=gateDistance-SCHOOL_GATE;
  const relative = at => 3+at+shift-s.distance;
  const gate = relative(SCHOOL_GATE);
  if (gate > -.9 && gate < 190) scenery.push({z:gate,draw:()=>{
    for(const side of [-1,1])box(side*4,gate,.66,4.72,.65,'#ffedc7','#d9ae8a','#fff5cf');
    box(0,gate,8.05,1.18,.30,'#19505d','#153e49','#21a895',3.84);
    const p=project(0,gate,4.36);
    ctx.fillStyle='#fff3db';ctx.textAlign='center';ctx.font='900 '+p.k*.31+'px system-ui';
    ctx.fillText(s.map==='college'?'RUNVERSE COLLEGE':s.map==='itpark'?'LMSK IT PARK':'RUNVERSE SCHOOL',p.x,p.y);
  }});
  const van=s.entryVan,x=van.lane*2.2,vanShift=0;
  const vanRelative=at=>3+at+vanShift-s.distance,ramp=vanRelative(van.ramp),rear=vanRelative(van.rear),front=vanRelative(van.front);
  for (const side of [-1,1]) {
    const z=Math.max(-1,relative(15));
    if(relative(35)>-1&&z<190) scenery.push({z,draw:()=>campusBuilding(side*8.2,z,Math.max(1,relative(35)-z),side<0?4.75:3.8,side<0?0:2)});
  }
  if(front>-.9&&front<190)scenery.push({z:Math.max(-1,rear),draw:()=>{
    sceneryArt.bus(x,rear,front,van.width,van.roof,true);
  }});
  if(rear>-.9&&ramp<190)scenery.push({z:Math.max(-1,ramp),draw:()=>{
    const near=Math.max(-1,ramp);
    const y=van.roof*(near-ramp)/(rear-ramp);
    const left=x-van.width/2,right=x+van.width/2;
    poly([[left,near,y],[right,near,y],[right,rear,van.roof],[left,rear,van.roof]].map(p=>{
      const q=project(...p);return [q.x,q.y];
    }),'#3e847d');
    for(let n=1;n<=7;n++){
      const t=n/8,z=ramp+t*(rear-ramp);
      if(z<near)continue;
      const a=project(left+.1,z,t*van.roof),b=project(right-.1,z,t*van.roof);
      ctx.strokeStyle='#ffe18c';ctx.lineWidth=3;
      ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
    }
  }});
  s.entryCoins.forEach((at,i)=>{
    const z=vanRelative(at);
    if(z<-.9||z>190||(s.roofCoins&(1<<i)))return;
    scenery.push({z:Math.max(-1,rear)-.03,draw:()=>{
      const p=project(x,z,van.roof+.58);
      drawLiteCoin(ctx,p,s.time,i);
    }});
  });
}
function drawCollegeVan(x,z1,z2,width,roof){
 const d=Math.max(.5,z2-z1);
 box(x,z1,width,roof-.4,d,'#0ea5a4','#0d9488','#f1f5f9',.35);
 box(x,z1,width*.88,roof*.25,.14,'#1f4b68','#1e3a5f','#0ea5a4',roof*.62);
}
function traffic(scenery) {
 const isCol=s.map==='college'||s.map==='itpark';
 for(const v of repeatedVans(s.distance,s.runSeed)) {
  const rear=3+v.rear-s.distance,front=3+v.front-s.distance,ramp=3+v.ramp-s.distance,x=v.lane*2.2;
  if(front<0||ramp>145)continue;
  const near=Math.max(-1,rear);
  scenery.push({z:near,draw:()=>{
   if(isCol)drawCollegeVan(x,rear,front,v.width,v.roof);
   else sceneryArt.bus(x,rear,front,v.width,v.roof,true);
   for(let i=0;i<4;i++){
    const z=rear+2+i*4;if(z<0||s.collected.includes(v.id+':'+i))continue;
    const p=project(x,z,v.roof+.58);drawLiteCoin(ctx,p,s.time,i);
   }
  }});
  if(rear>0 && v.rear>v.ramp)scenery.push({z:Math.max(-1,ramp),draw:()=>{
   const near=Math.max(-1,ramp),y=v.roof*(near-ramp)/(rear-ramp),left=x-v.width/2,right=x+v.width/2;
   poly([[left,near,y],[right,near,y],[right,rear,v.roof],[left,rear,v.roof]].map(p=>{const q=project(...p);return[q.x,q.y];}),'#3e847d');
   for(let i=1;i<8;i++){const t=i/8,z=ramp+t*(rear-ramp);if(z<near)continue;const a=project(left+.1,z,t*v.roof),b=project(right-.1,z,t*v.roof);ctx.strokeStyle='#ffe18c';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}
  }});
 }
 for(const o of s.items) {
  if(o.cleared||(o.encounter&&!o.started)||o.type!=='bus')continue;
  const z=3+o.z-s.distance;if(z+o.length<0||z>145)continue;
  const near=Math.max(-1,z),x=o.lane*2.2;
  scenery.push({z:near,draw:()=>{
   if(o.metro){
    box(x,z,1.90,o.roof,o.length,'#1d56b8','#143d85','#e5e9ee');
    box(x,z-.02,1.92,.22,o.length,'#f2a61e','#d98a10','#f5b324',o.roof*.46);
    box(x,z-.03,1.91,.24,o.length-.2,'#eef2f6','#cbd5e1','#ffffff',o.roof*.55);
    box(x,z-.04,1.50,o.roof*.22,.16,'#1a2e3c','#111827','#2b4454',o.roof*.66);
    for(const side of [-1,1]) box(x+side*.14,z-.05,.18,.14,.09,'#fffbe0','#fff0a0','#ffffff',o.roof*.56);
   }else if(isCol&&o.roofRide){
    drawCollegeVan(x,z,z+o.length,1.90,o.roof||2.8);
   }else if(isCol&&o.collegeKind==='scooty'){
    box(x,z,.46,1.15,2.1,'#0ea5e9','#0284c7','#f8fafc',.18);
    box(x,z,0.34,.55,.55,'#1e293b','#0f172a','#ef4444',1.05);
   }else if(isCol){
    box(x,z,1.74,.78,Math.min(o.length,4.6),'#cf3241','#991b1b','#1f4b68',.24);
   }else{
    sceneryArt.bus(x,z,z+o.length,1.94,2.8,Boolean(o.roofRide));
   }
   if(o.roofRide){for(let i=0;i<4;i++){const cz=z+4+i*4;if(cz<0||s.collected.includes(o.id+':'+i))continue;const p=project(x,cz,3.4);drawLiteCoin(ctx,p,s.time,i);}}
  }});
 }
}

function capturePortrait(){
  const {lift,laugh,show,gesture}=capturePose(s), unit=Math.min(w/4,h/6);
  const center=w*.5, top=h*.47, monsterX=center+unit*.62, playerX=center-unit*.59;
  const playerY=top+unit*(.52-.82*lift-.10*show);
  const creatureY=top+unit*(.05-.085*laugh);
  const oval=(x,y,rx,ry,color)=>{
    ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();
  };
  ctx.fillStyle='#151827a6';
  ctx.fillRect(0,0,w,h);
  oval(monsterX,creatureY+unit*1.12,unit*.84,unit*1.0,'#5c594d');
  const hero = unit * (1-.17*lift);
  ctx.lineCap='round';
  for(const side of [-1,1]){
    const sway=Math.sin(s.capture*4.8+side*.8)*hero*.09*lift;
    const hip=playerX+side*hero*.14;
    ctx.strokeStyle='#343b4c';
    ctx.lineWidth=hero*.19;
    ctx.beginPath();ctx.moveTo(hip,playerY+hero*1.22);
    ctx.lineTo(hip+sway,playerY+hero*(1.79+.20*lift));ctx.stroke();
    oval(hip+sway,playerY+hero*(1.83+.20*lift),hero*.116,hero*.075,'#b5babd');
  }
  oval(playerX,playerY+hero*.81,hero*.38,hero*.66,(String(character).includes('female')||String(character).includes('woman'))?'#191b21':'#515465');
  oval(playerX,playerY,hero*.34,hero*.40,'#c9956e');
  oval(playerX,playerY-hero*.22,hero*.36,hero*.23,'#25222a');
  for(const side of [-1,1]){
    oval(playerX+side*hero*.13,playerY,hero*.075,hero*.055,'#f9e7d3');
    oval(playerX+side*hero*.125,playerY,hero*.028,hero*.036,'#292737');
  }
  oval(playerX,playerY+hero*.16,hero*.073,hero*.048,'#663d3b');
  oval(monsterX,creatureY,unit*.48,unit*.49,'#91846b');
  for(const side of [-1,1]){
    oval(monsterX+side*unit*.18,creatureY-unit*.06,unit*.08,unit*.04,'#80eacb');
  }
  oval(monsterX,creatureY+unit*.19,unit*.25,unit*(.075+.075*laugh),'#39252c');
  oval(monsterX,creatureY+unit*.16,unit*.19,unit*.034,'#eae0bd');
  ctx.lineCap='round';ctx.lineWidth=unit*.25;ctx.strokeStyle='#77705a';
  ctx.beginPath();ctx.moveTo(monsterX-unit*.5,creatureY+unit*.55);
  ctx.quadraticCurveTo(center,playerY+unit*.74,playerX+hero*.29,playerY+hero*.42);
  ctx.stroke();
  oval(playerX+hero*.28,playerY+hero*.43,unit*.18,unit*.13,'#a09372');
  if(gesture>0){
    const brush=Math.sin(Math.PI*Math.min(1,(s.capture-CAPTURE_GESTURE_START)/SWEEP_SECONDS));
    ctx.strokeStyle='#77705a';ctx.lineWidth=unit*.22;ctx.beginPath();
    ctx.moveTo(monsterX+unit*.55,creatureY+unit*.55);
    ctx.quadraticCurveTo(monsterX+unit*.95,creatureY+unit*.95,monsterX+unit*(.42-.30*brush),creatureY+unit*(.7-.30*gesture));ctx.stroke();
    oval(monsterX+unit*(.42-.30*brush),creatureY+unit*(.7-.30*gesture),unit*.16,unit*.12,'#a09372');
  }
}
let collegeRainArt;
function draw(){ctx.clearRect(0,0,w,h);const sky=ctx.createLinearGradient(0,0,0,h*.58);const weather=sceneWeather(s);sky.addColorStop(0,weatherColor(weather.a.top,weather.b.top,weather.mix));sky.addColorStop(1,weatherColor(weather.a.horizon,weather.b.horizon,weather.mix));ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
if(weather.night>.4){ctx.fillStyle='#e4efff';for(let i=0;i<65;i++)ctx.fillRect((i*137%1000)/1000*w,(i*73%300)/1000*h,1.5,1.5);ctx.beginPath();ctx.arc(w*.72,h*.15,w*.034,0,Math.PI*2);ctx.fill();}else if(weather.rain<.7||(weather.sun||0)>.3){ctx.fillStyle='#fff1c6';ctx.beginPath();ctx.arc(w*(.7-weather.phase*.3),h*.17,w*.04,0,Math.PI*2);ctx.fill();}
if((weather.rainbow||0)>.01){
 ctx.save();
 const rbAlpha=Math.min(0.92,weather.rainbow*.92);
 const cx=w*.5,cy=h*.48,rBase=Math.min(w,h)*.35;
 const rbCols=[
  'rgba(255,30,20,',
  'rgba(255,125,5,',
  'rgba(255,230,10,',
  'rgba(25,225,65,',
  'rgba(0,210,245,',
  'rgba(25,75,245,',
  'rgba(165,30,220,'
 ];
 ctx.lineCap='round';
 rbCols.forEach((col,idx)=>{
  ctx.strokeStyle=col+rbAlpha+')';
  ctx.lineWidth=Math.max(1.8,w*.0075);
  ctx.beginPath();
  ctx.arc(cx,cy,rBase+(3-idx)*(w*.0072),Math.PI*1.12,Math.PI*1.88);
  ctx.stroke();
 });
 ctx.restore();
}
sceneryArt.cloudLayer(w,h,s.time,weather);
const hills=ctx.createLinearGradient(0,h*.25,0,h*.48);
hills.addColorStop(0,weatherColor('#9faea8','#47596b',weather.night));
hills.addColorStop(1,weatherColor('#81917c','#293d43',weather.night));
ctx.fillStyle=hills;
ctx.beginPath();ctx.moveTo(0,h*.37);
ctx.bezierCurveTo(w*.12,h*.24,w*.21,h*.22,w*.32,h*.33);
ctx.bezierCurveTo(w*.41,h*.39,w*.47,h*.26,w*.55,h*.28);
ctx.bezierCurveTo(w*.67,h*.30,w*.74,h*.42,w,h*.32);
ctx.lineTo(w,h);ctx.lineTo(0,h);ctx.closePath();ctx.fill();
const verge=ctx.createLinearGradient(0,h*.36,0,h);
verge.addColorStop(0,weatherColor('#849777','#334b43',weather.night));
verge.addColorStop(1,weatherColor('#53664a','#263f38',weather.night));
ctx.fillStyle=verge;ctx.fillRect(0,h*.359,w,h);
const seaBridge=s.map==='itpark' && s.activeBranch==='skybridge';
if(seaBridge){
 const depth=Math.min(s.distance-s.branchStart,s.branchEnd-s.distance);
 ctx.save();ctx.globalAlpha=Math.max(0,Math.min(1,depth/110));
 const water=ctx.createLinearGradient(0,h*.31,0,h);
 water.addColorStop(0,weatherColor('#87c7d2','#294659',weather.night));
 water.addColorStop(1,weatherColor('#128da7','#10334e',weather.night));
 ctx.fillStyle=water;ctx.fillRect(0,h*.31,w,h*.69);ctx.restore();
}
const flight=flightPhase(s.time);if(flight<1){ctx.save();const proximity=1/Math.max(.065,1-.98*flight);ctx.translate(w*(.56-.012*proximity),h*(.30-.048*proximity));ctx.rotate(-Math.PI/2);ctx.scale(w*proximity/3600,w*proximity/3600);drawAirliner(ctx);ctx.restore();}
sceneryArt.road(s.distance,weather);
const collegeRain=hasCollegeRain(s);
if(collegeRain){
 collegeRainArt ??= createLiteCollegeRain(ctx,project);
 collegeRainArt.surface(s);
}
const scenery=[];
if(s.map==='itpark' && s.activeBranch==='underpass'){
 const end=Math.min(130,s.branchEnd-s.distance);
 for(let world=Math.floor(s.distance/4)*4;world<s.distance+end;world+=4){
  const z=Math.max(.1,world-s.distance+3);
  for(const lane of [-1,0,1]){
   for(const dx of [-.6,.6]) box(lane*2.2+dx,z,.08,.10,4,'#bbcbd5','#516477','#e3eaf4');
   box(lane*2.2,z,1.6,.04,.23,'#4a4052','#52465b','#534857');
  }
  if(world%12===0) scenery.push({z,draw:()=>{
   for(const side of [-1,1]){
    box(side*4.6,z,.7,6,12,'#35405d','#302e50','#6e5485');
    box(side*4.18,z,.1,.18,11,side<0?'#ff538a':'#22e0dd');
   }
  }});
 }
}
school(scenery);traffic(scenery);
if(s.map==='finalrun')scenery.push(...sceneryArt.village(s.distance,s.time));
else for(let slot=0;slot<CAMPUS_SLOTS;slot++){
 const anchor=campusAnchor(slot,s.distance),kind=campusKind(anchor),z=anchor-s.distance+3;
 const coast=seaBridge ? branchForkClearance(anchor,s) : null;
 if(coast?.hide || z+16<0||z-16>180)continue;
 scenery.push({z:Math.max(.1,z-16),draw:()=>{
  const front=Math.max(.1,z-13),length=Math.max(.1,z+13-front);
  for(const side of [-1,1]){
   box(side*(4.9+(coast?.spreadX||0)),front,.22,.5,length,'#a2ad91','#7e8e77','#b8bda4');
   const building=(side===-1 && (kind===0||kind===2))||(side===1&&kind===1);
   if(building){
    campusBuilding(side*(9.5+(coast?.spreadX||0)),front,length,[5.65,4.2,5.1][kind],kind);
   }else if((kind===1&&side===-1)||(kind===2&&side===1)){
    box(side*(10+(coast?.spreadX||0)),front,9,.05,length,'#608e69','#608e69','#608e69');
    if(z>0){for(const dx of [-1.5,1.5])box(side*(10+(coast?.spreadX||0))+dx,z,.1,2.1,.1,'#eee9d6');box(side*(10+(coast?.spreadX||0)),z,3.1,.1,.1,'#eee9d6','#eee9d6','#eee9d6',2.1);}
   }else if(kind===3&&side===1){
    box(10,front,8,.08,length,'#727b7d','#727b7d','#727b7d');
    for(const dz of [-7,1,8])if(z+dz>0){sceneryArt.bus(10+(coast?.spreadX||0),z+dz,z+dz+4.5,2,1.8,true);}
   }else{for(const dz of [-8,0,8])if(z+dz>0){sceneryArt.tree(side*(8+(coast?.spreadX||0)),z+dz,.1,s.distance);box(side*(6+(coast?.spreadX||0)),z+dz,1.8,.5,.6,'#a98760');}}
  }
 }});
}
for(const o of s.items){if(o.type==='bus'||['book','skill'].includes(o.type)||(o.encounter&&!o.started))continue;const z=o.z-s.distance+3;if(z<0||z>145||o.done)continue;scenery.push({z,draw:()=>{const x=o.type==='sideVehicle'?sideVehicleX(o,s.time):o.lane*2.2;if(o.type==='sideVehicle'){box(x,z,1.6,o.variant==='car'?1.3:1.8,3.2,o.variant==='car'?'#e54a39':'#315d85');const p=project(x,z,1);ctx.fillStyle='#fff';ctx.font='bold '+p.k*.3+'px sans-serif';ctx.textAlign='center';ctx.fillText(o.variant.toUpperCase(),p.x,p.y);}else if(o.type==='block'){box(x,z,1.3,2.4,1.1,'#9b7bd1','#8d624a','#dba573');const p=project(x,z,1.2);ctx.strokeStyle='#edc095';ctx.lineWidth=p.k*.06;ctx.beginPath();ctx.moveTo(p.x-p.k*.5,p.y-p.k*.7);ctx.lineTo(p.x+p.k*.5,p.y+p.k*.7);ctx.moveTo(p.x+p.k*.5,p.y-p.k*.7);ctx.lineTo(p.x-p.k*.5,p.y+p.k*.7);ctx.stroke();}else if(o.type==='jump'){box(x,z,1.8,.75,.4,'#ff804f','#af5934','#f0b269');const p=project(x,z,.4);ctx.fillStyle='#ffe5a3';ctx.fillRect(p.x-p.k*.7,p.y-p.k*.1,p.k*1.4,p.k*.12);}else if(o.type==='slide'){box(x-.85,z,.16,2.6,.25,'#387971');box(x+.85,z,.16,2.6,.25,'#387971');box(x,z,1.85,1,.3,'#28c4c8','#2f6865','#9bc4a5',1.6);const p=project(x,z,2);ctx.fillStyle='#e6f1cb';ctx.font='bold '+p.k*.45+'px Arial';ctx.textAlign='center';ctx.fillText('↓',p.x,p.y);}else if(o.type==='coin'){drawLiteCoin(ctx,project(x,z,1.1),s.time,o.z);}else if(pickupTypes.has(o.type)){drawLitePowerup(ctx,project(x,z,1.1+Math.sin(s.time*3+o.z)*.1),o.type,s.time);}}});}

for(const f of s.coinFlights){const p=Math.min(1,f.elapsed/f.duration),blend=1-Math.pow(1-p,2),x=f.x+(s.x*2.2-f.x)*blend,z=3+(f.z-s.distance)*(1-blend),y=f.y+(height(s)+1.05-f.y)*blend+Math.sin(p*Math.PI)*.28;scenery.push({z:Math.max(.1,z),draw:()=>drawLiteCoin(ctx,project(x,z,y),s.time,0)});}
scenery.push({z:3,draw:runner});const pursuit=chasePose(s);if(pursuit){const z=3-pursuit.z*.72;scenery.push({z,draw:()=>mutant(pursuit,z)});}scenery.sort((a,b)=>b.z-a.z).forEach(o=>o.draw());drawPickupFlash();if(collegeRain)collegeRainArt.shower(s,w,h);else if(weather.rain>.05){ctx.strokeStyle=`rgba(205,229,255,${weather.rain*.6})`;ctx.lineWidth=1;ctx.beginPath();for(let i=0;i<90;i++){const x=i*73%w,y=((i*97+s.time*600)%h);ctx.moveTo(x,y);ctx.lineTo(x-3,y+14);}ctx.stroke();}if(isCapture(s))capturePortrait();const shade=ctx.createLinearGradient(0,h*.75,0,h);shade.addColorStop(0,'#183c3800');shade.addColorStop(1,'#183c3888');ctx.fillStyle=shade;ctx.fillRect(0,h*.75,w,h*.25);}
resize();return (state,choice)=>{s=state;character=choice;if(ctx)draw();return 'ready';};}
