import {
  BoxGeometry,
  CanvasTexture,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  RepeatWrapping,
  SphereGeometry,
  SRGBColorSpace,
  TorusGeometry
} from './vendor/three.module.js';
import { forkPlanAt, METRO_FIRST, METRO_STRIDE } from './road-events.js';
import { branchCurveY, curveRelX, curveRelY, curveSlopeAt, roadCurveSlope } from './campus-layout.js';
import { mergeGeometries } from './vendor/BufferGeometryUtils.js';

const cube = new BoxGeometry(1, 1, 1);
const rockGeo = new IcosahedronGeometry(1, 0);
const boomGeo = new CylinderGeometry(0.16, 0.34, 1, 12);
const coneGeo = new ConeGeometry(1, 1, 10);

// Bake a static template into one mesh per material (keeps mobile draw calls low).
function bakeGroup(group) {
  group.updateMatrixWorld(true);
  const batches = new Map();
  group.traverse(o => {
    if (!o.isMesh) return;
    const geo = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()).applyMatrix4(o.matrixWorld);
    if (!batches.has(o.material)) batches.set(o.material, []);
    batches.get(o.material).push(geo);
  });
  const out = new Group();
  for (const [mat, list] of batches) {
    const mesh = new Mesh(mergeGeometries(list), mat);
    mesh.receiveShadow = true;
    out.add(mesh);
    for (const geo of list) geo.dispose();
  }
  return out;
}

function hash01(n) {
  const v = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
}
const cyl12 = new CylinderGeometry(1, 1, 1, 12);
const cyl16 = new CylinderGeometry(1, 1, 1, 16);
const sphere = new SphereGeometry(1, 12, 8);
const ringGeo = new TorusGeometry(0.45, 0.065, 8, 18);
const planeGeo = new PlaneGeometry(1, 1);

const sharedMats = new Map();
function getMat(key, opts) {
  if (!sharedMats.has(key)) sharedMats.set(key, new MeshStandardMaterial(opts));
  return sharedMats.get(key);
}

function makeCanvasMat(key, w, h, drawFn, opts = {}) {
  if (sharedMats.has(key)) return sharedMats.get(key);
  if (typeof document === 'undefined') {
    return getMat(key + ':fb', { color: opts.fallback || 0x1d4ed8, roughness: 0.4, metalness: 0.2 });
  }
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d');
  if (!ctx) return getMat(key + ':fb', { color: opts.fallback || 0x1d4ed8, roughness: 0.4 });
  drawFn(ctx, w, h);
  const tex = new CanvasTexture(cv);
  tex.colorSpace = SRGBColorSpace;
  const mat = new MeshStandardMaterial({
    map: tex,
    emissiveMap: opts.emissive ? tex : null,
    emissive: opts.emissive ? 0xffffff : 0x000000,
    emissiveIntensity: opts.emissiveIntensity ?? 0.35,
    roughness: opts.roughness ?? 0.35,
    metalness: opts.metalness ?? 0.15,
    transparent: Boolean(opts.transparent),
    opacity: opts.opacity ?? 1,
    side: opts.doubleSide ? DoubleSide : 0
  });
  sharedMats.set(key, mat);
  return mat;
}

function part(parent, mat, x, y, z, w, h, d, geo = cube) {
  const m = new Mesh(geo, mat);
  m.position.set(x, y, z);
  m.scale.set(Math.abs(w), Math.abs(h), Math.abs(d));
  m.castShadow = false;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

function drawRoundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// Reusable Vibrant Textures matching the uploaded Reference Images!
function hazardMat() {
  return makeCanvasMat('hazardStripes', 256, 128, (ctx, w, h) => {
    ctx.fillStyle = '#facc15';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#18181b';
    for (let x = -h; x < w + h; x += 44) {
      ctx.beginPath();
      ctx.moveTo(x, h); ctx.lineTo(x + 22, h); ctx.lineTo(x + 22 + h * 0.75, 0); ctx.lineTo(x + h * 0.75, 0);
      ctx.closePath(); ctx.fill();
    }
  }, { fallback: 0xfacc15, roughness: 0.45, emissive: false });
}

// Exact Reference Image 2 Left Highway Sign: [↖] Glass Bridge + glowing suspension bridge graphic
function glassBridgeSignMat() {
  return makeCanvasMat('signGlassBridge', 512, 224, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#0c46c9'); g.addColorStop(0.5, '#1562e8'); g.addColorStop(1, '#0938a8');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // Bright glowing cyan-white rounded border frame
    ctx.strokeStyle = '#38e8ff';
    ctx.lineWidth = 14;
    drawRoundedRect(ctx, 9, 9, w - 18, h - 18, 22);
    ctx.stroke();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 5;
    drawRoundedRect(ctx, 18, 18, w - 36, h - 36, 16);
    ctx.stroke();

    // Bold white up-left arrow (↖) on the left side
    ctx.save();
    ctx.translate(78, 108);
    ctx.rotate(-Math.PI / 4);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-13, -10, 26, 62);
    ctx.beginPath();
    ctx.moveTo(0, -56); ctx.lineTo(42, -6); ctx.lineTo(-42, -6);
    ctx.closePath(); ctx.fill();
    ctx.restore();

    // Crisp title "Glass Bridge"
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 50px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Glass Bridge', 310, 82, 330);

    // Glowing cyan/white suspension bridge line-art graphic below title
    ctx.strokeStyle = '#e0f7ff';
    ctx.lineWidth = 5;
    // Deck line
    ctx.beginPath(); ctx.moveTo(156, 180); ctx.lineTo(462, 180); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(156, 168); ctx.lineTo(462, 168); ctx.stroke();
    // Twin bridge towers
    for (const tx of [240, 380]) {
      ctx.beginPath(); ctx.moveTo(tx, 182); ctx.lineTo(tx, 108); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(tx - 10, 124); ctx.lineTo(tx + 10, 124); ctx.stroke();
    }
    // Suspension cables
    ctx.strokeStyle = '#67e8f9';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(164, 168); ctx.quadraticCurveTo(205, 146, 240, 114);
    ctx.quadraticCurveTo(310, 158, 380, 114);
    ctx.quadraticCurveTo(415, 146, 454, 168);
    ctx.stroke();
    // Vertical suspender wires
    ctx.lineWidth = 2.5;
    for (let sx = 182; sx <= 438; sx += 24) {
      const topY = sx < 240 ? 150 - (sx - 182) * 0.48 : sx > 380 ? 124 + (sx - 380) * 0.52 : 138 + Math.abs(sx - 310) * 0.14;
      ctx.beginPath(); ctx.moveTo(sx, topY); ctx.lineTo(sx, 168); ctx.stroke();
    }
  }, { fallback: 0x1457d6, emissive: true, emissiveIntensity: 0.56 });
}

// Exact Reference Image 2 Right Highway Sign: Underpass [↘] + glowing cyan tunnel arch icon
function underpassForkSignMat(rail = false) {
  return makeCanvasMat(rail ? 'signMetroFork' : 'signUnderpassFork', 512, 224, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#0938a8'); g.addColorStop(0.5, '#1562e8'); g.addColorStop(1, '#0c46c9');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // Bright glowing cyan-white rounded border frame
    ctx.strokeStyle = '#38e8ff';
    ctx.lineWidth = 14;
    drawRoundedRect(ctx, 9, 9, w - 18, h - 18, 22);
    ctx.stroke();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 5;
    drawRoundedRect(ctx, 18, 18, w - 36, h - 36, 16);
    ctx.stroke();

    // Crisp title "Underpass"
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 50px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(rail ? 'Metro Rail' : 'Underpass', 210, 82, 310);

    // Bold white down-right arrow (↘) on the right side
    ctx.save();
    ctx.translate(428, 114);
    ctx.rotate(Math.PI * 0.75);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-13, -10, 26, 62);
    ctx.beginPath();
    ctx.moveTo(0, -56); ctx.lineTo(42, -6); ctx.lineTo(-42, -6);
    ctx.closePath(); ctx.fill();
    ctx.restore();

    // Glowing cyan tunnel arch graphic below title
    const cx = 210, cy = 186;
    ctx.strokeStyle = '#38e8ff';
    ctx.lineWidth = 8;
    ctx.beginPath(); ctx.arc(cx, cy, 74, Math.PI, 0); ctx.stroke();
    ctx.fillStyle = 'rgba(0, 229, 255, 0.25)';
    ctx.beginPath(); ctx.arc(cx, cy, 70, Math.PI, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#0a2558';
    ctx.beginPath(); ctx.arc(cx, cy, 44, Math.PI, 0); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#e0f7ff';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(cx, cy, 44, Math.PI, 0); ctx.stroke();
    // Radial tunnel arch rib marks
    ctx.strokeStyle = '#67e8f9';
    ctx.lineWidth = 3;
    for (let a = Math.PI + 0.35; a < Math.PI * 2 - 0.25; a += 0.42) {
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * 46, cy + Math.sin(a) * 46);
      ctx.lineTo(cx + Math.cos(a) * 70, cy + Math.sin(a) * 70);
      ctx.stroke();
    }
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(cx - 88, cy); ctx.lineTo(cx + 88, cy); ctx.stroke();
  }, { fallback: 0x1457d6, emissive: true, emissiveIntensity: 0.56 });
}

// Exact Reference Image 2 Center Pier: 3 Stacked Glowing Electric-Cyan Upward Chevrons (^^^)
function centerPierChevronsMat() {
  return makeCanvasMat('centerPierChevrons', 192, 320, (ctx, w, h) => {
    ctx.fillStyle = '#9aa8b8';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#143055';
    drawRoundedRect(ctx, 18, 16, w - 36, h - 32, 18);
    ctx.fill();
    ctx.fillStyle = '#00ecff';
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 16;
    for (let i = 0; i < 3; i++) {
      const y = 74 + i * 82;
      ctx.beginPath();
      ctx.moveTo(w / 2, y - 36);
      ctx.lineTo(w - 34, y + 18);
      ctx.lineTo(w - 34, y + 48);
      ctx.lineTo(w / 2, y - 4);
      ctx.lineTo(34, y + 48);
      ctx.lineTo(34, y + 18);
      ctx.closePath();
      ctx.fill();
    }
  }, { fallback: 0x00e5ff, emissive: true, emissiveIntensity: 0.92 });
}

function exitPortalSignMat(label) {
  return makeCanvasMat('exitSign:' + label, 512, 128, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, '#0c46c9'); g.addColorStop(0.5, '#0ea5e9'); g.addColorStop(1, '#0c46c9');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#67e8f9'; ctx.lineWidth = 10; ctx.strokeRect(8, 8, w - 16, h - 16);
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 46px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, w / 2, 82, 460);
  }, { fallback: 0x0ea5e9, emissive: true, emissiveIntensity: 0.58 });
}

function tunnelChevronMat(pointRight = true) {
  return makeCanvasMat('tChev:' + pointRight, 256, 160, (ctx, w, h) => {
    ctx.fillStyle = '#0d32a6';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#38e8ff'; ctx.lineWidth = 10; ctx.strokeRect(6, 6, w - 12, h - 12);
    ctx.fillStyle = '#00f0ff';
    for (let i = 0; i < 3; i++) {
      const cx = 48 + i * 68;
      ctx.beginPath();
      if (pointRight) {
        ctx.moveTo(cx - 18, 24); ctx.lineTo(cx + 14, 24); ctx.lineTo(cx + 44, h / 2);
        ctx.lineTo(cx + 14, h - 24); ctx.lineTo(cx - 18, h - 24); ctx.lineTo(cx + 14, h / 2);
      } else {
        ctx.moveTo(cx + 38, 24); ctx.lineTo(cx + 6, 24); ctx.lineTo(cx - 24, h / 2);
        ctx.lineTo(cx + 6, h - 24); ctx.lineTo(cx + 38, h - 24); ctx.lineTo(cx + 6, h / 2);
      }
      ctx.closePath(); ctx.fill();
    }
  }, { fallback: 0x00e5ff, emissive: true, emissiveIntensity: 1.05 });
}

