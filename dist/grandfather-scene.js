import {
  BoxGeometry, BufferGeometry, CylinderGeometry, DoubleSide, Float32BufferAttribute,
  Group, IcosahedronGeometry, MeshBasicMaterial, ExtrudeGeometry, Shape, LatheGeometry, Vector2, Mesh, MeshStandardMaterial, PlaneGeometry, RepeatWrapping,
  SphereGeometry, SRGBColorSpace, TextureLoader, TorusGeometry
} from './vendor/three.module.js';
import { bakeGroup } from './bake-static-meshes.js';
import { roadCurveX, roadCurveY, roadCurveSlope } from './campus-layout.js?v=3.9.2';
import { createVillageHouses } from './village-house.js';
import { GRANDFATHER_GATE, SCHOOL_ROAD_START, HOME_YARD_START } from './grandfather-route.js?v=3.9.2';

import {planting,greetingFrame,greeterStart,greeterSpacing} from './elder-landscape.js';
const windClock={value:0};
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
  const timber=paint(0xd9c6ad,'elder/boards'), end=paint(0xbf9e76,'elder/boards');
  const brass=paint(0xaa8247), iron=paint(0x594838),clay=paint(0xac6245);
  const stone=[0xc7c2ac,0xb8b6a6,0xe1d7c1,0xc9c1b4].map(c=>paint(c,'elder/granite'));
  const bark=paint(0xd3c3ae,'elder/bark'),hay=paint(0xf2deb1,'elder/straw');
  const sheet=new PlaneGeometry(1,1,8,9);
  const leafMats=new Map();
  function cutout(file,bend=0,cloth=false){
    if(leafMats.has(file))return leafMats.get(file);
    const texture=paint(0xffffff,file).map;
    const m=new MeshBasicMaterial({map:texture,alphaTest:.25,side:DoubleSide,toneMapped:false});
    if(bend){
      m.onBeforeCompile=shader=>{
        shader.uniforms.elderClock=windClock;
        shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nuniform float elderClock;')
          .replace('#include <begin_vertex>',`#include <begin_vertex>
            float weight=pow(max(0.0001,${cloth?'1.0-uv.y':'uv.y'}),1.8);
            float phase=elderClock*1.55+position.z*.27+position.x*.35+modelMatrix[3].x*.17;
            float gust=sin(phase)+.38*sin(.63*phase+uv.x*2.9);
            transformed.x+=${bend.toFixed(3)}*weight*gust;
            transformed.z+=${bend.toFixed(3)}*weight*(.6*sin(phase*1.31)+.23*sin(phase*2.9+uv.x*6.));
            transformed.y+=.04*weight*sin(phase*2.3+uv.x*6.);`);
      };
      m.customProgramCacheKey=()=>file;
    }
    leafMats.set(file,m);return m;
  }
  const shade=new MeshBasicMaterial({map:paint(0xffffff,'elder/shadow').map,transparent:true,opacity:.49,depthWrite:false,toneMapped:false,polygonOffset:true,polygonOffsetFactor:-1});
  function shadow(g,x,z,w,d){
    const m=part(g,shade,x,.065,z,w,d,1,card);m.rotation.x=-Math.PI/2;
  }
  function part(root, material, x,y,z,w,h,d, geometry=box) {
    const m=new Mesh(geometry,material);
    m.position.set(x,y,z);m.scale.set(w,h,d);root.add(m);return m;
  }
  function bake(root) {
    const model=bakeGroup(root);
    for(const mesh of model.children) mesh.castShadow=mesh.material!==shade;
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
    for(let i=0;i<19;i++){
      const start=i*Math.PI/19+.002,finish=(i+1)*Math.PI/19-.002;
      const inner=2.51,outer=i===9?3.49:3.34;
      const profile=new Shape();
      profile.absarc(0,0,outer,start,finish,false);
      profile.lineTo(inner*Math.cos(finish),inner*Math.sin(finish));
      profile.absarc(0,0,inner,finish,start,true);profile.closePath();
      const geom=new ExtrudeGeometry(profile,{depth:1.32,bevelEnabled:true,bevelSegments:1,bevelSize:.035,bevelThickness:.035,curveSegments:12});
      part(root,stone[(i*7)%4],0,2.34,-.66,1,1,1,geom);
    }
    for(const side of [-1,1]){
      part(root,stone[2],side*2.92,2.33,0,1.05,.2,1.55);
      part(root,stone[0],side*2.92,.27,0,1.07,.13,1.55);
      for(let v=0;v<3;v++){
        const leaves=part(root,cutout('elder/jasmine',.08),side*(2.81+.09*v),2.62+.42*v,.725,.56,.72,1,sheet);
        leaves.rotation.z=side*(.31+v*.18);
      }
    }
  }
  function prop(variant) {
    if(props.has(variant))return props.get(variant).clone();
    const g=new Group();
    if(variant==='logs'){
      for(const [y,z,r] of [[.22,.22,.22],[.23,-.18,.23],[.58,0,.24],[.87,-.05,.14]]){
        const trunk=new CylinderGeometry(.89,1,1,15,8);
        const pos=trunk.attributes.position;
        for(let j=0;j<pos.count;j++){
          const t=pos.getY(j),a=Math.atan2(pos.getZ(j),pos.getX(j));
          const knot=1+.036*Math.sin(5*a+z*8)+.028*Math.sin(t*12+a*3);
          pos.setX(j,pos.getX(j)*knot+.13*Math.sin(t*4+y*9));
          pos.setZ(j,pos.getZ(j)*knot+.12*Math.sin(t*5+z));
        }
        trunk.computeVertexNormals();
        const m=part(g,bark,0,y,z,r,6.45,r,trunk);m.rotation.z=Math.PI/2;
        for(const side of [-1,1])part(g,end,side*3.23,y,z,r*.88,.035,r*.88,pole).rotation.z=Math.PI/2;
      }
      for(const x of [-2.15,1.93])for(let loop=0;loop<3;loop++){
        const binding=part(g,end,x+loop*.052,.47,0,.45,.53,.43,ring);
        binding.rotation.set(.07,Math.PI/2,.035);
      }
      for(let i=0;i<9;i++){
        const knot=part(g,bark,-2.65+i*.64,.54+(i%3)*.11,.19,.064,.26,.085,pole);
        knot.rotation.z=.66*Math.sin(i*3.4);
      }
    } else if(variant==='cloth'){
      for(const x of [-3,3]){
        part(g,timber,x,1.48,0,.32,2.96,.38);
        part(g,timber,x*.91,2.42,0,.17,1.05,.22).rotation.z=-Math.sign(x)*.7;
      }
      part(g,timber,0,2.72,0,6.65,.39,.42);
      part(g,timber,0,2.28,0,6.40,.19,.30);
      for(let i=0;i<7;i++){
        const x=(i-3)*.86,h=i%2?.64:.96;
        const fabric=cutout('elder/fabric-'+i%4,.075,true);
        part(g,fabric,x,2.23-h/2,.18,.79,h,1,sheet).rotation.z=.06*Math.sin(i*4);

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
      // The rear load overhangs the slatted cart; retain real volume on the sides as it passes.
      part(g,cutout('elder/haycart'),0,1.01,1.27,2.36,2.02,1,card);
      for(const x of [-.72,.72])part(g,timber,x,.42,-1.86,.10,.14,1.75).rotation.x=.11;
    } else if(variant==='arch')arch(g);
    else if(variant==='pot'){
      const profile=[[.26,0],[.35,.06],[.51,.24],[.56,.48],[.49,.72],[.32,.85],[.28,.95],[.35,1.01],[.34,1.065],[.265,1.065],[.25,.97]];
      part(g,clay,0,0,0,1,1,1,new LatheGeometry(profile.map(([r,y])=>new Vector2(r,y)),28));
    }
    else if(variant==='rock'){
      const m=part(g,stone[3],0,.52,0,.99,.91,.80,new IcosahedronGeometry(1,1));m.rotation.set(.24,.38,-.17);
    } else {
      part(g,timber,0,.54,0,1.65,1.05,1.1);
      for(const x of [-.72,.72])part(g,end,x,.53,.57,.13,1.08,.10);
      part(g,end,0,.55,.60,.15,1.74,.09).rotation.z=-1.0;
    }
    if(variant!=='arch'&&variant!=='cloth'){
      const wide=variant==='logs'||variant==='fence';
      shadow(g,.04,.1,wide?6.8:2.4,wide?1.4:2.5);
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
      const home=makeHouse({type,angle:0,x:side*(8.7+rand(side)*1.6),z:offset+rand(2)*3,w:6.6,h:4.4+rand(7)});
      home.rotation.y=-side*.65;g.add(home);
      const roadside=new Group();fence(roadside,0,0,5.45);roadside.rotation.y=Math.PI/2;
      for(let i=0;i<5;i++){
        const rail=roadside.clone();rail.position.set(side*3.95,0,-11.2+i*5.6);g.add(rail);
      }
      for(const tree of planting(index,side)){
        const file=tree.name==='neem'?'street/neem':'elder/'+tree.name;
        const leaves=cutout(file,tree.bend);
        // A shallow cylindrical silhouette gives parallax through each turn.
        const canopy=sheet.clone(),pos=canopy.attributes.position;
        for(let j=0;j<pos.count;j++){
          const xx=pos.getX(j),yy=pos.getY(j)+.5;
          pos.setZ(j,(1-4*xx*xx)*Math.sin(Math.PI*yy)*tree.w*.085);
        }
        part(g,leaves,tree.x,tree.h*.5,tree.z,tree.w,tree.h,1,canopy).rotation.y=-side*.19;
        shadow(g,tree.x+.65,tree.z-.75,tree.w*1.1,tree.w*.68);
      }
      for(let i=0;i<13;i++){
        const z=-13+rand(i+110)*26,x=side*(3.98+rand(i+65)*1.55);
        const h=.32+rand(i+78)*.60;
        const leaves=cutout(i%3?'elder/wildflowers':'elder/jasmine',.075);
        part(g,leaves,x,h*.49,z,h*(1.4+rand(i+6)),h,1,sheet).rotation.y=side*(rand(i+83)-.5);
      }
      pot(g,side*5.0,.09,offset+2,.45);
    }
    return bake(g);
  }
  art={prop,section,makeHouse,paint};return art;
}

