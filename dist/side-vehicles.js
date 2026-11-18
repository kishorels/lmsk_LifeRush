import {Group,Mesh,MeshStandardMaterial,BoxGeometry,CylinderGeometry,SphereGeometry,TorusGeometry,Vector3} from './vendor/three.module.js';
import {sideVehicleX} from './traffic-rules.js';
const cube=new BoxGeometry(),sphere=new SphereGeometry(1,12,8),tyre=new TorusGeometry(.32,.055,6,20),rod=new CylinderGeometry(1,1,1,8),materials=new Map();
function part(g,c,x,y,z,w,h,d,geometry=cube){if(!materials.has(c))materials.set(c,new MeshStandardMaterial({color:c,roughness:.55}));const m=new Mesh(geometry,materials.get(c));m.position.set(x,y,z);m.scale.set(w,h,d);m.castShadow=true;g.add(m);return m;}
function bar(g,c,a,b,r=.035){const p=new Vector3(...a),q=new Vector3(...b),m=part(g,c,0,0,0,r,p.distanceTo(q),r,rod);m.position.copy(p.add(q).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new Vector3(0,1,0),q.sub(new Vector3(...a)).normalize());return m;}
export function buildSideVehicle(kind){const g=new Group();g.userData.wheels=[];
 if(kind==='car'){
  part(g,0xe54a39,0,.52,0,1.65,.6,3.2);part(g,0xe54a39,0,.85,.95,1.6,.18,1.1);part(g,0x244559,0,1.04,-.15,1.4,.54,1.42);part(g,0xee5b43,0,1.34,-.15,1.5,.12,1.55);
  for(const x of [-.72,.72])part(g,0xe54a39,x,1.05,-.15,.08,.54,.08);
  part(g,0x1d2b37,0,.37,1.64,1.52,.16,.08);part(g,0xeaf9ef,0,.41,1.69,.4,.13,.02);
  for(const x of [-.57,.57])part(g,0xfff1c1,x,.71,1.61,.36,.14,.04);
  for(const x of [-.8,.8])for(const z of [-1.05,1.05]){const w=part(g,0x152131,x,.32,z,1,1,1,tyre);w.rotation.y=Math.PI/2;g.userData.wheels.push(w);part(g,0xb6c9d1,x*1.035,.32,z,.04,.21,.21,sphere);}
 }else{
  for(const z of [-.68,.68]){const w=part(g,0x172330,0,.35,z,1,1,kind==='bike'?2:1,tyre);w.rotation.y=Math.PI/2;g.userData.wheels.push(w);for(let i=0;i<6;i++){const a=i*Math.PI/3;bar(g,0xb2c7cf,[0,.35,z],[0,.35+Math.sin(a)*.29,z+Math.cos(a)*.29],.012);}}
  const c=kind==='bike'?0x294de0:0xf19b27;
  for(const [a,b]of [[[0,.35,-.68],[0,.8,-.3]],[[0,.8,-.3],[0,.35,0]],[[0,.35,0],[0,.35,-.68]],[[0,.8,-.3],[0,.85,.43]],[[0,.85,.43],[0,.35,0]],[[0,.35,.68],[0,1.03,.39]]])bar(g,c,a,b,.045);
  if(kind==='bike'){part(g,c,0,.7,.05,.42,.37,.73,sphere);part(g,0x24303b,0,.46,-.03,.35,.25,.48);bar(g,0xb8c4c9,[.23,.35,-.55],[.23,.35,.1],.06);}
  part(g,0x172330,0,.88,-.3,.3,.08,.4);bar(g,0x1b2a35,[-.32,1.03,.39],[.32,1.03,.39]);
  // Helmeted rival rider, articulated arms and bent legs on the pedals.
  part(g,0x424e42,0,1.2,-.24,.42,.6,.28,sphere);part(g,0x667b56,0,1.68,-.15,.19,.23,.19,sphere);part(g,0x223347,0,1.8,-.15,.22,.15,.22,sphere);
  for(const side of [-1,1]){bar(g,0x667b56,[side*.21,1.4,-.2],[side*.29,1.15,.1],.07);bar(g,0x667b56,[side*.29,1.15,.1],[side*.3,1.03,.39],.055);bar(g,0x24314b,[side*.13,1,-.3],[side*.23,.65,.1],.10);bar(g,0x24314b,[side*.23,.65,.1],[side*.24,.32,-.15],.075);}
 }
 return g;
}
export function createSideTraffic(scene){const models=new Map();return s=>{const live=new Set();for(const o of s.items){if(o.type!=='sideVehicle'||!o.started)continue;live.add(o);if(!models.has(o)){const g=buildSideVehicle(o.variant);scene.add(g);models.set(o,g);}const g=models.get(o),t=Math.max(0,Math.min(1,(s.time-o.startedAt)/.45));g.position.set(sideVehicleX(o,s.time),.09,s.distance-o.z);g.rotation.y=-o.lane*Math.PI/2*(1-t);g.userData.wheels.forEach(w=>w.rotation.z=s.time*9*(1-t));}for(const [o,g]of models)if(!live.has(o)){scene.remove(g);models.delete(o);}};}
