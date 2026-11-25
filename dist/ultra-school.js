// ULTRA-only Photorealistic School Campus Assets:
// 1. Live GPU wind-swaying 3D Coconut Palms & 3D Neem/Banyan Shade Trees (true volumetric 3D trunks, branches, arched fronds & rustling leaf canopies — zero flat cardboard cards!)
// 2. Photorealistic South Indian Heritage School Buildings (sloped Mangalore clay terracotta roofs, open colonnade verandas, potted plants, teak louvered windows, ornate colonial entrance archway, lush mowed football pitch & wrought-iron railings)
// Strictly active ONLY when graphicsQuality === 'ultra'; AUTO/LOW/MED/HIGH remain 100% untouched.

import * as T from './vendor/three.module.js';
import { mergeGeometries } from './vendor/BufferGeometryUtils.js';
import { buildUltraSchoolBus } from './bus-model.js?v=3.10.22';

export const ultraSchoolWindClock = { value: 0 };

// Attach live GPU vertex wind-sway so palm fronds and tree leaves move with a gentle, natural sunlit breeze at 60 FPS.
function attachLiveWind(material, windAmp = 0.08, flutterAmp = 0.025, isTrunk = false) {
  material.onBeforeCompile = shader => {
    shader.uniforms.uWindTime = ultraSchoolWindClock;
    shader.uniforms.uWindAmp = { value: windAmp };
    shader.uniforms.uFlutterAmp = { value: flutterAmp };
    shader.vertexShader = 'uniform highp float uWindTime; uniform float uWindAmp, uFlutterAmp;\n' +
      shader.vertexShader.replace('#include <begin_vertex>', `
        #include <begin_vertex>
        {
          highp vec3 wPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
          highp float wt = mod(uWindTime, 600.0);
          float hFlex = smoothstep(1.2, 6.8, max(0.0, transformed.y));
          float tipWeight = ${isTrunk ? 'hFlex * hFlex' : '(0.22 + 0.78 * uv.y) * hFlex'};
          float phase = wPos.x * 0.36 + wPos.z * 0.25;
          float primary = sin(wt * 1.15 + phase) * 0.68 + sin(wt * 2.05 + phase * 1.6 + transformed.y * 0.35) * 0.32;
          float gust = 0.82 + 0.22 * sin(wt * 0.55 + wPos.z * 0.07);
          float flutter = ${isTrunk ? '0.0' : 'sin(wt * 3.4 + wPos.x * 1.9 + wPos.z * 1.5 + uv.x * 6.28) * uFlutterAmp'};
          transformed.x += (primary * gust * uWindAmp + flutter) * tipWeight;
          transformed.y += (cos(wt * 1.35 + phase * 1.2) * uWindAmp * 0.24 + flutter * 0.35) * tipWeight;
          transformed.z += (sin(wt * 0.98 + phase * 0.85) * uWindAmp * 0.42) * tipWeight;
        }
      `);
  };
  return material;
}

