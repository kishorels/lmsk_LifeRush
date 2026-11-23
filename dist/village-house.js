import {BoxGeometry, ExtrudeGeometry, Shape, Group, Mesh, MeshStandardMaterial, PlaneGeometry, SRGBColorSpace, TextureLoader} from './vendor/three.module.js';
import {bakeGroup} from './bake-static-meshes.js';

const styles={
  house:    {front:0,wall:0xf2e1c6,base:0x527e7b},
  thatched: {front:1,wall:0xc19768,base:0x77533c},
  pink:     {front:2,wall:0xeabcb0,base:0xa47d70,flat:true},
  cottage:  {front:3,wall:0xc3d8cc,base:0x668477},
  veranda:  {front:4,wall:0xf7e8d1,base:0x9f6751,wide:true},
  farmhouse:{front:5,wall:0xce9d74,base:0x875e45}
};

const REF_H = 5.1;
const REF_W = REF_H * 1.48;

export function createVillageHouses(){
  const box=new BoxGeometry(),panel=new PlaneGeometry();
  const end=new Shape();
  end.moveTo(-.5,0);end.lineTo(0,1);end.lineTo(.5,0);end.closePath();
  const gable=new ExtrudeGeometry(end,{depth:1,bevelEnabled:false}).translate(0,0,-.5).rotateY(Math.PI/2);
  const loader=typeof document==='undefined'?null:new TextureLoader();
  const materials=new Map();
  const templates=new Map();
  function surface(name,color=0xffffff){
    const key=name+color;
    if(!materials.has(key)){
      const map=loader?.load(new URL('./assets/village/'+name+'.webp',import.meta.url).href)||null;
      if(map){map.colorSpace=SRGBColorSpace;map.anisotropy=4;}
      materials.set(key,new MeshStandardMaterial({map,color,roughness:.94}));
    }
    return materials.get(key);
  }
  function getTemplate(type){
    if(templates.has(type))return templates.get(type);
    const style=styles[type],model=new Group();
    const w=REF_W*(style.wide?1.15:1),depth=REF_H*.95,h=REF_H*.59;
    const plaster=surface('plaster',style.wall),base=surface('plaster',style.base);
    const wood=surface('wood'),roof=surface(type==='thatched'?'thatch':'tile');
    function part(mat,x,y,z,sx,sy,sz,geo=box){
      const mesh=new Mesh(geo,mat);
      mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);
      model.add(mesh);return mesh;
    }
    // Local +Z is the entrance, facing diagonally toward the canal and the runner.
    part(base,0,.19,.35,w+.25,.38,depth+.9);
    part(plaster,0,.35+h/2,0,w,h,depth);
    part(surface('front-'+style.front),0,.35+h/2,depth/2+.009,w,h,1,panel);
    const eave=.35+h,run=depth/2+.42;
    if(style.flat){
      part(plaster,0,eave+.12,0,w+.38,.23,depth+.48);
      for(const side of [-1,1])part(plaster,side*w/2,eave+.38,0,.14,.5,depth);
      part(base,0,eave+.29,depth/2,w,.18,.17);
    }else{
      const pitch=type==='thatched'?.52:.31,rise=run*Math.tan(pitch);
      for(const side of [-1,1]){
        const slope=part(roof,0,eave+rise*.5,side*run*.5,w+.7,.16,run/Math.cos(pitch));
        slope.rotation.x=side*pitch;
      }
      // Close the triangular gables with a solid loft under the roof.
      part(plaster,0,eave,0,w,rise,depth,gable);
      part(roof,0,eave+rise+.06,0,w+.77,.16,.19);
    }
    const porchDepth=style.wide?1.6:1.12,porchZ=depth/2+porchDepth/2;
    part(base,0,.2,porchZ,w+.15,.38,porchDepth);
    part(base,0,.09,porchZ+porchDepth/2,w*.52,.18,.6);
    const postY=h*.79;
    for(const x of [-w*.41,w*.41]){
      part(wood,x,.38+postY/2,depth/2+porchDepth*.86,.16,postY,.16);
      part(base,x,.52,depth/2+porchDepth*.86,.28,.28,.28);
    }
    part(roof,0,.45+postY,porchZ,w+.38,.13,porchDepth+.36).rotation.x=.13;
    // On approach the end wall remains visible beside the deeper entrance.
    for(const side of [-1,1]){
      part(wood,side*(w/2+.035),.35+h*.55,-.2,.08,h*.44,depth*.35);
      for(let slat=0;slat<5;slat++)part(base,side*(w/2+.087),.35+h*(.38+slat*.078),-.2,.055,.042,depth*.31);
    }
    // Bake all ~25 house parts into ~5 draw calls; village houses sit outside the sun shadow frustum.
    const baked=bakeGroup(model);
    for(const mesh of baked.children){mesh.castShadow=false;mesh.receiveShadow=true;}
    templates.set(type,baked);
    return baked;
  }
  // Pre-build & pre-load all 6 house templates upfront so mid-run sections never stall on WebP load or bakeGroup.
  for(const type of Object.keys(styles)) getTemplate(type);
  return (o, model=getTemplate(o.type).clone())=>{
    model.scale.set(o.w/REF_W,o.h/REF_H,o.h/REF_H);
    model.position.set(o.x,.19,o.z);
    model.rotation.y=1.03+o.angle*.5;
    return model;
  };
}
