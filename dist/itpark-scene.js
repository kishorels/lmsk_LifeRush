import {
  BoxGeometry,
  CanvasTexture,
  CylinderGeometry,
  ExtrudeGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  RepeatWrapping,
  Shape,
  SphereGeometry,
  SRGBColorSpace,
  TextureLoader
} from './vendor/three.module.js';
import { bakeGroup } from './bake-static-meshes.js';
import { roadsideTree } from './street-materials.js';
import { campusAnchor, campusKind, CAMPUS_SLOTS, curveRelX, curveRelY, curveSlopeAt } from './campus-layout.js';
import { branchForkClearance } from './road-events.js';

// Modern LMSK IT Park district inspired by 5 signature architectural landmarks:
// 0: Classic Neoclassical Stone & Arched Glass Tower (Ref 1)
// 1: White-Concrete & Cyan-Glass Exoskeleton Corporate HQ with Rotunda & Sky-Terrace (Ref 2)
// 2: Sleek White-Concrete & Mirror-Blue Skyscraper Cluster with Portal & Sloped Wedge (Ref 3)
// 3: Rounded-Corner Beige Bauhaus Tech Studio with Rooftop Communications Mast (Ref 4)
// 4: Futuristic S-Curved White-Ribbon & Smoked-Glass Innovation Center with Warm Glow (Ref 5)
export function createItParkCampus(scene) {
  const box = new BoxGeometry(1, 1, 1);
  const cyl12 = new CylinderGeometry(1, 1, 1, 12);
  const cyl16 = new CylinderGeometry(1, 1, 1, 16);
  const halfCyl = new CylinderGeometry(1, 1, 1, 12, 1, false, 0, Math.PI);
  const sphere = new SphereGeometry(1, 10, 7);

  const plaster = typeof document === 'undefined'
    ? null
    : new TextureLoader().load(new URL('./assets/street/plaster.webp', import.meta.url).href);
  if (plaster) {
    plaster.colorSpace = SRGBColorSpace;
    plaster.wrapS = plaster.wrapT = RepeatWrapping;
    plaster.repeat.set(3, 3);
    plaster.anisotropy = 4;
  }

  // Realistic Architectural Curtain-Wall Office Window Generator
  function createCurtainWallGlass({ baseColor, mullionColor = '#0f172a', warmLights = true, repeatX = 2.0, repeatY = 4.0, envIntensity = 1.85, metalness = 0.72 }) {
    if (typeof document === 'undefined') {
      return new MeshStandardMaterial({
        color: baseColor,
        roughness: 0.12,
        metalness,
        envMapIntensity: envIntensity,
        emissive: baseColor,
        emissiveIntensity: 0.08
      });
    }
    const S = 256;
    const cv = document.createElement('canvas');
    cv.width = S; cv.height = S;
    const ctx = cv.getContext('2d');
    const emCv = document.createElement('canvas');
    emCv.width = S; emCv.height = S;
    const emCtx = emCv.getContext('2d');

    if (ctx && emCtx) {
      ctx.fillStyle = baseColor;
      ctx.fillRect(0, 0, S, S);
      emCtx.fillStyle = '#000000';
      emCtx.fillRect(0, 0, S, S);

      const cols = 8, rows = 16;
      const cw = S / cols;
      const ch = S / rows;

      for (let r = 0; r < rows; r++) {
        const isSpandrel = (r % 4 === 0);
        for (let c = 0; c < cols; c++) {
          const x = c * cw;
          const y = r * ch;
          if (isSpandrel) {
            ctx.fillStyle = '#111827';
            ctx.fillRect(x + 1, y + 1, cw - 2, ch - 2);
            continue;
          }
          const hash = Math.sin(c * 37.1 + r * 89.3) * 10000;
          const rnd = hash - Math.floor(hash);

          if (rnd < 0.38) {
            const glow = warmLights ? '#fef08a' : '#e0f2fe';
            ctx.fillStyle = glow;
            ctx.fillRect(x + 1, y + 1, cw - 2, ch - 2);
            emCtx.fillStyle = warmLights ? '#f59e0b' : '#38bdf8';
            emCtx.fillRect(x + 1, y + 1, cw - 2, ch - 2);
            ctx.fillStyle = 'rgba(71, 85, 105, 0.35)';
            ctx.fillRect(x + 1, y + Math.floor(ch * 0.42), cw - 2, 1.5);
          } else if (rnd < 0.65) {
            ctx.fillStyle = '#7dd3fc';
            ctx.fillRect(x + 1, y + 1, cw - 2, ch - 2);
            emCtx.fillStyle = '#0284c7';
            emCtx.fillRect(x + 1, y + 1, cw - 2, ch - 2);
          } else if (rnd < 0.82) {
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(x + 1, y + 1, cw - 2, ch - 2);
          } else {
            ctx.fillStyle = '#94a3b8';
            ctx.fillRect(x + 1, y + 1, cw - 2, ch - 2);
            ctx.fillStyle = 'rgba(51, 65, 85, 0.45)';
            for (let by = y + 3; by < y + ch - 2; by += 3) {
              ctx.fillRect(x + 2, by, cw - 4, 1);
            }
          }
        }
      }

      ctx.strokeStyle = mullionColor;
      ctx.lineWidth = 2;
      for (let c = 0; c <= cols; c++) {
        ctx.beginPath(); ctx.moveTo(c * cw, 0); ctx.lineTo(c * cw, S); ctx.stroke();
      }
      for (let r = 0; r <= rows; r++) {
        ctx.beginPath(); ctx.moveTo(0, r * ch); ctx.lineTo(S, r * ch); ctx.stroke();
      }

      const map = new CanvasTexture(cv);
      map.colorSpace = SRGBColorSpace;
      map.wrapS = map.wrapT = RepeatWrapping;
      map.repeat.set(repeatX, repeatY);
      map.anisotropy = 4;

      const emissiveMap = new CanvasTexture(emCv);
      emissiveMap.colorSpace = SRGBColorSpace;
      emissiveMap.wrapS = emissiveMap.wrapT = RepeatWrapping;
      emissiveMap.repeat.set(repeatX, repeatY);
      emissiveMap.anisotropy = 4;

      return new MeshStandardMaterial({
        color: 0xffffff,
        map,
        emissiveMap,
        emissive: 0xffffff,
        emissiveIntensity: 0.16,
        roughness: 0.12,
        metalness,
        envMapIntensity: envIntensity
      });
    }
    return new MeshStandardMaterial({ color: baseColor, roughness: 0.12, metalness });
  }

  const isLowEnd = Boolean(scene.userData?.lowEnd);
  const M = {
    // Ref 1: Neoclassical travertine stone + bright ivory trim
    limestone: new MeshStandardMaterial({ color: 0xe3dbc7, map: plaster, bumpMap: isLowEnd ? null : plaster, bumpScale: 0.012, roughness: 0.86, metalness: 0.02 }),
    limestoneDeep: new MeshStandardMaterial({ color: 0xd1c7b0, map: plaster, roughness: 0.88, metalness: 0.02 }),
    ivoryTrim: new MeshStandardMaterial({ color: 0xf6f4ee, roughness: 0.58, metalness: 0.04 }),
    // Ref 2, 3, 5: Crisp white & silver architectural concrete
    archWhite: new MeshStandardMaterial({ color: 0xf1f4f8, roughness: 0.52, metalness: 0.06 }),
    concreteLt: new MeshStandardMaterial({ color: 0xd8dee6, roughness: 0.72, metalness: 0.05 }),
    plazaGray: new MeshStandardMaterial({ color: 0xb6bec8, roughness: 0.84, metalness: 0.04 }),
    plazaDark: new MeshStandardMaterial({ color: 0x8f98a4, roughness: 0.86, metalness: 0.06 }),
    // Ref 2 & 5: Dark steel exoskeleton, frames, mullions
    charcoalGrid: new MeshStandardMaterial({ color: 0x3b434c, roughness: 0.40, metalness: 0.45 }),
    darkMullion: new MeshStandardMaterial({ color: 0x1c252f, roughness: 0.36, metalness: 0.55 }),
    // Highly realistic curtain-wall glass with architectural aluminum mullions, illuminated offices & computer monitors
    skyGlass: createCurtainWallGlass({ baseColor: '#5396d8', mullionColor: '#1e293b', warmLights: true, repeatX: 2.0, repeatY: 4.5, envIntensity: 1.85, metalness: 0.72 }),
    skyGlassBright: createCurtainWallGlass({ baseColor: '#38bdf8', mullionColor: '#0f172a', warmLights: false, repeatX: 2.5, repeatY: 5.0, envIntensity: 1.95, metalness: 0.78 }),
    cyanGlass: createCurtainWallGlass({ baseColor: '#2dd4bf', mullionColor: '#134e4a', warmLights: true, repeatX: 1.8, repeatY: 3.5, envIntensity: 1.75, metalness: 0.65 }),
    smokedGlass: createCurtainWallGlass({ baseColor: '#334155', mullionColor: '#0f172a', warmLights: true, repeatX: 2.2, repeatY: 4.0, envIntensity: 1.70, metalness: 0.70 }),
    warmGlow: new MeshStandardMaterial({ color: 0xf7dca0, emissive: 0xf5c869, emissiveIntensity: 0.78, roughness: 0.35, metalness: 0.05 }),
    balconyRail: new MeshStandardMaterial({ color: 0xdcebf5, roughness: 0.18, metalness: 0.35, envMapIntensity: 1.3 }),
    // Ref 4: Bauhaus beige concrete + deep petroleum teal glass + navy annex + steel mast
    sandStucco: new MeshStandardMaterial({ color: 0xcfa97e, map: plaster, bumpMap: isLowEnd ? null : plaster, bumpScale: 0.01, roughness: 0.84, metalness: 0.02 }),
    sandDark: new MeshStandardMaterial({ color: 0xb99166, map: plaster, roughness: 0.88, metalness: 0.02 }),
    bauhausGlass: createCurtainWallGlass({ baseColor: '#0e7490', mullionColor: '#164e63', warmLights: false, repeatX: 3.0, repeatY: 3.0, envIntensity: 1.55, metalness: 0.58 }),
    navyAnnex: new MeshStandardMaterial({ color: 0x152f47, roughness: 0.64, metalness: 0.22 }),
    awningBlue: new MeshStandardMaterial({ color: 0x276285, roughness: 0.52, metalness: 0.25 }),
    mastSteel: new MeshStandardMaterial({ color: 0x83acc7, roughness: 0.30, metalness: 0.76 }),
    // Landscape, lighting & accents (vibrant lush emerald + neon cyan rail accents + banner colors matching Images 3-5!)
    lawnGreen: new MeshStandardMaterial({ color: 0x28c74b, roughness: 0.88, metalness: 0 }),
    hedgeDark: new MeshStandardMaterial({ color: 0x16a34a, roughness: 0.86, metalness: 0 }),
    railSteel: new MeshStandardMaterial({ color: 0xaab6c4, roughness: 0.28, metalness: 0.70 }),
    cyanRailLed: new MeshStandardMaterial({ color: 0x00e5ff, emissive: 0x00e5ff, emissiveIntensity: 1.2, roughness: 0.14 }),
    bannerCoral: new MeshStandardMaterial({ color: 0xf43f5e, emissive: 0xe11d48, emissiveIntensity: 0.22, roughness: 0.36 }),
    bannerBlue: new MeshStandardMaterial({ color: 0x3b82f6, emissive: 0x2563eb, emissiveIntensity: 0.28, roughness: 0.36 }),
    lampGlow: new MeshStandardMaterial({ color: 0xfff6dc, emissive: 0xffefc0, emissiveIntensity: 0.92, roughness: 0.2 }),
    redBeacon: new MeshStandardMaterial({ color: 0xdc2626, emissive: 0xef4444, emissiveIntensity: 0.75, roughness: 0.3 }),
    billboardWhite: new MeshStandardMaterial({ color: 0xffffff, emissive: 0xf0f6ff, emissiveIntensity: 0.14, roughness: 0.35 })
  };

  function part(root, mat, x, y, z, w, h, d, geo = box) {
    const m = new Mesh(geo, mat);
    m.position.set(x, y, z);
    m.scale.set(Math.abs(w), Math.abs(h), Math.abs(d));
    root.add(m);
    return m;
  }

  function addCustom(root, mat, geo, x = 0, y = 0, z = 0) {
    const m = new Mesh(geo, mat);
    m.position.set(x, y, z);
    root.add(m);
    return m;
  }

  // Helper: extrude a 2D footprint in the XZ plane vertically along +Y (always positive outward normals).
  // points = array of [x, z] in world space; automatically ensures CCW winding in shape space.
  function makeExtrudedXZ(points, height, curveSegments = 6) {
    // Shape (sx, sy) after rotateX(-PI/2) maps to world (sx, 0, -sy) and extrusion +Z maps to world +Y.
    const pts2 = points.map(([x, z]) => [x, -z]);
    let area = 0;
    for (let i = 0; i < pts2.length; i++) {
      const [x1, y1] = pts2[i];
      const [x2, y2] = pts2[(i + 1) % pts2.length];
      area += (x1 * y2 - x2 * y1);
    }
    if (area < 0) pts2.reverse();
    const shape = new Shape();
    pts2.forEach(([sx, sy], i) => {
      if (i === 0) shape.moveTo(sx, sy);
      else shape.lineTo(sx, sy);
    });
    shape.closePath();
    const geo = new ExtrudeGeometry(shape, { depth: height, bevelEnabled: false, steps: 1, curveSegments });
    geo.rotateX(-Math.PI / 2);
    return geo;
  }

  // ---------------------------------------------------------------------------
  // REF 1: Classic Neoclassical Stone & Arched Glass High-Rise Tower
  // ---------------------------------------------------------------------------
  function buildRef1ClassicTower(root, side) {
    const W = 10.6;
    const D = 14.8;
    const cx = side * 11.8; // inner road face at side * 6.5
    const cz = -0.6;
    const roadFace = cx - side * (W / 2);
    const frontFace = cz + D / 2;

    // Plaza pad
    part(root, M.plazaGray, cx, 0.11, cz, W + 1.8, 0.22, D + 2.4);

    // 1. Two-story stone base podium (y = 0.22 .. 5.4)
    part(root, M.limestoneDeep, cx, 0.42, cz, W + 0.36, 0.42, D + 0.36);
    part(root, M.limestone, cx, 2.8, cz, W, 5.2, D);

    // Ground double-height arched glass arcade along the road-facing wall (4 tall arched bays + 2 end storefront bays)
    const archBayZs = [-4.5, -1.5, 1.5, 4.5];
    for (const bz of archBayZs) {
      const fx = roadFace - side * 0.04;
      // Dark arched frame & reflective sky-blue glass
      part(root, M.darkMullion, fx, 1.75, cz + bz, 0.14, 2.85, 2.15);
      part(root, M.skyGlassBright, fx - side * 0.03, 1.72, cz + bz, 0.10, 2.68, 1.94);
      // Semicircular arch crown above the bay (in YZ plane, arching along +Y)
      const archFrame = part(root, M.darkMullion, fx - side * 0.01, 3.16, cz + bz, 1.07, 0.15, 1.07, halfCyl);
      archFrame.rotation.z = Math.PI / 2;
      const archGlass = part(root, M.skyGlassBright, fx - side * 0.04, 3.16, cz + bz, 0.96, 0.11, 0.96, halfCyl);
      archGlass.rotation.z = Math.PI / 2;
      // Fine mullions (center vertical + transom bar)
      part(root, M.darkMullion, fx - side * 0.07, 2.1, cz + bz, 0.06, 3.4, 0.07);
      part(root, M.darkMullion, fx - side * 0.07, 2.25, cz + bz, 0.06, 0.08, 2.02);
      part(root, M.darkMullion, fx - side * 0.07, 3.15, cz + bz, 0.06, 0.08, 2.02);
      // White stone keystone above arch
      part(root, M.ivoryTrim, fx - side * 0.08, 4.24, cz + bz, 0.18, 0.24, 0.24);
    }
    // Corner rectangular storefront windows on road face
    for (const bz of [-6.35, 6.35]) {
      const fx = roadFace - side * 0.04;
      part(root, M.darkMullion, fx, 1.45, cz + bz, 0.12, 2.1, 1.15);
      part(root, M.skyGlass, fx - side * 0.03, 1.45, cz + bz, 0.08, 1.92, 0.98);
    }

    // Double-height arched arcade on the +Z approach face (3 tall arched bays facing the runner!)
    const frontArchXs = [-2.6, 0, 2.6];
    for (const bx of frontArchXs) {
      const fz = frontFace + 0.04;
      part(root, M.darkMullion, cx + bx, 1.75, fz, 1.98, 2.85, 0.14);
      part(root, M.skyGlassBright, cx + bx, 1.72, fz + 0.03, 1.78, 2.68, 0.10);
      const af = part(root, M.darkMullion, cx + bx, 3.16, fz + 0.01, 0.99, 0.15, 0.99, halfCyl);
      af.rotation.set(0, Math.PI / 2, Math.PI / 2);
      const ag = part(root, M.skyGlassBright, cx + bx, 3.16, fz + 0.04, 0.89, 0.11, 0.89, halfCyl);
      ag.rotation.set(0, Math.PI / 2, Math.PI / 2);
      part(root, M.darkMullion, cx + bx, 2.1, fz + 0.07, 0.07, 3.4, 0.06);
      part(root, M.darkMullion, cx + bx, 2.25, fz + 0.07, 1.86, 0.08, 0.06);
      part(root, M.ivoryTrim, cx + bx, 4.24, fz + 0.08, 0.24, 0.24, 0.18);
    }

    // Mezzanine row (y = 4.65) + corbel brackets + bold protruding white podium cornice (y = 5.38)
    for (let z = -6.0; z <= 6.01; z += 1.5) {
      part(root, M.darkMullion, roadFace - side * 0.04, 4.65, cz + z, 0.10, 0.72, 0.78);
      part(root, M.skyGlass, roadFace - side * 0.06, 4.65, cz + z, 0.07, 0.58, 0.62);
      part(root, M.ivoryTrim, roadFace - side * 0.12, 5.14, cz + z + 0.75, 0.22, 0.24, 0.22);
    }
    for (let x = -3.9; x <= 3.91; x += 1.3) {
      part(root, M.darkMullion, cx + x, 4.65, frontFace + 0.04, 0.72, 0.72, 0.10);
      part(root, M.skyGlass, cx + x, 4.65, frontFace + 0.06, 0.58, 0.58, 0.07);
      part(root, M.ivoryTrim, cx + x, 5.14, frontFace + 0.12, 0.20, 0.24, 0.22);
    }
    part(root, M.ivoryTrim, cx, 5.38, cz, W + 0.68, 0.34, D + 0.68);
    part(root, M.limestoneDeep, cx, 5.58, cz, W + 0.42, 0.12, D + 0.42);

    // 2. Tall Main Shaft (y = 5.5 .. 18.2, 7 classical floors)
    const shaftW = W - 0.14;
    const shaftD = D - 0.14;
    part(root, M.limestone, cx, 11.85, cz, shaftW, 12.7, shaftD);

    // Crisp bright white corner pilasters running full height (signature Ref 1 vertical white corner bands!)
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        part(root, M.ivoryTrim, cx + sx * (shaftW / 2 - 0.48), 13.6, cz + sz * (shaftD / 2 - 0.48), 1.08, 16.4, 1.08);
      }
    }

    // Paired vertical blue-glass windows across 7 shaft floors (y = 6.35 .. 16.85)
    const shaftRoadFace = cx - side * (shaftW / 2);
    const shaftFrontFace = cz + shaftD / 2;
    for (let fl = 0; fl < 7; fl++) {
      const y = 6.45 + fl * 1.66;
      // Subtle floor string molding on every floor
      if (fl === 1) part(root, M.ivoryTrim, cx, y - 0.82, cz, shaftW + 0.28, 0.16, shaftD + 0.28);
      // Road face: 5 paired window columns
      for (const bz of [-5.0, -2.5, 0, 2.5, 5.0]) {
        for (const pair of [-0.42, 0.42]) {
          part(root, M.darkMullion, shaftRoadFace - side * 0.04, y, cz + bz + pair, 0.10, 1.16, 0.64);
          part(root, M.skyGlass, shaftRoadFace - side * 0.06, y, cz + bz + pair, 0.07, 1.02, 0.50);
        }
        part(root, M.ivoryTrim, shaftRoadFace - side * 0.08, y - 0.62, cz + bz, 0.16, 0.10, 1.62);
      }
      // +Z approach face: 4 paired window columns
      for (const bx of [-3.3, -1.1, 1.1, 3.3]) {
        for (const pair of [-0.36, 0.36]) {
          part(root, M.darkMullion, cx + bx + pair, y, shaftFrontFace + 0.04, 0.56, 1.16, 0.10);
          part(root, M.skyGlass, cx + bx + pair, y, shaftFrontFace + 0.06, 0.44, 1.02, 0.07);
        }
        part(root, M.ivoryTrim, cx + bx, y - 0.62, shaftFrontFace + 0.08, 1.38, 0.10, 0.16);
      }
    }

    // 3. Upper Double-Cornice Attic Band (y = 18.2 .. 21.8, 2 floors)
    part(root, M.ivoryTrim, cx, 18.22, cz, W + 0.58, 0.36, D + 0.58);
    part(root, M.limestone, cx, 20.0, cz, shaftW, 3.4, shaftD);
    part(root, M.ivoryTrim, cx, 19.9, cz, W + 0.36, 0.24, D + 0.36);
    for (const y of [19.05, 20.75]) {
      for (const bz of [-5.0, -2.5, 0, 2.5, 5.0]) {
        for (const pair of [-0.42, 0.42]) {
          part(root, M.darkMullion, shaftRoadFace - side * 0.04, y, cz + bz + pair, 0.10, 1.05, 0.62);
          part(root, M.skyGlassBright, shaftRoadFace - side * 0.06, y, cz + bz + pair, 0.07, 0.90, 0.48);
        }
      }
      for (const bx of [-3.3, -1.1, 1.1, 3.3]) {
        for (const pair of [-0.36, 0.36]) {
          part(root, M.darkMullion, cx + bx + pair, y, shaftFrontFace + 0.04, 0.56, 1.05, 0.10);
          part(root, M.skyGlassBright, cx + bx + pair, y, shaftFrontFace + 0.06, 0.44, 0.90, 0.07);
        }
      }
    }
    // Crown cornice ledge
    part(root, M.ivoryTrim, cx, 21.75, cz, W + 0.66, 0.38, D + 0.66);

    // 4. Stepped Setback Penthouse Crown + 4 Sculpted Corner Urn Finials (y = 21.9 .. 24.4)
    const pW = W - 1.9;
    const pD = D - 2.2;
    part(root, M.limestone, cx, 22.95, cz, pW, 2.1, pD);
    part(root, M.ivoryTrim, cx, 24.08, cz, pW + 0.48, 0.32, pD + 0.48);
    part(root, M.ivoryTrim, cx, 24.42, cz, pW - 1.2, 0.38, pD - 1.4);
    for (const bz of [-4.2, -1.4, 1.4, 4.2]) {
      part(root, M.darkMullion, cx - side * (pW / 2 + 0.04), 22.95, cz + bz, 0.10, 1.24, 1.45);
      part(root, M.skyGlassBright, cx - side * (pW / 2 + 0.06), 22.95, cz + bz, 0.07, 1.08, 1.26);
    }
    for (const bx of [-2.4, 0, 2.4]) {
      part(root, M.darkMullion, cx + bx, 22.95, cz + pD / 2 + 0.04, 1.35, 1.24, 0.10);
      part(root, M.skyGlassBright, cx + bx, 22.95, cz + pD / 2 + 0.06, 1.16, 1.08, 0.07);
    }
    // 4 Decorative Classical Corner Urns on the cornice corners
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const ux = cx + sx * (W / 2 - 0.25);
        const uz = cz + sz * (D / 2 - 0.25);
        part(root, M.ivoryTrim, ux, 22.15, uz, 0.42, 0.44, 0.42);
        part(root, M.ivoryTrim, ux, 22.62, uz, 0.30, 0.42, 0.30, sphere);
        part(root, M.ivoryTrim, ux, 22.94, uz, 0.40, 0.14, 0.40, cyl12);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // REF 2: Modern White-Concrete & Cyan-Glass Exoskeleton Corporate Office HQ
  // ---------------------------------------------------------------------------
  function buildRef2CorporateComplex(root, side) {
    const cx = side * 12.0; // inner edge ~6.5
    const cz = -0.5;

    // Wide paved corporate plaza deck + Ref 2's 3 signature bright-green rounded lawn islands
    part(root, M.plazaGray, cx, 0.12, cz, 12.4, 0.24, 26.8);
    for (const gz of [-10.8, -8.5, -6.2]) {
      part(root, M.lawnGreen, side * 6.35, 0.22, gz, 1.35, 0.12, 1.35, cyl12);
      part(root, M.archWhite, side * 6.35, 0.18, gz, 1.48, 0.08, 1.48, cyl12);
    }

    // A. Far Circular White Concrete Rotunda Annex with Cantilevered Roof Disc (z = -10.5)
    const rotX = side * 13.6;
    const rotZ = -10.2;
    part(root, M.archWhite, rotX, 4.6, rotZ, 3.0, 9.0, 3.0, cyl16);
    part(root, M.concreteLt, rotX, 9.2, rotZ, 2.75, 0.25, 2.75, cyl16);
    // Vertical cyan-glass ribbon slot on the rotunda
    part(root, M.cyanGlass, rotX - side * 2.82, 4.9, rotZ + 0.5, 0.36, 7.2, 1.35);
    part(root, M.darkMullion, rotX - side * 2.88, 4.9, rotZ + 0.5, 0.12, 7.2, 0.08);
    // Cantilevered flat disc canopy floating over the open rooftop courtyard
    part(root, M.charcoalGrid, rotX + side * 0.4, 9.95, rotZ - 0.3, 1.95, 0.26, 1.95, cyl16);
    for (const a of [-0.7, 0.7]) {
      part(root, M.charcoalGrid, rotX + side * 0.3 + a, 9.5, rotZ - 0.3 + a * 0.5, 0.22, 0.9, 0.22, cyl12);
    }
    // Low circular canopy entrance on the rotunda base
    part(root, M.charcoalGrid, rotX - side * 3.1, 2.45, rotZ + 0.8, 1.85, 0.20, 2.3);

    // B. Far Cyan Curtain-Wall Wing (z = -8.8 .. -2.6, h = 13.6m)
    const wing1X = side * 10.6;
    const wing1Z = -5.6;
    const wing1W = 7.4;
    const wing1D = 6.4;
    part(root, M.archWhite, wing1X + side * 0.6, 6.8, wing1Z, wing1W - 0.6, 13.4, wing1D);
    // Full cyan glass curtain wall facing the road with crisp white horizontal spandrel bands
    part(root, M.cyanGlass, wing1X - side * (wing1W / 2 - 0.1), 7.4, wing1Z, 0.28, 11.8, wing1D - 0.2);
    for (let y = 1.9; y <= 13.3; y += 1.65) {
      part(root, M.archWhite, wing1X - side * (wing1W / 2 + 0.06), y, wing1Z, 0.24, 0.24, wing1D + 0.12);
    }
    for (let z = -2.8; z <= 2.81; z += 1.4) {
      part(root, M.darkMullion, wing1X - side * (wing1W / 2 + 0.04), 7.4, wing1Z + z, 0.14, 11.8, 0.09);
    }
    // White parapet cap
    part(root, M.archWhite, wing1X + side * 0.3, 13.65, wing1Z, wing1W + 0.2, 0.45, wing1D + 0.2);

    // C. Projecting Full-Height Dark-Charcoal Semi-Cylindrical Stair Tower (z = -2.4, x = side * 6.85)
    const stX = side * 6.95;
    const stZ = -2.4;
    part(root, M.charcoalGrid, stX, 7.1, stZ, 1.32, 14.0, 1.32, cyl16);
    part(root, M.cyanGlass, stX - side * 0.22, 13.0, stZ, 1.24, 1.65, 1.24, cyl16);
    part(root, M.charcoalGrid, stX - side * 0.15, 14.05, stZ, 1.48, 0.34, 1.48, cyl16);
    // Stacked horizontal wraparound balcony rings on the stair drum
    for (let y = 2.0; y <= 12.1; y += 1.68) {
      part(root, M.charcoalGrid, stX - side * 0.18, y, stZ, 1.46, 0.24, 1.46, cyl16);
      part(root, M.cyanGlass, stX - side * 0.24, y + 0.65, stZ, 1.26, 0.95, 1.26, cyl16);
    }

    // D. Center Off-White Concrete Punched-Window Core (z = -2.2 .. +4.6, h = 14.6m)
    const midX = side * 11.2;
    const midZ = 1.2;
    const midW = 8.4;
    const midD = 6.8;
    const midRoadFace = midX - side * (midW / 2);
    part(root, M.archWhite, midX, 7.3, midZ, midW, 14.4, midD);
    // Curved rooftop wing accent wall rising cleanly at the top
    part(root, M.concreteLt, midX + side * 1.4, 15.1, midZ - 0.8, 5.2, 1.3, 5.8);
    // Ground floor large cyan glass lobby openings
    for (let z = -2.2; z <= 2.21; z += 1.45) {
      part(root, M.cyanGlass, midRoadFace - side * 0.04, 1.45, midZ + z, 0.12, 2.2, 1.08);
      part(root, M.darkMullion, midRoadFace - side * 0.06, 1.45, midZ + z, 0.08, 2.2, 0.07);
    }
    // 6 upper floors of crisp punched square windows (4 cols × 6 rows)
    for (let fl = 0; fl < 6; fl++) {
      const y = 3.7 + fl * 1.68;
      for (let z = -2.25; z <= 2.26; z += 1.5) {
        part(root, M.darkMullion, midRoadFace - side * 0.04, y, midZ + z, 0.10, 1.06, 0.98);
        part(root, M.cyanGlass, midRoadFace - side * 0.06, y, midZ + z, 0.08, 0.90, 0.82);
      }
    }

    // E. Iconic Near Dark-Charcoal Exoskeleton Glass Wing (z = +4.6 .. +11.6, h = 14.0m)
    const exoX = side * 11.4;
    const exoZ = 8.1;
    const exoW = 8.6;
    const exoD = 7.0;
    const exoRoadFace = exoX - side * (exoW / 2);
    const exoFrontFace = exoZ + exoD / 2;
    // Inner structural core + luminous cyan-glass curtain walls on BOTH road & +Z approach faces
    part(root, M.concreteLt, exoX + side * 0.4, 7.0, exoZ - 0.3, exoW - 0.8, 13.6, exoD - 0.6);
    part(root, M.cyanGlass, exoRoadFace - side * 0.02, 7.1, exoZ, 0.24, 13.4, exoD - 0.2);
    part(root, M.cyanGlass, exoX, 7.1, exoFrontFace + 0.02, exoW - 0.2, 13.4, 0.24);
    part(root, M.archWhite, exoX, 13.95, exoZ, exoW + 0.2, 0.42, exoD + 0.2);

    // Bold Projecting Dark-Charcoal Square Exoskeleton Grid (Ref 2's defining visual!)
    for (let y = 0.4; y <= 13.8; y += 2.2) {
      part(root, M.charcoalGrid, exoRoadFace - side * 0.20, y, exoZ, 0.38, 0.28, exoD + 0.36);
      part(root, M.charcoalGrid, exoX, y, exoFrontFace + 0.20, exoW + 0.36, 0.28, 0.38);
    }
    for (let z = -3.4; z <= 3.41; z += 1.7) {
      part(root, M.charcoalGrid, exoRoadFace - side * 0.20, 7.1, exoZ + z, 0.38, 13.6, 0.28);
    }
    for (let x = -4.2; x <= 4.21; x += 2.1) {
      part(root, M.charcoalGrid, exoX + x, 7.1, exoFrontFace + 0.20, 0.28, 13.6, 0.38);
    }

    // F. Street-Level Circular Glass Entrance Rotunda (at junction z = +4.6, x = side * 6.8)
    const entX = side * 6.85;
    const entZ = 4.6;
    part(root, M.archWhite, entX, 0.26, entZ, 1.85, 0.16, 1.85, cyl16);
    part(root, M.cyanGlass, entX, 1.65, entZ, 1.45, 2.75, 1.45, cyl16);
    part(root, M.charcoalGrid, entX, 3.12, entZ, 1.82, 0.48, 1.82, cyl16);
    for (let a = 0; a < 5; a++) {
      const ang = (a / 4) * Math.PI - Math.PI / 2;
      part(root, M.charcoalGrid, entX - side * Math.cos(ang) * 1.58, 1.65, entZ + Math.sin(ang) * 1.58, 0.18, 2.85, 0.18, cyl12);
    }

    // G. Low White Corner Block + Cantilevered Circular Panoramic Sky-Terrace (at hero corner facing runner!)
    const corX = side * 9.8;
    const corZ = 10.6;
    part(root, M.archWhite, corX, 2.85, corZ, 6.0, 5.5, 3.6);
    for (const y of [1.5, 3.4, 4.7]) {
      for (const bx of [-1.8, 0, 1.8]) {
        part(root, M.cyanGlass, corX + bx, y, corZ + 1.84, 1.1, 0.85, 0.08);
      }
      for (const bz of [-0.9, 0.8]) {
        part(root, M.cyanGlass, corX - side * 3.04, y, corZ + bz, 0.08, 0.85, 1.0);
      }
    }
    // Iconic Cantilevered Circular Sky-Terrace Deck & Curved Balcony projecting above the low corner!
    const skyX = side * 7.6;
    const skyZ = 11.1;
    part(root, M.charcoalGrid, skyX, 5.95, skyZ, 2.45, 0.34, 2.45, cyl16);
    part(root, M.cyanGlass, skyX, 7.15, skyZ, 2.05, 2.15, 2.05, cyl16);
    part(root, M.charcoalGrid, skyX, 7.15, skyZ, 2.25, 0.22, 2.25, cyl16);
    part(root, M.charcoalGrid, skyX, 8.32, skyZ, 2.58, 0.36, 2.58, cyl16);
    // Curved dark structural ribs around the sky-terrace
    for (let a = 0; a < 6; a++) {
      const ang = (a / 5) * Math.PI * 1.4 - 0.5;
      part(root, M.charcoalGrid, skyX - side * Math.cos(ang) * 2.28, 7.15, skyZ + Math.sin(ang) * 2.28, 0.18, 2.35, 0.18);
    }
  }

  // ---------------------------------------------------------------------------
  // REF 3: Sleek White-Concrete & Mirror-Blue Skyscraper Cluster Ensemble
  // ---------------------------------------------------------------------------
  function buildRef3SkyscraperCluster(root, side) {
    // Crisp bright architectural plinth spanning the ensemble
    part(root, M.plazaGray, side * 13.0, 0.11, -0.5, 14.2, 0.22, 27.6);

    // 1. HERO TALL WHITE PORTAL-FRAME SKYSCRAPER (back-center, h = 26.8m)
    const pX = side * 16.0;
    const pZ = -3.2;
    const pW = 7.2;
    const pD = 7.8;
    const pH = 26.8;
    // Recessed full-height mirror-blue glass core
    part(root, M.skyGlassBright, pX, pH / 2 - 0.3, pZ, pW - 1.5, pH - 1.6, pD - 1.5);
    // Fine horizontal glass spandrel lines
    for (let y = 2.4; y < pH - 1.8; y += 2.2) {
      part(root, M.darkMullion, pX - side * ((pW - 1.44) / 2), y, pZ, 0.08, 0.08, pD - 1.6);
      part(root, M.darkMullion, pX, y, pZ + (pD - 1.44) / 2, pW - 1.6, 0.08, 0.08);
    }
    // Massive thick architectural white outer picture-frame (4 corner legs + top lintel crown!)
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        part(root, M.archWhite, pX + sx * (pW / 2 - 0.72), pH / 2, pZ + sz * (pD / 2 - 0.72), 1.48, pH, 1.48);
      }
    }
    part(root, M.archWhite, pX, pH - 0.95, pZ, pW + 0.08, 1.95, pD + 0.08);
    part(root, M.redBeacon, pX - side * (pW / 2 - 0.5), pH + 0.22, pZ + pD / 2 - 0.5, 0.22, 0.28, 0.22, sphere);

    // 2. CURVED HORIZONTAL-RIBBON CYLINDER TOWER WITH SLANTED ROOF (back-far, h = 19.8m)
    const cX = side * 14.5;
    const cZ = -9.8;
    const cH = 18.8;
    part(root, M.skyGlass, cX, cH / 2, cZ, 2.35, cH - 0.4, 2.35, cyl16);
    for (let y = 0.9; y < cH; y += 1.65) {
      part(root, M.archWhite, cX, y, cZ, 2.68, 0.74, 2.68, cyl16);
    }
    // Signature angled slanted white roof cap on top of cylinder
    const slantCap = part(root, M.archWhite, cX, cH + 0.45, cZ, 5.2, 0.65, 5.2);
    slantCap.rotation.z = side * 0.24;

    // 3. ICONIC SLOPED-GLASS WEDGE SKYSCRAPER (mid-foreground centerpiece, h = 17.6m!)
    const wX = side * 11.4;
    const wZ = -0.2;
    const wH = 17.2;
    // Twin vertical white side cheeks + upper crown bar
    part(root, M.archWhite, wX + side * 1.15, wH / 2, wZ, 2.2, wH, 5.0);
    part(root, M.archWhite, wX - side * 0.1, wH - 1.1, wZ, 4.4, 2.2, 5.2);
    part(root, M.archWhite, wX + side * 0.2, wH + 0.55, wZ, 3.0, 1.1, 3.6);
    // Dramatic slanted diagonal mirror-blue glass face leaning gracefully toward the runner!
    const wedgeGlass = part(root, M.skyGlassBright, wX - side * 0.65, wH * 0.46, wZ + 0.15, 0.28, wH * 0.89, 4.4);
    wedgeGlass.rotation.z = -side * 0.16;
    const wedgeFront = part(root, M.skyGlassBright, wX - side * 0.1, wH * 0.46, wZ + 2.48, 3.2, wH * 0.89, 0.26);
    wedgeFront.rotation.x = -0.14;
    // Sleek dark base glass reflection band
    part(root, M.smokedGlass, wX - side * 0.1, 2.1, wZ + 2.65, 3.15, 3.6, 0.14);

    // 4. MIRROR-BLUE FULL-GLASS CURTAIN-WALL TOWER (back-near, h = 16.5m)
    const mX = side * 15.8;
    const mZ = 6.2;
    part(root, M.skyGlassBright, mX, 8.2, mZ, 6.2, 16.2, 7.2);
    for (let y = 1.6; y <= 16.0; y += 1.6) {
      part(root, M.darkMullion, mX - side * 3.12, y, mZ, 0.08, 0.08, 7.22);
      part(root, M.darkMullion, mX, y, mZ + 3.62, 6.22, 0.08, 0.08);
    }
    part(root, M.archWhite, mX, 16.55, mZ, 5.4, 0.65, 6.2);

    // 5. FOREGROUND DEEP WAFFLE-GRID WHITE TOWER (near road-facing icon, h = 11.0m)
    const gX = side * 9.0;
    const gZ = 8.4;
    const gW = 5.4;
    const gD = 6.2;
    const gH = 10.8;
    part(root, M.smokedGlass, gX, gH / 2, gZ, gW - 0.55, gH - 0.4, gD - 0.55);
    // Deep projecting white structural waffle grid on BOTH road & approach faces
    for (let y = 0.5; y <= gH; y += 1.72) {
      part(root, M.archWhite, gX, y, gZ, gW + 0.08, 0.36, gD + 0.08);
    }
    for (let z = -3.0; z <= 3.01; z += 1.5) {
      part(root, M.archWhite, gX - side * (gW / 2 - 0.16), gH / 2, gZ + z, 0.38, gH, 0.34);
    }
    for (let x = -2.6; x <= 2.61; x += 1.3) {
      part(root, M.archWhite, gX + x, gH / 2, gZ + gD / 2 - 0.16, 0.34, gH, 0.38);
    }
    part(root, M.archWhite, gX, gH + 0.45, gZ, 3.2, 0.9, 3.6);

    // 6. FOREGROUND MODERN WHITE-FRAME GLASS SHOWROOM PAVILION + ROOF BILLBOARD (z = +2.4, x = side * 8.2)
    const sX = side * 8.3;
    const sZ = 2.4;
    const sW = 4.6;
    const sD = 5.0;
    const sH = 4.6;
    part(root, M.skyGlassBright, sX, sH / 2, sZ, sW - 0.5, sH - 0.5, sD - 0.5);
    // Crisp white cube frame (4 posts + heavy flat roof fascia)
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        part(root, M.archWhite, sX + sx * (sW / 2 - 0.25), sH / 2, sZ + sz * (sD / 2 - 0.25), 0.52, sH, 0.52);
      }
    }
    part(root, M.archWhite, sX, sH - 0.28, sZ, sW + 0.16, 0.62, sD + 0.16);
    // Gridded mullions on glass cube
    for (const mz of [-1.2, 0, 1.2]) part(root, M.darkMullion, sX - side * (sW / 2 - 0.22), sH / 2, sZ + mz, 0.08, sH - 0.7, 0.06);
    for (const my of [1.4, 2.8]) part(root, M.darkMullion, sX - side * (sW / 2 - 0.22), my, sZ, 0.08, 0.06, sD - 0.8);
    // Signature crisp white rooftop billboard sign (from Ref 3 foreground!)
    part(root, M.darkMullion, sX - side * 0.9, sH + 0.45, sZ + 0.8, 0.12, 0.9, 0.12);
    part(root, M.darkMullion, sX - side * 0.9, sH + 0.45, sZ - 1.0, 0.12, 0.9, 0.12);
    part(root, M.billboardWhite, sX - side * 0.9, sH + 1.35, sZ - 0.1, 0.16, 1.38, 2.75);

    // 7. FOREGROUND LOW ARCHED-COLONNADE OFFICE BLOCK (z = -7.2, x = side * 8.6, h = 6.2m)
    const aX = side * 8.6;
    const aZ = -7.2;
    part(root, M.archWhite, aX, 3.1, aZ, 4.8, 6.0, 8.8);
    for (let fl = 0; fl < 2; fl++) {
      const y = 1.6 + fl * 2.7;
      for (const bz of [-3.0, -1.0, 1.0, 3.0]) {
        part(root, M.smokedGlass, aX - side * 2.42, y, aZ + bz, 0.12, 1.65, 1.35);
        const arch = part(root, M.smokedGlass, aX - side * 2.42, y + 0.82, aZ + bz, 0.67, 0.12, 0.67, halfCyl);
        arch.rotation.z = Math.PI / 2;
      }
    }
    part(root, M.archWhite, aX, 6.28, aZ, 5.1, 0.36, 9.1);
  }

  // ---------------------------------------------------------------------------
  // REF 4: Rounded-Corner Bauhaus / Streamline Moderne Beige Concrete Studio + Mast
  // ---------------------------------------------------------------------------
  function buildRef4BauhausStudio(root, side) {
    // Sleek dark-slate studio apron
    part(root, M.plazaDark, side * 10.6, 0.10, -1.0, 10.6, 0.20, 24.4);

    // 1. Iconic Bullnose Curved Corner Nose (facing oncoming runner at 3/4 corner!)
    const noseX = side * 8.95;
    const noseZ = 3.8;
    const noseR = 2.65;
    const noseH = 9.4;
    part(root, M.sandStucco, noseX, noseH / 2, noseZ, noseR, noseH, noseR, cyl16);
    // Overhanging curved concrete roofline cornice
    part(root, M.sandStucco, noseX, noseH + 0.18, noseZ, noseR + 0.22, 0.42, noseR + 0.22, cyl16);

    // 3 Stacked Floors of Recessed Deep-Teal Curved Corner Windows around the Bullnose Arc!
    const winFloors = [1.8, 4.75, 7.65];
    const arcAngles = [-0.22, 0.36, 0.94, 1.48]; // spans from +Z front face around corner to road face!
    for (const y of winFloors) {
      for (const a of arcAngles) {
        const wx = noseX - side * Math.sin(a) * (noseR - 0.02);
        const wz = noseZ + Math.cos(a) * (noseR - 0.02);
        const rotY = -side * a;
        // White/light-gray inner reveal frame + deep petroleum-teal Bauhaus glass
        const frame = part(root, M.concreteLt, wx, y, wz, 1.24, 1.66, 0.22);
        frame.rotation.y = rotY;
        const pane = part(root, M.bauhausGlass, wx - side * Math.sin(a) * 0.05, y, wz + Math.cos(a) * 0.05, 1.08, 1.46, 0.18);
        pane.rotation.y = rotY;
      }
      // Subtle horizontal concrete band beneath each curved ribbon
      part(root, M.sandDark, noseX, y - 0.95, noseZ, noseR + 0.05, 0.14, noseR + 0.05, cyl16);
    }
    // Bold vertical beige corner framing fins flanking the curved nose (Ref 4 signature!)
    part(root, M.sandStucco, noseX - side * (noseR + 0.08), noseH / 2 + 0.1, noseZ - 0.7, 0.56, noseH + 0.2, 0.72);
    part(root, M.sandStucco, noseX + side * 0.85, noseH / 2 + 0.1, noseZ + noseR - 0.1, 0.72, noseH + 0.2, 0.56);

    // 2. Long Tapered / Stepped Rear Wing extending back along -Z (z = -10.8 .. +3.8)
    // Built in 3 gently stepping roof sections so the silhouette slopes downward toward the back like Ref 4!
    const wingSections = [
      { z: 0.4, d: 6.8, h: 9.1 },
      { z: -5.2, d: 4.8, h: 8.2 },
      { z: -9.4, d: 4.0, h: 7.3 }
    ];
    for (const sec of wingSections) {
      part(root, M.sandStucco, side * 10.6, sec.h / 2, sec.z, 7.6, sec.h, sec.d);
      // Coping lip
      part(root, M.sandDark, side * 10.6, sec.h + 0.12, sec.z, 7.8, 0.24, sec.d + 0.15);
    }
    // Recessed rectangular Bauhaus windows & signature angled blue awnings along the road wall (x = side * 6.8)
    const wallFace = side * 6.78;
    const winZs = [1.4, -0.5, -2.5, -4.6, -6.8, -8.8, -10.3];
    for (let i = 0; i < winZs.length; i++) {
      const wz = winZs[i];
      const maxFloors = i < 4 ? [2.1, 5.0, 7.4] : [2.1, 4.9];
      for (const wy of maxFloors) {
        part(root, M.concreteLt, wallFace - side * 0.03, wy, wz, 0.12, 1.32, 1.05);
        part(root, M.bauhausGlass, wallFace - side * 0.06, wy, wz, 0.08, 1.12, 0.88);
      }
      // Angled blue sun-awnings on lower & mid windows (Ref 4's distinctive side-wall blue hoods!)
      if (i % 2 === 1) {
        const awning = part(root, M.awningBlue, wallFace - side * 0.36, 1.95, wz, 0.76, 0.12, 1.18);
        awning.rotation.z = side * 0.62;
      }
      if (i === 2) {
        const upperAwning = part(root, M.awningBlue, wallFace - side * 0.32, 5.35, wz, 0.68, 0.12, 1.12);
        upperAwning.rotation.z = side * 0.58;
      }
    }

    // 3. Stepped Rear Right/Side Block (+Z side behind the curved corner) + Rooftop Clerestory Penthouse
    part(root, M.sandStucco, side * 13.0, 4.8, 4.6, 5.2, 9.6, 6.2);
    // Neat stacked square windows on the +Z approach wall
    for (const wy of [4.8, 7.6]) {
      part(root, M.concreteLt, side * 12.2, wy, 7.74, 1.38, 1.46, 0.14);
      part(root, M.bauhausGlass, side * 12.2, wy, 7.78, 1.18, 1.26, 0.10);
    }
    // Rooftop silver-white roof membrane & stepped horizontal clerestory strip windows
    part(root, M.concreteLt, noseX + side * 0.4, noseH + 0.36, noseZ - 0.6, 4.4, 0.18, 4.4);
    part(root, M.sandStucco, side * 11.4, noseH + 0.9, 1.2, 5.6, 1.5, 5.8);
    part(root, M.bauhausGlass, side * 11.0, noseH + 0.9, 4.14, 2.8, 0.85, 0.12);
    part(root, M.bauhausGlass, side * 8.58, noseH + 0.9, 1.2, 0.12, 0.85, 3.2);

    // 4. SIGNATURE DARK-NAVY ANGLED LOWER ANNEX BLOCK (+Z front corner, matching Ref 4!)
    const anxX = side * 12.4;
    const anxZ = 8.4;
    part(root, M.navyAnnex, anxX, 2.0, anxZ, 4.6, 4.0, 2.8);
    // Sloped mono-pitch dark overhang cap
    const anxRoof = part(root, M.darkMullion, anxX, 4.15, anxZ, 4.95, 0.24, 3.1);
    anxRoof.rotation.z = -side * 0.18;
    // Tiny crimson indicator lamp dot on dark navy facade (exact Ref 4 detail!)
    part(root, M.redBeacon, anxX, 3.25, anxZ + 1.44, 0.18, 0.18, 0.10, sphere);

    // 5. SIGNATURE ROOFTOP COMMUNICATIONS MAST / ANTENNA SPIRE (y = 9.6 .. 19.6m!)
    const mastX = noseX - side * 0.35;
    const mastZ = noseZ + 0.45;
    part(root, M.darkMullion, mastX, noseH + 0.55, mastZ, 0.44, 0.44, 0.44, cyl12);
    part(root, M.mastSteel, mastX, noseH + 5.2, mastZ, 0.14, 9.6, 0.14, cyl12);
    part(root, M.mastSteel, mastX, noseH + 9.8, mastZ, 0.06, 2.2, 0.06, cyl12);
    // Angled downward triangular cross-arms / guy struts (Ref 4's unmistakable silhouette!)
    for (const [ay, armLen] of [[noseH + 8.0, 2.4], [noseH + 5.2, 2.1]]) {
      for (const dir of [-1, 1]) {
        const arm = part(root, M.mastSteel, mastX + dir * armLen * 0.32, ay - armLen * 0.36, mastZ, 0.08, armLen, 0.08, cyl12);
        arm.rotation.z = dir * 0.56;
      }
      const armZ = part(root, M.mastSteel, mastX, ay - armLen * 0.36, mastZ + armLen * 0.30, 0.08, armLen, 0.08, cyl12);
      armZ.rotation.x = -0.52;
    }
  }

  // ---------------------------------------------------------------------------
  // REF 5: Futuristic S-Curved White-Ribbon & Smoked-Glass Innovation Center
  // ---------------------------------------------------------------------------
  function buildRef5CurvedRibbon(root, side) {
    // Generate smooth S-wave centerline running along Z from -11.4 to +11.4.
    // Near the front (+Z) it bows gracefully toward the road, sweeps inward in the middle
    // creating a welcoming concave courtyard cove for the 1-story glass lobby pod, then curves out again!
    const samples = 16;
    const zMin = -11.2;
    const zMax = 11.2;
    const spine = [];
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const z = zMin + (zMax - zMin) * t;
      // S-wave offset in X (positive = further from road, smaller = closer to road)
      const wave = 11.6 + 2.35 * Math.sin((t - 0.52) * Math.PI * 1.45);
      spine.push([side * wave, z]);
    }

    // Build closed capsule polygon around the S-wave spine with given half-thickness `halfW`
    function ribbonPoly(halfW) {
      const leftSide = [];
      const rightSide = [];
      for (let i = 0; i < spine.length; i++) {
        const pPrev = spine[Math.max(0, i - 1)];
        const pNext = spine[Math.min(spine.length - 1, i + 1)];
        const dx = pNext[0] - pPrev[0];
        const dz = pNext[1] - pPrev[1];
        const len = Math.hypot(dx, dz) || 1;
        // Normal perpendicular to spine in XZ plane
        const nx = -dz / len;
        const nz = dx / len;
        leftSide.push([spine[i][0] + nx * halfW, spine[i][1] + nz * halfW]);
        rightSide.push([spine[i][0] - nx * halfW, spine[i][1] - nz * halfW]);
      }
      // Smooth rounded semicircular endcaps at zMax and zMin
      const capEnd = [];
      const capStart = [];
      const endP = spine[spine.length - 1];
      const startP = spine[0];
      const endAng = Math.atan2(leftSide[leftSide.length - 1][1] - endP[1], leftSide[leftSide.length - 1][0] - endP[0]);
      const startAng = Math.atan2(rightSide[0][1] - startP[1], rightSide[0][0] - startP[0]);
      for (let k = 1; k <= 4; k++) {
        const a = endAng - (k / 5) * Math.PI;
        capEnd.push([endP[0] + Math.cos(a) * halfW, endP[1] + Math.sin(a) * halfW]);
        const b = startAng - (k / 5) * Math.PI;
        capStart.push([startP[0] + Math.cos(b) * halfW, startP[1] + Math.sin(b) * halfW]);
      }
      return [...leftSide, ...capEnd, ...rightSide.reverse(), ...capStart];
    }

    // 1. Sculpted Rounded S-Curve Concrete Plaza Island Base (y = 0 .. 0.24)
    const plazaGeo = makeExtrudedXZ(ribbonPoly(4.55), 0.24, 4);
    addCustom(root, M.plazaGray, plazaGeo, 0, 0, 0);

    // 2. Recessed Dark Smoked-Bronze Curved Curtain Wall Core (y = 0.24 .. 12.6)
    const glassGeo = makeExtrudedXZ(ribbonPoly(2.52), 12.35, 4);
    addCustom(root, M.smokedGlass, glassGeo, 0, 0.24, 0);

    // 3. Warm Golden Architectural Interior Light Strips peeking out along every floor!
    const floorYs = [2.75, 5.25, 7.75, 10.25, 12.75];
    for (let f = 0; f < 4; f++) {
      const glowY = floorYs[f] - 0.56;
      const glowGeo = makeExtrudedXZ(ribbonPoly(2.58), 0.34, 4);
      addCustom(root, M.warmGlow, glowGeo, 0, glowY, 0);
    }

    // 4. Five Sweeping Pure-White Cantilevered Ribbon Floor Slabs + Balcony Glass Guardrails!
    for (let f = 0; f < floorYs.length; f++) {
      const y = floorYs[f];
      const slabGeo = makeExtrudedXZ(ribbonPoly(3.26), 0.44, 4);
      addCustom(root, M.archWhite, slabGeo, 0, y, 0);
      if (f < floorYs.length - 1) {
        // Sleek curved balcony parapet edge
        const railGeo = makeExtrudedXZ(ribbonPoly(3.22), 0.38, 4);
        addCustom(root, M.balconyRail, railGeo, 0, y + 0.44, 0);
      } else {
        // Crisp elevated white rooftop perimeter rim
        const rimGeo = makeExtrudedXZ(ribbonPoly(3.28), 0.42, 4);
        addCustom(root, M.archWhite, rimGeo, 0, y + 0.44, 0);
        const roofInset = makeExtrudedXZ(ribbonPoly(2.70), 0.14, 4);
        addCustom(root, M.concreteLt, roofInset, 0, y + 0.44, 0);
      }
    }

    // 5. Fine Vertical Dark Mullion Fins following the road-facing S-curve glass wall
    for (let i = 1; i < spine.length - 1; i++) {
      const pPrev = spine[i - 1];
      const pNext = spine[i + 1];
      const dx = pNext[0] - pPrev[0];
      const dz = pNext[1] - pPrev[1];
      const len = Math.hypot(dx, dz) || 1;
      // Road-facing normal points toward X = 0
      let nx = -dz / len;
      let nz = dx / len;
      if (nx * side > 0) { nx = -nx; nz = -nz; }
      const mx = spine[i][0] + nx * 2.60;
      const mz = spine[i][1] + nz * 2.60;
      const fin = part(root, M.darkMullion, mx, 6.45, mz, 0.14, 12.2, 0.10);
      fin.rotation.y = Math.atan2(dx, dz);
    }

    // 6. Nested 1-Story Rounded Lobby Pavilion protruding into the concave S-curve cove!
    const lobX = side * 9.85;
    const lobZ = 4.9;
    // Rounded oblong lobby footprint
    const lobPts = [];
    for (let k = 0; k < 14; k++) {
      const a = (k / 14) * Math.PI * 2;
      lobPts.push([lobX + Math.cos(a) * 2.4, lobZ + Math.sin(a) * 4.2]);
    }
    addCustom(root, M.smokedGlass, makeExtrudedXZ(lobPts, 2.52, 4), 0, 0.24, 0);
    // Warm glow band inside the lobby pod
    addCustom(root, M.warmGlow, makeExtrudedXZ(lobPts.map(([x, z]) => [lobX + (x - lobX) * 1.01, lobZ + (z - lobZ) * 1.01]), 0.28, 4), 0, 2.30, 0);
    // Crisp overhanging pure-white lobby roof slab
    const lobRoofPts = lobPts.map(([x, z]) => [lobX + (x - lobX) * 1.12, lobZ + (z - lobZ) * 1.09]);
    addCustom(root, M.archWhite, makeExtrudedXZ(lobRoofPts, 0.42, 4), 0, 2.75, 0);
  }

  // Dispatcher for the 5 reference buildings
  function placeBuilding(root, side, style) {
    if (style === 0) buildRef1ClassicTower(root, side);
    else if (style === 1) buildRef2CorporateComplex(root, side);
    else if (style === 2) buildRef3SkyscraperCluster(root, side);
    else if (style === 3) buildRef4BauhausStudio(root, side);
    else buildRef5CurvedRibbon(root, side);
  }

  function makeBannerMat(kind) {
    if (typeof document === 'undefined') return kind === 'blue' ? M.bannerBlue : M.bannerCoral;
    const cv = document.createElement('canvas');
    cv.width = 256; cv.height = 512;
    const ctx = cv.getContext('2d');
    if (!ctx) return kind === 'blue' ? M.bannerBlue : M.bannerCoral;
    const g = ctx.createLinearGradient(0, 0, 0, 512);
    if (kind === 'blue') {
      g.addColorStop(0, '#0284c7');
      g.addColorStop(0.5, '#0369a1');
      g.addColorStop(1, '#0c4a6e');
    } else {
      g.addColorStop(0, '#f43f5e');
      g.addColorStop(0.5, '#e11d48');
      g.addColorStop(1, '#9f1239');
    }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 512);

    // Glowing electric border with stylized tech corners
    const borderGlow = kind === 'blue' ? '#00e5ff' : '#fb7185';
    ctx.strokeStyle = borderGlow;
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, 236, 492);

    // Corner brackets
    ctx.lineWidth = 7;
    ctx.strokeStyle = '#ffffff';
    for (const [cx, cy, dx, dy] of [[10, 10, 24, 24], [246, 10, -24, 24], [10, 502, 24, -24], [246, 502, -24, -24]]) {
      ctx.beginPath();
      ctx.moveTo(cx + dx, cy);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx, cy + dy);
      ctx.stroke();
    }

    // High-impact cyber tech branding
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    if (kind === 'blue') {
      ctx.font = '900 32px system-ui, sans-serif';
      ctx.fillText('LMSK', 128, 110);
      ctx.font = '800 24px system-ui, sans-serif';
      ctx.fillText('AI & ROBOTICS', 128, 150);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(48, 175, 160, 3);
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 22px system-ui, sans-serif';
      ctx.fillText('INNOVATION', 128, 230);
      ctx.fillText('TECH CAMPUS', 128, 275);
      ctx.font = '900 28px system-ui, sans-serif';
      ctx.fillStyle = '#7dd3fc';
      ctx.fillText('FUTURE', 128, 360);
    } else {
      ctx.font = '900 32px system-ui, sans-serif';
      ctx.fillText('LIFE RUSH', 128, 110);
      ctx.font = '800 22px system-ui, sans-serif';
      ctx.fillText('AUTONOMOUS', 128, 150);
      ctx.fillStyle = '#fda4af';
      ctx.fillRect(48, 175, 160, 3);
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 22px system-ui, sans-serif';
      ctx.fillText('CYBER CITY', 128, 230);
      ctx.fillText('NEXT GEN', 128, 275);
      ctx.font = '900 28px system-ui, sans-serif';
      ctx.fillStyle = '#fecdd3';
      ctx.fillText('VELOCITY', 128, 360);
    }

    const tex = new CanvasTexture(cv);
    tex.colorSpace = SRGBColorSpace;
    return new MeshStandardMaterial({
      map: tex,
      emissiveMap: tex,
      emissive: 0xffffff,
      emissiveIntensity: 0.35,
      roughness: 0.30
    });
  }
  const blueBannerMat = makeBannerMat('blue');
  const coralBannerMat = makeBannerMat('coral');

  // Modern IT Park Boulevard Streetscape (Image 5 continuous cyan-lit guardrails, hanging Learn/Code banners, lush trees)
  function addSideStreetscape(root, side, kind) {
    // Solid deep waterfront concrete foundation skirt beneath sidewalk & buildings so coastal buildings NEVER float over sea!
    part(root, M.plazaGray, side * 13.7, -3.75, 0, 19.8, 7.6, 32.4);
    // Sleek bright granite sidewalk & curb bordering the 3-lane road
    part(root, M.plazaGray, side * 4.65, 0.11, 0, 2.1, 0.20, 32);
    part(root, M.archWhite, side * 3.64, 0.14, 0, 0.18, 0.24, 32);
    // Manicured emerald landscape turf strip behind the buildings/sidewalk
    part(root, M.lawnGreen, side * 14.5, 0.04, 0, 17.6, 0.08, 32);
    part(root, M.archWhite, side * 5.75, 0.15, 0, 0.16, 0.22, 32);

    // EXACT IMAGE 5: Sleek Metallic Low Roadside Guardrail with Continuous Glowing Neon-Cyan Horizontal Rail Tube!
    part(root, M.railSteel, side * 4.95, 0.78, 0, 0.16, 0.14, 32);
    part(root, M.cyanRailLed, side * 4.88, 0.56, 0, 0.12, 0.12, 32);
    for (let rz = -14; rz <= 14; rz += 4.0) {
      part(root, M.railSteel, side * 4.95, 0.48, rz, 0.30, 0.72, 0.30);
      part(root, M.cyanRailLed, side * 4.82, 0.42, rz, 0.14, 0.26, 0.32);
    }

    // Modern Sleek Silver LED Streetlamps + Vibrant "Learn Code Build Future" Vertical Hanging Banners (Images 4 & 5!)
    for (const lz of [-11.5, 0, 11.5]) {
      const lx = side * 5.46;
      part(root, M.railSteel, lx, 0.28, lz, 0.28, 0.36, 0.28, cyl12);
      part(root, M.railSteel, lx, 3.05, lz, 0.11, 5.8, 0.11, cyl12);
      part(root, M.railSteel, lx - side * 0.50, 5.90, lz, 1.06, 0.10, 0.14);
      part(root, M.lampGlow, lx - side * 0.82, 5.82, lz, 0.62, 0.09, 0.24);
      const banMat = side === 1 ? blueBannerMat : coralBannerMat;
      part(root, M.railSteel, lx - side * 0.48, 4.78, lz, 0.90, 0.06, 0.06);
      part(root, banMat, lx - side * 0.48, 3.88, lz, 0.82, 1.72, 0.06);
    }

    // Clean architectural concrete planter boxes with lush bright greenery at section joints
    for (const pz of [-14.2, 14.2]) {
      part(root, M.archWhite, side * 6.0, 0.32, pz, 1.15, 0.50, 1.85);
      part(root, M.hedgeDark, side * 6.0, 0.66, pz, 0.96, 0.36, 1.62);
    }

    // Lush emerald ornamental roadside trees in the open plaza bays between buildings
    const treeZ = (kind % 2 === 0 ? 14.6 : -14.6) * side;
    const th = 5.2 + (kind % 2) * 0.65;
    roadsideTree(root, side * 7.6, treeZ, th, kind % 2 === 1, 0);
    roadsideTree(root, side * 7.6, treeZ, th, kind % 2 === 1, Math.PI / 2);
  }

  // 6 curated pairs across the 5 reference landmarks so every block showcases iconic architecture
  const PAIRINGS = [
    [4, 0], // S-Curved White-Ribbon Hub (Ref 5) + Classic Neoclassical Stone Tower (Ref 1)
    [1, 2], // Corporate Exoskeleton Complex (Ref 2) + Mirror-Blue Skyscraper Cluster (Ref 3)
    [3, 4], // Rounded Bauhaus Studio + Mast (Ref 4) + S-Curved White-Ribbon Hub (Ref 5)
    [2, 1], // Mirror-Blue Skyscraper Cluster (Ref 3) + Corporate Exoskeleton Complex (Ref 2)
    [0, 3], // Classic Neoclassical Stone Tower (Ref 1) + Rounded Bauhaus Studio + Mast (Ref 4)
    [1, 0]  // Corporate Exoskeleton Complex (Ref 2) + Classic Neoclassical Stone Tower (Ref 1)
  ];

  const bakedSideCache = new Map();
  function bakeSide(side, style, kind) {
    const key = `${side}:${style}:${kind % 2}`;
    if (!bakedSideCache.has(key)) {
      const root = new Group();
      placeBuilding(root, side, style);
      addSideStreetscape(root, side, kind % 2);
      const merged = bakeGroup(root);
      // Skyscrapers sit along roadside flanks outside the runner lane; skipping shadow-pass rendering
      // cuts GPU shadow draw calls by ~80% while runner, chaser, vehicles & obstacles stay shadowed.
      for (const mesh of merged.children) {
        mesh.castShadow = false;
        mesh.receiveShadow = true;
      }
      bakedSideCache.set(key, merged);
    }
    return bakedSideCache.get(key).clone();
  }

  function buildTemplate(kind) {
    const [leftStyle, rightStyle] = PAIRINGS[kind % PAIRINGS.length];
    const group = new Group();
    const left = bakeSide(-1, leftStyle, kind);
    left.name = 'leftSide';
    const right = bakeSide(1, rightStyle, kind);
    right.name = 'rightSide';
    group.add(left, right);
    return group;
  }

  const templates = Array.from({ length: 6 }, (_, kind) => buildTemplate(kind));
  const slots = Array.from({ length: CAMPUS_SLOTS }, () => {
    const root = new Group();
    scene.add(root);
    return { root, kind: -1 };
  });
  const cache = Array.from({ length: CAMPUS_SLOTS }, () => new Map());

  let lastShimmerTick = -1;
  return (state, weather) => {
    const active = state.map === 'itpark';
    const ultraLow = Boolean(scene.userData?.ultraLow);
    const lowEnd = Boolean(scene.userData?.lowEnd);
    if (active) {
      const night = weather?.night || 0;
      const t = state.time || 0;
      const shimmerBucket = ultraLow ? Math.floor(t * 6) : -1;
      if (!ultraLow || shimmerBucket !== lastShimmerTick) {
        lastShimmerTick = shimmerBucket;
        const pulse = Math.sin(t * 2.4) * 0.5 + 0.5;
        const shimmer = Math.sin(t * 1.35) * 0.5 + 0.5;
        const ultraGlassBoost = scene.userData?.ultraQuality ? 0.22 : 0;
        // Live animated skyline shimmer: glowing cyan guardrails, warm golden interior windows, & rooftop beacons
        M.skyGlass.emissiveIntensity = 0.16 + ultraGlassBoost + shimmer * 0.08 + night * 0.45;
        M.skyGlassBright.emissiveIntensity = 0.18 + ultraGlassBoost + pulse * 0.10 + night * 0.50;
        M.cyanGlass.emissiveIntensity = 0.16 + ultraGlassBoost + pulse * 0.10 + night * 0.48;
        M.smokedGlass.emissiveIntensity = 0.16 + ultraGlassBoost + shimmer * 0.08 + night * 0.50;
        M.bauhausGlass.emissiveIntensity = 0.14 + ultraGlassBoost + shimmer * 0.08 + night * 0.42;
        M.warmGlow.emissiveIntensity = 0.72 + ultraGlassBoost * 1.4 + shimmer * 0.24 + night * 0.55;
        M.lampGlow.emissiveIntensity = 0.68 + pulse * 0.18 + night * 0.85;
        M.cyanRailLed.emissiveIntensity = 1.15 + pulse * 0.48 + night * 0.85;
        M.redBeacon.emissiveIntensity = 0.6 + (Math.sin(t * 4.5) > 0 ? 1.4 : 0.1);
        blueBannerMat.emissiveIntensity = 0.35 + pulse * 0.20 + night * 0.30;
        coralBannerMat.emissiveIntensity = 0.35 + (1 - pulse) * 0.20 + night * 0.30;
      }
    }
    const isTouch = Boolean(scene.userData?.isTouch);
    const ultraFar = ultraLow ? 142 : lowEnd ? 195 : isTouch ? 265 : Infinity;
    const rearCut = (ultraLow || isTouch) ? 26 : Infinity;
    // Inside the Metro Tunnel's rock cavern, cull unseen exterior skyscraper towers on mobile except near entry & final 165m exit vista.
    const insideUnderpass = (ultraLow || isTouch) && state.activeBranch === 'underpass' && state.distance >= (state.branchStart || 0) + 18 && state.distance <= (state.branchEnd || 0) - 165;
    for (let slot = 0; slot < slots.length; slot++) {
      const item = slots[slot];
      if (!active || insideUnderpass) { item.root.visible = false; continue; }
      const anchor = campusAnchor(slot, state.distance);
      if (anchor - state.distance > ultraFar || state.distance - anchor > rearCut) { item.root.visible = false; continue; }
      const kind = campusKind(anchor);
      const clr = branchForkClearance(anchor, state);
      if (clr.hide) { item.root.visible = false; continue; }
      item.root.visible = true;
      if (item.kind !== kind) {
        item.root.clear();
        if (!cache[slot].has(kind)) cache[slot].set(kind, templates[kind].clone());
        item.root.add(cache[slot].get(kind));
        item.kind = kind;
      }
      const tpl = item.root.children[0];
      if (tpl && tpl.children.length >= 2) {
        tpl.children[0].position.x = -clr.spreadX;
        tpl.children[1].position.x = clr.spreadX;
      }
      item.root.position.set(curveRelX(anchor, state), curveRelY(anchor, state) + clr.dropY, state.distance - anchor);
      item.root.rotation.y = state.activeBranch ? -Math.atan(curveSlopeAt(anchor, state)) : 0;
    }
  };
}
