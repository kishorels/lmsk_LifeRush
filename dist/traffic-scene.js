import {BoxGeometry,CylinderGeometry,SphereGeometry,Group,Mesh,MeshStandardMaterial} from './vendor/three.module.js';
import {repeatedVans} from './traffic-rules.js';
export function createTraffic(scene) {
 const cube=new BoxGeometry(),cylinder=new CylinderGeometry(1,1,1,16),round=new SphereGeometry(1,12,8),mats=new Map(),parked=new Map(),moving=new Map();
 function part(g,color,x,y,z,w,h,d,geo=cube) {
  if(!mats.has(color))mats.set(color,new MeshStandardMaterial({color,roughness:.62}));
  const m=new Mesh(geo,mats.get(color));m.position.set(x,y,z);m.scale.set(w,h,d);m.castShadow=m.receiveShadow=true;g.add(m);return m;
 }
 function vehicle(length,roof,oncoming) {
  const g=new Group();g.userData.wheels=[];scene.add(g);
  part(g,oncoming?0xffb526:0xffc632,0,roof*.49,-length/2,1.94,roof*.92,length);
  part(g,0xffeac1,0,roof-.04,-length/2,1.95,.13,length);
  part(g,0x182e40,0,roof*.74,.025,1.65,roof*.33,.06);
  part(g,0x81c9d1,-.38,roof*.77,.064,.38,roof*.24,.02);
  part(g,0x243b44,0,.28,.12,1.9,.18,.25);part(g,0x203440,0,.65,.03,.73,.31,.05);
  for(const x of [-.70,.70]) {
   const lamp=part(g,oncoming?0xfffaad:0xe8493b,x,.69,.065,.33,.22,.07);
   if(oncoming){lamp.material.emissive.setHex(0xffe9a0);lamp.material.emissiveIntensity=1.4;}
   part(g,0xe9efe1,x,roof*.91,.05,.15,.07,.03);
  }
  part(g,0x1a3c41,0,roof*.92,.03,.72,.16,.045);
  for(let i=0;i<6;i++)part(g,0xffeac1,-.25+i*.10,roof*.92,.058,.06,.075,.008);
  // Body seams, rounded bonnet, wipers, number plate and grille slats.
  part(g,0xffbc25,0,roof*.43,.02,.94,roof*.12,.12,round);
  part(g,0xf5f0d8,0,.38,.254,.49,.12,.012);
  for(let i=0;i<4;i++)part(g,0x8da1af,0,.54+i*.065,.065,.65,.018,.025);
  for(const x of [-.43,.43]){const w=part(g,0x172732,x,roof*.64,.073,.035,roof*.18,.018);w.rotation.z=-.48;}
  part(g,0xffeac1,0,roof*.74,.072,.045,roof*.33,.02);
  for(const x of [-.68,.68])part(g,0xee641d,x,.99,.055,.18,.08,.03);
  for(const side of [-1,1]) {
   part(g,0x172732,side*1.00,roof*.70,-.18,.17,.045,.3);
   part(g,0x273f49,side*1.04,roof*.72,-.10,.13,.26,.20);
   part(g,0x253c45,side*.98,.76,-length/2,.035,.14,length-.2);
   for(let z=1.3;z<length-.6;z+=1.5){part(g,0x284c60,side*.977,roof*.74,-z,.035,roof*.29,1.12);part(g,0x73abb7,side*.998,roof*.79,-z+.28,.013,roof*.17,.30);}
   part(g,0xffeac1,side*.983,roof*.48,-length/2,.024,.09,length-.3);
   for(let z=1.3;z<length-.6;z+=1.5)part(g,0xffeac1,side*.999,roof*.74,-z,.02,roof*.29,.035);
   part(g,0x1c3647,side*.982,roof*.42,-.8,.025,roof*.65,.74);
   part(g,0x94b5bd,side*1.001,roof*.52,-.8,.02,.035,.68);
   for(const z of [-1.5,-length+1.5]) {
    const w=part(g,0x172732,side*.91,.34,z,.35,.23,.35,cylinder);w.rotation.z=Math.PI/2;
    const h=part(g,0x8b9aa4,side*1.035,.34,z,.17,.03,.17,cylinder);h.rotation.z=Math.PI/2;
    const spokes=new Group();spokes.position.set(side*1.055,.34,z);g.add(spokes);g.userData.wheels.push(spokes);
    for(let i=0;i<5;i++){const spoke=part(spokes,0xdbe7ed,0,0,0,.025,.29,.035);spoke.rotation.x=i*Math.PI/5;}
    part(g,0xffb526,side*.985,.70,z,.035,.10,.9);

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
  for(const o of s.items){if(o.type!=='bus'||o.z-s.distance>140)continue;live.add(o);if(!moving.has(o))moving.set(o,vehicle(o.length,2.8,true));const g=moving.get(o);g.position.set(o.lane*2.2,.09,s.distance-o.z);g.userData.wheels.forEach(w=>w.rotation.x=-s.time*(o.velocity||18)/.35);}
  for(const [o,g]of moving)if(!live.has(o)){scene.remove(g);moving.delete(o);}
 };
}
