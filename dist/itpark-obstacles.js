import {
  BoxGeometry,
  CanvasTexture,
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  SRGBColorSpace
} from './vendor/three.module.js';

const cube = new BoxGeometry(1, 1, 1);
const cyl = new CylinderGeometry(1, 1, 1, 12);
const sphere = new SphereGeometry(1, 10, 8);
const mats = new Map();

function mat(key, opts) {
  if (!mats.has(key)) mats.set(key, new MeshStandardMaterial(opts));
  return mats.get(key);
}

function canvasMat(key, w, h, drawFn, opts = {}) {
  if (mats.has(key)) return mats.get(key);
  if (typeof document === 'undefined') {
    return mat(key + ':fb', { color: opts.fallback || 0x1e293b, roughness: 0.4, metalness: 0.2 });
  }
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d');
  if (!ctx) return mat(key + ':fb', { color: opts.fallback || 0x1e293b, roughness: 0.4 });
  drawFn(ctx, w, h);
  const tex = new CanvasTexture(cv);
  tex.colorSpace = SRGBColorSpace;
  const m = new MeshStandardMaterial({
    map: tex,
    emissiveMap: opts.emissive ? tex : null,
    emissive: opts.emissive ? 0xffffff : 0x000000,
    emissiveIntensity: opts.emissiveIntensity ?? 0.45,
    roughness: opts.roughness ?? 0.30,
    metalness: opts.metalness ?? 0.20,
    transparent: Boolean(opts.transparent),
    opacity: opts.opacity ?? 1,
    side: opts.doubleSide ? DoubleSide : 0
  });
  mats.set(key, m);
  return m;
}

function part(parent, material, x, y, z, sx, sy, sz, geo = cube) {
  const m = new Mesh(geo, material);
  m.position.set(x, y, z);
  m.scale.set(Math.abs(sx), Math.abs(sy), Math.abs(sz));
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

const M = {
  dark: () => mat('obsDark', { color: 0x1e293b, roughness: 0.42, metalness: 0.48 }),
  charcoal: () => mat('obsChar', { color: 0x0f172a, roughness: 0.36, metalness: 0.55 }),
  steel: () => mat('obsSteel', { color: 0xb8c4d0, roughness: 0.26, metalness: 0.78 }),
  white: () => mat('obsWhite', { color: 0xf1f5f9, roughness: 0.34, metalness: 0.14 }),
  wood: () => mat('obsWood', { color: 0xd4a36a, roughness: 0.62, metalness: 0.04 }),
  kraft: () => mat('obsKraft', { color: 0xc89458, roughness: 0.78, metalness: 0.02 }),
  cyan: () => mat('obsCyan', { color: 0x00e5ff, emissive: 0x00e5ff, emissiveIntensity: 1.25, roughness: 0.14 }),
  green: () => mat('obsGreen', { color: 0x22ff66, emissive: 0x22ff66, emissiveIntensity: 1.15, roughness: 0.16 }),
  leaf: () => mat('obsLeaf', { color: 0x22c55e, roughness: 0.85, metalness: 0 }),
  cableBlue: () => mat('obsCBlue', { color: 0x2563eb, roughness: 0.32, metalness: 0.25 }),
  cableCyan: () => mat('obsCCyan', { color: 0x38bdf8, roughness: 0.28, metalness: 0.25 }),
  cableGold: () => mat('obsCGold', { color: 0xf59e0b, roughness: 0.32, metalness: 0.25 }),
  podGlass: () => mat('obsPodGlass', { color: 0x67d0ff, roughness: 0.08, metalness: 0.35, transparent: true, opacity: 0.46, emissive: 0x0284c7, emissiveIntensity: 0.20 })
};

function hazardBaseMat() {
  return canvasMat('obsHazard', 256, 64, (ctx, w, h) => {
    ctx.fillStyle = '#facc15'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#18181b';
    for (let x = -h; x < w + h; x += 36) {
      ctx.beginPath(); ctx.moveTo(x, h); ctx.lineTo(x + 18, h); ctx.lineTo(x + 18 + h * 0.7, 0); ctx.lineTo(x + h * 0.7, 0);
      ctx.closePath(); ctx.fill();
    }
  }, { fallback: 0xfacc15, emissive: false });
}

function serverBladeMat() {
  return canvasMat('obsServerBlades', 256, 512, (ctx, w, h) => {
    ctx.fillStyle = '#0b1120'; ctx.fillRect(0, 0, w, h);
    for (let y = 14; y < h - 18; y += 34) {
      ctx.fillStyle = '#1e293b'; ctx.fillRect(14, y, w - 28, 24);
      for (let x = 24; x < w - 90; x += 14) {
        ctx.fillStyle = '#0f172a'; ctx.fillRect(x, y + 6, 8, 12);
      }
      ctx.fillStyle = (y / 34) % 3 === 0 ? '#22ff66' : '#00e5ff';
      ctx.fillRect(w - 72, y + 8, 12, 8);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(w - 50, y + 8, 22, 8);
    }
  }, { fallback: 0x0f172a, emissive: true, emissiveIntensity: 0.85 });
}

function wifiBadgeMat(title = 'IT PARK') {
  return canvasMat('obsWifi:' + title, 256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#0f1f38'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#00e5ff'; ctx.lineWidth = 10; ctx.strokeRect(8, 8, w - 16, h - 16);
    ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 14; ctx.lineCap = 'round';
    for (const r of [34, 62, 90]) {
      ctx.beginPath(); ctx.arc(w / 2, 152, r, Math.PI * 1.2, Math.PI * 1.8); ctx.stroke();
    }
    ctx.fillStyle = '#00e5ff'; ctx.beginPath(); ctx.arc(w / 2, 158, 13, 0, Math.PI * 2); ctx.fill();
    if (title) {
      ctx.fillStyle = '#e0f2fe'; ctx.font = '900 36px system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(title, w / 2, 222);
    }
  }, { fallback: 0x00e5ff, emissive: true, emissiveIntensity: 0.90 });
}