function turboPadMat() {
  return makeCanvasMat('turboPadTex', 256, 384, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#c026d3'); g.addColorStop(0.5, '#a21caf'); g.addColorStop(1, '#7e22ce');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#67e8f9'; ctx.lineWidth = 14; ctx.strokeRect(10, 10, w - 20, h - 20);
    ctx.fillStyle = '#ffffff';
    for (const cy of [120, 260]) {
      ctx.beginPath();
      ctx.moveTo(w / 2, cy - 58); ctx.lineTo(w - 36, cy + 28); ctx.lineTo(w - 36, cy + 72);
      ctx.lineTo(w / 2, cy - 12); ctx.lineTo(36, cy + 72); ctx.lineTo(36, cy + 28);
      ctx.closePath(); ctx.fill();
    }
  }, { fallback: 0xd946ef, emissive: true, emissiveIntensity: 0.95 });
}

function jumpPadMat() {
  return makeCanvasMat('jumpPadTex', 256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#064e3b'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#22ff66'; ctx.lineWidth = 14; ctx.strokeRect(10, 10, w - 20, h - 20);
    ctx.fillStyle = '#4ade80';
    ctx.beginPath();
    ctx.moveTo(w / 2, 34); ctx.lineTo(w - 42, 134); ctx.lineTo(w - 86, 134);
    ctx.lineTo(w - 86, 214); ctx.lineTo(86, 214); ctx.lineTo(86, 134); ctx.lineTo(42, 134);
    ctx.closePath(); ctx.fill();
  }, { fallback: 0x22ff66, emissive: true, emissiveIntensity: 0.95 });
}

function mysteryBoxFaceMat() {
  return makeCanvasMat('mysteryQFace', 256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#facc15'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#dc2626'; ctx.fillRect(24, 24, w - 48, h - 48);
    ctx.strokeStyle = '#991b1b'; ctx.lineWidth = 8; ctx.strokeRect(24, 24, w - 48, h - 48);
    ctx.fillStyle = '#1f2937';
    for (const [bx, by] of [[0, 0], [w - 34, 0], [0, h - 34], [w - 34, h - 34]]) ctx.fillRect(bx, by, 34, 34);
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 148px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('?', w / 2, 184);
  }, { fallback: 0xdc2626, emissive: true, emissiveIntensity: 0.42 });
}

function letterBadgeMat(letter) {
  return makeCanvasMat('letter:' + letter, 256, 256, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 18, w / 2, h / 2, w / 2);
    g.addColorStop(0, '#fef08a'); g.addColorStop(0.65, '#f59e0b'); g.addColorStop(1, '#b45309');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 14; ctx.strokeRect(12, 12, w - 24, h - 24);
    ctx.fillStyle = '#0f172a';
    ctx.font = '900 162px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(letter, w / 2, 186);
  }, { fallback: 0xfacc15, emissive: true, emissiveIntensity: 0.55 });
}

// =============================================================================
// EXPORTED: Build Interactive Road Event 3D Meshes (Pads, Quadcopter Drone + ? Crate, L-M-S-K)
// =============================================================================
export function buildRoadEventMesh(type, item = {}) {
  const g = new Group();
  const cyanGlow = getMat('evCyanGlow', { color: 0x00e5ff, emissive: 0x00e5ff, emissiveIntensity: 1.25, roughness: 0.15 });
  const whiteGloss = getMat('evWhite', { color: 0xf8fafc, roughness: 0.16, metalness: 0.22 });
  const darkMetal = getMat('evDark', { color: 0x1e293b, roughness: 0.35, metalness: 0.58 });
  const goldMat = getMat('evGold', { color: 0xfacc15, emissive: 0xf59e0b, emissiveIntensity: 0.42, roughness: 0.22, metalness: 0.72 });

  if (type === 'turboPad') {
    part(g, darkMetal, 0, 0.04, 0, 1.88, 0.07, 3.05);
    part(g, turboPadMat(), 0, 0.09, 0, 1.72, 0.04, 2.86);
    for (const sx of [-0.94, 0.94]) part(g, cyanGlow, sx, 0.08, 0, 0.07, 0.06, 3.0);
    return g;
  }

  if (type === 'jumpPad') {
    part(g, darkMetal, 0, 0.06, 0, 1.82, 0.11, 2.15);
    part(g, jumpPadMat(), 0, 0.13, 0, 1.62, 0.05, 1.92);
    const greenGlow = getMat('evGreenGlow', { color: 0x22ff66, emissive: 0x22ff66, emissiveIntensity: 1.15, roughness: 0.15 });
    for (const sx of [-0.90, 0.90]) part(g, greenGlow, sx, 0.11, 0, 0.08, 0.09, 2.1);
    return g;
  }

  if (type === 'mysteryCrate') {
    const crate = new Group();
    crate.position.set(0, 1.05, 0);
    g.add(crate);
    g.userData.crate = crate;
    part(crate, mysteryBoxFaceMat(), 0, 0, 0, 1.12, 1.12, 1.12);
    const aura = new Mesh(sphere, new MeshBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 0.24, depthWrite: false }));
    aura.scale.set(0.95, 0.95, 0.95);
    crate.add(aura);

    const drone = new Group();
    drone.position.set(0, 2.75, 0);
    g.add(drone);
    g.userData.drone = drone;
    g.userData.rotors = [];
    part(drone, whiteGloss, 0, 0, 0, 0.92, 0.32, 0.72, sphere);
    part(drone, darkMetal, 0, 0.02, 0.34, 0.34, 0.20, 0.08);
    part(drone, goldMat, 0, 0.02, 0.39, 0.18, 0.12, 0.03);
    part(drone, cyanGlow, 0, -0.18, 0, 0.32, 0.06, 0.24);
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const rx = sx * 0.96, rz = sz * 0.72;
        const arm = part(drone, whiteGloss, sx * 0.48, 0.04, sz * 0.36, 0.14, 0.10, 0.96);
        arm.rotation.y = Math.atan2(rx, rz);
        const shroud = part(drone, whiteGloss, rx, 0.10, rz, 0.46, 0.18, 0.46, ringGeo);
        shroud.rotation.x = Math.PI / 2;
        const glowRing = part(drone, cyanGlow, rx, 0.02, rz, 0.45, 0.09, 0.45, ringGeo);
        glowRing.rotation.x = Math.PI / 2;
        const blade = new Group();
        blade.position.set(rx, 0.10, rz);
        drone.add(blade);
        g.userData.rotors.push(blade);
        part(blade, darkMetal, 0, 0, 0, 0.68, 0.025, 0.09);
        part(blade, darkMetal, 0, 0, 0, 0.09, 0.025, 0.68);
        const cab = part(g, darkMetal, sx * 0.44, 1.92, sz * 0.42, 0.035, 1.55, 0.035);
        cab.rotation.z = sx * 0.06;
      }
    }
    return g;
  }

  const letter = item.letter || 'L';
  const badge = new Group();
  badge.position.set(0, 1.25, 0);
  g.add(badge);
  g.userData.spinBadge = badge;
  part(badge, letterBadgeMat(letter), 0, 0, 0, 0.88, 0.88, 0.22);
  part(badge, goldMat, 0, 0, 0, 0.96, 0.96, 0.16);
  const halo = part(badge, cyanGlow, 0, 0, 0, 0.72, 0.72, 0.72, ringGeo);
  halo.rotation.x = Math.PI / 4;
  return g;
}

