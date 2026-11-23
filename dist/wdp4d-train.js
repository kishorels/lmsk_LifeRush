import {
  BoxGeometry, CanvasTexture, ConeGeometry, CylinderGeometry, DoubleSide,
  Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, PlaneGeometry,
  SRGBColorSpace, TorusGeometry
} from './vendor/three.module.js';
import { bakeGroup } from './bake-static-meshes.js';
import { makeCoin } from './coin.js';

// Authentic Indian Railways WDP4D Diesel Locomotive (No. 45420)
// Matches the exact dual-cab white/cobalt-blue/golden-yellow livery, "INDIAN RAILWAYS" long hood,
// twin windshields with protective stone-guard grilles, twin center headlights, chrome air-horns,
// heavy steel buffer beams + circular buffers + cowcatcher, Co-Co 3-axle bogies, and underslung fuel tank.

const boxGeo = new BoxGeometry(1, 1, 1);
const cyl12 = new CylinderGeometry(0.5, 0.5, 1, 12);
const cyl16 = new CylinderGeometry(0.5, 0.5, 1, 16);
const cone10 = new ConeGeometry(0.5, 1, 10);
const planeGeo = new PlaneGeometry(1, 1);
const coilGeo = new TorusGeometry(0.065, 0.018, 6, 12);

const matCache = new Map();
function getMat(key, opts) {
  if (!matCache.has(key)) matCache.set(key, new MeshStandardMaterial(opts));
  return matCache.get(key);
}

function makeCanvasTex(key, w, h, drawFn) {
  if (typeof document === 'undefined') return null;
  const cacheKey = 'tex:' + key;
  if (matCache.has(cacheKey)) return matCache.get(cacheKey);
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d');
  if (!ctx) return null;
  drawFn(ctx, w, h);
  const tex = new CanvasTexture(cv);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 4;
  matCache.set(cacheKey, tex);
  return tex;
}

function drawWeathering(ctx, w, h, seed = 1) {
  ctx.save();
  for (let i = 0; i < 42; i++) {
    const x = ((i * 73 + seed * 31) % 997) / 997 * w;
    const y = ((i * 47 + seed * 19) % 883) / 883 * h;
    const rw = 10 + (i % 6) * 9;
    const rh = 3 + (i % 4) * 4;
    ctx.fillStyle = i % 3 === 0 ? 'rgba(60, 56, 52, 0.07)' : 'rgba(255, 255, 255, 0.05)';
    ctx.fillRect(x, y, rw, rh);
  }
  ctx.restore();
}

function drawIndianFlag(ctx, cx, cy, fw, fh) {
  const sh = fh / 3;
  ctx.fillStyle = '#f97316';
  ctx.fillRect(cx - fw / 2, cy - fh / 2, fw, sh);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(cx - fw / 2, cy - fh / 2 + sh, fw, sh);
  ctx.fillStyle = '#15803d';
  ctx.fillRect(cx - fw / 2, cy - fh / 2 + sh * 2, fw, sh);
  ctx.strokeStyle = '#1e3a8a';
  ctx.lineWidth = Math.max(1.5, sh * 0.16);
  ctx.beginPath();
  ctx.arc(cx, cy, sh * 0.36, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(25,35,45,0.45)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(cx - fw / 2, cy - fh / 2, fw, fh);
}

// 1. Front Nose Fascia Texture: White -> Saffron-Yellow Belt -> White ("WDP4 D" | Flag | "45420") -> Cobalt Blue Skirt
function frontNoseMat() {
  const key = 'wdp4dFrontNose';
  if (matCache.has(key)) return matCache.get(key);
  const tex = makeCanvasTex(key, 256, 128, (ctx, w, h) => {
    // Upper off-white nose below windshields
    ctx.fillStyle = '#e5e9ee';
    ctx.fillRect(0, 0, w, h * 0.20);
    // Bold golden-saffron belt stripe
    const yg = ctx.createLinearGradient(0, h * 0.20, 0, h * 0.44);
    yg.addColorStop(0, '#f5b324');
    yg.addColorStop(1, '#e69412');
    ctx.fillStyle = yg;
    ctx.fillRect(0, h * 0.20, w, h * 0.24);
    // White lower number band
    ctx.fillStyle = '#e8ecf1';
    ctx.fillRect(0, h * 0.44, w, h * 0.30);
    // Streamlined Metro Red lower chin (Panel 3 reference livery)
    const bg = ctx.createLinearGradient(0, h * 0.74, 0, h);
    bg.addColorStop(0, '#dc2626');
    bg.addColorStop(1, '#991b1b');
    ctx.fillStyle = bg;
    ctx.fillRect(0, h * 0.74, w, h * 0.26);

    ctx.strokeStyle = 'rgba(30, 41, 59, 0.26)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.20); ctx.lineTo(w, h * 0.20);
    ctx.moveTo(0, h * 0.44); ctx.lineTo(w, h * 0.44);
    ctx.moveTo(0, h * 0.74); ctx.lineTo(w, h * 0.74);
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#1e293b';
    ctx.font = '900 17px system-ui, Arial, sans-serif';
    ctx.fillText('WDP4 D', w * 0.21, h * 0.59);
    drawIndianFlag(ctx, w * 0.50, h * 0.59, 32, 21);
    ctx.fillStyle = '#b91c1c';
    ctx.font = '900 19px system-ui, Arial, sans-serif';
    ctx.fillText('45420', w * 0.79, h * 0.59);

    drawWeathering(ctx, w, h, 3);
  });
  const m = new MeshStandardMaterial({
    color: tex ? 0xffffff : 0xe5e9ee,
    map: tex,
    roughness: 0.44,
    metalness: 0.18
  });
  matCache.set(key, m);
  return m;
}

// 2. Windshield Texture with Authentic Protective Vertical Stone-Guard Metal Grille Bars + Wiper
function windshieldGrilleMat() {
  const key = 'wdp4dGlassGrille';
  if (matCache.has(key)) return matCache.get(key);
  const tex = makeCanvasTex(key, 256, 192, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#1e3240');
    g.addColorStop(0.45, '#2b4454');
    g.addColorStop(1, '#14222c');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // Faint cab interior console silhouette
    ctx.fillStyle = 'rgba(180, 196, 206, 0.16)';
    ctx.fillRect(14, h * 0.58, w - 28, h * 0.34);
    // Crisp specular glass reflection diagonal
    ctx.fillStyle = 'rgba(215, 238, 252, 0.16)';
    ctx.beginPath();
    ctx.moveTo(w * 0.12, 0); ctx.lineTo(w * 0.36, 0);
    ctx.lineTo(w * 0.14, h); ctx.lineTo(0, h);
    ctx.closePath(); ctx.fill();
    // Protective vertical metal stone-guard bars (iconic Indian Railways loco look!)
    ctx.strokeStyle = 'rgba(220, 228, 236, 0.78)';
    ctx.lineWidth = 3.2;
    for (let x = 14; x < w - 10; x += 15) {
      ctx.beginPath();
      ctx.moveTo(x, 6);
      ctx.lineTo(x, h - 6);
      ctx.stroke();
    }
    // Horizontal cross-support rod behind grille
    ctx.strokeStyle = 'rgba(200, 210, 220, 0.65)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(8, h * 0.52); ctx.lineTo(w - 8, h * 0.52);
    ctx.stroke();
    // Black outer rubber gasket border + wiper blade
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 12;
    ctx.strokeRect(4, 4, w - 8, h - 8);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(w * 0.48, h - 10);
    ctx.lineTo(w * 0.72, h * 0.24);
    ctx.stroke();
  });
  const m = new MeshStandardMaterial({
    color: tex ? 0xffffff : 0x203545,
    map: tex,
    roughness: 0.14,
    metalness: 0.64
  });
  matCache.set(key, m);
  return m;
}