function podSignMat() {
  return canvasMat('obsPodSign', 256, 256, (ctx, w, h) => {
    ctx.fillStyle = 'rgba(14, 165, 233, 0.25)'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#ffffff'; ctx.font = '900 44px system-ui, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('Work', 24, 78);
    ctx.fillText('Build', 24, 134);
    ctx.fillText('Grow', 24, 190);
  }, { fallback: 0x38bdf8, transparent: true, opacity: 0.92, emissive: true, emissiveIntensity: 0.55 });
}

function holoCodeMat() {
  return canvasMat('obsHoloCode', 384, 320, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(0, 229, 255, 0.72)'); g.addColorStop(1, 'rgba(14, 165, 233, 0.48)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#aef6ff'; ctx.lineWidth = 10; ctx.strokeRect(8, 8, w - 16, h - 16);
    ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center';
    ctx.font = '900 92px monospace';
    ctx.fillText('</>', w / 2, 128);
    ctx.font = '800 44px system-ui, sans-serif';
    ctx.fillText('Better', w / 2, 206);
    ctx.fillText('Together', w / 2, 258);
  }, { fallback: 0x00e5ff, transparent: true, opacity: 0.92, emissive: true, emissiveIntensity: 1.05, doubleSide: true });
}

function docBoxMat(label) {
  return canvasMat('obsDoc:' + label, 256, 160, (ctx, w, h) => {
    ctx.fillStyle = '#c89458'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#9a6b35'; ctx.lineWidth = 6; ctx.strokeRect(4, 4, w - 8, h - 8);
    ctx.fillStyle = '#f8fafc'; ctx.fillRect(54, 42, 148, 74);
    ctx.fillStyle = '#1e293b'; ctx.font = '900 26px system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(label, w / 2, 88, 136);
  }, { fallback: 0xc89458, emissive: false });
}

function turnstileArrowMat() {
  return canvasMat('obsTurnArrow', 128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#22ff66';
    ctx.beginPath();
    ctx.moveTo(w / 2, 16); ctx.lineTo(w - 22, 66); ctx.lineTo(w - 44, 66);
    ctx.lineTo(w - 44, 110); ctx.lineTo(44, 110); ctx.lineTo(44, 66); ctx.lineTo(22, 66);
    ctx.closePath(); ctx.fill();
  }, { fallback: 0x22ff66, emissive: true, emissiveIntensity: 1.1 });
}

