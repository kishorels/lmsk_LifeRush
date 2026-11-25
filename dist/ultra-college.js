// ULTRA-only Photorealistic College Campus Assets (Panel 2 — RUNVERSE COLLEGE):
// 1. Heritage Sandstone/Brick University Halls with warm golden-lit arched ground-floor colonnades, pilasters, cornices & recessed glowing windows
// 2. Ornate Cast-Iron Heritage Lantern Streetlamps + Royal Purple & Gold University Crest Banners
// 3. Live GPU wind-swaying 3D Rain-Emerald Canopy Trees & Cascading Magenta Bougainvillea Flower Vines
// 4. Stylized College Students strolling safely along the outer sidewalks (with umbrellas that automatically pop open when rain begins!)
// Strictly active ONLY when graphicsQuality === 'ultra'; AUTO/LOW/MED/HIGH remain 100% untouched.

import * as T from './vendor/three.module.js';
import { mergeGeometries } from './vendor/BufferGeometryUtils.js';
import { roadsideTree } from './street-materials.js?v=3.10.22';
import { ultraSchoolWindClock } from './ultra-school.js?v=3.10.22';

function makeTex(w, h, paintFn, { repeat = [1, 1], colorSpace = T.SRGBColorSpace } = {}) {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) return null;
  paintFn(ctx, w, h);
  const tex = new T.CanvasTexture(c);
  if (colorSpace) tex.colorSpace = colorSpace;
  tex.wrapS = tex.wrapT = T.RepeatWrapping;
  tex.repeat.set(repeat[0], repeat[1]);
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

