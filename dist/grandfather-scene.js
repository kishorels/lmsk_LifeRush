import {
  BoxGeometry, BufferGeometry, CylinderGeometry, DoubleSide, Float32BufferAttribute,
  Group, IcosahedronGeometry, Mesh, MeshStandardMaterial, PlaneGeometry, RepeatWrapping,
  SphereGeometry, SRGBColorSpace, TextureLoader, TorusGeometry
} from './vendor/three.module.js';
import { bakeGroup } from './bake-static-meshes.js';
import { roadCurveX, roadCurveY, roadCurveSlope } from './campus-layout.js';
import { createVillageHouses } from './village-house.js';
import { GRANDFATHER_GATE } from './grandfather-route.js';

const map = 'grandfather';
const sectionLength = 28;
let art;

function villageArt() {
  if (art) return art;
  const box = new BoxGeometry(), pole = new CylinderGeometry(1,1,1,10);
  const ball = new SphereGeometry(1,12,8), rock = new IcosahedronGeometry(1,0);
  const ring = new TorusGeometry(1,.12,6,18), card = new PlaneGeometry(1,1);
  const loader = typeof document === 'undefined' ? null : new TextureLoader();
  const materials = new Map(), textures = new Map(), props = new Map();
  function paint(color, file, foliage = false) {
    const key = color + (file || '');
    if (!materials.has(key)) {
      if (file && loader && !textures.has(file)) {
        const texture = loader.load(new URL('./assets/'+file+'.webp',import.meta.url).href);
        texture.colorSpace = SRGBColorSpace;
        texture.wrapS = texture.wrapT = RepeatWrapping;
        texture.anisotropy = 4;
        textures.set(file,texture);
      }
      materials.set(key,new MeshStandardMaterial({color,map:textures.get(file)||null,roughness:.92,
        ...(foliage ? {alphaTest:.45,side:DoubleSide} : {})}));
    }
    return materials.get(key);
  }
  const timber = paint(0xf9bd82,'village/wood'), end = paint(0xe4ae69);
  const brass = paint(0xffbf48), iron = paint(0x473930), clay = paint(0xd46c3f);
  const stone = [0xab9879,0xbaaa8b,0xc3ad88,0x998b75].map(c=>paint(c,'village/plaster'));
  const bark = paint(0xc99364,'village/wood'), hay = paint(0xffcd51,'village/thatch');
  const moss = paint(0x83a73e), green = paint(0x56822e);
  function part(root, material, x,y,z,w,h,d, geometry=box) {
    const m=new Mesh(geometry,material);
    m.position.set(x,y,z);m.scale.set(w,h,d);root.add(m);return m;
  }
  function bake(root) {
    const model=bakeGroup(root);
    for(const mesh of model.children) mesh.castShadow=true;
    return model;
  }
  function fence(root, x,z,width) {
    for(const dx of [-width/2,0,width/2]){
      part(root,timber,x+dx,.53,z,.21,1.06,.23);
      for(const y of [.36,.77])part(root,iron,x+dx,y,z+.14,.065,.065,.04,pole).rotation.x=Math.PI/2;
    }
    for(const y of [.36,.77])part(root,timber,x,y,z-.02,width+.22,.16,.15);
  }
  function pot(root,x,y,z,r){
    part(root,clay,x,y+.48*r,z,r,.56*r,r,ball);
    part(root,clay,x,y+.94*r,z,r*.46,.30*r,.46*r,pole);
    part(root,clay,x,y+1.10*r,z,.52*r,.52*r,.52*r,ring).rotation.x=Math.PI/2;
    part(root,iron,x,y+1.09*r,z,.42*r,.025,.42*r,pole);
  }
  function arch(root) {
    for(const side of [-1,1]){
      for(let row=0;row<4;row++)part(root,stone[row],side*2.92,.31+row*.59,0,.82,.57,1.32);
      part(root,stone[1],side*2.92,.12,0,1.12,.24,1.62);
    }
    for(let i=0;i<15;i++){
      const angle=(i+.5)*Math.PI/15;
      const m=part(root,stone[i%4],2.92*Math.cos(angle),2.34+2.92*Math.sin(angle),0,.73,i===7?.98:.82,1.36);
      m.rotation.z=angle-Math.PI/2;
      if(i%3===1)part(root,moss,m.position.x,m.position.y+.32,.48,.38,.20,.28,rock);
    }
  }
  function prop(variant) {
    if(props.has(variant))return props.get(variant).clone();
    const g=new Group();
    if(variant==='logs'){
      for(const [y,z,r] of [[.22,.22,.22],[.23,-.18,.23],[.58,0,.24],[.87,-.05,.14]]){
        const m=part(g,bark,0,y,z,r,6.45,r,pole);m.rotation.z=Math.PI/2;
        for(const side of [-1,1])part(g,end,side*3.23,y,z,r*.88,.035,r*.88,pole).rotation.z=Math.PI/2;
      }
      for(const x of [-2,2])part(g,end,x,.47,0,.47,.55,.47,ring).rotation.y=Math.PI/2;
    } else if(variant==='cloth'){
      for(const x of [-3,3]){
        part(g,timber,x,1.48,0,.32,2.96,.38);
        part(g,timber,x*.91,2.42,0,.17,1.05,.22).rotation.z=-Math.sign(x)*.7;
      }
      part(g,timber,0,2.72,0,6.65,.39,.42);
      part(g,timber,0,2.28,0,6.40,.19,.30);
      for(let i=0;i<7;i++){
        const x=(i-3)*.86,h=i%2?.64:.96;
        const dye=paint([0xc83639,0xf4b837,0x357ba7,0xfcdfab][i%4]);
        part(g,dye,x,2.23-h/2,.15,.75,h,.07).rotation.z=.045*Math.sin(i*4);
        part(g,brass,x,2.28-h,.20,.69,.06,.04);
      }
    } else if(variant==='fence') fence(g,0,0,5.95);
    else if(variant==='haycart'){
      part(g,timber,0,.57,0,1.97,.22,2.45);
      for(const side of [-1,1]){
        for(let i=0;i<3;i++)part(g,timber,side*.94,.77+i*.23,0,.13,.18,2.42);
        for(const z of [-.92,.92]){
          part(g,iron,side*1.05,.44,z,.45,.45,.45,ring).rotation.y=Math.PI/2;
          for(let i=0;i<4;i++)part(g,timber,side*1.05,.44,z,.09,.86,.06).rotation.x=i*Math.PI/4;
        }
      }
      for(let i=0;i<3;i++)part(g,timber,0,.77+i*.23,1.15,1.96,.18,.13);
      part(g,hay,0,1.32,0,.98,.57,1.23,ball);
      for(let i=0;i<11;i++)part(g,hay,.73*Math.sin(i*4),1.45+.15*Math.cos(i),.78*Math.cos(i*3),.35,.43,.48,rock);
    } else if(variant==='arch')arch(g);
    else if(variant==='pot')pot(g,0,.08,0,.65);
    else if(variant==='rock'){
      const m=part(g,stone[3],0,.49,0,.99,.99,.80,rock);m.rotation.set(.24,.38,-.17);
    } else {
      part(g,timber,0,.54,0,1.65,1.05,1.1);
      for(const x of [-.72,.72])part(g,end,x,.53,.57,.13,1.08,.10);
      part(g,end,0,.55,.60,.15,1.74,.09).rotation.z=-1.0;
    }
    props.set(variant,bake(g));return props.get(variant).clone();
  }
  const makeHouse=createVillageHouses();
  function section(index) {
    const g=new Group();
    const rand=i=>{const n=Math.sin((index+1)*129.7+i*83.1)*43758.55;return n-Math.floor(n);};
    for(const side of [-1,1]){
      const offset=side===1?7:-7;
      const type=['house','veranda','farmhouse','cottage'][(index+(side+1))%4];
      const home=makeHouse({type,x:side*(8.7+rand(side)*1.6),z:offset+rand(2)*3,w:6.6,h:4.4+rand(7)});
      home.rotation.y=-side*.65;g.add(home);
      const roadside=new Group();fence(roadside,0,0,5.45);roadside.rotation.y=Math.PI/2;
      for(let i=0;i<5;i++){
        const rail=roadside.clone();rail.position.set(side*3.95,0,-11.2+i*5.6);g.add(rail);
      }
      for(let i=0;i<7;i++){
        const x=side*(5.1+rand(31+i)*2.7+(i%3===0?5:0)),z=-13+rand(19+i+side)*26;
        const species=i%3===0?'street/neem':'village/palm';
        const leaves=paint(0xfff3b6,species,true),height=5+rand(i+4)*6;
        for(const yaw of [.12,1.48])part(g,leaves,x,height*.5,z,height*.82,height,1,card).rotation.y=yaw;
      }
      const blooms=[0xffdb41,0xee547a,0xfff2cd,0xf78a38,0xc185e7].map(c=>paint(c));
      for(let i=0;i<32;i++){
        const z=-14+rand(i+110)*28,x=side*(3.56+rand(i+65)*1.65);
        const h=.28+rand(i+78)*.45;
        part(g,i%2?green:moss,x,h*.35,z,.23,h*.39,.24,rock);
        if(i%3===0)continue;
        for(let p=0;p<5;p++){
          const a=p*Math.PI*2/5;
          part(g,blooms[i%5],x+.084*Math.cos(a),h+.036*Math.sin(a),z+.084*Math.sin(a),.085,.058,.085,rock);
        }
        part(g,brass,x,h+.035,z,.052,.047,.052,rock);
      }
      pot(g,side*5.0,.09,offset+2,.45);
    }
    return bake(g);
  }
  function temple() {
    const g=new Group();arch(g);
    const ochre=paint(0xc56a37,'village/tile'),cream=paint(0xf1d392,'village/plaster');
    for(const side of [-1,1]){
      part(g,cream,side*4.15,2.01,-1.2,2.7,4.0,4.5);
      part(g,ochre,side*4.15,4.18,-1.2,3.15,.38,5.1);
    }
    for(let tier=0;tier<5;tier++){
      const w=8.6-tier*1.35,d=4.6-tier*.6,y=5.4+tier*.94;
      part(g,cream,0,y,-1,w,.85,d);
      part(g,ochre,0,y+.46,-1,w+.52,.22,d+.50);
      for(let i=-2;i<=2;i++)part(g,stone[1],i*w*.18,y,-.94+d/2,.23,.71,.21);
    }
    for(const x of [-.95,0,.95])part(g,brass,x,10.13,-1,.31,.55,.31,ball);
    return bake(g);
  }
  art={prop,section,temple,paint};return art;
}