// 3. Cab Side Flank Texture: White upper cab, Yellow stripe, "45420 / WDP4 D / CAB-1", Blue lower skirt + side louver
// Matches vertical world heights Y(2.56)..Y(0.80): yellow belt at v=0.608..0.722, white band at v=0.722..0.864, blue skirt at v=0.864..1.00
function cabSideMat(cabLabel, flipped) {
  const key = `wdp4dCabSide_${cabLabel}_${flipped ? 'L' : 'R'}`;
  if (matCache.has(key)) return matCache.get(key);
  const tex = makeCanvasTex(key, 256, 128, (ctx, w, h) => {
    ctx.fillStyle = '#e5e9ee';
    ctx.fillRect(0, 0, w, h * 0.864);
    ctx.fillStyle = '#f2a61e';
    if (flipped) {
      ctx.fillRect(w * 0.56, h * 0.608, w * 0.44, h * 0.114);
    } else {
      ctx.fillRect(0, h * 0.608, w * 0.44, h * 0.114);
    }
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(0, h * 0.864, w, h * 0.136);

    const vx = flipped ? w * 0.74 : w * 0.08;
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(vx, h * 0.63, w * 0.18, h * 0.21);
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(vx, h * 0.63, w * 0.18, h * 0.21);
    for (let ly = h * 0.66; ly < h * 0.82; ly += 4) {
      ctx.beginPath(); ctx.moveTo(vx + 2, ly); ctx.lineTo(vx + w * 0.18 - 2, ly); ctx.stroke();
    }

    const tx = flipped ? w * 0.40 : w * 0.60;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#c62828';
    ctx.font = '900 22px system-ui, Arial, sans-serif';
    ctx.fillText('45420', tx, h * 0.60);
    ctx.fillStyle = '#1e293b';
    ctx.font = '800 13px system-ui, Arial, sans-serif';
    ctx.fillText('WDP4 D', tx, h * 0.75);

    ctx.fillStyle = '#f8fafc';
    ctx.font = '800 9px system-ui, Arial, sans-serif';
    ctx.fillText(cabLabel, flipped ? w * 0.18 : w * 0.82, h * 0.93);

    const dx = flipped ? w * 0.14 : w * 0.86;
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(dx, 7); ctx.lineTo(dx, h - 4); ctx.stroke();

    drawWeathering(ctx, w, h, flipped ? 7 : 5);
  });
  const m = new MeshStandardMaterial({
    color: tex ? 0xffffff : 0xe5e9ee,
    map: tex,
    roughness: 0.42,
    metalness: 0.20
  });
  matCache.set(key, m);
  return m;
}

