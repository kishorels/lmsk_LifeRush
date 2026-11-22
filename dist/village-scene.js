import {
  Group, Mesh, InstancedMesh, Object3D, PlaneGeometry, MeshBasicMaterial, ShadowMaterial,
  BufferGeometry, Float32BufferAttribute, Color, TextureLoader, SRGBColorSpace, RepeatWrapping, DoubleSide
} from './vendor/three.module.js';

import {SECTION_LENGTH as LENGTH,villageLayout,houseTypes,cowPose} from './village-layout.js';
import {createVillageHouses} from './village-house.js';
import {roadCurveX} from './campus-layout.js';
import {sceneWeather} from './weather.js';
const VISIBLE_SECTIONS = 7;

export function createVillageRoute(scene) {
  const root = new Group();
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
    const mat = new MeshBasicMaterial({map, side: DoubleSide, alphaTest: cutout ? .38 : 0, toneMapped: false});
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
  const water=material('canal-clear',{repeat:[1,2]});
  water.onBeforeCompile=shader=>{
    shader.uniforms.villageTime=clock;
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform float villageTime;')
      .replace('#include <map_fragment>',`vec2 q=vMapUv;
        float flow=villageTime*.23;
        vec2 drift=vec2(sin(q.y*16.+flow)+.5*sin(q.y*31.-flow),
                        sin(q.x*9.+q.y*8.-flow));
        diffuseColor.rgb*=texture2D(map,q+.0025*drift).rgb;
        float sheen=.5+.5*sin(q.y*25.+1.3*sin(q.x*9.+flow)-flow);
        diffuseColor.rgb+=vec3(.006,.009,.009)*sheen*sheen;`);
  };
  const asphalt = material('lane', {repeat: [1, 2]});
  const pathMaterial = material('earth', {repeat:[2,1]});
  const groundShadow = new ShadowMaterial({opacity:.37, depthWrite:false});
  const earth = new MeshBasicMaterial({color: 0x879047});
  const timber=new MeshBasicMaterial({color:0xa7794c});
  const unit = new PlaneGeometry(1, 1);
  const upright = new PlaneGeometry(1, 1, 8, 7).translate(0, .5, 0);
  const transform = new Object3D();
  function floor(parent, mat, x, y, z, w, d) {
    const mesh = new Mesh(unit, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x,y,z);
    mesh.scale.set(w,d,1);
    mesh.receiveShadow = true;
    parent.add(mesh);return mesh;
  }
  function plants(parent, mat, entries) {
    const mesh = new InstancedMesh(upright, mat, entries.length);
    entries.forEach(([x,z,w,h,angle=0,y=.10], index) => {
      transform.position.set(x,y,z);
      transform.rotation.set(0,angle,0);
      transform.scale.set(w,h,1);
      transform.updateMatrix();
      mesh.setMatrixAt(index,transform.matrix);
    });
    mesh.computeBoundingSphere();
    parent.add(mesh);
  }
  const contact = new MeshBasicMaterial({color:0x342f21,opacity:.22,transparent:true,depthWrite:false});
  contact.onBeforeCompile=shader=>{
    shader.vertexShader='varying vec2 footprint;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nfootprint=uv;');
    shader.fragmentShader='varying vec2 footprint;\n'+shader.fragmentShader.replace('#include <alphamap_fragment>','#include <alphamap_fragment>\ndiffuseColor.a*=1.-smoothstep(.24,.5,length(footprint-.5));');
  };
  const leafShadow=new MeshBasicMaterial({map:palm.map,alphaTest:.035,color:0x202419,transparent:true,opacity:.22,depthWrite:false,toneMapped:false});
  const tintMaterials=[...Object.values(art),asphalt,grassFloor,rice,pathMaterial,blades,water,...cows];
  const day=new Color(0xffffff),night=new Color(0x73859a);
  function section(index) {
    const group=new Group();
    const {items,random}=villageLayout(index);
    floor(group,asphalt,0,.115,-32,7.1,LENGTH);
    floor(group,groundShadow,0,.123,-32,7.1,LENGTH);
    floor(group,grassFloor,-5.0,.185,-32,2.9,LENGTH);
    floor(group,water,-9.2,.07,-32,5.5,LENGTH);
    floor(group,grassFloor,-49.0,.185,-32,74.1,LENGTH);
    floor(group,grassFloor,96,-.2,-32,48,LENGTH);
    floor(group,grassFloor,5.6,.185,-32,4.1,LENGTH);
    floor(group,rice,40,.07,-32,65,LENGTH);
    for(const z of [-7-random()*14,-39-random()*17])floor(group,earth,40,.085,z,65,.38);
    const houseEntry=items.find(item=>houseTypes.includes(item.type));
    if(houseEntry){
      const width=Math.abs(houseEntry.x)-3.45;
      const path=floor(group,pathMaterial,-3.5-width/2,.195,houseEntry.z+1,width,1.6);
      path.rotation.z=.09;
      // Timber crossing carries the house footpath over the irrigation channel.
      for(let plank=0;plank<18;plank++)floor(group,timber,-12.02+plank*.335,.235,houseEntry.z+1,.314,1.72);

    }
    const batches=new Map();
    for(const o of items){
      if(houseTypes.includes(o.type)){
        const home=houseModel(o);
        home.userData.villageHouse=true;
        group.add(home);
        floor(group,contact,o.x,.201,o.z+.3,o.w*1.16,o.h*1.18);
        continue;
      }
      if(o.type==='cow'){
        const mesh=new Mesh(upright,cows[0]);
        mesh.userData.cow=o;
        const shade=new Mesh(unit,contact);
        shade.rotation.x=-Math.PI/2;shade.scale.set(o.w*.9,.85,1);
        shade.position.set(o.x,.203,o.z);shade.userData.tracksCow=true;
        mesh.userData.shade=shade;group.add(shade);
        mesh.position.set(o.x,.19,o.z);mesh.scale.set(o.w,o.h,1);
        group.add(mesh);
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
    const positions=[],colors=[];
    function tuft(x,z,h,width,green){
      for(let j=0;j<6;j++){
        const a=random()*6.28,dx=Math.cos(a),dz=Math.sin(a),height=h*(.55+random()*.6);
        const bx=x+(random()-.5)*.19,bz=z+(random()-.5)*.19,wx=-dz*width,wz=dx*width;
        const y=.19,mx=bx+dx*height*.15,mz=bz+dz*height*.15;
        positions.push(bx-wx,y,bz-wz,bx+wx,y,bz+wz,mx+wx*.45,y+height*.65,mz+wz*.45,
          bx-wx,y,bz-wz,mx+wx*.45,y+height*.65,mz+wz*.45,bx+dx*height*.56,y+height,bz+dz*height*.56);
        for(const shade of [.46,.51,.94,.46,.94,1.12])colors.push(.115*shade,green*shade,.032*shade);
      }
    }
    for(let patch=0;patch<70;patch++){
      const left=patch%2===0,x=left?-4-random()*10:4+random()*3.1,z=-random()*64;
      for(let n=0;n<15;n++){
        const tx=x+(random()-.5)*1.4,tz=z+(random()-.5)*2;
        if((tx< -6.42 && tx> -11.98)||Math.abs(tx)<3.57||tz>0||tz< -64)continue;
        if(houseEntry&&left&&Math.abs(tz-houseEntry.z-1)<1.6&&tx>houseEntry.x)continue;
        tuft(tx,tz,.18+random()*.43,.014+random()*.018,.23+random()*.13);
      }
    }
    for(let row=0;row<9;row++)for(let col=0;col<50;col++){
      tuft(8.4+row*.69+random()*.15,-(col+random()*.4)*1.28,.23+random()*.22,.019,.43);
    }
    const geom=new BufferGeometry();
    geom.setAttribute('position',new Float32BufferAttribute(positions,3));
    geom.setAttribute('color',new Float32BufferAttribute(colors,3));
    group.add(new Mesh(geom,blades));
    const at=z=>roadCurveX(index*LENGTH-z,'finalrun');
    for(const child of group.children){
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
      }else{
        // Tessellate the ground along the route so consecutive bends join seamlessly.
        if(child.geometry===unit){
          child.updateMatrix();
          child.geometry=new PlaneGeometry(1,1,1,24).applyMatrix4(child.matrix);
          child.position.set(0,0,0);child.rotation.set(0,0,0);child.scale.set(1,1,1);
        }
        const pos=child.geometry.attributes.position;
        for(let i=0;i<pos.count;i++)pos.setX(i,pos.getX(i)+at(pos.getZ(i)));
        pos.needsUpdate=true;
        child.geometry.computeBoundingSphere();
      }
    }
    root.add(group);
    return group;
  }
  const sections=Array(VISIBLE_SECTIONS);
  return state=>{
    root.visible=state.map==='finalrun';
    if(!root.visible)return;
    clock.value=state.time;
    const weather=sceneWeather(state);
    for(const mat of tintMaterials)mat.color.copy(day).lerp(night,weather.night*.75);
    const first=Math.floor(state.distance/LENGTH)-1;
    for(let index=first;index<first+VISIBLE_SECTIONS;index++){
      const slot=(index+VISIBLE_SECTIONS)%VISIBLE_SECTIONS;
      let group=sections[slot];
      if(!group||group.userData.index!==index){
        if(group){
          root.remove(group);
          for(const child of group.children){
            if(child.isInstancedMesh)child.dispose();
            if(child.geometry && child.geometry!==upright && child.geometry!==unit)child.geometry.dispose();
          }
        }
        group=sections[slot]=section(index);
        group.userData.index=index;
      }
      group.position.set(-roadCurveX(state.distance,'finalrun'),0,state.distance-index*LENGTH);
      for(const mesh of group.children){
        const cow=mesh.userData.cow;
        if(!cow)continue;
        const pose=cowPose(state.time,index);
        mesh.position.x=cow.x+mesh.userData.baseCurve+pose.offset;
        mesh.scale.x=cow.w*pose.flip;
        mesh.material=cows[pose.frame];
        mesh.userData.shade.position.x=mesh.position.x;
      }
    }
  };
}
