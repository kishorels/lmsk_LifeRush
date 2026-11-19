import {BoxGeometry,CanvasTexture,Group,Mesh,MeshStandardMaterial,SRGBColorSpace} from './vendor/three.module.js';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';
import {campusAnchor,campusKind,CAMPUS_SLOTS} from './campus-layout.js';

// A separate modern campus set; it uses the same collision-safe road and route plan.
export function createCollegeCampus(scene){
 const box=new BoxGeometry(),materials=new Map();
 function material(color){
  if(!materials.has(color))materials.set(color,new MeshStandardMaterial({color,roughness:color===0x346483 ? .29 : .88,metalness:color===0x346483 ? .32 : 0}));
  return materials.get(color);
 }
 function part(root,color,x,y,z,w,h,d){
  const mesh=new Mesh(box,material(color));mesh.position.set(x,y,z);mesh.scale.set(w,h,d);root.add(mesh);return mesh;
 }
 function label(root,text,x,y,z){
  if(typeof document==='undefined')return;
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=96;
  const ctx=canvas.getContext('2d');if(!ctx)return;
  ctx.fillStyle='#142f49';ctx.fillRect(0,0,512,96);ctx.fillStyle='#ffd887';ctx.textAlign='center';ctx.font='bold 36px Arial';ctx.fillText(text,256,62,475);
  const map=new CanvasTexture(canvas);map.colorSpace=SRGBColorSpace;
  const mesh=new Mesh(box,new MeshStandardMaterial({map,roughness:.7}));mesh.position.set(x,y,z);mesh.scale.set(4,.66,.025);root.add(mesh);
 }
 function building(root,side,kind){
  const x=side*10,h=kind%3===0?9.3:kind%3===1?7.6:11.2;
  part(root,0xbac7cc,x,h/2,-2,8,h,22);
  part(root,0x243f59,x,h+.12,-2,8.4,.25,22.4);
  part(root,0x8a5a42,x,1.1,9.15,7.5,2.2,.25);
  part(root,0x346483,x,1.1,9.32,2.6,2,.035);
  const floors=Math.floor((h-1.5)/2.1);
  for(let floor=0;floor<floors;floor++){
   const y=2.25+floor*2.1;
   part(root,0x346483,side*5.76,y,-2,.08,1.38,20.4);
   part(root,0xe6ece6,side*5.69,y+.72,-2,.13,.10,20.7);
   for(let z=7.4;z>-12;z-=2.9)part(root,0xe6ece6,side*5.67,y,z,.11,1.48,.09);
  }
  for(let z of [-8,0,8]){
   part(root,0x233d53,side*5.06,2.8,z,1.25,.16,1.1);
   part(root,0x9dd1dd,side*5.04,2.35,z,.08,.72,.88);
  }
  label(root,['COLLEGE OF SCIENCE','DESIGN STUDIO','UNIVERSITY LIBRARY','STUDENT UNION','ENGINEERING','COLLEGE HALL'][kind],x,3.15,9.33);
 }
 function build(kind){
  const root=new Group();
  building(root,-1,kind);building(root,1,(kind+2)%6);
  for(const side of [-1,1]){
   part(root,0xc5c5b6,side*4.35,.12,0,1.75,.16,32);
   part(root,0x345f64,side*5.24,.43,0,.10,.75,32);
   for(const z of [-11,-3,5,13]){
    part(root,0x244a57,side*4.95,1.35,z,.13,2.5,.13);
    part(root,0xffd88b,side*4.95,2.62,z,.36,.19,.36);
    part(root,0x466d57,side*5.1,.34,z+1.55,1.35,.65,1.5);
    part(root,0x7c9b58,side*5.1,.85,z+1.55,1.1,.45,1.25);
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
   item.root.position.z=state.distance-anchor;
  }
 };
}
