import {
  CanvasTexture, CylinderGeometry, DataTexture, EquirectangularReflectionMapping,
  FloatType, Group, LinearSRGBColorSpace, Mesh, MeshStandardMaterial, RGBAFormat, SRGBColorSpace,
  Sprite, SpriteMaterial, AdditiveBlending
} from './vendor/three.module.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';

let faceCanvas, geometry, materials, modelPromise, reflectionMap;
const COIN_SPIN = 2.1;

// Metals need something to reflect. A shared HDR studio map keeps gold readable
// through the game's day/night cycle without adding lights to every pickup.
export function coinReflections() {
  if (reflectionMap) return reflectionMap;
  const width=128,height=64,pixels=new Float32Array(width*height*4);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const u=x/width,v=y/(height-1),offset=(y*width+x)*4;
    const sky=.32+.32*Math.sin(v*Math.PI);
    const key=4*Math.exp(-Math.pow((u-.20)/.065,8)-Math.pow((v-.47)/.30,8));
    const fill=2.6*Math.exp(-Math.pow((u-.70)/.10,8)-Math.pow((v-.48)/.34,8));
    const rim=1.2*Math.exp(-Math.pow((v-.67)/.06,2));
    pixels[offset]=sky+key+fill*.88+rim;
    pixels[offset+1]=sky+key*.94+fill*.95+rim*.88;
    pixels[offset+2]=sky+key*.80+fill+rim*.66;
    pixels[offset+3]=1;
  }
  reflectionMap=new DataTexture(pixels,width,height,RGBAFormat,FloatType);
  reflectionMap.mapping=EquirectangularReflectionMapping;
  reflectionMap.colorSpace=LinearSRGBColorSpace;
  reflectionMap.needsUpdate=true;
  return reflectionMap;
}

let glintMaterial;
export function makePickupGlint() {
  if (!glintMaterial) {
    const pixels=new Uint8Array(32*32*4);
    for(let y=0;y<32;y++)for(let x=0;x<32;x++){
      const dx=(x-15.5)/15.5,dy=(y-15.5)/15.5,n=(y*32+x)*4;
      const glow=Math.exp(-(dx*dx+dy*dy)*10)*.45;
      const star=Math.exp(-dx*dx*260-dy*dy*7)+Math.exp(-dy*dy*260-dx*dx*7);
      pixels[n]=255;pixels[n+1]=239;pixels[n+2]=174;pixels[n+3]=Math.round(Math.min(1,glow+star*.7)*255);
    }
    const map=new DataTexture(pixels,32,32);map.colorSpace=SRGBColorSpace;map.needsUpdate=true;
    glintMaterial=new SpriteMaterial({map,transparent:true,depthWrite:false,toneMapped:false,blending:AdditiveBlending});
  }
  const glint=new Sprite(glintMaterial);glint.name='pickup-shine';glint.scale.setScalar(.12);return glint;
}

// One download/decode per session; clones share the imported geometry and maps.
export function preloadCoinModel() {
  if (!modelPromise) {
    modelPromise = new GLTFLoader().loadAsync(new URL('./assets/mantis-flip-coin.glb', import.meta.url).href)
      .then(({scene}) => {
        scene.traverse(object => {
          if (!object.isMesh) return;
          const material=object.material;
          // The artist's inverted black shell is a cartoon outline, not gold.
          if (!material.map && material.color.getHex()===0) {
            object.visible=false;
            object.castShadow=false;
            return;
          }
          material.envMap=coinReflections();
          material.envMapIntensity=1.4;
          material.metalness=.74;
          material.roughness=.28;
          // Preserve the red/gold texture colours on the shadowed face as it spins.
          material.emissiveMap=material.map;
          material.emissive.setHex(0xffffff);
          material.emissiveIntensity=.16;
          material.normalScale.set(.7,.7);
          material.needsUpdate=true;
          object.castShadow = true;
          object.receiveShadow = false;
        });
        return scene;
      }).catch(error => {
        console.warn('Could not load Mantis Flip Coin; using the lightweight coin.', error);
        return null;
      });
  }
  return modelPromise;
}