// =============================================================================
// ALL 10 IMAGE-5 IT PARK TECH OBSTACLES
// =============================================================================

// 1. Laptop Workstation Desk (JUMP obstacle, <= 0.94m tall!)
export function buildLaptopDesk() {
  const g = new Group();
  // Desk frame with glowing cyan LED side legs + wooden desktop
  for (const sx of [-0.76, 0.76]) {
    part(g, M.dark(), sx, 0.36, 0, 0.14, 0.72, 0.62);
    part(g, M.cyan(), sx, 0.36, 0.32, 0.05, 0.64, 0.04);
  }
  part(g, M.dark(), -0.50, 0.32, -0.02, 0.42, 0.60, 0.56);
  part(g, M.dark(), 0.52, 0.32, -0.02, 0.40, 0.60, 0.56);
  part(g, M.wood(), 0, 0.74, 0, 1.78, 0.08, 0.70);
  // Glowing code monitor + keyboard + mug + desk plant
  part(g, M.charcoal(), 0, 0.89, -0.14, 0.52, 0.28, 0.05);
  part(g, M.cyan(), 0, 0.89, -0.11, 0.46, 0.22, 0.02);
  part(g, M.steel(), 0, 0.79, -0.14, 0.08, 0.09, 0.08);
  part(g, M.white(), -0.48, 0.84, 0.10, 0.09, 0.11, 0.09, cyl);
  part(g, M.white(), 0.58, 0.83, -0.10, 0.11, 0.10, 0.11, cyl);
  part(g, M.leaf(), 0.58, 0.91, -0.10, 0.14, 0.12, 0.14, sphere);
  return g;
}

// 2. Server Rack Block (BLOCK obstacle, ~2.12m tall + animated scanning server LED bar!)
export function buildServerRack() {
  const g = new Group();
  part(g, hazardBaseMat(), 0, 0.11, 0, 1.44, 0.22, 1.12);
  part(g, M.charcoal(), 0, 1.16, 0, 1.32, 1.92, 0.98);
  for (const sx of [-0.30, 0.30]) {
    part(g, serverBladeMat(), sx, 1.16, 0.50, 0.54, 1.76, 0.04);
    part(g, serverBladeMat(), sx, 1.16, -0.50, 0.54, 1.76, 0.04);
  }
  for (const sx of [-0.66, 0.66]) part(g, M.cyan(), sx, 1.16, 0.49, 0.04, 1.78, 0.04);
  // Live animated neon-green data scan LED bar gliding smoothly across server blades!
  const scanBar = part(g, M.green(), 0, 1.16, 0.53, 1.12, 0.06, 0.02);
  g.userData.serverScan = scanBar;
  return g;
}

// 3. Network Cable Barrier (JUMP obstacle, ~0.88m tall!)
export function buildCableBarrier() {
  const g = new Group();
  for (const sx of [-0.84, 0.84]) {
    part(g, M.dark(), sx, 0.44, 0, 0.24, 0.88, 0.36);
    part(g, M.cyan(), sx, 0.44, 0.19, 0.06, 0.64, 0.03);
  }
  // Thick bundled glowing Blue, Cyan & Golden-Orange fiber-optic cables!
  const cables = [
    [0.24, M.cableBlue()], [0.38, M.cableCyan()], [0.52, M.cableGold()],
    [0.66, M.cableBlue()], [0.78, M.cableCyan()]
  ];
  for (const [cy, cMat] of cables) {
    const c = part(g, cMat, 0, cy, 0, 0.11, 1.62, 0.11, cyl);
    c.rotation.z = Math.PI / 2;
  }
  // Central 'IT PARK' Wi-Fi sign box!
  part(g, M.charcoal(), 0, 0.52, 0.10, 0.54, 0.54, 0.16);
  part(g, wifiBadgeMat('IT PARK'), 0, 0.52, 0.19, 0.46, 0.46, 0.03);
  return g;
}

