import {campusMaterial,roadsideTree,curveRelX,curveRelY,curveSlopeAt} from './street-materials.js?v=3.2.8';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';
import {BoxGeometry,CylinderGeometry,SphereGeometry,PlaneGeometry,CanvasTexture,SRGBColorSpace,Group,Mesh,MeshStandardMaterial,DoubleSide,BufferGeometry,Float32BufferAttribute,Color,RepeatWrapping} from './vendor/three.module.js';

const SEGMENT=128,SLOTS=8,SPAN=SEGMENT*SLOTS,RENDER_DISTANCE=375;

function villageKind(anchor){
  if(anchor<SEGMENT)return 0;
  if(anchor<512)return Math.floor(anchor/SEGMENT)%3;
  if(anchor>9000)return 10+(Math.floor(anchor/SEGMENT)%2);
  const roll=Math.floor(anchor/SEGMENT)%8;
  return 3+roll;
}

function segmentAnchor(slot,distance){
  const first=slot*SEGMENT;
  const cycle=Math.max(0,Math.ceil((distance-RENDER_DISTANCE-SEGMENT-first)/SPAN));
  return first+cycle*SPAN;
}

export function createVillageRoute(scene){
  const cube=new BoxGeometry(),sphere=new SphereGeometry(1,12,9),cylinder=new CylinderGeometry(1,1,1,10),plane=new PlaneGeometry(1,1);
  const materials=new Map(),signMaterials=new Map();
  const mat=(color,roughness=.9)=>{
    if(!materials.has(color))materials.set(color,color===0xffd888?campusMaterial(color):new MeshStandardMaterial({color,roughness}));
    return materials.get(color);
  };
  const waterMat=new MeshStandardMaterial({color:0x61c6d3,roughness:.3,metalness:.06,transparent:true,opacity:.82,side:DoubleSide});
  const groundTexture=makeGrassTexture();
  const turfMat=new MeshStandardMaterial({map:groundTexture,color:0xffffff,roughness:1,side:DoubleSide});
  const grassMat=new MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:1,side:DoubleSide});
  const grassWind={value:0};
  grassMat.onBeforeCompile=shader=>{
    shader.uniforms.uVillageGrassTime=grassWind;
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nuniform float uVillageGrassTime;');
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nfloat villageGrassTip = clamp(transformed.y, 0.0, 1.15);\nfloat villageGrassSway = sin(uVillageGrassTime * 1.8 + transformed.x * 1.2 + transformed.z * 0.31) * 0.11 * villageGrassTip;\ntransformed.x += villageGrassSway;\ntransformed.z += cos(uVillageGrassTime * 1.25 + transformed.x * 0.52 + transformed.z * 0.21) * 0.055 * villageGrassTip;');
  };
  grassMat.customProgramCacheKey=()=> 'village-grass-wind-v1';
  const wood=mat(0x805630),plaster=mat(0xffd888),redRoof=mat(0xb84f32,.85),cream=mat(0xf4e8c8),glass=mat(0x6b9fa4,.35);

  function makeGrassTexture(){
    if(typeof document==='undefined')return null;
    const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;
    const context=canvas.getContext('2d');if(!context)return null;
    context.fillStyle='#587f3d';context.fillRect(0,0,256,256);
    let seed=8041;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
    const colors=['#4b7436','#608b3f','#739b48','#88a951','#3e6a33','#9cae58'];
    context.lineCap='round';
    for(let blade=0;blade<1800;blade++){
      const x=random()*256,y=random()*256,length=2+random()*9;
      context.strokeStyle=colors[Math.floor(random()*colors.length)];context.lineWidth=.45+random()*1.1;
      context.beginPath();context.moveTo(x,y);context.quadraticCurveTo(x+(random()-.5)*4,y-length*.45,x+(random()-.5)*6,y-length);context.stroke();
    }
    const texture=new CanvasTexture(canvas);texture.colorSpace=SRGBColorSpace;texture.wrapS=RepeatWrapping;texture.wrapT=RepeatWrapping;texture.repeat.set(8,54);
    return texture;
  }

  function part(parent,material,x,y,z,width,height,depth,geometry=cube){
    const mesh=new Mesh(geometry,typeof material==='number'?mat(material):material);
    mesh.position.set(x,y,z);mesh.scale.set(width,height,depth);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
  }
  function sign(parent,label,x,y,z,width=3.6){
    part(parent,0x285647,x,y,z,width,.58,.12);
    if(typeof document==='undefined')return;
    if(!signMaterials.has(label)){
      const canvas=document.createElement('canvas');canvas.width=768;canvas.height=128;
      const ctx=canvas.getContext('2d');if(!ctx)return;
      const grad=ctx.createLinearGradient(0,0,0,128);grad.addColorStop(0,'#276344');grad.addColorStop(1,'#153c32');ctx.fillStyle=grad;ctx.fillRect(0,0,768,128);
      ctx.strokeStyle='#f5d27a';ctx.lineWidth=8;ctx.strokeRect(8,8,752,112);
      ctx.fillStyle='#fff7dc';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='900 48px system-ui, sans-serif';ctx.fillText(label,384,66,700);
      const texture=new CanvasTexture(canvas);texture.colorSpace=SRGBColorSpace;
      signMaterials.set(label,new MeshStandardMaterial({map:texture,roughness:.8,side:DoubleSide}));
    }
    const face=new Mesh(plane,signMaterials.get(label));face.position.set(x,y,z+.067);face.scale.set(width-.06,.52,1);parent.add(face);
  }
  function goatCoat(){
    if(materials.has('goat-coat'))return materials.get('goat-coat');
    let coat=mat(0xe8dfd2);
    if(typeof document!=='undefined'){
      const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;
      const context=canvas.getContext('2d');
      if(context){
        context.fillStyle='#e8dfd2';context.fillRect(0,0,canvas.width,canvas.height);
        let seed=7391;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
        const colors=['rgba(255,250,238,.36)','rgba(185,169,148,.22)','rgba(212,199,181,.26)','rgba(250,245,235,.3)'];
        context.lineCap='round';
        for(let hair=0;hair<2400;hair++){
          const x=random()*canvas.width,y=random()*canvas.height,length=2+random()*12;
          context.strokeStyle=colors[Math.floor(random()*colors.length)];context.lineWidth=.35+random()*1.25;
          context.beginPath();context.moveTo(x,y);context.quadraticCurveTo(x+(random()-.5)*3,y+length*.55,x+(random()-.5)*5,y+length);context.stroke();
        }
        const texture=new CanvasTexture(canvas);texture.colorSpace=SRGBColorSpace;texture.wrapS=RepeatWrapping;texture.wrapT=RepeatWrapping;
        coat=new MeshStandardMaterial({map:texture,color:0xffffff,roughness:1});
      }
    }
    materials.set('goat-coat',coat);return coat;
  }
  function tree(parent,x,z,height,palm=false,angle=0,phase=0){
    const sameSchoolTree=roadsideTree(parent,x,z,Math.max(6.3,Math.min(10,height)),palm,angle);
    sameSchoolTree.castShadow=false;sameSchoolTree.receiveShadow=false;
    parent.userData.villageTreeCount=(parent.userData.villageTreeCount||0)+1;
    return sameSchoolTree;
  }
  function grassPatch(parent,x,z,width,depth,count,seed,height=.92){
    let state=(seed+1)>>>0;const random=()=>{state=(state*1664525+1013904223)>>>0;return state/4294967296;};
    const positions=[],colors=[],palette=[0x467f32,0x5c963b,0x73aa43,0x8eb94b,0x3f7131].map(value=>new Color(value));
    const columns=Math.ceil(Math.sqrt(count*width/depth)),rows=Math.ceil(count/columns);
    for(let tuft=0;tuft<count;tuft++){
      const column=tuft%columns,row=Math.floor(tuft/columns),tx=x+((column+random())/columns-.5)*width,tz=z+((row+random())/rows-.5)*depth;
      const blades=4+Math.floor(random()*2);
      for(let blade=0;blade<blades;blade++){
        const angle=blade*Math.PI*.618+random()*.6,length=height*(.35+random()*.65),bladeWidth=.035+random()*.035,lean=.18+random()*.28;
        const dx=Math.cos(angle),dz=Math.sin(angle),wx=-dz*bladeWidth,wz=dx*bladeWidth;
        const bx=tx+(random()-.5)*.28,bz=tz+(random()-.5)*.28,tipX=bx+dx*length*lean,tipZ=bz+dz*length*lean,color=palette[Math.floor(random()*palette.length)];
        positions.push(bx-wx,.005,bz-wz,bx+wx,.005,bz+wz,tipX,.005+length,tipZ);
        for(let vertex=0;vertex<3;vertex++)colors.push(color.r,color.g,color.b);
      }
    }
    const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute(positions,3));geometry.setAttribute('color',new Float32BufferAttribute(colors,3));geometry.computeVertexNormals();
    const grass=new Mesh(geometry,grassMat);grass.castShadow=false;grass.receiveShadow=false;parent.add(grass);
  }
  function goat(parent,side,z,phase=0){
    const requests=parent.userData.villageGoats??(parent.userData.villageGoats=[]);
    requests.push({side,z,phase});
  }
  function buildGoat(request){
    const fur=goatCoat(),furLight=mat(0xf2eadf),furShade=mat(0xcbbfae),muzzle=mat(0x8c766b),horn=mat(0x594736),hoof=mat(0x35302d),eye=mat(0x171513),udder=mat(0xb98478);
    const root=new Group(),body=new Group();root.add(body);body.name='goat-body-root';
    const side=request.side,frontZ=-.38,rearZ=.39;
    root.position.set(side*9.2,0,request.z);root.rotation.y=side<0?Math.PI/2:-Math.PI/2;
    root.userData.villageGoat={x:side*9.2,z:request.z,phase:request.phase,side};
    part(body,fur,0,.94,0,.78,.78,1.35,sphere).name='goat-torso';
    part(body,furShade,0,.76,.22,.67,.42,.58,sphere);
    const neck=part(body,fur,0,1.12,-.48,.34,.54,.40,sphere);neck.rotation.x=-.38;
    const head=new Group();head.name='goat-head';head.position.set(0,1.34,-.70);body.add(head);
    part(head,furLight,0,0,-.02,.43,.48,.48,sphere);
    part(head,muzzle,0,-.10,-.29,.30,.22,.22,sphere);
    const jaw=part(head,furShade,0,-.205,-.245,.21,.12,.15,sphere);jaw.name='goat-jaw';
    for(const s of [-1,1]){
      part(head,eye,s*.205,.055,-.145,.045,.05,.035,sphere);
      const ear=part(head,furShade,s*.31,.075,.0,.34,.105,.13,sphere);ear.rotation.z=s*.2;
      const hornBase=part(head,horn,s*.145,.255,.01,.075,.28,.075,cylinder);hornBase.rotation.z=-s*.16;
      const hornTip=part(head,horn,s*.175,.46,.055,.052,.20,.052,cylinder);hornTip.rotation.z=s*.22;
    }
    part(head,furShade,0,-.31,-.04,.12,.24,.12,sphere);
    part(body,udder,0,.49,.16,.23,.17,.26,sphere);
    for(const x of [-.09,.09])part(body,udder,x,.37,.16,.055,.20,.06,cylinder);
    for(let leg=0;leg<4;leg++){
      const isFront=leg<2,near=leg%2===0,pivot=new Group();
      pivot.name='goat-leg-'+leg;pivot.position.set(near?-.25:.25,.56,isFront?frontZ:rearZ);body.add(pivot);
      part(pivot,furLight,0,-.24,0,.12,.51,.13,cylinder);
      part(pivot,hoof,0,-.49,-.015,.16,.13,.19,cube);
    }
    const tail=new Group();tail.name='goat-tail';tail.position.set(0,1.02,.60);body.add(tail);
    const tailMesh=part(tail,furLight,0,.12,.02,.09,.28,.09,cylinder);tailMesh.rotation.x=-.38;
    return root;
  }
  function fence(parent,side,zStart=-4,zEnd=-123){
    const x=side*5.55;
    for(let z=zStart;z>=zEnd;z-=9){
      part(parent,wood,x,.52,z,.16,1.04,.16,cylinder);
      part(parent,0xa78252,x,.52,z-.13,.19,.16,.19);
    }
    const length=Math.abs(zEnd-zStart);
    part(parent,0x926b41,x,.40,(zStart+zEnd)/2,.13,.13,length);
    part(parent,0x926b41,x,.82,(zStart+zEnd)/2,.13,.13,length);
  }
  function home(parent,side,z=-62,small=false){
    const x=side*(small?10.8:12.6),width=small?5.6:7.0,depth=small?8.2:10.2,height=small?3.15:3.75;
    part(parent,plaster,x,height/2,z,width,height,depth);
    part(parent,0xf4e8c8,x,height+.08,z,width+.25,.18,depth+.25);
    const frontage=x-side*(width/2-.08);
    part(parent,0x6f4730,frontage,1.02,z+.8,.08,1.95,1.05);
    for(const dz of [-2.7,3.0]){
      part(parent,0x705040,frontage,2.05,z+dz,.08,1.18,1.22);
      part(parent,glass,frontage-side*.04,2.05,z+dz,.035,.94,.98);
      part(parent,0xf2dfb5,frontage-side*.07,2.05,z+dz,.045,.08,1.2);
      part(parent,0xf2dfb5,frontage-side*.07,2.05,z+dz,.045,.94,.08);
    }
    const eave=height+.23;
    for(const roofSide of [-1,1]){
      const roof=part(parent,redRoof,x+roofSide*width*.24,eave+.72,z,width*.58,.20,depth+.72);
      roof.rotation.z=-roofSide*.42;
      for(let row=0;row<3;row++){
        const tile=part(parent,row%2?0xc45a36:0xa9412d,x+roofSide*(.35+row*.72),eave+.93-row*.05,z,width*.10,.055,depth+.78);
        tile.rotation.z=-roofSide*.42;
      }
    }
    part(parent,0x80482f,x,eave+1.08,z,.18,.18,depth+.82);
    const porchX=x-side*(width/2+.55);
    part(parent,0xd7c59e,porchX,.20,z+1,.85,.28,depth*.64);
    for(const dz of [-depth*.22,depth*.22])part(parent,cream,porchX,.95,z+1+dz,.16,1.75,.16,cylinder);
    if(!small)part(parent,0x98734b,porchX,1.85,z+1,.95,.13,depth*.72);
    return x;
  }
  function field(parent,side,wet=false){
    const x=side*15.4,z=-65;
    part(parent,wet?0x579948:0x5f9f42,x,-.07,z,18,.10,116);
    const turf=part(parent,turfMat,x,-.012,z,18,116,1,plane);turf.rotation.x=-Math.PI/2;turf.castShadow=false;
    grassPatch(parent,x,z,17.8,114,340,side*19+parent.userData.villageKind*.9,.96);
    if(wet){
      const channel=part(parent,waterMat,side*6.55,.015,z,1.45,.035,118);
      channel.userData.villageWater={base:.015,phase:side};
      grassPatch(parent,side*7.5,z,1.9,114,44,side*43+2,1.12);
    }
    for(const offset of [-9,9])part(parent,0xd5cf9f,x+offset,.005,z,.08,.025,116);
  }
  function shop(parent,side=-1){
    const x=side*8.7,z=-31;
    part(parent,0xf4e8c8,x,1.58,z,4.8,3.15,4.7);
    part(parent,wood,x,1.05,z-side*1.25,4.25,.16,1.6);
    part(parent,0x2e6792,x,3.4,z,5.4,.18,5.3);
    for(let stripe=-2;stripe<=2;stripe++)part(parent,stripe%2?0xf4f3e8:0x2876b4,x+stripe*.92,3.27,z-side*1.05,.92,.12,2.2);
    part(parent,0xe9d6b5,x+side*2.43,2.0,z, .18,2.25,4.8);
    sign(parent,'VILLAGE TEA SHOP',x,2.78,z-side*2.45,4.4);
    for(let crate=0;crate<3;crate++){
      const cx=x+side*(1.2+crate*.72);
      part(parent,crate%2?0xd89435:0xc77b30,cx,.39,z-side*3.0,.63,.72,.60);
      part(parent,0x669a42,cx,.82,z-side*3.0,.34,.22,.34,sphere);
    }
  }
  function busStop(parent,side=1){
    const x=side*9.0,z=-85;
    part(parent,0x315b74,x,2.45,z,4.7,.22,5.3);
    part(parent,0x2c6791,x-side*1.95,1.35,z,.15,2.5,.15);
    part(parent,0x2c6791,x+side*1.95,1.35,z,.15,2.5,.15);
    part(parent,0x76aeb6,x-side*1.8,1.35,z,.045,2.1,4.8);
    part(parent,0x76aeb6,x+side*1.8,1.35,z,.045,2.1,4.8);
    part(parent,0x976b42,x,.64,z-side*.35,3.2,.17,.62);
    for(const dx of [-1.15,1.15])part(parent,0x6f573c,x+dx,.34,z-side*.35,.10,.60,.10);
    part(parent,0x2784b5,x+side*2.55,1.82,z,.12,2.65,.12);
    part(parent,0x2b79aa,x+side*2.55,3.25,z,.92,.72,.18);
  }
  function cow(parent,side=1,z=-45){
    const x=side*18;
    part(parent,0xf3eee0,x,.88,z,1.55,.94,2.20,sphere);
    part(parent,0x362d25,x-side*.12,1.08,z-side*.15,.68,.40,1.58,sphere);
    part(parent,0xf0ece1,x-side*.75,1.02,z-.86,.72,.70,.72,sphere);
    part(parent,0xf3eee0,x-side*.8,1.37,z-.93,.11,.38,.11,cylinder).rotation.z=-.45;
    part(parent,0xf3eee0,x-side*.43,1.37,z-.93,.11,.38,.11,cylinder).rotation.z=.45;
    for(const dx of [-.49,.49])for(const dz of [-.67,.67])part(parent,0x46382d,x+dx,.31,z+dz,.17,.64,.17,cylinder);
  }
  function build(kind,anchor){
    const group=new Group(),absoluteIndex=Math.floor(anchor/SEGMENT),side=absoluteIndex%2?1:-1;
    group.userData.villageKind=kind;
    const isStart=anchor===0;
    const isFinal=anchor>9000;
    if(kind===0){
      home(group,-1,-31);tree(group,-5.4,-54,9,true,-.22,.1);tree(group,7.1,-82,8,false,.14,1.1);fence(group,-1,-4,-118);field(group,1,true);shop(group,1);
      sign(group,'VILLAGE ROAD',-5.2,2.65,-9,3.7);
    }else if(kind===1){
      home(group,side,-52,true);field(group,-side,absoluteIndex%3===0);fence(group,side,-5,-118);tree(group,-side*8,-22,8.4,true,side*.18,.3);tree(group,-side*9,-92,7.6,false,-side*.22,1.3);
    }else if(kind===2){
      field(group,-1,true);field(group,1,false);shop(group,side);tree(group,-side*9,-22,9.2,true,.2,.7);fence(group,-1);fence(group,1,-22,-122);
    }else if(kind===10){
      field(group,-1,false);field(group,1,true);home(group,side,-68,true);fence(group,-1,-4,-118);tree(group,side*8,-26,9.5,true,side*.2,.4);tree(group,-side*8,-100,8,false,side*.14,1.2);
      sign(group,'SCHOOL ROAD',-5.3,3.3,-22,3.9);
    }else if(kind===11){
      field(group,-side,false);home(group,-side,-48,true);busStop(group,side);tree(group,-side*8,-18,9,true,-.18,.2);fence(group,side,-3,-120);
      sign(group,'SCHOOL  →',side*5.0,2.95,-16,3.4);
    }else{
      const theme=kind-3;
      if(theme===0){field(group,-1,false);field(group,1,true);tree(group,-1*8,-20,9,true,-.24,.4);tree(group,9,-93,8,false,.24,1.1);fence(group,-1);fence(group,1,-28,-122);}
      else if(theme===1){home(group,side,-47);field(group,-side,true);tree(group,-side*8,-93,9,true,side*.24,.9);fence(group,side);cow(group,-side,-74);}
      else if(theme===2){shop(group,side);field(group,-side,false);tree(group,-side*8,-90,8,false,.2,.2);fence(group,-side);}
      else if(theme===3){field(group,1,true);field(group,-1,true);tree(group,-8,-30,10,true,-.17,1.4);tree(group,8,-92,9,true,.2,.5);fence(group,-1,-4,-115);fence(group,1,-4,-115);}
      else if(theme===4){busStop(group,side);field(group,-side,false);home(group,-side,-58,true);tree(group,side*8,-23,9,true,side*.2,.8);fence(group,side,-18,-119);}
      else if(theme===5){home(group,-1,-53,true);home(group,1,-86,true);field(group,-1,false);tree(group,-6,-26,8,false,-.16,.1);tree(group,6,-112,9,true,.15,.7);}
      else if(theme===6){field(group,side,true);cow(group,-side,-42);tree(group,side*8,-97,10,true,-side*.18,.6);fence(group,side);}
      else {field(group,-1,false);shop(group,-1);home(group,1,-84,true);tree(group,-8,-111,8,true,.17,.5);fence(group,1);}
    }
    if(isStart){tree(group,16,-18,10,true,.26,1.6);}
    if(isFinal){
      tree(group,-13,-16,10,true,-.22,.3);tree(group,14,-50,9,false,.18,.9);
      field(group,side,false);
    }
    if(group.userData.villageTreeCount<2)tree(group,side*13,-58,8.5,false,side*.18,.5);
    if(kind===0||kind===6||kind===10||kind===11)goat(group,kind===0?1:kind===11?-side:side,kind===0?-20:-36,kind*.73);

    group.updateMatrixWorld(true);
    const batches=new Map(),animated=[];
    group.traverse(object=>{
      if(!object.isMesh)return;
      if(object.userData.villageWind||object.userData.villageWater){animated.push(object);return;}
      const geometry=(object.geometry.index?object.geometry.toNonIndexed():object.geometry.clone()).applyMatrix4(object.matrixWorld);
      if(!batches.has(object.material))batches.set(object.material,[]);
      batches.get(object.material).push(geometry);
    });
    const merged=new Group();
    for(const [material,geometries] of batches){
      const geometry=mergeGeometries(geometries);
      if(geometry){const mesh=new Mesh(geometry,material),castsShadow=material!==grassMat&&material!==turfMat;mesh.castShadow=castsShadow;mesh.receiveShadow=castsShadow;merged.add(mesh);}
      for(const geometry of geometries)geometry.dispose();
    }
    const result=new Group();result.add(merged,...animated.map(object=>object.clone()));
    for(const request of group.userData.villageGoats||[])result.add(buildGoat(request));
    result.userData.villageKind=kind;
    return result;
  }

  const templates=new Map();
  for(let kind=0;kind<12;kind++)templates.set(kind,build(kind,kind===0?0:kind===10?9088:kind===11?9216:kind*SEGMENT));
  const slots=Array.from({length:SLOTS},(_,slot)=>{const root=new Group();scene.add(root);return{slot,root,anchor:NaN,kind:-1};});

  return state=>{
    if(state.map!=='finalrun'){for(const item of slots)item.root.visible=false;return;}
    grassWind.value=state.time;
    for(const item of slots){
      const anchor=segmentAnchor(item.slot,state.distance),kind=villageKind(anchor);
      item.root.visible=true;
      if(item.anchor!==anchor||item.kind!==kind){
        item.root.clear();item.root.add(templates.get(kind).clone(true));item.anchor=anchor;item.kind=kind;
      }
      item.root.position.set(curveRelX(anchor,state),curveRelY(anchor,state),state.distance-anchor);
      item.root.rotation.y=state.map==='college'?-Math.atan(curveSlopeAt(anchor,state)):0;
      item.root.traverse(object=>{
        const wind=object.userData.villageWind;
        if(wind)object.rotation.z=wind.base+Math.sin(state.time*1.15+wind.phase+anchor*.03)*(wind.amplitude||.014);
        const water=object.userData.villageWater;
        if(water)object.position.y=water.base+Math.sin(state.time*1.6+water.phase+anchor*.02)*.008;
        const animal=object.userData.villageGoat;
        if(animal){
          const cycle=(state.time*.72+animal.phase)%10,walking=cycle<3.2,grazing=cycle>4.0&&cycle<9.2;
          const progress=walking?Math.min(1,cycle/3.2):cycle>=3.2?1:0;
          const gait=walking?Math.sin(state.time*5.2+animal.phase):0;
          object.position.x=animal.x+animal.side*(progress*.78+Math.sin(state.time*.42+animal.phase)*(walking ? .035 : .07));
          object.position.z=animal.z-progress*1.10+Math.cos(state.time*.37+animal.phase)*(walking ? .04 : .09);
          const body=object.getObjectByName('goat-body-root');
          if(body)body.position.y=walking?Math.abs(gait)*.035:0;
          const head=object.getObjectByName('goat-head');
          if(head)head.rotation.x=grazing?-.70+Math.sin(state.time*4.4+animal.phase)*.045:Math.sin(state.time*1.8+animal.phase)*.035;
          const jaw=object.getObjectByName('goat-jaw');
          if(jaw)jaw.rotation.x=grazing?Math.sin(state.time*4.4+animal.phase)*.12:0;
          for(let leg=0;leg<4;leg++){
            const pivot=object.getObjectByName('goat-leg-'+leg);
            if(pivot)pivot.rotation.x=walking?Math.sin(state.time*5.2+animal.phase+(leg%2)*Math.PI+(leg<2 ? .15 : 0))*.30:Math.sin(state.time*1.6+animal.phase+leg)*.018;
          }
          const tail=object.getObjectByName('goat-tail');
          if(tail)tail.rotation.z=Math.sin(state.time*3.2+animal.phase)*.16;
        }
      });
    }
  };
}