function makeCanvasTex(w, h, paintFn, { repeat = [1, 1], colorSpace = T.SRGBColorSpace } = {}) {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
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
function getUltraSchoolMaterials() {
  if (cachedMats) return cachedMats;

  // 1. Interlocking South Indian Mangalore Clay Terracotta Roof Tiles
  const terracottaTex = makeCanvasTex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#8b3e24';
    ctx.fillRect(0, 0, w, h);
    const cols = 8, rows = 8;
    const cw = w / cols, rh = h / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * cw, y = r * rh;
        const shade = ((r * 7 + c * 13) % 5) * 7 - 14;
        const grad = ctx.createLinearGradient(x, y, x + cw, y);
        grad.addColorStop(0, `rgb(${112 + shade},${48 + Math.round(shade * 0.4)},${28 + Math.round(shade * 0.3)})`);
        grad.addColorStop(0.45, `rgb(${178 + shade},${78 + Math.round(shade * 0.5)},${42 + Math.round(shade * 0.3)})`);
        grad.addColorStop(0.75, `rgb(${156 + shade},${66 + Math.round(shade * 0.4)},${34 + Math.round(shade * 0.3)})`);
        grad.addColorStop(1, `rgb(${94 + shade},${38 + Math.round(shade * 0.3)},${22 + Math.round(shade * 0.2)})`);
        ctx.fillStyle = grad;
        ctx.fillRect(x, y, cw, rh - 2);
        // Deep course shadow beneath each tile lip
        ctx.fillStyle = 'rgba(28, 12, 6, 0.58)';
        ctx.fillRect(x, y + rh - 4, cw, 4);
        // Subtle sunlit tile ridge highlight
        ctx.fillStyle = 'rgba(255, 206, 152, 0.16)';
        ctx.fillRect(x + cw * 0.36, y + 2, cw * 0.22, rh - 7);
      }
    }
  }, { repeat: [3, 6] });

  // 2. Warm Sunlit Heritage Stucco Lime Plaster with subtle weathering & patina
  const stuccoTex = makeCanvasTex(256, 256, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#eee0c4');
    g.addColorStop(0.65, '#e6d3b1');
    g.addColorStop(1, '#cfc0a2');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    let seed = 4219;
    for (let i = 0; i < 2400; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
      const x = (seed >>> 24) & 255;
      seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
      const y = (seed >>> 24) & 255;
      ctx.fillStyle = i % 2 ? 'rgba(255,248,232,0.16)' : 'rgba(118,92,64,0.12)';
      ctx.fillRect(x, y, 2, 2);
    }
    // Subtle plaster course lines
    ctx.fillStyle = 'rgba(120, 96, 68, 0.10)';
    for (let y = 32; y < h; y += 64) ctx.fillRect(0, y, w, 2);
  }, { repeat: [2, 2] });

  // 3. Heritage Exposed Aged Red-Brick Plinth & Compound Wall
  const brickTex = makeCanvasTex(256, 128, (ctx, w, h) => {
    ctx.fillStyle = '#c8baa2';
    ctx.fillRect(0, 0, w, h);
    const bw = 32, bh = 16;
    for (let r = 0; r < h / bh; r++) {
      const off = (r % 2) * (bw / 2);
      for (let c = -1; c <= w / bw; c++) {
        const s = ((r * 11 + c * 17) & 7) * 5 - 16;
        ctx.fillStyle = `rgb(${158 + s},${74 + Math.round(s * 0.5)},${50 + Math.round(s * 0.4)})`;
        ctx.fillRect(c * bw + off + 1, r * bh + 1, bw - 2, bh - 2);
      }
    }
  }, { repeat: [4, 2] });

  // 4. Multi-Pane Teakwood Louvered Heritage School Window Texture
  const winTex = makeCanvasTex(128, 160, (ctx, w, h) => {
    // Deep teakwood outer frame
    ctx.fillStyle = '#3b2416';
    ctx.fillRect(0, 0, w, h);
    // Recessed glass panes with warm sunlit sky gradient + dark classroom depth
    const g = ctx.createLinearGradient(0, 10, w, h - 10);
    g.addColorStop(0, '#2a4654');
    g.addColorStop(0.45, '#192b36');
    g.addColorStop(1, '#111d24');
    ctx.fillStyle = g;
    ctx.fillRect(10, 10, w - 20, h - 20);
    // Subtle golden diagonal glass sky reflection
    ctx.fillStyle = 'rgba(255, 224, 168, 0.16)';
    ctx.beginPath();
    ctx.moveTo(12, 12); ctx.lineTo(w * 0.72, 12); ctx.lineTo(w * 0.25, h - 12); ctx.lineTo(12, h - 12);
    ctx.closePath(); ctx.fill();
    // Wooden window mullions (3x3 colonial grid)
    ctx.fillStyle = '#4e301c';
    ctx.fillRect(w / 2 - 4, 8, 8, h - 16);
    for (const ry of [h * 0.34, h * 0.66]) ctx.fillRect(8, ry - 3, w - 16, 6);
    // Top louvered wood transom slats
    ctx.fillStyle = '#5c3921';
    for (let y = 14; y < 38; y += 6) ctx.fillRect(12, y, w - 24, 3);
    // Crisp cream stone sill highlight at bottom
    ctx.fillStyle = '#d9ccb2';
    ctx.fillRect(0, h - 7, w, 7);
  }, { repeat: [1, 1] });

  // 5. Lush Striped Football Stadium Turf
  const turfTex = makeCanvasTex(256, 256, (ctx, w, h) => {
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#3f8c39' : '#4fa144';
      ctx.fillRect(0, i * 32, w, 32);
    }
    let s = 9187;
    for (let i = 0; i < 3200; i++) {
      s = (Math.imul(s, 1664525) + 1013904223) | 0;
      const x = (s >>> 24) & 255;
      s = (Math.imul(s, 1664525) + 1013904223) | 0;
      const y = (s >>> 24) & 255;
      ctx.fillStyle = i % 3 === 0 ? 'rgba(218,242,140,0.16)' : 'rgba(24,62,22,0.18)';
      ctx.fillRect(x, y, 2, 3);
    }
  }, { repeat: [2, 4] });

  // 6. Ribbed Coconut Palm Bark Texture
  const palmBarkTex = makeCanvasTex(128, 256, (ctx, w, h) => {
    ctx.fillStyle = '#6e5844';
    ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 14) {
      ctx.fillStyle = 'rgba(42, 30, 20, 0.52)';
      ctx.fillRect(0, y, w, 4);
      ctx.fillStyle = 'rgba(164, 138, 108, 0.28)';
      ctx.fillRect(0, y + 4, w, 3);
    }
  }, { repeat: [1, 5] });

  // 7. Feathered Serrated Coconut Palm Frond Leaflets (Alpha Cutout — real tropical comb leaflets!)
  const palmFrondTex = makeCanvasTex(256, 512, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    // Central woody olive-gold midrib spine running from base (y=h) to tip (y=0)
    const spineGrad = ctx.createLinearGradient(0, h, 0, 0);
    spineGrad.addColorStop(0, '#788438');
    spineGrad.addColorStop(0.6, '#8ea83e');
    spineGrad.addColorStop(1, '#a9c44c');
    ctx.fillStyle = spineGrad;
    ctx.beginPath();
    ctx.moveTo(w * 0.47, h);
    ctx.lineTo(w * 0.53, h);
    ctx.lineTo(w * 0.506, 6);
    ctx.lineTo(w * 0.494, 6);
    ctx.closePath();
    ctx.fill();

    // 38 pairs of lush, broad, overlapping tropical palm leaflets radiating outward on both sides of the spine!
    const pairs = 38;
    for (let i = 0; i < pairs; i++) {
      const t = i / (pairs - 1); // 0 at base, 1 at tip
      const y = h - 14 - t * (h - 24);
      const env = Math.sin(Math.pow(t, 0.68) * Math.PI * 0.95);
      const reach = (0.20 + 0.32 * env) * w;
      const thick = Math.max(8, 18.5 * (1 - t * 0.35));
      for (const side of [-1, 1]) {
        const g = ctx.createLinearGradient(w / 2, y, w / 2 + side * reach, y - 22);
        g.addColorStop(0, '#1f531d');
        g.addColorStop(0.5, (i % 3 === 0) ? '#3b822a' : '#2f6e23');
        g.addColorStop(1, '#79b236');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(w / 2, y + thick * 0.45);
        ctx.quadraticCurveTo(w / 2 + side * reach * 0.55, y - 16, w / 2 + side * reach, y - 26 - env * 12);
        ctx.quadraticCurveTo(w / 2 + side * reach * 0.50, y + 4, w / 2, y - thick * 0.50);
        ctx.closePath();
        ctx.fill();
      }
    }
  }, { repeat: [1, 1] });
  if (palmFrondTex) { palmFrondTex.wrapS = palmFrondTex.wrapT = T.ClampToEdgeWrapping; }

  // 8. High-Res 512x512 Photorealistic Botanical Twig & Multi-Leaf Foliage Texture (Neem + Bright Pink Blossom Tree!)
  function paintBotanicalSprig(ctx, w, h, isPink) {
    ctx.clearRect(0, 0, w, h);
    let s = isPink ? 77123 : 31337;
    const rand = () => { s = (Math.imul(s, 1664525) + 1013904223) | 0; return (s >>> 0) / 4294967296; };

    // Dense 360-degree branching interior twigs centered at (w*0.5, h*0.5) so foliage fills the entire puff evenly with zero bottom gap!
    ctx.strokeStyle = '#3b291c';
    ctx.lineCap = 'round';
    const twigs = [];
    for (let t = 0; t < 10; t++) {
      const a = (t / 10) * Math.PI * 2 + (rand() - 0.5) * 0.22;
      const len = w * (0.24 + rand() * 0.16);
      const sx = w * 0.5 + (rand() - 0.5) * 18;
      const sy = h * 0.5 + (rand() - 0.5) * 18;
      const ex = sx + Math.cos(a) * len;
      const ey = sy + Math.sin(a) * len;
      ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
      twigs.push({ sx, sy, ex, ey, a });
    }

    // Draw pointed lance-shaped realistic leaf / petal helper
    function drawLeaf(cx, cy, lw, lh, rot, fill, vein) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.moveTo(0, -lh * 0.52);
      ctx.quadraticCurveTo(lw * 0.58, -lh * 0.06, 0, lh * 0.52);
      ctx.quadraticCurveTo(-lw * 0.58, -lh * 0.06, 0, -lh * 0.52);
      ctx.closePath();
      ctx.fill();
      if (vein) {
        ctx.strokeStyle = vein;
        ctx.lineWidth = 0.9;
        ctx.beginPath(); ctx.moveTo(0, -lh * 0.40); ctx.lineTo(0, lh * 0.40); ctx.stroke();
      }
      ctx.restore();
    }

    // Pass 1: Dense inner foliage foundation (solidly fills the center 72% radius so ZERO hollow gaps ever appear!)
    const baseCount = isPink ? 460 : 920;
    for (let i = 0; i < baseCount; i++) {
      const ang = rand() * Math.PI * 2;
      const rad = Math.pow(rand(), 0.62) * (w * 0.43);
      const cx = w * 0.5 + Math.cos(ang) * rad;
      const cy = h * 0.5 + Math.sin(ang) * rad;
      const edgeFade = rad / (w * 0.43);
      const lw = (10 + rand() * 10) * (1.12 - edgeFade * 0.35);
      const lh = (20 + rand() * 16) * (1.12 - edgeFade * 0.30);
      const rot = ang + (rand() - 0.5) * 1.9;
      const depthLayer = i / baseCount;
      const lit = Math.max(0, Math.min(1, (1 - cy / h) * 0.48 + depthLayer * 0.44 + rand() * 0.16));
      if (isPink) {
        // Rich deep-green + warm berry-rose base under-foliage so the pink crown looks 100% lush and solid!
        if (i < 220) {
          const r = Math.round(24 + lit * 44), g = Math.round(58 + lit * 68), b = Math.round(24 + lit * 22);
          drawLeaf(cx, cy, lw, lh, rot, `rgb(${r},${g},${b})`, null);
        } else {
          const r = Math.round(176 + lit * 56), g = Math.round(28 + lit * 78), b = Math.round(98 + lit * 68);
          drawLeaf(cx, cy, lw * 1.05, lh * 0.92, rot, `rgb(${r},${g},${b})`, null);
        }
      } else {
        const r = Math.round(20 + lit * 68);
        const g = Math.round(50 + lit * 92);
        const b = Math.round(18 + lit * 26);
        drawLeaf(cx, cy, lw, lh, rot, `rgb(${r},${g},${b})`, lit > 0.60 ? 'rgba(196,226,128,0.28)' : null);
      }
    }

    // Pass 2 (Pink Blossom Tree only): 780+ dense, bright, luminous magenta/hot-pink/pastel-blush blossom clusters!
    if (isPink) {
      for (let i = 0; i < 780; i++) {
        const ang = rand() * Math.PI * 2;
        const rad = Math.pow(rand(), 0.64) * (w * 0.44);
        const cx = w * 0.5 + Math.cos(ang) * rad;
        const cy = h * 0.5 + Math.sin(ang) * rad;
        const edgeFade = rad / (w * 0.44);
        const lit = Math.max(0, Math.min(1, (1 - cy / h) * 0.52 + (i / 780) * 0.38 + rand() * 0.18));
        const r = Math.round(206 + lit * 49);
        const g = Math.round(52 + lit * 138);
        const b = Math.round(128 + lit * 102);
        const pw = (11 + rand() * 11) * (1.10 - edgeFade * 0.32);
        const ph = (15 + rand() * 13) * (1.10 - edgeFade * 0.30);
        drawLeaf(cx, cy, pw, ph, rand() * Math.PI * 2, `rgb(${r},${g},${b})`, null);
        if (i % 6 === 0) {
          ctx.fillStyle = '#fff3c4';
          ctx.beginPath(); ctx.arc(cx, cy, 2.0, 0, Math.PI * 2); ctx.fill();
        }
      }
    }
  }

  const neemLeafTex = makeCanvasTex(512, 512, (ctx, w, h) => paintBotanicalSprig(ctx, w, h, false), { repeat: [1, 1] });
  if (neemLeafTex) { neemLeafTex.wrapS = neemLeafTex.wrapT = T.ClampToEdgeWrapping; }
  const pinkBlossomTex = makeCanvasTex(512, 512, (ctx, w, h) => paintBotanicalSprig(ctx, w, h, true), { repeat: [1, 1] });
  if (pinkBlossomTex) { pinkBlossomTex.wrapS = pinkBlossomTex.wrapT = T.ClampToEdgeWrapping; }

  // 9. Dark Gnarled Shade-Tree Bark Texture
  const barkTex = makeCanvasTex(128, 256, (ctx, w, h) => {
    ctx.fillStyle = '#473628';
    ctx.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 9) {
      ctx.fillStyle = x % 18 === 0 ? 'rgba(22,14,10,0.45)' : 'rgba(108,86,66,0.28)';
      ctx.fillRect(x, 0, 4, h);
    }
  }, { repeat: [2, 3] });

  cachedMats = {
    terracotta: new T.MeshStandardMaterial({ color: 0xffffff, map: terracottaTex, bumpMap: terracottaTex, bumpScale: 0.04, roughness: 0.78 }),
    ridgeTile: new T.MeshStandardMaterial({ color: 0x7e341d, roughness: 0.80 }),
    stuccoCream: new T.MeshStandardMaterial({ color: 0xf4ead4, map: stuccoTex, roughness: 0.90 }),
    stuccoWarm: new T.MeshStandardMaterial({ color: 0xecd4ad, map: stuccoTex, roughness: 0.90 }),
    stuccoOchre: new T.MeshStandardMaterial({ color: 0xe2be88, map: stuccoTex, roughness: 0.89 }),
    brick: new T.MeshStandardMaterial({ color: 0xffffff, map: brickTex, roughness: 0.92 }),
    teakWood: new T.MeshStandardMaterial({ color: 0x4b2f1c, roughness: 0.82 }),
    verandaFloor: new T.MeshStandardMaterial({ color: 0x8d4232, roughness: 0.62 }),
    verandaShadow: new T.MeshStandardMaterial({ color: 0x3b2f28, roughness: 0.96 }),
    stoneTrim: new T.MeshStandardMaterial({ color: 0xe9dec8, roughness: 0.84 }),
    heritageWindow: new T.MeshStandardMaterial({ color: 0xffffff, map: winTex, roughness: 0.24, metalness: 0.28, envMapIntensity: 1.25 }),
    ironGreen: new T.MeshStandardMaterial({ color: 0x1d4d3a, roughness: 0.42, metalness: 0.55 }),
    goalWhite: new T.MeshStandardMaterial({ color: 0xf3f5f0, roughness: 0.55 }),
    turf: new T.MeshStandardMaterial({ color: 0xffffff, map: turfTex, roughness: 0.96 }),
    clayPot: new T.MeshStandardMaterial({ color: 0xb65532, roughness: 0.84 }),
    goldCrest: new T.MeshStandardMaterial({ color: 0xeab308, roughness: 0.32, metalness: 0.72 }),
    lampGlow: new T.MeshStandardMaterial({ color: 0xfff0c2, emissive: 0xffd27a, emissiveIntensity: 0.65, roughness: 0.2 }),
    asphaltYard: new T.MeshStandardMaterial({ color: 0x5c6266, roughness: 0.92 }),
    chalkLine: new T.MeshStandardMaterial({ color: 0xf1f0e2, roughness: 0.95 }),
    // Live GPU wind-animated tree materials (calm, gentle natural breeze!)
    palmTrunk: attachLiveWind(new T.MeshStandardMaterial({ color: 0xffffff, map: palmBarkTex, roughness: 0.92 }), 0.035, 0.0, true),
    palmCoconut: attachLiveWind(new T.MeshStandardMaterial({ color: 0x5c7a26, roughness: 0.58 }), 0.038, 0.0, true),
    palmFrond: attachLiveWind(new T.MeshStandardMaterial({
      color: 0xffffff, map: palmFrondTex, alphaTest: 0.36, side: T.DoubleSide, roughness: 0.76
    }), 0.11, 0.032, false),
    shadeBark: attachLiveWind(new T.MeshStandardMaterial({ color: 0xffffff, map: barkTex, roughness: 0.94 }), 0.012, 0.0, true),
    shadeCore: attachLiveWind(new T.MeshStandardMaterial({ color: 0x1b3c1b, map: neemLeafTex, roughness: 0.95 }), 0.042, 0.010, false),
    shadeLeaf: attachLiveWind(new T.MeshStandardMaterial({
      color: 0xffffff, map: neemLeafTex, alphaTest: 0.38, side: T.DoubleSide, roughness: 0.86
    }), 0.064, 0.022, false),
    pinkCore: attachLiveWind(new T.MeshStandardMaterial({ color: 0x9b1b5a, map: pinkBlossomTex, emissive: 0x5c0f38, emissiveIntensity: 0.22, roughness: 0.88 }), 0.046, 0.012, false),
    pinkBlossom: attachLiveWind(new T.MeshStandardMaterial({
      color: 0xffffff, map: pinkBlossomTex, alphaTest: 0.36, side: T.DoubleSide,
      emissive: 0xff4fa3, emissiveIntensity: 0.18, roughness: 0.74
    }), 0.072, 0.026, false),
    soilRing: new T.MeshStandardMaterial({ color: 0x4b3b2b, roughness: 0.96 }),
    flowerPink: attachLiveWind(new T.MeshStandardMaterial({ color: 0xf43f97, emissive: 0x9d174d, emissiveIntensity: 0.22, roughness: 0.72 }), 0.032, 0.012, false)
  };
  return cachedMats;
}

