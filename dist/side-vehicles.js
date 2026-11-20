import {Group,Mesh,MeshStandardMaterial,BoxGeometry,CylinderGeometry,SphereGeometry,TorusGeometry,Shape,ExtrudeGeometry,Vector3,BufferGeometry,Float32BufferAttribute} from './vendor/three.module.js';
import {sideVehicleX} from './traffic-rules.js';
import {curveRelX,curveRelY,curveSlopeAt} from './campus-layout.js';
import {buildPorscheGT3RS,buildBugattiChiron,buildDucatiStreetfighter} from './itpark-models.js?v=3.0.3';
const cube=new BoxGeometry(),sphere=new SphereGeometry(1,12,8),tyre=new TorusGeometry(.31,.065,8,24),arch=new TorusGeometry(.41,.035,6,18,Math.PI),rod=new CylinderGeometry(1,1,1,10),materials=new Map();
function makeMat(c){
 if(materials.has(c))return materials.get(c);
 const glass=c===0x172f3d||c===0x314950,steel=c===0xdbe6ef||c===0xb8c4c9,rubber=c===0x141d26||c===0x152131,ledW=c===0xf8fbff,ledR=c===0xff3434,ledA=c===0xffa51f;
 const m=new MeshStandardMaterial({
  color:c,
  roughness:glass?.08:steel?.18:rubber?.88:(ledW||ledR||ledA)?.18:.24,
  metalness:glass?.78:steel?.88:rubber?.04:.34,
  emissive:ledW?0xe0f2fe:ledR?0xb91c1c:ledA?0xd97706:0,
  emissiveIntensity:ledW?.55:ledR?.58:ledA?.48:0
 });
 materials.set(c,m);return m;
}
function part(g,c,x,y,z,w,h,d,geometry=cube){const m=new Mesh(geometry,makeMat(c));m.position.set(x,y,z);m.scale.set(w,h,d);m.castShadow=true;g.add(m);return m;}
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
function extrudePts(pts,depth,bevel=.03){
 const s=new Shape();s.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)s.lineTo(pts[i][0],pts[i][1]);s.closePath();
 return new ExtrudeGeometry(s,{depth,bevelEnabled:bevel>0,bevelThickness:bevel,bevelSize:bevel*.85,bevelSegments:2,curveSegments:8});
}
const carBody=coachwork([[-1.65,.32,.66,.68,.69],[-1.36,.28,.86,.80,.76],[-.8,.28,.90,.83,.78],[.65,.28,.88,.83,.78],[1.40,.30,.72,.80,.73],[1.66,.34,.64,.68,.68]]);
const cabin=coachwork([[-1.12,.84,.87,.71,.67],[-.59,.87,1.34,.74,.59],[.25,.86,1.37,.74,.59],[.89,.84,.87,.72,.68]]);
const scootyShieldGeo=extrudePts([[.42,.22],[.60,.36],[.62,.80],[.46,.92],[.30,.86],[.26,.24]],.28,.035);
const scootyTailGeo=extrudePts([[-.84,.44],[-.78,.72],[-.08,.74],[-.02,.32],[-.66,.30]],.34,.04);
const bikeTankGeo=extrudePts([[-.22,.64],[-.10,.94],[.20,.98],[.34,.82],[.26,.62]],.30,.04);
const bikeTailGeo=extrudePts([[-.88,.84],[-.80,.96],[-.26,.82],[-.28,.72]],.24,.03);
const bikeCowlGeo=extrudePts([[.34,.74],[.48,.96],[.64,.82],[.54,.64]],.24,.03);
function addAlloyWheel(g,x,y,z,scale=1,spokesCount=6){
 const w=part(g,0x152131,x,y,z,scale,scale,scale*1.1,tyre);w.rotation.y=Math.PI/2;
 const spokeGrp=new Group();spokeGrp.position.set(x,y,z);g.add(spokeGrp);g.userData.wheels.push(spokeGrp);
 const hub=new Mesh(rod,makeMat(0xdbe6ef));hub.scale.set(.09*scale,.09*scale,.09*scale);hub.rotation.z=Math.PI/2;spokeGrp.add(hub);
 for(let i=0;i<spokesCount;i++){const sp=new Mesh(cube,makeMat(0xdbe6ef));sp.scale.set(.024,.035*scale,.26*scale);const a=i*Math.PI/spokesCount;sp.position.set(0,Math.cos(a)*.12*scale,Math.sin(a)*.12*scale);sp.rotation.x=a;spokeGrp.add(sp);}
}
export function buildSideVehicle(kind){
 if(kind==='porsche')return buildPorscheGT3RS(3.8,true);
 if(kind==='bugatti')return buildBugattiChiron(3.8,true);
 if(kind==='ducati')return buildDucatiStreetfighter(true,true);
 const g=new Group();g.userData.captureObstacle=true;g.userData.wheels=[];
 if(kind==='car'){
  const red=0xb91c1c,glass=0x172f3d,dark=0x141d26,silver=0xdbe6ef;
  part(g,red,0,0,0,1,1,1,carBody);
  part(g,glass,0,0,0,1,1,1,cabin);
  part(g,red,0,1.355,-.16,1.16,.05,.80);
  part(g,red,0,.92,-1.56,1.36,.07,.16);
  for(const side of [-1,1]){
   bar(g,dark,[side*.72,.87,-.17],[side*.58,1.34,-.17],.028);
   bar(g,dark,[side*.74,.86,.42],[side*.60,1.32,.25],.024);
   bar(g,dark,[side*.74,.86,-.72],[side*.59,1.32,-.58],.024);
   part(g,red,side*.84,.95,.46,.14,.08,.11,sphere);
   part(g,0xff3434,side*.56,.61,-1.64,.36,.11,.04);
   part(g,0xf8fbff,side*.56,.68,1.65,.34,.11,.04);
   part(g,0xffa51f,side*.72,.68,1.64,.08,.07,.04);
   part(g,silver,side*.36,.24,-1.66,.065,.065,.08,rod).rotation.x=Math.PI/2;
   for(const wz of [-1.05,1.05]){
    const a=part(g,dark,side*.80,.34,wz,1,1,1,arch);a.rotation.y=Math.PI/2;
   }
  }
  part(g,dark,0,.44,1.66,.78,.17,.05);part(g,silver,0,.47,1.685,.66,.025,.02);part(g,silver,0,.41,1.685,.62,.025,.02);
  part(g,dark,0,.28,1.68,.46,.11,.03);
  for(const x of [-.81,.81])for(const z of [-1.05,1.05])addAlloyWheel(g,x,.33,z,.94,5);
 }else if(kind==='scooty'){
  const blue=0x0284c7,dark=0x141d26,silver=0xdbe6ef,glass=0x172f3d;
  for(const z of [-.66,.66])addAlloyWheel(g,0,.29,z,.82,5);
  part(g,blue,.14,0,0,1,1,1,scootyShieldGeo).rotation.y=-Math.PI/2;
  part(g,blue,.17,0,0,1,1,1,scootyTailGeo).rotation.y=-Math.PI/2;
  part(g,0xf8fafc,0,.62,.64,.24,.34,.05);
  part(g,dark,0,.24,.02,.34,.07,.70);
  part(g,dark,0,.76,-.42,.28,.12,.72);
  part(g,0x334155,0,.82,-.60,.26,.08,.30);
  bar(g,silver,[-.14,.80,-.76],[.14,.80,-.76],.018);
  for(const side of [-1,1]){
   bar(g,silver,[side*.08,.29,.66],[side*.06,.92,.48],.02);
   bar(g,silver,[side*.22,.99,.48],[side*.26,1.12,.50],.01);
   part(g,dark,side*.28,1.14,.50,.11,.06,.03);
   part(g,0xffa51f,side*.12,.72,.64,.05,.05,.03);
  }
  part(g,blue,0,.36,.65,.24,.36,.32,arch).rotation.y=Math.PI/2;
  part(g,glass,0,1.06,.52,.26,.18,.03).rotation.x=-.35;
  part(g,silver,.20,.32,-.64,.07,.38,.07,rod).rotation.x=Math.PI/2-.15;
  part(g,0xf8fbff,0,.74,.67,.14,.10,.03);part(g,0xff3434,0,.62,-.86,.14,.07,.03);
  bar(g,dark,[-.34,.98,.48],[.34,.98,.48],.022);
  part(g,0x1e293b,0,1.12,-.24,.32,.48,.22,sphere);part(g,0x0ea5e9,0,1.18,-.38,.24,.32,.12);
  part(g,0xe0a580,0,1.50,-.16,.18,.20,.18,sphere);part(g,0xdc2626,0,1.56,-.16,.23,.19,.25,sphere);part(g,glass,0,1.54,-.04,.21,.08,.05);
  for(const side of [-1,1]){bar(g,0x1e293b,[side*.17,1.30,-.18],[side*.28,1.06,.18],.045);bar(g,0x1e293b,[side*.28,1.06,.18],[side*.31,.98,.48],.038);bar(g,0x0f172a,[side*.12,.90,-.26],[side*.18,.52,.06],.07);}
 }else{
  const bodyCol=kind==='bike'?0x1d4ed8:0xf59e0b,dark=0x141d26,silver=0xdbe6ef,glass=0x172f3d,gold=0xd97706;
  for(const z of [-.68,.68])addAlloyWheel(g,0,.34,z,1,10);
  if(kind==='bike'){
   // Realistic Street/Sports Motorcycle: centered (+depth/2) chiseled tank, twin-spar frame, USD forks, split LED fairing & exhaust
   part(g,bodyCol,.15,0,0,1,1,1,bikeTankGeo).rotation.y=-Math.PI/2;
   part(g,bodyCol,.12,0,0,1,1,1,bikeTailGeo).rotation.y=-Math.PI/2;
   part(g,bodyCol,.12,0,0,1,1,1,bikeCowlGeo).rotation.y=-Math.PI/2;
   part(g,glass,0,1.02,.52,.22,.16,.03).rotation.x=-.45;
   part(g,0xf8fbff,0,.82,.64,.16,.09,.04);part(g,0xff3434,0,.88,-.88,.14,.06,.04);
   part(g,dark,0,.48,.02,.32,.30,.50);part(g,silver,.20,.38,-.50,.085,.48,.085,rod).rotation.x=Math.PI/2-.22;
   for(const side of [-1,1]){
    bar(g,gold,[side*.09,.35,.68],[side*.07,1.02,.39],.028);
    bar(g,silver,[side*.14,.62,-.18],[side*.12,.34,-.68],.025);
    bar(g,silver,[side*.22,1.04,.40],[side*.28,1.16,.44],.011);
    part(g,dark,side*.30,1.18,.44,.11,.06,.035);
   }
   part(g,dark,0,.76,-.24,.24,.09,.34);part(g,0x334155,0,.88,-.54,.20,.07,.28);
   bar(g,dark,[-.34,1.02,.40],[.34,1.02,.40],.024);
   part(g,0x0f172a,0,1.22,-.16,.30,.46,.20,sphere);part(g,bodyCol,0,1.28,-.29,.22,.28,.11);
   part(g,0xe0a580,0,1.60,-.08,.17,.19,.17,sphere);part(g,0x1e293b,0,1.67,-.08,.22,.19,.24,sphere);part(g,glass,0,1.65,.04,.20,.08,.04);
   for(const side of [-1,1]){bar(g,0x0f172a,[side*.17,1.36,-.12],[side*.28,1.14,.16],.046);bar(g,0x0f172a,[side*.28,1.14,.16],[side*.31,1.02,.40],.038);bar(g,0x1e293b,[side*.12,1.00,-.24],[side*.20,.66,.08],.075);bar(g,0x1e293b,[side*.20,.66,.08],[side*.22,.36,-.16],.058);}
  }else{
   for(const [a,b]of [[[0,.35,-.68],[0,.8,-.3]],[[0,.8,-.3],[0,.35,0]],[[0,.35,0],[0,.35,-.68]],[[0,.8,-.3],[0,.85,.43]],[[0,.85,.43],[0,.35,0]],[[0,.35,.68],[0,1.03,.39]]])bar(g,bodyCol,a,b,.045);
   part(g,dark,0,.88,-.3,.3,.08,.4);bar(g,dark,[-.32,1.03,.39],[.32,1.03,.39]);
   part(g,0x424e42,0,1.2,-.24,.42,.6,.28,sphere);part(g,0x667b56,0,1.68,-.15,.19,.23,.19,sphere);part(g,0x223347,0,1.8,-.15,.22,.15,.22,sphere);
   for(const side of [-1,1]){bar(g,0x667b56,[side*.21,1.4,-.2],[side*.29,1.15,.1],.07);bar(g,0x667b56,[side*.29,1.15,.1],[side*.3,1.03,.39],.055);bar(g,0x24314b,[side*.13,1,-.3],[side*.23,.65,.1],.10);bar(g,0x24314b,[side*.23,.65,.1],[side*.24,.32,-.15],.075);}
  }
 }
 return g;
}
export function createSideTraffic(scene){const models=new Map();return s=>{const live=new Set();for(const o of s.items){if(o.cleared||o.type!=='sideVehicle'||!o.started)continue;live.add(o);if(!models.has(o)){const g=buildSideVehicle(o.variant);scene.add(g);models.set(o,g);}const g=models.get(o),t=Math.max(0,Math.min(1,(s.time-o.startedAt)/.45));g.position.set(sideVehicleX(o,s.time)+curveRelX(o.z,s),.09+curveRelY(o.z,s),s.distance-o.z);g.rotation.y=-o.lane*Math.PI/2*(1-t)-Math.atan(curveSlopeAt(o.z,s));g.userData.wheels.forEach(w=>{if(o.variant==='porsche'||o.variant==='bugatti'||o.variant==='ducati')w.rotation.x=-s.time*14*(1-t);else w.rotation.z=s.time*9*(1-t);});}for(const [o,g]of models)if(!live.has(o)){scene.remove(g);models.delete(o);}};}
