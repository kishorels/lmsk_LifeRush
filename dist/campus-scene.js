import {buildBus} from './bus-model.js';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';
import {Group,Mesh,BoxGeometry,SphereGeometry,CylinderGeometry,MeshStandardMaterial,CanvasTexture,SRGBColorSpace} from './vendor/three.module.js';
import {campusAnchor,campusKind,CAMPUS_SLOTS} from './campus-layout.js';
export function createCampus(scene) {
 const cube=new BoxGeometry(),sphere=new SphereGeometry(1,10,7),cyl=new CylinderGeometry(1,1,1,10),mats=new Map(),signs=new Map();
 function part(g,c,x,y,z,w,h,d,geo=cube){if(!mats.has(c))mats.set(c,new MeshStandardMaterial({color:c,roughness:.88}));const m=new Mesh(geo,mats.get(c));m.position.set(x,y,z);m.scale.set(w,h,d);m.receiveShadow=true;g.add(m);return m;}
 function sign(g,label,x,y,z,width=3){
  part(g,0x254d50,x,y,z,width,.55,.12);
  if(typeof document==='undefined')return;
  if(!signs.has(label)){
   const c=document.createElement('canvas');c.width=512;c.height=96;const ctx=c.getContext('2d');if(!ctx)return;
   ctx.fillStyle='#254d50';ctx.fillRect(0,0,512,96);ctx.fillStyle='#fff2d5';ctx.font='bold 44px sans-serif';ctx.textAlign='center';ctx.fillText(label,256,64,480);
   const t=new CanvasTexture(c);t.colorSpace=SRGBColorSpace;signs.set(label,new MeshStandardMaterial({map:t,roughness:.9}));
  }
  const m=new Mesh(cube,signs.get(label));m.position.set(x,y,z+.066);m.scale.set(width,.55,.01);g.add(m);
 }
 function tree(g,x,z){
  part(g,0x795a3e,x,1.35,z,.14,2.7,.14,cyl);
  for(let branch=0;branch<5;branch++){
   const angle=branch*2.399,dx=Math.cos(angle),dz=Math.sin(angle),y=2.2+branch*.12;
   const limb=part(g,0x795a3e,x+dx*.42,y,z+dz*.42,.065,1.25,.065,cyl);limb.rotation.z=-dx*.65;limb.rotation.x=dz*.65;
   for(let n=0;n<9;n++){
    const a=n*2.399+branch,r=.18+Math.sqrt(n/9)*.66;
    const leaf=part(g,n%3?0x438a38:0x72ad46,x+dx*.65+Math.cos(a)*r,y+.65+Math.sin(n*1.7)*.33,z+dz*.65+Math.sin(a)*r,.45,.23,.35,sphere);
    leaf.rotation.set(Math.sin(a)*.3,a,Math.cos(a)*.25);
   }
  }
 }
 function bench(g,x,z){part(g,0x9c7651,x,.55,z,1.9,.15,.55);part(g,0xa98760,x,.95,z-.2,1.9,.58,.1);for(const dx of [-.7,.7])part(g,0x455b52,x+dx,.3,z,.10,.6,.5);}
 function building(g,side,label,style=0){
  if(style){featureBuilding(g,side,label,style);return;}
  const x=side*10;
  part(g,0xffd888,x,2.8,-3,8,5.6,20);part(g,0x208d9e,x,5.7,-3,8.4,.24,20.4);part(g,0xf3ead2,x,.38,-3,8.2,.65,20.2);
  for(const y of [2.65,5.25])part(g,0xf3ead2,side*5.78,y,-3,.22,.16,20);
  for(let i=0;i<6;i++){const z=5-i*3.1;part(g,0x208d9e,side*5.63,2.48,z,.68,.12,2);part(g,0xf3ead2,side*5.81,1.72,z,.03,.055,1.6);}
  for(let level=0;level<2;level++)for(let i=0;i<6;i++){
   const z=5-i*3.1;part(g,0xf7edda,side*5.96,1.7+level*2.45,z,.12,1.38,1.85);part(g,0x276fa0,side*5.87,1.7+level*2.45,z,.05,1.13,1.60);part(g,0xd8dfd4,side*5.83,1.7+level*2.45,z,.025,1.1,.06);
  }
  for(const dx of [-2.6,-.9,.9,2.6]){part(g,0xf7edda,x+dx,4,7.04,1.3,1.5,.1);part(g,0x276fa0,x+dx,4,7.1,1.1,1.25,.04);}
  part(g,0x37595b,x,1.15,7.08,1.4,2.3,.12);sign(g,label,x,2.9,7.13,4.4);
  for(let i=0;i<5;i++)part(g,0xe9dfc7,side*5.4,1.25,5-i*4,.22,2.5,.22);
  part(g,0xe8794e,side*5.3,2.58,-3,1.5,.18,20);
 }
 function featureBuilding(g,side,label,style){
  const x=side*10,h=[0,8,4.2,3,4.5,6.8][style],body=[0,0xf3ead2,0xe8794e,0xffd888,0x208d9e,0xffd888][style];
  part(g,body,x,h/2,-3,8,h,20);part(g,0xf3ead2,x,.22,-3,8.4,.44,20.4);
  if(style===1){
   // Tall science block with continuous glazed strips and vertical fins.
   for(let floor=0;floor<3;floor++){
    part(g,0x276fa0,side*5.94,1.65+floor*2.5,-3,.08,1.75,18.7);
    part(g,0x276fa0,x,1.65+floor*2.5,7.06,7,1.75,.08);
    part(g,0x208d9e,side*5.80,2.65+floor*2.5,-3,.45,.12,20.5);
   }
   for(let i=0;i<7;i++)part(g,0xf3ead2,side*5.82,4,6-i*3,.25,7.9,.14);
   part(g,0x208d9e,x,8.14,-3,8.5,.28,20.5);
  }else if(style===2||style===3){
   // Library's pitched tile roof; canteen's low red roof and striped canopy.
   for(const sign of [-1,1]){const roof=part(g,0x795a3e,x+sign*2.1,h+.65,-3,4.7,.20,21);roof.rotation.z=-sign*.29;}
   const floors=style===2?2:1;
   for(let level=0;level<floors;level++)for(let i=0;i<6;i++){const z=5-i*3.2,y=1.3+level*1.9;part(g,0xf3ead2,side*5.9,y,z,.18,1.4,1.6);part(g,0x276fa0,side*5.79,y,z,.04,1.14,1.34);}
   if(style===3){for(let i=0;i<12;i++){const awning=part(g,i%2?0xf3ead2:0xe8794e,side*5.05,2.6,6-i*1.65,2.1,.13,1.65);awning.rotation.z=side*.16;}for(const z of [3,-4,-10])bench(g,side*6,z);}
   else{part(g,0xf3ead2,x,5.1,7.2,2.3,2.4,.35);const face=part(g,0x254d50,x,5.5,7.43,.70,.08,.70,cyl);face.rotation.x=Math.PI/2;part(g,0xf3ead2,x,5.65,7.49,.06,.40,.04);part(g,0xf3ead2,x+.16,5.49,7.49,.36,.06,.04);}
  }else if(style===4){
   // Broad vaulted auditorium, visibly unlike the flat classroom blocks.
   const roof=new SphereGeometry(1,24,12,0,Math.PI*2,0,Math.PI/2);part(g,0xf3ead2,x,h,-3,4.3,2.1,10.4,roof);
   for(const dx of [-2.6,-.9,.9,2.6])part(g,0x276fa0,x+dx,2.2,7.08,1.25,3.2,.08);
   for(let i=0;i<7;i++)part(g,0xf3ead2,side*5.85,2.3,6-i*3,.24,4.5,.18);
  }else{
   // Administration block: stepped tower and covered entrance.
   part(g,0xe8794e,x-side*1.9,h+1.1,2,3.3,2.2,5);
   part(g,0x208d9e,x-side*1.9,h+2.25,2,3.7,.3,5.4);
   for(let level=0;level<3;level++)for(let i=0;i<5;i++){const z=5-i*3.7;part(g,0xf3ead2,side*5.92,1.3+level*2.1,z,.12,1.4,2.0);part(g,0x276fa0,side*5.83,1.3+level*2.1,z,.05,1.15,1.75);}
   part(g,0x208d9e,x,2.8,8,5,.20,2.6);for(const dx of [-2.1,2.1])part(g,0xf3ead2,x+dx,1.4,9,.2,2.8,.2);
  }
  part(g,0x254d50,x,1.15,7.12,1.65,2.3,.12);sign(g,label,x,Math.min(h-.4,3.7),7.25,5.5);
 }
 function field(g,side){const x=side*11;
  part(g,0x3da85a,x,.12,-2,12,.08,24);
  for(const dx of [-5,5])part(g,0xe6e7cc,x+dx,.17,-2,.06,.02,22);
  for(const z of [-13,-2,9])part(g,0xe6e7cc,x,.17,z,10,.02,.06);
  for(const z of [-12.8,8.8]){for(const dx of [-1.5,1.5])part(g,0xe5e6d9,x+dx,1.1,z,.10,2.2,.10);part(g,0xe5e6d9,x,2.2,z,3.1,.10,.10);}
  sign(g,'SPORTS GROUND',side*7,1.9,11,3.6);bench(g,side*5.3,4);tree(g,side*6.1,-10);
 }
 function courtyard(g,side){const x=side*9;
  part(g,0xcac9b3,x,.12,-2,7,.10,23);
  for(const z of [7,-3,-11]){tree(g,x+side*2,z);bench(g,x-side,z);part(g,0xb89673,x+side*2,.30,z,2,.45,1.7);}
  sign(g,'READING GARDEN',x,2.1,10,4);
 }
 function parking(g,side){const x=side*10;
  part(g,0x727b7d,x,.13,-2,8,.08,24);
  for(let i=0;i<6;i++){const z=8-i*4;part(g,0xe8e0bf,x,.18,z,6,.02,.07);}
  for(let i=0;i<3;i++){const bus=buildBus(4.7,2.4,true);bus.position.set(x,.09,7-i*7);g.add(bus);}
  sign(g,'SCHOOL TRANSPORT',x,2.6,11,5);tree(g,side*5.5,-10);
 }
 function build(kind){const g=new Group();
  for(const side of [-1,1]){
   for(let i=0;i<8;i++){part(g,0xf3ebd4,side*3.66,.20,14-i*4,.22,.24,3.95);part(g,0x476d59,side*4.9,.55,14-i*4,.10,1.1,.10);}
   part(g,0x9ea98d,side*4.9,.24,0,.25,.48,32);part(g,0x476d59,side*4.9,1.03,0,.06,.07,32);
   for(let i=0;i<4;i++){part(g,0xe9e3ca,side*1.1,.105,12-i*8,.06,.018,3.5);}
  }
  for(const side of [-1,1]){for(let i=0;i<16;i++){const z=15-i*2;part(g,0xcac9b3,side*4.3,.177,z,1.25,.008,.025);}for(const z of [-8,8]){part(g,0x455b52,side*4.65,2.1,z,.07,4.2,.07);part(g,0xf3ead2,side*4.4,4.2,z,.65,.12,.35);}}
  if(kind===0){building(g,-1,'CLASSROOM BLOCK');courtyard(g,1);}
  if(kind===1){field(g,-1);building(g,1,'SCIENCE LAB',1);}
  if(kind===2){building(g,-1,'SCHOOL LIBRARY',2);field(g,1);}
  if(kind===3){building(g,-1,'CAMPUS CANTEEN',3);parking(g,1);}
  if(kind===4){building(g,-1,'AUDITORIUM',4);building(g,1,'ADMINISTRATION',5);}
  if(kind===5){field(g,-1);building(g,1,'STUDENT CENTRE',3);}
  // Batch static campus details by material to keep mobile draw calls low.
  g.updateMatrixWorld(true);const batches=new Map();
  g.traverse(o=>{if(!o.isMesh)return;const geo=(o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone()).applyMatrix4(o.matrixWorld);if(!batches.has(o.material))batches.set(o.material,[]);batches.get(o.material).push(geo);});
  const merged=new Group();for(const [mat,list]of batches){const mesh=new Mesh(mergeGeometries(list),mat);mesh.receiveShadow=true;merged.add(mesh);for(const geo of list)geo.dispose();}
  return merged;
 }
 const templates=[0,1,2,3,4,5].map(build);
 const slots=Array.from({length:CAMPUS_SLOTS},(_,slot)=>{const root=new Group();scene.add(root);return{slot,root,kind:-1};});
 const cache=Array.from({length:CAMPUS_SLOTS},()=>new Map());
 return s=>{for(const item of slots){const anchor=campusAnchor(item.slot,s.distance),kind=campusKind(anchor);
  if(item.kind!==kind){item.root.clear();if(!cache[item.slot].has(kind))cache[item.slot].set(kind,templates[kind].clone());item.root.add(cache[item.slot].get(kind));item.kind=kind;}
  item.root.position.z=s.distance-anchor;
 }};
}
