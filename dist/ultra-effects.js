// ULTRA-only realistic 3D physics VFX engine (Phase A)
// 100% object-pooled (zero per-frame geometry/material allocations) for locked 60 FPS on flagship mobile GPUs.
// Strictly inactive on AUTO, LOW, MED, and HIGH graphics tiers.

import * as T from './vendor/three.module.js';
import { height, finalRunGateFor } from './engine.js';
import { curveRelX, curveRelY } from './street-materials.js?v=3.10.22';
import { campusAnchor, CAMPUS_SLOTS, curveSlopeAt } from './campus-layout.js';
import { branchForkClearance, forkPlanAt } from './road-events.js';

function createSoftPuffTexture() {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext('2d');
  if (!ctx) return null;
  const g = ctx.createRadialGradient(32, 32, 3, 32, 32, 30);
  g.addColorStop(0, 'rgba(255,255,255,0.92)');
  g.addColorStop(0.45, 'rgba(255,255,255,0.45)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new T.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

function createHaloTexture(innerRGBA, midRGBA) {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 96;
  c.height = 96;
  const ctx = c.getContext('2d');
  if (!ctx) return null;
  const g = ctx.createRadialGradient(48, 48, 2, 48, 48, 46);
  g.addColorStop(0, innerRGBA);
  g.addColorStop(0.32, midRGBA);
  g.addColorStop(1, 'rgba(255, 220, 140, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 96, 96);
  const tex = new T.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

function createSunRayTexture() {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 256;
  const ctx = c.getContext('2d');
  if (!ctx) return null;
  const vGrad = ctx.createLinearGradient(0, 0, 0, 256);
  vGrad.addColorStop(0, 'rgba(255, 232, 168, 0)');
  vGrad.addColorStop(0.24, 'rgba(255, 226, 152, 0.28)');
  vGrad.addColorStop(0.55, 'rgba(255, 214, 128, 0.16)');
  vGrad.addColorStop(1, 'rgba(255, 214, 128, 0)');
  ctx.fillStyle = vGrad;
  ctx.fillRect(0, 0, 128, 256);
  ctx.globalCompositeOperation = 'destination-in';
  const hGrad = ctx.createLinearGradient(0, 0, 128, 0);
  hGrad.addColorStop(0, 'rgba(255,255,255,0)');
  hGrad.addColorStop(0.32, 'rgba(255,255,255,0.85)');
  hGrad.addColorStop(0.5, 'rgba(255,255,255,1)');
  hGrad.addColorStop(0.68, 'rgba(255,255,255,0.85)');
  hGrad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = hGrad;
  ctx.fillRect(0, 0, 128, 256);
  const tex = new T.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

function createLampConeTexture() {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 96;
  c.height = 192;
  const ctx = c.getContext('2d');
  if (!ctx) return null;
  const g = ctx.createLinearGradient(0, 0, 0, 192);
  g.addColorStop(0, 'rgba(255, 214, 130, 0.48)');
  g.addColorStop(0.38, 'rgba(255, 184, 88, 0.18)');
  g.addColorStop(1, 'rgba(255, 160, 64, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(40, 0);
  ctx.lineTo(56, 0);
  ctx.lineTo(94, 192);
  ctx.lineTo(2, 192);
  ctx.closePath();
  ctx.fill();
  const tex = new T.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

function createContactShadowTexture() {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 96;
  c.height = 96;
  const ctx = c.getContext('2d');
  if (!ctx) return null;
  const g = ctx.createRadialGradient(48, 48, 4, 48, 48, 44);
  g.addColorStop(0, 'rgba(4, 10, 22, 0.72)');
  g.addColorStop(0.42, 'rgba(4, 10, 22, 0.36)');
  g.addColorStop(0.78, 'rgba(4, 10, 22, 0.10)');
  g.addColorStop(1, 'rgba(4, 10, 22, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 96, 96);
  const tex = new T.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

export function createUltraEffects(scene) {
  const root = new T.Group();
  root.name = 'ultra-effects-root';
  root.visible = false;
  scene.add(root);

  const puffTex = createSoftPuffTexture();
  const shadowTex = createContactShadowTexture();

  // 1. Height-reactive realistic ground contact shadow under runner (adds crisp PUBG depth perception)
  const contactShadowMat = new T.MeshBasicMaterial({
    map: shadowTex,
    color: 0x050b16,
    transparent: true,
    opacity: 0.75,
    depthWrite: false
  });
  const contactShadow = new T.Mesh(new T.PlaneGeometry(1.18, 1.48), contactShadowMat);
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.visible = false;
  root.add(contactShadow);

  // 2. Pooled ground dust / rain-water splash puffs (38 sprites)
  const puffGeo = new T.PlaneGeometry(0.48, 0.48);
  const dustMat = new T.MeshBasicMaterial({
    map: puffTex,
    color: 0xd6cfc2,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    side: T.DoubleSide
  });
  const waterMat = new T.MeshBasicMaterial({
    map: puffTex,
    color: 0xd9f3ff,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
    side: T.DoubleSide
  });
  const puffs = [];
  let puffCursor = 0;
  for (let i = 0; i < 38; i++) {
    const m = new T.Mesh(puffGeo, dustMat.clone());
    m.visible = false;
    root.add(m);
    puffs.push({
      m,
      life: 0,
      maxLife: 0.4,
      vx: 0, vy: 0, vz: 0,
      baseScale: 0.6,
      grow: 1.8,
      baseOpacity: 0.5,
      gravity: 1.5
    });
  }

  // 3. Pooled 3D metallic sparks + debris chunks + shield glass shards (44 pieces)
  const debrisGeo = new T.BoxGeometry(0.18, 0.14, 0.22);
  const sparkGeo = new T.BoxGeometry(0.055, 0.055, 0.28);
  const debrisMats = [
    new T.MeshStandardMaterial({ color: 0x334155, roughness: 0.55, metalness: 0.45 }),
    new T.MeshStandardMaterial({ color: 0x64748b, roughness: 0.48, metalness: 0.55 }),
    new T.MeshBasicMaterial({ color: 0xffb703 }), // hot welding spark gold
    new T.MeshBasicMaterial({ color: 0x38bdf8 }), // electric blue nitro/shield spark
    new T.MeshBasicMaterial({ color: 0xff3b30 })  // crimson 4/5 danger & overload spark
  ];
  const shards = [];
  let shardCursor = 0;
  for (let i = 0; i < 44; i++) {
    const isSpark = i >= 18;
    const m = new T.Mesh(isSpark ? sparkGeo : debrisGeo, debrisMats[isSpark ? 2 : (i % 2)]);
    m.visible = false;
    root.add(m);
    shards.push({
      m,
      isSpark,
      life: 0,
      maxLife: 0.6,
      vx: 0, vy: 0, vz: 0,
      rx: 0, ry: 0, rz: 0,
      gravity: 18,
      bounce: 0.34,
      baseScale: 1
    });
  }

  // 4. Pooled ground shockwave rings (4 expanding rings for landing, nitro smash, overload blast, shield shatter)
  const ringGeo = new T.RingGeometry(0.32, 0.52, 24);
  const rings = [];
  let ringCursor = 0;
  for (let i = 0; i < 4; i++) {
    const rm = new T.MeshBasicMaterial({
      color: 0xe2e8f0,
      transparent: true,
      opacity: 0.7,
      side: T.DoubleSide,
      depthWrite: false
    });
    const m = new T.Mesh(ringGeo, rm);
    m.rotation.x = -Math.PI / 2;
    m.visible = false;
    root.add(m);
    rings.push({ m, life: 0, maxLife: 0.38, maxScale: 4.5, baseOpacity: 0.75 });
  }

  // 5. Soft Additive Golden Coin Bloom Halos (30 pooled sprites across all maps in ULTRA!)
  const coinHaloTex = createHaloTexture('rgba(255, 240, 165, 0.72)', 'rgba(255, 196, 56, 0.28)');
  const coinHaloMat = new T.SpriteMaterial({
    map: coinHaloTex,
    color: 0xffd76a,
    transparent: true,
    opacity: 0.78,
    blending: T.AdditiveBlending,
    depthWrite: false,
    toneMapped: false
  });
  const coinHalos = [];
  for (let i = 0; i < 30; i++) {
    const sp = new T.Sprite(coinHaloMat);
    sp.scale.set(1.55, 1.55, 1);
    sp.visible = false;
    root.add(sp);
    coinHalos.push(sp);
  }

  // 6. School Golden-Hour Volumetric Sun-Shaft God-Rays & Floating Sun Dust Motes (Panel 1!)
  const schoolAtmosphere = new T.Group();
  schoolAtmosphere.visible = false;
  root.add(schoolAtmosphere);
  const sunRayTex = createSunRayTexture();
  const sunRayMat = new T.MeshBasicMaterial({
    map: sunRayTex,
    color: 0xffdf96,
    transparent: true,
    opacity: 0.24,
    blending: T.AdditiveBlending,
    side: T.DoubleSide,
    depthWrite: false,
    fog: true
  });
  const sunRayGeo = new T.PlaneGeometry(5.2, 22.0);
  const sunRays = [];
  const rayX = [4.8, 1.9, 5.4, 2.6];
  for (let i = 0; i < 4; i++) {
    const m = new T.Mesh(sunRayGeo, sunRayMat);
    m.rotation.z = -0.48;
    m.rotation.y = -0.14;
    m.position.set(rayX[i], 10.6, -14 - i * 34);
    schoolAtmosphere.add(m);
    sunRays.push({ m, baseX: rayX[i], offset: i * 34 });
  }
  const pollenMat = new T.SpriteMaterial({
    map: coinHaloTex,
    color: 0xfff0b8,
    transparent: true,
    opacity: 0.58,
    blending: T.AdditiveBlending,
    depthWrite: false
  });
  const pollen = [];
  for (let i = 0; i < 20; i++) {
    const sp = new T.Sprite(pollenMat);
    const sz = 0.14 + (i % 4) * 0.05;
    sp.scale.set(sz, sz, 1);
    schoolAtmosphere.add(sp);
    pollen.push({ sp, seed: i * 1.73, x: ((i * 7.3) % 10) - 5, y: 0.9 + (i % 6) * 0.85, z: -4 - (i * 2.8) });
  }

  // 7. College Rainy Campus Glowing Amber Streetlamp Halos, Volumetric Light Cones & Misty Heritage Clocktower (Panel 2!)
  const collegeAtmosphere = new T.Group();
  collegeAtmosphere.visible = false;
  root.add(collegeAtmosphere);
  const lampHaloTex = createHaloTexture('rgba(255, 224, 148, 0.95)', 'rgba(255, 166, 62, 0.36)');
  const lampHaloMat = new T.SpriteMaterial({
    map: lampHaloTex,
    color: 0xffc66e,
    transparent: true,
    opacity: 0.92,
    blending: T.AdditiveBlending,
    depthWrite: false,
    toneMapped: false
  });
  const lampConeTex = createLampConeTexture();
  const lampConeMat = new T.MeshBasicMaterial({
    map: lampConeTex,
    color: 0xffc168,
    transparent: true,
    opacity: 0.52,
    blending: T.AdditiveBlending,
    side: T.DoubleSide,
    depthWrite: false
  });
  const lampConeGeo = new T.PlaneGeometry(3.4, 5.3);
  const collegeLamps = [];
  for (let i = 0; i < 24; i++) {
    const sp = new T.Sprite(lampHaloMat);
    sp.scale.set(3.2, 3.2, 1);
    sp.visible = false;
    collegeAtmosphere.add(sp);
    const cone = new T.Mesh(lampConeGeo, lampConeMat);
    cone.visible = false;
    collegeAtmosphere.add(cone);
    collegeLamps.push({ sp, cone });
  }
  // Pooled Rainy Headlight Beam Cones & Crimson Taillight Glow Halos for oncoming College cars/scooties & parked vans!
  const headBeamTex = createLampConeTexture();
  const headBeamMat = new T.MeshBasicMaterial({
    map: headBeamTex,
    color: 0xeaf4ff,
    transparent: true,
    opacity: 0.44,
    blending: T.AdditiveBlending,
    side: T.DoubleSide,
    depthWrite: false
  });
  const headBeamGeo = new T.PlaneGeometry(1.75, 4.8);
  headBeamGeo.rotateX(-Math.PI * 0.5);
  const redHaloTex = createHaloTexture('rgba(255, 76, 76, 0.92)', 'rgba(255, 28, 28, 0.34)');
  const redHaloMat = new T.SpriteMaterial({
    map: redHaloTex,
    color: 0xff3b3b,
    transparent: true,
    opacity: 0.82,
    blending: T.AdditiveBlending,
    depthWrite: false,
    toneMapped: false
  });
  const vehicleLights = [];
  for (let i = 0; i < 12; i++) {
    const beam = new T.Mesh(headBeamGeo, headBeamMat);
    beam.visible = false;
    collegeAtmosphere.add(beam);
    const haloL = new T.Sprite(redHaloMat);
    haloL.scale.set(1.15, 1.15, 1);
    haloL.visible = false;
    collegeAtmosphere.add(haloL);
    const haloR = new T.Sprite(redHaloMat);
    haloR.scale.set(1.15, 1.15, 1);
    haloR.visible = false;
    collegeAtmosphere.add(haloR);
    vehicleLights.push({ beam, haloL, haloR });
  }
  // Distant rock-steady misty Kodaikanal rolling hill horizon for College (never slides left/right, 100% cohesive with 3D campus!)
  const clocktower = new T.Group();
  function buildHillRidge(width, maxH, depthZ, color, seed) {
    const segs = 36;
    const shape = new T.Shape();
    shape.moveTo(-width * 0.5, -18);
    for (let i = 0; i <= segs; i++) {
      const u = i / segs;
      const x = (u - 0.5) * width;
      const ridge = Math.sin(u * Math.PI) * (
        0.52 +
        0.24 * Math.sin(u * 9.5 + seed) +
        0.14 * Math.cos(u * 18.0 + seed * 1.7) +
        0.10 * Math.sin(u * 31.0 + seed * 2.3)
      );
      shape.lineTo(x, ridge * maxH);
    }
    shape.lineTo(width * 0.5, -18);
    shape.closePath();
    const m = new T.Mesh(
      new T.ShapeGeometry(shape),
      new T.MeshBasicMaterial({ color, fog: true, depthWrite: true })
    );
    m.position.set(0, -4, depthZ);
    return m;
  }
  const hillBack = buildHillRidge(420, 44, -228, 0x627a8c, 1.2);
  const hillMid = buildHillRidge(360, 29, -196, 0x4b6968, 3.8);
  const hillNear = buildHillRidge(300, 17, -168, 0x3b594d, 6.4);
  clocktower.add(hillBack, hillMid, hillNear);
  clocktower.position.set(0, 0, 0);
  collegeAtmosphere.add(clocktower);

  // 8. Step 3 — IT Park Boulevard Curb Bollards & Fork Arrows (Panel 3), Rock-Cut Metro Tunnel Sconce Cones & Red Conduits (Panel 4), Stormy Sky Bridge Bollards & Forked Lightning (Panel 5)!
  const itParkAtmosphere = new T.Group();
  itParkAtmosphere.visible = false;
  root.add(itParkAtmosphere);

  // 8a. Warm Architectural Sidewalk Curb Bollards (18 pooled pedestals + glowing warm amber LED caps + halos)
  const bollardBodyMat = new T.MeshStandardMaterial({ color: 0x262d38, roughness: 0.42, metalness: 0.65 });
  const bollardGlowMat = new T.MeshBasicMaterial({ color: 0xffe4a8 });
  const bollardGeo = new T.BoxGeometry(0.22, 0.86, 0.22);
  const bollardLedGeo = new T.BoxGeometry(0.18, 0.34, 0.18);
  const itBollards = [];
  for (let i = 0; i < 18; i++) {
    const grp = new T.Group();
    const base = new T.Mesh(bollardGeo, bollardBodyMat);
    base.position.y = 0.43;
    const led = new T.Mesh(bollardLedGeo, bollardGlowMat);
    led.position.y = 0.64;
    const halo = new T.Sprite(lampHaloMat);
    halo.position.y = 0.66;
    halo.scale.set(1.65, 1.65, 1);
    grp.add(base, led, halo);
    grp.visible = false;
    itParkAtmosphere.add(grp);
    itBollards.push(grp);
  }

  // 8b. Crisp White Painted Fork Directional Road Arrows (↖ Left Sky Bridge | ↗ Right Metro Tunnel — Panel 3!)
  function makeForkArrowTex(dirSign) {
    if (typeof document === 'undefined') return null;
    const c = document.createElement('canvas'); c.width = 128; c.height = 192;
    const ctx = c.getContext('2d');
    if (!ctx) return null;
    ctx.clearRect(0, 0, 128, 192);
    ctx.save();
    ctx.translate(64, 96);
    ctx.rotate(dirSign * 0.42);
    ctx.fillStyle = 'rgba(248, 250, 252, 0.92)';
    ctx.fillRect(-10, -10, 20, 74);
    ctx.beginPath();
    ctx.moveTo(0, -68); ctx.lineTo(34, -10); ctx.lineTo(-34, -10);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    const tex = new T.CanvasTexture(c);
    tex.colorSpace = T.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }
  const arrowGeo = new T.PlaneGeometry(1.45, 2.35);
  arrowGeo.rotateX(-Math.PI * 0.5);
  const forkArrowL = new T.Mesh(arrowGeo, new T.MeshBasicMaterial({ map: makeForkArrowTex(-1), transparent: true, opacity: 0.92, depthWrite: false }));
  const forkArrowR = new T.Mesh(arrowGeo, new T.MeshBasicMaterial({ map: makeForkArrowTex(1), transparent: true, opacity: 0.92, depthWrite: false }));
  forkArrowL.visible = forkArrowR.visible = false;
  itParkAtmosphere.add(forkArrowL, forkArrowR);

  // 8c. Metro Tunnel Warm Amber Wall Sconce Halos, Downward Volumetric Cones & Industrial Red Utility Conduits (Panel 4!)
  const tunnelSconceMat = new T.MeshBasicMaterial({
    map: lampConeTex,
    color: 0xffad42,
    transparent: true,
    opacity: 0.50,
    blending: T.AdditiveBlending,
    side: T.DoubleSide,
    depthWrite: false
  });
  const tunnelSconces = [];
  for (let i = 0; i < 18; i++) {
    const sp = new T.Sprite(lampHaloMat);
    sp.scale.set(2.85, 2.85, 1);
    sp.visible = false;
    itParkAtmosphere.add(sp);
    const cone = new T.Mesh(lampConeGeo, tunnelSconceMat);
    cone.scale.set(0.88, 0.86, 1);
    cone.visible = false;
    itParkAtmosphere.add(cone);
    tunnelSconces.push({ sp, cone });
  }
  // 3 Parallel Industrial Crimson-Red Utility Conduit Pipes running along the left sculpted Metro Tunnel rock wall (Panel 4!)
  const redPipeMat = new T.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.36, metalness: 0.52, emissive: 0x3f0a0a, emissiveIntensity: 0.25 });
  const pipeGeo = new T.CylinderGeometry(0.068, 0.068, 16.4, 8);
  pipeGeo.rotateX(Math.PI * 0.5);
  const tunnelPipes = [];
  for (let i = 0; i < 10; i++) {
    const seg = new T.Group();
    for (const py of [1.45, 1.82, 2.19]) {
      const p = new T.Mesh(pipeGeo, redPipeMat);
      p.position.set(-3.92, py, 0);
      seg.add(p);
    }
    seg.visible = false;
    itParkAtmosphere.add(seg);
    tunnelPipes.push(seg);
  }

  // 8d. Photorealistic Rainy Night Sky Bridge (Recessed Warm White-Gold Curb LED Strips, Vertical Bollard Panels,
  //     Tall Curved Dark-Steel Streetlamps, Distant Illuminated Waterfront City Skyline + Domed Landmark, Angled Storm Rain & Forked Lightning!)
  const bridgeGlowTex = createHaloTexture('rgba(255, 240, 198, 0.96)', 'rgba(255, 184, 72, 0.34)');
  const bridgeBollardMat = new T.SpriteMaterial({
    map: bridgeGlowTex,
    color: 0xffefc6,
    transparent: true,
    opacity: 0.90,
    blending: T.AdditiveBlending,
    depthWrite: false,
    toneMapped: false
  });
  const bridgeCurbLedMat = new T.MeshBasicMaterial({ color: 0xfff3d1, toneMapped: false });
  const bridgeCurbLedGeo = new T.BoxGeometry(0.14, 0.09, 5.4);
  const bridgeCurbLeds = [];
  for (let i = 0; i < 32; i++) {
    const bar = new T.Mesh(bridgeCurbLedGeo, bridgeCurbLedMat);
    bar.visible = false;
    itParkAtmosphere.add(bar);
    bridgeCurbLeds.push(bar);
  }
  const bridgeVPanelGeo = new T.BoxGeometry(0.14, 0.68, 0.14);
  const bridgeVPanelMat = new T.MeshBasicMaterial({ color: 0xffefc4, toneMapped: false });
  const bridgeBollards = [];
  for (let i = 0; i < 20; i++) {
    const grp = new T.Group();
    const panel = new T.Mesh(bridgeVPanelGeo, bridgeVPanelMat);
    panel.position.y = 0.44;
    const sp = new T.Sprite(bridgeBollardMat);
    sp.position.y = 0.52;
    sp.scale.set(1.55, 1.55, 1);
    grp.add(panel, sp);
    grp.visible = false;
    itParkAtmosphere.add(grp);
    bridgeBollards.push(grp);
  }

  // Tall Sleek Curved Dark-Steel Highway Bridge Streetlamps (warm golden-amber heads + halos + soft downward rain cones)
  const bridgePoleMat = new T.MeshStandardMaterial({ color: 0x161d29, roughness: 0.32, metalness: 0.78 });
  const bridgeLampHeadMat = new T.MeshBasicMaterial({ color: 0xffe29e, toneMapped: false });
  const bridgeLampConeMat = new T.MeshBasicMaterial({
    map: lampConeTex,
    color: 0xffbe62,
    transparent: true,
    opacity: 0.24,
    blending: T.AdditiveBlending,
    side: T.DoubleSide,
    depthWrite: false
  });
  const bridgePoleGeo = new T.CylinderGeometry(0.065, 0.095, 6.4, 8);
  const bridgeArmGeo = new T.BoxGeometry(1.18, 0.09, 0.09);
  const bridgeHeadGeo = new T.BoxGeometry(0.46, 0.10, 0.24);
  const bridgeLamps = [];
  for (let i = 0; i < 12; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const grp = new T.Group();
    const pole = new T.Mesh(bridgePoleGeo, bridgePoleMat);
    pole.position.y = 3.2;
    const arm = new T.Mesh(bridgeArmGeo, bridgePoleMat);
    arm.position.set(-side * 0.54, 6.38, 0);
    arm.rotation.z = side * 0.14;
    const head = new T.Mesh(bridgeHeadGeo, bridgeLampHeadMat);
    head.position.set(-side * 1.02, 6.28, 0);
    const halo = new T.Sprite(lampHaloMat);
    halo.position.set(-side * 1.02, 6.24, 0);
    halo.scale.set(3.2, 3.2, 1);
    const cone = new T.Mesh(lampConeGeo, bridgeLampConeMat);
    cone.position.set(-side * 1.02, 3.35, 0);
    cone.scale.set(1.25, 1.18, 1);
    grp.add(pole, arm, head, halo, cone);
    grp.visible = false;
    itParkAtmosphere.add(grp);
    bridgeLamps.push({ grp, side });
  }

  // Distant Illuminated Waterfront Night City Skyline + Warm Domed Landmark + Rippled Ocean Reflections!
  function makeNightSkylineTex(hasDomeLandmark) {
    if (typeof document === 'undefined') return null;
    const W = 1024, H = 256;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const ctx = c.getContext('2d');
    if (!ctx) return null;
    ctx.clearRect(0, 0, W, H);
    const horY = Math.round(H * 0.56);
    // Subtle dark horizon sky glow behind towers
    const glow = ctx.createLinearGradient(0, horY - 70, 0, horY);
    glow.addColorStop(0, 'rgba(20, 32, 52, 0)');
    glow.addColorStop(1, 'rgba(34, 48, 72, 0.55)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, horY - 70, W, 70);

    // Deterministic skyscraper silhouettes + crisp lit windows
    let seed = hasDomeLandmark ? 17 : 73;
    const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    const winColors = ['#ffe5a3', '#fff7e0', '#ffd074', '#cfe9ff', '#ffba52'];
    for (let x = 8; x < W - 16;) {
      const bw = 16 + Math.floor(rnd() * 30);
      const bh = 22 + Math.floor(rnd() * 88);
      ctx.fillStyle = rnd() > 0.4 ? '#0a101c' : '#101828';
      ctx.fillRect(x, horY - bh, bw, bh);
      // Rooftop antenna / spire on tall towers
      if (bh > 74 && rnd() > 0.5) {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(x + bw * 0.5 - 1, horY - bh - 14, 2, 14);
        ctx.fillStyle = '#ff5a5f';
        ctx.fillRect(x + bw * 0.5 - 1.5, horY - bh - 15, 3, 3);
      }
      // Lit windows
      for (let wy = horY - bh + 5; wy < horY - 6; wy += 6) {
        for (let wx = x + 3; wx < x + bw - 4; wx += 5) {
          if (rnd() > 0.58) {
            ctx.fillStyle = winColors[Math.floor(rnd() * winColors.length)];
            ctx.globalAlpha = 0.45 + rnd() * 0.5;
            ctx.fillRect(wx, wy, 2.5, 3);
          }
        }
      }
      ctx.globalAlpha = 1;
      x += bw + 2 + Math.floor(rnd() * 8);
    }

    // Iconic warm golden-lit domed waterfront building on the right shore!
    if (hasDomeLandmark) {
      const dx = Math.round(W * 0.62);
      const dg = ctx.createRadialGradient(dx, horY - 18, 6, dx, horY - 18, 74);
      dg.addColorStop(0, 'rgba(255, 210, 120, 0.72)');
      dg.addColorStop(0.5, 'rgba(255, 174, 72, 0.28)');
      dg.addColorStop(1, 'rgba(255, 160, 60, 0)');
      ctx.fillStyle = dg;
      ctx.fillRect(dx - 80, horY - 76, 160, 76);
      // Classical dome + illuminated colonnade facade
      ctx.fillStyle = '#f5d292';
      ctx.beginPath();
      ctx.arc(dx, horY - 22, 24, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = '#ffd98e';
      ctx.fillRect(dx - 54, horY - 22, 108, 22);
      ctx.fillStyle = '#5c3c18';
      for (let ax = dx - 46; ax <= dx + 42; ax += 10) {
        ctx.fillRect(ax, horY - 16, 4, 14);
      }
    }

    // Warm waterfront promenade streetlights along shoreline
    for (let lx = 18; lx < W - 18; lx += 38) {
      const lg = ctx.createRadialGradient(lx, horY - 2, 1, lx, horY - 2, 12);
      lg.addColorStop(0, 'rgba(255, 232, 170, 0.95)');
      lg.addColorStop(0.45, 'rgba(255, 190, 92, 0.35)');
      lg.addColorStop(1, 'rgba(255, 175, 70, 0)');
      ctx.fillStyle = lg;
      ctx.fillRect(lx - 12, horY - 14, 24, 24);
    }

    // Soft rippled golden & silver water-reflection streaks beneath the shoreline
    for (let ry = horY + 2; ry < H - 4; ry += 3) {
      const depth = (ry - horY) / (H - horY);
      const alpha = (1 - depth) * 0.42;
      for (let rx = 12; rx < W - 12; rx += 22) {
        const w = 8 + rnd() * 24;
        const warm = hasDomeLandmark && Math.abs(rx - W * 0.62) < 95;
        ctx.fillStyle = warm
          ? `rgba(255, 206, 118, ${(alpha * 1.45).toFixed(3)})`
          : (rnd() > 0.3 ? `rgba(255, 200, 116, ${alpha.toFixed(3)})` : `rgba(176, 214, 255, ${(alpha * 0.72).toFixed(3)})`);
        ctx.fillRect(rx + (rnd() - 0.5) * 10, ry, w, 1.8);
      }
    }

    const tex = new T.CanvasTexture(c);
    tex.colorSpace = T.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }
  const skylineGeo = new T.PlaneGeometry(290, 62);
  const bridgeCityL = new T.Mesh(skylineGeo, new T.MeshBasicMaterial({
    map: makeNightSkylineTex(false), transparent: true, opacity: 0.92, fog: false, depthWrite: false, side: T.DoubleSide
  }));
  const bridgeCityR = new T.Mesh(skylineGeo, new T.MeshBasicMaterial({
    map: makeNightSkylineTex(true), transparent: true, opacity: 0.94, fog: false, depthWrite: false, side: T.DoubleSide
  }));
  bridgeCityL.visible = bridgeCityR.visible = false;
  itParkAtmosphere.add(bridgeCityL, bridgeCityR);

  // Subtle Atmospheric Misty Storm Rain Curtain for ULTRA Rainy-Night Sky Bridge (delicate, soft translucent streaks — no harsh white wireframe sticks!)
  const BRIDGE_RAIN_COUNT = 150;
  const bridgeRainPos = new Float32Array(BRIDGE_RAIN_COUNT * 6);
  const bridgeRainGeo = new T.BufferGeometry();
  bridgeRainGeo.setAttribute('position', new T.BufferAttribute(bridgeRainPos, 3));
  const bridgeRainMat = new T.LineBasicMaterial({ color: 0x8eaad0, transparent: true, opacity: 0.16, depthWrite: false });
  const bridgeRain = new T.LineSegments(bridgeRainGeo, bridgeRainMat);
  bridgeRain.frustumCulled = false;
  bridgeRain.visible = false;
  itParkAtmosphere.add(bridgeRain);
  // Procedural Forked Electric Storm Lightning Bolt Texture (Panel 5 upper-left sky!)
  function makeForkedBoltTex() {
    if (typeof document === 'undefined') return null;
    const c = document.createElement('canvas'); c.width = 256; c.height = 512;
    const ctx = c.getContext('2d');
    if (!ctx) return null;
    ctx.clearRect(0, 0, 256, 512);
    const pts = [[142, 0], [126, 62], [150, 128], [116, 198], [140, 272], [104, 355], [122, 438], [94, 512]];
    const drawPath = (arr, w, col, blur) => {
      ctx.save();
      ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.shadowColor = '#60a5fa'; ctx.shadowBlur = blur;
      ctx.beginPath();
      arr.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
      ctx.stroke();
      ctx.restore();
    };
    const branch1 = [[150, 128], [188, 178], [176, 224], [212, 276]];
    const branch2 = [[116, 198], [72, 252], [84, 304], [48, 352]];
    const branch3 = [[140, 272], [178, 326], [166, 378]];
    drawPath(pts, 10, 'rgba(147, 197, 253, 0.55)', 22);
    drawPath(pts, 4.5, '#e0f2fe', 10);
    drawPath(pts, 2.2, '#ffffff', 4);
    for (const br of [branch1, branch2, branch3]) {
      drawPath(br, 5, 'rgba(147, 197, 253, 0.45)', 14);
      drawPath(br, 2.2, '#f0f9ff', 6);
    }
    const tex = new T.CanvasTexture(c);
    tex.needsUpdate = true;
    return tex;
  }
  const ultraLightningMat = new T.MeshBasicMaterial({
    map: makeForkedBoltTex(),
    color: 0xdbeafe,
    transparent: true,
    opacity: 0.95,
    blending: T.AdditiveBlending,
    side: T.DoubleSide,
    depthWrite: false,
    fog: false
  });
  const ultraLightning = new T.Mesh(new T.PlaneGeometry(34, 68), ultraLightningMat);
  ultraLightning.visible = false;
  itParkAtmosphere.add(ultraLightning);

  // 9. Step 4 — The Final Run (Fiery Sunset Day & Luminous Moonlit Night Village Atmosphere!)
  const finalRunAtmosphere = new T.Group();
  finalRunAtmosphere.visible = false;
  root.add(finalRunAtmosphere);

  // 9a. Luminous Full Moon Halo & Fiery Sunset Horizon Glow (subtle atmospheric backdrop)
  const moonHaloTex = createHaloTexture('rgba(235, 246, 255, 0.92)', 'rgba(130, 180, 255, 0.28)');
  const moonHaloMat = new T.SpriteMaterial({
    map: moonHaloTex,
    color: 0xdcecff,
    transparent: true,
    opacity: 0.78,
    blending: T.AdditiveBlending,
    depthWrite: false,
    fog: false
  });
  const moonHalo = new T.Sprite(moonHaloMat);
  moonHalo.scale.set(44, 44, 1);
  moonHalo.visible = false;
  finalRunAtmosphere.add(moonHalo);

  const sunsetHaloTex = createHaloTexture('rgba(255, 198, 112, 0.85)', 'rgba(255, 110, 42, 0.22)');
  const sunsetHaloMat = new T.SpriteMaterial({
    map: sunsetHaloTex,
    color: 0xffb366,
    transparent: true,
    opacity: 0.68,
    blending: T.AdditiveBlending,
    depthWrite: false,
    fog: false
  });
  const sunsetHalo = new T.Sprite(sunsetHaloMat);
  sunsetHalo.scale.set(82, 54, 1);
  sunsetHalo.visible = false;
  finalRunAtmosphere.add(sunsetHalo);

  // 9b. Warm Glowing Village Cottage Porch / Window Lanterns (10 pooled amber glow sprites along left village houses!)
  const cottageGlowTex = createHaloTexture('rgba(255, 224, 152, 0.96)', 'rgba(255, 146, 48, 0.34)');
  const cottageGlowMat = new T.SpriteMaterial({
    map: cottageGlowTex,
    color: 0xffcc70,
    transparent: true,
    opacity: 0.85,
    blending: T.AdditiveBlending,
    depthWrite: false,
    toneMapped: false
  });
  const villageLanterns = [];
  for (let i = 0; i < 10; i++) {
    const sp = new T.Sprite(cottageGlowMat);
    sp.scale.set(3.8, 3.8, 1);
    sp.visible = false;
    finalRunAtmosphere.add(sp);
    villageLanterns.push(sp);
  }

  // 9c. Drifting Golden Sunset Motes (Day) / Glowing Village Fireflies (Night) — 36 pooled soft particles!
  const fireflyGeo = new T.BufferGeometry();
  const FIREFLY_COUNT = 36;
  const fireflyPos = new Float32Array(FIREFLY_COUNT * 3);
  fireflyGeo.setAttribute('position', new T.BufferAttribute(fireflyPos, 3));
  const fireflyMat = new T.PointsMaterial({
    map: createHaloTexture('rgba(255, 245, 195, 1)', 'rgba(255, 200, 80, 0.32)'),
    color: 0xffe484,
    size: 0.52,
    transparent: true,
    opacity: 0.72,
    blending: T.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true
  });
  const villageFireflies = new T.Points(fireflyGeo, fireflyMat);
  villageFireflies.frustumCulled = false;
  villageFireflies.visible = false;
  finalRunAtmosphere.add(villageFireflies);

  // 9d. Night Bus / Traffic Headlight Cones & Crimson Taillight Halos on Final Run Night!
  const finalVehicleLights = [];
  for (let i = 0; i < 6; i++) {
    const beam = new T.Mesh(headBeamGeo, headBeamMat);
    beam.visible = false;
    finalRunAtmosphere.add(beam);
    const haloL = new T.Sprite(redHaloMat);
    haloL.scale.set(1.55, 1.55, 1);
    haloL.visible = false;
    finalRunAtmosphere.add(haloL);
    const haloR = new T.Sprite(redHaloMat);
    haloR.scale.set(1.55, 1.55, 1);
    haloR.visible = false;
    finalRunAtmosphere.add(haloR);
    finalVehicleLights.push({ beam, haloL, haloR });
  }

  // 9e. Photorealistic Village Roadside Details (ULTRA Only): Weathered Stone Canal Retaining Wall (left bank),
  //     Rustic Wooden Farm Fence (right paddy verge), and Vintage Wooden Utility/Power Poles!
  const canalWallMat = new T.MeshStandardMaterial({ color: 0x7a7669, roughness: 0.92, metalness: 0.04 });
  const canalWallGeo = new T.BoxGeometry(0.45, 0.72, 16.2);
  const villageCanalWalls = [];
  for (let i = 0; i < 10; i++) {
    const wall = new T.Mesh(canalWallGeo, canalWallMat);
    wall.visible = false;
    finalRunAtmosphere.add(wall);
    villageCanalWalls.push(wall);
  }

  const fenceWoodMat = new T.MeshStandardMaterial({ color: 0x7c5b3e, roughness: 0.88, metalness: 0.04 });
  const fencePostGeo = new T.BoxGeometry(0.11, 1.08, 0.11);
  const fenceRailGeo = new T.BoxGeometry(0.06, 0.09, 16.2);
  const villageFences = [];
  for (let i = 0; i < 10; i++) {
    const grp = new T.Group();
    for (const pz of [-6, -2, 2, 6]) {
      const post = new T.Mesh(fencePostGeo, fenceWoodMat);
      post.position.set(0, 0.54, pz);
      grp.add(post);
    }
    for (const ry of [0.42, 0.82]) {
      const rail = new T.Mesh(fenceRailGeo, fenceWoodMat);
      rail.position.set(0, ry, 0);
      grp.add(rail);
    }
    grp.visible = false;
    finalRunAtmosphere.add(grp);
    villageFences.push(grp);
  }

  const utilPoleMat = new T.MeshStandardMaterial({ color: 0x6b5c4d, roughness: 0.85, metalness: 0.08 });
  const utilPoleGeo = new T.CylinderGeometry(0.08, 0.12, 7.6, 8);
  const utilCrossGeo = new T.BoxGeometry(1.45, 0.10, 0.10);
  const villagePoles = [];
  for (let i = 0; i < 6; i++) {
    const grp = new T.Group();
    const pole = new T.Mesh(utilPoleGeo, utilPoleMat);
    pole.position.y = 3.8;
    const arm = new T.Mesh(utilCrossGeo, utilPoleMat);
    arm.position.set(0, 7.05, 0);
    grp.add(pole, arm);
    grp.visible = false;
    finalRunAtmosphere.add(grp);
    villagePoles.push(grp);
  }

  let enabled = false;
  let stepAccum = 0;
  let footSide = 1;
  let nitroSparkTimer = 0;
  let slideDustTimer = 0;
  let lastLandingSeq = 0;
  let handledOverload = false;
  let handledShieldBurst = false;
  let smashedSeen = new WeakSet();
  let lastRunSeed = -1;

  function spawnPuff(x, y, z, vx, vy, vz, { isWater = false, scale = 0.55, grow = 1.6, life = 0.38, opacity = 0.48, gravity = 1.2 } = {}) {
    const p = puffs[puffCursor];
    puffCursor = (puffCursor + 1) % puffs.length;
    p.life = p.maxLife = life;
    p.vx = vx; p.vy = vy; p.vz = vz;
    p.baseScale = scale;
    p.grow = grow;
    p.baseOpacity = opacity;
    p.gravity = gravity;
    p.m.material.color.setHex(isWater ? 0xd9f3ff : 0xcbc3b4);
    p.m.material.opacity = opacity;
    p.m.position.set(x, y, z);
    p.m.scale.setScalar(scale);
    p.m.visible = true;
  }

  function spawnShard(x, y, z, vx, vy, vz, { spark = false, matIdx = 0, scale = 1, life = 0.55, gravity = 17 } = {}) {
    const startIdx = spark ? 18 : 0;
    const span = spark ? (shards.length - 18) : 18;
    const idx = startIdx + (shardCursor % span);
    shardCursor++;
    const p = shards[idx];
    p.life = p.maxLife = life;
    p.vx = vx; p.vy = vy; p.vz = vz;
    p.rx = (Math.random() - 0.5) * 14;
    p.ry = (Math.random() - 0.5) * 14;
    p.rz = (Math.random() - 0.5) * 14;
    p.gravity = gravity;
    p.baseScale = scale;
    p.m.material = debrisMats[matIdx] || debrisMats[0];
    p.m.position.set(x, y, z);
    p.m.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
    p.m.scale.setScalar(scale);
    p.m.visible = true;
  }

  function spawnRing(x, y, z, { color = 0xe2e8f0, maxScale = 4.2, life = 0.34, opacity = 0.7 } = {}) {
    const r = rings[ringCursor];
    ringCursor = (ringCursor + 1) % rings.length;
    r.life = r.maxLife = life;
    r.maxScale = maxScale;
    r.baseOpacity = opacity;
    r.m.material.color.setHex(color);
    r.m.material.opacity = opacity;
    r.m.position.set(x, y, z);
    r.m.scale.setScalar(0.5);
    r.m.visible = true;
  }

  function emitLandingBurst(x, y, impact, isWet) {
    const count = Math.min(10, Math.max(4, Math.round(4 + impact * 14)));
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + Math.random() * 0.4;
      const spd = 1.4 + impact * 4.5 + Math.random() * 1.2;
      spawnPuff(
        x + Math.cos(a) * 0.22,
        y + 0.10,
        Math.sin(a) * 0.22,
        Math.cos(a) * spd,
        isWet ? (1.8 + impact * 3.8) : (0.55 + impact * 1.4),
        Math.sin(a) * spd + 1.8,
        {
          isWater: isWet,
          scale: isWet ? 0.34 : 0.52,
          grow: isWet ? 0.9 : 1.9,
          life: isWet ? 0.34 : 0.44,
          opacity: isWet ? 0.72 : 0.44,
          gravity: isWet ? 10.5 : 1.4
        }
      );
    }
    spawnRing(x, y + 0.08, 0, {
      color: isWet ? 0xbae6fd : 0xd6cfc2,
      maxScale: 2.2 + impact * 3.8,
      life: 0.30,
      opacity: isWet ? 0.58 : 0.42
    });
  }

  function emitSmashExplosion(x, y, z, isDangerOrOverload = false) {
    const debrisCount = isDangerOrOverload ? 14 : 9;
    const sparkCount = isDangerOrOverload ? 20 : 12;
    for (let i = 0; i < debrisCount; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = (isDangerOrOverload ? 5.5 : 3.8) + Math.random() * 5.2;
      spawnShard(
        x + (Math.random() - 0.5) * 0.7,
        y + 0.4 + Math.random() * 0.8,
        z + (Math.random() - 0.5) * 0.5,
        Math.cos(ang) * spd,
        3.5 + Math.random() * 6.2,
        Math.sin(ang) * spd + (isDangerOrOverload ? 4.5 : 3.2),
        { spark: false, matIdx: i % 2, scale: 0.8 + Math.random() * 1.1, life: 0.58 + Math.random() * 0.28, gravity: 19 }
      );
    }
    for (let i = 0; i < sparkCount; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = (isDangerOrOverload ? 7.0 : 5.0) + Math.random() * 6.5;
      const matIdx = isDangerOrOverload ? (i % 3 === 0 ? 2 : 4) : (i % 3 === 0 ? 3 : 2);
      spawnShard(
        x + (Math.random() - 0.5) * 0.4,
        y + 0.65 + Math.random() * 0.5,
        z,
        Math.cos(ang) * spd,
        2.6 + Math.random() * 5.8,
        Math.sin(ang) * spd + 2.5,
        { spark: true, matIdx, scale: 0.9 + Math.random() * 0.8, life: 0.36 + Math.random() * 0.24, gravity: 14 }
      );
    }
    spawnRing(x, y + 0.14, z, {
      color: isDangerOrOverload ? 0xff453a : 0x38bdf8,
      maxScale: isDangerOrOverload ? 7.2 : 5.0,
      life: isDangerOrOverload ? 0.44 : 0.32,
      opacity: isDangerOrOverload ? 0.85 : 0.68
    });
  }

  function emitShieldShatter(x, y) {
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 + Math.random() * 0.2;
      const spd = 4.2 + Math.random() * 4.5;
      spawnShard(
        x + Math.cos(a) * 0.45,
        y + 0.9 + (Math.random() - 0.5) * 0.6,
        Math.sin(a) * 0.45,
        Math.cos(a) * spd,
        2.2 + Math.random() * 3.8,
        Math.sin(a) * spd + 1.8,
        { spark: true, matIdx: 3, scale: 1.15, life: 0.46, gravity: 13 }
      );
    }
    spawnRing(x, y + 0.9, 0, { color: 0x38bdf8, maxScale: 4.6, life: 0.32, opacity: 0.75 });
  }

  function clearAll() {
    contactShadow.visible = false;
    schoolAtmosphere.visible = false;
    collegeAtmosphere.visible = false;
    itParkAtmosphere.visible = false;
    finalRunAtmosphere.visible = false;
    moonHalo.visible = false;
    sunsetHalo.visible = false;
    villageFireflies.visible = false;
    for (const sp of villageLanterns) sp.visible = false;
    for (const vl of finalVehicleLights) { vl.beam.visible = false; vl.haloL.visible = false; vl.haloR.visible = false; }
    for (const w of villageCanalWalls) w.visible = false;
    for (const f of villageFences) f.visible = false;
    for (const p of villagePoles) p.visible = false;
    for (const sp of coinHalos) sp.visible = false;
    for (const l of collegeLamps) { l.sp.visible = false; l.cone.visible = false; }
    for (const vl of vehicleLights) { vl.beam.visible = false; vl.haloL.visible = false; vl.haloR.visible = false; }
    for (const b of itBollards) b.visible = false;
    for (const ts of tunnelSconces) { ts.sp.visible = false; ts.cone.visible = false; }
    for (const tp of tunnelPipes) tp.visible = false;
    for (const bb of bridgeBollards) bb.visible = false;
    for (const bc of bridgeCurbLeds) bc.visible = false;
    for (const bl of bridgeLamps) bl.grp.visible = false;
    bridgeCityL.visible = bridgeCityR.visible = false;
    bridgeRain.visible = false;
    forkArrowL.visible = forkArrowR.visible = false;
    ultraLightning.visible = false;
    for (const p of puffs) { p.life = 0; p.m.visible = false; }
    for (const p of shards) { p.life = 0; p.m.visible = false; }
    for (const r of rings) { r.life = 0; r.m.visible = false; }
    stepAccum = 0;
    nitroSparkTimer = 0;
    slideDustTimer = 0;
    handledOverload = false;
    handledShieldBurst = false;
  }

  function setEnabled(flag) {
    const next = Boolean(flag);
    if (enabled === next) return;
    enabled = next;
    root.visible = enabled;
    if (!enabled) clearAll();
  }

  function update(s, dt, camera, runnerX, runnerH, landingSeq, landingImpact, weather) {
    if (!enabled) return;
    if (s.runSeed !== lastRunSeed || s.time === 0) {
      lastRunSeed = s.runSeed;
      smashedSeen = new WeakSet();
      lastLandingSeq = landingSeq || 0;
      handledOverload = false;
      handledShieldBurst = false;
      if (s.time === 0) clearAll();
    }

    const onPodium = s.mode === 'ready' || s.mode === 'select';
    const running = s.mode === 'running';
    const stepDt = Math.min(0.05, Math.max(0, dt || 0));
    const isWet = s.map === 'college' && (Boolean((weather?.rain || 0) > 0.08) || Boolean((weather?.wet ?? weather?.wetness ?? 0) > 0.15));

    // 1. Height-reactive realistic contact shadow under runner
    const floorY = s.floor || 0;
    const liftH = Math.max(0, runnerH - floorY);
    if (!onPodium && s.mode !== 'finished') {
      contactShadow.visible = true;
      const sScale = Math.max(0.36, 1.04 - liftH * 0.24);
      contactShadow.position.set(runnerX, floorY + 0.095, 0);
      contactShadow.scale.set(sScale, sScale * (s.slide ? 1.32 : 1.0), 1);
      contactShadowMat.opacity = Math.max(0.14, 0.72 - liftH * 0.24);
    } else {
      contactShadow.visible = false;
    }

    // 2. Landing impact dust/water burst synced to runner-model touchdown!
    if (running && landingSeq && landingSeq !== lastLandingSeq) {
      lastLandingSeq = landingSeq;
      emitLandingBurst(runnerX, floorY, landingImpact || 0.22, isWet);
    }

    // 3. Rhythmic footstep dust puffs (asphalt) / water splashes (College wet road)
    if (running && liftH < 0.08 && !s.slide && !s.roll) {
      const strideRate = Math.max(0.14, 0.30 - Math.min(0.16, ((s.speed || 28) - 24) / 360));
      stepAccum += stepDt;
      if (stepAccum >= strideRate) {
        stepAccum -= strideRate;
        footSide = -footSide;
        const fx = runnerX + footSide * 0.22;
        if (isWet) {
          for (let k = 0; k < 2; k++) {
            spawnPuff(fx, floorY + 0.10, 0.18, footSide * (0.6 + Math.random() * 0.9), 1.4 + Math.random() * 1.4, 3.8 + Math.random() * 2.0, {
              isWater: true, scale: 0.24, grow: 0.75, life: 0.28, opacity: 0.65, gravity: 11.5
            });
          }
        } else {
          spawnPuff(fx, floorY + 0.09, 0.22, footSide * (0.25 + Math.random() * 0.35), 0.45 + Math.random() * 0.35, 3.2 + Math.random() * 1.5, {
            isWater: false, scale: 0.38, grow: 1.5, life: 0.34, opacity: 0.36, gravity: 0.8
          });
        }
      }
    }

    // 4. Slide & Roll ground friction dust / water spray
    if (running && (s.slide > 0 || s.roll > 0) && liftH < 0.12) {
      slideDustTimer -= stepDt;
      if (slideDustTimer <= 0) {
        slideDustTimer = 0.045;
        const side = (Math.random() - 0.5) * 0.55;
        spawnPuff(runnerX + side, floorY + 0.10, 0.35, side * 1.8, isWet ? 1.8 : 0.75, 5.2, {
          isWater: isWet, scale: isWet ? 0.30 : 0.46, grow: 1.7, life: 0.32, opacity: isWet ? 0.70 : 0.45, gravity: isWet ? 10 : 1.2
        });
      }
    }

    // 5. Nitro heat sparks trail (electric blue-gold on hits 0-3, crimson danger on hit 4/5!)
    if (running && (s.nitro || 0) > 0) {
      nitroSparkTimer -= stepDt;
      if (nitroSparkTimer <= 0) {
        nitroSparkTimer = 0.032;
        const danger = (s.nitroHits || 0) >= 4;
        const side = (Math.random() - 0.5) * 0.65;
        spawnShard(
          runnerX + side,
          runnerH + 0.20 + Math.random() * 0.55,
          0.35,
          side * 2.2,
          1.2 + Math.random() * 2.2,
          7.5 + Math.random() * 3.5,
          { spark: true, matIdx: danger ? 4 : (Math.random() < 0.5 ? 2 : 3), scale: danger ? 1.15 : 0.85, life: 0.28, gravity: 7 }
        );
      }
    }

    // 6. Newly smashed obstacle explosions (hits 1-4)
    if (s.items && s.items.length) {
      for (const o of s.items) {
        if (o.smashed && !smashedSeen.has(o)) {
          smashedSeen.add(o);
          const relZ = o.z - s.distance;
          const cx = curveRelX(o.z, s);
          const cy = curveRelY(o.z, s);
          const ox = (o.lane || 0) * 2.2 + cx;
          emitSmashExplosion(ox, floorY + cy, -relZ, (s.nitroHits || 0) >= 4);
        }
      }
    }

    // 7. 5th-hit Nitro Overload explosion!
    if (s.nitroOverloaded && !handledOverload) {
      handledOverload = true;
      emitSmashExplosion(runnerX, runnerH, -0.4, true);
    } else if (!s.nitroOverloaded) {
      handledOverload = false;
    }

    // 8. Shield shatter burst
    if (s.shieldAbsorbed && !handledShieldBurst) {
      handledShieldBurst = true;
      emitShieldShatter(runnerX, runnerH);
    } else if (!s.shieldAbsorbed) {
      handledShieldBurst = false;
    }

    // 8b. Soft Additive Golden Coin Bloom Halos (nearest 30 visible coins across every map in ULTRA)
    let haloUsed = 0;
    if (!onPodium && s.items && s.items.length) {
      for (let i = 0; i < s.items.length && haloUsed < coinHalos.length; i++) {
        const o = s.items[i];
        if (o.type !== 'coin' || o.done || o.cleared) continue;
        const relZ = o.z - s.distance;
        if (relZ < -2 || relZ > 64) continue;
        const cx = curveRelX(o.z, s);
        const cy = curveRelY(o.z, s);
        const sp = coinHalos[haloUsed++];
        sp.position.set(o.lane * 2.2 + cx, 0.95 + Math.sin((s.time || 0) * 3 + o.z) * 0.10 + cy + (o.lift || 0), -relZ);
        const pulse = 1.42 + 0.18 * Math.sin((s.time || 0) * 5 + o.z * 0.4);
        sp.scale.set(pulse, pulse, 1);
        sp.visible = true;
      }
    }
    for (let i = haloUsed; i < coinHalos.length; i++) coinHalos[i].visible = false;

    // 8c. School Campus Golden-Hour Volumetric Sun-Shaft God-Rays & Sun Dust (Panel 1)
    const showSchoolRays = !onPodium && s.map === 'school';
    schoolAtmosphere.visible = showSchoolRays;
    if (showSchoolRays) {
      const span = 136;
      for (let i = 0; i < sunRays.length; i++) {
        const sr = sunRays[i];
        const zScroll = -(((sr.offset - (s.distance % span)) % span + span) % span) - 10;
        sr.m.position.set(sr.baseX + Math.sin((s.time || 0) * 0.55 + i) * 0.55, 10.6, zScroll);
      }
      for (let i = 0; i < pollen.length; i++) {
        const pt = pollen[i];
        const pz = -(((((-pt.z) - (s.distance * 0.45)) % 46) + 46) % 46) - 3;
        pt.sp.position.set(
          pt.x + Math.sin((s.time || 0) * 0.9 + pt.seed) * 0.65,
          pt.y + Math.cos((s.time || 0) * 0.7 + pt.seed) * 0.35,
          pz
        );
      }
    }

    // 8d. College Campus Glowing Amber Streetlamp Halos, Volumetric Cones, Rainy Vehicle Beams & Misty Clocktower (Panel 2)
    const showCollegeAtmo = !onPodium && s.map === 'college';
    collegeAtmosphere.visible = showCollegeAtmo;
    if (showCollegeAtmo) {
      const colRain = Math.max(0, Math.min(1, weather?.rain || 0));
      const colWet = Math.max(0, Math.min(1, weather?.wet ?? weather?.wetness ?? 0));
      const duskGlow = Math.max(colRain, colWet * 0.85);
      const lampsLit = duskGlow > 0.08;
      lampHaloMat.opacity = 0.92 * Math.min(1, duskGlow * 1.25);
      lampConeMat.opacity = 0.52 * Math.min(1, duskGlow * 1.15);
      let lampUsed = 0;
      const finalGateCut = s.isFinalRun ? finalRunGateFor('college') - 55 : Infinity;
      if (lampsLit) {
        for (let slot = 0; slot < CAMPUS_SLOTS && lampUsed < collegeLamps.length; slot++) {
          const anchor = campusAnchor(slot, s.distance);
          if (anchor >= finalGateCut) continue;
          const relSlotZ = anchor - s.distance;
          if (relSlotZ < -20 || relSlotZ > 124) continue;
          const clr = branchForkClearance(anchor, s);
          if (clr.hide) continue;
          const ox = curveRelX(anchor, s);
          const oy = curveRelY(anchor, s) + clr.dropY;
          const oz = s.distance - anchor;
          const yaw = -Math.atan(curveSlopeAt(anchor, s));
          const cosY = Math.cos(yaw);
          const sinY = Math.sin(yaw);
          for (const zLocal of [-12, 0, 12]) {
            for (const side of [-1, 1]) {
              if (lampUsed >= collegeLamps.length) break;
              const lx = side * 4.64;
              const wx = ox + lx * cosY + zLocal * sinY;
              const wy = oy + 5.44;
              const wz = oz - lx * sinY + zLocal * cosY;
              if (wz > 4 || wz < -118) continue;
              const entry = collegeLamps[lampUsed++];
              entry.sp.position.set(wx, wy, wz);
              entry.sp.visible = true;
              entry.cone.position.set(wx, wy - 2.65, wz);
              entry.cone.rotation.y = yaw;
              entry.cone.visible = wz > -78;
            }
          }
        }
      }
      for (let i = lampUsed; i < collegeLamps.length; i++) {
        collegeLamps[i].sp.visible = false;
        collegeLamps[i].cone.visible = false;
      }

      // Rainy Vehicle Headlight Beams (oncoming cars/scooties) & Crimson Taillight Glow Halos (moving roof vans / cars)
      let vlUsed = 0;
      headBeamMat.opacity = 0.42 * Math.min(1, duskGlow * 1.2);
      redHaloMat.opacity = 0.85 * Math.min(1, duskGlow * 1.2);
      if (lampsLit && s.items && s.items.length) {
        const runSpd = Math.max(24, s.speed || 28);
        for (let i = 0; i < s.items.length && vlUsed < vehicleLights.length; i++) {
          const o = s.items[i];
          if (o.cleared || o.type !== 'bus') continue;
          const visZ = (o.encounter && !o.started)
            ? (o.trigger + (runSpd + (o.velocity || 0)) * 1.45 + (o.velocity || 0) * Math.max(0, (o.trigger - s.distance) / runSpd))
            : o.z;
          const relZ = visZ - s.distance;
          if (relZ < -2 || relZ > 92) continue;
          const cx = curveRelX(visZ, s);
          const cy = curveRelY(visZ, s);
          const yaw = -Math.atan(curveSlopeAt(visZ, s));
          const vx = (o.lane || 0) * 2.2 + cx;
          const slot = vehicleLights[vlUsed++];
          if (o.roofRide) {
            slot.beam.visible = false;
            slot.haloL.position.set(vx - 0.68, cy + 0.72, -relZ + 0.15);
            slot.haloR.position.set(vx + 0.68, cy + 0.72, -relZ + 0.15);
            slot.haloL.visible = true;
            slot.haloR.visible = true;
          } else {
            const isScooty = o.collegeKind === 'scooty';
            slot.beam.scale.set(isScooty ? 0.58 : 1.0, 1, isScooty ? 0.78 : 1.0);
            slot.beam.position.set(vx, cy + 0.19, -relZ + 2.45);
            slot.beam.rotation.y = yaw;
            slot.beam.visible = true;
            slot.haloL.visible = false;
            slot.haloR.visible = false;
          }
        }
      }
      for (let i = vlUsed; i < vehicleLights.length; i++) {
        vehicleLights[i].beam.visible = false;
        vehicleLights[i].haloL.visible = false;
        vehicleLights[i].haloR.visible = false;
      }

      // Horizon hills stay completely fixed & calm — only the curving road and buildings move!
      clocktower.position.set(0, 0, 0);
    }

    // 8e. Step 3 — IT Park Boulevard Bollards & Fork Arrows (Panel 3), Rock-Cut Metro Tunnel Sconces & Red Conduits (Panel 4), Stormy Sky Bridge Bollards & Lightning (Panel 5)
    const showItPark = !onPodium && s.map === 'itpark';
    itParkAtmosphere.visible = showItPark;
    if (showItPark) {
      const branch = s.activeBranch;
      const inTunnel = branch === 'underpass';
      const onBridge = branch === 'skybridge';
      const onMainBlvd = !inTunnel && !onBridge;

      // (a) IT Park Boulevard warm architectural curb bollards (every 14m along both curbs)
      let bUsed = 0;
      if (onMainBlvd) {
        const firstB = Math.floor((s.distance - 4) / 14) * 14;
        for (let step = 0; step < 9 && bUsed + 1 < itBollards.length; step++) {
          const wd = firstB + step * 14;
          const relZ = wd - s.distance;
          if (relZ < -4 || relZ > 118) continue;
          const clr = branchForkClearance(wd, s);
          if (clr.hide) continue;
          const cx = curveRelX(wd, s), cy = curveRelY(wd, s);
          for (const side of [-1, 1]) {
            if (bUsed >= itBollards.length) break;
            const grp = itBollards[bUsed++];
            grp.position.set(cx + side * 3.92, cy + 0.14, -relZ);
            grp.visible = true;
          }
        }
      }
      for (let i = bUsed; i < itBollards.length; i++) itBollards[i].visible = false;

      // (b) Crisp painted Fork Directional Arrows approaching IT Park Fork (↖ Glass Bridge | ↗ Metro Tunnel)
      const plan = forkPlanAt(s.distance);
      const startRelZ = plan.start - s.distance;
      const showForkArrows = onMainBlvd && Boolean(s.enableForks) && startRelZ > 3 && startRelZ < 85;
      forkArrowL.visible = forkArrowR.visible = showForkArrows;
      if (showForkArrows) {
        const arrowD = plan.start - 9.5;
        const az = arrowD - s.distance;
        const ax = curveRelX(arrowD, s), ay = curveRelY(arrowD, s) + 0.125;
        forkArrowL.position.set(ax - 1.85, ay, -az);
        forkArrowR.position.set(ax + 1.85, ay, -az);
      }

      // (c) Rock-Cut Metro Tunnel Warm Amber Sconce Halos, Downward Light Cones & Triple Red Utility Conduits!
      let scUsed = 0, pipeUsed = 0;
      if (inTunnel) {
        lampHaloMat.opacity = 0.88;
        const firstS = Math.floor((s.distance - 4) / 12) * 12;
        for (let step = 0; step < 9 && scUsed + 1 < tunnelSconces.length; step++) {
          const wd = firstS + step * 12;
          const relZ = wd - s.distance;
          if (relZ < -4 || relZ > 106) continue;
          const cx = curveRelX(wd, s), cy = curveRelY(wd, s);
          const yaw = -Math.atan(curveSlopeAt(wd, s));
          for (const side of [-1, 1]) {
            if (scUsed >= tunnelSconces.length) break;
            const slot = tunnelSconces[scUsed++];
            const sx = cx + side * 3.84;
            const sy = cy + 4.45;
            slot.sp.position.set(sx, sy, -relZ);
            slot.sp.visible = true;
            slot.cone.position.set(sx, sy - 2.25, -relZ);
            slot.cone.rotation.y = yaw;
            slot.cone.visible = relZ < 76;
          }
        }
        const firstP = Math.floor((s.distance - 8) / 16) * 16;
        for (let step = 0; step < tunnelPipes.length; step++) {
          const wd = firstP + step * 16;
          const relZ = wd - s.distance;
          if (relZ < -12 || relZ > 142) continue;
          const seg = tunnelPipes[pipeUsed++];
          seg.position.set(curveRelX(wd, s), curveRelY(wd, s), -relZ);
          seg.rotation.y = -Math.atan(curveSlopeAt(wd, s));
          seg.visible = true;
        }
      }
      for (let i = scUsed; i < tunnelSconces.length; i++) {
        tunnelSconces[i].sp.visible = false;
        tunnelSconces[i].cone.visible = false;
      }
      for (let i = pipeUsed; i < tunnelPipes.length; i++) tunnelPipes[i].visible = false;

      // (d) Photorealistic Rainy-Night Sky Bridge: Recessed Warm Curb LEDs, Vertical Glowing Bollards,
      //     Tall Curved Dark-Steel Streetlamps, Distant Waterfront Night City Skyline, Angled Storm Rain & Forked Lightning!
      let bbUsed = 0, bcUsed = 0, blUsed = 0;
      if (onBridge) {
        // Recessed warm white-gold horizontal curb strip LEDs every 8m
        const firstBC = Math.floor((s.distance - 4) / 8) * 8;
        for (let step = 0; step < 16 && bcUsed + 1 < bridgeCurbLeds.length; step++) {
          const wd = firstBC + step * 8;
          const relZ = wd - s.distance;
          if (relZ < -6 || relZ > 122) continue;
          const cx = curveRelX(wd, s), cy = curveRelY(wd, s);
          const yaw = -Math.atan(curveSlopeAt(wd, s));
          for (const side of [-1, 1]) {
            if (bcUsed >= bridgeCurbLeds.length) break;
            const bar = bridgeCurbLeds[bcUsed++];
            bar.position.set(cx + side * 3.52, cy + 0.14, -relZ);
            bar.rotation.y = yaw;
            bar.visible = true;
          }
        }
        // Vertical glowing railing bollard light panels + warm halos every 12m
        const firstBB = Math.floor((s.distance - 4) / 12) * 12;
        for (let step = 0; step < 10 && bbUsed + 1 < bridgeBollards.length; step++) {
          const wd = firstBB + step * 12;
          const relZ = wd - s.distance;
          if (relZ < -4 || relZ > 116) continue;
          const cx = curveRelX(wd, s), cy = curveRelY(wd, s);
          for (const side of [-1, 1]) {
            if (bbUsed >= bridgeBollards.length) break;
            const grp = bridgeBollards[bbUsed++];
            grp.position.set(cx + side * 3.66, cy + 0.08, -relZ);
            grp.visible = true;
          }
        }
        // Tall curved dark-steel highway bridge streetlamps every 24m
        const firstBL = Math.floor((s.distance - 8) / 24) * 24;
        for (let step = 0; step < 6 && blUsed + 1 < bridgeLamps.length; step++) {
          const wd = firstBL + step * 24;
          const relZ = wd - s.distance;
          if (relZ < -8 || relZ > 136) continue;
          const cx = curveRelX(wd, s), cy = curveRelY(wd, s);
          const yaw = -Math.atan(curveSlopeAt(wd, s));
          for (let k = 0; k < 2 && blUsed < bridgeLamps.length; k++) {
            const slot = bridgeLamps[blUsed++];
            slot.grp.position.set(cx + slot.side * 4.06, cy, -relZ);
            slot.grp.rotation.y = yaw;
            slot.grp.visible = true;
          }
        }
        // Rock-steady distant illuminated night city skylines flanking both far ocean shores
        bridgeCityL.visible = bridgeCityR.visible = true;
        bridgeCityL.position.set(-124, -1.2, -158);
        bridgeCityL.rotation.set(0, 0.36, 0);
        bridgeCityL.scale.set(1.15, 1.15, 1);
        bridgeCityR.position.set(124, -1.2, -158);
        bridgeCityR.rotation.set(0, -0.36, 0);
        bridgeCityR.scale.set(1.15, 1.15, 1);

        // Soft natural misty night rain streaks (varied length & speed, subtle translucent silver-slate)
        const t = s.time || 0;
        bridgeRain.visible = true;
        for (let i = 0; i < BRIDGE_RAIN_COUNT; i++) {
          const depth = (i % 5) / 4; // 0 = near, 1 = far
          const spd = 17.0 + (1 - depth) * 9.0;
          const x = (((i * 11.37) % 28) - 14);
          const y = ((((i * 1.13) - t * spd) % 16) + 16) % 16;
          const z = 2 - (3 + depth * 36 + ((i * 3.71) % 10));
          const len = 0.42 + (1 - depth) * 0.36;
          const n = i * 6;
          bridgeRainPos[n] = x;
          bridgeRainPos[n + 1] = y;
          bridgeRainPos[n + 2] = z;
          bridgeRainPos[n + 3] = x - len * 0.14;
          bridgeRainPos[n + 4] = y - len;
          bridgeRainPos[n + 5] = z + 0.08;
        }
        bridgeRainGeo.attributes.position.needsUpdate = true;

        // Subtle periodic forked electric storm lightning in the dark night sky
        const cycle = (t + 1.2) % 6.8;
        const boltFlash = cycle < 0.28 && (cycle < 0.09 || (cycle > 0.13 && cycle < 0.24));
        ultraLightning.visible = boltFlash;
        if (boltFlash) {
          const sideFlip = (Math.floor((t + 1.2) / 6.8) % 2 === 0) ? -1 : 1;
          ultraLightning.position.set(sideFlip * 28, 34, -125);
          ultraLightning.scale.set(sideFlip, 1, 1);
          ultraLightningMat.opacity = cycle < 0.09 ? 0.92 : 0.65;
        }
      } else {
        bridgeCityL.visible = bridgeCityR.visible = false;
        bridgeRain.visible = false;
        ultraLightning.visible = false;
      }
      for (let i = bbUsed; i < bridgeBollards.length; i++) bridgeBollards[i].visible = false;
      for (let i = bcUsed; i < bridgeCurbLeds.length; i++) bridgeCurbLeds[i].visible = false;
      for (let i = blUsed; i < bridgeLamps.length; i++) bridgeLamps[i].grp.visible = false;
    }

    // 8f. Step 4 — The Final Run (Fiery Sunset Day & Luminous Moonlit Night Village Atmosphere!)
    const showFinal = !onPodium && (s.map === 'finalrun' || s.map === 'grandfather');
    finalRunAtmosphere.visible = showFinal;
    if (showFinal) {
      const t = s.time || 0;
      const nMix = Math.max(0, Math.min(1, weather?.night || 0));
      const isNightNow = nMix >= 0.45;
      // Luminous Full Moon atmospheric halo (night only; clear bright azure sky during Day!)
      moonHalo.visible = isNightNow;
      if (moonHalo.visible) {
        moonHalo.position.set(-26, 44, -206);
        moonHaloMat.opacity = Math.min(0.84, (nMix - 0.35) * 1.35);
      }
      sunsetHalo.visible = false;

      // Weathered Stone Canal Retaining Wall (far left river bank) & Rustic Wooden Farm Fence (right paddy verge) every 16m
      let wallUsed = 0, fenceUsed = 0, poleUsed = 0;
      const firstSeg = Math.floor((s.distance - 8) / 16) * 16;
      for (let step = 0; step < 10; step++) {
        const wd = firstSeg + step * 16;
        const relZ = wd - s.distance;
        if (relZ < -12 || relZ > 142) continue;
        const cx = curveRelX(wd, s), cy = curveRelY(wd, s);
        const yaw = -Math.atan(curveSlopeAt(wd, s));
        if (wallUsed < villageCanalWalls.length) {
          const wMesh = villageCanalWalls[wallUsed++];
          wMesh.position.set(cx - 12.05, cy + 0.30, -relZ);
          wMesh.rotation.y = yaw;
          wMesh.visible = true;
        }
        if (fenceUsed < villageFences.length) {
          const fGrp = villageFences[fenceUsed++];
          fGrp.position.set(cx + 6.45, cy + 0.16, -relZ);
          fGrp.rotation.y = yaw;
          fGrp.visible = true;
        }
      }
      const firstPole = Math.floor((s.distance - 10) / 36) * 36;
      for (let step = 0; step < 6 && poleUsed < villagePoles.length; step++) {
        const wd = firstPole + step * 36 + 10;
        const relZ = wd - s.distance;
        if (relZ < -8 || relZ > 155) continue;
        const pGrp = villagePoles[poleUsed++];
        pGrp.position.set(curveRelX(wd, s) + 7.25, curveRelY(wd, s) + 0.16, -relZ);
        pGrp.rotation.y = -Math.atan(curveSlopeAt(wd, s));
        pGrp.visible = true;
      }
      for (let i = wallUsed; i < villageCanalWalls.length; i++) villageCanalWalls[i].visible = false;
      for (let i = fenceUsed; i < villageFences.length; i++) villageFences[i].visible = false;
      for (let i = poleUsed; i < villagePoles.length; i++) villagePoles[i].visible = false;
      // Left-side continuous yellow cottage glow sprites removed per user feedback (keep village clean & natural!)
      for (let i = 0; i < villageLanterns.length; i++) villageLanterns[i].visible = false;

      // Drifting Golden Sunset Motes (Day) -> Glowing Village Fireflies above canal & paddy fields (Night)
      villageFireflies.visible = true;
      fireflyMat.color.setHex(isNightNow ? 0xd9ff7a : 0xffd078);
      fireflyMat.opacity = isNightNow ? (0.55 + 0.35 * Math.sin(t * 2.8)) : 0.45;
      fireflyMat.size = isNightNow ? 0.56 : 0.42;
      for (let i = 0; i < FIREFLY_COUNT; i++) {
        const side = i % 2 === 0 ? -1 : 1;
        const bx = side * (4.8 + ((i * 3.7) % 10.5)) + Math.sin(t * (0.9 + (i % 4) * 0.25) + i) * 0.9;
        const by = 0.7 + ((i * 0.53) % 3.6) + Math.sin(t * 1.7 + i * 2.1) * 0.35;
        const bz = -(((i * 7.9 + s.distance * 0.65) % 85) + 4);
        const idx = i * 3;
        fireflyPos[idx] = bx;
        fireflyPos[idx + 1] = by;
        fireflyPos[idx + 2] = bz;
      }
      fireflyGeo.attributes.position.needsUpdate = true;

      // Moonlit Night Bus Headlight Cones & Crimson Taillight Halos on Final Run
      let fvlUsed = 0;
      if (isNightNow && s.items && s.items.length) {
        headBeamMat.opacity = 0.44 * nMix;
        redHaloMat.opacity = 0.88 * nMix;
        const runSpd = Math.max(24, s.speed || 28);
        for (let i = 0; i < s.items.length && fvlUsed < finalVehicleLights.length; i++) {
          const o = s.items[i];
          if (o.cleared || o.type !== 'bus') continue;
          const visZ = (o.encounter && !o.started)
            ? (o.trigger + (runSpd + (o.velocity || 0)) * 1.45 + (o.velocity || 0) * Math.max(0, (o.trigger - s.distance) / runSpd))
            : o.z;
          const relZ = visZ - s.distance;
          if (relZ < -2 || relZ > 95) continue;
          const cx = curveRelX(visZ, s);
          const cy = curveRelY(visZ, s);
          const yaw = -Math.atan(curveSlopeAt(visZ, s));
          const vx = (o.lane || 0) * 2.2 + cx;
          const slot = finalVehicleLights[fvlUsed++];
          if (o.roofRide) {
            slot.beam.visible = false;
            slot.haloL.position.set(vx - 0.76, cy + 0.88, -relZ + 0.2);
            slot.haloR.position.set(vx + 0.76, cy + 0.88, -relZ + 0.2);
            slot.haloL.visible = true;
            slot.haloR.visible = true;
          } else {
            slot.beam.scale.set(1.1, 1, 1.15);
            slot.beam.position.set(vx, cy + 0.22, -relZ + 2.65);
            slot.beam.rotation.y = yaw;
            slot.beam.visible = true;
            slot.haloL.visible = false;
            slot.haloR.visible = false;
          }
        }
      }
      for (let i = fvlUsed; i < finalVehicleLights.length; i++) {
        finalVehicleLights[i].beam.visible = false;
        finalVehicleLights[i].haloL.visible = false;
        finalVehicleLights[i].haloR.visible = false;
      }
    }

    // 9. Advance all pooled puffs, debris/sparks, and shockwave rings
    if (stepDt > 0 && s.mode !== 'paused') {
      const camQuat = camera?.quaternion;
      for (const p of puffs) {
        if (p.life <= 0) continue;
        p.life -= stepDt;
        if (p.life <= 0) { p.m.visible = false; continue; }
        p.vy -= p.gravity * stepDt;
        p.m.position.x += p.vx * stepDt;
        p.m.position.y = Math.max(floorY + 0.06, p.m.position.y + p.vy * stepDt);
        p.m.position.z += p.vz * stepDt;
        const ratio = p.life / p.maxLife;
        const sc = p.baseScale * (1 + (1 - ratio) * p.grow);
        p.m.scale.setScalar(sc);
        p.m.material.opacity = p.baseOpacity * ratio;
        if (camQuat) p.m.quaternion.copy(camQuat);
      }

      for (const p of shards) {
        if (p.life <= 0) continue;
        p.life -= stepDt;
        if (p.life <= 0) { p.m.visible = false; continue; }
        p.vy -= p.gravity * stepDt;
        p.m.position.x += p.vx * stepDt;
        p.m.position.y += p.vy * stepDt;
        p.m.position.z += p.vz * stepDt;
        if (p.m.position.y < floorY + 0.08) {
          p.m.position.y = floorY + 0.08;
          if (p.vy < 0) p.vy = -p.vy * p.bounce;
          p.vx *= 0.82;
          p.vz *= 0.82;
        }
        p.m.rotation.x += p.rx * stepDt;
        p.m.rotation.y += p.ry * stepDt;
        p.m.rotation.z += p.rz * stepDt;
        const ratio = p.life / p.maxLife;
        p.m.scale.setScalar(p.baseScale * Math.max(0.12, ratio));
      }

      for (const r of rings) {
        if (r.life <= 0) continue;
        r.life -= stepDt;
        if (r.life <= 0) { r.m.visible = false; continue; }
        const progress = 1 - r.life / r.maxLife;
        const eased = 1 - Math.pow(1 - progress, 3);
        r.m.scale.setScalar(0.5 + eased * r.maxScale);
        r.m.material.opacity = r.baseOpacity * (1 - progress);
      }
    }
  }

  return {
    root,
    setEnabled,
    isEnabled: () => enabled,
    update,
    clearAll
  };
}
