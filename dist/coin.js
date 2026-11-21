import {
  BufferGeometry, CanvasTexture, DataTexture, EquirectangularReflectionMapping,
  Float32BufferAttribute, FloatType, Group, LinearSRGBColorSpace, Mesh, MeshStandardMaterial,
  RGBAFormat, SRGBColorSpace, Sprite, SpriteMaterial, AdditiveBlending
} from './vendor/three.module.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';

let faceCanvas, geometry, materials, modelPromise, reflectionMap, pbrMaps;
const COIN_SPIN = 2.4;

// Metals need something to reflect. A shared HDR studio map keeps gold readable
// through the game's day/night cycle without adding lights to every pickup.
export function coinReflections() {
  if (reflectionMap) return reflectionMap;
  const width=128,height=64,pixels=new Float32Array(width*height*4);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const u=x/width,v=y/(height-1),offset=(y*width+x)*4;
    const sky=.42+.38*Math.sin(v*Math.PI);
    const key=4.8*Math.exp(-Math.pow((u-.20)/.07,8)-Math.pow((v-.45)/.32,8));
    const fill=3.2*Math.exp(-Math.pow((u-.72)/.11,8)-Math.pow((v-.48)/.35,8));
    const rim=1.6*Math.exp(-Math.pow((v-.66)/.065,2));
    pixels[offset]=sky*1.1+key+fill*.95+rim;
    pixels[offset+1]=sky*.95+key*.92+fill*.90+rim*.88;
    pixels[offset+2]=sky*.65+key*.72+fill*.75+rim*.58;
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
      const glow=Math.exp(-(dx*dx+dy*dy)*10)*.48;
      const star=Math.exp(-dx*dx*260-dy*dy*7)+Math.exp(-dy*dy*260-dx*dx*7);
      pixels[n]=255;pixels[n+1]=242;pixels[n+2]=178;pixels[n+3]=Math.round(Math.min(1,glow+star*.75)*255);
    }
    const map=new DataTexture(pixels,32,32);map.colorSpace=SRGBColorSpace;map.needsUpdate=true;
    glintMaterial=new SpriteMaterial({map,transparent:true,depthWrite:false,toneMapped:false,blending:AdditiveBlending});
  }
  const glint=new Sprite(glintMaterial);glint.name='pickup-shine';glint.scale.setScalar(.13);return glint;
}

// Sculpted 3D Royal Gold Coin geometry (exact 0.54m diameter upright in XY, 0.086m thickness in Z)
// with beveled outer lip, recessed dish, raised star boss, and reeded edge.
function buildRoyalCoinGeometry() {
  if (geometry) return geometry;
  const segs = 36;
  // Radial profile rings: [radius, halfThicknessZ]
  const rings = [
    [0.000, 0.043], // center star apex
    [0.095, 0.039], // raised central emblem boss
    [0.115, 0.025], // inner dish floor
    [0.198, 0.025], // outer dish floor
    [0.212, 0.043], // inner rim bevel top
    [0.254, 0.043], // outer raised gold rim flat
    [0.270, 0.033]  // outer chamfered edge lip
  ];
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];

  // 1. Front (+Z) and Back (-Z) sculpted coin faces
  for (const dir of [1, -1]) {
    const baseIdx = positions.length / 3;
    // Center vertex
    positions.push(0, 0, dir * rings[0][1]);
    normals.push(0, 0, dir);
    uvs.push(0.5, 0.5);

    for (let r = 1; r < rings.length; r++) {
      const [rad, hz] = rings[r];
      const [prevRad, prevHz] = rings[r - 1];
      const slopeZ = (hz - prevHz) * dir;
      const slopeR = rad - prevRad;
      const nr = -slopeZ;
      const nz = slopeR * dir;
      const nLen = Math.hypot(nr, nz) || 1;
      const nRadial = nr / nLen;
      const nAxial = nz / nLen;

      for (let s = 0; s <= segs; s++) {
        const a = (s / segs) * Math.PI * 2;
        const cs = Math.cos(a), sn = Math.sin(a);
        const x = cs * rad, y = sn * rad;
        positions.push(x, y, dir * hz);
        normals.push(cs * nRadial, sn * nRadial, nAxial);
        uvs.push(0.5 + (x / 0.54) * dir, 0.5 + (y / 0.54));
      }
    }

    // Center fan triangles (ring 0 -> ring 1)
    for (let s = 0; s < segs; s++) {
      const a = baseIdx + 1 + s;
      const b = baseIdx + 1 + s + 1;
      if (dir > 0) indices.push(baseIdx, a, b);
      else indices.push(baseIdx, b, a);
    }

    // Concentric quad strips (ring r-1 -> ring r)
    const stride = segs + 1;
    for (let r = 2; r < rings.length; r++) {
      const r0 = baseIdx + 1 + (r - 2) * stride;
      const r1 = baseIdx + 1 + (r - 1) * stride;
      for (let s = 0; s < segs; s++) {
        const a = r0 + s, b = r0 + s + 1;
        const c = r1 + s, d = r1 + s + 1;
        if (dir > 0) indices.push(a, c, b, b, c, d);
        else indices.push(a, b, c, b, d, c);
      }
    }
  }

  // 2. Reeded / Milled Outer Cylinder Rim (r = 0.270, z = +0.033 .. -0.033)
  const rimBase = positions.length / 3;
  const rimR = 0.270, rimZ = 0.033;
  for (let s = 0; s <= segs; s++) {
    const a = (s / segs) * Math.PI * 2;
    const cs = Math.cos(a), sn = Math.sin(a);
    const x = cs * rimR, y = sn * rimR;
    // Subtle normal fluting for milled coin edge shimmer
    const flute = Math.sin(s * Math.PI) * 0.22;
    const nx = cs - sn * flute, ny = sn + cs * flute;
    const nl = Math.hypot(nx, ny) || 1;
    positions.push(x, y, rimZ, x, y, -rimZ);
    normals.push(nx / nl, ny / nl, 0, nx / nl, ny / nl, 0);
    uvs.push(0.98, 0.5, 0.98, 0.5);
  }
  for (let s = 0; s < segs; s++) {
    const a = rimBase + s * 2, b = a + 1, c = a + 2, d = a + 3;
    indices.push(a, b, c, c, b, d);
  }

  geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  return geometry;
}