let cachedMats = null;
function getUltraCollegeMaterials() {
  if (cachedMats) return cachedMats;

  // 1. Heritage University Aged Brick Masonry
  const brickTex = makeTex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#bfb4a2';
    ctx.fillRect(0, 0, w, h);
    const bw = 32, bh = 16;
    for (let r = 0; r < h / bh; r++) {
      const off = (r % 2) * (bw / 2);
      for (let c = -1; c <= w / bw; c++) {
        const s = ((r * 13 + c * 19) & 7) * 5 - 16;
        ctx.fillStyle = `rgb(${142 + s},${84 + Math.round(s * 0.5)},${64 + Math.round(s * 0.4)})`;
        ctx.fillRect(c * bw + off + 1, r * bh + 1, bw - 2, bh - 2);
      }
    }
  }, { repeat: [3, 3] });

  // 2. Heritage Carved University Limestone / Sandstone Ashlar Blocks
  const stoneTex = makeTex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#c8bfb0';
    ctx.fillRect(0, 0, w, h);
    const bw = 64, bh = 32;
    for (let r = 0; r < h / bh; r++) {
      const off = (r % 2) * 32;
      for (let c = -1; c <= w / bw; c++) {
        const s = ((r * 7 + c * 11) & 7) * 3 - 10;
        ctx.fillStyle = `rgb(${214 + s},${204 + s},${186 + s})`;
        ctx.fillRect(c * bw + off + 1, r * bh + 1, bw - 2, bh - 2);
      }
    }
  }, { repeat: [3, 3] });

  // 3. Recessed Heritage Arched / Multi-Pane University Window Texture
  const winTex = makeTex(128, 160, (ctx, w, h) => {
    ctx.fillStyle = '#243038';
    ctx.fillRect(0, 0, w, h);
    const g = ctx.createLinearGradient(0, 8, w, h - 8);
    g.addColorStop(0, '#445c6c');
    g.addColorStop(0.5, '#2b3e4a');
    g.addColorStop(1, '#1d2b34');
    ctx.fillStyle = g;
    ctx.fillRect(9, 9, w - 18, h - 18);
    ctx.fillStyle = 'rgba(255, 224, 168, 0.22)';
    ctx.beginPath(); ctx.moveTo(12, 12); ctx.lineTo(w * 0.72, 12); ctx.lineTo(w * 0.22, h - 12); ctx.lineTo(12, h - 12); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#26343c';
    ctx.fillRect(w * 0.5 - 3, 8, 6, h - 16);
    ctx.fillRect(8, h * 0.38, w - 16, 5);
    ctx.fillRect(8, h * 0.68, w - 16, 5);
  }, { repeat: [1, 1] });

  // 4. Royal Purple & Gold University Crest Lamp Banner (Panel 2 right-side signature detail!)
  const bannerTex = makeTex(128, 256, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#3b154d');
    g.addColorStop(0.5, '#581c6b');
    g.addColorStop(1, '#2d0f3c');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, w - 16, h - 16);
    // Golden university shield crest
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.moveTo(w * 0.5, 58);
    ctx.lineTo(w * 0.78, 74);
    ctx.lineTo(w * 0.74, 134);
    ctx.quadraticCurveTo(w * 0.5, 166, w * 0.26, 134);
    ctx.lineTo(w * 0.22, 74);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#3b154d';
    ctx.font = '900 22px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('LMSK', w * 0.5, 118);
    ctx.fillStyle = '#fef08a';
    ctx.font = '800 18px system-ui, sans-serif';
    ctx.fillText('COLLEGE', w * 0.5, 206);
  }, { repeat: [1, 1] });

  // 5. Lush Cascading Magenta Bougainvillea Vine Texture (Panel 2 left-side heritage wall floral detail!)
  const vineTex = makeTex(256, 256, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    let s = 54321;
    const rand = () => { s = (Math.imul(s, 1664525) + 1013904223) | 0; return (s >>> 0) / 4294967296; };
    for (let i = 0; i < 220; i++) {
      const x = 18 + rand() * (w - 36);
      const y = 16 + rand() * (h - 32);
      const d = Math.hypot((x - w * 0.5) / (w * 0.45), (y - h * 0.48) / (h * 0.45));
      if (d > 0.98) continue;
      ctx.fillStyle = i % 3 === 0 ? '#1f4d24' : '#2d682d';
      ctx.beginPath(); ctx.ellipse(x, y, 8 + rand() * 7, 13 + rand() * 8, rand() * Math.PI, 0, Math.PI * 2); ctx.fill();
    }
    for (let i = 0; i < 340; i++) {
      const x = 18 + rand() * (w - 36);
      const y = 16 + rand() * (h - 32);
      const d = Math.hypot((x - w * 0.5) / (w * 0.45), (y - h * 0.48) / (h * 0.45));
      if (d > 0.96) continue;
      const lit = (1 - y / h) * 0.45 + rand() * 0.55;
      ctx.fillStyle = `rgb(${Math.round(168 + lit * 78)},${Math.round(22 + lit * 68)},${Math.round(118 + lit * 78)})`;
      ctx.beginPath(); ctx.ellipse(x, y, 7 + rand() * 7, 10 + rand() * 7, rand() * Math.PI, 0, Math.PI * 2); ctx.fill();
    }
  }, { repeat: [1, 1] });
  if (vineTex) vineTex.wrapS = vineTex.wrapT = T.ClampToEdgeWrapping;

  const glassMat = new T.MeshStandardMaterial({
    color: 0xffffff, map: winTex, roughness: 0.22, metalness: 0.30,
    emissive: 0xffb656, emissiveIntensity: 0.10
  });
  const arcadeGlassMat = new T.MeshStandardMaterial({
    color: 0xffdf9e, roughness: 0.26, metalness: 0.15,
    emissive: 0xffaa44, emissiveIntensity: 0.22
  });
  const lanternGlowMat = new T.MeshStandardMaterial({
    color: 0xfff0c4, emissive: 0xffbd59, emissiveIntensity: 0.45, roughness: 0.18
  });

  cachedMats = {
    brick: new T.MeshStandardMaterial({ color: 0xffffff, map: brickTex, roughness: 0.88 }),
    stone: new T.MeshStandardMaterial({ color: 0xffffff, map: stoneTex, roughness: 0.86 }),
    cream: new T.MeshStandardMaterial({ color: 0xe9dfd0, map: stoneTex, roughness: 0.86 }),
    slate: new T.MeshStandardMaterial({ color: 0x2c3b46, roughness: 0.72 }),
    ironDark: new T.MeshStandardMaterial({ color: 0x1a262f, roughness: 0.40, metalness: 0.65 }),
    timber: new T.MeshStandardMaterial({ color: 0x5c3d28, roughness: 0.80 }),
    stoneWalk: new T.MeshStandardMaterial({ color: 0xc2c6be, roughness: 0.84 }),
    concrete: new T.MeshStandardMaterial({ color: 0x8f9897, roughness: 0.90 }),
    glass: glassMat,
    arcadeGlass: arcadeGlassMat,
    lanternGlow: lanternGlowMat,
    banner: new T.MeshStandardMaterial({ color: 0xffffff, map: bannerTex, side: T.DoubleSide, roughness: 0.68 }),
    vine: new T.MeshStandardMaterial({ color: 0xffffff, map: vineTex, alphaTest: 0.36, side: T.DoubleSide, roughness: 0.80 }),
    // Stylized college student outfits & rain umbrellas
    jacketNavy: new T.MeshStandardMaterial({ color: 0x1e3a5f, roughness: 0.78 }),
    jacketBurgundy: new T.MeshStandardMaterial({ color: 0x6b2137, roughness: 0.78 }),
    jacketOlive: new T.MeshStandardMaterial({ color: 0x364d3b, roughness: 0.78 }),
    jeans: new T.MeshStandardMaterial({ color: 0x243447, roughness: 0.86 }),
    skin: new T.MeshStandardMaterial({ color: 0xc98f6b, roughness: 0.76 }),
    hair: new T.MeshStandardMaterial({ color: 0x1a181c, roughness: 0.88 }),
    umbrella: new T.MeshStandardMaterial({ color: 0x1c2838, roughness: 0.38, metalness: 0.15, side: T.DoubleSide }),
    umbrellaAccent: new T.MeshStandardMaterial({ color: 0x3b2248, roughness: 0.38, metalness: 0.15, side: T.DoubleSide })
  };
  return cachedMats;
}

