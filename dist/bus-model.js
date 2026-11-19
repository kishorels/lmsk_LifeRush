import {mergeGeometries} from './vendor/BufferGeometryUtils.js';
import {Group,Mesh,MeshStandardMaterial,BoxGeometry,CylinderGeometry,Shape,ExtrudeGeometry,TorusGeometry,Vector3,CanvasTexture,SRGBColorSpace} from './vendor/three.module.js';
const mats=new Map(),geometries=new Map(),cube=new BoxGeometry(),tyre=new CylinderGeometry(.40,.40,.20,24),hub=new CylinderGeometry(.22,.22,.025,20),archGeo=new TorusGeometry(.47,.035,6,24,Math.PI),lampGeo=new CylinderGeometry(1,1,1,16);
function paint(color) {
 if (mats.has(color)) return mats.get(color);
 const glass = color === 0x244759, steel = color === 0xbacbd2, rubber = color === 0x192c38;
 const material = new MeshStandardMaterial({
  color, roughness:glass ? .13 : steel ? .32 : rubber ? .91 : .37,
  metalness:glass ? .55 : steel ? .72 : .06
 });
 mats.set(color,material);
 return material;
}
let routeSign;
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
 const dark=0x162231,glass=0x1f4b68,silver=0xc8d8e4,white=0xf1f5f9,teal=0x0ea5a4,crimson=0xcf3241,scootyBlue=0x228be6;
 if(kind==='van'){
  shell(white,0,(roof+.58)/2,-length/2,1.90,roof-.58,length,.18);
  shell(teal,0,.46,-length/2,1.92,.44,length-.06,.10);
  shell(dark,0,.22,-length/2,1.88,.14,length+.02,.05);
  shell(glass,0,roof*.73,.02,1.68,roof*.32,.14,.05);
  for(const side of [-1,1]){
   add(teal,side*.965,roof*.58,-length/2,.025,.14,length*.86);
   add(silver,side*.56,roof+.04,-length/2,.07,.08,length*.82);
   shell(glass,side*.955,roof*.72,-length*.22,.03,roof*.28,length*.26,.012);
  }
  for(const x of [-.66,.66])add(0xe0f7ff,x,.56,.05,.34,.11,.03);
  add(0xff4d4d,-.72,.64,-length-.03,.20,.14,.04);
  add(0xff4d4d,.72,.64,-length-.03,.20,.14,.04);
 }else if(kind==='scooty'){
  shell(scootyBlue,0,.58,-.42,.42,.56,.44,.09);
  shell(white,0,.64,-.19,.32,.36,.08,.04);
  shell(dark,0,.28,-1.02,.36,.10,.76,.04);
  shell(scootyBlue,0,.56,-1.68,.38,.36,.92,.09);
  shell(dark,0,.80,-1.64,.30,.12,.76,.05);
  add(dark,0,1.02,-.42,.68,.045,.05);
  for(const side of [-1,1])add(silver,side*.28,1.12,-.42,.09,.06,.03);
  add(0xfff4c2,0,.78,-.16,.16,.14,.04);
  add(0xff3b3b,0,.62,-2.16,.16,.07,.03);
  shell(0x1e293b,0,1.05,-1.44,.38,.52,.26,.08);
  shell(0xf97316,0,1.12,-1.66,.32,.40,.16,.06);
  add(0xe2a885,0,1.46,-1.34,.22,.24,.22);
  shell(crimson,0,1.52,-1.35,.27,.24,.28,.09);
  shell(dark,0,1.50,-1.22,.24,.10,.06,.02);
 }else{
  const bodyLen=Math.min(length,4.6);
  const zMid=-length/2;
  shell(crimson,0,.52,zMid,1.76,.54,bodyLen,.12);
  shell(crimson,0,1.04,zMid-.15,1.48,.52,bodyLen*.52,.14);
  shell(glass,0,1.03,zMid-.14,1.52,.40,bodyLen*.46,.08);
  shell(dark,0,.25,zMid,1.80,.16,bodyLen+.05,.05);
  add(0xeef8ff,-.64,.56,zMid+bodyLen/2+.02,.30,.12,.03);
  add(0xeef8ff,.64,.56,zMid+bodyLen/2+.02,.30,.12,.03);
  add(dark,0,.44,zMid+bodyLen/2+.02,.62,.16,.03);
  add(0xff4242,-.64,.58,zMid-bodyLen/2-.02,.30,.12,.03);
  add(0xff4242,.64,.58,zMid-bodyLen/2-.02,.30,.12,.03);
 }
 batchBody(g,['college',kind,length,roof,oncoming].join(':'));
 const wheelXs=kind==='scooty'?[0]:[-.84,.84];
 const wheelZs=kind==='scooty'?[-.32,-1.95]:kind==='van'?[-1.35,-length+1.35]:[-length/2+1.25,-length/2-1.25];
 const wScale=kind==='scooty'?.78:1;
 for(const wx of wheelXs)for(const wz of wheelZs){
  const w=add(dark,wx,.36*wScale,wz,1,wScale,wScale,tyre);w.rotation.z=Math.PI/2;
  const r=add(silver,wx+(wx>=0?.09:-.09),.36*wScale,wz,1,wScale*.85,wScale*.85,hub);r.rotation.z=Math.PI/2;
  g.userData.wheels.push(w);
 }
 return g;
}