// 4. Glass Office Pod (BLOCK obstacle, ~2.20m tall!)
export function buildGlassOfficePod() {
  const g = new Group();
  // Crisp white/dark cube frame + glowing cyan floor rim
  part(g, M.dark(), 0, 0.09, 0, 1.78, 0.18, 1.48);
  part(g, M.cyan(), 0, 0.19, 0, 1.82, 0.05, 1.52);
  part(g, M.white(), 0, 2.14, 0, 1.82, 0.16, 1.52);
  for (const sx of [-0.84, 0.84]) {
    for (const sz of [-0.68, 0.68]) part(g, M.white(), sx, 1.12, sz, 0.12, 2.02, 0.12);
    part(g, M.cyan(), sx, 1.12, 0.72, 0.04, 1.90, 0.04);
  }
  part(g, M.dark(), 0, 1.12, 0.70, 0.08, 1.98, 0.08);
  // Translucent blue glass walls + "Work Build Grow" etched glass signage
  part(g, M.podGlass(), 0, 1.12, 0, 1.68, 1.92, 1.38);
  part(g, podSignMat(), -0.42, 1.24, 0.72, 0.74, 0.82, 0.02);
  // Tiny office table, chairs & green potted plant inside the glass pod!
  part(g, M.wood(), 0, 0.72, 0, 0.86, 0.07, 0.56);
  part(g, M.dark(), 0, 0.44, 0, 0.10, 0.54, 0.10);
  part(g, M.white(), 0.58, 0.36, -0.32, 0.18, 0.24, 0.18, cyl);
  part(g, M.leaf(), 0.58, 0.64, -0.32, 0.24, 0.32, 0.24, sphere);
  return g;
}

// 5. Stacked Paper / Document Boxes (BLOCK obstacle, ~1.88m tall + fluttering floating paper sheets!)
export function buildDocumentBoxes() {
  const g = new Group();
  part(g, docBoxMat('Internal'), 0, 0.36, 0, 1.36, 0.72, 1.02);
  const mid = part(g, docBoxMat('Documents'), 0.05, 1.04, -0.02, 1.18, 0.64, 0.92);
  mid.rotation.y = 0.08;
  const top = part(g, docBoxMat('Files'), -0.04, 1.60, 0.02, 0.86, 0.48, 0.72);
  top.rotation.y = -0.10;
  // Crisp floating white document sheets that flutter gently in the breeze!
  g.userData.papers = [];
  for (const [px, py, pz, ry] of [[-0.82, 0.03, 0.42, 0.4], [0.80, 0.03, 0.35, -0.6], [-0.74, 0.92, 0.48, 0.3], [0.68, 1.44, 0.38, -0.4]]) {
    const sh = part(g, M.white(), px, py, pz, 0.28, 0.02, 0.36);
    sh.rotation.y = ry;
    sh.userData.baseY = py;
    if (py > 0.2) g.userData.papers.push(sh);
  }
  return g;
}

// 6. Wi-Fi Router Tower (BLOCK obstacle, ~2.12m tall!)
export function buildWifiRouterTower() {
  const g = new Group();
  part(g, hazardBaseMat(), 0, 0.11, 0, 1.32, 0.22, 1.06);
  part(g, M.charcoal(), 0, 0.92, 0, 1.16, 1.44, 0.92);
  part(g, M.dark(), 0, 1.66, 0, 0.98, 0.16, 0.76);
  // Glowing cyan side LED light bars + giant glowing cyan Wi-Fi emblem!
  for (const sx of [-0.59, 0.59]) part(g, M.cyan(), sx, 0.92, 0.42, 0.06, 1.24, 0.08);
  part(g, wifiBadgeMat(''), 0, 0.98, 0.47, 0.82, 0.82, 0.04);
  part(g, wifiBadgeMat(''), 0, 0.98, -0.47, 0.82, 0.82, 0.04);
  // 4 Tall Black Router Antennas rising to y = 2.12m!
  for (const ax of [-0.42, -0.14, 0.14, 0.42]) {
    const ant = part(g, M.charcoal(), ax, 1.92, -0.14, 0.055, 0.56, 0.055, cyl);
    ant.rotation.z = ax * 0.12;
  }
  return g;
}