const unitBox = new T.BoxGeometry(1, 1, 1);
const unitCyl = new T.CylinderGeometry(1, 1, 1, 10);
const unitSphere = new T.SphereGeometry(1, 10, 7);
const umbrellaGeo = new T.SphereGeometry(0.68, 12, 7, 0, Math.PI * 2, 0, Math.PI * 0.44);
const vinePlaneGeo = new T.PlaneGeometry(1, 1, 2, 2);

function part(parent, mat, x, y, z, w, h, d, geo = unitBox) {
  const m = new T.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.scale.set(w, h, d);
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

const labelCache = new Map();
function addCollegeSign(parent, text, x, y, z) {
  const M = getUltraCollegeMaterials();
  part(parent, M.ironDark, x, y, z, 0.10, 0.76, 4.10);
  if (typeof document === 'undefined') return;
  if (!labelCache.has(text)) {
    const c = document.createElement('canvas'); c.width = 512; c.height = 96;
    const ctx = c.getContext('2d');
    if (ctx) {
      const g = ctx.createLinearGradient(0, 0, 512, 96);
      g.addColorStop(0, '#132436'); g.addColorStop(0.5, '#1f3b52'); g.addColorStop(1, '#102030');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 512, 96);
      ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 5; ctx.strokeRect(6, 6, 500, 84);
      ctx.fillStyle = '#fff5dc'; ctx.textAlign = 'center'; ctx.font = '900 34px Georgia, serif';
      ctx.fillText(text, 256, 60, 460);
      const tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace;
      labelCache.set(text, new T.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.20, roughness: 0.38 }));
    }
  }
  const mat = labelCache.get(text);
  if (mat) part(parent, mat, x + (x > 0 ? -0.055 : 0.055), y, z, 0.03, 0.66, 3.96);
}

