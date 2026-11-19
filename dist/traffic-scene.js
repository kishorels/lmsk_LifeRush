import {makeCoin,spinCoin} from './coin.js';
import {buildBus,buildCollegeVehicle} from './bus-model.js';
import {BoxGeometry,Group,Mesh,MeshStandardMaterial} from './vendor/three.module.js';
import {repeatedVans} from './traffic-rules.js';
import {curveRelX,curveRelY,roadCurveSlope} from './campus-layout.js';
export function createTraffic(scene) {
 let lastSeed,lastMap;
 const cube=new BoxGeometry(),mats=new Map(),parked=new Map(),moving=new Map();
 function part(g,color,x,y,z,w,h,d,geo=cube) {
  if(!mats.has(color))mats.set(color,new MeshStandardMaterial({color,roughness:.62}));
  const m=new Mesh(geo,mats.get(color));m.position.set(x,y,z);m.scale.set(w,h,d);m.castShadow=m.receiveShadow=true;g.add(m);return m;
 }
 function vehicle(length,roof,oncoming,isCollege,collegeKind='car'){
  const g=isCollege?buildCollegeVehicle(collegeKind,length,roof,oncoming):buildBus(length,roof,oncoming);
  scene.add(g);return g;
 }
 function vanModel(v,isCollege) {
  const g=vehicle(v.front-v.rear,v.roof,false,isCollege,'van'),run=v.rear-v.ramp;
  g.userData.routeVanId=v.id;
  if(run>0) {
   const ramp=part(g,0x2c9088,0,v.roof/2,run/2,1.94,.12,Math.hypot(run,v.roof));ramp.rotation.x=Math.atan2(v.roof,run);
   for(let i=1;i<8;i++){const t=i/8,m=part(g,0xffe389,0,v.roof*(1-t)+.08,run*t,1.78,.025,.11);m.rotation.x=ramp.rotation.x;}
  }
  g.userData.coins=[];
  for(let i=0;i<4;i++){g.userData.coins.push(makeCoin(g,0,v.roof+.6,-2-i*4));}
  return g;
 }
 return s=>{
  const isCollege=s.map==='college';
  if(s.runSeed!==lastSeed||lastMap!==s.map){for(const g of parked.values())scene.remove(g);for(const g of moving.values())scene.remove(g);parked.clear();moving.clear();lastSeed=s.runSeed;lastMap=s.map;}
  const visible=new Set();
  for(const v of repeatedVans(s.distance,s.runSeed)) {
   if(v.ramp>s.distance+135||v.front<s.distance-15)continue;
   visible.add(v.id);if(!parked.has(v.id))parked.set(v.id,vanModel(v,isCollege));
   const g=parked.get(v.id);g.position.set(v.lane*2.2+curveRelX(v.rear,s),.09+curveRelY(v.rear,s),s.distance-v.rear);
   g.rotation.y=-Math.atan(roadCurveSlope(v.rear,s.map));
   g.userData.coins.forEach((c,i)=>{c.visible=!s.collected.includes(v.id+':'+i);spinCoin(c,s.time,i,v.roof+.6);});
  }
  for(const [id,g]of parked)if(!visible.has(id)){scene.remove(g);parked.delete(id);}
  const live=new Set();
  for(const o of s.items){if(o.type!=='bus'||(o.encounter&&!o.started)||o.z-s.distance>140)continue;live.add(o);if(!moving.has(o)){
   let model;
   if(o.roofRide){model=new Group();model.userData.captureObstacle=true;const v=isCollege?buildCollegeVehicle('van',o.length,o.roof,false):buildBus(o.length,o.roof,false);v.rotation.y=Math.PI;v.position.z=-o.length;model.add(v);model.userData.wheels=v.userData.wheels;model.userData.coins=[];
    for(let i=0;i<4;i++){model.userData.coins.push(makeCoin(model,0,o.roof+.6,-4-i*4));}scene.add(model);
   }else model=vehicle(o.length,o.roof||(isCollege?1.45:2.8),true,isCollege,o.collegeKind||'car');
   moving.set(o,model);
  }const g=moving.get(o);g.position.set(o.lane*2.2+curveRelX(o.z,s),.09+curveRelY(o.z,s),s.distance-o.z);g.rotation.y=-Math.atan(roadCurveSlope(o.z,s.map));g.userData.wheels.forEach(w=>w.rotation.x=-s.time*(o.velocity||18)/.35);g.userData.coins?.forEach((c,i)=>{c.visible=!s.collected.includes(o.id+':'+i);spinCoin(c,s.time,i,o.roof+.6);});}
  for(const [o,g]of moving)if(!live.has(o)){scene.remove(g);moving.delete(o);}
 };
}
