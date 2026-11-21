// A run seed changes placement; a segment remains stable while it is on screen.
let lastSeed=0;
export function newRunSeed(){
  const words=new Uint32Array(1);
  if(globalThis.crypto?.getRandomValues)globalThis.crypto.getRandomValues(words);
  else words[0]=Math.floor(Math.random()*4294967296);
  let seed=words[0]||1;
  if(seed===lastSeed)seed=(seed+0x9e3779b9)>>>0||1;
  lastSeed=seed;return seed;
}
function hash(seed,index,salt=0){
  let x=(seed^Math.imul(index+1,0x9e3779b9)^salt)>>>0;
  x=Math.imul(x^(x>>>16),0x21f0aaad);x=Math.imul(x^(x>>>15),0x735a2d97);
  return (x^(x>>>15))>>>0;
}
function randomFor(seed,index){let n=hash(seed,index);return ()=>{n=(n+0x6d2b79f5)>>>0;let t=Math.imul(n^(n>>>15),n|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
export function entryVan(seed=0){
  const ramp=seed?24+hash(seed,0,13)%17:22;
  return {id:'entry',lane:seed?hash(seed,0,37)%3-1:1,ramp,rear:ramp+10,front:ramp+32,roof:1.72,width:1.94};
}
export function entryCoins(seed=0){const rear=entryVan(seed).rear;return [3,9,15,21].map(offset=>rear+offset);}
export function segmentBase(seed,index){
  if(!seed)return 100+index*160;
  return 120+hash(seed,0,93)%31+index*248+(index?hash(seed,index,11)%29-14:0);
}
export function routeSegment(seed=0,index=0){
  const base=segmentBase(seed,index);
  if(!seed){
    if(index%2){const side=Math.floor(index/2)%2?-1:1;return {base,kind:'encounter',side,trafficLane:0,safeLane:-side,barrierType:['jump','slide','block'][Math.floor(index/2)%3],barrierAt:145,variant:'scaffold',triggerAt:45,vehicle:['cycle','bike','car'][Math.floor(index/2)%3]};}
    const roofLane=[-1,1,0][index%3],trafficLane=[0,-1,1][index%3],jump=Math.floor(index/2)%2;
    return {base,kind:'roof',roofLane,trafficLane,safeLane:-roofLane-trafficLane,barrierType:jump?'jump':'slide',variant:jump?'hurdle':'scaffold',barrierAt:158};
  }
  const random=randomFor(seed,index),pick=n=>Math.floor(random()*n);
  const kind=((index%2)^(hash(seed,Math.floor(index/2),71)%2))?'encounter':'roof';
  const main=kind==='encounter'?(pick(2)?1:-1):pick(3)-1;
  const other=[-1,0,1].filter(lane=>lane!==main),trafficLane=other[pick(2)],safeLane=-main-trafficLane;
  const barrierType=['jump','slide','block'][pick(3)];
  return {base,kind,roofLane:main,side:main,trafficLane,safeLane,barrierType,
    variant:barrierType==='jump'?(pick(2)?'bench':'hurdle'):'scaffold',
    barrierAt:kind==='roof'?158+pick(19):145+pick(16),triggerAt:38+pick(15),
    vehicle:['cycle','bike','car'][pick(3)],extraBus:random()>.3,lateBus:random()>.2,
    coinAt:25+pick(15),coinCount:3+pick(3),lateCoinAt:(kind==='roof'?82:122)+pick(13),
    pickupAt:49+pick(25),powerup:['shield','magnet','nitro','shoes'][(index+(hash(seed,Math.floor(index/4),151)%4))%4]};
}
export function coinTrail(z,lane,count=4){return Array.from({length:count},(_,i)=>({z:z+i*4,lane,type:'coin',done:false}));}
export function repeatedVans(distance,seed=0){
  const stride=seed?248:160,start=Math.max(0,Math.floor((distance-segmentBase(seed,0))/stride)-2),vans=[];
  for(let i=start;i<start+6;i++){
    const p=routeSegment(seed,i);if(p.kind!=='roof')continue;
    const base=p.base,lane=p.roofLane;
    vans.push({id:`van-${i}`,lane,ramp:base+12,rear:base+22,front:base+42,roof:1.72,width:1.94});
    vans.push({id:`roof-${i}`,lane,ramp:base+48,rear:base+48,front:base+68,roof:1.72,width:1.94});
  }
  return vans;
}
export function trafficPattern(base,index,seed=0,map='school'){
  const p=routeSegment(seed,index),items=[],lane=p.trafficLane,isPark=map==='itpark',isCollege=map==='college'||isPark;
  const sideVar=isPark?(['porsche','ducati','bugatti'][(Math.floor(index/2)+(seed&3))%3]):isCollege?(['scooty','car','scooty','bike'][(index+(seed&3))%4]):p.vehicle;
  const parkPool=['porsche','bugatti','ducati','semi'];
  const cKind1=isPark?parkPool[(index+(seed&3))%4]:isCollege?((index%2)?'scooty':'car'):undefined;
  const cKind2=isPark?parkPool[(index+2+(seed&3))%4]:isCollege?((index%2)?'car':'scooty'):undefined;
  const mkTraffic=(z,tLane,vel,extra={})=>{
    const ck=extra.collegeKind;
    const len=isCollege?(ck==='semi'?10.5:ck==='scooty'?2.2:ck==='ducati'?2.4:4.6):10;
    const rf=isCollege?(ck==='semi'?2.8:ck==='scooty'?0.95:ck==='ducati'?1.05:1.45):2.8;
    return {z,lane:tLane,type:'bus',velocity:vel,length:len,roof:rf,done:false,...extra};
  };
  if(p.kind==='encounter'){
    const trigger=base+p.triggerAt;
    items.push(
      {z:base+110,lane:p.side,type:'sideVehicle',variant:sideVar,trigger,encounter:true,started:false,length:3.4,done:false},
      mkTraffic(base+140,lane,22,{trigger,encounter:true,started:false,collegeKind:cKind1}));
    if(!seed||p.extraBus)items.push(mkTraffic(base+130,p.side,20,{activate:trigger,collegeKind:cKind2}));
    items.push({z:base+p.barrierAt,lane:p.side,type:p.barrierType,variant:p.variant,done:false});
  }else{
    items.push(mkTraffic(base+130,lane,18,{activate:base-25,collegeKind:cKind1}));
    if(!seed||p.lateBus)items.push(mkTraffic(base+235,p.roofLane,18,{activate:base+65,collegeKind:cKind2}));
    if(!seed||p.extraBus)items.push(mkTraffic(base+190,lane,24,{activate:base-25,collegeKind:cKind1}));
    items.push({id:'moving-roof-'+index,z:base+70,lane:p.roofLane,type:'bus',roofRide:true,started:false,activate:base+56,length:22,roof:2.8,done:false},
      {z:base+p.barrierAt,lane:p.roofLane,type:p.barrierType,variant:p.variant,done:false});
  }
  items.push(...coinTrail(base+(seed?p.lateCoinAt:p.kind==='roof'?82:122),p.safeLane,seed?p.coinCount+1:4));
  if(seed){
    items.push(...coinTrail(base+p.coinAt,p.safeLane,p.coinCount),{z:base+p.pickupAt,lane:p.safeLane,type:p.powerup,done:false});
    // Finish this section in its clear lane, then leave room to change lanes
    // before the next ramp. Section spacing covers the late bus even at 48m/s.
    const end=segmentBase(seed,index+1)-base-30;
    for(let offset=182;offset<=end;offset+=6)items.push({z:base+offset,lane:p.safeLane,type:'coin',done:false});
  }
  return items;
}
export function sideVehicleX(o,time){const t=Math.max(0,Math.min(1,(time-o.startedAt)/.45));return o.lane*(5.3-3.1*t*t*(3-2*t));}
