import {BoxGeometry,CylinderGeometry,Group,Mesh,MeshStandardMaterial} from './vendor/three.module.js';
import {repeatedVans} from './traffic-rules.js';
export function createTraffic(scene) {
 const cube=new BoxGeometry(),cylinder=new CylinderGeometry(1,1,1,16),mats=new Map(),parked=new Map(),moving=new Map();
 function part(g,color,x,y,z,w,h,d,geo=cube) {
  if(!mats.has(color))mats.set(color,new MeshStandardMaterial({color,roughness:.62}));
  const m=new Mesh(geo,mats.get(color));m.position.set(x,y,z);m.scale.set(w,h,d);m.castShadow=m.receiveShadow=true;g.add(m);return m;
 }
 function vehicle(length,roof,oncoming) {
  const g=new Group();scene.add(g);
  part(g,oncoming?0xffb526:0xf4ca54,0,roof*.49,-length/2,1.94,roof*.92,length);
  part(g,0xffe5a0,0,roof-.04,-length/2,1.95,.13,length);
  part(g,0x1c3647,0,roof*.74,.025,1.65,roof*.33,.06);
  part(g,0x81c9d1,-.38,roof*.77,.064,.38,roof*.24,.02);
  part(g,0x243b44,0,.28,.12,1.9,.18,.25);part(g,0x203440,0,.65,.03,.73,.31,.05);
  for(const x of [-.70,.70]) {
   const lamp=part(g,oncoming?0xfffaad:0xe8493b,x,.69,.065,.33,.22,.07);
   if(oncoming){lamp.material.emissive.setHex(0xffe9a0);lamp.material.emissiveIntensity=1.4;}
   part(g,0xe9efe1,x,roof*.91,.05,.15,.07,.03);
  }
  part(g,0x1a3c41,0,roof*.92,.03,.72,.16,.045);
  for(let i=0;i<6;i++)part(g,0xffe5a0,-.25+i*.10,roof*.92,.058,.06,.075,.008);
  for(const side of [-1,1]) {
   part(g,0x273f49,side*1.04,roof*.72,-.10,.13,.26,.20);
   part(g,0x253c45,side*.98,.76,-length/2,.035,.14,length-.2);
   for(let z=1.3;z<length-.6;z+=1.5){part(g,0x284c60,side*.977,roof*.74,-z,.035,roof*.29,1.12);part(g,0x73abb7,side*.998,roof*.79,-z+.28,.013,roof*.17,.30);}
   for(const z of [-1.5,-length+1.5]) {
    const w=part(g,0x172732,side*.91,.34,z,.35,.23,.35,cylinder);w.rotation.z=Math.PI/2;
    const h=part(g,0x8b9aa4,side*1.035,.34,z,.17,.03,.17,cylinder);h.rotation.z=Math.PI/2;
   }
  }
  return g;
 }
 function vanModel(v) {
  const g=vehicle(v.front-v.rear,v.roof,false),run=v.rear-v.ramp;
  if(run>0) {
   const ramp=part(g,0x2c9088,0,v.roof/2,run/2,1.94,.12,Math.hypot(run,v.roof));ramp.rotation.x=Math.atan2(v.roof,run);
   for(let i=1;i<8;i++){const t=i/8,m=part(g,0xffe389,0,v.roof*(1-t)+.08,run*t,1.78,.025,.11);m.rotation.x=ramp.rotation.x;}
  }
  g.userData.coins=[];
  for(let i=0;i<4;i++){const c=part(g,0xffcb32,0,v.roof+.6,-2-i*4,.23,.075,.23,cylinder);c.rotation.x=Math.PI/2;g.userData.coins.push(c);}
  return g;
 }
 return s=>{
  const visible=new Set();
  for(const v of repeatedVans(s.distance)) {
   if(v.ramp>s.distance+135||v.front<s.distance-15)continue;
   visible.add(v.id);if(!parked.has(v.id))parked.set(v.id,vanModel(v));
   const g=parked.get(v.id);g.position.set(v.lane*2.2,.09,s.distance-v.rear);
   g.userData.coins.forEach((c,i)=>{c.visible=!s.collected.includes(v.id+':'+i);c.rotation.z=s.time*3;c.position.y=v.roof+.6+Math.sin(s.time*4+i)*.06;});
  }
  for(const [id,g]of parked)if(!visible.has(id)){scene.remove(g);parked.delete(id);}
  const live=new Set();
  for(const o of s.items){if(o.type!=='bus'||o.z-s.distance>140)continue;live.add(o);if(!moving.has(o))moving.set(o,vehicle(o.length,2.8,true));moving.get(o).position.set(o.lane*2.2,.09,s.distance-o.z);}
  for(const [o,g]of moving)if(!live.has(o)){scene.remove(g);moving.delete(o);}
 };
}