// Ornate Cast-Iron Heritage Lantern Streetlamp + Royal Purple & Gold University Crest Banner (Panel 2 right/left!)
function addOrnateLanternPole(parent, side, z, withBanner = true) {
  const M = getUltraCollegeMaterials();
  const x = side * 5.24;
  // Fluted cast-iron base plinth + tapered pole + decorative collar rings
  part(parent, M.ironDark, x, 0.42, z, 0.28, 0.84, 0.28, unitCyl);
  part(parent, M.ironDark, x, 2.95, z, 0.13, 5.1, 0.13, unitCyl);
  part(parent, M.ironDark, x, 0.90, z, 0.24, 0.14, 0.24, unitCyl);
  part(parent, M.ironDark, x, 5.38, z, 0.22, 0.12, 0.22, unitCyl);
  // Curved scrolled cross-arm reaching over the curb to x = side * 4.64 (matches ultra-effects.js halos/cones!)
  const headX = side * 4.64;
  part(parent, M.ironDark, (x + headX) * 0.5, 5.62, z, 0.72, 0.10, 0.10);
  part(parent, M.ironDark, headX, 5.74, z, 0.46, 0.16, 0.46); // lantern cap
  part(parent, M.lanternGlow, headX, 5.44, z, 0.34, 0.44, 0.34); // warm glowing heritage lantern glass!
  part(parent, M.ironDark, headX, 5.18, z, 0.38, 0.08, 0.38); // lantern base finial

  // Hanging Royal Purple & Gold University Crest Banner (Panel 2 signature!)
  if (withBanner) {
    const bx = x - side * 0.50;
    part(parent, M.ironDark, x - side * 0.46, 4.35, z, 0.88, 0.05, 0.05);
    part(parent, M.ironDark, x - side * 0.46, 3.05, z, 0.88, 0.05, 0.05);
    part(parent, M.banner, bx, 3.70, z, 0.72, 1.24, 0.025);
  }
}

// Detailed Heritage Stone/Brick University Hall with Warm Glowing Arched Ground Colonnades & Cascading Bougainvillea Vines
function addHeritageHall(parent, side, kind) {
  const M = getUltraCollegeMaterials();
  const heights = [10.4, 12.2, 9.8, 7.2, 11.4, 9.0];
  const depths = [23, 21, 25, 19, 23, 20];
  const h = heights[kind], depth = depths[kind], setback = kind === 3 ? 2.4 : kind === 5 ? 1.6 : 0;
  const center = side * (10.4 + setback), width = 8.4, face = center - side * (width * 0.5 + 0.04), z = -1.6;
  const wallMat = [M.brick, M.stone, M.cream, M.brick, M.stone, M.cream][kind];

  // Main masonry volume, heavy stone plinth & pitched cornice roof crown
  part(parent, wallMat, center, h * 0.5, z, width, h, depth);
  part(parent, M.stone, center, 0.52, z, width + 0.55, 1.04, depth + 0.45);
  part(parent, M.stone, center, h + 0.20, z, width + 0.65, 0.42, depth + 0.65);
  part(parent, M.slate, center, h + 0.65, z, width + 0.35, 0.55, depth + 0.35);

  // Ground-floor warm golden-lit arched heritage colonnade arcade!
  const archCount = Math.max(4, Math.floor((depth - 3) / 3.4));
  for (let i = 0; i < archCount; i++) {
    const az = z - depth * 0.5 + 2.4 + i * ((depth - 4.8) / Math.max(1, archCount - 1));
    // Stone pilasters framing each bay
    part(parent, M.cream, face - side * 0.22, 1.85, az - 1.35, 0.42, 3.65, 0.42);
    // Warm glowing recessed arched colonnade interior window/door
    part(parent, M.ironDark, face - side * 0.06, 1.75, az, 0.10, 2.85, 2.10);
    part(parent, M.arcadeGlass, face - side * 0.11, 1.72, az, 0.06, 2.55, 1.84);
    // Decorative stone arch lintel cornice above ground floor
    part(parent, M.cream, face - side * 0.26, 3.45, az, 0.56, 0.26, 2.65);
  }
  // Continuous classical stone belt cornice separating ground arcade from upper stories
  part(parent, M.cream, face - side * 0.18, 3.72, z, 0.42, 0.24, depth + 0.30);

  // Upper floor recessed multi-pane heritage windows with stone surrounds & sills
  const upperLevels = Math.max(1, Math.floor((h - 4.2) / 2.45));
  for (let lv = 0; lv < upperLevels; lv++) {
    const wy = 4.95 + lv * 2.45;
    for (let wz = z - depth * 0.5 + 2.0; wz < z + depth * 0.5 - 1.4; wz += 2.75) {
      part(parent, M.cream, face - side * 0.06, wy, wz, 0.14, 1.68, 1.98);
      part(parent, M.glass, face - side * 0.13, wy, wz, 0.05, 1.46, 1.72);
      part(parent, M.stone, face - side * 0.18, wy - 0.86, wz, 0.30, 0.14, 2.15);
      part(parent, M.stone, face - side * 0.16, wy + 0.88, wz, 0.24, 0.14, 2.10);
    }
    part(parent, M.cream, face - side * 0.14, wy - 1.12, z, 0.26, 0.14, depth + 0.22);
  }

  // Grand framed hall signage
  const names = ['SCIENCE HALL', 'INNOVATION WING', 'CENTRAL LIBRARY', 'STUDENT UNION', 'ENGINEERING', 'ADMINISTRATION'];
  addCollegeSign(parent, names[kind], face - side * 0.28, 3.85, z + depth * 0.28);
}