// =============================================================================
// EXPORTED: Dynamic World Events Renderer
// - EXACT Reference Image 2 Straight 0° Twin-Portal (↖ Glass Bridge | Underpass ↘)
// - Seamless 1,000m Endless Looping 3-Lane Crystal-Blue Glass Bridge + Exit Arch
// - Seamless 1,000m Endless Looping 3-Lane Neon Underpass Tunnel + Exit Portal
// - Animated Overhead Metro Viaduct + 4-Car Train, Helicopter, Blimp, Puddles & Leaves
// =============================================================================
export function createRoadEventsScene(scene) {
  const concrete = getMat('reConc', { color: 0xc8d4e0, roughness: 0.66, metalness: 0.08 });
  const concreteLight = getMat('reConcL', { color: 0xdbe5ef, roughness: 0.58, metalness: 0.08 });
  const concreteDark = getMat('reConcD', { color: 0x5c6f84, roughness: 0.72, metalness: 0.16 });
  const steel = getMat('reSteel', { color: 0x7da0c4, roughness: 0.24, metalness: 0.74 });
  const blueSteel = getMat('reBlueSteel', { color: 0x3b72b4, roughness: 0.26, metalness: 0.62 });
  const darkMetal = getMat('reDarkM', { color: 0x1e293b, roughness: 0.36, metalness: 0.54 });
  const asphalt = getMat('reAsph', { color: 0x2e3545, roughness: 0.76, metalness: 0.08 });
  const yellowPaint = getMat('reYel', { color: 0xfacc15, emissive: 0xd97706, emissiveIntensity: 0.18, roughness: 0.30, metalness: 0.12 });
  const whitePaint = getMat('reWhtP', { color: 0xf8fafc, emissive: 0xe2e8f0, emissiveIntensity: 0.18, roughness: 0.32 });
  const cyanLed = getMat('reCyan', { color: 0x00f0ff, emissive: 0x00e5ff, emissiveIntensity: 1.45, roughness: 0.10 });
  const warmLamp = getMat('reWarm', { color: 0xffe9a6, emissive: 0xffb830, emissiveIntensity: 1.55, roughness: 0.14 });
  const shrubBright = getMat('reShrub1', { color: 0x22c55e, roughness: 0.72 });
  const shrubDeep = getMat('reShrub2', { color: 0x15803d, roughness: 0.78 });
  const shrubLime = getMat('reShrub3', { color: 0x4ade80, roughness: 0.68 });
  const skyGlassFloor = getMat('reSkyGlass', {
    color: 0x6ce0ff, roughness: 0.04, metalness: 0.46, transparent: true, opacity: 0.50, emissive: 0x0284c7, emissiveIntensity: 0.24
  });
  const skyRailGlass = getMat('reRailGlass', {
    color: 0x38bdf8, roughness: 0.06, metalness: 0.34, transparent: true, opacity: 0.46, emissive: 0x0284c7, emissiveIntensity: 0.22
  });
  const metroWhite = getMat('reMetW', { color: 0xf8fafc, roughness: 0.16, metalness: 0.28 });
  const metroBlue = getMat('reMetB', { color: 0x2563eb, roughness: 0.22, metalness: 0.38 });
  const metroGlass = getMat('reMetG', { color: 0x152a42, roughness: 0.08, metalness: 0.78 });
  const whiteLed = getMat('reWLed', { color: 0xf8fbff, emissive: 0xe0f2fe, emissiveIntensity: 0.95, roughness: 0.12 });
  const rockA = getMat('reRockA', { color: 0x7a6a5c, roughness: 0.92, metalness: 0.02, flatShading: true });
  const rockB = getMat('reRockB', { color: 0x8d7b69, roughness: 0.90, metalness: 0.02, flatShading: true });
  const rockC = getMat('reRockC', { color: 0x5f544b, roughness: 0.94, metalness: 0.02, flatShading: true });
  const rockDark = getMat('reRockD', { color: 0x4a413a, roughness: 0.96, metalness: 0.02 });
  const caveGlass = getMat('reCaveGlass', {
    color: 0xaee9ff, roughness: 0.04, metalness: 0.3, transparent: true, opacity: 0.26, depthWrite: false, emissive: 0x38bdf8, emissiveIntensity: 0.12
  });
  const hazard = hazardMat();
  const chevLeft = tunnelChevronMat(false);
  const chevRight = tunnelChevronMat(true);

  // ---------------------------------------------------------------------------
  // 1. EXACT REFERENCE IMAGE 2 STRAIGHT (0°) TWIN-PORTAL ENTRANCE
  //    portalArch = front piers, center planter + green shrub, 3 cyan ^^^ chevrons & 2 glowing signs
  //    portalPreview = left rising Glass Bridge ramp + right neon Underpass tunnel sleeve
  // ---------------------------------------------------------------------------
  const portalArch = new Group();
  scene.add(portalArch);
  portalArch.visible = false;

  // Center Divider Pier + Planter Box with Yellow/Black Hazard Base + Lush Emerald Shrub!
  const centerPier = new Group();
  portalArch.add(centerPier);
  part(centerPier, concreteLight, 0, 2.75, 0, 1.38, 5.50, 1.72);
  part(centerPier, concrete, 0, 5.58, 0, 1.56, 0.34, 1.92);
  // 3 Stacked Glowing Electric-Cyan Upward Chevrons (^^^) on front face of center pier
  part(centerPier, centerPierChevronsMat(), 0, 2.95, 0.89, 1.06, 1.88, 0.08);
  // Front concrete planter box with yellow/black diagonal hazard trim + emerald bush
  part(centerPier, concreteLight, 0, 0.56, 1.75, 1.32, 0.86, 1.96);
  part(centerPier, concrete, 0, 1.02, 1.75, 1.44, 0.14, 2.08);
  part(centerPier, hazard, 0, 0.18, 1.78, 1.38, 0.30, 2.02);
  const shrubClusters = [
    [0, 1.34, 1.75, 0.68, 0.44, 0.74, shrubDeep],
    [-0.36, 1.32, 1.52, 0.44, 0.38, 0.46, shrubBright],
    [0.36, 1.32, 1.56, 0.44, 0.38, 0.46, shrubBright],
    [0, 1.54, 1.66, 0.52, 0.34, 0.54, shrubLime],
    [-0.24, 1.44, 2.15, 0.40, 0.32, 0.42, shrubBright],
    [0.24, 1.42, 2.12, 0.40, 0.32, 0.42, shrubLime]
  ];
  for (const [sx, sy, sz, sw, sh, sd, sm] of shrubClusters) {
    part(centerPier, sm, sx, sy, sz, sw, sh, sd, sphere);
  }

  // Right Tunnel Outer Pier + Concrete Header Lintel + Top Steel Guardrail (Image 2 exact!)
  part(portalArch, concreteLight, 4.62, 2.55, 0, 0.96, 5.10, 1.72);
  part(portalArch, concrete, 2.38, 4.55, 0, 5.36, 0.96, 1.78);
  // Top horizontal steel safety railing above the Underpass concrete lintel
  part(portalArch, steel, 2.42, 5.56, 0.48, 5.20, 0.12, 0.12);
  part(portalArch, steel, 2.42, 5.24, 0.48, 5.20, 0.08, 0.08);
  for (let px = 0.75; px <= 4.65; px += 0.95) {
    part(portalArch, steel, px, 5.32, 0.48, 0.10, 0.62, 0.10);
  }

  // TWO SEPARATE GLOWING ROYAL-BLUE HIGHWAY SIGN BOARDS (Image 2 signature!)
  // Left Sign: [↖ Glass Bridge] | Right Sign: [Underpass ↘]
  part(portalArch, darkMetal, -2.58, 5.28, 0.82, 4.02, 1.76, 0.16);
  part(portalArch, glassBridgeSignMat(), -2.58, 5.28, 0.94, 3.92, 1.68, 0.08);
  part(portalArch, steel, -0.82, 5.28, 0.72, 0.52, 0.18, 0.18);

  part(portalArch, darkMetal, 2.58, 5.28, 0.82, 4.02, 1.76, 0.16);
  const rightSign = part(portalArch, underpassForkSignMat(), 2.58, 5.28, 0.94, 3.92, 1.68, 0.08);
  part(portalArch, steel, 0.82, 5.28, 0.72, 0.52, 0.18, 0.18);

  // Twin-Portal Approach Preview Sleeves (visible while approaching plan.start; cleanly swaps to 1,000m loop at plan.start!)
  const portalPreview = new Group();
  scene.add(portalPreview);
  portalPreview.visible = false;

  // LEFT PREVIEW: Gently Rising Crystal-Blue Glass Bridge Ramp (x = -4.28 .. -0.72, z = +1 .. -96)
  const previewLen = 96;
  const rampSegs = 14;
  const segLen = previewLen / rampSegs;
  for (let i = 0; i < rampSegs; i++) {
    const z0 = 0 - i * segLen;
    const zMid = z0 - segLen * 0.5;
    const y0 = 0.14 + (i / rampSegs) * 2.15;
    const y1 = 0.14 + ((i + 1) / rampSegs) * 2.15;
    const yMid = (y0 + y1) * 0.5;
    const tilt = Math.atan2(y1 - y0, segLen);
    const seg = new Group();
    seg.position.set(-2.50, yMid, zMid);
    seg.rotation.x = tilt;
    portalPreview.add(seg);
    // Translucent glossy sky-blue glass deck + steel framing ribs
    part(seg, skyGlassFloor, 0, 0, 0, 3.52, 0.12, segLen + 0.08);
    part(seg, steel, 0, 0.04, 0, 0.12, 0.10, segLen + 0.08);
    part(seg, steel, 0, 0.04, segLen * 0.5, 3.60, 0.12, 0.12);
    // Twin blazing electric-cyan floor LED edge channels!
    for (const ex of [-1.66, 1.66]) {
      part(seg, cyanLed, ex, 0.10, 0, 0.16, 0.08, segLen + 0.04);
      part(seg, blueSteel, ex * 1.07, 1.06, 0, 0.16, 0.12, segLen + 0.06);
      part(seg, blueSteel, ex * 1.07, 0.18, 0, 0.24, 0.22, segLen + 0.06);
      part(seg, skyRailGlass, ex * 1.07, 0.62, 0, 0.07, 0.74, segLen + 0.04);
      part(seg, blueSteel, ex * 1.07, 0.62, 0, 0.20, 1.02, 0.20);
      part(seg, cyanLed, ex * 1.07 - Math.sign(ex) * 0.06, 0.62, 0, 0.08, 0.68, 0.12);
    }
  }

  // RIGHT PREVIEW: Straight Concrete Underpass Tunnel Sleeve (x = +0.72 .. +4.35, z = 0 .. -54)
  part(portalPreview, asphalt, 2.54, 0.11, -previewLen / 2, 3.64, 0.06, previewLen);
  // Glass skylight roof over the Underpass approach sleeve (sky view, cave-style rock walls inside)
  part(portalPreview, caveGlass, 2.54, 4.18, -previewLen / 2, 3.70, 0.06, previewLen);
  for (let rz = -2; rz > -previewLen; rz -= 4) part(portalPreview, steel, 2.54, 4.16, rz, 3.80, 0.12, 0.12);
  for (const rx of [0.70, 4.40]) part(portalPreview, rockDark, rx, 4.18, -previewLen / 2, 0.42, 0.34, previewLen);
  part(portalPreview, concrete, 0.66, 2.15, -previewLen / 2, 0.32, 4.12, previewLen);
  part(portalPreview, concrete, 4.44, 2.15, -previewLen / 2, 0.38, 4.12, previewLen);
  // Bright yellow edge stripes & white dashed center line inside Right Underpass preview
  part(portalPreview, yellowPaint, 1.18, 0.15, -previewLen / 2, 0.14, 0.02, previewLen);
  part(portalPreview, yellowPaint, 3.88, 0.15, -previewLen / 2, 0.14, 0.02, previewLen);
  for (let dz = -2; dz > -previewLen + 2; dz -= 4.5) {
    part(portalPreview, whitePaint, 2.54, 0.15, dz, 0.12, 0.02, 2.2);
  }
  // Yellow & black diagonal hazard-striped curbs on both inner walls
  for (const cx of [0.94, 4.14]) {
    part(portalPreview, hazard, cx, 0.34, -previewLen / 2, 0.32, 0.44, previewLen);
  }
  // Warm amber-gold ceiling light panels + Glowing electric-blue triple-chevron wall boards!
  for (let lz = -3.5; lz > -previewLen + 3; lz -= 6.5) {
    part(portalPreview, warmLamp, 1.72, 3.98, lz, 0.78, 0.09, 1.45);
    part(portalPreview, warmLamp, 3.36, 3.98, lz, 0.78, 0.09, 1.45);
  }
  for (let kz = -5.5; kz > -previewLen + 4; kz -= 10.5) {
    part(portalPreview, chevLeft, 0.85, 2.10, kz, 0.08, 1.28, 2.15);
    part(portalPreview, chevRight, 4.22, 2.10, kz, 0.08, 1.28, 2.15);
  }

  // ---------------------------------------------------------------------------
  // 2. SEAMLESS 1,000m ENDLESS LOOPING 3-LANE CRYSTAL-BLUE GLASS SEA-BRIDGE
  //    19 modular 16m bays = 304m visible corridor reaching smoothly into horizon fog!
  //    Includes underwater concrete/steel piers + pulsing white sea-foam surf collars.
  // ---------------------------------------------------------------------------
  const BAY_LEN = 16;
  const BAY_COUNT = 24;
  const SEA_Y = -4.55;
  const skyLoop = new Group();
  scene.add(skyLoop);
  skyLoop.name = 'glass-bridge-deck';
  skyLoop.visible = false;
  function createSoftSpotTex(inner, mid, outer) {
    if (typeof document === 'undefined') return null;
    const cv = document.createElement('canvas');
    cv.width = 128; cv.height = 128;
    const ctx = cv.getContext('2d');
    if (!ctx) return null;
    const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
    g.addColorStop(0, inner);
    g.addColorStop(0.45, mid);
    g.addColorStop(1, outer);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    const tex = new CanvasTexture(cv);
    tex.colorSpace = SRGBColorSpace;
    return tex;
  }
  const softFoamTex = createSoftSpotTex('rgba(255,255,255,0.95)', 'rgba(224,248,255,0.58)', 'rgba(224,248,255,0)');
  const softGlintTex = createSoftSpotTex('rgba(255,252,224,0.92)', 'rgba(255,235,170,0.42)', 'rgba(255,235,170,0)');
  const foamMat = getMat('reSeaFoam', {
    color: 0xf4fcff, emissive: 0xbae6fd, emissiveIntensity: 0.24, roughness: 0.35, metalness: 0.05, transparent: true, opacity: 0.80, depthWrite: false
  });
  const crestMat = new MeshBasicMaterial({
    color: 0xf8feff, map: softFoamTex, transparent: true, opacity: 0.72, depthWrite: false
  });
  const cableMat = getMat('reCable', { color: 0xe2f4ff, emissive: 0x38bdf8, emissiveIntensity: 0.32, roughness: 0.2, metalness: 0.85 });
  const skyBayCount = 24; // Even pool: alternate pier bays keep their world-space parity.
  const skyBays = [];
  const pierFoams = [];
  const BAY_OVERLAP = BAY_LEN + 0.65;
  const COAST_SHORE_LEN = 160; // ~5s coastal peninsula at start & return of Glass Bridge!
  const quayTurfMat = getMat('reQuayTurf', { color: 0x26b94c, roughness: 0.90 });
  const quayDeckMat = getMat('reQuayDeck', { color: 0xcbd5e1, roughness: 0.45, metalness: 0.16 });
  function buildCoastalQuayTemplate() {
    const q = new Group();
    for (const side of [-1, 1]) {
      // Deep solid concrete seawall cliff plunging straight underwater (-8.4m) on both sides of the glass channel!
      part(q, concrete, side * 52.0, -4.22, 0, 95.0, 8.4, BAY_OVERLAP);
      part(q, concreteDark, side * 4.55, -4.25, 0, 0.45, 8.4, BAY_OVERLAP);
      // Granite marina promenade deck + glowing cyan waterfront coping edge + lush coastal parkland lawn
      part(q, quayDeckMat, side * 6.8, 0.03, 0, 4.8, 0.14, BAY_OVERLAP);
      part(q, metroWhite, side * 4.52, 0.08, 0, 0.36, 0.20, BAY_OVERLAP);
      part(q, cyanLed, side * 4.34, 0.06, 0, 0.10, 0.10, BAY_OVERLAP);
      part(q, quayTurfMat, side * 54.0, 0.01, 0, 90.0, 0.08, BAY_OVERLAP);
    }
    return bakeGroup(q);
  }
  const quayTemplate = buildCoastalQuayTemplate();

  // Rocky Coastal Seawall Headland Cap facing the open sea at departure shore end & return shore start!
  function buildShoreHeadland(faceDir) {
    const h = new Group();
    for (const side of [-1, 1]) {
      part(h, concrete, side * 52.0, -4.22, 0, 95.0, 8.4, 2.2);
      part(h, metroWhite, side * 52.0, 0.06, 0, 95.0, 0.26, 2.45);
      part(h, cyanLed, side * 14.0, 0.06, faceDir * 1.24, 19.0, 0.14, 0.16);
      // Coastal boulders + breaking white surf along the rocky headland shoreline facing the ocean
      for (let r = 0; r < 6; r++) {
        const rx = side * (7.5 + r * 7.8);
        const rad = 1.9 + (r % 3) * 0.9;
        part(h, r % 2 === 0 ? rockA : rockB, rx, SEA_Y + 0.65, faceDir * (2.2 + (r % 2) * 1.4), rad * 1.4, rad * 0.95, rad * 1.2, rockGeo);
      }
      const surfStrip = new Mesh(planeGeo, crestMat);
      surfStrip.rotation.x = -Math.PI / 2;
      surfStrip.position.set(side * 34.0, SEA_Y + 0.24, faceDir * 3.8);
      surfStrip.scale.set(62.0, 6.5, 1);
      h.add(surfStrip);
      if (!h.userData.surfs) h.userData.surfs = [];
      h.userData.surfs.push(surfStrip);
    }
    h.visible = false;
    scene.add(h);
    return h;
  }
  const departHeadland = buildShoreHeadland(-1); // faces open ocean (-Z) at plan.start + 160
  const returnHeadland = buildShoreHeadland(1);  // faces open ocean (+Z) at plan.end - 160

  for (let i = 0; i < skyBayCount; i++) {
    const bay = new Group();
    skyLoop.add(bay);
    skyBays.push(bay);
    // Solid coastal waterfront peninsula quay (shown ONLY on first ~5s & last ~5s bays under the coastal buildings!)
    const quay = quayTemplate.clone();
    quay.visible = false;
    bay.add(quay);
    bay.userData.quay = quay;
    // Full 3-lane translucent glossy sky-blue glass deck + steel architectural grid (slight overlap seals curves!)
    part(bay, skyGlassFloor, 0, 0.06, 0, 7.65, 0.12, BAY_OVERLAP);
    for (const gx of [-3.74, -1.25, 1.25, 3.74]) {
      part(bay, steel, gx, 0.08, 0, 0.14, 0.14, BAY_OVERLAP);
    }
    for (const gz of [-6, -2, 2, 6]) {
      part(bay, steel, 0, 0.08, gz, 7.82, 0.14, 0.14);
    }
    // Glowing cyan lane guide accents & outer floor LED channels + sleek blue-glass side railings!
    for (const side of [-1, 1]) {
      part(bay, cyanLed, side * 1.15, 0.13, 0, 0.09, 0.04, BAY_OVERLAP);
      part(bay, blueSteel, side * 3.92, 1.26, 0, 0.22, 0.16, BAY_OVERLAP);
      part(bay, blueSteel, side * 3.92, 0.22, 0, 0.36, 0.26, BAY_OVERLAP);
      part(bay, skyRailGlass, side * 3.92, 0.74, 0, 0.08, 0.86, BAY_OVERLAP);
      for (const pz of [-5.2, 0, 5.2]) {
        part(bay, cyanLed, side * 3.58, 0.16, pz, 0.20, 0.10, 3.4);
        part(bay, blueSteel, side * 3.92, 0.74, pz, 0.24, 1.18, 0.24);
        part(bay, cyanLed, side * 3.80, 0.74, pz, 0.08, 0.78, 0.14);
      }
    }
    // Deep ocean support piers & waterline surf-foam rings under every alternate bay
    if (i % 2 === 0) {
      bay.userData.hasPier = true;
      bay.userData.surfs = [];
      part(bay, concrete, 0, -0.35, 0, 8.2, 0.65, 1.15);
      for (const side of [-1, 1]) {
        part(bay, concreteLight, side * 3.45, -3.70, 0, 0.92, 7.15, 1.05);
        part(bay, concreteDark, side * 3.45, SEA_Y - 1.1, 0, 1.28, 3.6, 1.48);
        const surf = new Mesh(ringGeo, foamMat);
        surf.rotation.x = Math.PI / 2;
        surf.position.set(side * 3.45, SEA_Y + 0.22, 0);
        surf.scale.set(2.45, 2.75, 0.35);
        bay.add(surf);
        bay.userData.surfs.push(surf);
        pierFoams.push(surf);
      }
    }
  }

  // Iconic Cable-Stayed Sea-Bridge Pylon Towers spaced every 112m along the Glass Bridge
  const PYLON_STRIDE = 112;
  function buildSeaBridgePylon() {
    const g = new Group();
    for (const side of [-1, 1]) {
      const tower = part(g, metroWhite, side * 4.75, 7.25, 0, 0.92, 29.2, 1.35);
      tower.rotation.z = side * 0.04;
      part(g, cyanLed, side * 4.24, 9.5, 0, 0.16, 17.5, 0.36);
      part(g, concreteDark, side * 5.0, SEA_Y - 1.2, 0, 2.25, 4.8, 3.2);
      // Fan array of sleek suspension cables sweeping fore & aft down to the glass bridge deck
      for (const dz of [-38, -28, -19, -11, 11, 19, 28, 38]) {
        const topY = 20.5 - Math.abs(dz) * 0.13;
        const botY = 0.85;
        const dy = topY - botY;
        const len = Math.hypot(dy, dz);
        const cab = part(g, cableMat, side * 4.18, (topY + botY) * 0.5, dz * 0.5, 0.065, len, 0.065);
        cab.rotation.x = Math.atan2(dz, dy);
      }
    }
    // High twin crossbeams tying the sea-bridge pylons together
    part(g, metroWhite, 0, 14.5, 0, 8.6, 0.72, 1.05);
    part(g, cyanLed, 0, 14.08, 0, 7.8, 0.14, 0.34);
    part(g, metroWhite, 0, 20.6, 0, 7.6, 0.88, 1.15);
    part(g, cyanLed, 0, 20.1, 0, 6.8, 0.16, 0.36);
    return bakeGroup(g);
  }
  const pylonTpl = buildSeaBridgePylon();
  const bridgePylons = [0, 1, 2, 3].map(() => {
    const p = pylonTpl.clone();
    p.visible = false;
    scene.add(p);
    return p;
  });

  // ---------------------------------------------------------------------------
  // 2B. EXTRA-REALISTIC 3D OCEAN / SEA VIEW (VISIBLE ON & APPROACHING GLASS BRIDGE!)
  //     Dual-layer animated procedural wave ocean, sun-glint reflection path,
  //     whitecap crests, luxury yachts & sailboats with foaming wakes,
  //     distant cruise liner, tropical coastal islands + rotating lighthouse, soaring seagulls!
  // ---------------------------------------------------------------------------
  const seaWorld = new Group();
  seaWorld.visible = false;
  scene.add(seaWorld);

  function createOceanTextures() {
    if (typeof document === 'undefined') return { colorMap: null, bumpMap: null, swellMap: null };
    const size = 512;
    const cCv = document.createElement('canvas');
    cCv.width = size; cCv.height = size;
    const cCtx = cCv.getContext('2d');
    const bCv = document.createElement('canvas');
    bCv.width = size; bCv.height = size;
    const bCtx = bCv.getContext('2d');
    const sCv = document.createElement('canvas');
    sCv.width = size; sCv.height = size;
    const sCtx = sCv.getContext('2d');
    if (!cCtx || !bCtx || !sCtx) return { colorMap: null, bumpMap: null, swellMap: null };

    // Deep azure-to-cerulean ocean water base with rich seamless periodic wave ripples
    const grad = cCtx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, '#026aa7');
    grad.addColorStop(0.35, '#0388b8');
    grad.addColorStop(0.68, '#007ea7');
    grad.addColorStop(1, '#026aa7');
    cCtx.fillStyle = grad;
    cCtx.fillRect(0, 0, size, size);
    bCtx.fillStyle = '#808080';
    bCtx.fillRect(0, 0, size, size);
    sCtx.clearRect(0, 0, size, size);

    // Layered multi-frequency seamless ocean waves (troughs + turquoise midtones + sunlit crests)
    for (let i = 0; i < 160; i++) {
      const rx = hash01(i * 11 + 3) * size;
      const ry = hash01(i * 19 + 7) * size;
      const rw = 42 + hash01(i * 23 + 5) * 95;
      const rh = 7 + hash01(i * 29 + 1) * 14;
      const bright = i % 3 === 0;
      const dark = i % 3 === 1;
      for (const ox of [-size, 0, size]) {
        for (const oy of [-size, 0, size]) {
          const x = rx + ox, y = ry + oy;
          if (x + rw < 0 || x - rw > size || y + rh < 0 || y - rh > size) continue;
          cCtx.fillStyle = bright ? 'rgba(92, 232, 255, 0.22)' : dark ? 'rgba(2, 44, 88, 0.28)' : 'rgba(14, 185, 220, 0.18)';
          cCtx.beginPath();
          cCtx.ellipse(x, y, rw * 0.5, rh * 0.5, 0.08, 0, Math.PI * 2);
          cCtx.fill();

          bCtx.fillStyle = bright ? 'rgba(245, 245, 245, 0.32)' : 'rgba(20, 20, 20, 0.28)';
          bCtx.beginPath();
          bCtx.ellipse(x, y, rw * 0.45, rh * 0.45, 0.08, 0, Math.PI * 2);
          bCtx.fill();

          if (bright) {
            sCtx.fillStyle = 'rgba(220, 250, 255, 0.28)';
            sCtx.beginPath();
            sCtx.ellipse(x, y, rw * 0.32, rh * 0.24, -0.05, 0, Math.PI * 2);
            sCtx.fill();
          }
        }
      }
    }
    // Crisp specular sea-foam sparkle streaks
    for (let i = 0; i < 65; i++) {
      const sx = hash01(i * 37 + 13) * size;
      const sy = hash01(i * 41 + 17) * size;
      const sl = 14 + hash01(i * 43 + 9) * 34;
      cCtx.fillStyle = 'rgba(235, 252, 255, 0.34)';
      cCtx.fillRect(sx, sy, sl, 2.4);
      sCtx.fillStyle = 'rgba(255, 255, 255, 0.55)';
      sCtx.fillRect(sx, sy, sl * 0.8, 2.0);
    }

    const colorMap = new CanvasTexture(cCv);
    colorMap.colorSpace = SRGBColorSpace;
    colorMap.wrapS = colorMap.wrapT = RepeatWrapping;
    colorMap.repeat.set(30, 24);
    colorMap.anisotropy = 4;

    const bumpMap = new CanvasTexture(bCv);
    bumpMap.wrapS = bumpMap.wrapT = RepeatWrapping;
    bumpMap.repeat.set(30, 24);

    const swellMap = new CanvasTexture(sCv);
    swellMap.colorSpace = SRGBColorSpace;
    swellMap.wrapS = swellMap.wrapT = RepeatWrapping;
    swellMap.repeat.set(22, 18);

    return { colorMap, bumpMap, swellMap };
  }

  const oceanTex = createOceanTextures();
  const oceanBaseMat = new MeshStandardMaterial({
    color: 0x0b9cd1,
    map: oceanTex.colorMap,
    bumpMap: oceanTex.bumpMap,
    bumpScale: 0.28,
    roughness: 0.08,
    metalness: 0.62,
    envMapIntensity: 1.9
  });
  const oceanSwellMat = new MeshStandardMaterial({
    color: 0xa5f3fc,
    map: oceanTex.swellMap,
    roughness: 0.05,
    metalness: 0.35,
    transparent: true,
    opacity: 0.36,
    depthWrite: false
  });
  const seaPlaneGeo = new PlaneGeometry(720, 440);
  seaPlaneGeo.rotateX(-Math.PI / 2);
  const seaBaseMesh = new Mesh(seaPlaneGeo, oceanBaseMat);
  seaBaseMesh.position.set(0, SEA_Y, -145);
  seaBaseMesh.receiveShadow = true;
  seaWorld.add(seaBaseMesh);

  const seaSwellMesh = new Mesh(seaPlaneGeo, oceanSwellMat);
  seaSwellMesh.position.set(0, SEA_Y + 0.18, -145);
  seaWorld.add(seaSwellMesh);

  // Shimmering Sun-Glint / Moonlight reflection trail dancing toward the ocean horizon (soft radial feather!)
  const glintMat = new MeshBasicMaterial({
    color: 0xfff3c4, map: softGlintTex, transparent: true, opacity: 0.46, depthWrite: false
  });
  const sunGlints = [];
  for (let i = 0; i < 8; i++) {
    const gw = 14 + i * 6.5;
    const gd = 16 + i * 5.5;
    const gMesh = new Mesh(planeGeo, glintMat);
    gMesh.rotation.x = -Math.PI / 2;
    gMesh.scale.set(gw, gd, 1);
    gMesh.position.set(16 + i * 2.4, SEA_Y + 0.25, -42 - i * 32);
    seaWorld.add(gMesh);
    sunGlints.push({ mesh: gMesh, baseX: 16 + i * 2.4, z: -42 - i * 32, seed: i * 1.37 });
  }

  // 18 Rolling Ocean Whitecap Foam Wave Crests gliding on both sides of the bridge (soft feathered foam!)
  const waveCrests = [];
  for (let i = 0; i < 18; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const wMesh = new Mesh(planeGeo, crestMat);
    wMesh.rotation.x = -Math.PI / 2;
    const wLen = 6.5 + (i % 4) * 3.0;
    wMesh.scale.set(wLen, 1.45 + (i % 3) * 0.45, 1);
    seaWorld.add(wMesh);
    waveCrests.push({
      mesh: wMesh,
      side,
      xOff: 10 + (i % 6) * 12,
      zOff: (i * 19) % 280,
      seed: i * 2.1
    });
  }

  // Luxury White Yachts & Sailboats with billowing sails + soft V-shaped foaming water wakes!
  const hullWhite = getMat('reBoatW', { color: 0xf8fafc, roughness: 0.16, metalness: 0.22 });
  const hullNavy = getMat('reBoatN', { color: 0x1e3a8a, roughness: 0.24, metalness: 0.36 });
  const deckTeak = getMat('reBoatT', { color: 0xb47b47, roughness: 0.65 });
  const sailMat = getMat('reBoatSail', { color: 0xffffff, roughness: 0.45, side: DoubleSide });
  const wakeMat = new MeshBasicMaterial({ color: 0xe8fbff, map: softFoamTex, transparent: true, opacity: 0.62, depthWrite: false });

  function buildBoat(isSailboat) {
    const b = new Group();
    // Sculpted white hull + navy stripe + teak deck
    part(b, hullWhite, 0, 0.45, 0, 2.3, 0.95, 7.6);
    part(b, hullNavy, 0, 0.22, 0, 2.38, 0.36, 7.7);
    const bow = part(b, hullWhite, 0, 0.52, 4.4, 1.35, 0.92, 2.2, coneGeo);
    bow.rotation.x = Math.PI / 2;
    part(b, deckTeak, 0, 0.96, -0.2, 2.0, 0.10, 6.4);
    if (isSailboat) {
      part(b, steel, 0, 4.4, 0.3, 0.14, 7.2, 0.14);
      const mainSail = part(b, sailMat, 0.08, 4.5, -1.05, 0.08, 5.6, 3.0);
      mainSail.rotation.y = 0.14;
      const jib = part(b, sailMat, -0.06, 3.8, 1.95, 0.06, 4.4, 1.9);
      jib.rotation.y = 0.18;
    } else {
      // Sleek Luxury Motor Yacht cabin & tinted wrap windshield
      part(b, hullWhite, 0, 1.65, -0.5, 1.85, 1.25, 4.2);
      part(b, metroGlass, 0, 1.72, 0.45, 1.90, 0.62, 2.5);
      part(b, hullWhite, 0, 2.45, -1.1, 1.55, 0.52, 2.4);
      part(b, cyanLed, 0, 1.12, 0, 2.28, 0.09, 6.2);
    }
    // V-shaped white foaming wake trailing behind boat
    for (const ws of [-1, 1]) {
      const wake = new Mesh(planeGeo, wakeMat);
      wake.rotation.x = -Math.PI / 2;
      wake.position.set(ws * 1.45, 0.08, -7.8);
      wake.rotation.z = ws * 0.24;
      wake.scale.set(0.85, 11.5, 1);
      b.add(wake);
    }
    return b;
  }

  const seaBoats = [
    { mesh: buildBoat(false), side: -1, x: -24, speed: 6.5, span: 310, offset: 35 },
    { mesh: buildBoat(true),  side: 1,  x: 28,  speed: 4.2, span: 310, offset: 120 },
    { mesh: buildBoat(true),  side: -1, x: -46, speed: 3.8, span: 310, offset: 205 },
    { mesh: buildBoat(false), side: 1,  x: 52,  speed: 7.4, span: 310, offset: 265 }
  ];
  for (const bt of seaBoats) {
    bt.mesh.scale.setScalar(1.25);
    seaWorld.add(bt.mesh);
  }

  // Distant Ocean Cruise Liner gliding slowly across the far horizon!
  const cruiseShip = new Group();
  part(cruiseShip, hullNavy, 0, 1.8, 0, 36, 3.8, 6.8);
  part(cruiseShip, hullWhite, 0, 4.8, 0, 32, 3.2, 6.2);
  part(cruiseShip, hullWhite, 1.2, 7.3, 0, 22, 2.2, 5.2);
  part(cruiseShip, warmLamp, 0, 4.9, 3.16, 28, 0.55, 0.10);
  part(cruiseShip, warmLamp, 1.2, 7.2, 2.66, 18, 0.45, 0.10);
  part(cruiseShip, getMat('reCruiseRed', { color: 0xe11d48, roughness: 0.35 }), -4.5, 9.6, 0, 3.2, 2.8, 2.4);
  part(cruiseShip, wakeMat, 0, 0.15, 0, 46, 0.12, 8.6);
  cruiseShip.position.set(-75, SEA_Y + 0.1, -245);
  seaWorld.add(cruiseShip);

  // Scenic Coastal Rocky Islands + Red-and-White Striped Lighthouse with rotating warm beacon!
  const sandMat = getMat('reIslandSand', { color: 0xe6c88a, roughness: 0.88 });
  const lhRed = getMat('reLhRed', { color: 0xdc2626, roughness: 0.32 });
  const beaconBeamMat = new MeshBasicMaterial({
    color: 0xfff3a8, transparent: true, opacity: 0.28, side: DoubleSide, depthWrite: false
  });
  const lighthouseBeacon = new Group();
  function buildCoastalIsland(hasLighthouse) {
    const isl = new Group();
    // Sandy beach ring + layered rocky hill + tropical green foliage
    part(isl, sandMat, 0, 0.45, 0, 19, 1.3, 15, sphere);
    part(isl, rockB, -1.8, 3.2, -0.5, 11.5, 5.4, 9.5, rockGeo);
    part(isl, rockA, 4.5, 2.2, 2.0, 8.2, 3.8, 7.2, rockGeo);
    part(isl, shrubDeep, -2.5, 6.8, -0.8, 7.8, 3.4, 6.8, sphere);
    part(isl, shrubBright, 3.2, 4.8, 1.5, 5.4, 2.6, 4.8, sphere);
    // White surf ring around the island shoreline
    const iFoam = new Mesh(ringGeo, foamMat);
    iFoam.rotation.x = Math.PI / 2;
    iFoam.position.set(0, 0.25, 0);
    iFoam.scale.set(42, 34, 0.45);
    isl.add(iFoam);
    if (hasLighthouse) {
      part(isl, metroWhite, -1.5, 9.5, 0, 1.45, 4.5, 1.45, cyl12);
      part(isl, lhRed, -1.5, 12.6, 0, 1.25, 2.4, 1.25, cyl12);
      part(isl, metroWhite, -1.5, 14.8, 0, 1.08, 2.2, 1.08, cyl12);
      part(isl, lhRed, -1.5, 16.5, 0, 1.02, 1.2, 1.02, cyl12);
      part(isl, warmLamp, -1.5, 17.8, 0, 1.05, 1.35, 1.05, cyl12);
      part(isl, lhRed, -1.5, 19.1, 0, 1.25, 1.45, 1.25, coneGeo);
      lighthouseBeacon.position.set(-1.5, 17.8, 0);
      isl.add(lighthouseBeacon);
      for (const dir of [-1, 1]) {
        const beam = new Mesh(coneGeo, beaconBeamMat);
        beam.rotation.z = dir * Math.PI / 2;
        beam.position.set(dir * 16, 0, 0);
        beam.scale.set(3.2, 32, 3.2);
        lighthouseBeacon.add(beam);
      }
    }
    return isl;
  }
  const islandRight = buildCoastalIsland(true);
  islandRight.position.set(78, SEA_Y, -165);
  const islandLeft = buildCoastalIsland(false);
  islandLeft.scale.set(1.35, 1.15, 1.25);
  islandLeft.position.set(-92, SEA_Y, -210);
  seaWorld.add(islandRight, islandLeft);

  // Floating Port (Red) & Starboard (Green) Ocean Channel Navigation Buoys with bobbing surf rings!
  const buoyGreenMat = getMat('reBuoyG', { color: 0x10b981, roughness: 0.28 });
  const buoyLampR = getMat('reBuoyLR', { color: 0xff4d6d, emissive: 0xff2244, emissiveIntensity: 1.4, roughness: 0.1 });
  const buoyLampG = getMat('reBuoyLG', { color: 0x34d399, emissive: 0x10b981, emissiveIntensity: 1.4, roughness: 0.1 });
  function buildSeaBuoy(isRed) {
    const g = new Group();
    const bm = isRed ? lhRed : buoyGreenMat;
    part(g, bm, 0, 0.35, 0, 0.85, 0.8, 0.85, cyl12);
    part(g, bm, 0, 1.25, 0, 0.32, 1.35, 0.32, coneGeo);
    part(g, isRed ? buoyLampR : buoyLampG, 0, 2.05, 0, 0.28, 0.28, 0.28, sphere);
    const bFoam = new Mesh(ringGeo, foamMat);
    bFoam.rotation.x = Math.PI / 2;
    bFoam.position.set(0, 0.14, 0);
    bFoam.scale.set(2.8, 2.8, 0.3);
    g.add(bFoam);
    return g;
  }
  const seaBuoys = [
    { mesh: buildSeaBuoy(true), x: -13.5, offset: 48, span: 220 },
    { mesh: buildSeaBuoy(false), x: 13.5, offset: 158, span: 220 }
  ];
  for (const sb of seaBuoys) seaWorld.add(sb.mesh);

  // Flock of 8 Animated Soaring White Seagulls flapping over the turquoise ocean!
  const seagulls = [];
  for (let i = 0; i < 8; i++) {
    const bird = new Group();
    part(bird, metroWhite, 0, 0, 0, 0.22, 0.16, 0.72);
    const wingL = new Group();
    part(wingL, metroWhite, -0.52, 0, 0, 1.02, 0.05, 0.28);
    const wingR = new Group();
    part(wingR, metroWhite, 0.52, 0, 0, 1.02, 0.05, 0.28);
    bird.add(wingL, wingR);
    seaWorld.add(bird);
    seagulls.push({
      mesh: bird, wingL, wingR,
      side: i % 2 === 0 ? -1 : 1,
      radius: 11 + (i % 4) * 7,
      baseY: 2.2 + (i % 4) * 2.4,
      baseZ: -28 - i * 19,
      phase: i * 1.15
    });
  }
  const oceanDayCol = new Color(0x0b9cd1), oceanSunsetCol = new Color(0x165b8c), oceanNightCol = new Color(0x071f3b), oceanRainCol = new Color(0x1e4d63);
  const glintDayCol = new Color(0xfff5cc), glintSunCol = new Color(0xffb454), glintNightCol = new Color(0xbfe0ff);

  // Futuristic White & Cyan Glass Bridge Exit Archway + Coastal Seawall Landing at plan.end (1,000m finish!)
  const skyExitArch = new Group();
  scene.add(skyExitArch);
  skyExitArch.visible = false;
  for (const side of [-1, 1]) {
    part(skyExitArch, metroWhite, side * 4.45, 3.4, 0, 1.15, 6.8, 1.45);
    part(skyExitArch, cyanLed, side * 3.84, 3.4, 0, 0.16, 5.4, 0.34);
  }
  part(skyExitArch, metroWhite, 0, 6.6, 0, 10.0, 1.15, 1.65);
  part(skyExitArch, cyanLed, 0, 5.98, 0, 7.8, 0.18, 0.38);
  part(skyExitArch, exitPortalSignMat('MAIN ROAD AHEAD'), 0, 6.6, 0.88, 6.4, 1.12, 0.10);
  // Waterfront concrete seawall & glowing promenade lip where sea meets continuation city boulevard!
  part(skyExitArch, concrete, 0, -2.55, -0.6, 180, 4.6, 1.4);
  part(skyExitArch, metroWhite, 0, -0.18, -0.5, 180, 0.30, 1.75);
  part(skyExitArch, cyanLed, 0, -0.02, 0.28, 180, 0.12, 0.16);

  // ---------------------------------------------------------------------------
  // 3. SEAMLESS 1,000m ENDLESS LOOPING 3-LANE NEON UNDERPASS TUNNEL (IMAGE 2!)
  //    24 world-aligned modular bays reaching cleanly into horizon fog & sealing exit!
  // ---------------------------------------------------------------------------
  //    CAVE STYLE: rugged boulder rock walls arching inward + a crystal GLASS SKYLIGHT roof
  //    down the middle so the sky, skyscrapers, helicopter & blimp stay visible overhead.
  const tunLoop = new Group();
  scene.add(tunLoop);
  tunLoop.visible = false;
  const CAVE_ROOF_Y = 7.45;
  function buildCaveBay() {
    const bay = new Group();
    // Dark charcoal asphalt road + crisp yellow outer stripes + white dashed lane dividers (overlap seals curves!)
    part(bay, asphalt, 0, 0.04, 0, 8.65, 0.08, BAY_OVERLAP);
    for (const lx of [-1.12, 1.12]) {
      for (const dz of [-6, -2, 2, 6]) part(bay, whitePaint, lx, 0.095, dz, 0.12, 0.02, 2.25);
    }
    // Crystal glass skylight roof + steel ribs + glowing cyan skylight edge LEDs
    part(bay, caveGlass, 0, CAVE_ROOF_Y, 0, 5.9, 0.06, BAY_LEN + 0.04);
    for (const gz of [-6, -2, 2, 6]) part(bay, steel, 0, CAVE_ROOF_Y - 0.06, gz, 6.0, 0.14, 0.14);
    for (const side of [-1, 1]) {
      part(bay, steel, side * 2.95, CAVE_ROOF_Y - 0.06, 0, 0.18, 0.18, BAY_LEN + 0.04);
      part(bay, cyanLed, side * 2.82, CAVE_ROOF_Y - 0.20, 0, 0.10, 0.08, BAY_LEN + 0.04);
      part(bay, yellowPaint, side * 3.45, 0.095, 0, 0.18, 0.02, BAY_LEN + 0.04);
      // Alternating Yellow & Black hazard curbs along both cave edges
      for (let c = 0; c < 8; c++) {
        const cz = -7 + c * 2.0;
        part(bay, c % 2 === 0 ? yellowPaint : darkMetal, side * 3.92, 0.28, cz, 0.62, 0.42, 1.98);
      }
      // Solid dark rock backing wall + rock roof shoulders (no gaps behind boulders)
      part(bay, rockDark, side * 6.05, 3.8, 0, 1.5, 7.8, BAY_LEN + 0.04);
      part(bay, rockDark, side * 4.45, CAVE_ROOF_Y + 0.25, 0, 3.1, 0.75, BAY_LEN + 0.04);
      // Rugged faceted boulders arching inward from road edge up to the skylight
      const profile = [[5.40, 0.95, 1.15], [5.30, 2.55, 1.20], [5.15, 4.15, 1.15], [4.70, 5.65, 1.10], [3.95, 6.90, 1.00]];
      const rows = [-6.4, -3.2, 0, 3.2, 6.4];
      rows.forEach((rz, ri) => {
        profile.forEach(([px, py, r], pi) => {
          const seed = ri * 13 + pi * 7 + (side > 0 ? 101 : 0);
          const j1 = hash01(seed) - 0.5, j2 = hash01(seed + 1) - 0.5, j3 = hash01(seed + 2) - 0.5;
          const mat = [rockA, rockB, rockC][(ri + pi + (side > 0 ? 1 : 0)) % 3];
          const rock = part(bay, mat, side * (px + j1 * 0.22), py + j2 * 0.3, rz + j3 * 0.7,
            r * (0.92 + j1 * 0.12), r * (0.95 + j2 * 0.2), r * (1.5 + j3 * 0.3), rockGeo);
          rock.rotation.set(j1 * 2.4, j2 * 2.8, j3 * 2.2);
        });
      });
      // Warm amber rock-mounted lantern sconces + glowing cyan floor guide strip
      for (const lz of [-4, 4]) {
        part(bay, darkMetal, side * 4.02, 4.55, lz, 0.14, 0.62, 1.30);
        part(bay, warmLamp, side * 3.94, 4.55, lz, 0.08, 0.48, 1.12);
        part(bay, warmLamp, side * 3.30, CAVE_ROOF_Y - 0.42, lz, 0.70, 0.10, 1.60);
      }
      part(bay, cyanLed, side * 3.60, 0.12, 0, 0.08, 0.05, BAY_LEN + 0.04);
      // Bold Glowing Electric-Blue Triple-Chevron Boards bolted onto the cave rock (<<< left, >>> right)
      const chevMat = side === -1 ? chevLeft : chevRight;
      part(bay, darkMetal, side * 4.06, 2.55, 0, 0.14, 1.56, 2.86);
      part(bay, chevMat, side * 3.97, 2.55, 0, 0.06, 1.40, 2.64);
    }
    return bakeGroup(bay);
  }
  const caveTemplate = buildCaveBay();
  const tunBays = [];
  for (let i = 0; i < BAY_COUNT; i++) {
    const bay = caveTemplate.clone();
    tunLoop.add(bay);
    tunBays.push(bay);
  }

  const railBed = new Group();
  const signalPink = getMat('metroPink', {color:0xff457e,emissive:0xcc1353,emissiveIntensity:.65});
  for (const lane of [-1,0,1]) {
    for (const dx of [-.60,.60]) part(railBed,steel,lane*2.2+dx,.18,0,.085,.09,BAY_LEN);
    for (let z=-7.5; z<8; z+=1.6) part(railBed,darkMetal,lane*2.2,.12,z,1.66,.08,.27);
  }
  for (const side of [-1,1]) {
    part(railBed,side<0?signalPink:cyanLed,side*3.78,1.8,0,.1,.16,15.8);
    part(railBed,warmLamp,side*3.82,3.6,-5,.14,.46,.32);
  }
  const railTemplate = bakeGroup(railBed);
  const railBays = tunBays.map(bay => {
    const rails = railTemplate.clone();
    bay.add(rails);
    return rails;
  });

  // Tall Sunlit Cave Exit Portal at plan.end (1,000m finish!) — high lintel so bus-roof runs never clip
  const tunExitPortal = new Group();
  scene.add(tunExitPortal);
  tunExitPortal.visible = false;
  for (const side of [-1, 1]) {
    part(tunExitPortal, concreteLight, side * 5.15, 3.95, 0, 1.55, 7.9, 1.65);
    part(tunExitPortal, hazard, side * 5.15, 1.45, 0, 1.62, 1.55, 1.72);
    part(tunExitPortal, warmLamp, side * 5.15, 6.10, 0.88, 0.72, 0.50, 0.08);
  }
  part(tunExitPortal, concrete, 0, 8.25, 0, 11.9, 1.05, 1.65);
  part(tunExitPortal, steel, 0, 8.92, 0, 11.4, 0.14, 0.16);
  part(tunExitPortal, exitPortalSignMat('TUNNEL EXIT · SUNLIGHT'), 0, 8.25, 0.88, 6.6, 0.95, 0.10);

  // ---------------------------------------------------------------------------
  // 4. ANIMATED OVERHEAD ELEVATED METRO VIADUCT BRIDGES + WHITE/BLUE METRO TRAINS
  //    2 pooled bridges so distant viaducts + speeding trains appear smoothly from 310m away!
  // ---------------------------------------------------------------------------
  function buildMetroViaduct() {
    const bridge = new Group();
    for (const side of [-1, 1]) {
      // Deep piers reach cleanly down below SEA_Y so overhead viaducts over the Glass Sea-Bridge never float!
      part(bridge, concrete, side * 6.3, 0.25, 0, 2.0, 11.5, 2.2);
      part(bridge, hazard, side * 6.3, 0.68, 0, 2.14, 1.15, 2.34);
      part(bridge, hazard, side * 4.6, 6.55, 1.62, 2.1, 0.68, 0.14);
      part(bridge, darkMetal, side * 6.3, 3.2, 1.12, 0.66, 2.55, 0.10);
      part(bridge, cyanLed, side * 6.3, 3.2, 1.18, 0.44, 2.30, 0.08);
      part(bridge, concrete, side * 6.3, 5.85, 0, 3.0, 0.85, 2.5);
    }
    part(bridge, concrete, 0, 6.75, 0, 140, 1.15, 3.2);
    part(bridge, concreteDark, 0, 7.36, 0, 140, 0.14, 3.35);
    for (const lx of [-8.8, -2.6, 2.6, 8.8]) {
      part(bridge, cyanLed, lx, 6.14, 0.9, 1.85, 0.18, 0.45);
    }
    for (const rz of [-1.55, 1.55]) {
      part(bridge, steel, 0, 7.95, rz, 140, 0.14, 0.12);
      for (let px = -66; px <= 66; px += 4.0) part(bridge, steel, px, 7.65, rz, 0.14, 0.62, 0.14);
    }
    const train = new Group();
    train.position.set(0, 7.45, 0);
    bridge.add(train);
    for (let car = 0; car < 4; car++) {
      const cx = -11.4 + car * 7.6;
      const isEnd = car === 0 || car === 3;
      const carLen = isEnd ? 7.2 : 7.0;
      part(train, metroWhite, cx, 1.25, 0, carLen, 2.15, 2.08);
      part(train, metroBlue, cx, 0.56, 0, carLen + 0.04, 0.42, 2.12);
      part(train, darkMetal, cx, 0.18, 0, carLen - 0.6, 0.34, 1.78);
      part(train, metroGlass, cx, 1.48, 0, carLen - 0.85, 0.86, 2.14);
      for (const dx of [-2.0, 0, 2.0]) part(train, metroWhite, cx + dx, 1.48, 0, 0.24, 0.92, 2.16);
      if (car < 3) part(train, darkMetal, cx + 3.8, 1.22, 0, 0.65, 1.90, 1.85);
      if (isEnd) {
        const dir = car === 3 ? 1 : -1;
        const noseX = cx + dir * 3.85;
        const nose = part(train, metroWhite, noseX, 1.10, 0, 1.15, 1.85, 2.02);
        nose.rotation.z = -dir * 0.28;
        const cabGlass = part(train, metroGlass, noseX + dir * 0.18, 1.48, 0, 0.92, 0.88, 1.86);
        cabGlass.rotation.z = -dir * 0.35;
        part(train, whiteLed, noseX + dir * 0.56, 0.65, 0.62, 0.12, 0.22, 0.34);
        part(train, whiteLed, noseX + dir * 0.56, 0.65, -0.62, 0.12, 0.22, 0.34);
      }
    }
    bridge.visible = false;
    scene.add(bridge);
    return { bridge, train };
  }
  const metroBridges = [buildMetroViaduct(), buildMetroViaduct(), buildMetroViaduct()];

  // ---------------------------------------------------------------------------
  // 5. SKY AMBIENT HELICOPTER & FUTURISTIC BLIMP (EXACT IMAGE 1!)
  // ---------------------------------------------------------------------------
  // Reference-image Red AS350 "Écureuil" style helicopter: glossy red body, big bubble canopy,
  // white side stripes, tapered tail boom, red fin + tail rotor, red tubular skids, 3-blade rotor.
  const heliRed = getMat('heliRed', { color: 0xd81b1b, roughness: 0.18, metalness: 0.38 });
  const heliRedDark = getMat('heliRedD', { color: 0x9b1010, roughness: 0.25, metalness: 0.4 });
  const heliGlass = getMat('heliGlass', { color: 0x8fcbe6, roughness: 0.04, metalness: 0.6, transparent: true, opacity: 0.62 });
  const heliSeat = getMat('heliSeat', { color: 0xc8a27a, roughness: 0.7 });
  const helicopter = new Group();
  scene.add(helicopter);
  const heliBody = new Group();
  heliBody.scale.setScalar(1.25);
  helicopter.add(heliBody);
  // Main cabin pod + lower chin + bubble canopy
  part(heliBody, heliRed, 0.05, 0, 0, 1.75, 0.86, 0.84, sphere);
  part(heliBody, heliRed, 1.25, -0.30, 0, 0.78, 0.42, 0.66, sphere);
  part(heliBody, heliGlass, 1.20, 0.12, 0, 0.98, 0.70, 0.76, sphere);
  part(heliBody, heliSeat, 0.85, -0.05, 0, 0.30, 0.34, 0.9);
  // Side door windows
  for (const sz of [-1, 1]) {
    part(heliBody, heliGlass, 0.25, 0.20, sz * 0.80, 0.72, 0.52, 0.05);
    part(heliBody, heliGlass, -0.55, 0.18, sz * 0.76, 0.55, 0.46, 0.05);
    part(heliBody, darkMetal, -0.15, 0.10, sz * 0.83, 0.03, 0.70, 0.03);
    // White livery stripes along cabin & boom
    part(heliBody, metroWhite, 0.05, -0.38, sz * 0.80, 2.6, 0.07, 0.04);
    part(heliBody, metroWhite, 0.05, -0.50, sz * 0.76, 2.4, 0.04, 0.04);
    part(heliBody, metroWhite, -2.65, 0.32, sz * 0.24, 2.6, 0.05, 0.03);
  }
  // Engine cowling hump + exhaust + rotor mast
  part(heliBody, heliRed, -0.35, 0.74, 0, 0.98, 0.34, 0.50, sphere);
  part(heliBody, heliRedDark, -0.95, 0.80, 0, 0.36, 0.20, 0.30, sphere);
  const exhaust = part(heliBody, darkMetal, -1.25, 0.82, 0, 0.11, 0.30, 0.11, cyl12);
  exhaust.rotation.z = Math.PI / 2;
  part(heliBody, darkMetal, -0.15, 1.12, 0, 0.08, 0.36, 0.08, cyl12);
  part(heliBody, darkMetal, -0.15, 1.32, 0, 0.18, 0.12, 0.18, sphere);
  // Tapered tail boom + horizontal stabilizer + swept vertical fin
  const boom = new Mesh(boomGeo, heliRed);
  boom.rotation.z = Math.PI / 2;
  boom.position.set(-2.75, 0.30, 0);
  boom.scale.set(1, 3.3, 1);
  heliBody.add(boom);
  part(heliBody, heliRed, -3.75, 0.34, 0, 0.42, 0.05, 1.35);
  for (const sz of [-0.66, 0.66]) part(heliBody, heliRed, -3.75, 0.48, sz, 0.32, 0.30, 0.04);
  const fin = part(heliBody, heliRed, -4.42, 0.82, 0, 0.55, 1.15, 0.07);
  fin.rotation.z = -0.32;
  const lowFin = part(heliBody, heliRed, -4.30, 0.05, 0, 0.32, 0.45, 0.06);
  lowFin.rotation.z = 0.35;
  part(heliBody, metroWhite, -4.5, 1.25, 0, 0.32, 0.06, 0.08);
  const tailRotor = new Group();
  tailRotor.position.set(-4.55, 0.85, 0.16);
  heliBody.add(tailRotor);
  part(tailRotor, darkMetal, 0, 0, 0, 0.09, 1.05, 0.03);
  part(tailRotor, darkMetal, 0, 0, 0, 1.05, 0.09, 0.03);
  part(tailRotor, darkMetal, 0, 0, 0, 0.10, 0.10, 0.06, sphere);
  // Red tubular landing skids with curled fronts + slanted cross struts
  for (const sz of [-0.78, 0.78]) {
    const skid = part(heliBody, heliRed, 0.05, -1.22, sz, 0.05, 2.7, 0.05, cyl12);
    skid.rotation.z = Math.PI / 2;
    const curl = part(heliBody, heliRed, 1.48, -1.12, sz, 0.05, 0.32, 0.05, cyl12);
    curl.rotation.z = -0.9;
    for (const sx of [0.62, -0.58]) {
      const strut = part(heliBody, heliRed, sx, -0.98, sz * 0.86, 0.045, 0.56, 0.045, cyl12);
      strut.rotation.x = -Math.sign(sz) * 0.32;
    }
  }
  for (const sx of [0.62, -0.58]) part(heliBody, heliRedDark, sx, -0.74, 0, 0.06, 1.25, 0.06, cyl12).rotation.x = Math.PI / 2;
  // 3-blade dark main rotor
  const heliRotor = new Group();
  heliRotor.position.set(-0.15 * 1.25, 1.36 * 1.25, 0);
  helicopter.add(heliRotor);
  for (let k = 0; k < 3; k++) {
    const blade = new Group();
    blade.rotation.y = (k * Math.PI * 2) / 3;
    heliRotor.add(blade);
    part(blade, darkMetal, 3.0, 0, 0, 6.0, 0.04, 0.28);
  }

  const blimp = new Group();
  scene.add(blimp);
  part(blimp, metroWhite, 0, 0, 0, 7.6, 2.8, 2.8, sphere);
  part(blimp, metroBlue, 0, -0.1, 0, 7.1, 0.72, 2.85, sphere);
  part(blimp, cyanLed, 0.4, 0, 2.72, 1.35, 1.35, 0.18);
  part(blimp, metroBlue, -6.2, 0, 0, 2.4, 3.4, 0.18);
  part(blimp, metroBlue, -6.2, 0, 0, 2.4, 0.18, 3.4);
  part(blimp, darkMetal, 0.3, -2.75, 0, 2.8, 0.85, 0.92);

  // ---------------------------------------------------------------------------
  // 6. RAIN REFLECTIVE WATER PUDDLES & FLOATING LEAVES
  // ---------------------------------------------------------------------------
  const puddleMat = new MeshStandardMaterial({
    color: 0x38bdf8, roughness: 0.05, metalness: 0.85, transparent: true, opacity: 0.48
  });
  const puddles = [];
  for (let i = 0; i < 6; i++) {
    const p = new Mesh(cyl16, puddleMat);
    p.scale.set(0.95 + (i % 3) * 0.35, 0.015, 1.65 + (i % 2) * 0.85);
    p.visible = false;
    scene.add(p);
    puddles.push({ mesh: p, lane: (i % 3) - 1, offset: i * 24 });
  }

  const leafMat = new MeshStandardMaterial({ color: 0x4ade80, roughness: 0.7, side: DoubleSide });
  const leaves = [];
  for (let i = 0; i < 18; i++) {
    const lf = new Mesh(planeGeo, leafMat);
    lf.scale.set(0.22, 0.14, 1);
    lf.visible = false;
    scene.add(lf);
    leaves.push({ mesh: lf, seed: i * 1.73 + 0.5 });
  }

  return (state, weather) => {
    const running = state.mode === 'running' || state.mode === 'countdown' || state.mode === 'starting';
    const isPark = state.map === 'itpark';
    const night = weather?.night || 0;
    const rain = weather?.rain || 0;

    // 1. Update Straight 0° Image-2 Twin-Portal & Continuous 1,000m Glass Bridge / Underpass Loop
    const plan = forkPlanAt(state.distance);
    const startRelZ = plan.start - state.distance;
    const endRelZ = plan.end - state.distance;
    const chosen = state.activeBranch;

    // Approach Twin-Portal Arch (front signs + center pier + planter) visible far ahead from 350m (beyond fog)!
    const forksOn = Boolean(state.enableForks);
    const showArch = running && forksOn && startRelZ > -14 && startRelZ < 350;
    portalArch.visible = showArch;
    if (showArch) rightSign.material = underpassForkSignMat(isPark);
    if (showArch) {
      const px = chosen ? 0 : curveRelX(plan.start, state);
      const py = chosen ? 0 : curveRelY(plan.start, state);
      const rotY = chosen ? 0 : -Math.atan(roadCurveSlope(plan.start, state.map));
      portalArch.position.set(px, py, -startRelZ);
      portalArch.rotation.y = rotY;
      centerPier.visible = startRelZ > -10;
    }

    // Twin-Portal Approach Sleeves (Left Glass Bridge Ramp | Right Underpass Tunnel) visible from 350m!
    const showPreview = running && forksOn && !chosen && startRelZ >= -1 && startRelZ < 350;
    portalPreview.visible = showPreview;
    if (showPreview) {
      portalPreview.position.set(curveRelX(plan.start, state), curveRelY(plan.start, state), -startRelZ);
      portalPreview.rotation.y = -Math.atan(roadCurveSlope(plan.start, state.map));
    }

    // Continuous 1,000m Full-Width 3-Lane Curved Glass Bridge Loop + Extra-Realistic Ocean Sea View!
    const onSky = (running || ['paused','falling','captured','crashed'].includes(state.mode)) && chosen === 'skybridge' && state.distance >= plan.start - 1 && state.distance <= plan.end + 4;
    skyLoop.visible = onSky;
    if (onSky) {
      const firstBay = Math.max(0,Math.floor((state.distance-plan.start-40)/BAY_LEN));
      for (let offset=0; offset<skyBays.length; offset++) {
        const n = firstBay + offset;
        const bay = skyBays[n % skyBays.length];
        const start = plan.start + n*BAY_LEN;
        const length = Math.min(BAY_LEN,plan.end-start);
        bay.visible = length > 0;
        if (bay.visible) {
          const bayCenter = start + length / 2;
          const bayWorldY = branchCurveY(bayCenter, state);
          bay.position.set(curveRelX(bayCenter, state), curveRelY(bayCenter, state), state.distance - bayCenter);
          bay.rotation.y = -Math.atan(curveSlopeAt(bayCenter, state));
          bay.scale.z = length / BAY_LEN;
          // Show solid coastal peninsula land deck under buildings for the first ~5s & last ~5s (ZERO floating buildings!)
          if (bay.userData.quay) {
            bay.userData.quay.visible = (bayCenter <= plan.start + COAST_SHORE_LEN) || (bayCenter >= plan.end - COAST_SHORE_LEN);
          }
          if (bay.userData.surfs) {
            for (const surf of bay.userData.surfs) {
              surf.position.y = SEA_Y + 0.22 - bayWorldY;
            }
          }
        }
      }
      // Position dramatic rocky coastal headlands at the exact edge where shore meets pure open ocean!
      for (const [hl, worldZ] of [[departHeadland, plan.start + COAST_SHORE_LEN], [returnHeadland, plan.end - COAST_SHORE_LEN]]) {
        const relZ = worldZ - state.distance;
        const vis = relZ > -28 && relZ < 350;
        hl.visible = vis;
        if (vis) {
          const wy = branchCurveY(worldZ, state);
          hl.position.set(curveRelX(worldZ, state), curveRelY(worldZ, state), -relZ);
          hl.rotation.y = -Math.atan(curveSlopeAt(worldZ, state));
          for (const surf of hl.userData.surfs || []) {
            surf.position.y = SEA_Y + 0.24 - wy;
          }
        }
      }
      // Gently pulse waterline sea-foam rings around ocean bridge piers
      for (let i = 0; i < pierFoams.length; i++) {
        const pulse = 1 + Math.sin(state.time * 2.4 + i * 0.9) * 0.14;
        pierFoams[i].scale.set(2.45 * pulse, 2.75 * pulse, 0.35);
      }
      // Position 3 cable-stayed sea-bridge pylon towers along the curved 1,000m Glass Bridge
      const origin = plan.start + 56;
      const firstPylon = origin + Math.max(0,Math.ceil((state.distance-48-origin)/PYLON_STRIDE))*PYLON_STRIDE;
      for (let pi = 0; pi < bridgePylons.length; pi++) {
        const pWorld = firstPylon + pi * PYLON_STRIDE;
        const pRel = pWorld - state.distance;
        const vis = pWorld < plan.end - 28 && pRel >= -48 && pRel < 360;
        bridgePylons[pi].visible = vis;
        if (vis) {
          bridgePylons[pi].position.set(curveRelX(pWorld, state), curveRelY(pWorld, state), -pRel);
          bridgePylons[pi].rotation.y = -Math.atan(curveSlopeAt(pWorld, state));
        }
      }
    } else {
      for (const p of bridgePylons) p.visible = false;
      departHeadland.visible = false;
      returnHeadland.visible = false;
    }

    // Update Realistic 3D Ocean Sea World (stays level at true sea level while the Glass Bridge arches overhead!)
    const showSea = onSky || (showPreview && startRelZ < 170);
    seaWorld.visible = showSea;
    if (showSea) {
      const t = state.time || 0;
      const phase = weather?.phase || 0;
      const lowSun = Math.max(0, 1 - Math.abs(phase - 0.15) * 7);
      // Dynamic ocean tinting matching Day / Sunset / Night / Rain
      oceanBaseMat.color.copy(oceanDayCol).lerp(oceanSunsetCol, lowSun * 0.72).lerp(oceanNightCol, night * 0.9).lerp(oceanRainCol, rain * 0.65);
      oceanBaseMat.roughness = 0.07 + rain * 0.16;
      oceanSwellMat.opacity = Math.max(0.14, 0.36 - night * 0.14 - rain * 0.12);
      glintMat.color.copy(glintDayCol).lerp(glintSunCol, lowSun * 0.85).lerp(glintNightCol, night);
      glintMat.opacity = Math.max(0.06, (0.36 - rain * 0.28) * (0.85 + 0.15 * Math.sin(t * 3.1)));

      // Smooth dual-layer water scrolling with runner travel + natural ocean tide drift
      if (oceanTex.colorMap) {
        oceanTex.colorMap.offset.set((t * 0.028) % 1, (state.distance / 18 + t * 0.05) % 1);
      }
      if (oceanTex.bumpMap) {
        oceanTex.bumpMap.offset.set((t * 0.028) % 1, (state.distance / 18 + t * 0.05) % 1);
      }
      if (oceanTex.swellMap) {
        oceanTex.swellMap.offset.set((-t * 0.042) % 1, (state.distance / 24 - t * 0.035) % 1);
      }
      // Subtle ocean heave + keep ocean surface anchored at true sea level below curved arch
      seaSwellMesh.position.y = SEA_Y + 0.18 + Math.sin(t * 1.6) * 0.05;
      seaWorld.position.y = onSky ? -branchCurveY(state.distance, state) : 0;
      seaWorld.position.z = onSky ? 0 : Math.min(0, -(startRelZ - 14));

      // Dancing sun/moon reflection glints across the ocean
      for (const g of sunGlints) {
        g.mesh.position.x = g.baseX + Math.sin(t * 1.4 + g.seed) * 2.2;
        g.mesh.scale.x = (10 + g.seed * 3.8) * (0.88 + 0.18 * Math.sin(t * 2.8 + g.seed));
      }
      // Rolling whitecap foam wave crests gliding across the sea
      for (const wc of waveCrests) {
        const relZ = ((wc.zOff - (state.distance % 280)) + 280) % 280;
        wc.mesh.position.set(
          wc.side * (wc.xOff + Math.sin(t * 0.9 + wc.seed) * 2.5),
          SEA_Y + 0.22 + Math.sin(t * 2.2 + wc.seed) * 0.04,
          10 - relZ
        );
      }
      // Cruising Luxury Yachts & Sailboats bobbing naturally on ocean swells
      for (let bi = 0; bi < seaBoats.length; bi++) {
        const bt = seaBoats[bi];
        const bRel = ((bt.offset + t * bt.speed - state.distance * 0.72) % bt.span + bt.span) % bt.span;
        bt.mesh.position.set(bt.x + Math.sin(t * 0.35 + bi) * 2.4, SEA_Y + 0.08 + Math.sin(t * 2.1 + bi * 1.4) * 0.14, 18 - bRel);
        bt.mesh.rotation.set(Math.sin(t * 1.7 + bi) * 0.04, Math.PI, Math.cos(t * 1.9 + bi) * 0.055);
      }
      // Distant Ocean Cruise Liner gliding slowly across far bay
      cruiseShip.position.x = -95 + ((t * 1.8) % 190);
      cruiseShip.position.y = SEA_Y + 0.12 + Math.sin(t * 0.9) * 0.08;
      // Floating red/green ocean channel buoys bobbing beside the Glass Sea-Bridge
      for (let sbi = 0; sbi < seaBuoys.length; sbi++) {
        const sb = seaBuoys[sbi];
        const bZ = ((sb.offset - (state.distance % sb.span)) + sb.span) % sb.span;
        sb.mesh.position.set(sb.x, SEA_Y + 0.06 + Math.sin(t * 2.6 + sbi * 2.1) * 0.14, 14 - bZ);
        sb.mesh.rotation.set(Math.sin(t * 2.1 + sbi) * 0.14, 0, Math.cos(t * 1.8 + sbi) * 0.16);
      }
      // Subtle coastal bay parallax on distant islands + rotating warm lighthouse beacon
      const bayProg = onSky ? Math.max(0, Math.min(1, (state.distance - plan.start) / Math.max(1, plan.end - plan.start))) : 0;
      islandRight.position.z = -185 + bayProg * 55;
      islandLeft.position.z = -225 + bayProg * 65;
      lighthouseBeacon.rotation.y = t * 0.85;
      // Soaring flock of seagulls banking & flapping over the water
      for (const sg of seagulls) {
        const flap = Math.sin(t * 6.5 + sg.phase) * 0.55;
        sg.wingL.rotation.z = flap;
        sg.wingR.rotation.z = -flap;
        const sx = sg.side * (sg.radius + Math.sin(t * 0.55 + sg.phase) * 5.5);
        const sy = sg.baseY + Math.sin(t * 1.2 + sg.phase) * 0.85;
        const sz = sg.baseZ + Math.cos(t * 0.45 + sg.phase) * 14;
        sg.mesh.position.set(sx, sy, sz);
        sg.mesh.rotation.y = Math.atan2(Math.cos(t * 0.55 + sg.phase) * 5.5, -Math.sin(t * 0.45 + sg.phase) * 14);
      }
    }

    skyExitArch.visible = onSky && endRelZ > -14 && endRelZ < 350;
    if (skyExitArch.visible) {
      skyExitArch.position.set(curveRelX(plan.end, state), curveRelY(plan.end, state), -endRelZ);
      skyExitArch.rotation.y = -Math.atan(curveSlopeAt(plan.end, state));
    }

    // Continuous 1,000m Full-Width 3-Lane Curved Cave Railway Tunnel Loop (world-aligned to plan.end -> zero gap!)
    const onTun = (running || ['paused','falling','captured','crashed'].includes(state.mode)) && chosen === 'underpass' && state.distance >= plan.start - 1 && state.distance <= plan.end + 4;
    tunLoop.visible = onTun;
    if (onTun) {
      const firstTunBay = Math.max(0, Math.floor((state.distance - plan.start - 32) / BAY_LEN));
      for (let i = 0; i < BAY_COUNT; i++) {
        const n = firstTunBay + i;
        const start = plan.start + n * BAY_LEN;
        const length = Math.min(BAY_LEN, plan.end - start);
        const bay = tunBays[n % BAY_COUNT];
        const rails = railBays[n % BAY_COUNT];
        bay.visible = length > 0;
        if (bay.visible) {
          const bayCenter = start + length / 2;
          rails.visible = true;
          bay.position.set(curveRelX(bayCenter, state), curveRelY(bayCenter, state), state.distance - bayCenter);
          bay.rotation.y = -Math.atan(curveSlopeAt(bayCenter, state));
          bay.scale.z = length / BAY_LEN;
        }
      }
    }
    tunExitPortal.visible = onTun && endRelZ > -14 && endRelZ < 350;
    if (tunExitPortal.visible) {
      tunExitPortal.position.set(curveRelX(plan.end, state), curveRelY(plan.end, state), -endRelZ);
      tunExitPortal.rotation.y = -Math.atan(curveSlopeAt(plan.end, state));
    }

    // 2. Update 3 Pooled Overhead Metro Viaduct Bridges + Speeding Trains (emerge cleanly from 350m beyond fog!)
    const baseMetroIdx = Math.max(0, Math.ceil((state.distance - 28 - METRO_FIRST) / METRO_STRIDE));
    for (let k = 0; k < metroBridges.length; k++) {
      const mIdx = baseMetroIdx + k;
      const metroWorldZ = METRO_FIRST + mIdx * METRO_STRIDE;
      const metroRelZ = metroWorldZ - state.distance;
      const mPlan = forkPlanAt(metroWorldZ);
      const nearPortal = Math.abs(metroWorldZ - mPlan.start) < 55 || Math.abs(metroWorldZ - mPlan.end) < 40;
      const clearOfCave = !onTun || metroWorldZ > plan.end + 35;
      const mb = metroBridges[k];
      mb.bridge.visible = isPark && clearOfCave && !nearPortal && metroRelZ > -28 && metroRelZ < 350;
      if (mb.bridge.visible) {
        mb.bridge.position.set(curveRelX(metroWorldZ, state), curveRelY(metroWorldZ, state), -metroRelZ);
        mb.bridge.rotation.y = -Math.atan(curveSlopeAt(metroWorldZ, state));
        const sweep = ((state.time * 16 + mIdx * 29) % 148) - 74;
        mb.train.position.x = (mIdx % 2 === 0 ? 1 : -1) * sweep;
      }
    }

    // 3. Sky Ambient Helicopter & Futuristic Blimp (Image 1!)
    const showSkyCraft = (isPark || onSky || onTun) && night < 0.7 && rain < 0.65;
    helicopter.visible = showSkyCraft;
    blimp.visible = showSkyCraft;
    if (showSkyCraft) {
      const hx = ((state.time * 4.5 + 18) % 64) - 32;
      helicopter.position.set(hx, 15.5 + Math.sin(state.time * 1.8) * 0.45, -58);
      helicopter.rotation.y = 0.08;
      heliRotor.rotation.y = state.time * 24;
      tailRotor.rotation.z = state.time * 38;

      const bx = 26 - ((state.time * 1.4) % 52);
      blimp.position.set(bx, 18.2 + Math.sin(state.time * 0.9) * 0.5, -78);
      blimp.rotation.y = Math.PI + 0.12;
    }

    // 4. Rain Water Puddles on Wet Asphalt (skip on Glass Bridge & inside Underpass!)
    const showPuddles = running && rain > 0.12 && !onSky && !onTun;
    for (const p of puddles) {
      p.mesh.visible = showPuddles;
      if (!showPuddles) continue;
      const rel = ((p.offset - (state.distance % 144)) + 144) % 144;
      p.mesh.position.set(p.lane * 2.15, 0.11, -(rel - 12));
    }

    // 5. Floating Leaves on College & School sunny runs (skip inside Underpass!)
    const showLeaves = running && !isPark && !onTun && rain < 0.4;
    for (const lf of leaves) {
      lf.mesh.visible = showLeaves;
      if (!showLeaves) continue;
      const t = state.time * 1.6 + lf.seed;
      const lx = Math.sin(t * 1.3) * 5.8;
      const ly = ((6.5 - (t * 1.1) % 6.2) + 6.2) % 6.2 + 0.35;
      const lz = -(((lf.seed * 19 + state.time * 12) % 42) + 2);
      lf.mesh.position.set(lx, ly, lz);
      lf.mesh.rotation.set(t * 2.1, t * 1.7, Math.sin(t) * 0.8);
    }
  };
}