export function grandfatherObstacle(variant) { return villageArt().prop(variant); }

export function createGrandfatherVillage(scene) {
  const root=new Group();root.name='grandfather-village';scene.add(root);
  const {section,makeHouse,paint}=villageArt();
  function ribbon(start,end,left,right,height,material,repeatAcross,softEdge=false,fade=false) {
    const positions=[],uv=[],indices=[],colors=[];
    for(let z=start;z<=end;z+=2){
      const x=roadCurveX(z,map),y=roadCurveY(z,map)+height;
      const i=positions.length/3;
      const leftEdge=softEdge?.13*Math.sin(z*.43)+.09*Math.cos(z*.86):0;
      const rightEdge=softEdge?.16*Math.cos(z*.36)+.07*Math.sin(z*.71):0;
      positions.push(x+left+leftEdge,y,-z,x+right+rightEdge,y,-z);
      if(fade){const alpha=(end-z)/(end-start);colors.push(1,1,1,alpha,1,1,1,alpha);}
      uv.push(0,z/7,repeatAcross,z/7);
      if(i)indices.push(i-2,i-1,i,i,i-1,i+1);
    }
    const geo=new BufferGeometry();geo.setAttribute('position',new Float32BufferAttribute(positions,3));
    if(fade)geo.setAttribute('color',new Float32BufferAttribute(colors,4));
    geo.setAttribute('uv',new Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();
    const mesh=new Mesh(geo,material);mesh.receiveShadow=true;root.add(mesh);
  }
  const verge=paint(0xf2eee2,'elder/verge'),earth=paint(0xeee2cc,'elder/path');
  ribbon(-56,SCHOOL_ROAD_START,-100,100,-.05,verge,46);
  ribbon(-56,SCHOOL_ROAD_START,-3.68,3.68,.03,earth,1,true);
  const dust=earth.clone();dust.transparent=true;dust.vertexColors=true;dust.depthWrite=false;
  ribbon(SCHOOL_ROAD_START,SCHOOL_ROAD_START+14,-3.57,3.57,.132,dust,1,true,true);
  ribbon(HOME_YARD_START,GRANDFATHER_GATE+160,-100,100,-.05,verge,46);
  ribbon(HOME_YARD_START,GRANDFATHER_GATE+20,-4.5,4.5,.11,earth,1,true);
  const templates=Array.from({length:4},(_,i)=>section(i));
  // Eight slots repeat four templates, so each slot always renders the same village design.
  const slots=Array.from({length:8},(_,i)=>{
    const slot=new Group();
    slot.add(templates[i%templates.length].clone());
    root.add(slot);
    return slot;
  });
  const greetingMat=new MeshBasicMaterial({map:paint(0xffffff,'elder/greeting').map?.clone()||null,alphaTest:.30,side:DoubleSide,toneMapped:false});
  if(greetingMat.map){greetingMat.map.repeat.set(1/8,1/4);greetingMat.map.needsUpdate=true;}
  const host=new Mesh(new PlaneGeometry(.98,1.86),greetingMat);
  host.name='village-welcome';host.castShadow=true;root.add(host);
  const horizon=new Mesh(new PlaneGeometry(405,136),new MeshBasicMaterial({map:paint(0xffffff,'elder/horizon').map,fog:false,toneMapped:false,depthWrite:false}));
  horizon.position.set(0,41,-176);horizon.renderOrder=-.5;scene.add(horizon);
  const home=makeHouse({type:'veranda',angle:0,x:roadCurveX(GRANDFATHER_GATE,map),z:-GRANDFATHER_GATE-4.2,w:8,h:5});
  home.name='childhood-home';home.rotation.y=0;root.add(home);
  return state=>{
    root.visible=state.map===map;horizon.visible=root.visible;if(!root.visible)return;
    windClock.value=state.time||0;
    const d=state.distance;
    const visit=Math.max(0,Math.ceil((d-greeterStart-6)/greeterSpacing)),at=greeterStart+visit*greeterSpacing;
    host.visible=at<SCHOOL_ROAD_START&&at-d<95;
    if(host.visible){
      const side=visit%2?1:-1,frame=greetingFrame(at-d);
      host.position.set(roadCurveX(at,map)+side*4.52,roadCurveY(at,map)+.93,-at);
      host.rotation.y=-side*.23;
      greetingMat.map?.offset.set((frame%8)/8,(3-Math.floor(frame/8))/4);
    }
    root.position.set(-roadCurveX(d,map),-roadCurveY(d,map),d);
    const first=Math.floor(d/sectionLength)-1;
    const activeSlots=scene.userData?.ultraLow?5:scene.userData?.lowEnd?6:slots.length;
    for(let sIdx=0;sIdx<slots.length;sIdx++)slots[sIdx].visible=false;
    for(let i=first;i<first+activeSlots;i++){
      const slot=slots[(i%slots.length+slots.length)%slots.length];
      const center=(i+.5)*sectionLength;
      slot.visible=center<SCHOOL_ROAD_START;
      if(!slot.visible||slot.userData.index===i)continue;
      slot.userData.index=i;
      slot.position.set(roadCurveX(center,map),roadCurveY(center,map),-center);
      const grade=(roadCurveY(center+1,map)-roadCurveY(center-1,map))*.5;
      slot.rotation.set(Math.atan(grade),-Math.atan(roadCurveSlope(center,map)),0,'YXZ');
    }
  };
}
