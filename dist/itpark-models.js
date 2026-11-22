import { mergeGeometries } from './vendor/BufferGeometryUtils.js';
import {
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  CylinderGeometry,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshStandardMaterial,
  Shape,
  SphereGeometry,
  SRGBColorSpace,
  TorusGeometry,
  Vector3
} from './vendor/three.module.js';

const cube = new BoxGeometry(1, 1, 1);
const sphere = new SphereGeometry(1, 14, 10);
const cyl16 = new CylinderGeometry(1, 1, 1, 16);
const cyl12 = new CylinderGeometry(1, 1, 1, 12);
const tyreBig = new CylinderGeometry(0.42, 0.42, 0.28, 20);
const tyreSport = new CylinderGeometry(0.36, 0.36, 0.28, 20);
const tyreMoto = new TorusGeometry(0.28, 0.085, 8, 22);
const wheelArch = new TorusGeometry(0.42, 0.04, 6, 18, Math.PI);

const matCache = new Map();
const geoCache = new Map();
const batchCache = new Map();

function getMat(key, opts) {
  if (!matCache.has(key)) matCache.set(key, new MeshStandardMaterial(opts));
  return matCache.get(key);
}

const MAT = {
  // Porsche 911 GT3 RS (Ref 1: Manthey Emerald Green + Gold rims + Carbon aero)
  porscheGreen: () => getMat('pGreen', { color: 0x165e34, roughness: 0.16, metalness: 0.56 }),
  porscheGold: () => getMat('pGold', { color: 0xb7964d, roughness: 0.24, metalness: 0.82 }),
  carbon: () => getMat('carbon', { color: 0x181c22, roughness: 0.34, metalness: 0.38 }),
  mantheyRed: () => getMat('mRed', { color: 0xe11d48, roughness: 0.32, metalness: 0.20, emissive: 0x9f1239, emissiveIntensity: 0.15 }),
  // Bugatti Chiron (Ref 2: Electric Sky-Cyan front + Deep Navy rear + Brushed Silver C-line + Tan cabin)
  bugattiCyan: () => getMat('bCyan', { color: 0x2696ff, roughness: 0.12, metalness: 0.54 }),
  bugattiNavy: () => getMat('bNavy', { color: 0x101e6b, roughness: 0.14, metalness: 0.62 }),
  bugattiTan: () => getMat('bTan', { color: 0xc9965c, roughness: 0.62, metalness: 0.06 }),
  caliperBlue: () => getMat('calBlue', { color: 0x2563eb, roughness: 0.28, metalness: 0.55 }),
  // Red Open-Air Campus Shuttle (Ref 3: Glossy Crimson Red + Sunburst Yellow skirt + White leather seats)
  shuttleRed: () => getMat('sRed', { color: 0xd41c1c, roughness: 0.18, metalness: 0.34 }),
  shuttleYellow: () => getMat('sYel', { color: 0xfacc15, roughness: 0.28, metalness: 0.22 }),
  seatWhite: () => getMat('seatW', { color: 0xeef2f6, roughness: 0.52, metalness: 0.05 }),
  bumperGray: () => getMat('bumpG', { color: 0x9aa4b2, roughness: 0.42, metalness: 0.38 }),
  shuttleGlass: () => getMat('sGlass', { color: 0x5ea8c4, roughness: 0.10, metalness: 0.68 }),
  // Heavy Freight Semi-Trucks (Ref 4: Yellow / Red / Blue cabs + White / Charcoal / Navy corrugated containers)
  cabYellow: () => getMat('cabY', { color: 0xe6b41c, roughness: 0.20, metalness: 0.38 }),
  cabRed: () => getMat('cabR', { color: 0xde2424, roughness: 0.20, metalness: 0.38 }),
  cabBlue: () => getMat('cabB', { color: 0x2476ee, roughness: 0.20, metalness: 0.38 }),
  boxWhite: () => getMat('boxW', { color: 0xd0d6df, roughness: 0.48, metalness: 0.24 }),
  boxWhiteRoof: () => getMat('boxWR', { color: 0xe7ebf0, roughness: 0.42, metalness: 0.20 }),
  boxWhiteRib: () => getMat('boxWRib', { color: 0xb5beca, roughness: 0.50, metalness: 0.28 }),
  boxCharcoal: () => getMat('boxC', { color: 0x525861, roughness: 0.50, metalness: 0.26 }),
  boxCharcoalRoof: () => getMat('boxCR', { color: 0x656c76, roughness: 0.45, metalness: 0.22 }),
  boxCharcoalRib: () => getMat('boxCRib', { color: 0x3e444c, roughness: 0.52, metalness: 0.30 }),
  boxNavy: () => getMat('boxN', { color: 0x3a5282, roughness: 0.48, metalness: 0.26 }),
  boxNavyRoof: () => getMat('boxNR', { color: 0x48659c, roughness: 0.44, metalness: 0.22 }),
  boxNavyRib: () => getMat('boxNRib', { color: 0x2b3f68, roughness: 0.52, metalness: 0.30 }),
  // Ducati Streetfighter V4 S (Ref 6: Corsa Red + Gold Ohlins forks + Bronze engine)
  ducatiRed: () => getMat('dRed', { color: 0xdc161e, roughness: 0.16, metalness: 0.38 }),
  ohlinsGold: () => getMat('oGold', { color: 0xd9a528, roughness: 0.20, metalness: 0.86 }),
  engineBronze: () => getMat('eBrz', { color: 0x9b8668, roughness: 0.34, metalness: 0.72 }),
  // Glossy White Humanoid AI Robot (Ref 5: Pure Glossy White shell + Jet Black joints/visor + Neon Green glowing eyes)
  robotWhite: () => getMat('rWhite', { color: 0xf7f9fc, roughness: 0.14, metalness: 0.16 }),
  robotBlack: () => getMat('rBlack', { color: 0x11151b, roughness: 0.16, metalness: 0.52 }),
  robotEyeGreen: () => getMat('rEye', { color: 0x22ff55, emissive: 0x16f048, emissiveIntensity: 1.35, roughness: 0.15 }),
  // Shared automotive metals, glass, tires & LEDs
  glassDark: () => getMat('gDark', { color: 0x142636, roughness: 0.08, metalness: 0.80 }),
  chrome: () => getMat('chrome', { color: 0xdbe6ef, roughness: 0.14, metalness: 0.90 }),
  rubber: () => getMat('rubber', { color: 0x151920, roughness: 0.88, metalness: 0.04 }),
  darkTrim: () => getMat('dTrim', { color: 0x222933, roughness: 0.45, metalness: 0.32 }),
  ledWhite: () => getMat('ledW', { color: 0xf8fbff, emissive: 0xe0f2fe, emissiveIntensity: 0.90, roughness: 0.15 }),
  ledRed: () => getMat('ledR', { color: 0xff2836, emissive: 0xdc2626, emissiveIntensity: 0.85, roughness: 0.18 }),
  ledAmber: () => getMat('ledA', { color: 0xffa61e, emissive: 0xd97706, emissiveIntensity: 0.65, roughness: 0.20 }),
  riderSuit: () => getMat('rSuit', { color: 0x1c2330, roughness: 0.65, metalness: 0.10 }),
  riderSkin: () => getMat('rSkin', { color: 0xe0a580, roughness: 0.72, metalness: 0.02 })
};