function longHoodSideMat() {
  const key = 'wdp4dLongHoodSide';
  if (matCache.has(key)) return matCache.get(key);
  const tex = makeCanvasTex(key, 512, 128, (ctx, w, h) => {
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#dc2626');
    bg.addColorStop(0.5, '#b91c1c');
    bg.addColorStop(1, '#991b1b');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#eef2f6';
    ctx.fillRect(0, h * 0.46, w, h * 0.15);
    const yg = ctx.createLinearGradient(0, h * 0.61, 0, h * 0.74);
    yg.addColorStop(0, '#f5b324');
    yg.addColorStop(1, '#e09110');
    ctx.fillStyle = yg;
    ctx.fillRect(0, h * 0.61, w, h * 0.13);

    ctx.strokeStyle = 'rgba(10, 22, 48, 0.55)';
    ctx.lineWidth = 2;
    const doorCount = 12;
    const dw = w / doorCount;
    for (let i = 0; i < doorCount; i++) {
      const x0 = i * dw;
      ctx.strokeRect(x0 + 1, 3, dw - 2, h - 6);
      ctx.fillStyle = 'rgba(12, 24, 46, 0.55)';
      ctx.fillRect(x0 + dw * 0.24, h * 0.12, dw * 0.22, h * 0.14);
      ctx.fillRect(x0 + dw * 0.56, h * 0.12, dw * 0.22, h * 0.14);
    }

    for (const [gx, gw] of [[w * 0.10, w * 0.08], [w * 0.78, w * 0.15]]) {
      ctx.fillStyle = '#334155';
      ctx.fillRect(gx, h * 0.24, gw, h * 0.58);
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      ctx.strokeRect(gx, h * 0.24, gw, h * 0.58);
      ctx.strokeStyle = 'rgba(203, 213, 225, 0.45)';
      ctx.lineWidth = 1.5;
      for (let ly = h * 0.28; ly < h * 0.80; ly += 4) {
        ctx.beginPath(); ctx.moveTo(gx + 2, ly); ctx.lineTo(gx + gw - 2, ly); ctx.stroke();
      }
    }

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 29px system-ui, Arial, sans-serif';
    ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
    ctx.fillText('INDIAN RAILWAYS', w * 0.49 + 1, h * 0.57 + 1, w * 0.54);
    ctx.fillStyle = '#b91c1c';
    ctx.fillText('INDIAN RAILWAYS', w * 0.49, h * 0.57, w * 0.54);
    ctx.restore();

    drawWeathering(ctx, w, h, 11);
  });
  const m = new MeshStandardMaterial({
    color: tex ? 0xffffff : 0xdc2626,
    map: tex,
    roughness: 0.40,
    metalness: 0.24
  });
  matCache.set(key, m);
  return m;
}

function normalizeGeo(rawGeo, matrixWorld) {
  const geo = (rawGeo.index ? rawGeo.toNonIndexed() : rawGeo.clone());
  geo.applyMatrix4(matrixWorld);
  for (const key of Object.keys(geo.attributes)) {
    if (key !== 'position' && key !== 'normal' && key !== 'uv') {
      geo.deleteAttribute(key);
    }
  }
  if (!geo.attributes.normal) geo.computeVertexNormals();
  return geo;
}

function bakeStatic(root) {
  const merged = bakeGroup(root);
  for (const m of merged.children) {
    m.castShadow = true;
    m.receiveShadow = true;
  }
  return merged;
}

const unitCache = new Map();

