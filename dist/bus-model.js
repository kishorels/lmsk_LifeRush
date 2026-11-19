import {mergeGeometries} from './vendor/BufferGeometryUtils.js';
import {Group,Mesh,MeshStandardMaterial,BoxGeometry,CylinderGeometry,Shape,ExtrudeGeometry,TorusGeometry,BufferGeometry,Float32BufferAttribute,Vector3,CanvasTexture,SRGBColorSpace} from './vendor/three.module.js';
const mats=new Map(),geometries=new Map(),cube=new BoxGeometry(),tyre=new CylinderGeometry(.40,.40,.20,24),hub=new CylinderGeometry(.22,.22,.025,20),archGeo=new TorusGeometry(.47,.035,6,24,Math.PI),lampGeo=new CylinderGeometry(1,1,1,16);
function paint(color) {
 if (mats.has(color)) return mats.get(color);
 const glass = color === 0x244759 || color === 0x162f42 || color === 0x1f4b68;
 const steel = color === 0xbacbd2 || color === 0xdbe6ef || color === 0xc8d8e4;
 const rubber = color === 0x192c38 || color === 0x121923;
 const ledWhite = color === 0xf8fbff || color === 0xeaf6ff;
 const ledRed = color === 0xff2e3b || color === 0xff4d4d;
 const ledAmber = color === 0xffa61e;
 const emissive = ledWhite ? 0xdbeafe : ledRed ? 0xb91c1c : ledAmber ? 0xd97706 : 0x000000;
 const emissiveIntensity = ledWhite ? 0.55 : ledRed ? 0.6 : ledAmber ? 0.5 : 0;
 const material = new MeshStandardMaterial({
  color,
  roughness: glass ? .09 : steel ? .20 : rubber ? .88 : (ledWhite || ledRed || ledAmber) ? .18 : .22,
  metalness: glass ? .75 : steel ? .88 : rubber ? .04 : .34,
  emissive,
  emissiveIntensity
 });
 mats.set(color,material);
 return material;
}
let routeSign, carPlateMat;
function destinationBoard() {
 if (routeSign || typeof document === 'undefined') return routeSign;
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=72;
 const ctx=canvas.getContext('2d');
 if (!ctx) return;
 ctx.fillStyle='#181c1b';ctx.fillRect(0,0,512,72);
 ctx.fillStyle='#f5bd61';ctx.font='bold 48px sans-serif';ctx.textAlign='center';
 ctx.fillText('07  SCHOOL BUS',256,52,480);
 const map=new CanvasTexture(canvas);map.colorSpace=SRGBColorSpace;
 routeSign=new MeshStandardMaterial({map,emissiveMap:map,emissive:0xffffff,emissiveIntensity:.45});
 return routeSign;
}
function licensePlateMat() {
 if (carPlateMat || typeof document === 'undefined') return carPlateMat;
 const canvas=document.createElement('canvas');canvas.width=256;canvas.height=64;
 const ctx=canvas.getContext('2d');
 if (!ctx) return;
 ctx.fillStyle='#f8fafc';ctx.fillRect(0,0,256,64);
 ctx.fillStyle='#1d4ed8';ctx.fillRect(0,0,28,64);
 ctx.strokeStyle='#0f172a';ctx.lineWidth=4;ctx.strokeRect(2,2,252,60);
 ctx.fillStyle='#0f172a';ctx.font='900 32px sans-serif';ctx.textAlign='center';
 ctx.fillText('TN 57 LK',142,43,210);
 const map=new CanvasTexture(canvas);map.colorSpace=SRGBColorSpace;
 carPlateMat=new MeshStandardMaterial({map,roughness:.38,metalness:.1});
 return carPlateMat;
}
function extrudeProfile(key, points, depth, bevel = .04) {
 if (geometries.has(key)) return geometries.get(key);
 const shape = new Shape();
 shape.moveTo(points[0][0], points[0][1]);
 for (let i = 1; i < points.length; i++) shape.lineTo(points[i][0], points[i][1]);
 shape.closePath();
 const g = new ExtrudeGeometry(shape, {
  depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel * 0.85, bevelSegments: 2, curveSegments: 8
 });
 geometries.set(key, g);
 return g;
}
function coachworkGeo(key, sections) {
 if (geometries.has(key)) return geometries.get(key);
 const positions = [], indices = [];
 for (const [z, base, top, lw, uw] of sections) {
  positions.push(-lw, base, z, lw, base, z, uw, top, z, -uw, top, z);
 }
 for (let i = 0; i < sections.length - 1; i++) for (let f = 0; f < 4; f++) {
  const a = i * 4 + f, b = i * 4 + (f + 1) % 4;
  indices.push(a, b, b + 4, a, b + 4, a + 4);
 }
 const end = 4 * (sections.length - 1);
 indices.push(0, 2, 1, 0, 3, 2, end, end + 1, end + 2, end, end + 2, end + 3);
 const geo = new BufferGeometry();
 geo.setAttribute('position', new Float32BufferAttribute(positions, 3));
 geo.setIndex(indices);
 geo.computeVertexNormals();
 // Ensure uvs exist so mergeGeometries in batchBody combines cleanly with Box/Cylinder/Extrude geometries.
 const count = geo.attributes.position.count;
 geo.setAttribute('uv', new Float32BufferAttribute(new Float32Array(count * 2), 2));
 geometries.set(key, geo);
 return geo;
}
// Merge fixed coach panels once per body size. Wheel hubs stay independently animated.
const bodyBatches=new Map();
function batchBody(group,key) {
 if (!bodyBatches.has(key)) {
  const buckets=new Map();
  for (const panel of group.children.filter(child=>child.isMesh)) {
   panel.updateMatrix();
   const geom=(panel.geometry.index ? panel.geometry.toNonIndexed() : panel.geometry.clone()).applyMatrix4(panel.matrix);
   if (!buckets.has(panel.material)) buckets.set(panel.material,[]);
   buckets.get(panel.material).push(geom);
  }
  const merged=[];
  for (const [material,parts] of buckets) {
   const mesh=new Mesh(mergeGeometries(parts),material);
   mesh.castShadow=mesh.receiveShadow=true;
   merged.push(mesh);
   for (const part of parts) part.dispose();
  }
  bodyBatches.set(key,merged);
 }
 for (const panel of [...group.children]) if (panel.isMesh) group.remove(panel);
 for (const panel of bodyBatches.get(key)) group.add(panel.clone());
}
function rounded(w,h,d,r=.14){const key=[w,h,d,r].join(':');if(geometries.has(key))return geometries.get(key);const g=new BoxGeometry(w,h,d,6,6,8),p=g.attributes.position,n=new Vector3();for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),cx=Math.max(-w/2+r,Math.min(w/2-r,x)),cy=Math.max(-h/2+r,Math.min(h/2-r,y)),cz=Math.max(-d/2+r,Math.min(d/2-r,z));n.set(x-cx,y-cy,z-cz).normalize().multiplyScalar(r);p.setXYZ(i,cx+n.x,cy+n.y,cz+n.z);}g.computeVertexNormals();geometries.set(key,g);return g;}
export function buildBus(length=10,roof=2.8,oncoming=true){
 const g=new Group();g.userData.captureObstacle=true;g.userData.wheels=[];
 const add=(c,x,y,z,w,h,d,geo=cube)=>{const m=new Mesh(geo,paint(c));m.position.set(x,y,z);m.scale.set(w,h,d);m.castShadow=m.receiveShadow=true;g.add(m);return m;};
 const shell=(c,x,y,z,w,h,d,r=.14)=>add(c,x,y,z,1,1,1,rounded(w,h,d,r));
 const yellow=0xdba22c,dark=0x192c38,glass=0x244759,cream=0xe2d8bd,silver=0xbacbd2;
 const wheelZ=[-1.45,-length+1.45];
 // Rounded upper coach shell; underbody panels have genuine wheel cutouts.
 shell(yellow,0,(roof+.83)/2,-length/2,1.94,roof-.83,length,.20);
 shell(cream,0,roof-.11,-length/2,1.91,.22,length-.12,.10);
 for(const side of [-1,1]){
  const shape=new Shape();shape.moveTo(-length+.15,.9);shape.lineTo(-length+.15,.23);
  for(const z of [...wheelZ].sort((a,b)=>a-b)){shape.lineTo(z-.47,.23);shape.lineTo(z-.47,.4);shape.absarc(z,.4,.47,Math.PI,0,true);shape.lineTo(z+.47,.23);}
  shape.lineTo(-.15,.23);shape.lineTo(-.15,.9);shape.closePath();
  const key='arch:'+length;let geometry=geometries.get(key);if(!geometry){geometry=new ExtrudeGeometry(shape,{depth:.12,bevelEnabled:false,curveSegments:12});geometries.set(key,geometry);}
  const panel=add(yellow,side*.94+.06,0,0,1,1,1,geometry);panel.rotation.y=-Math.PI/2;
  for(const z of wheelZ){const wheel=add(dark,side*.9,.4,z,1,1,1,tyre);wheel.rotation.z=Math.PI/2;const rim=add(silver,side*1.015,.4,z,1,1,1,hub);rim.rotation.z=Math.PI/2;
   const spokes=new Group();spokes.position.set(side*1.035,.4,z);g.add(spokes);g.userData.wheels.push(spokes);for(let i=0;i<6;i++){const m=new Mesh(cube,paint(dark));m.scale.set(.018,.06,.04);m.position.set(0,Math.cos(i*Math.PI/3)*.15,Math.sin(i*Math.PI/3)*.15);spokes.add(m);}
   const arch=add(cream,side*.958,.4,z,1,1,1,archGeo);arch.rotation.y=Math.PI/2;
  }
  for(let z=-1.45;z>-length+.75;z-=1.35){shell(glass,side*.958,roof*.72,z,.035,roof*.30,1.10,.015);add(silver,side*.983,roof*.72,z,.012,.025,1.05);}
  add(dark,side*.974,.94,-length/2,.025,.12,length-.4);
  shell(dark,side*.985,roof*.47,-.65,.03,roof*.68,.68,.014);shell(glass,side*1.003,roof*.61,-.65,.012,roof*.29,.57,.005);
  add(silver,side*1.015,roof*.39,-.65,.01,.04,.60);
  add(dark,side*1.025,roof*.73,-.16,.18,.05,.11);shell(dark,side*1.08,roof*.73,-.10,.13,.25,.14,.05);
 }
 // A raked wraparound windscreen and sculpted front mask break the box silhouette.
 const windshield=shell(glass,0,roof*.73,.045,1.70,roof*.34,.13,.06);windshield.rotation.x=-.12;
 shell(yellow,0,.79,-.08,1.82,.55,.25,.12);
 shell(dark,0,.29,-.04,1.86,.19,.24,.085);
 shell(dark,0,.66,.055,.65,.25,.025,.012);
 for(let i=0;i<4;i++)add(silver,0,.57+i*.055,.075,.58,.016,.015);
 for(const x of [-.68,.68]){shell(dark,x,.73,.043,.37,.23,.04,.018);for(const dx of [-.085,.085]){const lamp=add(cream,x+dx,.75,.073,.06,.022,.06,lampGeo);lamp.rotation.x=Math.PI/2;}add(0xf27527,x,.60,.075,.24,.045,.02);}
 for(const x of [-.39,.39]){const w=add(dark,x,roof*.64,.15,.025,roof*.17,.02);w.rotation.z=-.38;}
 const frontSign=shell(dark,0,roof*.93,.06,1.22,.21,.06,.024);
 const sign=destinationBoard();
 if(sign){const face=add(dark,0,frontSign.position.y,.095,1.16,.17,.006);face.material=sign;}
 // Rear face is visible when the player approaches a moving roof.
 shell(glass,0,roof*.72,-length-.015,1.67,roof*.28,.07,.032);
 shell(dark,0,.32,-length-.018,1.82,.19,.14,.065);
 for(const x of [-.77,.77]){
  add(0xaa3027,x,.72,-length-.047,.16,.24,.055);
  add(0xe29535,x,.91,-length-.048,.16,.075,.055);
 }
 for(const side of [-1,1]){
  add(cream,side*.978,roof*.52,-length*.53,.018,.095,length*.85);
  add(dark,side*.976,roof*.48,-length*.53,.017,.038,length*.85);
 }
 add(cream,0,.58,-length-.041,.39,.12,.035);
 add(cream,0,.34,.09,.43,.095,.015);add(dark,0,.34,.101,.27,.025,.006);
 // A flat central roof walkway retains the existing playable roof height.
 if(!oncoming)add(cream,0,roof-.015,-length/2,1.38,.05,length-.6);
 batchBody(g,[length,roof,oncoming].join(':'));
 return g;
}