// Compute 5-pointed faceted star height at normalized coordinates (dx, dy) in [-1..1]
function starReliefHeight(dx, dy) {
  const r = Math.hypot(dx, dy);
  if (r > 1.0) return 0;
  // Outer rim & bevel
  if (r >= 0.76) {
    const outerBevel = Math.min(1, (0.98 - r) / 0.08);
    const innerStep = Math.min(1, (r - 0.76) / 0.06);
    const denticle = (r > 0.78 && r < 0.92) ? 0.15 * Math.cos(Math.atan2(dy, dx) * 36) : 0;
    return Math.max(0, Math.min(1, outerBevel * innerStep)) * 0.85 + denticle;
  }
  // Inner beaded ring at r ≈ 0.67
  const beadRing = Math.exp(-Math.pow((r - 0.67) / 0.032, 2)) * (0.55 + 0.45 * Math.cos(Math.atan2(dy, dx) * 24));
  // 5-pointed royal star in center (r < 0.56)
  const angle = Math.atan2(dy, dx) + Math.PI / 2;
  const sector = (Math.PI * 2) / 5;
  const localA = ((((angle % sector) + sector) % sector) / sector - 0.5) * 2; // [-1..1] across each star point
  const starBoundary = 0.54 / (1 + 1.15 * Math.abs(localA));
  let starH = 0;
  if (r < starBoundary) {
    // High-relief 3D faceted pyramid ridge along each star ray
    starH = (1 - r / starBoundary) * 0.95;
  }
  return Math.min(1, Math.max(beadRing * 0.65, starH));
}