function buildWDP4DUnitTemplate(unitLen, h) {
  const cacheKey = `${unitLen.toFixed(1)}:${h.toFixed(2)}`;
  if (unitCache.has(cacheKey)) return unitCache.get(cacheKey);

  const cabWhite = getMat('wdpCabW', { color: 0xe6eaef, roughness: 0.42, metalness: 0.16 });
  const cabRoofGray = getMat('wdpRoofG', { color: 0xcbd2da, roughness: 0.52, metalness: 0.18 });
  const irBlue = getMat('wdpIrBlue', { color: 0xdc2626, roughness: 0.36, metalness: 0.24 });
  const irBlueDark = getMat('wdpIrBlueD', { color: 0x991b1b, roughness: 0.45, metalness: 0.28 });
  const irYellow = getMat('wdpIrYel', { color: 0xf2a61e, roughness: 0.36, metalness: 0.14 });
  const chassisDark = getMat('wdpChas', { color: 0x2b3138, roughness: 0.62, metalness: 0.46 });
  const ironDark = getMat('wdpIron', { color: 0x1f242a, roughness: 0.55, metalness: 0.58 });
  const grilleDark = getMat('wdpGrille', { color: 0x171d24, roughness: 0.72, metalness: 0.42 });
  const steelWheel = getMat('wdpWheel', { color: 0x4b5563, roughness: 0.38, metalness: 0.72 });
  const chromeMat = getMat('wdpChrome', { color: 0xdbe5ef, roughness: 0.16, metalness: 0.88 });
  const cabGlass = getMat('wdpGlass', { color: 0x1a2e3c, roughness: 0.08, metalness: 0.72 });
  const headlightMat = getMat('wdpHeadL', { color: 0xfffce0, emissive: 0xfff0a0, emissiveIntensity: 1.9, roughness: 0.08 });
  const markerAmber = getMat('wdpMarkA', { color: 0xffa01e, emissive: 0xff7b00, emissiveIntensity: 1.15, roughness: 0.15 });
  const markerRed = getMat('wdpMarkR', { color: 0xef4444, emissive: 0xdc2626, emissiveIntensity: 1.1, roughness: 0.15 });
  const glowHaloMat = new MeshBasicMaterial({ color: 0xfff6c2, transparent: true, opacity: 0.26, depthWrite: false, side: DoubleSide });

  const fNoseMat = frontNoseMat();
  const wGrilleMat = windshieldGrilleMat();
  const hoodMat = longHoodSideMat();
  const cab1RightMat = cabSideMat('CAB-1', false);
  const cab1LeftMat = cabSideMat('CAB-1', true);
  const cab2RightMat = cabSideMat('CAB-2', false);
  const cab2LeftMat = cabSideMat('CAB-2', true);

  const staticRoot = new Group();
  function part(mat, x, y, z, w, ht, d, geo = boxGeo) {
    const m = new Mesh(geo, mat);
    m.position.set(x, y, z);
    m.scale.set(w, ht, d);
    staticRoot.add(m);
    return m;
  }

  // Unit spans z = 0 (front buffer tip facing +Z) to z = -unitLen (rear buffer tip facing -Z)
  const midZ = -unitLen * 0.5;
  const W = 1.90;
  const HW = 1.48;
  const cabLen = Math.min(2.15, unitLen * 0.21);
  const bodyFrontZ = -0.36;
  const bodyRearZ = -(unitLen - 0.36);
  const bodyLen = Math.abs(bodyRearZ - bodyFrontZ);
  const hoodFrontZ = bodyFrontZ - cabLen;
  const hoodRearZ = bodyRearZ + cabLen;
  const hoodLen = Math.max(2.0, hoodFrontZ - hoodRearZ);

  // Vertical scale factor relative to standard 2.80m locomotive height
  const ys = h / 2.80;
  const Y = v => v * ys;

  // =========================================================================
  // 1. HEAVY UNDERFRAME CHASSIS, FUEL TANK & TWIN 3-AXLE CO-CO BOGIE FRAMES
  // =========================================================================
  part(chassisDark, 0, Y(0.72), midZ, W + 0.02, Y(0.20), bodyLen);
  part(ironDark, 0, Y(0.60), midZ, 1.34, Y(0.18), bodyLen - 0.4);
  // Subtle metallic catwalk side-edge lip
  for (const side of [-1, 1]) {
    part(ironDark, side * (W * 0.5 + 0.015), Y(0.79), midZ, 0.04, Y(0.06), bodyLen - 0.2);
  }

  // Huge Underslung Cylindrical Diesel Fuel Tank + Air Reservoirs between bogies!
  const tankLen = Math.max(1.8, bodyLen * 0.30);
  const tank = part(chassisDark, 0, Y(0.35), midZ, Y(0.46), tankLen, Y(0.46), cyl16);
  tank.rotation.x = Math.PI / 2;
  part(ironDark, 0, Y(0.44), midZ, 1.18, Y(0.26), tankLen * 0.92);
  for (const side of [-1, 1]) {
    const airTank = part(ironDark, side * 0.64, Y(0.42), midZ, Y(0.18), tankLen * 0.72, Y(0.18), cyl12);
    airTank.rotation.x = Math.PI / 2;
    // Steel tank straps
    for (const sz of [-tankLen * 0.3, 0, tankLen * 0.3]) {
      part(ironDark, side * 0.62, Y(0.46), midZ + sz, 0.06, Y(0.28), 0.08);
    }
  }

  // Twin 3-Axle Co-Co Bogie Trucks (Front & Rear)
  const bogieOffset = Math.max(2.2, bodyLen * 0.305);
  const bogieCenters = [midZ + bogieOffset, midZ - bogieOffset];
  const axleSpacing = Math.min(1.06, bodyLen * 0.095);
  const axlePositions = [];

  for (const bz of bogieCenters) {
    const bogieLen = axleSpacing * 2 + 0.88;
    // Central bogie bolster & traction motor housing
    part(ironDark, 0, Y(0.42), bz, 1.18, Y(0.28), bogieLen * 0.88);
    for (const side of [-1, 1]) {
      // Heavy sculpted bogie side frame beam
      part(chassisDark, side * 0.75, Y(0.42), bz, 0.16, Y(0.26), bogieLen);
      part(ironDark, side * 0.78, Y(0.30), bz, 0.12, Y(0.12), bogieLen * 0.86);
      // 3 Axle journal boxes + coil springs between axles
      for (const aOff of [-axleSpacing, 0, axleSpacing]) {
        part(ironDark, side * 0.82, Y(0.36), bz + aOff, 0.14, Y(0.20), 0.24);
      }
      for (const sOff of [-axleSpacing * 0.5, axleSpacing * 0.5]) {
        for (let c = 0; c < 3; c++) {
          const sp = part(steelWheel, side * 0.76, Y(0.33 + c * 0.05), bz + sOff, 1.0, 1.0, 1.0, coilGeo);
          sp.rotation.x = Math.PI / 2;
        }
      }
    }
    for (const aOff of [-axleSpacing, 0, axleSpacing]) {
      axlePositions.push(bz + aOff);
    }
  }

  // =========================================================================
  // 2. DUAL END CABS (CAB-1 FRONT @ +Z, CAB-2 REAR @ -Z) — EXACT PHOTO NOSE!
  // =========================================================================
  function buildEndCab(isFront) {
    const dir = isFront ? 1 : -1;
    const faceZ = isFront ? bodyFrontZ : bodyRearZ;
    const cabMidZ = faceZ - dir * (cabLen * 0.5);

    // Heavy Charcoal Buffer Beam + Twin Giant Circular Buffers + Coupler + Angled Cowcatcher!
    part(ironDark, 0, Y(0.58), faceZ + dir * 0.05, W - 0.04, Y(0.34), 0.16);
    // Twin circular spring buffers (x = ±0.56)
    for (const side of [-1, 1]) {
      const shank = part(ironDark, side * 0.56, Y(0.58), faceZ + dir * 0.20, 0.14, 0.26, 0.14, cyl12);
      shank.rotation.x = Math.PI / 2;
      const plate = part(steelWheel, side * 0.56, Y(0.58), faceZ + dir * 0.34, 0.34, 0.06, 0.34, cyl16);
      plate.rotation.x = Math.PI / 2;
      // Corner step ladders descending beside the buffer beam
      part(ironDark, side * 0.84, Y(0.42), faceZ - dir * 0.06, 0.05, Y(0.56), 0.05);
      part(ironDark, side * 0.84, Y(0.42), faceZ - dir * 0.26, 0.05, Y(0.56), 0.05);
      for (let st = 0; st < 3; st++) {
        part(chassisDark, side * 0.84, Y(0.22 + st * 0.16), faceZ - dir * 0.16, 0.14, Y(0.03), 0.22);
      }
    }
    // Central heavy knuckle coupler + air hoses
    part(ironDark, 0, Y(0.55), faceZ + dir * 0.22, 0.24, Y(0.20), 0.28);
    part(chassisDark, 0, Y(0.55), faceZ + dir * 0.34, 0.30, Y(0.16), 0.10);
    // Angled V-shaped steel cattle guard (cowcatcher) below buffer beam
    for (const side of [-1, 1]) {
      const guard = part(ironDark, side * 0.36, Y(0.24), faceZ + dir * 0.08, 0.78, Y(0.30), 0.08);
      guard.rotation.y = -dir * side * 0.34;
      guard.rotation.x = dir * 0.22;
    }
    part(chassisDark, 0, Y(0.14), faceZ + dir * 0.16, 1.48, Y(0.06), 0.16);

    // Main Cab Core Box (slightly inset from textured skin)
    // Lower cobalt-blue angled chin apron
    part(irBlue, 0, Y(0.96), cabMidZ, W, Y(0.32), cabLen);
    // Tapered cobalt-blue lower nose wedge jutting slightly forward
    const chin = part(irBlue, 0, Y(0.92), faceZ + dir * 0.03, W - 0.08, Y(0.26), 0.14);
    chin.rotation.x = dir * 0.26;
    // Lower white fascia + Golden-Yellow belt + Upper off-white cab body
    part(cabWhite, 0, Y(1.26), cabMidZ, W, Y(0.28), cabLen);
    part(irYellow, 0, Y(1.50), cabMidZ, W + 0.01, Y(0.22), cabLen + 0.01);
    part(cabWhite, 0, Y(2.08), cabMidZ, W, Y(0.94), cabLen);

    // Textured Front Nose Plate ("WDP4 D" | Indian Flag | "45420" + Yellow Stripe + Blue Chin)
    const nosePlate = new Mesh(planeGeo, fNoseMat);
    nosePlate.scale.set(W - 0.04, Y(0.84), 1);
    nosePlate.position.set(0, Y(1.24), faceZ + dir * 0.018);
    if (!isFront) nosePlate.rotation.y = Math.PI;
    staticRoot.add(nosePlate);

    // Slightly raked/slanted upper windshield brow + beveled white cab roof dome!
    const brow = part(cabWhite, 0, Y(2.48), faceZ - dir * 0.12, W - 0.12, Y(0.24), 0.30);
    brow.rotation.x = -dir * 0.28;
    // Beveled white roof crown tapering neatly to roof height `h`
    part(cabWhite, 0, Y(2.62), cabMidZ - dir * 0.06, W - 0.32, Y(0.18), cabLen - 0.18);
    part(cabRoofGray, 0, Y(2.73), cabMidZ - dir * 0.08, W - 0.56, Y(0.09), cabLen - 0.36);

    // Roof AC Housing + Twin Chrome Trumpet Air-Horns perched above windshield!
    part(chassisDark, 0, Y(2.76), faceZ - dir * 0.62, 0.72, Y(0.11), 0.58);
    part(chromeMat, 0, Y(2.79), faceZ - dir * 0.62, 0.66, Y(0.03), 0.50);
    for (const hx of [-0.15, 0.15]) {
      const horn = part(chromeMat, hx, Y(2.77), faceZ - dir * 0.24, 0.09, 0.24, 0.09, cone10);
      horn.rotation.x = isFront ? -Math.PI / 2 : Math.PI / 2;
    }

    // Twin Recessed Trapezoidal Front Windshields with Protective Stone-Guard Grilles!
    for (const side of [-1, 1]) {
      // Dark steel outer windshield frame
      part(ironDark, side * 0.43, Y(2.08), faceZ + dir * 0.012, 0.72, Y(0.58), 0.05);
      // Textured stone-guard grille glass
      const win = new Mesh(planeGeo, wGrilleMat);
      win.scale.set(0.66, Y(0.52), 1);
      win.position.set(side * 0.43, Y(2.08), faceZ + dir * 0.042);
      if (!isFront) win.rotation.y = Math.PI;
      staticRoot.add(win);
      // Dual amber & red marker lamps tucked into the golden-yellow stripe corners!
      part(ironDark, side * 0.74, Y(1.39), faceZ + dir * 0.022, 0.26, Y(0.13), 0.05);
      part(markerAmber, side * 0.79, Y(1.39), faceZ + dir * 0.048, 0.08, 0.03, Y(0.08), cyl12).rotation.x = Math.PI / 2;
      part(markerRed, side * 0.69, Y(1.39), faceZ + dir * 0.048, 0.08, 0.03, Y(0.08), cyl12).rotation.x = Math.PI / 2;
    }
    // Center vertical cab nose pillar + small top forehead beacon above windshields
    part(cabWhite, 0, Y(2.08), faceZ + dir * 0.024, 0.12, Y(0.62), 0.05);
    part(ironDark, 0, Y(2.47), faceZ + dir * 0.04, 0.14, Y(0.10), 0.12);
    part(headlightMat, 0, Y(2.47), faceZ + dir * 0.095, 0.08, Y(0.06), 0.02);

    // Twin Circular Center Headlights in Chrome Bezel Pod (signature WDP4D face!)
    part(chromeMat, 0, Y(1.66), faceZ + dir * 0.026, 0.46, Y(0.22), 0.06);
    for (const lx of [-0.11, 0.11]) {
      const bezel = part(ironDark, lx, Y(1.66), faceZ + dir * 0.056, 0.16, 0.05, 0.16, cyl16);
      bezel.rotation.x = Math.PI / 2;
      const lens = part(headlightMat, lx, Y(1.66), faceZ + dir * 0.072, 0.12, 0.03, 0.12, cyl16);
      lens.rotation.x = Math.PI / 2;
    }
    if (isFront) {
      // Soft glowing forward headlight bloom halo for dark cave tunnels!
      const halo = new Mesh(planeGeo, glowHaloMat);
      halo.scale.set(0.95, Y(0.55), 1);
      halo.position.set(0, Y(1.66), faceZ + 0.10);
      staticRoot.add(halo);
    }

    // Cab Side Livery Panels ("45420 / WDP4 D / CAB-1") + Twin Recessed Dark Cab Side Windows!
    for (const side of [-1, 1]) {
      const cMat = isFront
        ? (side === 1 ? cab1RightMat : cab1LeftMat)
        : (side === 1 ? cab2LeftMat : cab2RightMat);
      const sidePanel = new Mesh(planeGeo, cMat);
      sidePanel.scale.set(cabLen - 0.04, Y(1.76), 1);
      sidePanel.position.set(side * (W * 0.5 + 0.012), Y(1.68), cabMidZ);
      sidePanel.rotation.y = side === 1 ? Math.PI / 2 : -Math.PI / 2;
      staticRoot.add(sidePanel);

      // Dark sliding cab side window frame & panes
      const winZ = faceZ - dir * (cabLen * 0.44);
      part(ironDark, side * (W * 0.5 + 0.016), Y(2.10), winZ, 0.04, Y(0.52), cabLen * 0.64);
      part(cabGlass, side * (W * 0.5 + 0.028), Y(2.10), winZ, 0.03, Y(0.44), cabLen * 0.58);
      part(ironDark, side * (W * 0.5 + 0.038), Y(2.10), winZ, 0.02, Y(0.46), 0.05);
      // Chrome vertical cab entry handrails behind the cab window
      part(chromeMat, side * (W * 0.5 + 0.045), Y(1.44), faceZ - dir * (cabLen - 0.14), 0.025, Y(1.10), 0.025);
    }
  }

  buildEndCab(true);
  buildEndCab(false);

  // =========================================================================
  // 3. INSET LONG ENGINE HOOD ("INDIAN RAILWAYS" + 3 ROOF FANS + CATWALK RAILS)
  // =========================================================================
  const hoodMidZ = (hoodFrontZ + hoodRearZ) * 0.5;
  // Core cobalt-blue engine hood body
  part(irBlue, 0, Y(1.72), hoodMidZ, HW, Y(1.80), hoodLen + 0.04);
  // Beveled cobalt-blue hood roof shoulders reaching cleanly to roof line
  part(irBlue, 0, Y(2.67), hoodMidZ, HW - 0.24, Y(0.14), hoodLen);
  part(irBlueDark, 0, Y(2.74), hoodMidZ, HW - 0.48, Y(0.06), hoodLen - 0.2);

  // Iconic WDP4D Flared Wider Blue Radiator Section near rear cab!
  const flareLen = Math.min(1.65, hoodLen * 0.26);
  const flareZ = hoodRearZ + flareLen * 0.58;
  part(irBlue, 0, Y(2.42), flareZ, HW + 0.26, Y(0.44), flareLen);
  part(irBlueDark, 0, Y(2.68), flareZ, HW + 0.16, Y(0.12), flareLen - 0.08);
  for (const side of [-1, 1]) {
    part(grilleDark, side * (HW * 0.5 + 0.135), Y(2.42), flareZ, 0.03, Y(0.32), flareLen - 0.18);
  }

  // Front-mid flared dynamic-brake louver pod right behind CAB-1 (exact photo silhouette!)
  const dbLen = Math.min(1.45, hoodLen * 0.24);
  const dbZ = hoodFrontZ - dbLen * 0.56;
  part(irBlue, 0, Y(2.40), dbZ, HW + 0.22, Y(0.40), dbLen);
  for (const side of [-1, 1]) {
    part(grilleDark, side * (HW * 0.5 + 0.115), Y(2.40), dbZ, 0.03, Y(0.28), dbLen - 0.16);
  }

  // Crisp "INDIAN RAILWAYS" Textured Side Hood Panels (properly readable on both sides!)
  for (const side of [-1, 1]) {
    const panel = new Mesh(planeGeo, hoodMat);
    panel.scale.set(hoodLen - 0.06, Y(1.74), 1);
    panel.position.set(side * (HW * 0.5 + 0.015), Y(1.70), hoodMidZ);
    panel.rotation.y = side === 1 ? Math.PI / 2 : -Math.PI / 2;
    staticRoot.add(panel);
  }

  // 3 Large Circular Raised Roof Radiator Cooling Fan Housings + Exhaust Stack!
  const fanSpan = Math.min(hoodLen * 0.62, 3.8);
  for (let fi = 0; fi < 3; fi++) {
    const fz = hoodMidZ + fanSpan * 0.42 - fi * (fanSpan * 0.42);
    part(irBlueDark, 0, Y(2.74), fz, 1.02, Y(0.10), 1.02, cyl16);
    part(grilleDark, 0, Y(2.785), fz, 0.86, Y(0.03), 0.86, cyl16);
    part(ironDark, 0, Y(2.792), fz, 0.24, Y(0.03), 0.24, cyl12);
  }
  // Raised exhaust manifold silencer stack near center hood
  part(ironDark, 0, Y(2.76), hoodMidZ + 0.15, 0.42, Y(0.09), 0.72);

  // Full-Length Cobalt-Blue Catwalk Side Handrails + Stanchion Posts along BOTH walkways!
  for (const side of [-1, 1]) {
    const rx = side * (W * 0.5 - 0.04);
    part(irBlue, rx, Y(1.42), hoodMidZ, 0.035, Y(0.038), hoodLen + 0.14);
    part(irBlue, rx, Y(1.12), hoodMidZ, 0.030, Y(0.032), hoodLen + 0.14);
    const posts = Math.max(4, Math.round(hoodLen / 1.15));
    for (let pi = 0; pi <= posts; pi++) {
      const pz = hoodFrontZ - (pi / posts) * hoodLen;
      part(irBlue, rx, Y(1.12), pz, 0.035, Y(0.64), 0.035);
    }
  }

  // Bake all static locomotive meshes by material for super fast rendering!
  const bakedBody = bakeStatic(staticRoot);
  const template = { bakedBody, axlePositions, ys };
  unitCache.set(cacheKey, template);
  return template;
}