export function buildCollegeVehicle(kind='car',length=4.5,roof=1.45,oncoming=true){
 const g=new Group();g.userData.captureObstacle=true;g.userData.wheels=[];
 const add=(c,x,y,z,w,h,d,geo=cube)=>{const m=new Mesh(geo,paint(c));m.position.set(x,y,z);m.scale.set(w,h,d);m.castShadow=m.receiveShadow=true;g.add(m);return m;};
 const shell=(c,x,y,z,w,h,d,r=.10)=>add(c,x,y,z,1,1,1,rounded(w,h,d,r));
 const bar=(c,a,b,rad=.026)=>{const p=new Vector3(...a),q=new Vector3(...b),dir=q.clone().sub(p),m=add(c,(p.x+q.x)/2,(p.y+q.y)/2,(p.z+q.z)/2,rad,dir.length(),rad,lampGeo);m.quaternion.setFromUnitVectors(new Vector3(0,1,0),dir.normalize());return m;};
 const dark=0x121923,glass=0x162f42,silver=0xdbe6ef,white=0xf1f5f9,teal=0x0ea5a4,crimson=0xdc2626,scootyBlue=0x0284c7,lamp=0xf8fbff,amber=0xffa61e,redLamp=0xff2e3b;
 const plate=licensePlateMat();
 if(kind==='van'){
  // Sleek aerodynamic Campus EV Shuttle Van with tumblehome cabin
  const vGeo=coachworkGeo('vanBody:'+length+':'+roof,[
   [-length,.28,.76,.80,.78],[-length+.12,.24,roof-.06,.92,.86],[-1.12,.24,roof,.94,.85],
   [-.48,.24,.84,.93,.88],[-.04,.26,.64,.82,.78],[.04,.30,.54,.72,.70]
  ]);
  add(white,0,0,0,1,1,1,vGeo);
  const vGlass=coachworkGeo('vanGlass:'+length+':'+roof,[
   [-length+.30,roof*.56,roof-.10,.88,.84],[-1.14,roof*.56,roof-.05,.89,.83],[-.50,.82,roof*.96,.85,.78],[-.22,.82,.84,.82,.78]
  ]);
  add(glass,0,0,0,1,1,1,vGlass);
  add(white,0,roof-.02,-length*.68,1.58,.06,length*.56);
  shell(teal,0,.44,-length/2,1.88,.22,length-.16,.04);
  shell(dark,0,.21,-length/2,1.84,.12,length-.06,.03);
  for(const side of [-1,1]){
   add(silver,side*.56,roof+.04,-length*.66,.06,.05,length*.48);
   bar(dark,[side*.90,.82,-.58],[side*1.04,.86,-.52],.02);
   shell(white,side*1.06,.87,-.54,.12,.10,.08,.02);
   add(lamp,side*.60,.52,.03,.26,.11,.04);
   add(amber,side*.76,.46,.02,.09,.06,.04);
   add(redLamp,side*.72,.62,-length-.01,.16,.24,.04);
  }
  shell(dark,0,.42,.03,.66,.16,.04,.01);
  if(plate){const pf=add(white,0,.29,.05,.40,.10,.015);pf.material=plate;}
 }else if(kind==='scooty'){
  // Realistic Campus Scooty: centered (+depth/2) curved apron, twin forks, fender, chrome exhaust & rider
  const apronProf=[[-.48,.24],[-.48,.88],[-.33,.94],[-.15,.82],[-.12,.38],[-.26,.24]];
  const ap=add(scootyBlue,.15,0,0,1,1,1,extrudeProfile('scootyApron',apronProf,.30,.04));
  ap.rotation.y=-Math.PI/2;
  const tailProf=[[-2.14,.48],[-2.08,.76],[-1.18,.78],[-1.12,.38],[-1.84,.34]];
  const tp=add(scootyBlue,.18,0,0,1,1,1,extrudeProfile('scootyTail',tailProf,.36,.045));
  tp.rotation.y=-Math.PI/2;
  shell(white,0,.64,-.12,.22,.38,.05,.02);
  shell(dark,0,.26,-.76,.36,.08,.72,.03);
  for(const side of [-1,1])bar(silver,[side*.10,.28,-.30],[side*.08,.96,-.42],.022);
  const fGuard=add(scootyBlue,0,.38,-.31,.26,.42,.38,archGeo);fGuard.rotation.y=Math.PI/2;fGuard.scale.set(.70,.55,.35);
  shell(dark,0,.78,-1.58,.30,.12,.82,.05);
  shell(0x334155,0,.85,-1.76,.28,.09,.36,.04);
  bar(silver,[-.16,.84,-1.96],[.16,.84,-1.96],.018);
  const muffler=add(dark,.22,.34,-1.72,.085,.44,.085,lampGeo);muffler.rotation.x=Math.PI/2-.15;
  add(silver,.23,.35,-1.72,.07,.32,.07,lampGeo).rotation.x=Math.PI/2-.15;
  const visor=shell(glass,0,1.08,-.36,.28,.19,.035,.012);visor.rotation.x=.38;
  bar(dark,[-.34,.98,-.40],[.34,.98,-.40],.022);
  for(const side of [-1,1]){
   add(dark,side*.32,.98,-.40,.11,.045,.045);
   bar(silver,[side*.24,.99,-.40],[side*.28,1.12,-.38],.01);
   shell(dark,side*.30,1.14,-.38,.12,.065,.035,.012);
   add(amber,side*.13,.76,-.11,.06,.06,.03);
  }
  add(lamp,0,.74,-.07,.16,.11,.04);
  add(redLamp,0,.64,-2.18,.15,.08,.04);
  if(plate){const pb=add(white,0,.44,-2.19,.24,.10,.015);pb.material=plate;}
  shell(0x1e293b,0,1.10,-1.44,.34,.50,.22,.08);
  shell(0x0ea5e9,0,1.16,-1.60,.26,.34,.14,.05);
  for(const side of [-1,1]){
   bar(0x1e293b,[side*.17,1.26,-1.42],[side*.27,1.04,-.88],.04);
   bar(0x1e293b,[side*.27,1.04,-.88],[side*.31,.98,-.42],.034);
   bar(0x0f172a,[side*.13,.88,-1.48],[side*.18,.52,-.92],.06);
   bar(0x0f172a,[side*.18,.52,-.92],[side*.16,.28,-.82],.045);
  }
  add(0xe2a885,0,1.46,-1.36,.19,.21,.19);
  shell(crimson,0,1.52,-1.36,.25,.24,.27,.09);
  shell(glass,0,1.50,-1.22,.22,.10,.05,.02);
 }else{
  // Sculpted Realistic Sports Sedan using tapered 3D automotive cross-sections
  const bodyLen=Math.min(length,4.6);
  const z0=-length/2-bodyLen/2, z1=-length/2+bodyLen/2;
  const cBody=coachworkGeo('cBody:'+bodyLen,[
   [z0,.34,.72,.74,.72],[z0+.35,.28,.88,.88,.82],[z0+1.10,.28,.91,.90,.84],
   [z1-1.35,.28,.89,.90,.84],[z1-.30,.29,.73,.88,.80],[z1,.34,.60,.74,.71]
  ]);
  const cCabin=coachworkGeo('cCabin:'+bodyLen+':'+roof,[
   [z0+.62,.86,.90,.78,.74],[z0+1.26,.89,roof,.81,.64],
   [z1-1.95,.88,roof+.02,.81,.64],[z1-1.15,.85,.88,.79,.74]
  ]);
  add(crimson,0,0,0,1,1,1,cBody);
  add(glass,0,0,0,1,1,1,cCabin);
  shell(crimson,0,roof-.01,z0+1.65,1.26,.06,bodyLen*.28,.025);
  shell(crimson,0,.92,z0+.16,1.42,.06,.16,.02);
  shell(dark,0,.22,-length/2,1.76,.12,bodyLen-.08,.03);
  shell(dark,0,.43,z1+.01,.76,.16,.04,.01);
  add(silver,0,.47,z1+.035,.66,.024,.02);
  add(silver,0,.40,z1+.035,.62,.024,.02);
  if(plate){
   const pf=add(white,0,.29,z1+.04,.40,.10,.015);pf.material=plate;
   const pr=add(white,0,.46,z0-.02,.40,.10,.015);pr.material=plate;
  }
  for(const side of [-1,1]){
   bar(crimson,[side*.79,.87,z1-1.15],[side*.64,roof,z1-1.92],.032);
   bar(dark,[side*.81,.89,z0+1.95],[side*.65,roof,z0+1.82],.028);
   bar(crimson,[side*.78,.86,z0+.64],[side*.64,roof,z0+1.26],.032);
   bar(dark,[side*.84,.88,z1-1.26],[side*.98,.92,z1-1.24],.02);
   shell(crimson,side*1.00,.93,z1-1.26,.13,.08,.09,.025);
   add(lamp,side*.60,.56,z1+.01,.26,.10,.04);
   add(amber,side*.76,.56,z1+.01,.08,.07,.04);
   add(redLamp,side*.62,.66,z0-.01,.32,.11,.04);
   add(silver,side*.46,.24,z0-.03,.065,.065,.08,lampGeo).rotation.x=Math.PI/2;
   for(const wz of [-length/2+1.25,-length/2-1.25]){
    const arch=add(dark,side*.88,.35,wz,.86,.86,.45,archGeo);arch.rotation.y=Math.PI/2;
   }
  }
  add(redLamp,0,.67,z0-.01,.88,.04,.03);
  add(crimson,0,roof+.06,z0+1.35,.06,.10,.15);
 }
 batchBody(g,['college',kind,length,roof,oncoming].join(':'));
 const wheelXs=kind==='scooty'?[0]:[-.86,.86];
 const wheelZs=kind==='scooty'?[-.31,-1.95]:kind==='van'?[-1.35,-length+1.35]:[-length/2+1.25,-length/2-1.25];
 const wScale=kind==='scooty'?.76:.94;
 for(const wx of wheelXs)for(const wz of wheelZs){
  const w=add(dark,wx,.36*wScale,wz,1,wScale,wScale,tyre);w.rotation.z=Math.PI/2;
  const r=add(silver,wx+(wx>=0?.09:-.09),.36*wScale,wz,1,wScale*.88,wScale*.88,hub);r.rotation.z=Math.PI/2;
  const spokes=new Group();spokes.position.set(wx+(wx>=0?.11:-.11),.36*wScale,wz);g.add(spokes);g.userData.wheels.push(spokes);
  for(let i=0;i<5;i++){
   const sp=new Mesh(cube,paint(dark));
   sp.scale.set(.02,.045*wScale,.16*wScale);
   const a=i*Math.PI*2/5;
   sp.position.set(0,Math.cos(a)*.11*wScale,Math.sin(a)*.11*wScale);
   sp.rotation.x=a;
   spokes.add(sp);
  }
 }
 return g;
}
