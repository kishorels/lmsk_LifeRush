import {Group,Mesh,MeshStandardMaterial,BoxGeometry,CylinderGeometry,SphereGeometry,TorusGeometry,Vector3,BufferGeometry,Float32BufferAttribute} from './vendor/three.module.js';
import {sideVehicleX} from './traffic-rules.js';
import {curveRelX,curveRelY,roadCurveSlope} from './campus-layout.js';
const cube=new BoxGeometry(),sphere=new SphereGeometry(1,12,8),tyre=new TorusGeometry(.32,.055,6,20),rod=new CylinderGeometry(1,1,1,8),materials=new Map();
function part(g,c,x,y,z,w,h,d,geometry=cube){if(!materials.has(c))materials.set(c,new MeshStandardMaterial({color:c,roughness:.55}));const m=new Mesh(geometry,materials.get(c));m.position.set(x,y,z);m.scale.set(w,h,d);m.castShadow=true;g.add(m);return m;}
function bar(g,c,a,b,r=.035){const p=new Vector3(...a),q=new Vector3(...b),m=part(g,c,0,0,0,r,p.distanceTo(q),r,rod);m.position.copy(p.add(q).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new Vector3(0,1,0),q.sub(new Vector3(...a)).normalize());return m;}
// Cross-sections taper at the bumpers and rake the cabin glass toward the roof.
function coachwork(sections) {
 const positions=[],indices=[];
 for (const [z,base,top,lowerWidth,upperWidth] of sections) {
  positions.push(-lowerWidth,base,z, lowerWidth,base,z, upperWidth,top,z, -upperWidth,top,z);
 }
 for(let i=0;i<sections.length-1;i++)for(let face=0;face<4;face++) {
  const a=i*4+face,b=i*4+(face+1)%4;
  indices.push(a,b,b+4,a,b+4,a+4);
 }
 const end=4*(sections.length-1);
 indices.push(0,2,1,0,3,2,end,end+1,end+2,end,end+2,end+3);
 const geo=new BufferGeometry();
 geo.setAttribute('position',new Float32BufferAttribute(positions,3));geo.setIndex(indices);geo.computeVertexNormals();
 return geo;
}
const carBody=coachwork([[-1.6,.35,.64,.66,.67],[-1.36,.31,.84,.78,.74],[-.8,.31,.89,.81,.76],[.65,.31,.87,.81,.76],[1.38,.32,.73,.78,.72],[1.62,.36,.65,.67,.68]]);
const cabin=coachwork([[-1.12,.83,.86,.69,.66],[-.59,.86,1.33,.72,.58],[.25,.85,1.36,.72,.58],[.89,.83,.86,.71,.67]]);
export function buildSideVehicle(kind){const g=new Group();g.userData.captureObstacle=true;g.userData.wheels=[];
 if(kind==='car'){
  part(g,0x973f33,0,0,0,1,1,1,carBody);
  part(g,0x314950,0,0,0,1,1,1,cabin);
  part(g,0x973f33,0,1.345,-.16,1.15,.045,.78);
  for(const side of [-1,1]){
   bar(g,0x333635,[side*.72,.87,-.17],[side*.58,1.33,-.17],.028);
   part(g,0x973f33,side*.8,.95,.48,.12,.07,.13,sphere);
   part(g,0xa02c29,side*.55,.60,-1.59,.34,.11,.04);
  }
  part(g,0x1d2b37,0,.37,1.64,1.52,.16,.08);part(g,0xeaf9ef,0,.41,1.69,.4,.13,.02);
  for(const x of [-.57,.57])part(g,0xfff1c1,x,.71,1.61,.36,.14,.04);
  for(const x of [-.8,.8])for(const z of [-1.05,1.05]){const w=part(g,0x152131,x,.32,z,1,1,1,tyre);w.rotation.y=Math.PI/2;g.userData.wheels.push(w);part(g,0xb6c9d1,x*1.035,.32,z,.04,.21,.21,sphere);}
 }else if(kind==='scooty'){
  for(const z of [-.66,.66]){const w=part(g,0x172330,0,.28,z,.82,.82,1.6,tyre);w.rotation.y=Math.PI/2;g.userData.wheels.push(w);}
  part(g,0x0ea5e9,0,.55,.52,.38,.52,.36);part(g,0xf8fafc,0,.62,.70,.28,.34,.08);
  part(g,0x172330,0,.22,.02,.36,.08,.76);part(g,0x0ea5e9,0,.48,-.48,.34,.32,.78);part(g,0x1f2937,0,.70,-.44,.28,.12,.68);
  part(g,0xfff3c4,0,.74,.72,.14,.14,.04);bar(g,0x1b2a35,[-.34,.98,.48],[.34,.98,.48]);
  part(g,0x1e293b,0,1.12,-.24,.40,.56,.26,sphere);part(g,0xf97316,0,1.18,-.42,.30,.38,.14);
  part(g,0xe0a580,0,1.54,-.16,.19,.22,.19,sphere);part(g,0xef4444,0,1.62,-.16,.24,.18,.24,sphere);
  for(const side of [-1,1]){bar(g,0x334155,[side*.20,1.32,-.18],[side*.30,1.08,.18],.06);bar(g,0x334155,[side*.30,1.08,.18],[side*.32,.98,.48],.05);bar(g,0x1e293b,[side*.14,.92,-.26],[side*.20,.56,.06],.09);}
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
export function createSideTraffic(scene){const models=new Map();return s=>{const live=new Set();for(const o of s.items){if(o.type!=='sideVehicle'||!o.started)continue;live.add(o);if(!models.has(o)){const g=buildSideVehicle(o.variant);scene.add(g);models.set(o,g);}const g=models.get(o),t=Math.max(0,Math.min(1,(s.time-o.startedAt)/.45));g.position.set(sideVehicleX(o,s.time)+curveRelX(o.z,s),.09+curveRelY(o.z,s),s.distance-o.z);g.rotation.y=-o.lane*Math.PI/2*(1-t)-Math.atan(roadCurveSlope(o.z,s.map));g.userData.wheels.forEach(w=>w.rotation.z=s.time*9*(1-t));}for(const [o,g]of models)if(!live.has(o)){scene.remove(g);models.delete(o);}};}