// Reusable base geometries for fast template construction
const unitBox = new T.BoxGeometry(1, 1, 1);
const unitCyl = new T.CylinderGeometry(1, 1, 1, 10);
const unitSphere = new T.SphereGeometry(1, 10, 7);

// Build one gracefully arched 3D V-folded palm frond geometry (with uv.y = 0 at crown stem -> 1 at drooping tip!)
let cachedFrondGeo = null;
function getArchedFrondGeo() {
  if (cachedFrondGeo) return cachedFrondGeo;
  const segs = 9;
  const len = 3.85;
  const halfW = 1.08;
  const pos = [];
  const uvs = [];
  const idx = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const z = t * len;
    // Graceful tropical palm arch: rises near crown, then arcs smoothly downward toward tip!
    const y = Math.sin(t * Math.PI * 0.78) * 0.92 - t * t * 1.48;
    const w = halfW * (0.35 + 0.85 * Math.sin(Math.pow(t, 0.7) * Math.PI * 0.92));
    const droop = 0.22 * w; // V-fold downward leaflet tilt for true 3D volume from side & behind!
    // Left edge, center spine, right edge
    pos.push(-w, y - droop, z,  0, y, z,  w, y - droop, z);
    uvs.push(0, t,  0.5, t,  1, t);
  }
  for (let i = 0; i < segs; i++) {
    const r = i * 3;
    const n = (i + 1) * 3;
    idx.push(r, r + 1, n + 1,  r, n + 1, n);
    idx.push(r + 1, r + 2, n + 2,  r + 1, n + 2, n + 1);
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  cachedFrondGeo = g;
  return g;
}