// Stylized College Student strolling safely along the outer sidewalk (umbrella opens automatically in rain!)
function addSidewalkStudent(staticGroup, umbrellaGroup, side, z, variant = 0) {
  const M = getUltraCollegeMaterials();
  const sx = side * (5.92 + (variant % 2) * 0.34);
  const jacket = [M.jacketNavy, M.jacketBurgundy, M.jacketOlive][variant % 3];
  const facingZ = variant % 2 === 0 ? -1 : 1;
  // Legs, torso, backpack, head & hair (grounded on sidewalk y = 0.18)
  part(staticGroup, M.jeans, sx - 0.10, 0.56, z, 0.14, 0.74, 0.16);
  part(staticGroup, M.jeans, sx + 0.10, 0.56, z, 0.14, 0.74, 0.16);
  part(staticGroup, jacket, sx, 1.18, z, 0.42, 0.58, 0.24);
  part(staticGroup, M.ironDark, sx, 1.20, z - facingZ * 0.16, 0.30, 0.40, 0.14); // backpack
  part(staticGroup, M.skin, sx, 1.62, z, 0.22, 0.24, 0.22, unitSphere);
  part(staticGroup, M.hair, sx, 1.68, z - facingZ * 0.02, 0.24, 0.16, 0.24, unitSphere);

  // Rain Umbrella (added to separate `umbrellaGroup` so it smoothly pops open ONLY when rain starts!)
  const uMat = variant % 2 === 0 ? M.umbrella : M.umbrellaAccent;
  const shaft = new T.Mesh(unitCyl, M.ironDark);
  shaft.position.set(sx - side * 0.14, 1.66, z + facingZ * 0.08);
  shaft.scale.set(0.022, 0.92, 0.022);
  umbrellaGroup.add(shaft);
  const canopy = new T.Mesh(umbrellaGeo, uMat);
  canopy.position.set(sx - side * 0.14, 1.98, z + facingZ * 0.08);
  umbrellaGroup.add(canopy);
}