const axleCache = new Map();
function createAxleWheelset(ys) {
  const key = ys.toFixed(3);
  if (!axleCache.has(key)) {
    // Share roughness/metalness so bakeGroup merges all 3 axle colors into 1 single vertex-colored draw call (cuts 36 -> 12 draws per double train!)
    const steelWheel = getMat('wdpAxleSteel', { color: 0x4b5563, roughness: 0.42, metalness: 0.68 });
    const rimSteel = getMat('wdpAxleRim', { color: 0x9ca3af, roughness: 0.42, metalness: 0.68 });
    const ironDark = getMat('wdpAxleIron', { color: 0x1f242a, roughness: 0.42, metalness: 0.68 });

    const raw = new Group();
    const shaft = new Mesh(cyl12, ironDark);
    shaft.rotation.z = Math.PI / 2;
    shaft.scale.set(0.11 * ys, 1.32, 0.11 * ys);
    raw.add(shaft);

    for (const side of [-1, 1]) {
      const wheel = new Mesh(cyl16, steelWheel);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.x = side * 0.60;
      wheel.scale.set(0.56 * ys, 0.11, 0.56 * ys);
      raw.add(wheel);

      const flange = new Mesh(cyl16, rimSteel);
      flange.rotation.z = Math.PI / 2;
      flange.position.x = side * 0.54;
      flange.scale.set(0.62 * ys, 0.035, 0.62 * ys);
      raw.add(flange);

      const spoke = new Mesh(boxGeo, ironDark);
      spoke.position.x = side * 0.66;
      spoke.scale.set(0.02, 0.42 * ys, 0.07 * ys);
      raw.add(spoke);
    }
    const baked = bakeStatic(raw);
    for (const m of baked.children) m.castShadow = false;
    axleCache.set(key, baked);
  }
  return axleCache.get(key).clone();
}

