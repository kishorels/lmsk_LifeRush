import {
  Group, Mesh, InstancedMesh, Object3D, PlaneGeometry, MeshBasicMaterial, ShadowMaterial,
  BufferGeometry, BufferAttribute, DynamicDrawUsage, Color, TextureLoader, SRGBColorSpace, RepeatWrapping, DoubleSide
} from './vendor/three.module.js';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';

import {SECTION_LENGTH as LENGTH,villageLayout,houseTypes,cowPose} from './village-layout.js';
import {createVillageHouses} from './village-house.js';
import {roadCurveX,roadCurveY} from './campus-layout.js?v=3.9.2';
import {sceneWeather} from './weather.js';
import {SCHOOL_ROAD_START,HOME_YARD_START} from './grandfather-route.js?v=3.9.2';
const VISIBLE_SECTIONS = 7;

export function createVillageRoute(scene) {
  const root = new Group();
  root.name = 'school-village-road';
  root.visible = false;
  scene.add(root);
  const clock = {value: 0};
  const loader = typeof document === 'undefined' ? null : new TextureLoader();

  function material(name, {repeat, movement, cutout = false} = {}) {
    const map = loader?.load(new URL((name === 'neem' ? './assets/street/' : './assets/village/') + name + '.webp', import.meta.url).href) || null;
    if (map) {
      map.colorSpace = SRGBColorSpace;
      map.anisotropy = 4;
      if (repeat) {
        map.wrapS = map.wrapT = RepeatWrapping;
        map.repeat.set(...repeat);
      }
    }
    const mat = new MeshBasicMaterial({map, side: DoubleSide, alphaTest: cutout ? .38 : 0, alphaToCoverage: cutout && Boolean(scene.userData.multisampled), toneMapped: false});
    if (movement) {
      mat.onBeforeCompile = shader => {
        shader.uniforms.villageTime = clock;
        shader.vertexShader = shader.vertexShader.replace('#include <common>',
          '#include <common>\nuniform float villageTime;').replace('#include <begin_vertex>',
          '#include <begin_vertex>\n' + movement);
      };
      mat.customProgramCacheKey = () => name;
    }
    return mat;
  }
  const wind = 'float phase=villageTime*1.55+instanceMatrix[3].z*.12; float crown=smoothstep(.16,.94,uv.y); transformed.x+=crown*(.046*sin(phase)+.018*sin(phase*1.8+uv.x*5.)); transformed.y+=crown*.014*sin(phase*2.2+uv.x*9.);';
  const houseModel=createVillageHouses();
  const goat = material('goat', {cutout: true, movement:
    'float muzzle=(1.-smoothstep(.14,.52,uv.x))*smoothstep(.04,.20,uv.y); transformed.y+=muzzle*(.048*sin(villageTime*1.8+instanceMatrix[3].z)+.011*sin(villageTime*5.3));'});
  const palm = material('palm', {cutout: true, movement: wind});
  const canopy = material('neem', {cutout:true, movement:wind});
  const art={palm,goat,neem:canopy};
  for(const key of ['well','banana','haycart'])art[key]=material(key,{cutout:true,movement:key==='banana'?wind:null});
  const blades = new MeshBasicMaterial({vertexColors:true,side:DoubleSide,toneMapped:false});
  blades.onBeforeCompile=shader=>{
    shader.uniforms.villageTime=clock;
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nuniform float villageTime;')
      .replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.x+=.11*position.y*position.y*sin(villageTime*1.9+position.z*.47+position.x*.19);');
  };
  const grassFloor = material('verge', {repeat: [2, 12]});
  const rice = material('paddy', {repeat: [5, 8]});
  rice.onBeforeCompile = shader => {
    shader.uniforms.villageTime = clock;
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>',
      '#include <common>\nuniform float villageTime;').replace('#include <map_fragment>',
      '#include <map_fragment>\nfloat wet=smoothstep(-.025,.1,diffuseColor.b-diffuseColor.g*.78); float glint=sin(vMapUv.y*139.+sin(vMapUv.x*29.)+villageTime*1.7); diffuseColor.rgb+=wet*.08*pow(max(0.,glint),6.);');
  };
  const cows=Array.from({length:4},(_,i)=>material('cow'+i,{cutout:true}));
  const ultraCanalMix = { value: 0 };
  const ultraNightMix = { value: 0 };
  const water=material('canal-clear',{repeat:[1,2]});
  water.customProgramCacheKey = () => 'village-canal-ultra-glass-v2';
  water.onBeforeCompile=shader=>{
    shader.uniforms.villageTime=clock;
    shader.uniforms.uUltraCanal=ultraCanalMix;
    shader.uniforms.uUltraNight=ultraNightMix;
    shader.vertexShader=shader.vertexShader
      .replace('#include <common>','#include <common>\nvarying vec3 vWaterWorld;')
      .replace('#include <begin_vertex>','#include <begin_vertex>\nvWaterWorld=(modelMatrix*vec4(transformed,1.0)).xyz;');
    shader.fragmentShader=shader.fragmentShader
      .replace('#include <common>','#include <common>\nuniform float villageTime;\nuniform float uUltraCanal;\nuniform float uUltraNight;\nvarying vec3 vWaterWorld;')
      .replace('#include <map_fragment>',`vec2 q=vMapUv;
        float flow=villageTime*.23;
        vec2 drift=vec2(sin(q.y*16.+flow)+.5*sin(q.y*31.-flow),
                        sin(q.x*9.+q.y*8.-flow));
        diffuseColor.rgb*=texture2D(map,q+.0025*drift).rgb;
        float sheen=.5+.5*sin(q.y*25.+1.3*sin(q.x*9.+flow)-flow);
        diffuseColor.rgb+=vec3(.006,.009,.009)*sheen*sheen;
        if(uUltraCanal>.01){
          // High-Contrast Photorealistic Glassy Flowing Mirror River (matching bright tropical village reference!)
          float u=fract(q.x);
          vec2 wp=vec2(u*5.5, q.y*64.0);
          float t=villageTime;
          // Sharp crossing 3D liquid ripples flowing smoothly downstream
          float p1=wp.y*1.75 - t*3.1 + sin(wp.x*1.5 + t*0.8)*1.3;
          float p2=wp.y*3.40 - t*4.2 - wp.x*2.1;
          float p3=wp.y*6.80 + t*2.8 + wp.x*3.9;
          float p4=wp.y*12.5 - t*5.6 - wp.x*6.1;
          float dHx = cos(p1)*.042 - cos(p2)*.052 + cos(p3)*.044 - cos(p4)*.028;
          float dHz = cos(p1)*.115 + cos(p2)*.098 + cos(p3)*.072 + cos(p4)*.048;
          vec3 N=normalize(vec3(dHx, 1.0, dHz));
          vec3 V=normalize(cameraPosition - vWaterWorld);
          vec3 R=reflect(-V, N);
          float NdotV=clamp(dot(N, V), 0.0, 1.0);
          float fresnel=mix(0.28, 0.96, pow(1.0 - NdotV, 2.6));

          // 1. Deep rich dark emerald-teal interior water (high contrast base!)
          float bankAO=smoothstep(0.0, 0.24, u) * smoothstep(1.0, 0.86, u);
          vec3 deepDay=mix(vec3(0.015, 0.055, 0.055), vec3(0.035, 0.16, 0.19), bankAO);
          vec3 deepNight=vec3(0.01, 0.03, 0.07) * mix(0.45, 1.0, bankAO);

          // 2. High-Contrast Glossy Mirror Environment: Vivid Cobalt Sky + Crisp White Clouds + Deep Green Trees + Warm Cottage Wall!
          float skyElev=clamp(R.y, 0.0, 1.0);
          vec3 daySkyRefl=mix(vec3(0.24, 0.64, 0.94), vec3(0.05, 0.36, 0.82), pow(skyElev, 0.72));
          // Sharp rippled white cloud reflections in open water
          float cloudPatch=smoothstep(0.42, 0.78, 0.5 + 0.5*sin(R.x*6.0 + wp.y*0.11 - t*0.22 + dHz*2.4)*cos(R.z*4.2 + wp.x*0.32));
          daySkyRefl=mix(daySkyRefl, vec3(0.96, 0.99, 1.0), cloudPatch*0.68);
          // Deep lush green foliage & warm sunlit cottage reflections along left half of river (sliced horizontally by ripples!)
          float treeEdge=smoothstep(0.62, 0.06, u + dHx*2.8);
          float canopyVar=0.5 + 0.5*sin(wp.y*0.28 + dHz*4.2)*cos(wp.y*0.12);
          vec3 treeMirror=mix(vec3(0.025, 0.13, 0.06), vec3(0.11, 0.30, 0.12), canopyVar);
          // Warm cream plaster & terracotta roof reflection patches beneath cottages
          float cottageMask=smoothstep(0.68, 0.90, sin(wp.y*0.105 + 0.6)) * smoothstep(0.46, 0.04, u + dHx*2.2);
          float roofBand=smoothstep(0.26, 0.06, u + dHx*1.8);
          vec3 cottageCol=mix(vec3(0.84, 0.72, 0.54), vec3(0.76, 0.34, 0.18), roofBand);
          treeMirror=mix(treeMirror, cottageCol, cottageMask*0.72);
          vec3 dayMirror=mix(daySkyRefl, treeMirror, treeEdge*0.86);

          // 3. Night Sky & Luminous Silver Moon Mirror
          vec3 nightMirror=mix(vec3(0.06, 0.14, 0.28), vec3(0.015, 0.04, 0.10), skyElev);
          nightMirror=mix(nightMirror, vec3(0.015, 0.05, 0.045), treeEdge*0.62);

          // 4. Crisp High-Contrast Liquid Wave Specular Glints & Horizon Sparkles
          vec3 sunDir=normalize(vec3(0.30, 0.44, -0.85));
          vec3 moonDir=normalize(vec3(-0.22, 0.44, -0.87));
          float sunSpec=pow(max(dot(R, sunDir), 0.0), 64.0) * (1.0 - treeEdge*0.55);
          float waveCrest=pow(max(0.0, dHz*5.5), 2.4) * (0.25 + 0.75*(1.0 - treeEdge));
          float moonSpec=pow(max(dot(R, moonDir), 0.0), 42.0);

          vec3 dayGlass=mix(deepDay, dayMirror, fresnel) + vec3(1.0, 0.98, 0.90)*(sunSpec*1.85 + waveCrest*0.24);
          vec3 nightGlass=mix(deepNight, nightMirror, fresnel) + vec3(0.84, 0.93, 1.0)*(moonSpec*1.55);
          // Deep dark stone-bank shadow right under left retaining wall for true 3D depth!
          float edgeShadow=mix(0.32, 1.0, smoothstep(0.0, 0.16, u)*smoothstep(1.0, 0.90, u));
          vec3 ultraWater=mix(dayGlass, nightGlass, uUltraNight) * edgeShadow;
          diffuseColor.rgb=mix(diffuseColor.rgb, ultraWater, uUltraCanal);
        }`);
  };
  const asphalt = material('lane', {repeat: [1, 2]});
  asphalt.customProgramCacheKey = () => 'village-lane-ultra-v2';
  asphalt.onBeforeCompile = shader => {
    shader.uniforms.villageTime = clock;
    shader.uniforms.uUltraRoad = ultraCanalMix;
    shader.uniforms.uUltraNight = ultraNightMix;
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float villageTime;\nuniform float uUltraRoad;\nuniform float uUltraNight;')
      .replace('#include <map_fragment>', `#include <map_fragment>
        if(uUltraRoad>.01){
          float u=fract(vMapUv.x);
          float edge=max(smoothstep(.062,.046,u), smoothstep(.938,.954,u));
          float checker=step(.5, fract(vMapUv.y*12.));
          vec3 curbCol=mix(vec3(.08,.10,.12), vec3(.95,.96,.98), checker);
          // Crisp dashed white highway lane markings along the 3-lane village road
          float laneLine=max(smoothstep(.016,.006,abs(u-.345)), smoothstep(.016,.006,abs(u-.655)));
          float dash=step(.44, fract(vMapUv.y*6.));
          // High-contrast sunlit asphalt + dappled tropical palm-frond shadows
          float frond=.5+.5*sin(vMapUv.y*18.+sin(u*9.)*2.2)*cos(u*11.+vMapUv.y*6.);
          float dapple=mix(1., .76+.24*smoothstep(.22,.78,frond), (1.-uUltraNight)*.92);
          diffuseColor.rgb*=mix(1., .80*dapple, uUltraRoad);
          diffuseColor.rgb=mix(diffuseColor.rgb, vec3(.95,.96,.98), laneLine*dash*.88*uUltraRoad);
          diffuseColor.rgb=mix(diffuseColor.rgb, curbCol, edge*uUltraRoad);
        }`);
  };
  const pathMaterial = material('earth', {repeat:[2,1]});
  const groundShadow = new ShadowMaterial({opacity:.37, depthWrite:false});
  const earth = new MeshBasicMaterial({color: 0x879047});
  const timber=new MeshBasicMaterial({color:0xa7794c});
  const unit = new PlaneGeometry(1, 1);
  // 4x4 sprite grid gives identical smooth wind sway & goat animation with 3.5x fewer vertices than 8x7.
  const upright = new PlaneGeometry(1, 1, 4, 4).translate(0, .5, 0);
  // Merge all 18 canal footbridge timber planks into 1 single shared geometry (1 draw call vs 18).
  const bridgePlanksGeo = (() => {
    const planks = [];
    for (let plank = 0; plank < 18; plank++) {
      const p = new PlaneGeometry(.314, 1.72);
      p.rotateX(-Math.PI / 2);
      p.translate(-12.02 + plank * .335, .235, 0);
      planks.push(p);
    }
    const merged = mergeGeometries(planks, false);
    for (const p of planks) p.dispose();
    return merged;
  })();
  const transform = new Object3D();
  // Each ring slot keeps its own meshes. A new seeded layout only updates their transforms and buffers.
  function acquire(parent, key, create) {
    const pools=parent.userData.pools;
    if(!pools.has(key))pools.set(key,{objects:[],used:0});
    const pool=pools.get(key);
    if(pool.used===pool.objects.length){
      const object=create();
      parent.add(object);
      pool.objects.push(object);
    }
    const object=pool.objects[pool.used++];
    object.visible=true;
    return object;
  }
  function floor(parent, mat, x, y, z, w, d, tessellate = false) {
    const mesh = acquire(parent,mat,()=>new Mesh(unit,mat));
    mesh.rotation.set(-Math.PI/2,0,0);
    mesh.position.set(x,y,z);
    mesh.scale.set(w,d,1);
    mesh.receiveShadow = true;
    mesh.userData.tessellate = tessellate;
    return mesh;
  }
  function plants(parent, mat, entries) {
    const mesh = acquire(parent,mat,()=>new InstancedMesh(upright,mat,Math.max(16,entries.length)));
    mesh.count=entries.length;
    entries.forEach(([x,z,w,h,angle=0,y=.10], index) => {
      transform.position.set(x,y,z);
      transform.rotation.set(0,angle,0);
      transform.scale.set(w,h,1);
      transform.updateMatrix();
      mesh.setMatrixAt(index,transform.matrix);
    });
  }
  const contact = new MeshBasicMaterial({color:0x342f21,opacity:.22,transparent:true,depthWrite:false});
  contact.onBeforeCompile=shader=>{
    shader.vertexShader='varying vec2 footprint;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nfootprint=uv;');
    shader.fragmentShader='varying vec2 footprint;\n'+shader.fragmentShader.replace('#include <alphamap_fragment>','#include <alphamap_fragment>\ndiffuseColor.a*=1.-smoothstep(.24,.5,length(footprint-.5));');
  };
  const leafShadow=new MeshBasicMaterial({map:palm.map,alphaTest:.035,color:0x202419,transparent:true,opacity:.22,depthWrite:false,toneMapped:false});
  const tintMaterials=[...Object.values(art),asphalt,grassFloor,rice,pathMaterial,blades,water,...cows];
  const day=new Color(0xffffff),night=new Color(0x73859a);
  const ultraSunsetTint=new Color(0xffffff),ultraNightTint=new Color(0x7d92ab),ultraTreeNightTint=new Color(0x94aa9d);
  const treeMats=new Set([palm,canopy,art.banana]);
  function section(index, group) {
    if(!group){
      group=new Group();
      group.userData.pools=new Map();
      root.add(group);
    }
    for(const pool of group.userData.pools.values())pool.used=0;
    for(const child of group.children)child.visible=false;
    group.userData.cow=null;
    const {items,random}=villageLayout(index);
    const at=z=>roadCurveX(index*LENGTH-z,'finalrun');
    // Only the 8 long 64m strips need curved Z-tessellation (12 segments matches the gentle bend seamlessly).
    floor(group,asphalt,0,.115,-32,7.1,LENGTH,true);
    floor(group,groundShadow,0,.123,-32,7.1,LENGTH,true);
    floor(group,grassFloor,-5.0,.185,-32,2.9,LENGTH,true);
    floor(group,water,-9.2,.07,-32,5.5,LENGTH,true);
    floor(group,grassFloor,-49.0,.185,-32,74.1,LENGTH,true);
    floor(group,grassFloor,96,-.2,-32,48,LENGTH,true);
    floor(group,grassFloor,5.6,.185,-32,4.1,LENGTH,true);
    floor(group,rice,40,.07,-32,65,LENGTH,true);
    for(const z of [-7-random()*14,-39-random()*17])floor(group,earth,40,.085,z,65,.38);
    const houseEntry=items.find(item=>houseTypes.includes(item.type));
    if(houseEntry){
      const width=Math.abs(houseEntry.x)-3.45;
      const path=floor(group,pathMaterial,-3.5-width/2,.195,houseEntry.z+1,width,1.6);
      path.rotation.z=.09;
      // Single merged timber crossing carries the house footpath over the irrigation channel.
      const bridge=acquire(group,timber,()=>new Mesh(bridgePlanksGeo,timber));
      bridge.position.set(at(houseEntry.z+1),0,houseEntry.z+1);
      bridge.receiveShadow=true;
      bridge.userData.staticPositioned=true;
    }
    const batches=new Map();
    for(const o of items){
      if(houseTypes.includes(o.type)){
        const home=acquire(group,o.type,()=>houseModel(o));
        houseModel(o,home);
        home.userData.villageHouse=true;
        floor(group,contact,o.x,.201,o.z+.3,o.w*1.16,o.h*1.18);
        continue;
      }
      if(o.type==='cow'){
        const mesh=acquire(group,'cow',()=>new Mesh(upright,cows[0]));
        group.userData.cow=mesh;
        mesh.userData.cow=o;
        const shade=acquire(group,'cow-shadow',()=>new Mesh(unit,contact));
        shade.rotation.x=-Math.PI/2;shade.scale.set(o.w*.9,.85,1);
        shade.position.set(o.x,.203,o.z);shade.userData.tracksCow=true;
        mesh.userData.shade=shade;
        mesh.position.set(o.x,.19,o.z);mesh.scale.set(o.w,o.h,1);
        continue;
      }
      if(!batches.has(o.type))batches.set(o.type,[]);
      batches.get(o.type).push([o.x,o.z,o.w,o.h,o.angle,.19]);
      if(o.type==='well')floor(group,contact,o.x,.201,o.z+.08,o.w*.8,.8);
      if(o.type==='palm'&&o.x<17){
        const shadow=floor(group,leafShadow,o.x-o.h*.62,.206,o.z+2,o.h*.86,o.h*1.85);
        shadow.rotation.z=-.95;
      }
    }
    for(const [key,entries] of batches)plants(group,art[key],entries);

    // Tapered 3-vertex grass blades written directly into typed arrays (17x fewer vertices & zero array GC churn!).
    const MAX_TUFTS = 38 * 6 + 6 * 24;
    const BLADES_PER_TUFT = 3;
    const grassMesh=acquire(group,blades,()=>{
      const geometry=new BufferGeometry();
      for(const key of ['position','color']){
        const buffer=new Float32Array(MAX_TUFTS * BLADES_PER_TUFT * 9);
        geometry.setAttribute(key,new BufferAttribute(buffer,3).setUsage(DynamicDrawUsage));
      }
      return new Mesh(geometry,blades);
    });
    const geom=grassMesh.geometry;
    const posBuf=geom.attributes.position.array;
    const colBuf=geom.attributes.color.array;
    let ptr = 0;
    function tuft(x,z,h,width,green){
      const cx = at(z);
      const w = width * 1.48;
      for(let j=0;j<BLADES_PER_TUFT;j++){
        const a=random()*6.28,dx=Math.cos(a),dz=Math.sin(a),height=h*(.62+random()*.55);
        const bx=x+cx+(random()-.5)*.22,bz=z+(random()-.5)*.22,wx=-dz*w,wz=dx*w;
        const y=.19;
        posBuf[ptr]=bx-wx;   posBuf[ptr+1]=y;        posBuf[ptr+2]=bz-wz;
        posBuf[ptr+3]=bx+wx; posBuf[ptr+4]=y;        posBuf[ptr+5]=bz+wz;
        posBuf[ptr+6]=bx+dx*height*.46; posBuf[ptr+7]=y+height; posBuf[ptr+8]=bz+dz*height*.46;
        colBuf[ptr]=.115*.48;   colBuf[ptr+1]=green*.48;   colBuf[ptr+2]=.032*.48;
        colBuf[ptr+3]=.115*.54; colBuf[ptr+4]=green*.54;   colBuf[ptr+5]=.032*.54;
        colBuf[ptr+6]=.115*1.12;colBuf[ptr+7]=green*1.12;  colBuf[ptr+8]=.032*1.12;
        ptr += 9;
      }
    }
    for(let patch=0;patch<38;patch++){
      const left=patch%2===0,x=left?-4-random()*10:4+random()*3.1,z=-random()*64;
      for(let n=0;n<6;n++){
        const tx=x+(random()-.5)*1.6,tz=z+(random()-.5)*2.2;
        if((tx< -6.42 && tx> -11.98)||Math.abs(tx)<3.57||tz>0||tz< -64)continue;
        if(houseEntry&&left&&Math.abs(tz-houseEntry.z-1)<1.6&&tx>houseEntry.x)continue;
        tuft(tx,tz,.20+random()*.45,.016+random()*.018,.23+random()*.13);
      }
    }
    for(let row=0;row<6;row++)for(let col=0;col<24;col++){
      tuft(8.4+row*1.04+random()*.18,-(col+random()*.45)*2.66,.25+random()*.24,.021,.43);
    }
    geom.setDrawRange(0,ptr/3);
    for(const attr of [geom.attributes.position,geom.attributes.color]){
      attr.clearUpdateRanges();
      attr.addUpdateRange(0,ptr);
      attr.needsUpdate=true;
    }
    geom.computeBoundingSphere();
    grassMesh.userData.staticPositioned = true;

    for(const child of group.children){
      if(!child.visible||child.userData.staticPositioned)continue;
      if(child.userData.villageHouse){child.position.x+=at(child.position.z);continue;}
      if(child.userData.tracksCow)continue;
      if(child.userData.cow){child.userData.baseCurve=at(child.position.z);continue;}
      if(child.isInstancedMesh){
        for(let i=0;i<child.count;i++){
          child.getMatrixAt(i,transform.matrix);
          const values=transform.matrix.elements;
          values[12]+=at(values[14]);
          child.setMatrixAt(i,transform.matrix);
        }
        child.instanceMatrix.needsUpdate=true;
        child.computeBoundingSphere();
      }else if(!child.userData.tessellate){
        // Small decals/bunds/paths keep shared unit PlaneGeometry with 0 geometry allocation!
        child.position.x+=at(child.position.z);
      }else{
        // Tessellate only the 64m road/canal/field strips (12 Z-segments) so bends join seamlessly.
        if(child.geometry===unit){
          child.updateMatrix();
          child.geometry=new PlaneGeometry(1,1,1,12).applyMatrix4(child.matrix);
          child.userData.stripPositions=child.geometry.attributes.position.array.slice();
        }
        child.position.set(0,0,0);child.rotation.set(0,0,0);child.scale.set(1,1,1);
        const pos=child.geometry.attributes.position;
        for(let i=0;i<pos.count;i++)pos.setX(i,child.userData.stripPositions[i*3]+at(pos.getZ(i)));
        pos.needsUpdate=true;
        child.geometry.computeBoundingSphere();
      }
    }
    return group;
  }
  const sections=Array(VISIBLE_SECTIONS);
  return state=>{
    const homecoming=state.map==='grandfather';
    const distance=homecoming?state.distance-SCHOOL_ROAD_START:state.distance;
    root.visible=state.map==='finalrun'||(homecoming&&distance>-VISIBLE_SECTIONS*LENGTH);
    if(!root.visible)return;
    const activeCount=scene.userData?.ultraLow?4:scene.userData?.lowEnd?5:VISIBLE_SECTIONS;
    clock.value=state.time||0;
    const weather=sceneWeather(state);
    const isUltra=Boolean(scene.userData?.ultraQuality || state._ultraQuality);
    ultraCanalMix.value=isUltra?1:0;
    ultraNightMix.value=Math.max(0,Math.min(1,weather.night||0));
    if(isUltra){
      for(const mat of tintMaterials){
        if(mat===water) mat.color.setHex(0xffffff);
        else if(treeMats.has(mat)) mat.color.copy(ultraSunsetTint).lerp(ultraTreeNightTint,weather.night*.62);
        else mat.color.copy(ultraSunsetTint).lerp(ultraNightTint,weather.night*.72);
      }
    }else{
      for(const mat of tintMaterials)mat.color.copy(day).lerp(night,weather.night*.75);
    }
    const first=Math.floor(distance/LENGTH)-1;
    for(let sIdx=0;sIdx<VISIBLE_SECTIONS;sIdx++){
      if(sections[sIdx])sections[sIdx].visible=false;
    }
    for(let index=first;index<first+activeCount;index++){
      if(homecoming && (index<0 || index*LENGTH>=HOME_YARD_START-SCHOOL_ROAD_START))continue;
      const slot=((index%VISIBLE_SECTIONS)+VISIBLE_SECTIONS)%VISIBLE_SECTIONS;
      let group=sections[slot];
      if(!group||group.userData.index!==index){
        group=sections[slot]=section(index,group);
        group.userData.index=index;
      }
      group.visible=true;
      group.position.set(-roadCurveX(state.distance,state.map),homecoming?-roadCurveY(state.distance,state.map):0,distance-index*LENGTH);
      const mesh=group.userData.cow;
      if(mesh){
        const cow=mesh.userData.cow;
        const pose=cowPose(clock.value,index);
        mesh.position.x=cow.x+mesh.userData.baseCurve+pose.offset;
        mesh.scale.x=cow.w*pose.flip;
        mesh.material=cows[pose.frame];
        mesh.userData.shade.position.x=mesh.position.x;
      }
    }
  };
}