function buildGoldPbrMaps() {
  if (pbrMaps) return pbrMaps;
  const size = 128;
  const colorPixels = new Uint8Array(size * size * 4);
  const normalPixels = new Uint8Array(size * size * 4);
  const metalPixels = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x / (size - 1)) * 2 - 1;
      const dy = (y / (size - 1)) * 2 - 1;
      const r = Math.hypot(dx, dy);
      const hC = starReliefHeight(dx, dy);
      const hR = starReliefHeight(dx + 2 / size, dy);
      const hU = starReliefHeight(dx, dy + 2 / size);
      const dX = (hC - hR) * 3.2;
      const dY = (hC - hU) * 3.2;
      const nLen = Math.hypot(dX, dY, 1);
      const nx = dX / nLen, ny = dY / nLen, nz = 1 / nLen;

      const idx = (y * size + x) * 4;
      normalPixels[idx] = Math.round((nx * 0.5 + 0.5) * 255);
      normalPixels[idx + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      normalPixels[idx + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      normalPixels[idx + 3] = 255;

      // Directional bevel lighting + metallic gold sheen
      const light = Math.max(-0.45, Math.min(0.65, (nx * -0.72 + ny * 0.68))) + (hC > 0.15 ? 0.18 : -0.08);
      const sheen = 0.14 * Math.cos((dx - dy) * 3.6);
      const v = Math.max(0, Math.min(1, 0.58 + light * 0.55 + sheen + hC * 0.18));
      // Pure 24K Royal Gold color ramp: deep burnished amber-gold -> rich 24K gold -> bright champagne highlight
      const red = Math.round(Math.min(255, 195 + v * 60));
      const grn = Math.round(Math.min(255, 132 + v * 112));
      const blu = Math.round(Math.min(255, 18 + Math.pow(v, 2.2) * 145));
      colorPixels[idx] = red;
      colorPixels[idx + 1] = grn;
      colorPixels[idx + 2] = blu;
      colorPixels[idx + 3] = 255;

      // glTF metallicRoughness encoding: G = roughness, B = metalness
      const isRaised = hC > 0.12 || r >= 0.76;
      metalPixels[idx] = 255;
      metalPixels[idx + 1] = isRaised ? 36 : 64;   // Very low roughness on raised gold star & rim
      metalPixels[idx + 2] = isRaised ? 250 : 232; // High metallic gold across entire coin
      metalPixels[idx + 3] = 255;
    }
  }

  let map;
  if (typeof document !== 'undefined') {
    map = new CanvasTexture(coinFace());
    map.colorSpace = SRGBColorSpace;
  } else {
    map = new DataTexture(colorPixels, size, size, RGBAFormat);
    map.colorSpace = SRGBColorSpace;
    map.needsUpdate = true;
  }
  const normalMap = new DataTexture(normalPixels, size, size, RGBAFormat);
  normalMap.needsUpdate = true;
  const metalnessMap = new DataTexture(metalPixels, size, size, RGBAFormat);
  metalnessMap.needsUpdate = true;

  pbrMaps = { map, normalMap, metalnessMap };
  return pbrMaps;
}

function getSharedCoinMaterial() {
  if (materials) return materials;
  const maps = buildGoldPbrMaps();
  materials = new MeshStandardMaterial({
    color: 0xffe875,
    map: maps.map,
    normalMap: maps.normalMap,
    normalScale: { x: 0.85, y: 0.85 },
    metalnessMap: maps.metalnessMap,
    roughnessMap: maps.metalnessMap,
    metalness: 0.88,
    roughness: 0.22,
    envMap: coinReflections(),
    envMapIntensity: 1.75,
    emissiveMap: maps.map,
    emissive: 0xffc838,
    emissiveIntensity: 0.22
  });
  return materials;
}

