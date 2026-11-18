import {Group,Mesh,MeshStandardMaterial,BoxGeometry,CylinderGeometry,Shape,ExtrudeGeometry,TorusGeometry,Vector3} from './vendor/three.module.js';
const mats=new Map(),geometries=new Map(),cube=new BoxGeometry(),tyre=new CylinderGeometry(.40,.40,.20,24),hub=new CylinderGeometry(.22,.22,.025,20),archGeo=new TorusGeometry(.47,.035,6,24,Math.PI),lampGeo=new CylinderGeometry(1,1,1,16);
function paint(c){if(!mats.has(c))mats.set(c,new MeshStandardMaterial({color:c,roughness:c===0x244759?.22:.5,metalness:c===0xbacbd2?.65:.05}));return mats.get(c);}
function rounded(w,h,d,r=.14){const key=[w,h,d,r].join(':');if(geometries.has(key))return geometries.get(key);const g=new BoxGeometry(w,h,d,6,6,8),p=g.attributes.position,n=new Vector3();for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),cx=Math.max(-w/2+r,Math.min(w/2-r,x)),cy=Math.max(-h/2+r,Math.min(h/2-r,y)),cz=Math.max(-d/2+r,Math.min(d/2-r,z));n.set(x-cx,y-cy,z-cz).normalize().multiplyScalar(r);p.setXYZ(i,cx+n.x,cy+n.y,cz+n.z);}g.computeVertexNormals();geometries.set(key,g);return g;}
export function buildBus(length=10,roof=2.8,oncoming=true){
 const g=new Group();g.userData.captureObstacle=true;g.userData.wheels=[];
 const add=(c,x,y,z,w,h,d,geo=cube)=>{const m=new Mesh(geo,paint(c));m.position.set(x,y,z);m.scale.set(w,h,d);m.castShadow=m.receiveShadow=true;g.add(m);return m;};
 const shell=(c,x,y,z,w,h,d,r=.14)=>add(c,x,y,z,1,1,1,rounded(w,h,d,r));
 const yellow=0xffbc26,dark=0x192c38,glass=0x244759,cream=0xffe9ad,silver=0xbacbd2;
 const wheelZ=[-1.45,-length+1.45];
 // Rounded upper coach shell; underbody panels have genuine wheel cutouts.
 shell(yellow,0,(roof+.83)/2,-length/2,1.94,roof-.83,length,.20);
 shell(cream,0,roof-.11,-length/2,1.91,.22,length-.12,.10);
 for(const side of [-1,1]){
  const shape=new Shape();shape.moveTo(-length+.15,.9);shape.lineTo(-length+.15,.23);
  for(const z of [...wheelZ].sort((a,b)=>a-b)){shape.lineTo(z-.47,.23);shape.lineTo(z-.47,.4);shape.absarc(z,.4,.47,Math.PI,0,true);shape.lineTo(z+.47,.23);}
  shape.lineTo(-.15,.23);shape.lineTo(-.15,.9);shape.closePath();
  const key='arch:'+length;let geometry=geometries.get(key);if(!geometry){geometry=new ExtrudeGeometry(shape,{depth:.12,bevelEnabled:false,curveSegments:12});geometries.set(key,geometry);}
  const panel=add(yellow,side*.88,0,0,1,1,1,geometry);panel.rotation.y=-Math.PI/2;
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
 shell(dark,0,roof*.93,.045,.9,.18,.05,.025);for(let i=0;i<7;i++)add(cream,-.30+i*.10,roof*.93,.079,.055,.075,.012);
 add(cream,0,.34,.09,.43,.095,.015);add(dark,0,.34,.101,.27,.025,.006);
 // A flat central roof walkway retains the existing playable roof height.
 if(!oncoming)add(cream,0,roof-.015,-length/2,1.38,.05,length-.6);
 return g;
}