let chironGrilleMat = null;
function getChironGrilleMat() {
  if (chironGrilleMat || typeof document === 'undefined') return chironGrilleMat || MAT.carbon();
  const cv = document.createElement('canvas');
  cv.width = 128; cv.height = 192;
  const ctx = cv.getContext('2d');
  if (!ctx) return MAT.carbon();
  ctx.fillStyle = '#0c1118';
  ctx.fillRect(0, 0, 128, 192);
  ctx.strokeStyle = '#d8e4ef';
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, 118, 182);
  // Iconic blue "16" painted on the horseshoe mesh + red Bugatti oval badge
  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.ellipse(64, 34, 22, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('EB', 64, 38);
  ctx.fillStyle = '#38bdf8';
  ctx.font = '900 72px system-ui, sans-serif';
  ctx.fillText('16', 64, 146);
  const tex = new CanvasTexture(cv);
  tex.colorSpace = SRGBColorSpace;
  chironGrilleMat = new MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0x38bdf8, emissiveIntensity: 0.22, roughness: 0.28, metalness: 0.45 });
  return chironGrilleMat;
}

function addPart(parent, mat, x, y, z, sx, sy, sz, geo = cube) {
  const m = new Mesh(geo, mat);
  m.position.set(x, y, z);
  m.scale.set(Math.abs(sx), Math.abs(sy), Math.abs(sz));
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

function addShell(parent, mat, x, y, z, w, h, d, r = 0.06) {
  return addPart(parent, mat, x, y, z, 1, 1, 1, roundedBox(w, h, d, r));
}

function addBar(parent, mat, a, b, rad = 0.03) {
  const p = new Vector3(...a), q = new Vector3(...b);
  const dir = q.clone().sub(p);
  const len = dir.length();
  if (len < 1e-5) return null;
  const m = addPart(parent, mat, (p.x + q.x) / 2, (p.y + q.y) / 2, (p.z + q.z) / 2, rad, len, rad, cyl12);
  m.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), dir.normalize());
  return m;
}

function coachworkGeo(key, sections) {
  if (geoCache.has(key)) return geoCache.get(key);
  const positions = [], indices = [];
  for (const [z, base, top, lw, uw] of sections) {
    positions.push(-lw, base, z, lw, base, z, uw, top, z, -uw, top, z);
  }
  for (let i = 0; i < sections.length - 1; i++) {
    for (let f = 0; f < 4; f++) {
      const a = i * 4 + f, b = i * 4 + (f + 1) % 4;
      indices.push(a, b, b + 4, a, b + 4, a + 4);
    }
  }
  const end = 4 * (sections.length - 1);
  indices.push(0, 2, 1, 0, 3, 2, end, end + 1, end + 2, end, end + 2, end + 3);
  const geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  geo.setAttribute('uv', new Float32BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
  geoCache.set(key, geo);
  return geo;
}

function roundedBox(w, h, d, r = 0.10) {
  const key = `rb:${w}:${h}:${d}:${r}`;
  if (geoCache.has(key)) return geoCache.get(key);
  const g = new BoxGeometry(w, h, d, 4, 4, 5);
  const p = g.attributes.position;
  const n = new Vector3();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const cx = Math.max(-w / 2 + r, Math.min(w / 2 - r, x));
    const cy = Math.max(-h / 2 + r, Math.min(h / 2 - r, y));
    const cz = Math.max(-d / 2 + r, Math.min(d / 2 - r, z));
    n.set(x - cx, y - cy, z - cz).normalize().multiplyScalar(r);
    p.setXYZ(i, cx + n.x, cy + n.y, cz + n.z);
  }
  g.computeVertexNormals();
  geoCache.set(key, g);
  return g;
}

function extrude2D(key, pts, depth, bevel = 0.03) {
  if (geoCache.has(key)) return geoCache.get(key);
  const shape = new Shape();
  shape.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i][0], pts[i][1]);
  shape.closePath();
  const g = new ExtrudeGeometry(shape, {
    depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel * 0.85, bevelSegments: 2, curveSegments: 8
  });
  geoCache.set(key, g);
  return g;
}