// One download/decode per session; upgrades the loaded coin mesh into a gleaming 24K Royal Gold Coin.
export function preloadCoinModel() {
  if (!modelPromise) {
    const royalGeo = buildRoyalCoinGeometry();
    const maps = buildGoldPbrMaps();
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
          // Replace the flat cartoon red/tan geometry & texture with sculpted 24K Royal Gold Coin relief
          object.geometry = royalGeo;
          object.rotation.set(0, 0, 0);
          object.scale.set(1, 1, 1);
          object.position.set(0, 0, 0);
          material.color.setHex(0xffe875);
          material.map = maps.map;
          material.normalMap = maps.normalMap;
          material.metalnessMap = maps.metalnessMap;
          material.roughnessMap = maps.metalnessMap;
          material.envMap=coinReflections();
          material.envMapIntensity=1.75;
          material.metalness=.88;
          material.roughness=.22;
          // Preserve golden lustre on the shadowed face as it spins.
          material.emissiveMap=material.map;
          material.emissive.setHex(0xffc838);
          material.emissiveIntensity=.22;
          material.normalScale.set(.85,.85);
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
  faceCanvas.width = faceCanvas.height = 256;
  const ctx = faceCanvas.getContext('2d');
  if (!ctx) return faceCanvas;
  ctx.translate(128, 128);

  // 1. Outer 24K Gold Beveled Rim
  const rimGrad = ctx.createLinearGradient(-115, -115, 115, 115);
  for (const [at, col] of [[0, '#fff9c4'], [0.22, '#ffd700'], [0.48, '#f59e0b'], [0.72, '#fff199'], [1, '#b45309']]) {
    rimGrad.addColorStop(at, col);
  }
  ctx.fillStyle = rimGrad;
  ctx.beginPath(); ctx.arc(0, 0, 126, 0, Math.PI * 2); ctx.fill();

  // Outer specular highlight & inner rim shadow
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#fffbeb';
  ctx.beginPath(); ctx.arc(0, 0, 121, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#92400e';
  ctx.beginPath(); ctx.arc(0, 0, 99, 0, Math.PI * 2); ctx.stroke();

  // 2. Recessed Brushed Gold Dish
  const dishGrad = ctx.createRadialGradient(-28, -32, 10, 0, 0, 98);
  dishGrad.addColorStop(0, '#ffe875');
  dishGrad.addColorStop(0.55, '#eab308');
  dishGrad.addColorStop(0.88, '#ca8a04');
  dishGrad.addColorStop(1, '#9a5b13');
  ctx.fillStyle = dishGrad;
  ctx.beginPath(); ctx.arc(0, 0, 97, 0, Math.PI * 2); ctx.fill();

  // Diagonal metallic sheen bands across the coin dish
  ctx.save();
  ctx.beginPath(); ctx.arc(0, 0, 96, 0, Math.PI * 2); ctx.clip();
  ctx.rotate(-Math.PI / 5);
  const sheen = ctx.createLinearGradient(0, -96, 0, 96);
  sheen.addColorStop(0, 'rgba(255,251,235,0)');
  sheen.addColorStop(0.38, 'rgba(255,251,235,0.42)');
  sheen.addColorStop(0.50, 'rgba(255,255,255,0.65)');
  sheen.addColorStop(0.62, 'rgba(255,251,235,0.35)');
  sheen.addColorStop(1, 'rgba(255,251,235,0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(-110, -110, 220, 220);
  ctx.restore();

  // 3. Precision Milled Rim Denticles (48 golden teeth around outer border)
  ctx.save();
  ctx.strokeStyle = '#b45309';
  ctx.lineWidth = 3.2;
  for (let i = 0; i < 48; i++) {
    ctx.rotate((Math.PI * 2) / 48);
    ctx.beginPath(); ctx.moveTo(104, 0); ctx.lineTo(116, 0); ctx.stroke();
  }
  ctx.restore();

  // 4. Inner Beaded Gold Pearl Ring (24 raised gold studs)
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#fef08a';
  ctx.beginPath(); ctx.arc(0, 0, 84, 0, Math.PI * 2); ctx.stroke();
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const bx = Math.cos(a) * 84, by = Math.sin(a) * 84;
    ctx.fillStyle = '#92400e';
    ctx.beginPath(); ctx.arc(bx + 1, by + 1, 3.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff9c4';
    ctx.beginPath(); ctx.arc(bx, by, 3.0, 0, Math.PI * 2); ctx.fill();
  }

  // 5. High-Relief 3D Faceted 5-Pointed Royal Gold Star Crest in Center
  const outerR = 68, innerR = 29;
  // Drop shadow under star
  ctx.save();
  ctx.translate(3, 4);
  ctx.fillStyle = 'rgba(113, 63, 18, 0.78)';
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath(); ctx.fill();
  ctx.restore();

  // 10 individually shaded 3D triangular star facets (alternating bright champagne gold & rich warm amber gold)
  for (let i = 0; i < 5; i++) {
    const aTip = -Math.PI / 2 + (i * Math.PI * 2) / 5;
    const aLeft = aTip - Math.PI / 5;
    const aRight = aTip + Math.PI / 5;
    const tx = Math.cos(aTip) * outerR, ty = Math.sin(aTip) * outerR;
    const lx = Math.cos(aLeft) * innerR, ly = Math.sin(aLeft) * innerR;
    const rx = Math.cos(aRight) * innerR, ry = Math.sin(aRight) * innerR;

    // Left facet (sunlit champagne gold)
    ctx.fillStyle = (i === 0 || i === 4) ? '#fffbeb' : '#fde047';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(lx, ly); ctx.lineTo(tx, ty); ctx.closePath(); ctx.fill();

    // Right facet (burnished royal gold)
    ctx.fillStyle = (i === 1 || i === 2) ? '#d97706' : '#f59e0b';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(tx, ty); ctx.lineTo(rx, ry); ctx.closePath(); ctx.fill();
  }

  // Crisp gold specular outline on star + central diamond boss
  ctx.strokeStyle = '#fff9c4';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath(); ctx.stroke();

  ctx.fillStyle = '#fffbeb';
  ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 2;
  ctx.stroke();

  return faceCanvas;
}

export function makeCoin(parent,x,y,z) {
  const royalGeo = buildRoyalCoinGeometry();
  const sharedMat = getSharedCoinMaterial();
  const coin=new Group();
  coin.name='GoldCoin';
  coin.scale.setScalar(1.34);
  coin.position.set(x,y,z);
  const placeholder=new Mesh(royalGeo,sharedMat);
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
