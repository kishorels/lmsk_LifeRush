import {BoxGeometry,CanvasTexture,Group,Mesh,MeshStandardMaterial,RepeatWrapping,SphereGeometry,SRGBColorSpace,TextureLoader} from './vendor/three.module.js';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';
import {roadsideTree} from './street-materials.js';
import {campusAnchor,campusKind,CAMPUS_SLOTS,curveRelX,curveRelY,roadCurveSlope} from './campus-layout.js';

// A separate modern campus set; it uses the same collision-safe road and route plan.
export function createCollegeCampus(scene){
 const box=new BoxGeometry(),crown=new SphereGeometry(1,9,6),materials=new Map();
 const C={stone:0xd6c9b4,cream:0xeee4d3,brick:0x905d48,brickLight:0xb4775c,concrete:0xaeb7b5,glass:0x315565,glassLight:0x648e99,frame:0x263e46,slate:0x35464d,metal:0x566b70,timber:0x74533d,leaf:0x456b48,leafLight:0x668651,leafDark:0x315b49};
 const plaster=typeof document==='undefined'?null:new TextureLoader().load(new URL('./assets/street/plaster.webp',import.meta.url).href);
 if(plaster){plaster.colorSpace=SRGBColorSpace;plaster.wrapS=plaster.wrapT=RepeatWrapping;plaster.repeat.set(2,2);plaster.anisotropy=4;}
 const masonry=new Set([C.stone,C.cream,C.brick,C.brickLight,C.concrete]);
 function material(color){
  if(!materials.has(color))materials.set(color,new MeshStandardMaterial({color,map:masonry.has(color)?plaster:null,bumpMap:masonry.has(color)?plaster:null,bumpScale:.012,roughness:[C.glass,C.glassLight].includes(color)?.28:.84,metalness:[C.glass,C.metal,C.frame].includes(color)?.22:0}));
  return materials.get(color);
 }
 function part(root,color,x,y,z,w,h,d,geo=box){
  const mesh=new Mesh(geo,material(color));mesh.position.set(x,y,z);mesh.scale.set(w,h,d);root.add(mesh);return mesh;
 }
 function label(root,text,x,y,z){
  if(typeof document==='undefined')return;
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=96;
  const ctx=canvas.getContext('2d');if(!ctx)return;
  ctx.fillStyle='#213d48';ctx.fillRect(0,0,512,96);ctx.fillStyle='#f4e8cd';ctx.textAlign='center';ctx.font='bold 34px Arial';ctx.fillText(text,256,62,475);
  const map=new CanvasTexture(canvas);map.colorSpace=SRGBColorSpace;
  const mesh=new Mesh(box,new MeshStandardMaterial({map,roughness:.7}));mesh.position.set(x,y,z);mesh.scale.set(.035,.62,3.9);root.add(mesh);
 }
 function tree(root,side,z,variant=0,x=7.2){
  const h=4.9+(Math.abs(variant)%3)*.3;
  roadsideTree(root,side*x,z,h,false,0);
  roadsideTree(root,side*x,z,h,false,Math.PI/2);
 }
 function bench(root,side,z){
  const x=side*6.25;
  part(root,C.timber,x,.68,z,.82,.12,1.72);
  part(root,C.timber,x+side*.33,1.01,z,.12,.67,1.72);
  for(const q of [-.6,.6])part(root,C.frame,x,.34,z+q,.66,.57,.11);
 }
 function building(root,side,kind){
  const heights=[9.6,12.1,9.3,5.9,11.1,8.1],depths=[22,20,25,17,22,18];
  const h=heights[kind],depth=depths[kind],setback=kind===3?3.1:kind===5?2.1:0;
  const center=side*(10+setback),width=8.25,face=center-side*(width/2+.05),z=-1.8;
  const wall=[C.brick,C.concrete,C.stone,C.brickLight,C.concrete,C.cream][kind];
  part(root,wall,center,h/2,z,width,h,depth);
  part(root,C.slate,center,h+.18,z,width+.58,.36,depth+.55);
  part(root,C.stone,center,.45,z,width+.5,.9,depth+.4);
  if(kind===0){
   for(let y=2.6;y<h;y+=2.3)part(root,C.cream,face+side*.01,y,z,.16,.13,depth+.18);
   for(const p of [-depth/2+.7,depth/2-.7])part(root,C.cream,face-side*.1,h/2,z+p,.2,h,.42);
  }else if(kind===1){
   part(root,C.glassLight,face-side*.06,h/2,z-depth*.31,.13,h-1.2,3.1);
   for(let y=2;y<h;y+=2.25)part(root,C.cream,face-side*.14,y,z-depth*.31,.18,.12,3.22);
   part(root,C.metal,center,h+.75,z-depth*.26,2.5,1.14,3.7);
  }else if(kind===2){
   for(const p of [-5.5,-3.7,-1.9,0,1.9,3.7,5.5])part(root,C.cream,face-side*.75,3.15,z+p,.36,6.3,.36);
   part(root,C.stone,face-side*.78,6.35,z,1.95,.37,depth-.8);
   part(root,C.glassLight,center,h+.8,z,3,1.3,6);
   part(root,C.slate,center,h+1.55,z,3.3,.18,6.3);
  }else if(kind===3){
   part(root,C.glass,face-side*.06,2.3,z,.1,3.7,depth-1.5);
   part(root,C.timber,face-side*1.25,3.5,z,2.45,.25,depth-1);
   for(const p of [-6,-2,2,6])part(root,C.frame,face-side*2.2,1.75,z+p,.13,3.5,.13);
   for(const p of [-5,0,5])bench(root,side,z+p);
  }else if(kind===4){
   part(root,C.brickLight,center+side*1.5,h+1,z,4.8,1.7,depth-.2);
   for(let y=2.4;y<h;y+=2.25)part(root,C.metal,face-side*.47,y+.84,z,.93,.15,depth-.6);
   for(const p of [-7,-3,1,5])part(root,C.frame,face-side*.5,3,z+p,.16,5.3,.15);
  }else{
   part(root,C.stone,face-side*.9,4.75,z,2.1,.45,depth-.3);
   for(const p of [-6,-3,0,3,6])part(root,C.stone,face-side*1.8,2.4,z+p,.38,4.8,.38);
   part(root,C.slate,center,h+.65,z,3.8,.92,4.1);
  }
  const levels=Math.max(1,Math.floor((h-1.8)/2.3));
  for(let level=0;level<levels;level++){
   const y=2.05+level*2.25;
   if(kind===3&&level>0)continue;
   for(let p=z-depth/2+1.65;p<z+depth/2-1.15;p+=kind===2?2.5:2.85){
    part(root,C.frame,face-side*.04,y,p,.08,1.49,2.12);
    part(root,kind===1?C.glassLight:C.glass,face-side*.1,y,p,.055,1.34,1.91);
    for(const q of [-.96,.96])part(root,C.cream,face-side*.13,y,p+q,.085,1.34,.055);
    part(root,C.frame,face-side*.14,y-.02,p,.09,.05,1.94);
    if(kind===0||kind===4)part(root,kind===0?C.brickLight:C.concrete,face-side*.15,y,p+1.17,.14,1.7,.23);
   }
   part(root,kind===0?C.cream:C.metal,face-side*.16,y-.86,z,.18,.13,depth+.3);
  }
  const doorZ=z+depth*.28;
  part(root,C.frame,face-side*.11,1.25,doorZ,.11,2.5,1.55);
  part(root,C.glassLight,face-side*.18,1.22,doorZ,.06,2.27,1.33);
  part(root,C.slate,face-side*.95,2.58,doorZ,1.93,.19,2.45);
  label(root,['SCIENCE','INNOVATION','LIBRARY','STUDENT UNION','ENGINEERING','ADMINISTRATION'][kind],face-side*.19,3.5,doorZ);
  if(kind===3||kind===5){tree(root,side,-9,kind+1,6.9);tree(root,side,8,kind+2,7.3);}
 }
 function build(kind){
  const root=new Group();
  building(root,-1,kind);building(root,1,(kind+3)%6);
  for(const side of [-1,1]){
   part(root,C.stone,side*4.43,.10,0,1.65,.17,32);
   part(root,C.concrete,side*5.35,.21,0,.18,.34,32);
   for(const z of [-12,0,12]){
    const x=side*5.25;
    part(root,C.frame,x,2.8,z,.12,5.6,.12);
    part(root,C.frame,x-side*.31,5.56,z,.68,.11,.12);
    part(root,0xffeac0,x-side*.61,5.48,z,.55,.11,.37);
   }
   for(const z of [-10,7])if((kind+Math.round(z))%3!==0)tree(root,side,z,kind+Math.round(z),6.1);
   if(kind!==3&&kind!==5)bench(root,side,4.5);
   for(const z of [-8,6]){
    part(root,C.stone,side*5.9,.27,z,1.05,.53,1.05);
    part(root,C.leafDark,side*5.9,.67,z,1.12,.42,1.1,crown);
   }
  }
  // Bake small architectural details into a handful of meshes for mobile GPUs.
  root.updateMatrixWorld(true);const batches=new Map();
  root.traverse(object=>{if(!object.isMesh)return;const geo=(object.geometry.index?object.geometry.toNonIndexed():object.geometry.clone()).applyMatrix4(object.matrixWorld);if(!batches.has(object.material))batches.set(object.material,[]);batches.get(object.material).push(geo);});
  const merged=new Group();for(const [mat,list] of batches){const mesh=new Mesh(mergeGeometries(list),mat);mesh.receiveShadow=true;mesh.castShadow=true;merged.add(mesh);for(const geo of list)geo.dispose();}
  return merged;
 }
 const templates=Array.from({length:6},(_,kind)=>build(kind));
 const slots=Array.from({length:CAMPUS_SLOTS},()=>{const root=new Group();scene.add(root);return {root,kind:-1};});
 return state=>{
  const college=state.map==='college';
  for(let slot=0;slot<slots.length;slot++){
   const item=slots[slot];item.root.visible=college;if(!college)continue;
   const anchor=campusAnchor(slot,state.distance),kind=campusKind(anchor);
   if(item.kind!==kind){item.root.clear();item.root.add(templates[kind].clone());item.kind=kind;}
   item.root.position.set(curveRelX(anchor,state),curveRelY(anchor,state),state.distance-anchor);
   item.root.rotation.y=-Math.atan(roadCurveSlope(anchor,'college'));
  }
 };
}