export function grandfatherObstacle(variant) { return villageArt().prop(variant); }

export function createGrandfatherVillage(scene) {
  const root=new Group();root.name='grandfather-village';scene.add(root);
  const {section,temple,paint}=villageArt();
  function ribbon(left,right,height,material,repeatAcross) {
    const positions=[],uv=[],indices=[];
    for(let z=-56;z<=GRANDFATHER_GATE+280;z+=2){
      const x=roadCurveX(z,map),y=roadCurveY(z,map)+height;
      const i=positions.length/3;
      positions.push(x+left,y,-z,x+right,y,-z);
      uv.push(0,z/7,repeatAcross,z/7);
      if(i)indices.push(i-2,i-1,i,i,i-1,i+1);
    }
    const geo=new BufferGeometry();geo.setAttribute('position',new Float32BufferAttribute(positions,3));
    geo.setAttribute('uv',new Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();
    const mesh=new Mesh(geo,material);mesh.receiveShadow=true;root.add(mesh);
  }
  ribbon(-100,100,-.05,paint(0xd9ef7d,'village/verge'),32);
  ribbon(-3.68,3.68,.03,paint(0xffce89,'village/earth'),1.6);
  const templates=Array.from({length:4},(_,i)=>section(i));
  const slots=Array.from({length:8},()=>{const g=new Group();root.add(g);return g;});
  const shrine=temple();
  shrine.position.set(roadCurveX(GRANDFATHER_GATE,map),roadCurveY(GRANDFATHER_GATE,map),-GRANDFATHER_GATE);
  root.add(shrine);
  return state=>{
    root.visible=state.map===map;if(!root.visible)return;
    const d=state.distance;root.position.set(-roadCurveX(d,map),-roadCurveY(d,map),d);
    const first=Math.floor(d/sectionLength)-1;
    for(let i=first;i<first+slots.length;i++){
      const slot=slots[(i%slots.length+slots.length)%slots.length];
      const center=(i+.5)*sectionLength;
      slot.visible=center<GRANDFATHER_GATE+30;
      if(!slot.visible||slot.userData.index===i)continue;
      const kind=(i%templates.length+templates.length)%templates.length;
      if(slot.userData.kind!==kind){slot.clear();slot.add(templates[kind].clone());slot.userData.kind=kind;}
      slot.userData.index=i;
      slot.position.set(roadCurveX(center,map),roadCurveY(center,map),-center);
      slot.rotation.y=-Math.atan(roadCurveSlope(center,map));
    }
  };
}