// Build one smoothly-curved 3D foliage dome sprig (gentle 3D cap so cards NEVER look like thin edge-on paper slivers!)
let cachedBoughGeo = null;
function getCuppedBoughGeo() {
  if (cachedBoughGeo) return cachedBoughGeo;
  const g = new T.PlaneGeometry(1, 1, 4, 4);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i);
    const bulge = Math.max(0, 0.30 - (x * x + y * y)) * 0.95;
    p.setZ(i, bulge);
  }
  g.computeVertexNormals();
  cachedBoughGeo = g;
  return g;
}

// AAA Game Foliage Normal-Transfer: align all foliage sprig normals smoothly outward from the tree crown center
// so intersecting leaf cards blend into ONE seamless, soft, photorealistic 3D tree canopy with zero bright/dark card seams!
function bakeCrownNormals(mesh, cx, cy, cz) {
  mesh.updateMatrix();
  const g = mesh.geometry.clone().applyMatrix4(mesh.matrix);
  const pos = g.attributes.position;
  const norm = g.attributes.normal;
  const v = new T.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.set(pos.getX(i) - cx, (pos.getY(i) - cy) * 0.95 + 0.45, pos.getZ(i) - cz).normalize();
    norm.setXYZ(i, v.x, v.y, v.z);
  }
  norm.needsUpdate = true;
  mesh.geometry = g;
  mesh.position.set(0, 0, 0);
  mesh.rotation.set(0, 0, 0);
  mesh.scale.set(1, 1, 1);
}

// Add a live swaying 3D Coconut Palm Tree directly into parent group
export function addUltraPalmTree(parent, x, z, height = 8.4, leanDir = 1, seed = 0) {
  const M = getUltraSchoolMaterials();
  const segs = 6;
  const leanX = leanDir * (0.45 + (Math.abs(Math.sin(seed * 3.1)) * 0.55));
  const leanZ = Math.cos(seed * 2.3) * 0.35;
  let px = x, py = 0, pz = z;

  for (let i = 0; i < segs; i++) {
    const t0 = i / segs, t1 = (i + 1) / segs;
    const nx = x + leanX * Math.pow(t1, 1.55);
    const ny = height * t1;
    const nz = z + leanZ * Math.pow(t1, 1.55);
    const dx = nx - px, dy = ny - py, dz = nz - pz;
    const segLen = Math.hypot(dx, dy, dz) + 0.08;
    const rBot = 0.24 * (1 - t0 * 0.50);
    const rTop = 0.24 * (1 - t1 * 0.50);
    const segGeo = new T.CylinderGeometry(rTop, rBot, segLen, 8, 1);
    const m = new T.Mesh(segGeo, M.palmTrunk);
    m.position.set((px + nx) * 0.5, (py + ny) * 0.5, (pz + nz) * 0.5);
    m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), new T.Vector3(dx, dy, dz).normalize());
    parent.add(m);
    px = nx; py = ny; pz = nz;
  }

  // Cluster of 5 coconuts nestled right below crown
  for (let c = 0; c < 5; c++) {
    const a = c * (Math.PI * 2 / 5) + seed;
    const nut = new T.Mesh(unitSphere, M.palmCoconut);
    nut.scale.set(0.14, 0.17, 0.14);
    nut.position.set(px + Math.cos(a) * 0.22, py - 0.18, pz + Math.sin(a) * 0.22);
    parent.add(nut);
  }

  // 14 lush arched 3D drooping palm fronds radiating 360 degrees in 2 full tropical tiers!
  const frondGeo = getArchedFrondGeo();
  const scaleF = Math.max(0.84, Math.min(1.22, height / 7.8));
  for (let f = 0; f < 14; f++) {
    const upper = f < 6;
    const yaw = (upper ? (f / 6) : ((f - 6) / 8 + 0.06)) * Math.PI * 2 + seed * 0.7;
    const pitch = upper ? -0.32 : 0.16;
    const frond = new T.Mesh(frondGeo, M.palmFrond);
    frond.position.set(px, py + (upper ? 0.14 : -0.05), pz);
    frond.rotation.order = 'YXZ';
    frond.rotation.y = yaw;
    frond.rotation.x = pitch;
    frond.rotation.z = Math.sin(f * 2.1 + seed) * 0.14;
    const s = scaleF * (upper ? 0.94 : 1.08);
    frond.scale.set(s, s, s);
    parent.add(frond);
  }
}

