import {
  BoxGeometry,
  CanvasTexture,
  ClampToEdgeWrapping,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DodecahedronGeometry,
  DoubleSide,
  DynamicDrawUsage,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  RepeatWrapping,
  SphereGeometry,
  SRGBColorSpace,
  TextureLoader,
  TorusGeometry
} from './vendor/three.module.js';
import { mergeGeometries } from './vendor/BufferGeometryUtils.js';
import { forkPlanAt, METRO_FIRST, METRO_STRIDE } from './road-events.js';
import { branchCurveX, branchCurveY, curveRelX, curveRelY, curveSlopeAt, roadCurveSlope } from './campus-layout.js';
import { bakeGroup } from './bake-static-meshes.js';

const cube = new BoxGeometry(1, 1, 1);
const rockGeo = new DodecahedronGeometry(1, 0);
const boomGeo = new CylinderGeometry(0.16, 0.34, 1, 12);
const coneGeo = new ConeGeometry(1, 1, 10);

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

  // High-Definition Laminated Architectural Glass Floor (Spider Bolts, Expansion Joints & Anti-Slip Frit Pattern)
  function createSkywalkGlassMat() {
    if (typeof document === 'undefined') {
      return getMat('reSkyGlass:fb', {
        color: 0x6ce0ff, roughness: 0.04, metalness: 0.46, transparent: true, opacity: 0.50, emissive: 0x0284c7, emissiveIntensity: 0.24
      });
    }
    const S = 256;
    const cv = document.createElement('canvas');
    cv.width = S; cv.height = S;
    const ctx = cv.getContext('2d');
    const emCv = document.createElement('canvas');
    emCv.width = S; emCv.height = S;
    const emCtx = emCv.getContext('2d');
    if (!ctx || !emCtx) {
      return getMat('reSkyGlass:fb', {
        color: 0x6ce0ff, roughness: 0.04, metalness: 0.46, transparent: true, opacity: 0.50, emissive: 0x0284c7, emissiveIntensity: 0.24
      });
    }

    ctx.fillStyle = 'rgba(14, 165, 233, 0.45)';
    ctx.fillRect(0, 0, S, S);
    emCtx.fillStyle = '#000000';
    emCtx.fillRect(0, 0, S, S);

    const cols = 4, rows = 8;
    const pw = S / cols;
    const ph = S / rows;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * pw;
        const y = r * ph;

        ctx.strokeStyle = 'rgba(125, 211, 252, 0.55)';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(x + 2, y + 2, pw - 4, ph - 4);

        // Anti-slip ceramic traction frit dot grid (leaves central inspection window clear for ocean view)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.38)';
        for (let fx = x + 6; fx < x + pw - 5; fx += 8) {
          for (let fy = y + 6; fy < y + ph - 5; fy += 7) {
            const dx = Math.abs(fx - (x + pw / 2));
            const dy = Math.abs(fy - (y + ph / 2));
            if (dx < pw * 0.28 && dy < ph * 0.28) continue;
            ctx.fillRect(fx, fy, 1.5, 1.5);
          }
        }

        ctx.strokeStyle = 'rgba(8, 51, 68, 0.75)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, pw, ph);

        for (const [bx, by] of [[x + 3.5, y + 3.5], [x + pw - 3.5, y + 3.5], [x + 3.5, y + ph - 3.5], [x + pw - 3.5, y + ph - 3.5]]) {
          ctx.fillStyle = '#cbd5e1';
          ctx.beginPath(); ctx.arc(bx, by, 2.5, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#334155';
          ctx.beginPath(); ctx.arc(bx, by, 1.1, 0, Math.PI * 2); ctx.fill();
          emCtx.fillStyle = '#00f0ff';
          emCtx.beginPath(); emCtx.arc(bx, by, 1.5, 0, Math.PI * 2); emCtx.fill();
        }
      }
    }

    for (const lx of [64, 128, 192]) {
      ctx.fillStyle = 'rgba(0, 240, 255, 0.65)';
      ctx.fillRect(lx - 1, 0, 2, S);
      emCtx.fillStyle = '#00f0ff';
      emCtx.fillRect(lx - 1, 0, 2, S);
    }

    const map = new CanvasTexture(cv);
    map.colorSpace = SRGBColorSpace;
    map.wrapS = map.wrapT = RepeatWrapping;
    map.repeat.set(2, 4);
    map.anisotropy = 4;

    const emissiveMap = new CanvasTexture(emCv);
    emissiveMap.colorSpace = SRGBColorSpace;
    emissiveMap.wrapS = emissiveMap.wrapT = RepeatWrapping;
    emissiveMap.repeat.set(2, 4);
    emissiveMap.anisotropy = 4;

    return new MeshStandardMaterial({
      color: 0xffffff,
      map,
      emissiveMap,
      emissive: 0x00f0ff,
      emissiveIntensity: 0.32,
      roughness: 0.04,
      metalness: 0.52,
      transparent: true,
      opacity: 0.58,
      envMapIntensity: 2.1
    });
  }

  // Structural Glass Balustrade Railing (Vertical Panels, Panel Gaps & Clamp Shoes)
  function createSkywalkRailGlassMat() {
    if (typeof document === 'undefined') {
      return getMat('reRailGlass:fb', {
        color: 0x38bdf8, roughness: 0.06, metalness: 0.34, transparent: true, opacity: 0.46, emissive: 0x0284c7, emissiveIntensity: 0.22
      });
    }
    const cv = document.createElement('canvas');
    cv.width = 256; cv.height = 256;
    const ctx = cv.getContext('2d');
    const emCv = document.createElement('canvas');
    emCv.width = 256; emCv.height = 256;
    const emCtx = emCv.getContext('2d');
    if (!ctx || !emCtx) {
      return getMat('reRailGlass:fb', {
        color: 0x38bdf8, roughness: 0.06, metalness: 0.34, transparent: true, opacity: 0.46, emissive: 0x0284c7, emissiveIntensity: 0.22
      });
    }

    ctx.fillStyle = 'rgba(56, 189, 248, 0.40)';
    ctx.fillRect(0, 0, 256, 256);
    emCtx.fillStyle = '#000000';
    emCtx.fillRect(0, 0, 256, 256);

    // 4 vertical structural glass panels separated by expansion gaps
    for (let i = 0; i < 4; i++) {
      const px = i * 64;
      // Gap
      ctx.fillStyle = 'rgba(8, 47, 73, 0.65)';
      ctx.fillRect(px, 0, 3, 256);
      // Bright bevel refraction edge
      ctx.fillStyle = 'rgba(186, 230, 253, 0.65)';
      ctx.fillRect(px + 3, 0, 1.5, 256);
      // Stainless steel base clamp shoe
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(px + 12, 224, 40, 32);
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.arc(px + 32, 240, 3, 0, Math.PI * 2);
      ctx.fill();
      // Stainless steel point-fixing boss clamp in middle
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.arc(px + 32, 128, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(px + 32, 128, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
    // Top handrail cap
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(0, 0, 256, 12);
    // Cyan LED underglow in base channel
    emCtx.fillStyle = '#00e5ff';
    emCtx.fillRect(0, 248, 256, 8);

    const map = new CanvasTexture(cv);
    map.colorSpace = SRGBColorSpace;
    map.wrapS = map.wrapT = RepeatWrapping;
    map.repeat.set(4, 1);
    map.anisotropy = 4;

    const emissiveMap = new CanvasTexture(emCv);
    emissiveMap.colorSpace = SRGBColorSpace;
    emissiveMap.wrapS = emissiveMap.wrapT = RepeatWrapping;
    emissiveMap.repeat.set(4, 1);
    emissiveMap.anisotropy = 4;

    return new MeshStandardMaterial({
      color: 0xffffff,
      map,
      emissiveMap,
      emissive: 0x00e5ff,
      emissiveIntensity: 0.28,
      roughness: 0.05,
      metalness: 0.38,
      transparent: true,
      opacity: 0.54,
      envMapIntensity: 2.0
    });
  }

  const skyGlassFloor = createSkywalkGlassMat();
  const skyRailGlass = createSkywalkRailGlassMat();
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
  const centerPierRaw = new Group();
  part(centerPierRaw, concreteLight, 0, 2.75, 0, 1.38, 5.50, 1.72);
  part(centerPierRaw, concrete, 0, 5.58, 0, 1.56, 0.34, 1.92);
  part(centerPierRaw, centerPierChevronsMat(), 0, 2.95, 0.89, 1.06, 1.88, 0.08);
  part(centerPierRaw, concreteLight, 0, 0.56, 1.75, 1.32, 0.86, 1.96);
  part(centerPierRaw, concrete, 0, 1.02, 1.75, 1.44, 0.14, 2.08);
  part(centerPierRaw, hazard, 0, 0.18, 1.78, 1.38, 0.30, 2.02);
  const shrubClusters = [
    [0, 1.34, 1.75, 0.68, 0.44, 0.74, shrubDeep],
    [-0.36, 1.32, 1.52, 0.44, 0.38, 0.46, shrubBright],
    [0.36, 1.32, 1.56, 0.44, 0.38, 0.46, shrubBright],
    [0, 1.54, 1.66, 0.52, 0.34, 0.54, shrubLime],
    [-0.24, 1.44, 2.15, 0.40, 0.32, 0.42, shrubBright],
    [0.24, 1.42, 2.12, 0.40, 0.32, 0.42, shrubLime]
  ];
  for (const [sx, sy, sz, sw, sh, sd, sm] of shrubClusters) {
    part(centerPierRaw, sm, sx, sy, sz, sw, sh, sd, sphere);
  }
  const centerPier = bakeGroup(centerPierRaw);
  portalArch.add(centerPier);

  // Right Tunnel Outer Pier + Concrete Header Lintel + Top Steel Guardrail + Left Sign (baked!)
  const archStaticRaw = new Group();
  part(archStaticRaw, concreteLight, 4.62, 2.55, 0, 0.96, 5.10, 1.72);
  part(archStaticRaw, concrete, 2.38, 4.55, 0, 5.36, 0.96, 1.78);
  part(archStaticRaw, steel, 2.42, 5.56, 0.48, 5.20, 0.12, 0.12);
  part(archStaticRaw, steel, 2.42, 5.24, 0.48, 5.20, 0.08, 0.08);
  for (let px = 0.75; px <= 4.65; px += 0.95) {
    part(archStaticRaw, steel, px, 5.32, 0.48, 0.10, 0.62, 0.10);
  }
  part(archStaticRaw, darkMetal, -2.58, 5.28, 0.82, 4.02, 1.76, 0.16);
  part(archStaticRaw, glassBridgeSignMat(), -2.58, 5.28, 0.94, 3.92, 1.68, 0.08);
  part(archStaticRaw, steel, -0.82, 5.28, 0.72, 0.52, 0.18, 0.18);
  part(archStaticRaw, darkMetal, 2.58, 5.28, 0.82, 4.02, 1.76, 0.16);
  part(archStaticRaw, steel, 0.82, 5.28, 0.72, 0.52, 0.18, 0.18);
  portalArch.add(bakeGroup(archStaticRaw));
  const rightSign = part(portalArch, underpassForkSignMat(), 2.58, 5.28, 0.94, 3.92, 1.68, 0.08);

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
  // Bake the ~190 static approach sleeve parts into ~12 merged draw calls for smooth mobile FPS!
  const bakedPreview = bakeGroup(portalPreview);
  portalPreview.clear();
  portalPreview.add(bakedPreview);

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
    const staticRaw = new Group();
    for (const side of [-1, 1]) {
      part(staticRaw, concrete, side * 52.0, -4.22, 0, 95.0, 8.4, 2.2);
      part(staticRaw, metroWhite, side * 52.0, 0.06, 0, 95.0, 0.26, 2.45);
      part(staticRaw, cyanLed, side * 14.0, 0.06, faceDir * 1.24, 19.0, 0.14, 0.16);
      for (let r = 0; r < 6; r++) {
        const rx = side * (7.5 + r * 7.8);
        const rad = 1.9 + (r % 3) * 0.9;
        part(staticRaw, r % 2 === 0 ? rockA : rockB, rx, SEA_Y + 0.65, faceDir * (2.2 + (r % 2) * 1.4), rad * 1.4, rad * 0.95, rad * 1.2, rockGeo);
      }
      const surfStrip = new Mesh(planeGeo, crestMat);
      surfStrip.rotation.x = -Math.PI / 2;
      surfStrip.position.set(side * 34.0, SEA_Y + 0.24, faceDir * 3.8);
      surfStrip.scale.set(62.0, 6.5, 1);
      h.add(surfStrip);
      if (!h.userData.surfs) h.userData.surfs = [];
      h.userData.surfs.push(surfStrip);
    }
    h.add(bakeGroup(staticRaw));
    h.visible = false;
    scene.add(h);
    return h;
  }
  const departHeadland = buildShoreHeadland(-1); // faces open ocean (-Z) at plan.start + 160
  const returnHeadland = buildShoreHeadland(1);  // faces open ocean (+Z) at plan.end - 160

  // Instanced Glass Bridge: drops ~240+ per-bay draw calls down to ~14 total draw calls across all 24 bays!
  function buildSkyBayDeckTemplate() {
    const g = new Group();
    part(g, skyGlassFloor, 0, 0.06, 0, 7.65, 0.12, BAY_OVERLAP);
    for (const gx of [-3.74, -1.25, 1.25, 3.74]) {
      part(g, steel, gx, 0.08, 0, 0.14, 0.14, BAY_OVERLAP);
    }
    for (const gz of [-6, -2, 2, 6]) {
      part(g, steel, 0, 0.08, gz, 7.82, 0.14, 0.14);
    }
    for (const gz of [-4, 0, 4]) {
      const diag1 = part(g, steel, -1.25, -0.06, gz, 0.10, 0.12, 3.8);
      diag1.rotation.y = 0.58;
      const diag2 = part(g, steel, 1.25, -0.06, gz, 0.10, 0.12, 3.8);
      diag2.rotation.y = -0.58;
    }
    for (const side of [-1, 1]) {
      part(g, cyanLed, side * 1.15, 0.13, 0, 0.09, 0.04, BAY_OVERLAP);
      part(g, blueSteel, side * 3.92, 1.26, 0, 0.22, 0.16, BAY_OVERLAP);
      part(g, blueSteel, side * 3.92, 0.22, 0, 0.36, 0.26, BAY_OVERLAP);
      part(g, skyRailGlass, side * 3.92, 0.74, 0, 0.08, 0.86, BAY_OVERLAP);
      for (const pz of [-5.2, 0, 5.2]) {
        part(g, cyanLed, side * 3.58, 0.16, pz, 0.20, 0.10, 3.4);
        part(g, blueSteel, side * 3.92, 0.74, pz, 0.24, 1.18, 0.24);
        part(g, cyanLed, side * 3.80, 0.74, pz, 0.08, 0.78, 0.14);
      }
      for (const pz of [-5.2, -1.8, 1.8, 5.2]) {
        part(g, steel, side * 3.68, 0.18, pz, 0.22, 0.14, 0.72);
        part(g, cyanLed, side * 3.56, 0.18, pz, 0.06, 0.10, 0.60);
      }
    }
    return bakeGroup(g);
  }
  function buildSkyPierTemplate() {
    const g = new Group();
    part(g, concrete, 0, -0.35, 0, 8.2, 0.65, 1.15);
    for (const side of [-1, 1]) {
      part(g, concreteLight, side * 3.45, -3.70, 0, 0.92, 7.15, 1.05);
      part(g, concreteDark, side * 3.45, SEA_Y - 1.1, 0, 1.28, 3.6, 1.48);
    }
    return bakeGroup(g);
  }
  function makeInstancedPool(tpl, maxCount, renderOrderOverride = 0) {
    return tpl.children.map(child => {
      const inst = new InstancedMesh(child.geometry, child.material, maxCount);
      inst.receiveShadow = child.receiveShadow;
      inst.frustumCulled = false;
      inst.instanceMatrix.setUsage(DynamicDrawUsage);
      if (child.material === skyGlassFloor) inst.renderOrder = 2;
      else if (child.material === skyRailGlass) inst.renderOrder = 3;
      else if (renderOrderOverride) inst.renderOrder = renderOrderOverride;
      inst.count = 0;
      skyLoop.add(inst);
      return inst;
    });
  }
  const skyDeckInsts = makeInstancedPool(buildSkyBayDeckTemplate(), skyBayCount);
  const skyPierInsts = makeInstancedPool(buildSkyPierTemplate(), Math.ceil(skyBayCount / 2) + 1);
  const skyQuayInsts = makeInstancedPool(quayTemplate, skyBayCount);
  const pierFoamInst = new InstancedMesh(ringGeo, foamMat, skyBayCount);
  pierFoamInst.frustumCulled = false;
  pierFoamInst.renderOrder = 1;
  pierFoamInst.instanceMatrix.setUsage(DynamicDrawUsage);
  pierFoamInst.count = 0;
  skyLoop.add(pierFoamInst);
  const skyDummy = new Object3D();
  const foamDummy = new Object3D();
  foamDummy.rotation.order = 'YXZ';
  // Zero-mesh bay markers preserve world-space pier coordinates on glass-bridge-deck with 0 draw calls.
  const skyBayMarkers = Array.from({ length: skyBayCount }, (_, i) => {
    const marker = new Group();
    marker.visible = false;
    marker.userData.hasPier = i % 2 === 0;
    skyLoop.add(marker);
    return marker;
  });

  // Iconic Cable-Stayed Sea-Bridge Pylon Towers spaced every 112m along the Glass Bridge
  const PYLON_STRIDE = 112;
  function buildSeaBridgePylon() {
    const g = new Group();
    for (const side of [-1, 1]) {
      const tower = part(g, metroWhite, side * 4.75, 7.25, 0, 0.92, 29.2, 1.35);
      tower.rotation.z = side * 0.04;
      part(g, cyanLed, side * 4.24, 9.5, 0, 0.16, 17.5, 0.36);
      part(g, concreteDark, side * 5.0, SEA_Y - 1.2, 0, 2.25, 4.8, 3.2);
      // High-visibility beacon light atop each pylon stay summit
      part(g, whiteLed, side * 4.75, 21.95, 0, 0.28, 0.45, 0.28, sphere);
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
    const size = 256;
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

    for (let i = 0; i < 84; i++) {
      const rx = hash01(i * 11 + 3) * size;
      const ry = hash01(i * 19 + 7) * size;
      const rw = 22 + hash01(i * 23 + 5) * 48;
      const rh = 4 + hash01(i * 29 + 1) * 7;
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
    for (let i = 0; i < 36; i++) {
      const sx = hash01(i * 37 + 13) * size;
      const sy = hash01(i * 41 + 17) * size;
      const sl = 7 + hash01(i * 43 + 9) * 18;
      cCtx.fillStyle = 'rgba(235, 252, 255, 0.34)';
      cCtx.fillRect(sx, sy, sl, 1.5);
      sCtx.fillStyle = 'rgba(255, 255, 255, 0.55)';
      sCtx.fillRect(sx, sy, sl * 0.8, 1.5);
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
    bumpMap: scene.userData?.lowEnd ? null : oceanTex.bumpMap,
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
  seaSwellMesh.renderOrder = 1;
  seaWorld.add(seaSwellMesh);

  // Shimmering Sun-Glint reflection trail (8 glints -> 1 InstancedMesh!)
  const glintMat = new MeshBasicMaterial({
    color: 0xfff3c4, map: softGlintTex, transparent: true, opacity: 0.46, depthWrite: false
  });
  const sunGlintInst = new InstancedMesh(planeGeo, glintMat, 8);
  sunGlintInst.frustumCulled = false;
  sunGlintInst.renderOrder = 1;
  sunGlintInst.instanceMatrix.setUsage(DynamicDrawUsage);
  seaWorld.add(sunGlintInst);
  const sunGlints = Array.from({ length: 8 }, (_, i) => ({
    baseX: 16 + i * 2.4, z: -42 - i * 32, gd: 16 + i * 5.5, seed: i * 1.37
  }));

  // 18 Rolling Ocean Whitecap Foam Wave Crests (18 meshes -> 1 InstancedMesh!)
  const waveCrestInst = new InstancedMesh(planeGeo, crestMat, 18);
  waveCrestInst.frustumCulled = false;
  waveCrestInst.renderOrder = 1;
  waveCrestInst.instanceMatrix.setUsage(DynamicDrawUsage);
  seaWorld.add(waveCrestInst);
  const waveCrests = Array.from({ length: 18 }, (_, i) => ({
    side: i % 2 === 0 ? -1 : 1,
    xOff: 10 + (i % 6) * 12,
    zOff: (i * 19) % 280,
    wLen: 6.5 + (i % 4) * 3.0,
    wDep: 1.45 + (i % 3) * 0.45,
    seed: i * 2.1
  }));

  // Luxury White Yachts & Sailboats with billowing sails + soft V-shaped foaming water wakes (baked!)
  const hullWhite = getMat('reBoatW', { color: 0xf8fafc, roughness: 0.16, metalness: 0.22 });
  const hullNavy = getMat('reBoatN', { color: 0x1e3a8a, roughness: 0.24, metalness: 0.36 });
  const deckTeak = getMat('reBoatT', { color: 0xb47b47, roughness: 0.65 });
  const sailMat = getMat('reBoatSail', { color: 0xffffff, roughness: 0.45, side: DoubleSide });
  const wakeMat = new MeshBasicMaterial({ color: 0xe8fbff, map: softFoamTex, transparent: true, opacity: 0.62, depthWrite: false });

  function buildBoat(isSailboat) {
    const b = new Group();
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
      part(b, hullWhite, 0, 1.65, -0.5, 1.85, 1.25, 4.2);
      part(b, metroGlass, 0, 1.72, 0.45, 1.90, 0.62, 2.5);
      part(b, hullWhite, 0, 2.45, -1.1, 1.55, 0.52, 2.4);
      part(b, cyanLed, 0, 1.12, 0, 2.28, 0.09, 6.2);
    }
    for (const ws of [-1, 1]) {
      const wake = new Mesh(planeGeo, wakeMat);
      wake.rotation.x = -Math.PI / 2;
      wake.position.set(ws * 1.45, 0.08, -7.8);
      wake.rotation.z = ws * 0.24;
      wake.scale.set(0.85, 11.5, 1);
      b.add(wake);
    }
    return bakeGroup(b);
  }

  const seaBoats = [
    { mesh: buildBoat(true),  side: -1, x: -68, speed: 2.2, span: 340, offset: 45 },
    { mesh: buildBoat(false), side: 1,  x: 82,  speed: 3.5, span: 380, offset: 160 }
  ];
  for (const bt of seaBoats) {
    bt.mesh.scale.setScalar(1.25);
    seaWorld.add(bt.mesh);
  }

  // Scenic Coastal Rocky Islands + Photorealistic School Map Trees + Red-and-White Lighthouse!
  const lhRed = getMat('reLhRed', { color: 0xdc2626, roughness: 0.32 });
  const beaconBeamMat = new MeshBasicMaterial({
    color: 0xfff3a8, transparent: true, opacity: 0.28, side: DoubleSide, depthWrite: false
  });
  const lighthouseBeacon = new Group();

  // ---------------------------------------------------------------------------
  // PHOTOREALISTIC ISLAND MATERIALS: COASTAL GRANITE CLIFFS, JUNGLE TURF & EARTH SOIL
  // ---------------------------------------------------------------------------
  function createRealisticRockMat() {
    if (typeof document === 'undefined') {
      return getMat('reRockFb', { color: 0x8a8277, roughness: 0.85, metalness: 0.05 });
    }
    const S = 128;
    const cv = document.createElement('canvas');
    cv.width = S; cv.height = S;
    const ctx = cv.getContext('2d');
    const bCv = document.createElement('canvas');
    bCv.width = S; bCv.height = S;
    const bCtx = bCv.getContext('2d');
    if (!ctx || !bCtx) return getMat('reRockFb', { color: 0x8a8277, roughness: 0.85, metalness: 0.05 });

    const grad = ctx.createLinearGradient(0, 0, S, S);
    grad.addColorStop(0, '#aba399');
    grad.addColorStop(0.35, '#8e867b');
    grad.addColorStop(0.70, '#6e675e');
    grad.addColorStop(1, '#423b34');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, S, S);
    bCtx.fillStyle = '#808080';
    bCtx.fillRect(0, 0, S, S);

    for (let y = 0; y < S; y += 6 + hash01(y * 13) * 8) {
      const dark = hash01(y * 19) > 0.45;
      ctx.fillStyle = dark ? 'rgba(55, 48, 42, 0.28)' : 'rgba(235, 228, 220, 0.28)';
      ctx.fillRect(0, y, S, 1.5 + hash01(y * 23) * 2);
      bCtx.fillStyle = dark ? '#656565' : '#9b9b9b';
      bCtx.fillRect(0, y, S, 1.5 + hash01(y * 23) * 2);
    }

    const imgData = ctx.getImageData(0, 0, S, S);
    const d = imgData.data;
    const bImg = bCtx.getImageData(0, 0, S, S);
    const bd = bImg.data;
    let seed = 48271;
    for (let i = 0; i < d.length; i += 4) {
      seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
      const n = (((seed >>> 24) / 255) - 0.5) * 32;
      d[i] = Math.max(0, Math.min(255, d[i] + n));
      d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n * 0.95));
      d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n * 0.90));
      const bn = Math.max(0, Math.min(255, bd[i] + n * 1.1));
      bd[i] = bd[i + 1] = bd[i + 2] = bn;
    }
    ctx.putImageData(imgData, 0, 0);
    bCtx.putImageData(bImg, 0, 0);

    for (let i = 0; i < 16; i++) {
      let cx = hash01(i * 31) * S, cy = hash01(i * 37) * S;
      ctx.strokeStyle = 'rgba(40, 34, 28, 0.65)';
      ctx.lineWidth = 1.0;
      bCtx.strokeStyle = '#404040';
      bCtx.lineWidth = 1.0;
      ctx.beginPath(); bCtx.beginPath();
      ctx.moveTo(cx, cy); bCtx.moveTo(cx, cy);
      for (let s = 0; s < 3; s++) {
        cx += (hash01(i * 47 + s * 13) - 0.5) * 14;
        cy += hash01(i * 53 + s * 17) * 11;
        ctx.lineTo(cx, cy); bCtx.lineTo(cx, cy);
      }
      ctx.stroke(); bCtx.stroke();
    }
    for (let i = 0; i < 14; i++) {
      const mx = hash01(i * 61) * S, my = hash01(i * 67) * (S * 0.7);
      ctx.fillStyle = 'rgba(46, 125, 50, 0.40)';
      ctx.beginPath();
      ctx.arc(mx, my, 3 + hash01(i * 71) * 5, 0, Math.PI * 2);
      ctx.fill();
    }

    const tex = new CanvasTexture(cv);
    tex.colorSpace = SRGBColorSpace;
    tex.wrapS = tex.wrapT = RepeatWrapping;
    tex.repeat.set(2, 2);

    const bumpTex = new CanvasTexture(bCv);
    bumpTex.wrapS = bumpTex.wrapT = RepeatWrapping;
    bumpTex.repeat.set(2, 2);

    return new MeshStandardMaterial({
      map: tex,
      bumpMap: bumpTex,
      bumpScale: 0.10,
      roughness: 0.84,
      metalness: 0.04
    });
  }

  function createRealisticIslandTurfMat() {
    if (typeof document === 'undefined') {
      return getMat('reTurfFb', { color: 0x2e8540, roughness: 0.88 });
    }
    const turfMap = new TextureLoader().load(new URL('./assets/street/turf.webp', import.meta.url).href);
    turfMap.wrapS = RepeatWrapping;
    turfMap.wrapT = RepeatWrapping;
    turfMap.repeat.set(8, 8);
    turfMap.colorSpace = SRGBColorSpace;
    return new MeshStandardMaterial({
      map: turfMap,
      color: 0x2e8540,
      roughness: 0.88,
      metalness: 0.04
    });
  }

  function createRealisticIslandSoilMat() {
    if (typeof document === 'undefined') {
      return getMat('reSoilFb', { color: 0xc49e65, roughness: 0.92 });
    }
    const S = 128;
    const cv = document.createElement('canvas');
    cv.width = S; cv.height = S;
    const ctx = cv.getContext('2d');
    const bCv = document.createElement('canvas');
    bCv.width = S; bCv.height = S;
    const bCtx = bCv.getContext('2d');
    if (!ctx || !bCtx) return getMat('reSoilFb', { color: 0xc49e65, roughness: 0.92 });

    const grad = ctx.createLinearGradient(0, 0, S, S);
    grad.addColorStop(0, '#f2dfbc');
    grad.addColorStop(0.35, '#e4ca9e');
    grad.addColorStop(0.70, '#c9a874');
    grad.addColorStop(1, '#8f6e42');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, S, S);
    bCtx.fillStyle = '#808080';
    bCtx.fillRect(0, 0, S, S);

    const imgData = ctx.getImageData(0, 0, S, S);
    const d = imgData.data;
    const bImg = bCtx.getImageData(0, 0, S, S);
    const bd = bImg.data;
    let seed = 91827;
    for (let i = 0; i < d.length; i += 4) {
      seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
      const n = (((seed >>> 24) / 255) - 0.5) * 28;
      d[i] = Math.max(0, Math.min(255, d[i] + n));
      d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n * 0.92));
      d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n * 0.80));
      const bn = Math.max(0, Math.min(255, bd[i] + n));
      bd[i] = bd[i + 1] = bd[i + 2] = bn;
    }
    ctx.putImageData(imgData, 0, 0);
    bCtx.putImageData(bImg, 0, 0);

    ctx.lineWidth = 1.2;
    bCtx.lineWidth = 1.2;
    for (let y = 8; y < S; y += 12) {
      const light = hash01(y * 11) > 0.5;
      ctx.strokeStyle = light ? 'rgba(255, 248, 230, 0.35)' : 'rgba(120, 95, 60, 0.20)';
      bCtx.strokeStyle = light ? '#9c9c9c' : '#686868';
      ctx.beginPath(); bCtx.beginPath();
      ctx.moveTo(0, y); bCtx.moveTo(0, y);
      ctx.bezierCurveTo(32, y + 3, 96, y - 3, S, y);
      bCtx.bezierCurveTo(32, y + 3, 96, y - 3, S, y);
      ctx.stroke(); bCtx.stroke();
    }

    const tex = new CanvasTexture(cv);
    tex.colorSpace = SRGBColorSpace;
    tex.wrapS = tex.wrapT = RepeatWrapping;
    tex.repeat.set(4, 4);

    const bumpTex = new CanvasTexture(bCv);
    bumpTex.wrapS = bumpTex.wrapT = RepeatWrapping;
    bumpTex.repeat.set(4, 4);

    return new MeshStandardMaterial({
      map: tex,
      bumpMap: bumpTex,
      bumpScale: 0.06,
      roughness: 0.92,
      metalness: 0.02
    });
  }

  // Smooth, organic rounded coastal granite boulders (Exact Reference Image!)
  function buildSculptedRockGeo(seed = 1) {
    const geo = new IcosahedronGeometry(1, 2);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const n1 = Math.sin(x * 2.8 + seed) * 0.10;
      const n2 = Math.cos(y * 3.2 + seed * 1.5) * 0.08;
      const n3 = Math.sin(z * 2.5 + seed * 2.0) * 0.08;
      const yFlatten = y < -0.1 ? y * 0.5 : (y * 0.95 + 0.05);
      const scale = 1 + n1 + n2 + n3;
      pos.setXYZ(i, x * scale, yFlatten * scale, z * scale);
    }
    geo.computeVertexNormals();
    return geo;
  }

  // Smooth natural tropical island cay / atoll mound
  function buildIslandTerrainGeo(seed = 1) {
    const geo = new SphereGeometry(1, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const angle = Math.atan2(z, x);
      const coastWobble = 1 + Math.sin(angle * 3 + seed) * 0.12 + Math.cos(angle * 5 + seed * 1.8) * 0.06;
      pos.setXYZ(i, x * coastWobble, y, z * coastWobble);
    }
    geo.computeVertexNormals();
    return geo;
  }

  const islandSoilMat = createRealisticIslandSoilMat();
  const islandTurfMat = createRealisticIslandTurfMat();
  const photoRockMat = createRealisticRockMat();

  const islandSandGeo = buildIslandTerrainGeo(1);
  const islandTurfGeo = buildIslandTerrainGeo(2);
  const rockGeoA = buildSculptedRockGeo(3);
  const rockGeoB = buildSculptedRockGeo(7);
  const rockGeoC = buildSculptedRockGeo(11);

  const treeTexCache = new Map();
  function loadTreeTexture(name) {
    if (typeof document === 'undefined') return null;
    if (!treeTexCache.has(name)) {
      const map = new TextureLoader().load(new URL('./assets/street/' + name + '.webp', import.meta.url).href);
      map.colorSpace = SRGBColorSpace;
      map.wrapS = RepeatWrapping;
      treeTexCache.set(name, map);
    }
    return treeTexCache.get(name);
  }

  const islandTreeMats = new Map();
  function getIslandTreeMaterial(species) {
    if (!islandTreeMats.has(species)) {
      const tex = loadTreeTexture(species);
      islandTreeMats.set(species, new MeshStandardMaterial({
        map: tex,
        alphaTest: 0.45,
        side: DoubleSide,
        roughness: 0.85,
        color: 0xf5f3e8
      }));
    }
    return islandTreeMats.get(species);
  }

  // Single merged cross-plane geometry for distant island trees (44 shadow draws -> 2 non-shadow InstancedMeshes per island!)
  const crossTreeGeo = (() => {
    const p1 = new PlaneGeometry(1, 1);
    p1.translate(0, 0.5, 0);
    const p2 = new PlaneGeometry(1, 1);
    p2.rotateY(Math.PI / 2);
    p2.translate(0, 0.5, 0);
    const merged = mergeGeometries([p1, p2], false);
    p1.dispose(); p2.dispose();
    return merged;
  })();

  const islandTreeBatches = [];
  function buildCoastalIsland(hasLighthouse) {
    const isl = new Group();
    const staticRaw = new Group();
    const palmSpecs = [];
    const neemSpecs = [];
    const queueTree = (x, y, z, height, isPalm, seedOffset) => {
      const width = height * (isPalm ? 0.82 : 1.08);
      const seed = Math.abs(x * 3.7 + z * 5.1 + height * 2.3 + seedOffset);
      (isPalm ? palmSpecs : neemSpecs).push({ x, y, z, width, height, seed });
    };
    if (hasLighthouse) {
      part(staticRaw, islandSoilMat, 0, 0.45, 0, 26, 1.4, 20, islandSandGeo);
      part(staticRaw, islandTurfMat, -1.2, 1.8, -0.6, 17, 3.2, 13, islandTurfGeo);
      part(staticRaw, photoRockMat, -3.2, 2.4, -1.5, 9.5, 4.2, 7.8, rockGeoA);
      part(staticRaw, photoRockMat, 5.0, 1.0, 2.0, 6.2, 2.6, 4.8, rockGeoB);
      part(staticRaw, photoRockMat, -6.0, 0.8, 3.0, 5.4, 2.2, 4.4, rockGeoC);

      const iFoam = new Mesh(ringGeo, foamMat);
      iFoam.rotation.x = Math.PI / 2;
      iFoam.position.set(0, 0.22, 0);
      iFoam.scale.set(34, 26, 0.45);
      isl.add(iFoam);
      isl.userData.foam = iFoam;

      queueTree(3.5, 1.2, 2.2, 11.5, true, 1);
      queueTree(5.2, 0.8, -1.2, 10.2, true, 2);
      queueTree(-4.2, 1.4, 2.8, 12.0, true, 3);
      queueTree(-5.5, 0.9, -1.8, 9.8, true, 4);
      queueTree(2.2, 2.6, -3.2, 13.0, true, 5);
      queueTree(-1.8, 3.0, 3.5, 11.0, true, 6);
      queueTree(4.8, 1.6, 3.8, 9.2, true, 7);
      queueTree(0.8, 3.8, 1.5, 8.6, false, 8);
      queueTree(-2.8, 4.0, -1.2, 7.8, false, 9);
      queueTree(2.8, 3.2, -1.5, 8.2, false, 10);

      part(staticRaw, photoRockMat, -3.2, 4.8, -1.5, 2.4, 0.8, 2.4, cyl12);
      part(staticRaw, metroWhite, -3.2, 6.8, -1.5, 1.5, 3.2, 1.5, cyl12);
      part(staticRaw, lhRed, -3.2, 9.2, -1.5, 1.3, 2.0, 1.3, cyl12);
      part(staticRaw, metroWhite, -3.2, 10.9, -1.5, 1.2, 1.6, 1.2, cyl12);
      part(staticRaw, lhRed, -3.2, 12.3, -1.5, 1.1, 1.2, 1.1, cyl12);
      part(staticRaw, darkMetal, -3.2, 13.1, -1.5, 1.7, 0.14, 1.7, cyl12);
      part(staticRaw, steel, -3.2, 13.4, -1.5, 1.65, 0.45, 1.65, cyl12);
      part(staticRaw, warmLamp, -3.2, 14.1, -1.5, 1.05, 1.2, 1.05, cyl12);
      part(staticRaw, lhRed, -3.2, 15.3, -1.5, 1.25, 1.3, 1.25, coneGeo);
      part(staticRaw, steel, -3.2, 16.2, -1.5, 0.08, 0.8, 0.08, cyl12);
      lighthouseBeacon.position.set(-3.2, 14.1, -1.5);
      isl.add(lighthouseBeacon);
      for (const dir of [-1, 1]) {
        const beam = new Mesh(coneGeo, beaconBeamMat);
        beam.rotation.z = dir * Math.PI / 2;
        beam.position.set(dir * 16, 0, 0);
        beam.scale.set(3.2, 32, 3.2);
        lighthouseBeacon.add(beam);
      }
    } else {
      part(staticRaw, islandSoilMat, 0, 0.45, 0, 28, 1.5, 22, islandSandGeo);
      part(staticRaw, islandTurfMat, 1.0, 1.8, 0.5, 19, 3.4, 15, islandTurfGeo);
      part(staticRaw, photoRockMat, 4.5, 1.0, -2.2, 7.8, 3.2, 5.8, rockGeoA);
      part(staticRaw, photoRockMat, -5.2, 0.9, 2.8, 6.5, 2.8, 5.2, rockGeoB);
      part(staticRaw, photoRockMat, 2.2, 0.7, 3.8, 5.2, 2.2, 4.2, rockGeoC);

      const iFoam = new Mesh(ringGeo, foamMat);
      iFoam.rotation.x = Math.PI / 2;
      iFoam.position.set(0, 0.22, 0);
      iFoam.scale.set(36, 28, 0.45);
      isl.add(iFoam);
      isl.userData.foam = iFoam;

      queueTree(-3.0, 2.2, 2.4, 13.5, true, 11);
      queueTree(-5.0, 1.2, 3.8, 11.8, true, 12);
      queueTree(-6.2, 0.8, -1.2, 12.5, true, 13);
      queueTree(2.8, 1.8, 3.0, 11.0, true, 14);
      queueTree(4.8, 0.9, -2.4, 12.2, true, 15);
      queueTree(-1.5, 3.2, -3.0, 14.0, true, 16);
      queueTree(2.2, 2.4, -3.6, 10.5, true, 17);
      queueTree(-5.8, 1.4, 1.5, 12.8, true, 18);
      queueTree(0.5, 4.2, 0.5, 9.5, false, 19);
      queueTree(-2.4, 4.0, 1.0, 8.8, false, 20);
      queueTree(1.8, 3.6, -1.0, 8.2, false, 21);
      queueTree(-3.6, 3.2, -1.8, 8.5, false, 22);
    }
    isl.add(bakeGroup(staticRaw));
    for (const [species, specs] of [['palm', palmSpecs], ['neem', neemSpecs]]) {
      if (!specs.length) continue;
      const inst = new InstancedMesh(crossTreeGeo, getIslandTreeMaterial(species), specs.length);
      inst.castShadow = false;
      inst.receiveShadow = false;
      inst.frustumCulled = false;
      inst.instanceMatrix.setUsage(DynamicDrawUsage);
      specs.forEach((sp, idx) => {
        skyDummy.position.set(sp.x, sp.y, sp.z);
        skyDummy.rotation.set(0, 0, 0);
        skyDummy.scale.set(sp.width, sp.height, sp.width);
        skyDummy.updateMatrix();
        inst.setMatrixAt(idx, skyDummy.matrix);
      });
      inst.instanceMatrix.needsUpdate = true;
      isl.add(inst);
      islandTreeBatches.push({ inst, specs });
    }
    return isl;
  }

  // Position islands at scenic middle-distance in the ocean bay (Exact Reference Image!)
  const islandRight = buildCoastalIsland(true);
  islandRight.scale.set(1.2, 1.15, 1.2);
  islandRight.position.set(78, SEA_Y, -165);
  const islandLeft = buildCoastalIsland(false);
  islandLeft.scale.set(1.25, 1.2, 1.25);
  islandLeft.position.set(-88, SEA_Y, -195);
  seaWorld.add(islandRight, islandLeft);

  // Floating Port (Red) & Starboard (Green) Ocean Channel Navigation Buoys with bobbing surf rings (baked!)
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
    return bakeGroup(g);
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

  // Futuristic White & Cyan Glass Bridge Exit Archway + Coastal Seawall Landing at plan.end (baked!)
  const skyExitRaw = new Group();
  for (const side of [-1, 1]) {
    part(skyExitRaw, metroWhite, side * 4.45, 3.4, 0, 1.15, 6.8, 1.45);
    part(skyExitRaw, cyanLed, side * 3.84, 3.4, 0, 0.16, 5.4, 0.34);
  }
  part(skyExitRaw, metroWhite, 0, 6.6, 0, 10.0, 1.15, 1.65);
  part(skyExitRaw, cyanLed, 0, 5.98, 0, 7.8, 0.18, 0.38);
  part(skyExitRaw, exitPortalSignMat('MAIN ROAD AHEAD'), 0, 6.6, 0.88, 6.4, 1.12, 0.10);
  part(skyExitRaw, concrete, 0, -2.55, -0.6, 180, 4.6, 1.4);
  part(skyExitRaw, metroWhite, 0, -0.18, -0.5, 180, 0.30, 1.75);
  part(skyExitRaw, cyanLed, 0, -0.02, 0.28, 180, 0.12, 0.16);
  const skyExitArch = bakeGroup(skyExitRaw);
  scene.add(skyExitArch);
  skyExitArch.visible = false;

  // ---------------------------------------------------------------------------
  // 3. SEAMLESS 1,000m ENDLESS LOOPING 3-LANE NEON UNDERPASS TUNNEL (IMAGE 2!)
  //    24 world-aligned modular bays reaching cleanly into horizon fog & sealing exit!
  // ---------------------------------------------------------------------------
  //    CAVE STYLE: rugged boulder rock walls arching inward + a crystal GLASS SKYLIGHT roof
  //    down the middle so the sky, skyscrapers, helicopter & blimp stay visible overhead.
  const tunLoop = new Group();
  tunLoop.name = 'metro-tunnel';
  scene.add(tunLoop);
  tunLoop.visible = false;
  const CAVE_ROOF_Y = 7.45;
  // Exact Reference Image 3 Twin Cascading 3D Waterfalls pouring down cavern walls
  function createWaterfallMat() {
    if (typeof document === 'undefined') {
      return getMat('reWaterfallFb', { color: 0x38bdf8, roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.8 });
    }
    const cv = document.createElement('canvas');
    cv.width = 128; cv.height = 256;
    const ctx = cv.getContext('2d');
    if (!ctx) return getMat('reWaterfallFb', { color: 0x38bdf8, roughness: 0.1 });
    const g = ctx.createLinearGradient(0, 0, 128, 0);
    g.addColorStop(0, 'rgba(14, 165, 233, 0.35)');
    g.addColorStop(0.2, 'rgba(56, 189, 248, 0.75)');
    g.addColorStop(0.5, 'rgba(255, 255, 255, 0.95)');
    g.addColorStop(0.8, 'rgba(56, 189, 248, 0.75)');
    g.addColorStop(1, 'rgba(14, 165, 233, 0.35)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 256);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    for (let x = 8; x < 120; x += 12) {
      for (let y = 0; y < 256; y += 16) {
        const h = 8 + ((x * 7 + y * 13) % 24);
        ctx.fillRect(x, y, 3, h);
      }
    }
    const tex = new CanvasTexture(cv);
    tex.colorSpace = SRGBColorSpace;
    tex.wrapS = RepeatWrapping;
    tex.wrapT = RepeatWrapping;
    tex.repeat.set(1, 2);
    const mat = new MeshStandardMaterial({
      map: tex,
      emissiveMap: tex,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.82,
      roughness: 0.12,
      metalness: 0.25,
      transparent: true,
      opacity: 0.84,
      side: DoubleSide
    });
    mat.userData = { tex };
    return mat;
  }
  const waterfallMat = createWaterfallMat();

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
      const lowCave = Boolean(scene.userData?.lowEnd);
      const rows = lowCave ? [-5.3, 0, 5.3] : [-6.4, -3.2, 0, 3.2, 6.4];
      const zStretch = lowCave ? 1.45 : 1.0;
      rows.forEach((rz, ri) => {
        profile.forEach(([px, py, r], pi) => {
          const seed = ri * 13 + pi * 7 + (side > 0 ? 101 : 0);
          const j1 = hash01(seed) - 0.5, j2 = hash01(seed + 1) - 0.5, j3 = hash01(seed + 2) - 0.5;
          const mat = [rockA, rockB, rockC][(ri + pi + (side > 0 ? 1 : 0)) % 3];
          const rock = part(bay, mat, side * (px + j1 * 0.22), py + j2 * 0.3, rz + j3 * 0.7,
            r * (0.92 + j1 * 0.12), r * (0.95 + j2 * 0.2), r * (1.5 + j3 * 0.3) * zStretch, rockGeo);
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

      // Cascading 3D Waterfall sheets pouring down rock walls + frothing splash pools at base
      part(bay, waterfallMat, side * 4.38, 3.85, 0, 0.14, 6.2, 3.4);
      part(bay, foamMat, side * 4.15, 0.32, 0, 0.95, 0.28, 3.8);
    }
    const signalPink = getMat('metroPink', {color:0xff457e,emissive:0xcc1353,emissiveIntensity:.65});
    for (const lane of [-1,0,1]) {
      for (const dx of [-.60,.60]) part(bay,steel,lane*2.2+dx,.18,0,.085,.09,BAY_LEN);
      for (let z=-7.5; z<8; z+=1.6) part(bay,darkMetal,lane*2.2,.12,z,1.66,.08,.27);
    }
    for (const side of [-1,1]) {
      part(bay,side<0?signalPink:cyanLed,side*3.78,1.8,0,.1,.16,15.8);
      part(bay,warmLamp,side*3.82,3.6,-5,.14,.46,.32);
    }
    return bakeGroup(bay);
  }

  const caveTemplate = buildCaveBay();
  const glassTemplate = new Group();
  for (const part of [...caveTemplate.children]) {
    if (part.material.transparent) glassTemplate.add(part);
  }
  // Short batches keep frustum culling effective around bends. Glass, water
  // and foam remain individual meshes for back-to-front transparency sorting.
  const baysPerBatch = 6;
  const tunnelBatches = Array.from({ length: BAY_COUNT / baysPerBatch }, () => {
    const opaque = caveTemplate.children.map(part => {
      const mesh = new InstancedMesh(part.geometry, part.material, baysPerBatch);
      mesh.receiveShadow = part.receiveShadow;
      tunLoop.add(mesh);
      return mesh;
    });
    const glass = Array.from({ length: baysPerBatch }, () => {
      const bay = glassTemplate.clone();
      bay.matrixAutoUpdate = false;
      tunLoop.add(bay);
      return bay;
    });
    return { opaque, glass };
  });
  let lastTunnelBay, lastPlanStart, lastCurveStart, lastCurveEnd;
  function positionTunnel(state, plan) {
    const first = Math.max(0, Math.floor((state.distance - plan.start - 32) / BAY_LEN));
    tunLoop.position.set(-branchCurveX(state.distance, state), -branchCurveY(state.distance, state), state.distance - plan.start);
    if (first === lastTunnelBay && plan.start === lastPlanStart &&
        state.branchStart === lastCurveStart && state.branchEnd === lastCurveEnd) return;
    lastTunnelBay = first;
    lastPlanStart = plan.start;
    lastCurveStart = state.branchStart;
    lastCurveEnd = state.branchEnd;

    const tunFar = scene.userData?.ultraLow ? 158 : scene.userData?.lowEnd ? 210 : Infinity;
    const tunGlassFar = scene.userData?.ultraLow ? 78 : tunFar;
    let n = first;
    for (const { opaque, glass } of tunnelBatches) {
      let count = 0;
      for (const bay of glass) {
        const start = plan.start + n++ * BAY_LEN;
        const length = Math.min(BAY_LEN, plan.end - start);
        const center = start + length / 2;
        const relZ = center - state.distance;
        const inRange = length > 0 && relZ <= tunFar;
        bay.visible = inRange && relZ <= tunGlassFar;
        if (!inRange) continue;
        bay.position.set(branchCurveX(center, state), branchCurveY(center, state), plan.start - center);
        bay.rotation.y = -Math.atan(curveSlopeAt(center, state));
        bay.scale.z = length / BAY_LEN;
        bay.updateMatrix();
        for (const mesh of opaque) mesh.setMatrixAt(count, bay.matrix);
        count++;
      }
      for (const mesh of opaque) {
        mesh.count = count;
        mesh.visible = count > 0;
        mesh.instanceMatrix.needsUpdate = true;
        if (count) mesh.computeBoundingSphere();
      }
    }
  }

  // Tall Sunlit Cave Exit Portal at plan.end (baked!)
  const tunExitRaw = new Group();
  for (const side of [-1, 1]) {
    part(tunExitRaw, concreteLight, side * 5.15, 3.95, 0, 1.55, 7.9, 1.65);
    part(tunExitRaw, hazard, side * 5.15, 1.45, 0, 1.62, 1.55, 1.72);
    part(tunExitRaw, warmLamp, side * 5.15, 6.10, 0.88, 0.72, 0.50, 0.08);
  }
  part(tunExitRaw, concrete, 0, 8.25, 0, 11.9, 1.05, 1.65);
  part(tunExitRaw, steel, 0, 8.92, 0, 11.4, 0.14, 0.16);
  part(tunExitRaw, exitPortalSignMat('TUNNEL EXIT · SUNLIGHT'), 0, 8.25, 0.88, 6.6, 0.95, 0.10);
  const tunExitPortal = bakeGroup(tunExitRaw);
  scene.add(tunExitPortal);
  tunExitPortal.visible = false;

  // Exact Reference Image 3 Swirling Cosmic Blue Energy Vortex Portal at Metro Tunnel Horizon
  function createCosmicPortalMat() {
    if (typeof document === 'undefined') {
      return getMat('rePortalFb', { color: 0x00f0ff, roughness: 0.1, emissive: 0x00f0ff, emissiveIntensity: 1.2 });
    }
    const cv = document.createElement('canvas');
    cv.width = 256; cv.height = 256;
    const ctx = cv.getContext('2d');
    if (!ctx) return getMat('rePortalFb', { color: 0x00f0ff, roughness: 0.1 });
    const cx = 128, cy = 128;
    const g = ctx.createRadialGradient(cx, cy, 6, cx, cy, 126);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.2, '#00f0ff');
    g.addColorStop(0.5, '#2563eb');
    g.addColorStop(0.85, '#0c1a40');
    g.addColorStop(1, 'rgba(12, 26, 64, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 3.5;
    for (let arm = 0; arm < 5; arm++) {
      const base = arm * Math.PI * 0.4;
      ctx.beginPath();
      for (let r = 8; r < 120; r += 2) {
        const th = base + r * 0.095;
        const x = cx + Math.cos(th) * r;
        const y = cy + Math.sin(th) * r;
        if (r === 8) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    const tex = new CanvasTexture(cv);
    tex.colorSpace = SRGBColorSpace;
    return new MeshBasicMaterial({
      map: tex,
      transparent: true,
      opacity: 0.92,
      side: DoubleSide,
      depthWrite: false
    });
  }
  const cosmicPortalMat = createCosmicPortalMat();
  const tunnelCosmicPortal = new Group();
  tunnelCosmicPortal.name = 'tunnel-cosmic-portal';
  scene.add(tunnelCosmicPortal);
  tunnelCosmicPortal.visible = false;
  const pDisc1 = new Mesh(planeGeo, cosmicPortalMat);
  pDisc1.scale.set(24, 24, 1);
  const pDisc2 = new Mesh(planeGeo, cosmicPortalMat);
  pDisc2.scale.set(18, 18, 1);
  pDisc2.position.z = 0.4;
  const pCore = new Mesh(sphere, new MeshBasicMaterial({ color: 0xe0f7ff, transparent: true, opacity: 0.95 }));
  pCore.scale.set(2.4, 2.4, 0.8);
  tunnelCosmicPortal.add(pDisc1, pDisc2, pCore);

  // ---------------------------------------------------------------------------
  // 4. ANIMATED OVERHEAD ELEVATED METRO VIADUCT BRIDGES + WHITE/BLUE METRO TRAINS
  //    Baked templates drop 285 draw calls down to ~24 across all 3 pooled bridges!
  // ---------------------------------------------------------------------------
  function buildMetroViaductTemplates() {
    const deckRaw = new Group();
    for (const side of [-1, 1]) {
      // Deep piers reach cleanly down below SEA_Y so overhead viaducts over the Glass Sea-Bridge never float!
      part(deckRaw, concrete, side * 6.3, 0.25, 0, 2.0, 11.5, 2.2);
      part(deckRaw, hazard, side * 6.3, 0.68, 0, 2.14, 1.15, 2.34);
      part(deckRaw, hazard, side * 4.6, 6.55, 1.62, 2.1, 0.68, 0.14);
      part(deckRaw, darkMetal, side * 6.3, 3.2, 1.12, 0.66, 2.55, 0.10);
      part(deckRaw, cyanLed, side * 6.3, 3.2, 1.18, 0.44, 2.30, 0.08);
      part(deckRaw, concrete, side * 6.3, 5.85, 0, 3.0, 0.85, 2.5);
      // Extensive marine bridge piers descending deep into the ocean every 44m across the whole horizon!
      for (let px = 28; px <= 780; px += 44) {
        part(deckRaw, concrete, side * px, -1.0, 0, 2.6, 14.0, 2.6);
        part(deckRaw, concreteDark, side * px, 5.85, 0, 3.4, 0.85, 2.8);
        part(deckRaw, hazard, side * px, 0.68, 0, 2.8, 1.25, 2.8);
      }
    }
    // Continuous trans-bay viaduct deck spanning 1600m edge-to-edge across the screen horizon
    part(deckRaw, concrete, 0, 6.75, 0, 1600, 1.15, 3.2);
    part(deckRaw, concreteDark, 0, 7.36, 0, 1600, 0.14, 3.35);
    for (let lx = -780; lx <= 780; lx += 24) {
      part(deckRaw, cyanLed, lx, 6.14, 0.9, 1.85, 0.18, 0.45);
    }
    for (const rz of [-1.55, 1.55]) {
      part(deckRaw, steel, 0, 7.95, rz, 1600, 0.14, 0.12);
      for (let px = -792; px <= 792; px += 8.0) part(deckRaw, steel, px, 7.65, rz, 0.14, 0.62, 0.14);
    }
    const trainRaw = new Group();
    for (let car = 0; car < 4; car++) {
      const cx = -11.4 + car * 7.6;
      const isEnd = car === 0 || car === 3;
      const carLen = isEnd ? 7.2 : 7.0;
      part(trainRaw, metroWhite, cx, 1.25, 0, carLen, 2.15, 2.08);
      part(trainRaw, metroBlue, cx, 0.56, 0, carLen + 0.04, 0.42, 2.12);
      part(trainRaw, darkMetal, cx, 0.18, 0, carLen - 0.6, 0.34, 1.78);
      part(trainRaw, metroGlass, cx, 1.48, 0, carLen - 0.85, 0.86, 2.14);
      for (const dx of [-2.0, 0, 2.0]) part(trainRaw, metroWhite, cx + dx, 1.48, 0, 0.24, 0.92, 2.16);
      if (car < 3) part(trainRaw, darkMetal, cx + 3.8, 1.22, 0, 0.65, 1.90, 1.85);
      if (isEnd) {
        const dir = car === 3 ? 1 : -1;
        const noseX = cx + dir * 3.85;
        const nose = part(trainRaw, metroWhite, noseX, 1.10, 0, 1.15, 1.85, 2.02);
        nose.rotation.z = -dir * 0.28;
        const cabGlass = part(trainRaw, metroGlass, noseX + dir * 0.18, 1.48, 0, 0.92, 0.88, 1.86);
        cabGlass.rotation.z = -dir * 0.35;
        part(trainRaw, whiteLed, noseX + dir * 0.56, 0.65, 0.62, 0.12, 0.22, 0.34);
        part(trainRaw, whiteLed, noseX + dir * 0.56, 0.65, -0.62, 0.12, 0.22, 0.34);
      }
    }
    return { deckTpl: bakeGroup(deckRaw), trainTpl: bakeGroup(trainRaw) };
  }
  const metroTpls = buildMetroViaductTemplates();
  function buildMetroViaduct() {
    const bridge = new Group();
    bridge.add(metroTpls.deckTpl.clone());
    const train = metroTpls.trainTpl.clone();
    train.position.set(0, 7.45, 0);
    bridge.add(train);
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
  const heliStaticRaw = new Group();
  part(heliStaticRaw, heliRed, 0.05, 0, 0, 1.75, 0.86, 0.84, sphere);
  part(heliStaticRaw, heliRed, 1.25, -0.30, 0, 0.78, 0.42, 0.66, sphere);
  part(heliStaticRaw, heliGlass, 1.20, 0.12, 0, 0.98, 0.70, 0.76, sphere);
  part(heliStaticRaw, heliSeat, 0.85, -0.05, 0, 0.30, 0.34, 0.9);
  for (const sz of [-1, 1]) {
    part(heliStaticRaw, heliGlass, 0.25, 0.20, sz * 0.80, 0.72, 0.52, 0.05);
    part(heliStaticRaw, heliGlass, -0.55, 0.18, sz * 0.76, 0.55, 0.46, 0.05);
    part(heliStaticRaw, darkMetal, -0.15, 0.10, sz * 0.83, 0.03, 0.70, 0.03);
    part(heliStaticRaw, metroWhite, 0.05, -0.38, sz * 0.80, 2.6, 0.07, 0.04);
    part(heliStaticRaw, metroWhite, 0.05, -0.50, sz * 0.76, 2.4, 0.04, 0.04);
    part(heliStaticRaw, metroWhite, -2.65, 0.32, sz * 0.24, 2.6, 0.05, 0.03);
  }
  part(heliStaticRaw, heliRed, -0.35, 0.74, 0, 0.98, 0.34, 0.50, sphere);
  part(heliStaticRaw, heliRedDark, -0.95, 0.80, 0, 0.36, 0.20, 0.30, sphere);
  const exhaust = part(heliStaticRaw, darkMetal, -1.25, 0.82, 0, 0.11, 0.30, 0.11, cyl12);
  exhaust.rotation.z = Math.PI / 2;
  part(heliStaticRaw, darkMetal, -0.15, 1.12, 0, 0.08, 0.36, 0.08, cyl12);
  part(heliStaticRaw, darkMetal, -0.15, 1.32, 0, 0.18, 0.12, 0.18, sphere);
  const boom = new Mesh(boomGeo, heliRed);
  boom.rotation.z = Math.PI / 2;
  boom.position.set(-2.75, 0.30, 0);
  boom.scale.set(1, 3.3, 1);
  heliStaticRaw.add(boom);
  part(heliStaticRaw, heliRed, -3.75, 0.34, 0, 0.42, 0.05, 1.35);
  for (const sz of [-0.66, 0.66]) part(heliStaticRaw, heliRed, -3.75, 0.48, sz, 0.32, 0.30, 0.04);
  const fin = part(heliStaticRaw, heliRed, -4.42, 0.82, 0, 0.55, 1.15, 0.07);
  fin.rotation.z = -0.32;
  const lowFin = part(heliStaticRaw, heliRed, -4.30, 0.05, 0, 0.32, 0.45, 0.06);
  lowFin.rotation.z = 0.35;
  part(heliStaticRaw, metroWhite, -4.5, 1.25, 0, 0.32, 0.06, 0.08);
  for (const sz of [-0.78, 0.78]) {
    const skid = part(heliStaticRaw, heliRed, 0.05, -1.22, sz, 0.05, 2.7, 0.05, cyl12);
    skid.rotation.z = Math.PI / 2;
    const curl = part(heliStaticRaw, heliRed, 1.48, -1.12, sz, 0.05, 0.32, 0.05, cyl12);
    curl.rotation.z = -0.9;
    for (const sx of [0.62, -0.58]) {
      const strut = part(heliStaticRaw, heliRed, sx, -0.98, sz * 0.86, 0.045, 0.56, 0.045, cyl12);
      strut.rotation.x = -Math.sign(sz) * 0.32;
    }
  }
  for (const sx of [0.62, -0.58]) part(heliStaticRaw, heliRedDark, sx, -0.74, 0, 0.06, 1.25, 0.06, cyl12).rotation.x = Math.PI / 2;
  heliBody.add(bakeGroup(heliStaticRaw));

  const tailRotorRaw = new Group();
  part(tailRotorRaw, darkMetal, 0, 0, 0, 0.09, 1.05, 0.03);
  part(tailRotorRaw, darkMetal, 0, 0, 0, 1.05, 0.09, 0.03);
  part(tailRotorRaw, darkMetal, 0, 0, 0, 0.10, 0.10, 0.06, sphere);
  const tailRotor = bakeGroup(tailRotorRaw);
  tailRotor.position.set(-4.55, 0.85, 0.16);
  heliBody.add(tailRotor);

  const heliRotorRaw = new Group();
  for (let k = 0; k < 3; k++) {
    const blade = new Group();
    blade.rotation.y = (k * Math.PI * 2) / 3;
    heliRotorRaw.add(blade);
    part(blade, darkMetal, 3.0, 0, 0, 6.0, 0.04, 0.28);
  }
  const heliRotor = bakeGroup(heliRotorRaw);
  heliRotor.position.set(-0.15 * 1.25, 1.36 * 1.25, 0);
  helicopter.add(heliRotor);
  const rotorBlurMat = new MeshBasicMaterial({
    color: 0x1e293b, transparent: true, opacity: 0.30, side: DoubleSide, depthWrite: false
  });
  const rotorBlurDisc = new Mesh(ringGeo, rotorBlurMat);
  rotorBlurDisc.rotation.x = Math.PI / 2;
  rotorBlurDisc.scale.set(7.6, 7.6, 1);
  heliRotor.add(rotorBlurDisc);

  const tailRotorBlur = new Mesh(ringGeo, rotorBlurMat);
  tailRotorBlur.scale.set(1.4, 1.4, 1);
  tailRotor.add(tailRotorBlur);

  // Dynamic Glass Floor Reflection of Red Helicopter (baked!)
  const heliFloorReflection = new Group();
  heliFloorReflection.visible = false;
  scene.add(heliFloorReflection);
  const heliReflectRaw = new Group();
  const heliReflectMat = new MeshBasicMaterial({
    color: 0xef4444, transparent: true, opacity: 0.40, depthWrite: false
  });
  const heliReflectDark = new MeshBasicMaterial({
    color: 0x7f1d1d, transparent: true, opacity: 0.34, depthWrite: false
  });
  const heliReflectGlass = new MeshBasicMaterial({
    color: 0x93c5fd, transparent: true, opacity: 0.30, depthWrite: false
  });
  part(heliReflectRaw, heliReflectMat, 0.05, 0, 0, 1.75, 0.86, 0.84, sphere);
  part(heliReflectRaw, heliReflectMat, 1.25, -0.30, 0, 0.78, 0.42, 0.66, sphere);
  part(heliReflectRaw, heliReflectGlass, 1.20, 0.12, 0, 0.98, 0.70, 0.76, sphere);
  const reflBoom = new Mesh(boomGeo, heliReflectMat);
  reflBoom.rotation.z = Math.PI / 2;
  reflBoom.position.set(-2.75, 0.30, 0);
  reflBoom.scale.set(1, 3.3, 1);
  heliReflectRaw.add(reflBoom);
  part(heliReflectRaw, heliReflectMat, -4.42, 0.82, 0, 0.55, 1.15, 0.07);
  for (const sz of [-0.78, 0.78]) {
    const rskid = part(heliReflectRaw, heliReflectDark, 0.05, -1.22, sz, 0.08, 2.7, 0.08, cyl12);
    rskid.rotation.z = Math.PI / 2;
  }
  const heliReflectBody = bakeGroup(heliReflectRaw);
  heliReflectBody.scale.set(1.18, -0.25, 1.18);
  heliFloorReflection.add(heliReflectBody);
  const heliReflectRotor = new Mesh(ringGeo, new MeshBasicMaterial({
    color: 0xef4444, transparent: true, opacity: 0.25, side: DoubleSide, depthWrite: false
  }));
  heliReflectRotor.rotation.x = Math.PI / 2;
  heliReflectRotor.position.set(-0.15 * 1.18, 0.05, 0);
  heliReflectRotor.scale.set(6.8, 6.8, 1);
  heliFloorReflection.add(heliReflectRotor);

  // Iconic White & Blue "SKYLINE" Zeppelin Blimp (baked!)
  function createBlimpTexture() {
    if (typeof document === 'undefined') return metroWhite;
    const cv = document.createElement('canvas');
    cv.width = 512; cv.height = 256;
    const ctx = cv.getContext('2d');
    if (!ctx) return metroWhite;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 512, 256);
    ctx.fillStyle = '#0369a1';
    ctx.fillRect(0, 185, 512, 71);
    ctx.fillStyle = '#00e5ff';
    ctx.fillRect(0, 178, 512, 7);
    ctx.font = '900 68px "Arial Black", "Impact", "Segoe UI", sans-serif';
    ctx.fillStyle = 'rgba(2, 132, 199, 0.25)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SKYLINE', 258, 107);
    ctx.fillStyle = '#0284c7';
    ctx.fillText('SKYLINE', 256, 105);

    const tex = new CanvasTexture(cv);
    tex.wrapS = RepeatWrapping;
    tex.wrapT = ClampToEdgeWrapping;
    return new MeshStandardMaterial({
      map: tex, roughness: 0.25, metalness: 0.15
    });
  }

  const blimpMat = createBlimpTexture();
  const blimpRaw = new Group();
  part(blimpRaw, metroWhite, 0, 0, 0, 8.2, 3.1, 3.1, sphere);
  part(blimpRaw, metroBlue, 0, -0.35, 0, 7.8, 1.2, 3.05, sphere);
  for (const sz of [-1, 1]) {
    const decal = part(blimpRaw, blimpMat, 0.2, 0.3, sz * 2.85, 6.2, 2.0, 0.06);
    if (sz < 0) decal.rotation.y = Math.PI;
  }
  part(blimpRaw, cyanLed, 4.0, 0, 0, 0.25, 0.25, 0.25, sphere);
  part(blimpRaw, cyanLed, 0.2, -0.85, 2.95, 0.18, 0.18, 0.18, sphere);
  part(blimpRaw, cyanLed, 0.2, -0.85, -2.95, 0.18, 0.18, 0.18, sphere);
  part(blimpRaw, metroBlue, -6.6, 0, 0, 2.6, 3.8, 0.18);
  part(blimpRaw, metroBlue, -6.6, 0, 0, 2.6, 0.18, 3.8);
  part(blimpRaw, darkMetal, 0.3, -3.1, 0, 3.2, 0.95, 1.05);
  part(blimpRaw, warmLamp, 0.3, -3.1, 0.54, 2.6, 0.35, 0.08);
  part(blimpRaw, warmLamp, 0.3, -3.1, -0.54, 2.6, 0.35, 0.08);
  const blimp = bakeGroup(blimpRaw);
  scene.add(blimp);

  // ---------------------------------------------------------------------------
  // 6. FLOATING LEAVES (18 meshes -> 1 InstancedMesh!)
  // ---------------------------------------------------------------------------
  const leafMat = new MeshStandardMaterial({ color: 0x4ade80, roughness: 0.7, side: DoubleSide });
  const leafInst = new InstancedMesh(planeGeo, leafMat, 18);
  leafInst.visible = false;
  leafInst.frustumCulled = false;
  leafInst.instanceMatrix.setUsage(DynamicDrawUsage);
  scene.add(leafInst);
  const leaves = Array.from({ length: 18 }, (_, i) => ({ seed: i * 1.73 + 0.5 }));

  // Exact Reference Image 1 & 2 Branching Electric Sky Lightning Flashes
  const lightningTex = typeof document === 'undefined'
    ? null
    : new TextureLoader().load(new URL('./assets/lightning.png', import.meta.url).href);
  if (lightningTex) lightningTex.colorSpace = SRGBColorSpace;

  // Exact Reference Image 1 & 2 Branching Electric Sky Lightning Flashes
  const lightningMat = new MeshBasicMaterial({
    map: lightningTex || null,
    color: 0xffffff,
    transparent: true,
    opacity: 0.98,
    side: DoubleSide,
    depthWrite: false
  });
  const lightningBolts = new Group();
  lightningBolts.name = 'sky-lightning';
  scene.add(lightningBolts);
  const bolt1 = new Mesh(planeGeo, lightningMat);
  bolt1.scale.set(54, 44, 1);
  bolt1.position.set(0, 0, 0);
  const bolt2 = new Mesh(planeGeo, lightningMat);
  bolt2.scale.set(44, 36, 1);
  bolt2.position.set(-18, 4, 8);
  bolt2.rotation.y = 0.3;
  lightningBolts.add(bolt1, bolt2);

  const updateRoadEvents = (state, weather) => {
    const running = state.mode === 'running' || state.mode === 'countdown' || state.mode === 'starting';
    const isPark = state.map === 'itpark';
    const night = weather?.night || 0;
    const rain = weather?.rain || 0;

    // Fast path for School & College: Glass Bridge, Cave, Sea World, Metro Viaducts, Helicopter & Blimp are IT Park–only!
    if (!isPark) {
      portalArch.visible = false;
      portalPreview.visible = false;
      skyLoop.visible = false;
      tunLoop.visible = false;
      seaWorld.visible = false;
      skyExitArch.visible = false;
      tunExitPortal.visible = false;
      departHeadland.visible = false;
      returnHeadland.visible = false;
      helicopter.visible = false;
      blimp.visible = false;
      heliFloorReflection.visible = false;
      for (const p of bridgePylons) p.visible = false;
      for (const mb of metroBridges) mb.bridge.visible = false;
      leafInst.visible = false;
      lightningBolts.visible = false;
      tunnelCosmicPortal.visible = false;
      return;
    }

    // 1. Update Straight 0° Image-2 Twin-Portal & Continuous 1,000m Glass Bridge / Underpass Loop
    const plan = forkPlanAt(state.distance);
    const startRelZ = plan.start - state.distance;
    const endRelZ = plan.end - state.distance;
    const chosen = state.activeBranch;
    const onPodium = state.mode === 'ready' || state.mode === 'select';
    const isBridgePreview = isPark && onPodium;

    // Approach Twin-Portal Arch (front signs + center pier + planter) visible far ahead!
    const ultraLow = Boolean(scene.userData?.ultraLow);
    const lowEnd = Boolean(scene.userData?.lowEnd);
    const farLimit = ultraLow ? 162 : lowEnd ? 215 : 350;
    const forksOn = isPark && Boolean(state.enableForks);
    const showArch = !isBridgePreview && running && forksOn && startRelZ > -14 && startRelZ < farLimit;
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

    // Twin-Portal Approach Sleeves (Left Glass Bridge Ramp | Right Underpass Tunnel)
    const showPreview = !isBridgePreview && running && forksOn && !chosen && startRelZ >= -1 && startRelZ < farLimit;
    portalPreview.visible = showPreview;
    if (showPreview) {
      portalPreview.position.set(curveRelX(plan.start, state), curveRelY(plan.start, state), -startRelZ);
      portalPreview.rotation.y = -Math.atan(roadCurveSlope(plan.start, state.map));
    }

    // Continuous 1,000m Full-Width 3-Lane Curved Glass Bridge Loop (Instanced!) + Realistic Ocean Sea View!
    const onSky = isBridgePreview || ((running || ['paused','falling','captured','crashed'].includes(state.mode)) && chosen === 'skybridge' && state.distance >= plan.start - 1 && state.distance <= plan.end + 4);
    skyLoop.visible = onSky;
    if (onSky) {
      let deckCount = 0, pierCount = 0, quayCount = 0, foamCount = 0;
      const tNow = state.time || 0;
      if (isBridgePreview) {
        for (let offset = 0; offset < skyBayCount; offset++) {
          const bayZ = 8 - offset * BAY_LEN;
          const marker = skyBayMarkers[offset];
          marker.visible = bayZ > -340;
          if (!marker.visible) continue;
          marker.position.set(0, 0, bayZ);
          marker.rotation.set(0, 0, 0);
          marker.scale.set(1, 1, 1);
          marker.updateMatrix();
          for (const inst of skyDeckInsts) inst.setMatrixAt(deckCount, marker.matrix);
          deckCount++;
          if (offset % 2 === 0 && pierCount < skyPierInsts[0].instanceMatrix.count) {
            for (const inst of skyPierInsts) inst.setMatrixAt(pierCount, marker.matrix);
            pierCount++;
            for (const side of [-1, 1]) {
              if (foamCount >= skyBayCount) break;
              foamDummy.position.set(side * 3.45, SEA_Y + 0.22, bayZ);
              foamDummy.rotation.set(Math.PI / 2, 0, 0);
              foamDummy.scale.set(2.45, 2.75, 0.35);
              foamDummy.updateMatrix();
              pierFoamInst.setMatrixAt(foamCount++, foamDummy.matrix);
            }
          }
        }
        bridgePylons[0].visible = true;
        bridgePylons[0].position.set(0, 0, -56);
        bridgePylons[0].rotation.y = 0;
        bridgePylons[1].visible = true;
        bridgePylons[1].position.set(0, 0, -176);
        bridgePylons[1].rotation.y = 0;
        for (let pi = 2; pi < bridgePylons.length; pi++) bridgePylons[pi].visible = false;
        departHeadland.visible = false;
        returnHeadland.visible = false;
      } else {
        const firstBay = Math.max(0, Math.floor((state.distance - plan.start - 40) / BAY_LEN));
        for (let offset = 0; offset < skyBayCount; offset++) {
          const n = firstBay + offset;
          const marker = skyBayMarkers[n % skyBayCount];
          const start = plan.start + n * BAY_LEN;
          const length = Math.min(BAY_LEN, plan.end - start);
          marker.visible = length > 0;
          if (!marker.visible) continue;
          const bayCenter = start + length / 2;
          const relZ = bayCenter - state.distance;
          const bx = curveRelX(bayCenter, state);
          const by = curveRelY(bayCenter, state);
          const rotY = -Math.atan(curveSlopeAt(bayCenter, state));
          marker.position.set(bx, by, -relZ);
          marker.rotation.set(0, rotY, 0);
          marker.scale.set(1, 1, length / BAY_LEN);
          marker.updateMatrix();
          if (relZ > (ultraLow ? 148 : lowEnd ? 195 : 335) || relZ < -42) continue;
          for (const inst of skyDeckInsts) inst.setMatrixAt(deckCount, marker.matrix);
          deckCount++;
          if ((bayCenter <= plan.start + COAST_SHORE_LEN) || (bayCenter >= plan.end - COAST_SHORE_LEN)) {
            for (const inst of skyQuayInsts) inst.setMatrixAt(quayCount, marker.matrix);
            quayCount++;
          }
          if (n % 2 === 0 && pierCount < skyPierInsts[0].instanceMatrix.count) {
            for (const inst of skyPierInsts) inst.setMatrixAt(pierCount, marker.matrix);
            pierCount++;
            if (!ultraLow) {
              const bayWorldY = branchCurveY(bayCenter, state);
              const cosR = Math.cos(rotY), sinR = Math.sin(rotY);
              for (const side of [-1, 1]) {
                if (foamCount >= skyBayCount) break;
                const pulse = 1 + Math.sin(tNow * 2.4 + foamCount * 0.9) * 0.14;
                const sx = side * 3.45;
                foamDummy.position.set(bx + sx * cosR, by + SEA_Y + 0.22 - bayWorldY, -relZ - sx * sinR);
                foamDummy.rotation.set(Math.PI / 2, rotY, 0);
                foamDummy.scale.set(2.45 * pulse, 2.75 * pulse, 0.35);
                foamDummy.updateMatrix();
                pierFoamInst.setMatrixAt(foamCount++, foamDummy.matrix);
              }
            }
          }
        }
        // Position dramatic rocky coastal headlands at the exact edge where shore meets pure open ocean!
        for (const [hl, worldZ] of [[departHeadland, plan.start + COAST_SHORE_LEN], [returnHeadland, plan.end - COAST_SHORE_LEN]]) {
          const relZ = worldZ - state.distance;
          const vis = relZ > -28 && relZ < farLimit;
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
        // Position cable-stayed sea-bridge pylon towers along the curved 1,000m Glass Bridge
        const origin = plan.start + 56;
        const firstPylon = origin + Math.max(0, Math.ceil((state.distance - 48 - origin) / PYLON_STRIDE)) * PYLON_STRIDE;
        for (let pi = 0; pi < bridgePylons.length; pi++) {
          const pWorld = firstPylon + pi * PYLON_STRIDE;
          const pRel = pWorld - state.distance;
          const vis = pWorld < plan.end - 28 && pRel >= -48 && pRel < farLimit + 12;
          bridgePylons[pi].visible = vis;
          if (vis) {
            bridgePylons[pi].position.set(curveRelX(pWorld, state), curveRelY(pWorld, state), -pRel);
            bridgePylons[pi].rotation.y = -Math.atan(curveSlopeAt(pWorld, state));
          }
        }
      }
      for (const inst of skyDeckInsts) { inst.count = deckCount; inst.visible = deckCount > 0; inst.instanceMatrix.needsUpdate = true; }
      for (const inst of skyPierInsts) { inst.count = pierCount; inst.visible = pierCount > 0; inst.instanceMatrix.needsUpdate = true; }
      for (const inst of skyQuayInsts) { inst.count = quayCount; inst.visible = quayCount > 0; inst.instanceMatrix.needsUpdate = true; }
      pierFoamInst.count = foamCount;
      pierFoamInst.visible = foamCount > 0;
      pierFoamInst.instanceMatrix.needsUpdate = true;
    } else {
      for (const p of bridgePylons) p.visible = false;
      departHeadland.visible = false;
      returnHeadland.visible = false;
    }

    // Update Realistic 3D Ocean Sea World (stays level at true sea level while the Glass Bridge arches overhead!)
    const showSea = onSky || (showPreview && startRelZ < (lowEnd ? 95 : 170));
    seaWorld.visible = showSea;
    if (showSea) {
      const t = state.time || 0;
      const phase = weather?.phase || 0;
      const lowSun = Math.max(0, 1 - Math.abs(phase - 0.15) * 7);
      // Dynamic ocean tinting matching Day / Sunset / Night / Rain
      oceanBaseMat.color.copy(oceanDayCol).lerp(oceanSunsetCol, lowSun * 0.72).lerp(oceanNightCol, night * 0.9).lerp(oceanRainCol, rain * 0.65);
      oceanBaseMat.roughness = 0.07 + rain * 0.16;
      seaSwellMesh.visible = !lowEnd;
      sunGlintInst.visible = !ultraLow;
      waveCrestInst.visible = !ultraLow;

      // Smooth water scrolling with runner travel + natural ocean tide drift
      if (oceanTex.colorMap) {
        oceanTex.colorMap.offset.set((t * 0.028) % 1, (state.distance / 18 + t * 0.05) % 1);
      }
      if (!lowEnd) {
        oceanSwellMat.opacity = Math.max(0.14, 0.36 - night * 0.14 - rain * 0.12);
        if (oceanTex.bumpMap) {
          oceanTex.bumpMap.offset.set((t * 0.028) % 1, (state.distance / 18 + t * 0.05) % 1);
        }
        if (oceanTex.swellMap) {
          oceanTex.swellMap.offset.set((-t * 0.042) % 1, (state.distance / 24 - t * 0.035) % 1);
        }
        seaSwellMesh.position.y = SEA_Y + 0.18 + Math.sin(t * 1.6) * 0.05;
      }
      seaWorld.position.y = onSky && !isBridgePreview ? -branchCurveY(state.distance, state) : 0;
      seaWorld.position.z = isBridgePreview ? 0 : (onSky ? 0 : Math.min(0, -(startRelZ - 14)));

      if (!ultraLow) {
        glintMat.color.copy(glintDayCol).lerp(glintSunCol, lowSun * 0.85).lerp(glintNightCol, night);
        glintMat.opacity = Math.max(0.06, (0.36 - rain * 0.28) * (0.85 + 0.15 * Math.sin(t * 3.1)));
        // Dancing sun/moon reflection glints across the ocean (1 InstancedMesh!)
        for (let i = 0; i < sunGlints.length; i++) {
          const g = sunGlints[i];
          skyDummy.position.set(g.baseX + Math.sin(t * 1.4 + g.seed) * 2.2, SEA_Y + 0.25, g.z);
          skyDummy.rotation.set(-Math.PI / 2, 0, 0);
          skyDummy.scale.set((10 + g.seed * 3.8) * (0.88 + 0.18 * Math.sin(t * 2.8 + g.seed)), g.gd, 1);
          skyDummy.updateMatrix();
          sunGlintInst.setMatrixAt(i, skyDummy.matrix);
        }
        sunGlintInst.instanceMatrix.needsUpdate = true;

        // Rolling whitecap foam wave crests gliding across the sea (1 InstancedMesh!)
        for (let i = 0; i < waveCrests.length; i++) {
          const wc = waveCrests[i];
          const relZ = ((wc.zOff - (state.distance % 280)) + 280) % 280;
          skyDummy.position.set(
            wc.side * (wc.xOff + Math.sin(t * 0.9 + wc.seed) * 2.5),
            SEA_Y + 0.22 + Math.sin(t * 2.2 + wc.seed) * 0.04,
            10 - relZ
          );
          skyDummy.rotation.set(-Math.PI / 2, 0, 0);
          skyDummy.scale.set(wc.wLen, wc.wDep, 1);
          skyDummy.updateMatrix();
          waveCrestInst.setMatrixAt(i, skyDummy.matrix);
        }
        waveCrestInst.instanceMatrix.needsUpdate = true;
      }

      // Cruising Luxury Yachts & Sailboats bobbing naturally on ocean swells
      for (let bi = 0; bi < seaBoats.length; bi++) {
        const bt = seaBoats[bi];
        const bRel = ((bt.offset + t * bt.speed - state.distance * 0.72) % bt.span + bt.span) % bt.span;
        bt.mesh.visible = !ultraLow || bRel < 165;
        if (!bt.mesh.visible) continue;
        bt.mesh.position.set(bt.x + Math.sin(t * 0.35 + bi) * 2.4, SEA_Y + 0.08 + Math.sin(t * 2.1 + bi * 1.4) * 0.14, 18 - bRel);
        bt.mesh.rotation.set(Math.sin(t * 1.7 + bi) * 0.04, Math.PI, Math.cos(t * 1.9 + bi) * 0.055);
      }
      // Floating red/green ocean channel buoys bobbing beside the Glass Sea-Bridge
      for (let sbi = 0; sbi < seaBuoys.length; sbi++) {
        const sb = seaBuoys[sbi];
        sb.mesh.visible = !ultraLow;
        if (ultraLow) continue;
        const bZ = ((sb.offset - (state.distance % sb.span)) + sb.span) % sb.span;
        sb.mesh.position.set(sb.x, SEA_Y + 0.06 + Math.sin(t * 2.6 + sbi * 2.1) * 0.14, 14 - bZ);
        sb.mesh.rotation.set(Math.sin(t * 2.1 + sbi) * 0.14, 0, Math.cos(t * 1.8 + sbi) * 0.16);
      }
      // Subtle coastal bay parallax on distant islands + rotating warm lighthouse beacon
      const bayProg = onSky ? Math.max(0, Math.min(1, (state.distance - plan.start) / Math.max(1, plan.end - plan.start))) : 0;
      islandRight.visible = !ultraLow;
      islandLeft.visible = !ultraLow;
      if (!ultraLow) {
        islandRight.position.z = -165 + bayProg * 25;
        islandLeft.position.z = -195 + bayProg * 28;
        lighthouseBeacon.rotation.y = t * 0.85;

        // Real wind sway animation for all instanced island trees (throttled on low-end phones to cut matrix uploads by 66%!)
        if (!lowEnd || Math.floor(t * 20) % 3 === 0) {
          for (const batch of islandTreeBatches) {
            const { inst, specs } = batch;
            for (let idx = 0; idx < specs.length; idx++) {
              const sp = specs[idx];
              const wind = Math.sin(t * 2.2 + sp.seed) * 0.045 + Math.cos(t * 1.5 + sp.seed * 1.8) * 0.022;
              skyDummy.position.set(sp.x, sp.y, sp.z);
              skyDummy.rotation.set(Math.sin(t * 1.8 + sp.seed * 1.2) * 0.028, 0, wind);
              skyDummy.scale.set(sp.width, sp.height, sp.width);
              skyDummy.updateMatrix();
              inst.setMatrixAt(idx, skyDummy.matrix);
            }
            inst.instanceMatrix.needsUpdate = true;
          }
        }
        // Breathing foam surf along island shorelines
        const foamPulse = 1 + Math.sin(t * 1.8) * 0.06;
        if (islandRight.userData.foam) islandRight.userData.foam.scale.set(34 * foamPulse, 26 * foamPulse, 0.45);
        if (islandLeft.userData.foam) islandLeft.userData.foam.scale.set(36 * foamPulse, 28 * foamPulse, 0.45);
      }
      // Soaring flock of seagulls banking & flapping over the water
      for (const sg of seagulls) {
        sg.mesh.visible = !ultraLow;
        if (ultraLow) continue;
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

    skyExitArch.visible = onSky && endRelZ > -14 && endRelZ < farLimit;
    if (skyExitArch.visible) {
      skyExitArch.position.set(curveRelX(plan.end, state), curveRelY(plan.end, state), -endRelZ);
      skyExitArch.rotation.y = -Math.atan(curveSlopeAt(plan.end, state));
    }

    // Continuous 1,000m Full-Width 3-Lane Curved Cave Railway Tunnel Loop (world-aligned to plan.end -> zero gap!)
    const onTun = (running || ['paused','falling','captured','crashed'].includes(state.mode)) && chosen === 'underpass' && state.distance >= plan.start - 1 && state.distance <= plan.end + 4;
    tunLoop.visible = onTun;
    if (onTun) positionTunnel(state, plan);
    tunExitPortal.visible = onTun && endRelZ > -14 && endRelZ < farLimit;
    if (tunExitPortal.visible) {
      tunExitPortal.position.set(curveRelX(plan.end, state), curveRelY(plan.end, state), -endRelZ);
      tunExitPortal.rotation.y = -Math.atan(curveSlopeAt(plan.end, state));
    }

    // 2. Update 3 Pooled Overhead Metro Viaduct Bridges + Speeding Trains
    const baseMetroIdx = Math.max(0, Math.ceil((state.distance - 28 - METRO_FIRST) / METRO_STRIDE));
    for (let k = 0; k < metroBridges.length; k++) {
      const mIdx = baseMetroIdx + k;
      const metroWorldZ = METRO_FIRST + mIdx * METRO_STRIDE;
      const metroRelZ = metroWorldZ - state.distance;
      const mPlan = forkPlanAt(metroWorldZ);
      const nearPortal = Math.abs(metroWorldZ - mPlan.start) < 55 || Math.abs(metroWorldZ - mPlan.end) < 40;
      const clearOfCave = !onTun || metroWorldZ > plan.end + 35;
      const mb = metroBridges[k];
      mb.bridge.visible = isPark && clearOfCave && !nearPortal && metroRelZ > -28 && metroRelZ < farLimit;
      if (mb.bridge.visible) {
        mb.bridge.position.set(curveRelX(metroWorldZ, state), curveRelY(metroWorldZ, state), -metroRelZ);
        mb.bridge.rotation.y = -Math.atan(curveSlopeAt(metroWorldZ, state));
        const sweep = ((state.time * 24 + mIdx * 55) % 960) - 480;
        mb.train.position.x = (mIdx % 2 === 0 ? 1 : -1) * sweep;
      }
    }

    // 3. Sky Ambient Helicopter & Futuristic "SKYLINE" Blimp (Exact Reference Image!)
    const showSkyCraft = (isPark || onSky || onTun) && night < 0.7 && rain < 0.65;
    if (showSkyCraft) {
      const t = state.time || 0;
      if (isBridgePreview) {
        helicopter.visible = true;
        blimp.visible = true;
        helicopter.position.set(-11.2, 15.2, -45);
        helicopter.rotation.set(0.05, 0.22, 0.08);
        blimp.position.set(15.8, 17.2, -68);
        blimp.rotation.set(0, Math.PI + 0.12, 0);
      } else {
        const heliSpan = 380;
        const heliX = ((t * 16.5 + 190) % heliSpan) - 190;
        const heliZ = onSky ? -65 : -130;
        const heliY = onSky ? (17.5 + Math.sin(t * 1.4) * 0.5) : (22.5 + Math.sin(t * 1.4) * 0.5);
        helicopter.visible = !lowEnd || Math.abs(heliX) < 92;
        if (helicopter.visible) {
          helicopter.position.set(heliX, heliY, heliZ);
          helicopter.rotation.set(0.04, Math.PI / 2 + 0.05, -0.05);
        }

        const blimpSpan = 420;
        const blimpX = 210 - ((t * 6.2) % blimpSpan);
        const blimpZ = onSky ? -85 : -155;
        const blimpY = onSky ? (21.5 + Math.sin(t * 0.6) * 0.4) : (27.5 + Math.sin(t * 0.6) * 0.4);
        blimp.visible = !lowEnd || Math.abs(blimpX) < 105;
        if (blimp.visible) {
          blimp.position.set(blimpX, blimpY, blimpZ);
          blimp.rotation.set(0, -Math.PI / 2 - 0.04, 0);
        }
      }
      if (helicopter.visible) {
        heliRotor.rotation.y = t * 44;
        tailRotor.rotation.z = t * 58;
      }
    } else {
      helicopter.visible = false;
      blimp.visible = false;
    }

    // Dynamic Glass Floor Helicopter Reflection (Exact Reference Image!)
    const isHeliOverBridge = onSky && helicopter.visible && Math.abs(helicopter.position.x) < 45;
    const showHeliReflect = !ultraLow && isHeliOverBridge && showSkyCraft;
    heliFloorReflection.visible = showHeliReflect;
    if (showHeliReflect) {
      const t = state.time || 0;
      const rx = curveRelX(state.distance + 22, state) - 2.85 + (helicopter.position.x + 11.2) * 0.16;
      const ry = curveRelY(state.distance + 22, state) + 0.068;
      heliFloorReflection.position.set(rx, ry, -22.5);
      heliFloorReflection.rotation.y = -Math.atan(curveSlopeAt(state.distance + 22, state)) + 0.08;
      heliReflectBody.rotation.z = Math.sin(t * 2.2) * 0.04;
      const fade = Math.max(0, 1 - Math.abs(helicopter.position.x) / 45);
      heliReflectMat.opacity = (0.36 + Math.sin(t * 3.5) * 0.06) * fade;
    }

    // 5. Floating Leaves (1 InstancedMesh!)
    const showLeaves = running && !isPark && !onTun && rain < 0.4;
    leafInst.visible = showLeaves;
    if (showLeaves) {
      for (let i = 0; i < leaves.length; i++) {
        const lt = state.time * 1.6 + leaves[i].seed;
        skyDummy.position.set(
          Math.sin(lt * 1.3) * 5.8,
          ((6.5 - (lt * 1.1) % 6.2) + 6.2) % 6.2 + 0.35,
          -(((leaves[i].seed * 19 + state.time * 12) % 42) + 2)
        );
        skyDummy.rotation.set(lt * 2.1, lt * 1.7, Math.sin(lt) * 0.8);
        skyDummy.scale.set(0.22, 0.14, 1);
        skyDummy.updateMatrix();
        leafInst.setMatrixAt(i, skyDummy.matrix);
      }
      leafInst.instanceMatrix.needsUpdate = true;
    }

    const t = state.time || 0;

    // 6. Cascading 3D Waterfalls UV Scroll inside Metro Tunnel (Panel 3)
    if (waterfallMat.userData?.tex) {
      waterfallMat.userData.tex.offset.y = -(t * 4.2) % 1;
    }

    // 8. Electric Branching Sky Lightning Flashes (Reference Image)
    const flashCycle = (t + 1.2) % 6.8;
    const isStormRaining = (isPark || onSky) && !onTun && (weather?.rain ?? 0) > 0.15 && (weather?.stormDark ?? 0) > 0.15;
    const isLightningActive = isStormRaining && (flashCycle < 0.24);
    const flashFlicker = flashCycle < 0.07 || (flashCycle > 0.11 && flashCycle < 0.20);
    lightningBolts.visible = isLightningActive && flashFlicker;
    if (lightningBolts.visible) {
      lightningBolts.position.set(onSky ? -24 : 32, 34, onSky ? -130 : -220);
    }

    // 10. Swirling Cosmic Blue Energy Portal at Tunnel Horizon (Panel 3)
    tunnelCosmicPortal.visible = onTun;
    if (onTun) {
      pDisc1.rotation.z = t * 1.8;
      pDisc2.rotation.z = -t * 2.3;
      pCore.scale.setScalar(2.2 + Math.sin(t * 4.5) * 0.35);
      tunnelCosmicPortal.position.set(curveRelX(state.distance + 220, state), curveRelY(state.distance + 220, state) + 3.6, -220);
      tunnelCosmicPortal.rotation.y = -Math.atan(curveSlopeAt(state.distance + 220, state));
    }
  };
  // Start completely hidden until IT Park is active so background pre-warming never leaks meshes onto other maps.
  updateRoadEvents({ map: '__none__', distance: 0, time: 0 }, {});
  return updateRoadEvents;
}