/**
 * Builds the photo-accurate Indian Railways WDP4D 45420 Diesel Locomotive train
 * matching the exact collision span [0 .. -o.length] and height [0 .. o.roof].
 * Long roof-ride spans (>= 18m) couple two proportional WDP4D 45420 units seamlessly!
 */
export function buildWDP4DTrain(o) {
  const g = new Group();
  const h = Math.max(2.6, o.roof || 2.8);
  const len = Math.max(9.5, o.length || 12);
  g.name = 'metro-train';
  g.userData.wheels = [];
  g.userData.captureObstacle = true;
  g.userData.coins = [];

  const units = len >= 18 ? 2 : 1;
  const unitLen = len / units;
  const tpl = buildWDP4DUnitTemplate(unitLen, h);

  for (let u = 0; u < units; u++) {
    const unitGroup = new Group();
    unitGroup.position.z = -u * unitLen;
    unitGroup.add(tpl.bakedBody.clone());
    for (const az of tpl.axlePositions) {
      const axle = createAxleWheelset(tpl.ys);
      axle.position.set(0, 0.312 * tpl.ys, az);
      unitGroup.add(axle);
      g.userData.wheels.push(axle);
    }
    g.add(unitGroup);
  }

  if (o.roofRide) {
    for (let i = 0; i < 4; i++) {
      g.userData.coins.push(makeCoin(g, 0, h + 0.6, -4 - i * 4));
    }
  }
  return g;
}

