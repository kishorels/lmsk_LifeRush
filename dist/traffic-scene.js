import {makeCoin,spinCoin} from './coin.js';
import {buildBus,buildUltraSchoolBus,buildCollegeVehicle} from './bus-model.js?v=3.10.22';
import {buildPorscheGT3RS,buildBugattiChiron,buildRedShuttleCart,buildFreightSemiTruck,buildDucatiStreetfighter} from './itpark-models.js?v=3.8.0';
import {buildWDP4DTrain,buildRailRampWagon} from './wdp4d-train.js?v=3.10.13';
import {BoxGeometry,Group,Mesh,MeshStandardMaterial} from './vendor/three.module.js';
import {repeatedVans} from './traffic-rules.js';
import {FINALRUN_GATE, finalRunGateFor} from './engine.js';
import {curveRelX,curveRelY,curveSlopeAt} from './campus-layout.js';
export function createTraffic(scene) {
 let lastSeed,lastMap;
 const cube=new BoxGeometry(),mats=new Map(),parked=new Map(),moving=new Map(),vanPool=new Map(),movingPool=new Map();
 const parkVariants=new WeakMap();
 function takePool(poolMap,key,factory){
  const list=poolMap.get(key);
  if(list&&list.length){const g=list.pop();scene.add(g);return g;}
  return factory();
 }
 function releasePool(poolMap,g){
  scene.remove(g);
  const key=g.userData.poolKey;
  if(!key)return;
  let list=poolMap.get(key);
  if(!list){list=[];poolMap.set(key,list);}
  list.push(g);
 }
 function part(g,color,x,y,z,w,h,d,geo=cube) {
  if(!mats.has(color))mats.set(color,new MeshStandardMaterial({color,roughness:.62}));
  const m=new Mesh(geo,mats.get(color));m.position.set(x,y,z);m.scale.set(w,h,d);m.castShadow=m.receiveShadow=true;g.add(m);return m;
 }
 function metroCar(o) {
  const g=buildWDP4DTrain(o);
  scene.add(g);return g;
 }
 function parkVehicle(kind,length,roof,variantIdx=0){
  if(kind==='van')return buildRedShuttleCart(length,roof);
  if(kind==='semi')return buildFreightSemiTruck(length,roof,variantIdx);
  if(kind==='porsche')return buildPorscheGT3RS(length,false);
  if(kind==='bugatti')return buildBugattiChiron(length,false);
  if(kind==='ducati'||kind==='scooty')return buildDucatiStreetfighter(false,true);
  return variantIdx%2?buildBugattiChiron(length,false):buildPorscheGT3RS(length,false);
 }
 function vehicle(length,roof,oncoming,map,collegeKind='car',variantIdx=0,ultraSchool=false){
  const g=map==='itpark'?parkVehicle(collegeKind,length,roof,variantIdx):map==='college'?buildCollegeVehicle(collegeKind,length,roof,oncoming):(ultraSchool?buildUltraSchoolBus(length,roof,oncoming):buildBus(length,roof,oncoming));
  scene.add(g);return g;
 }
 function vanModel(v,map,inCave=false,ultraSchool=false) {
  const len=v.front-v.rear;
  let g;
  if(inCave){
   g=buildRailRampWagon(len,v.roof);scene.add(g);
  }else if(map==='college'){
   g=new Group();g.userData.captureObstacle=true;
   const body=buildCollegeVehicle('van',len,v.roof,false);
   body.rotation.y=Math.PI;body.position.z=-len;
   g.add(body);g.userData.wheels=body.userData.wheels;
   scene.add(g);
  }else if(ultraSchool){
   g=new Group();g.userData.captureObstacle=true;
   const body=buildUltraSchoolBus(len,v.roof,false);
   body.rotation.y=Math.PI;body.position.z=-len;
   g.add(body);g.userData.wheels=body.userData.wheels;
   scene.add(g);
  }else{
   g=vehicle(len,v.roof,false,map,'van',0,false);
  }
  const run=v.rear-v.ramp;
  g.userData.routeVanId=v.id;
  g.userData.inCave=inCave;
  if(run>0) {
   const ramp=part(g,inCave?0x1d56b8:0x2c9088,0,v.roof/2,run/2,1.94,.12,Math.hypot(run,v.roof));ramp.rotation.x=Math.atan2(v.roof,run);
   for(let i=1;i<8;i++){const t=i/8,m=part(g,inCave?0xf2a61e:0xffe389,0,v.roof*(1-t)+.08,run*t,1.78,.025,.11);m.rotation.x=ramp.rotation.x;}
  }
  g.userData.coins=[];
  for(let i=0;i<4;i++){g.userData.coins.push(makeCoin(g,0,v.roof+.6,-2-i*4));}
  return g;
 }
 return s=>{
  const map=s.map||'school';
  const isCollege=map==='college'||map==='itpark';
  const onCave=s.activeBranch==='underpass';
  if(s.runSeed!==lastSeed||lastMap!==map){for(const g of parked.values())scene.remove(g);for(const g of moving.values())scene.remove(g);parked.clear();moving.clear();vanPool.clear();movingPool.clear();lastSeed=s.runSeed;lastMap=map;}
  const visible=new Set();
  const trafficFar=scene.userData?.trafficFar||295;
  const lowEnd=Boolean(scene.userData?.lowEnd);
  const isTouch=Boolean(scene.userData?.isTouch);
  const ultraQuality=Boolean(scene.userData?.ultraQuality);
  const ultraSchool=ultraQuality&&map==='school';
  for(const v of (map==='grandfather' ? [] : repeatedVans(s.distance,s.runSeed))) {
   if(v.ramp>s.distance+trafficFar||v.front<s.distance-15)continue;
   if((s.map==='finalrun'||s.isFinalRun)&&v.ramp>=finalRunGateFor(s.map)-85)continue;
   const vanInCave=onCave&&v.rear>=s.branchStart-4&&v.rear<s.branchEnd;
   const vanKey=`${map}:${ultraSchool}:${vanInCave}:${v.front-v.rear}:${v.roof}:${v.rear-v.ramp}`;
   visible.add(v.id);
   if(parked.has(v.id)&&parked.get(v.id).userData.poolKey!==vanKey){releasePool(vanPool,parked.get(v.id));parked.delete(v.id);}
   if(!parked.has(v.id)){
    const g=takePool(vanPool,vanKey,()=>{const m=vanModel(v,map,vanInCave,ultraSchool);m.userData.poolKey=vanKey;return m;});
    g.userData.routeVanId=v.id;
    g.userData.inCave=vanInCave;
    parked.set(v.id,g);
   }
   const g=parked.get(v.id);
   const pSampleZ=Math.max(v.ramp,Math.min(v.front,s.distance));
   const pYaw=-Math.atan(curveSlopeAt(pSampleZ,s));
   const pShiftU=pSampleZ-v.rear;
   g.position.set(v.lane*2.2+curveRelX(pSampleZ,s)+pShiftU*Math.sin(pYaw),.09+curveRelY(pSampleZ,s),s.distance-v.rear+pShiftU*(Math.cos(pYaw)-1));
   g.rotation.y=pYaw;
   const camP=scene.userData?.camPos;
   const pLen=Math.max(4,v.front-v.rear);
   const pClipsCam=Boolean(camP && Math.abs(camP.x-g.position.x)<1.58 && camP.y<(g.position.y+(v.roof||2.4)+0.55) && camP.z>(g.position.z-pLen-0.85) && camP.z<(g.position.z+0.85));
   g.visible=!pClipsCam;
   g.userData.coins.forEach((c,i)=>{c.visible=!s.collected.includes(v.id+':'+i);spinCoin(c,s.time,i,v.roof+.6);});
  }
  for(const [id,g]of parked)if(!visible.has(id)){releasePool(vanPool,g);parked.delete(id);}
  const live=new Set();
  const runSpd=Math.max(24,s.speed||28);
  for(const o of s.items){
   if(o.cleared||o.type!=='bus')continue;
   // Pending encounter buses/trains smoothly drive in from 345m horizon instead of popping in at trigger!
   const visZ=(o.encounter&&!o.started)?(o.trigger+(runSpd+(o.velocity||0))*1.45+(o.velocity||0)*Math.max(0,(o.trigger-s.distance)/runSpd)):o.z;
   if(visZ-s.distance>trafficFar||visZ+(o.length||12)<s.distance-12)continue;
   live.add(o);
   // Pick the paint/model once. Travel changes z every frame, while a fork can
   // legitimately change the same vehicle into a different-sized train.
   let vIdx=0;
   if(map==='itpark'&&!o.metro){
    if(!parkVariants.has(o))parkVariants.set(o,Math.abs(Math.floor(o.z)+(o.lane||0))%3);
    vIdx=parkVariants.get(o);
   }
   const movKey=`${map}:${ultraSchool}:${Boolean(o.metro)}:${Boolean(o.roofRide)}:${o.collegeKind||'car'}:${o.length}:${o.roof}:${vIdx}`;
   if(moving.has(o)&&moving.get(o).userData.poolKey!==movKey){releasePool(movingPool,moving.get(o));moving.delete(o);}
   if(!moving.has(o)){
    const model=takePool(movingPool,movKey,()=>{
     let m;
     if(o.metro) m=metroCar(o);
     else if(o.roofRide){m=new Group();m.userData.captureObstacle=true;const v=map==='itpark'?buildFreightSemiTruck(o.length,o.roof,vIdx):map==='college'?buildCollegeVehicle('van',o.length,o.roof,false):(ultraSchool?buildUltraSchoolBus(o.length,o.roof,false):buildBus(o.length,o.roof,false));v.rotation.y=Math.PI;v.position.z=-o.length;m.add(v);m.userData.wheels=v.userData.wheels;m.userData.coins=[];
      for(let i=0;i<4;i++){m.userData.coins.push(makeCoin(m,0,o.roof+.6,-4-i*4));}scene.add(m);
     }else m=vehicle(o.length,o.roof||(isCollege?1.45:2.8),true,map,o.collegeKind||'car',vIdx,ultraSchool);
     m.userData.poolKey=movKey;
     return m;
    });
    moving.set(o,model);
   }const g=moving.get(o);
   const mFront=visZ+(o.length||10);
   const mSampleZ=o.roofRide?Math.max(visZ,Math.min(mFront,s.distance)):visZ;
   const mSlope=curveSlopeAt(mSampleZ,s);
   const mYaw=-Math.atan(mSlope);
   const mShiftU=mSampleZ-visZ;
   const suspBounce=ultraQuality&&!o.metro&&!o.roofRide?Math.sin(s.time*14.5+(o.lane||0)*2.1+visZ*0.18)*0.026:0;
   g.position.set(o.lane*2.2+curveRelX(mSampleZ,s)+mShiftU*Math.sin(mYaw),.09+curveRelY(mSampleZ,s)+suspBounce,s.distance-visZ+mShiftU*(Math.cos(mYaw)-1));
   g.rotation.y=mYaw;
   g.rotation.z=ultraQuality&&!o.metro&&!o.roofRide?Math.max(-0.08,Math.min(0.08,mSlope*0.22)):0;
   const camM=scene.userData?.camPos;
   const mLen=o.length||10;
   const mTop=g.position.y+(o.roof||(isCollege?1.45:2.8))+0.65;
   const mClipsCam=Boolean(camM && Math.abs(camM.x-g.position.x)<1.62 && camM.y<mTop && camM.z>(g.position.z-mLen-0.95) && camM.z<(g.position.z+0.95));
   g.visible=!mClipsCam;
   if(isTouch&&!lowEnd){
    const wantShadow=(visZ-s.distance<46)&&(mFront>s.distance-6);
    if(g.userData._castSh!==wantShadow){
     g.userData._castSh=wantShadow;
     g.traverse(n=>{if(n.isMesh&&n.userData._origCast===undefined)n.userData._origCast=n.castShadow;if(n.isMesh&&n.userData._origCast)n.castShadow=wantShadow;});
    }
   }
   if(!(lowEnd||isTouch)||visZ-s.distance<95)g.userData.wheels.forEach(w=>w.rotation.x=-s.time*(o.velocity||18)/.35);g.userData.coins?.forEach((c,i)=>{c.visible=!s.collected.includes(o.id+':'+i);if(c.visible&&(!(lowEnd||isTouch)||visZ-s.distance<95))spinCoin(c,s.time,i,o.roof+.6);});}
  for(const [o,g]of moving)if(!live.has(o)){releasePool(movingPool,g);moving.delete(o);}
 };
}
export function prewarmTrafficTemplates(map, targetGroup) {
 if (map === 'itpark') {
  targetGroup.add(
   buildPorscheGT3RS(4.6, false),
   buildBugattiChiron(4.6, false),
   buildDucatiStreetfighter(false, true),
   buildFreightSemiTruck(10.5, 2.8, 0),
   buildFreightSemiTruck(10.5, 2.8, 1),
   buildFreightSemiTruck(10.5, 2.8, 2),
   buildFreightSemiTruck(22, 2.8, 0),
   buildFreightSemiTruck(22, 2.8, 1),
   buildFreightSemiTruck(22, 2.8, 2),
   buildRedShuttleCart(20, 1.72),
   buildWDP4DTrain({ length: 12, roof: 2.8, lane: 0 }),
   buildWDP4DTrain({ length: 18, roof: 2.6, lane: 0 }),
   buildWDP4DTrain({ length: 22, roof: 2.8, lane: 0, roofRide: true }),
   buildRailRampWagon(20, 1.72)
  );
 } else if (map === 'college') {
  targetGroup.add(
   buildCollegeVehicle('car', 4.5, 1.45, true),
   buildCollegeVehicle('scooty', 2.4, 1.45, true),
   buildCollegeVehicle('van', 10, 1.72, false)
  );
 } else {
  targetGroup.add(buildBus(10, 2.8, true), buildBus(22, 2.8, false));
 }
}