// Smooth hidden inner shadow core (tucked well inside outer leaf tufts so zero polygonal edge ever shows!)
let cachedCanopyLobeGeo = null;
function getCanopyLobeGeo() {
  if (cachedCanopyLobeGeo) return cachedCanopyLobeGeo;
  cachedCanopyLobeGeo = new T.SphereGeometry(1, 10, 8);
  return cachedCanopyLobeGeo;
}

// Add a photorealistic live-swaying 3D Neem / Banyan Shade Tree OR Bright Pink Flowering Tree (Bougainvillea / Pink Trumpet)!
export function addUltraShadeTree(parent, x, z, height = 6.4, seed = 0, isPink = false) {
  const M = getUltraSchoolMaterials();
  const trunkH = height * 0.43;
  // Grounded soil/mulch base ring + flared root buttress
  const soil = new T.Mesh(new T.CylinderGeometry(0.66, 0.82, 0.08, 10), M.soilRing);
  soil.position.set(x, 0.05, z);
  parent.add(soil);
  const flare = new T.Mesh(new T.CylinderGeometry(0.26, 0.42, 0.62, 8, 1), M.shadeBark);
  flare.position.set(x, 0.33, z);
  parent.add(flare);
  // Main gently-curved gnarled trunk (2 segments for organic non-cylinder feel!)
  const leanX = Math.sin(seed * 2.1) * 0.22;
  const leanZ = Math.cos(seed * 1.7) * 0.18;
  const trunkGeo = new T.CylinderGeometry(0.18, 0.29, trunkH, 8, 1);
  const trunk = new T.Mesh(trunkGeo, M.shadeBark);
  trunk.position.set(x + leanX * 0.4, trunkH * 0.5 + 0.05, z + leanZ * 0.4);
  trunk.rotation.z = -leanX * 0.14;
  trunk.rotation.x = leanZ * 0.14;
  parent.add(trunk);

  const hubX = x + leanX * 0.75, hubY = trunkH, hubZ = z + leanZ * 0.75;
  const lobeGeo = getCanopyLobeGeo();
  const boughGeo = getCuppedBoughGeo();
  const branchTips = [];
  for (let b = 0; b < 5; b++) {
    const a = b * (Math.PI * 2 / 5) + seed * 0.8 + 0.25;
    const bLen = height * (0.30 + (b % 2) * 0.07);
    const tx = hubX + Math.cos(a) * bLen * 0.82;
    const ty = hubY + bLen * 0.58;
    const tz = hubZ + Math.sin(a) * bLen * 0.82;
    const startY = hubY - 0.30;
    const dir = new T.Vector3(tx - hubX, ty - startY, tz - hubZ);
    const brGeo = new T.CylinderGeometry(0.065, 0.13, dir.length(), 6, 1);
    const br = new T.Mesh(brGeo, M.shadeBark);
    br.position.set((hubX + tx) * 0.5, (startY + ty) * 0.5, (hubZ + tz) * 0.5);
    br.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), dir.normalize());
    parent.add(br);
    branchTips.push([tx, ty, tz]);
  }
  branchTips.push([hubX, height * 0.82, hubZ]);

  const crownCenterY = hubY + height * 0.22;
  const baseRad = Math.max(1.22, height * 0.23);
  const leafMat = isPink ? M.pinkBlossom : M.shadeLeaf;

  // Center heart foliage cluster (replaces solid sphere egg — 100% pure layered leaves & blossoms with zero visible sphere!)
  branchTips.push([hubX, hubY + height * 0.16, hubZ]);

  // Smooth-normal volumetric botanical leaf-sprig tufts covering every branch tip & crown center completely!
  for (let i = 0; i < branchTips.length; i++) {
    const [bx, by, bz] = branchTips[i];
    const isApex = i >= branchTips.length - 2;
    const rad = baseRad * (isApex ? 1.24 : 0.98 + (i % 2) * 0.12);
    const leafSz = rad * 2.45;
    for (let k = 0; k < 5; k++) {
      const a = seed + i * 1.18 + k * (Math.PI * 2 / 5) + 0.32;
      const isCrownCap = k === 4;
      const m = new T.Mesh(boughGeo, leafMat);
      m.position.set(
        bx + (isCrownCap ? 0 : Math.cos(a) * rad * 0.36),
        by + (isCrownCap ? rad * 0.30 : (k % 2 ? 0.12 : -0.18)),
        bz + (isCrownCap ? 0 : Math.sin(a) * rad * 0.36)
      );
      m.scale.set(leafSz * (isCrownCap ? 1.12 : 1.02), leafSz * 0.96, leafSz);
      if (isCrownCap) {
        m.rotation.set(-Math.PI * 0.36, a, 0.12);
      } else {
        m.rotation.order = 'YXZ';
        m.rotation.y = Math.atan2(Math.cos(a), Math.sin(a));
        m.rotation.x = -0.28;
      }
      bakeCrownNormals(m, hubX, crownCenterY - 0.35, hubZ);
      parent.add(m);
    }
  }
}

export function addUltraPinkTree(parent, x, z, height = 5.8, seed = 0) {
  return addUltraShadeTree(parent, x, z, height, seed, true);
}

function addPottedPlant(parent, x, y, z, M, flower = false) {
  const pot = new T.Mesh(new T.CylinderGeometry(0.24, 0.16, 0.34, 8), M.clayPot);
  pot.position.set(x, y + 0.17, z);
  parent.add(pot);
  const boughGeo = getCuppedBoughGeo();
  for (let k = 0; k < 2; k++) {
    const bush = new T.Mesh(boughGeo, M.shadeLeaf);
    bush.position.set(x, y + 0.56, z);
    bush.scale.set(0.85, 0.72, 0.85);
    bush.rotation.y = k * (Math.PI * 0.5) + 0.4;
    parent.add(bush);
  }
  if (flower) {
    const fl = new T.Mesh(unitSphere, M.flowerPink);
    fl.position.set(x + 0.12, y + 0.68, z);
    fl.scale.set(0.14, 0.12, 0.14);
    parent.add(fl);
  }
}