/**
 * Matching Indian Railways Blue/Yellow Maintenance Rail Ramp Wagon for parked ramps inside the railway cave
 * (preserves exact v.roof = 1.72m collision height & walkable roof so player climbs onto the WDP4D train roof!).
 */
const wagonCache = new Map();
export function buildRailRampWagon(length, roof) {
  const g = new Group();
  g.userData.wheels = [];
  g.userData.captureObstacle = true;
  const cacheKey = `${length.toFixed(1)}:${roof.toFixed(2)}`;
  const midZ = -length * 0.5;
  const bogieOff = Math.max(2.2, length * 0.34);

  if (!wagonCache.has(cacheKey)) {
    const irBlue = getMat('wdpIrBlue', { color: 0x1d56b8, roughness: 0.36, metalness: 0.24 });
    const irYellow = getMat('wdpIrYel', { color: 0xf2a61e, roughness: 0.36, metalness: 0.14 });
    const cabWhite = getMat('wdpCabW', { color: 0xe6eaef, roughness: 0.42, metalness: 0.16 });
    const chassisDark = getMat('wdpChas', { color: 0x2b3138, roughness: 0.62, metalness: 0.46 });
    const ironDark = getMat('wdpIron', { color: 0x1f242a, roughness: 0.55, metalness: 0.58 });
    const deckSteel = getMat('wdpDeckS', { color: 0x475569, roughness: 0.58, metalness: 0.48 });

    const staticRoot = new Group();
    function part(mat, x, y, z, w, ht, d, geo = boxGeo) {
      const m = new Mesh(geo, mat);
      m.position.set(x, y, z);
      m.scale.set(w, ht, d);
      staticRoot.add(m);
      return m;
    }

    part(chassisDark, 0, 0.58, midZ, 1.92, 0.24, length - 0.4);
    for (const ez of [-0.14, -(length - 0.14)]) {
      part(ironDark, 0, 0.54, ez, 1.88, 0.28, 0.18);
      for (const side of [-1, 1]) {
        const buf = part(ironDark, side * 0.56, 0.54, ez + (ez > midZ ? 0.10 : -0.10), 0.26, 0.16, 0.26, cyl12);
        buf.rotation.x = Math.PI / 2;
      }
    }
    const bodyH = Math.max(0.6, roof - 0.72);
    part(irBlue, 0, 0.70 + bodyH * 0.5, midZ, 1.88, bodyH, length - 0.5);
    part(cabWhite, 0, 0.70 + bodyH * 0.64, midZ, 1.90, bodyH * 0.18, length - 0.46);
    part(irYellow, 0, 0.70 + bodyH * 0.44, midZ, 1.90, bodyH * 0.18, length - 0.46);
    part(deckSteel, 0, roof - 0.04, midZ, 1.92, 0.08, length - 0.36);

    for (const bz of [midZ + bogieOff, midZ - bogieOff]) {
      for (const side of [-1, 1]) {
        part(ironDark, side * 0.74, 0.36, bz, 0.14, 0.22, 2.2);
      }
    }
    wagonCache.set(cacheKey, bakeStatic(staticRoot));
  }

  g.add(wagonCache.get(cacheKey).clone());
  for (const bz of [midZ + bogieOff, midZ - bogieOff]) {
    for (const dz of [-0.75, 0.75]) {
      const axle = createAxleWheelset(0.85);
      axle.position.set(0, 0.27, bz + dz);
      g.add(axle);
      g.userData.wheels.push(axle);
    }
  }
  return g;
}