// 7. Ergonomic Mesh Office Chair (JUMP obstacle, ~0.95m tall + gentle swivel animation!)
export function buildOfficeChair() {
  const g = new Group();
  // 5-star caster wheel base
  part(g, M.charcoal(), 0, 0.24, 0, 0.09, 0.36, 0.09, cyl);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const leg = part(g, M.dark(), Math.cos(a) * 0.22, 0.08, Math.sin(a) * 0.22, 0.42, 0.05, 0.06);
    leg.rotation.y = -a;
    part(g, M.charcoal(), Math.cos(a) * 0.38, 0.04, Math.sin(a) * 0.38, 0.07, 0.07, 0.07, sphere);
  }
  // Swiveling upper seat, armrests & ergonomic mesh backrest
  const swivel = new Group();
  g.add(swivel);
  g.userData.swivel = swivel;
  part(swivel, M.charcoal(), 0, 0.44, 0, 0.66, 0.09, 0.60);
  for (const sx of [-0.36, 0.36]) {
    part(swivel, M.dark(), sx, 0.56, 0, 0.06, 0.22, 0.06);
    part(swivel, M.charcoal(), sx, 0.66, 0.02, 0.09, 0.05, 0.36);
  }
  const back = part(swivel, M.dark(), 0, 0.72, -0.26, 0.58, 0.48, 0.07);
  back.rotation.x = -0.12;
  return g;
}

// 8. Meeting Room Table (JUMP obstacle, ~0.92m tall!)
export function buildMeetingTable() {
  const g = new Group();
  for (const sx of [-0.62, 0.62]) part(g, M.dark(), sx, 0.36, 0, 0.12, 0.72, 0.52);
  part(g, M.wood(), 0, 0.74, 0, 1.82, 0.08, 0.86);
  // Open glowing blue laptop + green center potted plant
  part(g, M.steel(), -0.22, 0.80, 0.08, 0.34, 0.03, 0.24);
  const scr = part(g, M.cyan(), -0.22, 0.89, -0.04, 0.34, 0.18, 0.025);
  scr.rotation.x = -0.22;
  part(g, M.white(), 0.32, 0.83, -0.06, 0.12, 0.10, 0.12, cyl);
  part(g, M.leaf(), 0.32, 0.90, -0.06, 0.16, 0.11, 0.16, sphere);
  return g;
}

// 9. Badge Turnstile Gate (SLIDE obstacle: brushed-steel turnstiles + glowing green arrows + high cyber arch!)
export function buildTurnstileGate() {
  const g = new Group();
  for (const sx of [-0.92, 0.92]) {
    part(g, M.steel(), sx, 0.64, 0, 0.26, 1.28, 0.96);
    part(g, M.dark(), sx, 1.32, 0, 0.28, 0.10, 0.98);
    part(g, turnstileArrowMat(), sx, 0.92, 0.49, 0.20, 0.22, 0.03);
    part(g, M.steel(), sx, 1.98, 0, 0.14, 1.32, 0.18);
    part(g, M.cyan(), sx - (sx < 0 ? -0.08 : 0.08), 1.98, 0.10, 0.04, 1.20, 0.04);
  }
  // Translucent high cyan laser/glass badge security barrier beam (y = 1.72..2.58 -> clean slide under!)
  part(g, M.charcoal(), 0, 2.22, 0, 2.06, 0.86, 0.24);
  part(g, holoCodeMat(), 0, 2.22, 0.14, 1.88, 0.72, 0.03);
  part(g, M.cyan(), 0, 1.76, 0, 1.84, 0.07, 0.16);
  part(g, M.white(), 0, 2.68, 0, 2.12, 0.09, 0.30);
  return g;
}

// 10. Floating Code Hologram ("</> Better Together", BLOCK obstacle, ~2.16m tall + smooth levitation!)
export function buildCodeHologram() {
  const g = new Group();
  part(g, M.charcoal(), 0, 0.16, 0, 1.48, 0.32, 0.62);
  part(g, M.cyan(), 0, 0.34, 0, 1.34, 0.06, 0.48);
  part(g, M.cyan(), 0, 0.16, 0.32, 1.30, 0.06, 0.04);
  // Luminous Floating Cyan Glass Hologram Screen that levitates gently!
  const holo = part(g, holoCodeMat(), 0, 1.36, 0, 1.56, 1.42, 0.06);
  g.userData.holoPanel = holo;
  return g;
}
