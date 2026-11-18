import {weatherAt,weatherColor} from './weather.js';
import {campusAnchor,campusKind,CAMPUS_SLOTS} from './campus-layout.js';
import {repeatedVans,sideVehicleX} from './traffic-rules.js';
import {height,chasePose,capturePose,isCapture,SCHOOL_GATE,SCHOOL_VAN,ROOF_COINS,ROLL_DURATION,FALL_DURATION,HIT_DURATION} from './engine.js';
export function createLiteRenderer(canvas){let s,character,w=600,h=700;const ctx=canvas.getContext('2d');
function resize(){const r=canvas.getBoundingClientRect();w=r.width;h=r.height;const d=Math.min(devicePixelRatio||1,2);canvas.width=w*d;canvas.height=h*d;ctx.setTransform(d,0,0,d,0,0);}new ResizeObserver(resize).observe(canvas);
const poly=(points,color)=>{ctx.fillStyle=color;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();};
function project(x,z,y=0){const p=10/(z+10);return {x:w/2+(x-s.x*.55)*w*.15*p,y:h*.30+h*.75*p-y*h*.12*p,k:h*.12*p};}
function box(x,z,ww,hh,dd,color,side='#a46e43',top='#d0a46b',y=0){const a=project(x-ww/2,z,y),b=project(x+ww/2,z,y),c=project(x+ww/2,z,y+hh),d=project(x-ww/2,z,y+hh),e=project(x+ww/2,z+dd,y+hh),f=project(x-ww/2,z+dd,y+hh),g=project(x+ww/2,z+dd,y);poly([[a.x,a.y],[b.x,b.y],[c.x,c.y],[d.x,d.y]],color);poly([[b.x,b.y],[g.x,g.y],[e.x,e.y],[c.x,c.y]],side);poly([[d.x,d.y],[c.x,c.y],[e.x,e.y],[f.x,f.y]],top);}
function tree(x,z,variant){const p=project(x,z),k=p.k;ctx.fillStyle='#6c7860';ctx.fillRect(p.x-k*.08,p.y-k*.9,k*.16,k);poly([[p.x-k*.75,p.y-k*.6],[p.x,p.y-k*(2.3+variant)],[p.x+k*.75,p.y-k*.6]],'#377c6b');poly([[p.x,p.y-k*(2.3+variant)],[p.x+k*.75,p.y-k*.6],[p.x,p.y-k*.6]],'#235b57');}
function runner(){const p=project(s.x*2.2,3),k=p.k*1.12,y=p.y-height(s)*k,slide=!!(s.slide||s.roll);ctx.save();ctx.translate(p.x,p.y);ctx.fillStyle='#172f3740';ctx.beginPath();ctx.ellipse(0,3,k*.43,k*.15,0,0,Math.PI*2);ctx.fill();ctx.restore();ctx.save();ctx.translate(p.x,y);const cycle=s.mode==='running'?Math.sin(s.time*16):.15;if(s.roll){const angle=2*Math.PI*(1-s.roll/ROLL_DURATION);ctx.translate(0,-k*.65);ctx.rotate(angle);ctx.scale(.84,.7);ctx.translate(0,k*.65);}else if(slide){ctx.rotate(-.25);ctx.scale(1,.5);}else if(s.hit){ctx.rotate(.32*Math.sin(Math.PI*s.hit/HIT_DURATION));}else if(s.mode==='crashed'||s.mode==='falling'){const progress=1-s.fall/FALL_DURATION;ctx.rotate(-.85*progress);ctx.scale(1,1-.45*progress);}ctx.lineCap='round';ctx.strokeStyle='#213c4b';ctx.lineWidth=k*.18;for(const sign of [-1,1]){ctx.beginPath();ctx.moveTo(sign*k*.16,-k*.65);ctx.lineTo(sign*k*.18+cycle*sign*k*.15,-k*.3);ctx.lineTo(sign*k*.18-cycle*sign*k*.2,0);ctx.stroke();ctx.strokeStyle='#e8e8d8';ctx.lineWidth=k*.16;ctx.beginPath();ctx.moveTo(sign*k*.18-cycle*sign*k*.2,0);ctx.lineTo(sign*k*.18-cycle*sign*k*.2+k*.13,0);ctx.stroke();ctx.strokeStyle='#213c4b';ctx.lineWidth=k*.18;}ctx.fillStyle=character==='female'?'#b75e68':'#eef0e9';ctx.beginPath();ctx.roundRect(-k*.32,-k*1.4,k*.64,k*.8,k*.15);ctx.fill();ctx.strokeStyle='#e4ae83';ctx.lineWidth=k*.15;for(const sign of [-1,1]){ctx.beginPath();ctx.moveTo(sign*k*.31,-k*1.28);ctx.lineTo(sign*k*.46,-k*.9+cycle*sign*k*.18);ctx.lineTo(sign*k*.35,-k*.75+cycle*sign*k*.25);ctx.stroke();}ctx.fillStyle='#d99470';ctx.beginPath();ctx.arc(0,-k*1.63,k*.27,0,Math.PI*2);ctx.fill();ctx.fillStyle='#273a38';ctx.beginPath();ctx.ellipse(0,-k*1.78,k*.29,k*.18,0,0,Math.PI*2);ctx.fill();if(character==='female'){ctx.beginPath();ctx.ellipse(k*.2,-k*1.51,k*.16,k*.35,-.3,0,Math.PI*2);ctx.fill();}ctx.fillStyle='#fff5';ctx.fillRect(-k*.12,-k*1.2,k*.24,k*.35);ctx.restore();}
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
  const relative = at => 3+at-s.distance;
  const gate = relative(SCHOOL_GATE);
  if (gate > -.9) scenery.push({z:gate,draw:()=>{
    for(const side of [-1,1])box(side*4,gate,.66,4.72,.65,'#ffedc7','#d9ae8a','#fff5cf');
    box(0,gate,8.05,1.18,.30,'#19505d','#153e49','#21a895',3.84);
    const p=project(0,gate,4.36);
    ctx.fillStyle='#fff3db';ctx.textAlign='center';ctx.font='900 '+p.k*.31+'px system-ui';
    ctx.fillText('RUNVERSE SCHOOL',p.x,p.y);
  }});
  const van=SCHOOL_VAN,x=van.lane*2.2,ramp=relative(van.ramp),rear=relative(van.rear),front=relative(van.front);
  for (const side of [-1,1]) {
    const z=Math.max(-1,relative(15));
    if(relative(35)>-1) scenery.push({z,draw:()=>box(side*9.15,z,8,4.65,Math.max(1,relative(35)-z),'#f1bd89','#c9956d','#238479')});
  }
  if(front>-.9)scenery.push({z:Math.max(-1,rear),draw:()=>{
    const near=Math.max(-1,rear);
    box(x,near,van.width,van.roof,front-near,'#edb94f','#bd832e','#ffdb7e');
    if(rear>-.9)box(x,rear,1.45,.38,.035,'#426878','#325561','#7595a5',1.13);
  }});
  if(rear>-.9)scenery.push({z:Math.max(-1,ramp),draw:()=>{
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
  ROOF_COINS.forEach((at,i)=>{
    const z=relative(at);
    if(z<-.9||(s.roofCoins&(1<<i)))return;
    scenery.push({z:Math.max(-1,rear)-.03,draw:()=>{
      const p=project(x,z,van.roof+.58);
      ctx.fillStyle='#ffc629';ctx.beginPath();ctx.arc(p.x,p.y,p.k*.16,0,Math.PI*2);ctx.fill();
    }});
  });
}
function traffic(scenery) {
 for(const v of repeatedVans(s.distance)) {
  const rear=3+v.rear-s.distance,front=3+v.front-s.distance,ramp=3+v.ramp-s.distance,x=v.lane*2.2;
  if(front<0||ramp>145)continue;
  const near=Math.max(-1,rear);
  scenery.push({z:near,draw:()=>{
   box(x,near,v.width,v.roof,front-near,'#edb94f','#bd832e','#ffdb7e');
   if(rear>0)box(x,rear,1.45,.38,.035,'#426878','#325561','#7595a5',1.13);
   for(let i=0;i<4;i++){
    const z=rear+2+i*4;if(z<0||s.collected.includes(v.id+':'+i))continue;
    const p=project(x,z,v.roof+.58);ctx.fillStyle='#ffc629';ctx.beginPath();ctx.arc(p.x,p.y,p.k*.17,0,Math.PI*2);ctx.fill();
   }
  }});
  if(rear>0 && v.rear>v.ramp)scenery.push({z:Math.max(-1,ramp),draw:()=>{
   const near=Math.max(-1,ramp),y=v.roof*(near-ramp)/(rear-ramp),left=x-v.width/2,right=x+v.width/2;
   poly([[left,near,y],[right,near,y],[right,rear,v.roof],[left,rear,v.roof]].map(p=>{const q=project(...p);return[q.x,q.y];}),'#3e847d');
   for(let i=1;i<8;i++){const t=i/8,z=ramp+t*(rear-ramp);if(z<near)continue;const a=project(left+.1,z,t*v.roof),b=project(right-.1,z,t*v.roof);ctx.strokeStyle='#ffe18c';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}
  }});
 }
 for(const o of s.items) {
  if(((o.encounter||o.roofRide)&&!o.started)||o.type!=='bus')continue;
  const z=3+o.z-s.distance;if(z+o.length<0||z>145)continue;
  const near=Math.max(-1,z),x=o.lane*2.2;
  scenery.push({z:near,draw:()=>{
   box(x,near,1.94,2.8,z+o.length-near,'#ffc036','#d99224','#ffe5a0');
   if(o.roofRide){for(let i=0;i<4;i++){const cz=z+4+i*4;if(cz<0||s.collected.includes(o.id+':'+i))continue;const p=project(x,cz,3.4);ctx.fillStyle='#ffda45';ctx.beginPath();ctx.ellipse(p.x,p.y,p.k*.17,p.k*.24,0,0,Math.PI*2);ctx.fill();}}
   if(z>-.9){box(x,z,1.65,.90,.04,'#214759','#214759','#214759',1.7);box(x,z,.60,.28,.04,'#293f46','#293f46','#293f46',.55);for(const side of [-1,1])box(x+side*.68,z,.30,.24,.05,'#fffcc2','#fffcc2','#fffcc2',.65);}
  }});
 }
}

function capturePortrait(){
  const {lift,laugh,show}=capturePose(s), unit=Math.min(w/4,h/6);
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
  oval(playerX,playerY+hero*.81,hero*.38,hero*.66,character==='female'?'#b75e68':'#515465');
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
}
function draw(){ctx.clearRect(0,0,w,h);const sky=ctx.createLinearGradient(0,0,0,h*.58);const weather=weatherAt(s.time);sky.addColorStop(0,weatherColor(weather.a.top,weather.b.top,weather.mix));sky.addColorStop(1,weatherColor(weather.a.horizon,weather.b.horizon,weather.mix));ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
if(weather.night>.4){ctx.fillStyle='#e4efff';for(let i=0;i<65;i++)ctx.fillRect((i*137%1000)/1000*w,(i*73%300)/1000*h,1.5,1.5);ctx.beginPath();ctx.arc(w*.72,h*.15,w*.034,0,Math.PI*2);ctx.fill();}else if(weather.rain<.7){ctx.fillStyle='#fff1c6';ctx.beginPath();ctx.arc(w*(.7-weather.phase*.3),h*.17,w*.04,0,Math.PI*2);ctx.fill();}
ctx.fillStyle=weather.rain>.3?'#9aaabd99':'#ffffffbb';for(let i=0;i<5;i++){const x=(((i*w*.27-s.time*32)%(w*1.4))+w*1.4)%(w*1.4)-w*.2;ctx.beginPath();ctx.ellipse(x,h*(.1+i%3*.05),w*.08,h*.016,0,0,Math.PI*2);ctx.fill();}poly([[0,h*.38],[0,h*.3],[w*.16,h*.22],[w*.31,h*.32],[w*.47,h*.24],[w*.62,h*.35],[w,h*.27],[w,h*.48]],'#83cbd8');poly([[0,h*.42],[w*.14,h*.33],[w*.32,h*.38],[w*.5,h*.3],[w*.72,h*.37],[w*.86,h*.31],[w,h*.35],[w,h]],'#56c5b2');ctx.fillStyle='#48bdab';ctx.fillRect(0,h*.42,w,h*.58);
const far=project(0,160),near=project(0,-1);poly([[far.x-10,far.y],[far.x+10,far.y],[w*1.12,h*1.1],[-w*.12,h*1.1]],'#f2d89b');poly([[far.x-8,far.y],[far.x+8,far.y],[w*.99,h*1.1],[w*.01,h*1.1]],'#697ea0');for(let z=150;z>0;z-=6){const zz=z-(s.distance%6),p=project(0,Math.max(0,zz));for(const x of [-1.1,1.1]){const a=project(x,Math.max(0,zz)),b=project(x,Math.max(0,zz+2.5));poly([[a.x-1-p.k*.015,a.y],[a.x+1+p.k*.015,a.y],[b.x+1,b.y],[b.x-1,b.y]],'#fff7bf');}}
const scenery=[];school(scenery);traffic(scenery);for(let slot=0;slot<CAMPUS_SLOTS;slot++){
 const anchor=campusAnchor(slot,s.distance),kind=campusKind(anchor),z=anchor-s.distance+3;
 if(z+16<0||z-16>180)continue;
 scenery.push({z:Math.max(.1,z-16),draw:()=>{
  const front=Math.max(.1,z-13),length=Math.max(.1,z+13-front);
  for(const side of [-1,1]){
   box(side*4.9,front,.22,.5,length,'#a2ad91','#7e8e77','#b8bda4');
   const building=(side===-1 && (kind===0||kind===2))||(side===1&&kind===1);
   if(building){
    box(side*9.5,front,7,5.4,length,'#e0cfaa','#c3b497','#7f9989');
    for(const dx of [-2.4,-.8,.8,2.4])for(const y of [1.7,3.8])box(side*9.5+dx,front,.95,1.1,.04,'#5d8190','#5d8190','#5d8190',y);
    const p=project(side*9.5,front,3);ctx.fillStyle='#254d50';ctx.fillRect(p.x-p.k*2.6,p.y-p.k*.3,p.k*5.2,p.k*.6);ctx.fillStyle='#fff4da';ctx.font='bold '+p.k*.24+'px sans-serif';ctx.textAlign='center';ctx.fillText(kind===0?'CLASSROOMS':kind===1?'SCIENCE LAB':'LIBRARY',p.x,p.y+p.k*.08);
   }else if((kind===1&&side===-1)||(kind===2&&side===1)){
    box(side*10,front,9,.05,length,'#608e69','#608e69','#608e69');
    if(z>0){for(const dx of [-1.5,1.5])box(side*10+dx,z,.1,2.1,.1,'#eee9d6');box(side*10,z,3.1,.1,.1,'#eee9d6','#eee9d6','#eee9d6',2.1);}
   }else if(kind===3&&side===1){
    box(10,front,8,.08,length,'#727b7d','#727b7d','#727b7d');
    for(const dz of [-7,1,8])if(z+dz>0){box(10,z+dz,2,1.6,4.5,'#e6b14a','#c19c44','#f4d375');box(10,z+dz,1.6,.5,.04,'#3d616a','#3d616a','#3d616a',1);}
   }else{for(const dz of [-8,0,8])if(z+dz>0){tree(side*8,z+dz,.1);box(side*6,z+dz,1.8,.5,.6,'#a98760');}}
  }
 }});
}
for(const o of s.items){if(o.type==='bus'||((o.encounter||o.roofRide)&&!o.started))continue;const z=o.z-s.distance+3;if(z<0||z>145||o.done)continue;scenery.push({z,draw:()=>{const x=o.type==='sideVehicle'?sideVehicleX(o,s.time):o.lane*2.2;if(o.type==='sideVehicle'){box(x,z,1.6,o.variant==='car'?1.3:1.8,3.2,o.variant==='car'?'#e54a39':'#315d85');const p=project(x,z,1);ctx.fillStyle='#fff';ctx.font='bold '+p.k*.3+'px sans-serif';ctx.textAlign='center';ctx.fillText(o.variant.toUpperCase(),p.x,p.y);}else if(o.type==='block'){box(x,z,1.3,2.4,1.1,'#9b7bd1','#8d624a','#dba573');const p=project(x,z,1.2);ctx.strokeStyle='#edc095';ctx.lineWidth=p.k*.06;ctx.beginPath();ctx.moveTo(p.x-p.k*.5,p.y-p.k*.7);ctx.lineTo(p.x+p.k*.5,p.y+p.k*.7);ctx.moveTo(p.x+p.k*.5,p.y-p.k*.7);ctx.lineTo(p.x-p.k*.5,p.y+p.k*.7);ctx.stroke();}else if(o.type==='jump'){box(x,z,1.8,.75,.4,'#ff804f','#af5934','#f0b269');const p=project(x,z,.4);ctx.fillStyle='#ffe5a3';ctx.fillRect(p.x-p.k*.7,p.y-p.k*.1,p.k*1.4,p.k*.12);}else if(o.type==='slide'){box(x-.85,z,.16,2.6,.25,'#387971');box(x+.85,z,.16,2.6,.25,'#387971');box(x,z,1.85,1,.3,'#28c4c8','#2f6865','#9bc4a5',1.6);const p=project(x,z,2);ctx.fillStyle='#e6f1cb';ctx.font='bold '+p.k*.45+'px Arial';ctx.textAlign='center';ctx.fillText('↓',p.x,p.y);}else{const p=project(x,z,1.1+Math.sin(s.time*3+o.z)*.1),r=p.k*.32;ctx.fillStyle=['#f6cf6e','#bdf0bd','#b9d9fc'][o.skill];ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#fff7cf';ctx.lineWidth=r*.15;ctx.stroke();ctx.fillStyle='#294d44';ctx.font='bold '+r*1.4+'px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(['▤','✚','⬟'][o.skill],p.x,p.y);ctx.textBaseline='alphabetic';}}});}
scenery.push({z:3,draw:runner});const pursuit=chasePose(s);if(pursuit){const z=3-pursuit.z*.72;scenery.push({z,draw:()=>mutant(pursuit,z)});}scenery.sort((a,b)=>b.z-a.z).forEach(o=>o.draw());if(weather.rain>.05){ctx.strokeStyle=`rgba(205,229,255,${weather.rain*.6})`;ctx.lineWidth=1;ctx.beginPath();for(let i=0;i<90;i++){const x=i*73%w,y=((i*97+s.time*600)%h);ctx.moveTo(x,y);ctx.lineTo(x-3,y+14);}ctx.stroke();}if(isCapture(s))capturePortrait();const shade=ctx.createLinearGradient(0,h*.75,0,h);shade.addColorStop(0,'#183c3800');shade.addColorStop(1,'#183c3888');ctx.fillStyle=shade;ctx.fillRect(0,h*.75,w,h*.25);}
resize();return (state,choice)=>{s=state;character=choice;draw();};}
