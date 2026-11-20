import {makeCoin,spinCoin} from './coin.js';
import {buildBus,buildCollegeVehicle} from './bus-model.js';
import {buildPorscheGT3RS,buildBugattiChiron,buildRedShuttleCart,buildFreightSemiTruck,buildDucatiStreetfighter} from './itpark-models.js?v=3.0.3';
import {buildWDP4DTrain,buildRailRampWagon} from './wdp4d-train.js?v=3.1.9';
import {BoxGeometry,Group,Mesh,MeshStandardMaterial} from './vendor/three.module.js';
import {repeatedVans} from './traffic-rules.js';
import {curveRelX,curveRelY,curveSlopeAt} from './campus-layout.js';
export function createTraffic(scene) {
 let lastSeed,lastMap;
 const cube=new BoxGeometry(),mats=new Map(),parked=new Map(),moving=new Map();
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
 function vehicle(length,roof,oncoming,map,collegeKind='car',variantIdx=0){
  const g=map==='itpark'?parkVehicle(collegeKind,length,roof,variantIdx):map==='college'?buildCollegeVehicle(collegeKind,length,roof,oncoming):buildBus(length,roof,oncoming);
  scene.add(g);return g;
 }
 function vanModel(v,map,inCave=false) {
  const g=inCave?(()=>{const w=buildRailRampWagon(v.front-v.rear,v.roof);scene.add(w);return w;})():vehicle(v.front-v.rear,v.roof,false,map,'van'),run=v.rear-v.ramp;
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
  if(s.runSeed!==lastSeed||lastMap!==map){for(const g of parked.values())scene.remove(g);for(const g of moving.values())scene.remove(g);parked.clear();moving.clear();lastSeed=s.runSeed;lastMap=map;}
  const visible=new Set();
  for(const v of repeatedVans(s.distance,s.runSeed)) {
   if(v.ramp>s.distance+345||v.front<s.distance-15)continue;
   const vanInCave=onCave&&v.rear>=s.branchStart-4&&v.rear<s.branchEnd;
   visible.add(v.id);
   if(parked.has(v.id)&&Boolean(parked.get(v.id).userData.inCave)!==vanInCave){scene.remove(parked.get(v.id));parked.delete(v.id);}
   if(!parked.has(v.id))parked.set(v.id,vanModel(v,map,vanInCave));
   const g=parked.get(v.id);g.position.set(v.lane*2.2+curveRelX(v.rear,s),.09+curveRelY(v.rear,s),s.distance-v.rear);
   g.rotation.y=-Math.atan(curveSlopeAt(v.rear,s));
   g.userData.coins.forEach((c,i)=>{c.visible=!s.collected.includes(v.id+':'+i);spinCoin(c,s.time,i,v.roof+.6);});
  }
  for(const [id,g]of parked)if(!visible.has(id)){scene.remove(g);parked.delete(id);}
  const live=new Set();
  const runSpd=Math.max(24,s.speed||28);
  for(const o of s.items){
   if(o.cleared||o.type!=='bus')continue;
   // Pending encounter buses/trains smoothly drive in from 345m horizon instead of popping in at trigger!
   const visZ=(o.encounter&&!o.started)?(o.trigger+(runSpd+(o.velocity||0))*1.45+(o.velocity||0)*Math.max(0,(o.trigger-s.distance)/runSpd)):o.z;
   if(visZ-s.distance>345||visZ+(o.length||12)<s.distance-12)continue;
   live.add(o);
   if(o.metro && moving.has(o) && moving.get(o).name!=='metro-train'){scene.remove(moving.get(o));moving.delete(o);}
   if(!moving.has(o)){
   let model;
   const vIdx=Math.abs(Math.floor(o.z)+(o.lane||0))%3;
   if(o.metro) model=metroCar(o);
   else if(o.roofRide){model=new Group();model.userData.captureObstacle=true;const v=map==='itpark'?buildFreightSemiTruck(o.length,o.roof,vIdx):map==='college'?buildCollegeVehicle('van',o.length,o.roof,false):buildBus(o.length,o.roof,false);v.rotation.y=Math.PI;v.position.z=-o.length;model.add(v);model.userData.wheels=v.userData.wheels;model.userData.coins=[];
    for(let i=0;i<4;i++){model.userData.coins.push(makeCoin(model,0,o.roof+.6,-4-i*4));}scene.add(model);
   }else model=vehicle(o.length,o.roof||(isCollege?1.45:2.8),true,map,o.collegeKind||'car',vIdx);
   moving.set(o,model);
  }const g=moving.get(o);g.position.set(o.lane*2.2+curveRelX(visZ,s),.09+curveRelY(visZ,s),s.distance-visZ);g.rotation.y=-Math.atan(curveSlopeAt(visZ,s));g.userData.wheels.forEach(w=>w.rotation.x=-s.time*(o.velocity||18)/.35);g.userData.coins?.forEach((c,i)=>{c.visible=!s.collected.includes(o.id+':'+i);spinCoin(c,s.time,i,o.roof+.6);});}
  for(const [o,g]of moving)if(!live.has(o)){scene.remove(g);moving.delete(o);}
 };
}