function normalizeGeo(raw, matrix) {
  const g = (raw.index ? raw.toNonIndexed() : raw.clone()).applyMatrix4(matrix);
  for (const k of Object.keys(g.attributes)) {
    if (k !== 'position' && k !== 'normal' && k !== 'uv') g.deleteAttribute(k);
  }
  if (!g.attributes.normal) g.computeVertexNormals();
  if (!g.attributes.uv) {
    g.setAttribute('uv', new Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  }
  return g;
}

function batchStatic(group, key, castShadow = true) {
  if (!batchCache.has(key)) {
    const buckets = new Map();
    for (const child of group.children.filter(c => c.isMesh)) {
      child.updateMatrix();
      const geom = normalizeGeo(child.geometry, child.matrix);
      if (!buckets.has(child.material)) buckets.set(child.material, []);
      buckets.get(child.material).push(geom);
    }
    const merged = [];
    for (const [mat, list] of buckets) {
      const comb = list.length === 1 ? list[0] : mergeGeometries(list, false);
      if (!comb) { for (const g of list) g.dispose(); continue; }
      const m = new Mesh(comb, mat);
      m.castShadow = castShadow;
      m.receiveShadow = true;
      merged.push(m);
      if (list.length > 1) for (const g of list) g.dispose();
    }
    batchCache.set(key, merged);
  }
  for (const child of [...group.children]) if (child.isMesh) group.remove(child);
  for (const panel of batchCache.get(key)) group.add(panel.clone());
}

function addCarWheel(g, x, y, z, rimMat, radius = 0.36, aeroDisc = false, caliperMat = null) {
  const w = addPart(g, MAT.rubber(), x, y, z, radius / 0.36, 1, radius / 0.36, tyreSport);
  w.rotation.z = Math.PI / 2;
  const side = x >= 0 ? 1 : -1;
  const hub = new Group();
  hub.position.set(x + side * 0.145, y, z);
  g.add(hub);
  g.userData.wheels.push(hub);
  const hubKey = `carHub:${rimMat.uuid}:${radius.toFixed(2)}:${aeroDisc ? 1 : 0}:${caliperMat ? caliperMat.uuid : '0'}:${side}`;
  if (!batchCache.has(hubKey)) {
    if (aeroDisc) {
      const outer = new Mesh(cyl16, rimMat);
      outer.scale.set(radius * 0.72, 0.03, radius * 0.72);
      outer.rotation.z = Math.PI / 2;
      hub.add(outer);
      const disc = new Mesh(cyl16, MAT.carbon());
      disc.scale.set(radius * 0.55, 0.04, radius * 0.55);
      disc.rotation.z = Math.PI / 2;
      hub.add(disc);
    } else {
      const rim = new Mesh(cyl16, rimMat);
      rim.scale.set(radius * 0.72, 0.025, radius * 0.72);
      rim.rotation.z = Math.PI / 2;
      hub.add(rim);
      const inner = new Mesh(cyl12, MAT.carbon());
      inner.scale.set(radius * 0.56, 0.03, radius * 0.56);
      inner.rotation.z = Math.PI / 2;
      hub.add(inner);
      for (let i = 0; i < 5; i++) {
        const sp = new Mesh(cube, rimMat);
        const a = (i / 5) * Math.PI * 2;
        sp.scale.set(0.036, 0.04, radius * 1.28);
        sp.rotation.x = a;
        hub.add(sp);
      }
      if (caliperMat) {
        const cal = new Mesh(cube, caliperMat);
        cal.scale.set(0.045, 0.14, 0.09);
        cal.position.set(-side * 0.02, 0.04, 0.14);
        hub.add(cal);
      }
    }
  }
  batchStatic(hub, hubKey, false);
}

// =============================================================================
// 1. PORSCHE 911 GT3 RS (Manthey Emerald Metallic Green + Gold Rims + Huge Wing)
// Front faces +Z; spans [-length..0] when centered=false, or [-length/2..+length/2] when centered=true
// =============================================================================
export function buildPorscheGT3RS(length = 4.6, centered = false) {
  const g = new Group();
  g.userData.captureObstacle = true;
  g.userData.wheels = [];
  const zShift = centered ? length / 2 : 0;
  const L = Math.min(length, 4.6);
  const z0 = -L + zShift; // rear
  const z1 = 0 + zShift;  // front nose

  const green = MAT.porscheGreen();
  const carbon = MAT.carbon();
  const gold = MAT.porscheGold();
  const glass = MAT.glassDark();

  // Wide low sculpted 911 GT3 RS body
  const bodyGeo = coachworkGeo(`gt3Body:${L}:${zShift}`, [
    [z0, 0.30, 0.78, 0.88, 0.84],
    [z0 + 0.55, 0.24, 0.90, 0.98, 0.92],
    [z0 + 1.55, 0.24, 0.88, 0.95, 0.88],
    [z1 - 1.35, 0.24, 0.85, 0.96, 0.88],
    [z1 - 0.38, 0.24, 0.68, 0.93, 0.84],
    [z1, 0.28, 0.50, 0.82, 0.78]
  ]);
  addPart(g, green, 0, 0, 0, 1, 1, 1, bodyGeo);

  // Sloping teardrop 911 glass greenhouse & roof dome
  const cabGeo = coachworkGeo(`gt3Cab:${L}:${zShift}`, [
    [z0 + 0.45, 0.86, 0.90, 0.76, 0.68],
    [z0 + 1.35, 0.86, 1.28, 0.80, 0.62],
    [z1 - 1.95, 0.84, 1.30, 0.80, 0.62],
    [z1 - 1.12, 0.78, 0.82, 0.78, 0.72]
  ]);
  addPart(g, glass, 0, 0, 0, 1, 1, 1, cabGeo);
  addPart(g, green, 0, 1.29, z0 + 2.05, 1.18, 0.06, 1.38);
  // Subtle racing bucket seats + red seat harness visible inside cockpit
  for (const sx of [-0.30, 0.30]) {
    addPart(g, MAT.bumperGray(), sx, 0.95, z0 + 1.85, 0.34, 0.46, 0.14);
    addPart(g, MAT.mantheyRed(), sx - 0.08, 1.02, z0 + 1.93, 0.05, 0.32, 0.03);
  }

  // Aggressive carbon front splitter, wide front intake grille & dive-plane canards
  addPart(g, carbon, 0, 0.19, z1 - 0.02, 1.90, 0.08, 0.36);
  addPart(g, carbon, 0, 0.34, z1 + 0.01, 1.28, 0.20, 0.08);
  for (const sx of [-0.42, 0, 0.42]) addPart(g, carbon, sx, 0.28, z1 + 0.04, 0.03, 0.16, 0.05);
  // Twin recessed matte-black NACA hood vents (signature GT3 RS hood detail!)
  for (const sx of [-0.34, 0.34]) {
    const vent = addPart(g, carbon, sx, 0.74, z1 - 0.68, 0.32, 0.07, 0.56);
    vent.rotation.x = 0.22;
  }
  // Tiny gold Porsche crest emblem on hood nose
  addPart(g, gold, 0, 0.59, z1 - 0.18, 0.09, 0.03, 0.10);

  // Iconic oval 911 round black-bezel LED headlights + front fender louvers + carbon mirrors + side air intakes
  for (const side of [-1, 1]) {
    const hlBezel = addPart(g, carbon, side * 0.68, 0.67, z1 - 0.30, 0.26, 0.14, 0.34, sphere);
    hlBezel.rotation.x = 0.35;
    addPart(g, MAT.ledWhite(), side * 0.68, 0.69, z1 - 0.22, 0.14, 0.10, 0.14, sphere);
    addPart(g, MAT.ledWhite(), side * 0.76, 0.44, z1 - 0.03, 0.28, 0.04, 0.05);
    // Front fender black louver + carbon side skirt + rear quarter intake scoop
    addPart(g, carbon, side * 0.90, 0.76, z1 - 0.95, 0.14, 0.07, 0.42);
    addPart(g, carbon, side * 0.96, 0.21, (z0 + z1) / 2, 0.12, 0.08, L * 0.58);
    addPart(g, carbon, side * 0.97, 0.64, z0 + 1.15, 0.10, 0.26, 0.36);
    // Carbon wing mirrors
    addPart(g, carbon, side * 0.96, 0.94, z1 - 1.32, 0.18, 0.10, 0.14, sphere);
    // Fender arches
    for (const wz of [z0 + 0.92, z1 - 0.92]) {
      const a = addPart(g, carbon, side * 0.93, 0.38, wz, 1.0, 1.0, 1.0, wheelArch);
      a.rotation.y = Math.PI / 2;
    }
  }

  // MASSIVE SWAN-NECK CARBON GT3 RS REAR WING with Manthey Red/White Endplates!
  const wingZ = z0 + 0.24;
  for (const sx of [-0.42, 0.42]) {
    const strut = addPart(g, carbon, sx, 1.16, wingZ + 0.12, 0.06, 0.66, 0.22);
    strut.rotation.x = -0.25;
  }
  addPart(g, carbon, 0, 1.48, wingZ, 1.98, 0.06, 0.38);
  addPart(g, carbon, 0, 1.56, wingZ - 0.08, 1.94, 0.04, 0.20);
  for (const side of [-1, 1]) {
    addPart(g, carbon, side * 1.00, 1.50, wingZ, 0.05, 0.32, 0.48);
    addPart(g, MAT.mantheyRed(), side * 1.028, 1.54, wingZ + 0.02, 0.015, 0.14, 0.18);
  }
  // Full-width red LED taillight bar + rear diffuser
  addPart(g, MAT.ledRed(), 0, 0.72, z0 - 0.01, 1.56, 0.07, 0.04);
  addPart(g, carbon, 0, 0.26, z0 - 0.02, 1.68, 0.20, 0.10);

  batchStatic(g, `gt3rs:${L}:${zShift}`);
  // Wheels (Gold multi-spoke front, Gold-rimmed Carbon Aero Disc rear!)
  for (const side of [-1, 1]) {
    addCarWheel(g, side * 0.89, 0.36, z1 - 0.92, gold, 0.36, false);
    addCarWheel(g, side * 0.91, 0.37, z0 + 0.92, gold, 0.37, true);
  }
  return g;
}

// =============================================================================
// 2. BUGATTI CHIRON (Two-Tone Sky-Cyan Front / Deep Royal Navy Rear + Silver C-Line)
// =============================================================================
export function buildBugattiChiron(length = 4.6, centered = false) {
  const g = new Group();
  g.userData.captureObstacle = true;
  g.userData.wheels = [];
  const zShift = centered ? length / 2 : 0;
  const L = Math.min(length, 4.6);
  const z0 = -L + zShift;
  const z1 = 0 + zShift;
  const zMid = (z0 + z1) / 2 - 0.15;

  const cyan = MAT.bugattiCyan();
  const navy = MAT.bugattiNavy();
  const carbon = MAT.carbon();
  const chrome = MAT.chrome();
  const glass = MAT.glassDark();

  // Rear deep navy half of Chiron body (wide muscular W16 rear haunches!)
  const rearGeo = coachworkGeo(`chRear:${L}:${zShift}`, [
    [z0, 0.28, 0.76, 0.94, 0.90],
    [z0 + 0.65, 0.24, 0.92, 1.02, 0.95],
    [zMid, 0.24, 0.89, 0.98, 0.90]
  ]);
  addPart(g, navy, 0, 0, 0, 1, 1, 1, rearGeo);

  // Front electric sky-cyan half of Chiron body (sweeping aerodynamic nose!)
  const frontGeo = coachworkGeo(`chFront:${L}:${zShift}`, [
    [zMid + 0.02, 0.24, 0.89, 0.98, 0.90],
    [z1 - 1.25, 0.24, 0.86, 0.99, 0.91],
    [z1 - 0.35, 0.24, 0.68, 0.95, 0.86],
    [z1, 0.28, 0.52, 0.84, 0.80]
  ]);
  addPart(g, cyan, 0, 0, 0, 1, 1, 1, frontGeo);

  // Low sleek wraparound hypercar canopy + tan leather dashboard peek
  const cabGeo = coachworkGeo(`chCab:${L}:${zShift}`, [
    [z0 + 0.70, 0.88, 0.94, 0.78, 0.68],
    [z0 + 1.55, 0.88, 1.24, 0.82, 0.64],
    [z1 - 1.85, 0.86, 1.25, 0.82, 0.64],
    [z1 - 1.05, 0.76, 0.82, 0.78, 0.72]
  ]);
  addPart(g, glass, 0, 0, 0, 1, 1, 1, cabGeo);
  addPart(g, navy, 0, 1.24, z0 + 2.0, 1.18, 0.06, 1.45);
  addPart(g, MAT.bugattiTan(), 0, 0.86, z1 - 1.38, 1.15, 0.14, 0.52);

  // Iconic Bugatti Horseshoe Front Grille with blue "16" & red EB emblem!
  const grille = addPart(g, getChironGrilleMat(), 0, 0.42, z1 + 0.02, 0.42, 0.44, 0.06);
  grille.rotation.x = 0.12;
  // Wide twin carbon front air intakes + carbon lower lip splitter
  addPart(g, carbon, 0, 0.19, z1 - 0.02, 1.92, 0.08, 0.34);
  for (const side of [-1, 1]) {
    addPart(g, carbon, side * 0.58, 0.34, z1 - 0.02, 0.62, 0.20, 0.08);
    // Iconic recessed Quad-Square LED Headlight Bar (4 bright white LED squares!)
    addPart(g, carbon, side * 0.64, 0.60, z1 - 0.16, 0.44, 0.12, 0.14);
    for (let q = 0; q < 4; q++) {
      addPart(g, MAT.ledWhite(), side * (0.49 + q * 0.10), 0.60, z1 - 0.08, 0.065, 0.065, 0.04);
    }
    // UNMISTAKABLE BRUSHED-SILVER SWEEPING BUGATTI C-LINE SIGNATURE ARCH along both sides!
    addBar(g, chrome, [side * 0.99, 0.24, z1 - 1.35], [side * 0.99, 0.24, zMid + 0.15], 0.045);
    addBar(g, chrome, [side * 0.99, 0.24, zMid + 0.15], [side * 0.94, 0.72, zMid - 0.25], 0.048);
    addBar(g, chrome, [side * 0.94, 0.72, zMid - 0.25], [side * 0.74, 1.18, zMid + 0.15], 0.045);
    addBar(g, chrome, [side * 0.74, 1.18, zMid + 0.15], [side * 0.72, 1.20, z1 - 1.65], 0.040);
    // Side mirror & navy rear engine louver fin
    addPart(g, navy, side * 0.96, 0.92, z1 - 1.48, 0.17, 0.09, 0.14, sphere);
    addPart(g, chrome, side * 0.97, 0.24, z1 - 0.55, 0.05, 0.05, 0.62);
  }
  // Iconic Chiron full-width single razor-thin red LED rear taillight blade
  addPart(g, carbon, 0, 0.64, z0 - 0.01, 1.72, 0.22, 0.06);
  addPart(g, MAT.ledRed(), 0, 0.66, z0 - 0.04, 1.64, 0.05, 0.04);

  batchStatic(g, `chiron:${L}:${zShift}`);
  // Diamond-cut silver/black wheels with Bugatti blue brake calipers!
  for (const side of [-1, 1]) {
    addCarWheel(g, side * 0.92, 0.37, z1 - 0.92, chrome, 0.37, false, MAT.caliperBlue());
    addCarWheel(g, side * 0.94, 0.38, z0 + 0.92, chrome, 0.38, false, MAT.caliperBlue());
  }
  return g;
}

// =============================================================================
// 3. OPEN-AIR RED & YELLOW IT PARK CAMPUS SHUTTLE CART (Ref 3)
// Parked ramp vehicle: spans z = -length (front cab) to z = 0 (rear bumper + guardrail)
// Flat running roof at y = roof (1.72m)!
// =============================================================================
export function buildRedShuttleCart(length = 20, roof = 1.72) {
  const g = new Group();
  g.userData.captureObstacle = true;
  g.userData.wheels = [];

  const red = MAT.shuttleRed();
  const yellow = MAT.shuttleYellow();
  const seatW = MAT.seatWhite();
  const chrome = MAT.chrome();
  const bump = MAT.bumperGray();
  const glass = MAT.shuttleGlass();
  const dark = MAT.darkTrim();

  // Continuous low floor chassis + signature Sunburst Yellow side running boards
  addPart(g, dark, 0, 0.28, -length / 2, 1.72, 0.16, length - 0.8);
  for (const side of [-1, 1]) {
    addPart(g, yellow, side * 0.92, 0.32, -length / 2, 0.18, 0.14, length - 1.2);
  }

  // Glossy Crimson Red Curved Canopy Roof with raised center dome (top cleanly at y = roof!)
  addShell(g, red, 0, roof - 0.12, -length / 2, 1.92, 0.16, length - 0.2, 0.06);
  addShell(g, red, 0, roof - 0.04, -length / 2, 1.54, 0.08, length - 0.8, 0.03);

  // Rear Gray Bumper Deck + Signature Silver Tubular Safety Guardrail (at z = 0 where runner approaches ramp!)
  addShell(g, bump, 0, 0.28, -0.35, 1.88, 0.26, 0.72, 0.06);
  addPart(g, yellow, 0, 0.34, -0.78, 1.82, 0.14, 0.26);
  // Chrome tubular U-shaped rear safety handrail
  addBar(g, chrome, [-0.66, 0.40, -0.18], [-0.66, 0.86, -0.18], 0.032);
  addBar(g, chrome, [0.66, 0.40, -0.18], [0.66, 0.86, -0.18], 0.032);
  addBar(g, chrome, [-0.66, 0.86, -0.18], [0.66, 0.86, -0.18], 0.032);
  addBar(g, chrome, [0, 0.40, -0.18], [0, 0.86, -0.18], 0.025);
  for (const sx of [-0.68, 0.68]) {
    addPart(g, MAT.ledWhite(), sx, 0.26, 0.02, 0.12, 0.12, 0.04, sphere);
    addPart(g, MAT.ledAmber(), sx * 1.15, 0.26, 0.02, 0.10, 0.10, 0.04, sphere);
  }

  // Front Curved Red Cab + Yellow Lower Nose + Tinted Windshield + Curved-Stalk Mirrors (at z = -length!)
  const fz = -length;
  addShell(g, red, 0, 0.68, fz + 0.45, 1.84, 0.72, 0.85, 0.14);
  addPart(g, yellow, 0, 0.34, fz + 0.22, 1.86, 0.32, 0.45);
  const ws = addPart(g, glass, 0, 1.24, fz + 0.46, 1.62, 0.56, 0.08);
  ws.rotation.x = 0.18;
  // Steering wheel inside front cab
  const sw = addPart(g, dark, -0.35, 1.05, fz + 1.05, 0.26, 0.05, 0.26, cyl12);
  sw.rotation.x = Math.PI / 2 - 0.3;
  for (const side of [-1, 1]) {
    addPart(g, red, side * 0.86, 1.26, fz + 0.55, 0.14, 0.68, 0.22);
    // Iconic red curved mirror arms projecting from upper cab front!
    addBar(g, red, [side * 0.86, 1.54, fz + 0.32], [side * 1.04, 1.56, fz - 0.12], 0.032);
    addPart(g, dark, side * 1.06, 1.44, fz - 0.14, 0.12, 0.22, 0.10);
    addPart(g, MAT.ledWhite(), side * 0.62, 0.54, fz - 0.01, 0.20, 0.12, 0.05);
  }

  // Open-Air Rows of Plush White Bench Seats on Red Bases + Silver Tubular Armrests + Sculpted Red Roof Pillars!
  const rowCount = Math.max(4, Math.floor((length - 2.6) / 2.35));
  const spacing = (length - 2.6) / rowCount;
  for (let i = 0; i < rowCount; i++) {
    const rz = -1.55 - i * spacing;
    // Bright red seat box base
    addPart(g, red, 0, 0.50, rz, 1.56, 0.34, 0.74);
    // Thick white padded seat cushion & white padded backrest
    addShell(g, seatW, 0, 0.72, rz + 0.05, 1.60, 0.14, 0.72, 0.04);
    addShell(g, seatW, 0, 1.04, rz - 0.24, 1.58, 0.48, 0.16, 0.05);
    // Curved silver metal side armrests on every bench!
    for (const side of [-1, 1]) {
      addBar(g, chrome, [side * 0.82, 0.74, rz + 0.26], [side * 0.82, 0.96, rz + 0.12], 0.024);
      addBar(g, chrome, [side * 0.82, 0.96, rz + 0.12], [side * 0.82, 0.96, rz - 0.24], 0.024);
    }
    // Red sculptural canopy support pillars every 2 rows
    if (i % 2 === 0 || i === rowCount - 1) {
      for (const side of [-1, 1]) {
        const pil = addPart(g, red, side * 0.86, 1.02, rz - 0.38, 0.16, roof - 0.42, 0.24);
        pil.rotation.x = 0.08;
      }
    }
  }

  // Wheel placements along the shuttle length
  const wheelZs = length > 14 ? [-2.4, -length * 0.52, -length + 2.2] : [-1.8, -length + 1.8];
  for (const wz of wheelZs) {
    for (const side of [-1, 1]) {
      addPart(g, red, side * 0.90, 0.42, wz, 0.20, 0.36, 0.98);
    }
  }

  batchStatic(g, `redShuttle:${length}:${roof}`);
  for (const wz of wheelZs) {
    for (const side of [-1, 1]) {
      addCarWheel(g, side * 0.90, 0.34, wz, chrome, 0.34, false);
    }
  }
  return g;
}

// =============================================================================
// 4. HEAVY FREIGHT CONTAINER SEMI-TRUCK (Ref 4: Sculpted Volvo FH-style Yellow/Red/Blue Cab + Corrugated Container)
// Front cab faces +Z (z = 0); container trailer extends to z = -length; flat roof at y = roof (2.8m)
// =============================================================================
export function buildFreightSemiTruck(length = 22, roof = 2.8, variantIndex = 0) {
  const g = new Group();
  g.userData.captureObstacle = true;
  g.userData.wheels = [];

  const v = Math.abs(variantIndex) % 3;
  const cabMat = v === 0 ? MAT.cabYellow() : v === 1 ? MAT.cabRed() : MAT.cabBlue();
  const boxMat = v === 0 ? MAT.boxWhite() : v === 1 ? MAT.boxCharcoal() : MAT.boxNavy();
  const roofMat = v === 0 ? MAT.boxWhiteRoof() : v === 1 ? MAT.boxCharcoalRoof() : MAT.boxNavyRoof();
  const ribMat = v === 0 ? MAT.boxWhiteRib() : v === 1 ? MAT.boxCharcoalRib() : MAT.boxNavyRib();
  const dark = MAT.darkTrim();
  const carbon = MAT.carbon();
  const glass = MAT.glassDark();
  const chrome = MAT.chrome();

  const cabLen = Math.min(2.95, length * 0.30);
  const trailerStart = -cabLen - 0.30;
  const trailerLen = Math.max(5.0, length - cabLen - 0.30);
  const trailerMid = trailerStart - trailerLen / 2;

  // 1. Sculpted Aerodynamic Cab-Over European Semi Tractor (smooth coachworkGeo — matches Ref 4 Volvo FH!)
  const cabGeo = coachworkGeo(`semiCab:${cabLen}`, [
    [-cabLen, 0.36, 2.46, 0.99, 0.94],
    [-cabLen + 1.25, 0.34, 2.48, 1.00, 0.95],
    [-0.56, 0.34, 2.38, 1.00, 0.91],
    [-0.14, 0.32, 1.54, 0.99, 0.94],
    [0.0, 0.36, 1.36, 0.93, 0.90]
  ]);
  addPart(g, cabMat, 0, 0, 0, 1, 1, 1, cabGeo);

  // Smooth sculpted aerodynamic rooftop wind deflector fairing rising cleanly to container height!
  const fairingGeo = coachworkGeo(`semiFair:${cabLen}:${roof}`, [
    [-cabLen, 2.42, roof - 0.02, 0.94, 0.92],
    [-cabLen + 0.95, 2.44, roof - 0.08, 0.93, 0.89],
    [-0.82, 2.38, 2.44, 0.90, 0.86]
  ]);
  addPart(g, cabMat, 0, 0, 0, 1, 1, 1, fairingGeo);

  // Painted matching lower tractor side skirts behind the cab (Ref 4 yellow/red/blue fuel-tank fairings!)
  const skirtLen = length >= 15 ? 1.55 : 0.90;
  for (const side of [-1, 1]) {
    addPart(g, cabMat, side * 0.95, 0.56, -cabLen - skirtLen / 2 + 0.12, 0.14, 0.42, skirtLen);
    // Side aero deflector wings hugging the rear edges of the cab
    addPart(g, cabMat, side * 0.98, 1.72, -cabLen - 0.06, 0.08, 1.55, 0.24);
  }

  // Raked wraparound dark tinted windshield + dark surround frame + overhead sun visor + twin wipers
  const wsFrame = addPart(g, carbon, 0, 1.92, -0.315, 1.82, 0.76, 0.05);
  wsFrame.rotation.x = -0.46;
  const wsPane = addPart(g, glass, 0, 1.92, -0.295, 1.72, 0.68, 0.04);
  wsPane.rotation.x = -0.46;
  const visor = addPart(g, carbon, 0, 2.28, -0.52, 1.84, 0.14, 0.22);
  visor.rotation.x = 0.24;
  for (const sx of [-0.36, 0.36]) {
    const wip = addPart(g, carbon, sx, 1.60, -0.16, 0.032, 0.38, 0.02);
    wip.rotation.z = -0.45;
  }

  // Iconic 2-Tier European Slatted Front Radiator Grille (Upper + Lower bumper grille)
  addPart(g, carbon, 0, 1.14, -0.02, 1.38, 0.42, 0.08);
  for (let s = 0; s < 4; s++) {
    addPart(g, MAT.bumperGray(), 0, 0.99 + s * 0.10, 0.025, 1.28, 0.028, 0.02);
  }
  // Chrome Volvo-style diagonal emblem accent bar across upper grille
  const sash = addPart(g, chrome, 0, 1.14, 0.035, 0.035, 0.44, 0.02);
  sash.rotation.z = -0.95;
  // Lower bumper air intake grille + license plate
  addPart(g, carbon, 0, 0.68, 0.00, 1.16, 0.26, 0.06);
  for (let s = 0; s < 3; s++) {
    addPart(g, MAT.bumperGray(), 0, 0.60 + s * 0.08, 0.035, 1.06, 0.022, 0.02);
  }
  addPart(g, chrome, 0, 0.41, 0.025, 0.44, 0.10, 0.02);

  // Signature Vertical Angled Bright-White LED Headlights + Cab Side Windows + Twin Wing Mirrors + Wheel Arches
  for (const side of [-1, 1]) {
    // Lower corner vertical LED headlight pod (matches Ref 4 bright vertical twin LEDs!)
    addPart(g, carbon, side * 0.78, 0.62, 0.01, 0.28, 0.34, 0.06);
    addPart(g, MAT.ledWhite(), side * 0.76, 0.62, 0.045, 0.14, 0.26, 0.03);
    addPart(g, MAT.ledWhite(), side * 0.86, 0.70, 0.045, 0.05, 0.14, 0.03);
    addPart(g, MAT.ledAmber(), side * 0.87, 0.50, 0.045, 0.07, 0.07, 0.03);
    // Main door window + smaller rear sleeper side window (exact Ref 4 cab side layout!)
    addPart(g, glass, side * 0.99, 1.86, -0.96, 0.05, 0.56, 0.96);
    addPart(g, glass, side * 0.99, 1.88, -2.08, 0.05, 0.48, 0.58);
    addPart(g, carbon, side * 1.005, 1.86, -1.52, 0.03, 0.56, 0.12);
    // Sleek black aerodynamic wing mirrors on curved upper arms
    addBar(g, carbon, [side * 0.98, 2.08, -0.58], [side * 1.16, 2.04, -0.46], 0.022);
    addBar(g, carbon, [side * 0.98, 1.70, -0.58], [side * 1.16, 1.72, -0.46], 0.020);
    addPart(g, carbon, side * 1.17, 1.88, -0.45, 0.09, 0.42, 0.14);
    // Door step recess & wheel-arch flare over steer tire
    addPart(g, carbon, side * 0.98, 0.54, -1.10, 0.08, 0.36, 0.98);
    const arch = addPart(g, cabMat, side * 0.99, 0.46, -1.10, 1.12, 1.12, 1.12, wheelArch);
    arch.rotation.y = Math.PI / 2;
  }

  // 2. Heavy Steel Trailer Chassis + Clean Tonal Corrugated Cargo Container (flat roof at y = roof = 2.8m!)
  addPart(g, dark, 0, 0.62, trailerMid, 1.68, 0.24, trailerLen);
  const contBottom = 0.74;
  const contH = roof - contBottom;
  const contY = contBottom + contH / 2;
  // Main container box + slightly brighter smooth flat top roof deck (matches Ref 4!)
  addPart(g, boxMat, 0, contY, trailerMid, 2.02, contH - 0.04, trailerLen);
  addPart(g, roofMat, 0, roof - 0.03, trailerMid, 2.04, 0.06, trailerLen + 0.02);
  // Front & rear crisp vertical corner posts
  for (const sx of [-1, 1]) {
    addPart(g, ribMat, sx * 0.99, contY, trailerStart - 0.05, 0.10, contH, 0.10);
    addPart(g, ribMat, sx * 0.99, contY, -length + 0.05, 0.10, contH, 0.10);
  }
  // Subtle tonal horizontal metal corrugations along both trailer flanks (clean metallic look, zero zebra glitch!)
  for (const side of [-1, 1]) {
    for (let ry = contBottom + 0.14; ry < roof - 0.10; ry += 0.18) {
      addPart(g, ribMat, side * 1.02, ry, trailerMid, 0.022, 0.065, trailerLen - 0.24);
    }
    // Realistic side underrun safety guard rail & landing gear leg beneath trailer
    addPart(g, dark, side * 0.94, 0.42, trailerMid + 0.9, 0.07, 0.14, trailerLen * 0.46);
    addPart(g, dark, side * 0.72, 0.40, trailerStart - 1.5, 0.10, 0.56, 0.10);
    // Tiny crisp amber clearance marker LEDs along top & bottom trailer rail
    for (let mz = trailerStart - 1.4; mz > -length + 1.0; mz -= 3.6) {
      addPart(g, MAT.ledAmber(), side * 1.03, roof - 0.10, mz, 0.025, 0.05, 0.12);
      addPart(g, MAT.ledAmber(), side * 1.02, contBottom + 0.05, mz, 0.025, 0.05, 0.12);
    }
  }
  // Rear container double doors + twin vertical chrome locking rods + rear taillight bar (at z = -length)
  addPart(g, ribMat, 0, contY, -length - 0.015, 0.05, contH - 0.10, 0.03);
  for (const sx of [-0.36, 0.36]) addPart(g, chrome, sx, contY, -length - 0.03, 0.035, contH - 0.18, 0.035);
  addPart(g, dark, 0, 0.48, -length - 0.04, 1.98, 0.22, 0.14);
  for (const side of [-1, 1]) {
    addPart(g, MAT.ledRed(), side * 0.74, 0.48, -length - 0.12, 0.30, 0.10, 0.03);
    addPart(g, MAT.ledAmber(), side * 0.52, 0.48, -length - 0.12, 0.10, 0.10, 0.03);
  }

  batchStatic(g, `semiV2:${length}:${roof}:${v}`);

  // Tractor Steer + Drive Axles + Iconic Triple Rear Trailer Axles (Ref 4!)
  const axleZs = length >= 15
    ? [-1.10, -cabLen - 1.25, -length + 3.45, -length + 2.35, -length + 1.25]
    : [-1.10, -length + 2.45, -length + 1.30];
  for (const az of axleZs) {
    for (const side of [-1, 1]) {
      const w = addPart(g, MAT.rubber(), side * 0.94, 0.42, az, 1, 1, 1, tyreBig);
      w.rotation.z = Math.PI / 2;
      const hub = new Group();
      hub.position.set(side * 1.09, 0.42, az);
      g.add(hub);
      g.userData.wheels.push(hub);
      if (!batchCache.has('semiWheelHub')) {
        const disc = new Mesh(cyl12, chrome);
        disc.scale.set(0.24, 0.03, 0.24);
        disc.rotation.z = Math.PI / 2;
        hub.add(disc);
        const cap = new Mesh(cyl12, dark);
        cap.scale.set(0.11, 0.045, 0.11);
        cap.rotation.z = Math.PI / 2;
        hub.add(cap);
        for (let i = 0; i < 5; i++) {
          const lug = new Mesh(cube, dark);
          const a = (i / 5) * Math.PI * 2;
          lug.scale.set(0.035, 0.04, 0.04);
          lug.position.set(0, Math.cos(a) * 0.17, Math.sin(a) * 0.17);
          hub.add(lug);
        }
      }
      batchStatic(hub, 'semiWheelHub', false);
    }
  }
  return g;
}

// =============================================================================
// 5. DUCATI STREETFIGHTER V4 S SUPERBIKE (Ref 6: Corsa Red + Gold Ohlins Forks + Biplane Winglets)
// Front faces +Z; spans [-length..0] when centered=false, or centered at z=0 when centered=true
// =============================================================================
export function buildDucatiStreetfighter(centered = false, withRider = true) {
  const g = new Group();
  g.userData.captureObstacle = true;
  g.userData.wheels = [];
  const zShift = centered ? 0 : -1.15;

  const red = MAT.ducatiRed();
  const gold = MAT.ohlinsGold();
  const bronze = MAT.engineBronze();
  const carbon = MAT.carbon();
  const chrome = MAT.chrome();
  const dark = MAT.darkTrim();

  // Sculpted Ducati Corsa Red angular tank, aggressive tail cowl & predator headlight mask
  const tankGeo = extrude2D('ducTank', [[-0.24, 0.66], [-0.08, 0.98], [0.22, 1.02], [0.38, 0.84], [0.24, 0.64]], 0.34, 0.04);
  const tank = addPart(g, red, 0.17, 0, zShift, 1, 1, 1, tankGeo);
  tank.rotation.y = -Math.PI / 2;

  const tailGeo = extrude2D('ducTail', [[-0.92, 0.88], [-0.82, 1.02], [-0.26, 0.84], [-0.30, 0.72]], 0.24, 0.03);
  const tail = addPart(g, red, 0.12, 0, zShift, 1, 1, 1, tailGeo);
  tail.rotation.y = -Math.PI / 2;

  // Low aggressive Streetfighter predator nose fairing + twin fierce white LED brow headlights!
  addShell(g, red, 0, 0.86, 0.56 + zShift, 0.28, 0.18, 0.24, 0.04);
  addPart(g, carbon, 0, 0.76, 0.62 + zShift, 0.24, 0.10, 0.12);
  for (const side of [-1, 1]) {
    const brow = addPart(g, MAT.ledWhite(), side * 0.085, 0.80, 0.68 + zShift, 0.11, 0.035, 0.04);
    brow.rotation.z = side * 0.25;
  }

  // Signature Black Biplane Carbon Aero Winglets flanking the radiator!
  for (const side of [-1, 1]) {
    const wing1 = addPart(g, carbon, side * 0.26, 0.68, 0.30 + zShift, 0.20, 0.035, 0.22);
    wing1.rotation.z = -side * 0.18;
    const wing2 = addPart(g, carbon, side * 0.25, 0.55, 0.24 + zShift, 0.18, 0.035, 0.20);
    wing2.rotation.z = -side * 0.18;
    // Red radiator shroud cheek panels
    addPart(g, red, side * 0.17, 0.72, 0.26 + zShift, 0.08, 0.24, 0.30);
    // Iconic Anodized Gold Öhlins Upside-Down Front Forks!
    addBar(g, gold, [side * 0.10, 0.36, 0.72 + zShift], [side * 0.08, 0.98, 0.44 + zShift], 0.034);
    addBar(g, chrome, [side * 0.10, 0.34, 0.74 + zShift], [side * 0.09, 0.54, 0.64 + zShift], 0.024);
    // Wide handlebars + black dual wing mirrors
    addBar(g, chrome, [side * 0.24, 1.02, 0.44 + zShift], [side * 0.30, 1.18, 0.48 + zShift], 0.012);
    addPart(g, carbon, side * 0.32, 1.20, 0.48 + zShift, 0.13, 0.07, 0.04);
  }
  addBar(g, carbon, [-0.36, 1.00, 0.44 + zShift], [0.36, 1.00, 0.44 + zShift], 0.024);
  // Front matte-black mudguard over front wheel
  const mud = addPart(g, carbon, 0, 0.44, 0.70 + zShift, 0.24, 0.48, 0.42, wheelArch);
  mud.rotation.y = Math.PI / 2;

  // Exposed Champagne-Bronze V4 Engine Block + Red Belly Pan + Silver Underbelly Exhaust + Single-Sided Swingarm!
  addPart(g, dark, 0, 0.52, 0.04 + zShift, 0.34, 0.38, 0.52);
  addPart(g, bronze, 0, 0.48, 0.02 + zShift, 0.38, 0.24, 0.26, cyl12);
  addPart(g, red, 0, 0.26, 0.10 + zShift, 0.26, 0.16, 0.56);
  const ex = addPart(g, chrome, 0.16, 0.28, -0.20 + zShift, 0.12, 0.42, 0.14, cyl12);
  ex.rotation.x = Math.PI / 2 - 0.18;
  addBar(g, carbon, [-0.14, 0.44, -0.18 + zShift], [-0.13, 0.34, -0.72 + zShift], 0.042);

  // Split black/red sport seat + LED taillight
  addPart(g, carbon, 0, 0.80, -0.26 + zShift, 0.26, 0.09, 0.38);
  addPart(g, red, 0, 0.84, -0.44 + zShift, 0.24, 0.06, 0.16);
  addPart(g, carbon, 0, 0.94, -0.66 + zShift, 0.20, 0.09, 0.28);
  addPart(g, MAT.ledRed(), 0, 0.92, -0.94 + zShift, 0.16, 0.06, 0.04);

  // Sport rider crouched on the Streetfighter when moving in live traffic
  if (withRider) {
    addPart(g, MAT.riderSuit(), 0, 1.24, -0.18 + zShift, 0.30, 0.46, 0.22, sphere);
    addPart(g, red, 0, 1.30, -0.30 + zShift, 0.22, 0.28, 0.10);
    addPart(g, MAT.riderSkin(), 0, 1.58, -0.06 + zShift, 0.16, 0.18, 0.16, sphere);
    addPart(g, carbon, 0, 1.65, -0.06 + zShift, 0.22, 0.20, 0.24, sphere);
    addPart(g, MAT.glassDark(), 0, 1.63, 0.06 + zShift, 0.20, 0.08, 0.05);
    for (const side of [-1, 1]) {
      addBar(g, MAT.riderSuit(), [side * 0.17, 1.36, -0.12 + zShift], [side * 0.28, 1.12, 0.18 + zShift], 0.048);
      addBar(g, MAT.riderSuit(), [side * 0.28, 1.12, 0.18 + zShift], [side * 0.32, 1.00, 0.44 + zShift], 0.038);
      addBar(g, carbon, [side * 0.13, 1.02, -0.24 + zShift], [side * 0.21, 0.68, 0.06 + zShift], 0.072);
      addBar(g, carbon, [side * 0.21, 0.68, 0.06 + zShift], [side * 0.22, 0.38, -0.18 + zShift], 0.055);
    }
  }

  batchStatic(g, `ducati:${centered}:${withRider}`);

  // Fat black sport motorcycle tires with silver brake rotors & Ducati red rim accent!
  for (const wz of [-0.72 + zShift, 0.72 + zShift]) {
    const tire = addPart(g, MAT.rubber(), 0, 0.35, wz, 1, 1, 1.15, tyreMoto);
    tire.rotation.y = Math.PI / 2;
    const hub = new Group();
    hub.position.set(0, 0.35, wz);
    g.add(hub);
    g.userData.wheels.push(hub);
    const rotor = new Mesh(cyl16, chrome);
    rotor.scale.set(0.22, 0.04, 0.22);
    rotor.rotation.z = Math.PI / 2;
    hub.add(rotor);
    const accent = new Mesh(cube, red);
    accent.scale.set(0.08, 0.05, 0.44);
    hub.add(accent);
  }
  return g;
}

// =============================================================================
// 6. GLOSSY WHITE HUMANOID AI ROBOT WITH GLOWING NEON-GREEN EYES (Ref 5)
// pose: 'wave' (standing tall ~2.05m for block), 'seated' (exact Ref 5 sitting pose ~0.95m for jump),
//       'head' (compact sentinel head for slide archways)
// =============================================================================
export function buildHumanoidRobot(pose = 'wave') {
  const g = new Group();
  const white = MAT.robotWhite();
  const black = MAT.robotBlack();
  const greenEye = MAT.robotEyeGreen();
  const chrome = MAT.chrome();

  function addRobotHead(parent, y, scale = 1) {
    const head = new Group();
    head.position.set(0, y, 0);
    head.scale.setScalar(scale);
    parent.add(head);
    // Big smooth glossy-white spherical head
    addPart(head, white, 0, 0, 0, 0.34, 0.31, 0.32, sphere);
    // Curved glossy-black recessed visor screen across front face
    addPart(head, black, 0, -0.02, 0.14, 0.27, 0.135, 0.21, sphere);
    // Twin bright glowing neon-green circular LED eyes (Ref 5's iconic friendly expression!)
    for (const sx of [-0.095, 0.095]) {
      addPart(head, greenEye, sx, -0.015, 0.325, 0.046, 0.046, 0.022, sphere);
    }
    // Round sculpted white ear discs
    for (const side of [-1, 1]) {
      const ear = addPart(head, white, side * 0.33, 0, 0, 0.10, 0.04, 0.10, cyl12);
      ear.rotation.z = Math.PI / 2;
      const earRing = addPart(head, chrome, side * 0.345, 0, 0, 0.065, 0.03, 0.065, cyl12);
      earRing.rotation.z = Math.PI / 2;
    }
    batchStatic(head, `robotHead:${scale}`);
    return head;
  }

  function addWavingRightArm(parent, x, y, z, scale = 1) {
    const arm = new Group();
    arm.position.set(x, y, z);
    arm.scale.setScalar(scale);
    parent.add(arm);
    // Black shoulder ball joint
    addPart(arm, black, 0, 0, 0, 0.095, 0.095, 0.095, sphere);
    // Upper arm angled outward & slightly up
    addBar(arm, white, [0.02, 0, 0], [0.24, 0.14, 0.04], 0.072);
    // Black elbow ball joint
    addPart(arm, black, 0.26, 0.16, 0.05, 0.082, 0.082, 0.082, sphere);
    // Raised forearm pointing up to wave!
    addBar(arm, white, [0.26, 0.18, 0.05], [0.34, 0.48, 0.08], 0.075);
    // Black wrist joint + glossy white palm + 4 black-jointed articulated fingers & thumb (exact Ref 5 waving hand!)
    addPart(arm, black, 0.35, 0.50, 0.08, 0.06, 0.06, 0.06, sphere);
    addShell(arm, white, 0.36, 0.59, 0.09, 0.13, 0.14, 0.055, 0.02);
    for (let f = 0; f < 4; f++) {
      const fx = 0.31 + f * 0.034;
      addPart(arm, black, fx, 0.67, 0.09, 0.022, 0.022, 0.022, sphere);
      addPart(arm, white, fx, 0.72, 0.09, 0.024, 0.075, 0.024);
      addPart(arm, black, fx, 0.76, 0.09, 0.020, 0.020, 0.020, sphere);
      addPart(arm, white, fx, 0.80, 0.09, 0.022, 0.055, 0.022);
    }
    // Thumb
    const thumb = addPart(arm, white, 0.28, 0.61, 0.10, 0.026, 0.085, 0.026);
    thumb.rotation.z = 0.55;
    batchStatic(arm, `robotArm:${scale}`);
    return arm;
  }

  if (pose === 'head') {
    addRobotHead(g, 0, 0.85);
    return g;
  }

  if (pose === 'seated') {
    // Exact Ref 5 Seated Waving Pose (~0.94m tall — clean low jump-over obstacle!)
    // Sleek circular glowing tech charging mat under the seated robot
    addPart(g, chrome, 0, 0.03, 0.15, 0.68, 0.06, 0.68, cyl16);
    addPart(g, greenEye, 0, 0.065, 0.15, 0.56, 0.015, 0.56, cyl16);
    // Pelvis + glossy black waist + contoured white torso
    addPart(g, white, 0, 0.16, -0.06, 0.22, 0.13, 0.19, sphere);
    addPart(g, black, 0, 0.26, -0.06, 0.14, 0.11, 0.14, cyl12);
    addPart(g, white, 0, 0.43, -0.06, 0.25, 0.22, 0.18, sphere);
    addPart(g, chrome, 0, 0.58, -0.06, 0.08, 0.08, 0.08, cyl12);
    // Left arm resting casually down beside leg
    addPart(g, black, -0.24, 0.48, -0.04, 0.065, 0.065, 0.065, sphere);
    addBar(g, white, [-0.26, 0.46, -0.03], [-0.34, 0.24, 0.08], 0.055);
    addPart(g, black, -0.35, 0.22, 0.09, 0.058, 0.058, 0.058, sphere);
    addBar(g, white, [-0.35, 0.20, 0.10], [-0.36, 0.09, 0.28], 0.055);
    addPart(g, white, -0.36, 0.08, 0.34, 0.10, 0.045, 0.12);
    // Seated legs stretched forward toward the runner with black knee joints & chunky white robot boots!
    for (const side of [-1, 1]) {
      const lx = side * 0.13;
      addPart(g, black, lx, 0.14, 0.05, 0.075, 0.075, 0.075, sphere);
      addBar(g, white, [lx, 0.14, 0.08], [lx * 1.15, 0.16, 0.36], 0.078);
      addPart(g, black, lx * 1.15, 0.16, 0.39, 0.072, 0.072, 0.072, sphere);
      addBar(g, white, [lx * 1.15, 0.15, 0.42], [lx * 1.25, 0.12, 0.68], 0.082);
      addShell(g, white, lx * 1.25, 0.15, 0.74, 0.14, 0.22, 0.12, 0.04);
    }
    batchStatic(g, 'robotBody:seated');
    // Big round friendly head with glowing green eyes
    const head = addRobotHead(g, 0.77, 0.76);
    head.rotation.z = -0.08;
    // Right arm raised waving! (Animated in renderer3d!)
    const waveArm = addWavingRightArm(g, 0.24, 0.48, -0.04, 0.64);
    g.userData.waveArm = waveArm;
    return g;
  }

  // Default: Standing Tall Greeting AI Humanoid Robot (~2.02m tall — unmistakable full-lane block!)
  // Sleek illuminated circular charging pedestal base
  addPart(g, MAT.darkTrim(), 0, 0.06, 0, 0.62, 0.12, 0.62, cyl16);
  addPart(g, greenEye, 0, 0.125, 0, 0.52, 0.02, 0.52, cyl16);
  // Standing legs with chunky glossy-white shell shins/thighs & black ankle/knee/hip ball joints
  for (const side of [-1, 1]) {
    const lx = side * 0.18;
    addShell(g, white, lx, 0.19, 0.06, 0.19, 0.13, 0.34, 0.05);
    addPart(g, black, lx, 0.28, 0, 0.085, 0.085, 0.085, sphere);
    addBar(g, white, [lx, 0.30, 0], [lx, 0.68, 0], 0.105);
    addPart(g, black, lx, 0.71, 0, 0.095, 0.095, 0.095, sphere);
    addBar(g, white, [lx, 0.74, 0], [lx, 1.04, 0], 0.115);
  }
  // Pelvis, black mechanical waist, glossy sculpted white torso & neck collar
  addPart(g, white, 0, 1.07, 0, 0.27, 0.16, 0.22, sphere);
  addPart(g, black, 0, 1.21, 0, 0.17, 0.15, 0.16, cyl12);
  addPart(g, white, 0, 1.44, 0, 0.32, 0.27, 0.22, sphere);
  // Subtle green status chest indicator
  addPart(g, greenEye, 0, 1.46, 0.21, 0.08, 0.03, 0.02);
  addPart(g, chrome, 0, 1.64, 0, 0.10, 0.10, 0.10, cyl12);
  // Left articulated arm relaxed at side
  addPart(g, black, -0.34, 1.52, 0, 0.095, 0.095, 0.095, sphere);
  addBar(g, white, [-0.36, 1.50, 0], [-0.44, 1.18, 0.04], 0.074);
  addPart(g, black, -0.45, 1.15, 0.05, 0.082, 0.082, 0.082, sphere);
  addBar(g, white, [-0.45, 1.12, 0.05], [-0.46, 0.84, 0.12], 0.072);
  addShell(g, white, -0.46, 0.76, 0.14, 0.11, 0.13, 0.06, 0.02);
  batchStatic(g, 'robotBody:wave');
  // Iconic Oversized Round Glossy-White Head with Curved Black Visor & Glowing Neon-Green Eyes!
  addRobotHead(g, 1.88, 1.0);
  // Right articulated arm raised waving hello!
  const waveArm = addWavingRightArm(g, 0.34, 1.52, 0, 0.96);
  g.userData.waveArm = waveArm;
  return g;
}