function coinFace() {
  if (faceCanvas) return faceCanvas;
  faceCanvas = document.createElement('canvas');
  faceCanvas.width = faceCanvas.height = 192;
  const ctx = faceCanvas.getContext('2d');
  ctx.translate(96, 96);
  const gold = ctx.createLinearGradient(-70, -78, 62, 80);
  for (const [at, color] of [[0,'#fff0a8'],[.32,'#e6ab4a'],[.50,'#ffdf80'],[.74,'#c38b35'],[1,'#e8b955']]) gold.addColorStop(at,color);
  function ring(radius, color, thickness) {
    ctx.beginPath(); ctx.arc(0,0,radius,0,2*Math.PI);
    ctx.strokeStyle=color; ctx.lineWidth=thickness; ctx.stroke();
  }
  ctx.fillStyle=gold;
  ctx.beginPath(); ctx.arc(0,0,95,0,2*Math.PI); ctx.fill();
  ring(91,'#fff0b2',5); ring(86,'#a36628',3); ring(74,'#fff0aa',2);
  ctx.save(); ctx.strokeStyle='#ae7931'; ctx.lineWidth=2;
  for (let i=0;i<64;i++) {
    ctx.rotate(Math.PI/32); ctx.beginPath(); ctx.moveTo(79,0); ctx.lineTo(83,0); ctx.stroke();
  }
  ctx.restore();
  ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.font='bold italic 105px Georgia, serif';
  ctx.fillStyle='#9b6225'; ctx.fillText('R',2,6);
  ctx.fillStyle='#ffec9e'; ctx.fillText('R',0,2);
  return faceCanvas;
}

export function makeCoin(parent,x,y,z) {
  if (!geometry) {
    geometry=new CylinderGeometry(.27,.27,.055,32);
    const edge=new MeshStandardMaterial({color:0xbd843b,metalness:.76,roughness:.35});
    const face=new MeshStandardMaterial({color:0xffdf9a,metalness:.63,roughness:.30});
    if (typeof document!=='undefined') {
      face.map=new CanvasTexture(coinFace());
      face.map.colorSpace=SRGBColorSpace;
      face.bumpMap=face.map; face.bumpScale=.009;
    }
    materials=[edge,face,face];
  }
  const coin=new Group();
  coin.name='GoldCoin';
  coin.scale.setScalar(1.22);
  coin.position.set(x,y,z);
  const placeholder=new Mesh(geometry,materials);
  placeholder.rotation.x=Math.PI/2;
  coin.add(placeholder);
  coin.userData.glints=[];
  for(const side of [-1,1]){
    const glint=makePickupGlint();glint.position.set(side*.16,.17,side*.05);
    coin.add(glint);coin.userData.glints.push(glint);
  }
  parent.add(coin);
  preloadCoinModel().then(model => {
    if (!model) return;
    coin.remove(placeholder);
    coin.add(model.clone(true));
    coin.userData.coinModelReady=true;
    coin.userData.source='Mantis Flip Coin';
  });
  return coin;
}

export function spinCoin(mesh,time,index,baseY) {
  mesh.rotation.y=time*COIN_SPIN+index*.64;
  mesh.position.y=baseY+.06*Math.sin(time*3.5+index*.72);
  mesh.userData.glints?.forEach((glint,i)=>glint.scale.setScalar(.015+.15*Math.pow(Math.max(0,Math.sin(time*3+index+i*2)),10)));
}

export function drawLiteCoin(ctx,point,time,index) {
  const angle=time*COIN_SPIN+index*.64;
  const radius=point.k*.27*1.22;
  const width=Math.max(.035,Math.abs(Math.cos(angle)))*radius;
  const edge=radius*.20*Math.sin(angle);
  const y=point.y-point.k*.06*Math.sin(time*3.5+index*.72);
  ctx.fillStyle='#ad7838';
  ctx.beginPath(); ctx.ellipse(point.x+edge*.5,y,width+Math.abs(edge)*.5,radius,0,0,2*Math.PI); ctx.fill();
  ctx.drawImage(coinFace(),point.x-width,y-radius,width*2,radius*2);
}