function bakeGroupByMaterial(root) {
  root.updateMatrixWorld(true);
  const buckets = new Map();
  root.traverse(obj => {
    if (!obj.isMesh || !obj.geometry) return;
    let g = obj.geometry.index ? obj.geometry.toNonIndexed() : obj.geometry.clone();
    if (!g.attributes.uv) g.setAttribute('uv', new T.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    if (!g.attributes.normal) g.computeVertexNormals();
    for (const k of Object.keys(g.attributes)) {
      if (k !== 'position' && k !== 'normal' && k !== 'uv') g.deleteAttribute(k);
    }
    g.applyMatrix4(obj.matrixWorld);
    if (!buckets.has(obj.material)) buckets.set(obj.material, []);
    buckets.get(obj.material).push(g);
  });
  const merged = new T.Group();
  for (const [mat, list] of buckets) {
    const mg = mergeGeometries(list, false);
    if (mg) {
      const m = new T.Mesh(mg, mat);
      m.receiveShadow = true;
      m.castShadow = false;
      merged.add(m);
    }
    for (const g of list) g.dispose();
  }
  return merged;
}

// Build one complete ULTRA College 32m campus slot (with live-wind 3D trees, heritage arched halls, ornate lantern poles + banners & umbrella students!)
export function buildUltraCollegeTemplate(kind) {
  const M = getUltraCollegeMaterials();
  const staticRaw = new T.Group();
  const umbrellaRaw = new T.Group();

  addHeritageHall(staticRaw, -1, kind);
  addHeritageHall(staticRaw, 1, (kind + 3) % 6);

  for (const side of [-1, 1]) {
    // Ground apron & stone sidewalk border
    part(staticRaw, M.concrete, side * 14.0, -3.75, 0, 19.0, 7.6, 32.4);
    part(staticRaw, M.stoneWalk, side * 4.43, 0.10, 0, 1.65, 0.17, 32);
    part(staticRaw, M.stone, side * 5.36, 0.21, 0, 0.18, 0.34, 32);

    // 3 Ornate Heritage Cast-Iron Lantern Poles per side (at z = -12, 0, +12 — exact match to ultra-effects.js halos/cones!)
    for (const z of [-12, 0, 12]) {
      addOrnateLanternPole(staticRaw, side, z, z === 0 || (side === 1 && z === 12));
    }

    // Keep classic College roadside neem trees (with gentle ULTRA wind sway from street-materials.js); new 3D botanical trees stay exclusive to School!
    for (const z of [-10, 7]) {
      if ((kind + Math.round(z)) % 3 !== 0) {
        const h = 4.9 + (Math.abs(kind + Math.round(z)) % 3) * 0.3;
        roadsideTree(staticRaw, side * 6.1, z, h, false, 0);
        roadsideTree(staticRaw, side * 6.1, z, h, false, Math.PI / 2);
      }
    }

    // Sidewalk benches & students (umbrellas pop open automatically when rain starts!)
    if (kind !== 3 && kind !== 5) {
      const bx = side * 6.35;
      part(staticRaw, M.timber, bx, 0.68, 4.5, 0.82, 0.12, 1.72);
      part(staticRaw, M.timber, bx + side * 0.33, 1.01, 4.5, 0.12, 0.67, 1.72);
    }
    addSidewalkStudent(staticRaw, umbrellaRaw, side, side === -1 ? -4.5 : 1.5, kind + (side > 0 ? 1 : 0));
    if (kind % 2 === 0) {
      addSidewalkStudent(staticRaw, umbrellaRaw, side, side === -1 ? 9.5 : -9.0, kind + 2);
    }
  }

  const root = new T.Group();
  root.add(bakeGroupByMaterial(staticRaw));
  const bakedUmbrellas = bakeGroupByMaterial(umbrellaRaw);
  bakedUmbrellas.name = 'college-rain-umbrellas';
  bakedUmbrellas.visible = false;
  root.add(bakedUmbrellas);
  return root;
}

// Update ULTRA College dynamic weather materials (warm golden windows & lanterns intensify naturally as overcast/rain rolls in; wind ticks gently!)
export function updateUltraCollegeWeather(weather, time = 0) {
  ultraSchoolWindClock.value = time || 0;
  const M = getUltraCollegeMaterials();
  const rainAmt = Math.max(0, Math.min(1, weather?.rain || 0));
  const wetAmt = Math.max(0, Math.min(1, weather?.wet || 0));
  const duskMix = Math.max(rainAmt, wetAmt * 0.85);
  M.lanternGlow.emissiveIntensity = 0.25 + duskMix * 2.45;
  M.glass.emissiveIntensity = 0.08 + duskMix * 0.82;
  M.arcadeGlass.emissiveIntensity = 0.20 + duskMix * 1.15;
  return rainAmt > 0.08;
}