function addPart(parent, mat, x, y, z, w, h, d, geo = unitBox) {
  const m = new T.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.scale.set(w, h, d);
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

const signCache = new Map();
function addHeritageSign(parent, text, x, y, z, width = 3.8, height = 0.56, rotY = 0) {
  const M = getUltraSchoolMaterials();
  const holder = new T.Group();
  holder.position.set(x, y, z);
  holder.rotation.y = rotY;
  addPart(holder, M.teakWood, 0, 0, 0, width + 0.12, height + 0.12, 0.10);
  if (typeof document !== 'undefined') {
    if (!signCache.has(text)) {
      const c = document.createElement('canvas');
      c.width = 512; c.height = 96;
      const ctx = c.getContext('2d');
      if (ctx) {
        const g = ctx.createLinearGradient(0, 0, 512, 96);
        g.addColorStop(0, '#163532'); g.addColorStop(0.5, '#1f4a45'); g.addColorStop(1, '#132d2a');
        ctx.fillStyle = g; ctx.fillRect(0, 0, 512, 96);
        ctx.strokeStyle = '#e8c46b'; ctx.lineWidth = 5; ctx.strokeRect(6, 6, 500, 84);
        ctx.fillStyle = '#fff5dc'; ctx.font = '800 38px Georgia, serif'; ctx.textAlign = 'center';
        ctx.fillText(text, 256, 62, 470);
        const tex = new T.CanvasTexture(c);
        tex.colorSpace = T.SRGBColorSpace;
        signCache.set(text, new T.MeshStandardMaterial({ map: tex, roughness: 0.55 }));
      }
    }
    const sm = signCache.get(text);
    if (sm) addPart(holder, sm, 0, 0, 0.056, width, height, 0.014);
  }
  parent.add(holder);
}

// Bake all meshes inside root into minimal per-material merged draw calls while keeping wind-animated shaders intact!
function bakeUltraGroup(root) {
  root.updateMatrixWorld(true);
  const buckets = new Map();
  root.traverse(obj => {
    if (!obj.isMesh || !obj.geometry) return;
    let g = obj.geometry.index ? obj.geometry.toNonIndexed() : obj.geometry.clone();
    if (!g.attributes.uv) {
      g.setAttribute('uv', new T.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    }
    if (!g.attributes.normal) g.computeVertexNormals();
    // Strip extra attributes like color/tangent if mismatched
    for (const key of Object.keys(g.attributes)) {
      if (key !== 'position' && key !== 'normal' && key !== 'uv') g.deleteAttribute(key);
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

// Heritage 2-story South Indian Colonial School Block with Sloped Mangalore Clay Tile Roof & Open Colonnade Veranda (Panel 1!)
function buildHeritageVerandaBlock(g, side, label, floors = 2, style = 0) {
  const M = getUltraSchoolMaterials();
  const wallMat = style === 1 ? M.stuccoCream : style === 2 ? M.stuccoOchre : M.stuccoWarm;
  const depth = 22.0;
  const zCenter = -2.0;
  const h = floors === 1 ? 3.9 : 6.9;
  // Set main classroom masonry back so an open colonnade veranda sits right along the roadside!
  const bodyX = side * 11.2;
  const bodyW = 7.4;
  const innerWallX = bodyX - side * (bodyW * 0.5); // ~ +/- 7.5
  const verandaOuterX = side * 5.45; // open colonnade pillars edge!

  // 1. Raised red-oxide veranda slab & brick plinth foundation
  addPart(g, M.brick, side * 9.8, 0.24, zCenter, 9.6, 0.48, depth + 0.4);
  addPart(g, M.verandaFloor, side * 6.45, 0.46, zCenter, 2.35, 0.08, depth + 0.2);
  addPart(g, M.stoneTrim, side * 5.28, 0.26, zCenter, 0.26, 0.44, depth + 0.3);

  // 2. Main heritage masonry classroom volume
  addPart(g, wallMat, bodyX, h * 0.5 + 0.35, zCenter, bodyW, h, depth);
  // Shadowed recessed corridor ceiling & horizontal molding cornice bands
  addPart(g, M.verandaShadow, side * 6.45, 3.05, zCenter, 2.15, 0.14, depth - 0.2);
  addPart(g, M.stoneTrim, bodyX, h + 0.38, zCenter, bodyW + 0.35, 0.22, depth + 0.3);
  if (floors >= 2) addPart(g, M.stoneTrim, innerWallX - side * 0.06, 3.48, zCenter, 0.22, 0.18, depth + 0.1);

  // 3. Open colonnade veranda pillars with brick plinths, molded capitals & dark teak veranda railing beam
  for (let i = 0; i < 7; i++) {
    const pz = zCenter + depth * 0.5 - 1.2 - i * 3.25;
    addPart(g, M.brick, verandaOuterX, 0.68, pz, 0.46, 0.46, 0.46);
    addPart(g, M.stuccoCream, verandaOuterX, 1.98, pz, 0.30, 2.25, 0.30);
    addPart(g, M.stoneTrim, verandaOuterX, 3.12, pz, 0.44, 0.16, 0.44);
    // Decorative terracotta potted plants between veranda columns (exact Panel 1 detail!)
    if (i < 6 && i % 2 === 0) {
      addPottedPlant(g, verandaOuterX - side * 0.35, 0.48, pz - 1.62, M, i === 2);
    }
  }
  // Veranda wooden eaves fascia & exposed dark teak rafter tails
  addPart(g, M.teakWood, verandaOuterX - side * 0.24, 3.20, zCenter, 0.16, 0.18, depth + 0.4);
  for (let i = 0; i < 14; i++) {
    const rz = zCenter + depth * 0.5 - 0.8 - i * 1.56;
    addPart(g, M.teakWood, side * 6.15, 3.30, rz, 2.55, 0.10, 0.10);
  }
  // Sloped Mangalore clay tile veranda canopy roof overhanging the walkway!
  const vRoof = addPart(g, M.terracotta, side * 6.22, 3.62, zCenter, 2.95, 0.14, depth + 0.7);
  vRoof.rotation.z = side * 0.30;

  // 4. Real Sloped Pitched Mangalore Clay Terracotta Main Roof + Ridge Cap + Gable Triangles
  const roofH = h + 0.48;
  for (const rSide of [-1, 1]) {
    const slope = addPart(g, M.terracotta, bodyX + rSide * 2.15, roofH + 0.82, zCenter, 4.95, 0.16, depth + 0.9);
    slope.rotation.z = -rSide * 0.34;
  }
  addPart(g, M.ridgeTile, bodyX, roofH + 1.68, zCenter, 0.36, 0.24, depth + 1.0);
  // Gable attic fill under the pitched roof
  addPart(g, wallMat, bodyX, roofH + 0.65, zCenter, bodyW * 0.66, 1.15, depth - 0.3);

  // 5. Recessed Multi-Pane Teakwood Louvered Windows & Concrete Sunshades (Chajjas)
  for (let lv = 0; lv < floors; lv++) {
    const wy = lv === 0 ? 1.88 : 5.05;
    for (let i = 0; i < 6; i++) {
      const wz = zCenter + depth * 0.5 - 2.3 - i * 3.45;
      addPart(g, M.stoneTrim, innerWallX - side * 0.04, wy, wz, 0.14, 1.56, 1.32);
      addPart(g, M.heritageWindow, innerWallX - side * 0.11, wy, wz, 0.05, 1.38, 1.12);
      if (lv > 0) {
        const chajja = addPart(g, M.stoneTrim, innerWallX - side * 0.32, wy + 0.86, wz, 0.62, 0.10, 1.54);
        chajja.rotation.z = side * 0.18;
      }
    }
  }
  // Front-facing windows + grand teak entrance doorway + heritage plaque
  const frontZ = zCenter + depth * 0.5;
  for (const dx of [-2.2, 2.2]) {
    addPart(g, M.heritageWindow, bodyX + dx, 1.95, frontZ + 0.05, 1.15, 1.42, 0.06);
    if (floors >= 2) addPart(g, M.heritageWindow, bodyX + dx, 5.05, frontZ + 0.05, 1.15, 1.42, 0.06);
  }
  addPart(g, M.teakWood, bodyX, 1.60, frontZ + 0.06, 1.48, 2.35, 0.12);
  addHeritageSign(g, label, bodyX, floors >= 2 ? 3.65 : 3.20, frontZ + 0.14, 4.4, 0.58, 0);

  // Optional classic clock-gable dormer on Library (style === 2)
  if (style === 2) {
    addPart(g, M.stuccoCream, bodyX, roofH + 1.55, frontZ - 0.15, 2.5, 2.3, 0.55);
    const dial = addPart(g, M.lampGlow, bodyX, roofH + 1.80, frontZ + 0.16, 0.68, 0.08, 0.68, unitCyl);
    dial.rotation.x = Math.PI * 0.5;
  }
}

// Lush Mowed Football / Athletic Ground + Authentic Dark-Green Wrought-Iron Railings & Swaying Palms (Panel 1 right side!)
function buildUltraSportsGround(g, side, seed = 0) {
  const M = getUltraSchoolMaterials();
  const fieldX = side * 12.2;
  addPart(g, M.turf, fieldX, 0.11, -1.5, 14.4, 0.08, 28.0);
  // Crisp white chalk pitch markings
  for (const dx of [-5.6, 5.6]) addPart(g, M.chalkLine, fieldX + dx, 0.16, -1.5, 0.08, 0.02, 24.0);
  for (const z of [-13.5, -1.5, 10.5]) addPart(g, M.chalkLine, fieldX, 0.16, z, 11.2, 0.02, 0.08);
  // Real 3D white football goalposts with angled rear support struts
  for (const gz of [-13.2, 10.2]) {
    for (const dx of [-1.75, 1.75]) {
      addPart(g, M.goalWhite, fieldX + dx, 1.25, gz, 0.10, 2.35, 0.10, unitCyl);
      const back = addPart(g, M.goalWhite, fieldX + dx, 1.15, gz + (gz > 0 ? 0.55 : -0.55), 0.06, 2.45, 0.06, unitCyl);
      back.rotation.x = gz > 0 ? -0.45 : 0.45;
    }
    addPart(g, M.goalWhite, fieldX, 2.40, gz, 3.60, 0.10, 0.10);
  }
  // Authentic dark-green wrought-iron vertical picket railing along the field curb (Panel 1 right side!)
  const railX = side * 4.98;
  addPart(g, M.stoneTrim, railX, 0.25, 0, 0.28, 0.50, 32.0);
  addPart(g, M.ironGreen, railX, 1.18, 0, 0.07, 0.07, 32.0);
  addPart(g, M.ironGreen, railX, 0.62, 0, 0.06, 0.05, 32.0);
  for (let i = 0; i < 32; i++) {
    const rz = 15.2 - i * 1.0;
    addPart(g, M.ironGreen, railX, 0.88, rz, 0.036, 0.72, 0.036);
  }
  for (let p = 0; p < 5; p++) {
    const pz = 14 - p * 7;
    addPart(g, M.stuccoCream, railX, 0.72, pz, 0.36, 1.24, 0.36);
    addPart(g, M.stoneTrim, railX, 1.38, pz, 0.46, 0.12, 0.46);
  }
  // Live swaying 3D Coconut Palms, Neem shade trees & vibrant Pink Flowering trees framing the athletic field!
  addUltraPalmTree(g, side * 6.4, 11.5, 9.2, -side, seed + 1.1);
  addUltraPinkTree(g, side * 7.2, 3.5, 5.7, seed + 1.9);
  addUltraPalmTree(g, side * 7.6, -3.5, 8.6, -side, seed + 2.4);
  addUltraShadeTree(g, side * 6.8, -11.5, 6.8, seed + 3.7);
  addUltraPalmTree(g, side * 16.5, 5.5, 10.4, -side, seed + 4.9);
  addUltraShadeTree(g, side * 17.5, -8.5, 7.6, seed + 6.2);
}

function buildUltraCourtyard(g, side, seed = 0) {
  const M = getUltraSchoolMaterials();
  const cx = side * 9.5;
  addPart(g, M.turf, cx, 0.11, -1.5, 9.2, 0.08, 27.0);
  // Wrought-iron low campus fence + stone piers
  const railX = side * 4.98;
  addPart(g, M.stoneTrim, railX, 0.25, 0, 0.28, 0.50, 32.0);
  addPart(g, M.ironGreen, railX, 1.12, 0, 0.07, 0.07, 32.0);
  for (let i = 0; i < 24; i++) addPart(g, M.ironGreen, railX, 0.84, 14.5 - i * 1.26, 0.036, 0.68, 0.036);
  // Teak garden benches + brick planters + live swaying 3D palms & neem trees
  for (const bz of [7.5, -2.5, -11.0]) {
    addPart(g, M.teakWood, side * 6.8, 0.56, bz, 0.62, 0.10, 2.0);
    addPart(g, M.teakWood, side * 7.08, 0.92, bz, 0.10, 0.52, 2.0);
    addPart(g, M.brick, side * 10.4, 0.30, bz, 2.2, 0.52, 2.2);
  }
  addUltraPalmTree(g, side * 10.4, 7.5, 9.4, -side, seed + 0.5);
  addUltraPinkTree(g, side * 10.4, -2.5, 6.2, seed + 1.8);
  addUltraPalmTree(g, side * 10.4, -11.0, 8.8, -side, seed + 3.1);
  addUltraShadeTree(g, side * 15.8, 3.0, 7.8, seed + 4.4);
  addHeritageSign(g, 'READING GARDEN', side * 8.2, 2.05, 11.2, 3.8, 0.54, 0);
}

function buildUltraTransportYard(g, side, seed = 0) {
  const M = getUltraSchoolMaterials();
  const x = side * 10.4;
  addPart(g, M.asphaltYard, x, 0.12, -2.0, 9.2, 0.08, 26.0);
  for (let i = 0; i < 5; i++) addPart(g, M.chalkLine, x, 0.17, 7.5 - i * 4.5, 6.4, 0.02, 0.08);
  for (let i = 0; i < 2; i++) {
    const bus = buildUltraSchoolBus(5.2, 2.45, true);
    bus.position.set(x, 0.12, 6.2 - i * 9.5);
    g.add(bus);
  }
  addHeritageSign(g, 'SCHOOL TRANSPORT', x, 2.55, 11.2, 4.6, 0.56, 0);
  addUltraPalmTree(g, side * 5.8, -11.5, 8.8, -side, seed + 2.2);
  addUltraShadeTree(g, side * 15.8, 3.5, 7.2, seed + 5.1);
}

// Build one complete ULTRA School 32m campus slot (merged into ~15 draw calls with live GPU-animated 3D trees!)
export function buildUltraSchoolTemplate(kind) {
  const M = getUltraSchoolMaterials();
  const g = new T.Group();

  // Roadside heritage granite curbs, classic cast-iron green lampposts & warm lamp heads
  for (const side of [-1, 1]) {
    addPart(g, M.stoneTrim, side * 3.66, 0.19, 0, 0.24, 0.24, 32.0);
    // Ground apron under buildings/fields so no gap ever shows at curbs
    addPart(g, M.asphaltYard, side * 14.2, -3.76, 0, 19.6, 7.6, 32.4);
    for (let i = 0; i < 4; i++) addPart(g, M.chalkLine, side * 1.1, 0.105, 12 - i * 8, 0.065, 0.018, 3.5);
    for (const lz of [-8, 8]) {
      addPart(g, M.ironGreen, side * 4.68, 2.25, lz, 0.09, 4.4, 0.09, unitCyl);
      addPart(g, M.ironGreen, side * 4.45, 4.42, lz, 0.58, 0.08, 0.08);
      addPart(g, M.lampGlow, side * 4.22, 4.30, lz, 0.34, 0.18, 0.28);
    }
  }

  // Diverse campus blocks matching South Indian heritage school look (Panel 1!)
  if (kind === 0) { buildHeritageVerandaBlock(g, -1, 'CLASSROOM BLOCK', 2, 0); buildUltraSportsGround(g, 1, 10); }
  if (kind === 1) { buildUltraCourtyard(g, -1, 20); buildHeritageVerandaBlock(g, 1, 'SCIENCE BLOCK', 2, 1); }
  if (kind === 2) { buildHeritageVerandaBlock(g, -1, 'SCHOOL LIBRARY', 2, 2); buildUltraSportsGround(g, 1, 30); }
  if (kind === 3) { buildHeritageVerandaBlock(g, -1, 'CAMPUS CANTEEN', 1, 0); buildUltraTransportYard(g, 1, 40); }
  if (kind === 4) { buildHeritageVerandaBlock(g, -1, 'ASSEMBLY HALL', 2, 1); buildHeritageVerandaBlock(g, 1, 'ADMINISTRATION', 2, 2); }
  if (kind === 5) { buildUltraSportsGround(g, -1, 50); buildHeritageVerandaBlock(g, 1, 'STUDENT CENTRE', 2, 0); }

  // Towering background swaying 3D palm & neem skyline behind both sides of the campus
  for (const side of [-1, 1]) {
    addUltraPalmTree(g, side * (16.8 + (kind % 2) * 2.2), 9.0 - kind, 10.6, -side, kind * 3.1 + side);
    addUltraShadeTree(g, side * 17.6, -10.5, 8.2, kind * 5.7 - side);
  }

  return bakeUltraGroup(g);
}

// Grand Ornate South Indian Colonial School Entrance Archway & Terracotta Veranda Wings (ULTRA School only — Panel 1!)
export function buildUltraSchoolEntrance(gateZ) {
  const M = getUltraSchoolMaterials();
  const root = new T.Group();
  root.name = 'ultra-school-entrance';

  // 1. Twin Ornate Heritage Masonry Gate Piers + Colonial Semicircular Arched Bridge
  for (const side of [-1, 1]) {
    const px = side * 4.25;
    addPart(root, M.brick, px, 0.45, gateZ, 1.25, 0.90, 1.35);
    addPart(root, M.stuccoCream, px, 2.75, gateZ, 0.96, 3.85, 1.08);
    // Fluted decorative pilaster ribs
    addPart(root, M.stoneTrim, px - side * 0.46, 2.75, gateZ + 0.32, 0.14, 3.6, 0.14);
    addPart(root, M.stoneTrim, px - side * 0.46, 2.75, gateZ - 0.32, 0.14, 3.6, 0.14);
    // Molded capital & finial urn cap
    addPart(root, M.stoneTrim, px, 4.78, gateZ, 1.26, 0.28, 1.34);
    addPart(root, M.terracotta, px, 5.12, gateZ, 0.92, 0.42, 0.92);
    addPart(root, M.goldCrest, px, 5.45, gateZ, 0.24, 0.28, 0.24, unitSphere);

    // Flanking brick-and-wrought-iron school compound wall
    addPart(root, M.brick, side * 7.8, 0.62, gateZ, 6.2, 1.24, 0.56);
    addPart(root, M.stoneTrim, side * 7.8, 1.28, gateZ, 6.3, 0.14, 0.68);
    addPart(root, M.ironGreen, side * 7.8, 2.26, gateZ, 6.0, 0.08, 0.08);
    for (let i = 0; i < 10; i++) {
      addPart(root, M.ironGreen, side * (5.1 + i * 0.58), 1.80, gateZ, 0.045, 0.96, 0.045);
    }
  }

  // Smooth extruded colonial semicircular stone archway spanning above the 3-lane road (y = 4.65 .. 6.55)
  const archShape = new T.Shape();
  archShape.absarc(0, 0, 4.75, 0, Math.PI, false);
  archShape.lineTo(-3.90, 0);
  archShape.absarc(0, 0, 3.90, Math.PI, 0, true);
  archShape.closePath();
  const archGeo = new T.ExtrudeGeometry(archShape, { depth: 1.02, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.05, bevelSegments: 2, curveSegments: 24 });
  const archMesh = new T.Mesh(archGeo, M.stuccoCream);
  archMesh.position.set(0, 4.45, gateZ - 0.51);
  archMesh.scale.set(1, 0.44, 1);
  root.add(archMesh);
  // Decorative cornice trim band + center pediment & engraved golden crest medallion
  addPart(root, M.stuccoCream, 0, 6.42, gateZ, 2.55, 1.02, 1.14);
  addPart(root, M.terracotta, 0, 7.02, gateZ, 2.95, 0.22, 1.30);
  const crestTex = makeCanvasTex(128, 128, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const g = ctx.createRadialGradient(64, 64, 8, 64, 64, 58);
    g.addColorStop(0, '#fff3b0'); g.addColorStop(0.55, '#eab308'); g.addColorStop(1, '#92400e');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(64, 64, 58, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fef08a'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(64, 64, 50, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#14332d'; ctx.beginPath(); ctx.arc(64, 64, 36, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fde047'; ctx.font = '900 22px Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText('LMSK', 64, 71);
  }, { repeat: [1, 1] });
  const crestMat = crestTex ? new T.MeshStandardMaterial({ map: crestTex, roughness: 0.34, metalness: 0.55 }) : M.goldCrest;
  const crest = addPart(root, crestMat, 0, 6.45, gateZ + 0.59, 0.82, 0.82, 0.06);
  crest.receiveShadow = false;
  // Crisp engraved school gateway banner cleanly mounted across the arch frieze
  addHeritageSign(root, 'LMSK HIGHER SECONDARY SCHOOL', 0, 5.18, gateZ + 0.58, 7.5, 0.92, 0);

  // 2. Flanking Terracotta-Roofed Heritage Entrance Veranda Wings (z = -15 .. -35)
  for (const side of [-1, 1]) {
    const wing = new T.Group();
    wing.position.set(0, 0, -23.5);
    buildHeritageVerandaBlock(wing, side, side === -1 ? 'SCHOOL OFFICE' : 'PRINCIPAL WING', 2, side === -1 ? 0 : 1);
    root.add(wing);
  }

  // 3. Live Swaying 3D Coconut Palms, Lush Neem Trees & Vibrant Pink Blossom Trees framing the entrance!
  for (const side of [-1, 1]) {
    addUltraPalmTree(root, side * 6.9, gateZ + 2.5, 9.2, -side, side * 1.4);
    addUltraPalmTree(root, side * 11.8, gateZ - 4.0, 10.2, -side, side * 3.2);
    if (side === -1) addUltraPinkTree(root, side * 7.2, gateZ - 31.5, 6.4, side * 4.8);
    else addUltraShadeTree(root, side * 7.4, gateZ - 31.5, 7.2, side * 4.8);
    addUltraPalmTree(root, side * 14.5, gateZ - 26.0, 9.8, -side, side * 6.1);
  }

  return bakeUltraGroup(root);
}
