import {
  CanvasTexture, Color, TextureLoader, RepeatWrapping, SRGBColorSpace, EquirectangularReflectionMapping,
  Mesh, MeshStandardMaterial, PlaneGeometry, DoubleSide, Group, InstancedMesh, Object3D, DynamicDrawUsage
} from './vendor/three.module.js';
import { roadCurveX, roadCurveY, roadCurveSlope, curveSlopeAt, curveRelX, curveRelY } from './campus-layout.js';
import { wetCollegeAsphalt } from './college-rain3d.js';
import { hasCollegeRain, sceneWeather } from './weather.js';
export { roadCurveX, roadCurveY, roadCurveSlope, curveSlopeAt, curveRelX, curveRelY };

const textures = new Map();
function texture(name, color = true) {
  if (typeof document === 'undefined') return null;
  if (!textures.has(name)) {
    const map = new TextureLoader().load(new URL('./assets/street/' + name + '.webp', import.meta.url).href);
    if (color) map.colorSpace = SRGBColorSpace;
    map.wrapS = map.wrapT = RepeatWrapping;
    map.anisotropy = 8;
    textures.set(name, map);
  }
  return textures.get(name);
}

export function streetSurfaces(scene, box) {
  const environment = texture('campus-light');
  if (environment) {
    environment.mapping = EquirectangularReflectionMapping;
    scene.environment = environment;
  }
  const scrolling = [];
  const schoolGroup = new Group();
  const collegeGroup = new Group();
  collegeGroup.visible = false;
  scene.add(schoolGroup, collegeGroup);

  const STRIP_LEN = 380, STRIP_Z = -155;
  function strip(name, x, y, width, height, span, across, tint) {
    const surface = box(schoolGroup, tint, x, y, STRIP_Z, width, height, STRIP_LEN);
    const map = texture(name);
    if (map && !scrolling.some(entry => entry.map === map)) {
      map.repeat.set(across, STRIP_LEN / span);
      scrolling.push({map, span});
    }
    surface.material = new MeshStandardMaterial({color:tint, map, roughness:.96});
    return surface.material;
  }
  strip('turf', 0, -.34, 280, .3, 5, 56, 0xd7cfac);
  box(schoolGroup, 0x9b8e75, 0, -.12, STRIP_Z, 14, .3, STRIP_LEN);
  const road = strip('asphalt', 0, .02, 7.1, .14, 16, 1, 0xffffff);
  strip('pavers', -4.4, .06, 1.65, .22, 3.3, 1, 0xffffff);
  strip('pavers', 4.4, .06, 1.65, .22, 3.3, 1, 0xffffff);
  const patches = texture('road-roughness', false);
  if (patches) {
    patches.repeat.set(1, STRIP_LEN / 16);
    scrolling.push({map:patches, span:16});
    road.roughnessMap = patches;
    road.bumpMap = road.map;
    road.bumpScale = .018;
  }

  // Subdivided Kodaikanal-style curving road ribbons for College mode
  const collegeRibbons = [];
  function curvedStrip(mat, xOffset, yOffset, width, segsZ = 72, segsX = 1) {
    const geom = new PlaneGeometry(width, 300, segsX, segsZ);
    geom.rotateX(-Math.PI / 2);
    geom.translate(xOffset, yOffset, -115);
    const pos = geom.attributes.position;
    const base = new Float32Array(pos.array);
    const mesh = new Mesh(geom, mat);
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    collegeGroup.add(mesh);
    collegeRibbons.push({ geom, pos, base });
    return mesh;
  }
  const turfMat = new MeshStandardMaterial({ color: 0x77966c, map: texture('turf'), roughness: .98 });
  const gravelMat = new MeshStandardMaterial({ color: 0x5c635f, roughness: .95 });
  const railMat = new MeshStandardMaterial({ color: 0x627578, roughness: .48, metalness: .38 });
  const curbMat = new MeshStandardMaterial({ color: 0xc1c7c2, roughness: .75 });
  const paversMat = new MeshStandardMaterial({ color: 0xd0cfc5, map: texture('pavers'), roughness: .9 });
  const collegeRoadMat = new MeshStandardMaterial({color:0x969b9c,map:road.map,roughness:.95,roughnessMap:patches,bumpMap:road.map,bumpScale:.018});
  const roadDistance = {value:0}, stormClock = {value:0}, wetStrength = {value:0}, rainbowStrength = {value:0};
  wetCollegeAsphalt(collegeRoadMat, roadDistance, stormClock, wetStrength, rainbowStrength);
  const soakedAsphalt = new Color(0x626f81);
  const paintMat = new MeshStandardMaterial({color:0xe8e7d8,roughness:.89,emissive:0x11120e,emissiveIntensity:.08});
  curvedStrip(turfMat, 0, -.20, 240, 36, 4);
  curvedStrip(gravelMat, 0, -.04, 13.6, 54, 1);
  curvedStrip(collegeRoadMat, 0, .09, 7.1, 54, 1);
  curvedStrip(paintMat, -3.36, .104, .075, 54, 1);
  curvedStrip(paintMat, 3.36, .104, .075, 54, 1);
  curvedStrip(paversMat, -4.4, .14, 1.65, 54, 1);
  curvedStrip(paversMat, 4.4, .14, 1.65, 54, 1);
  // Mountain ghat guardrails & concrete curbs along both edges of the College road
  curvedStrip(curbMat, -5.28, .22, .28, 54, 1);
  curvedStrip(curbMat, 5.28, .22, .28, 54, 1);
  curvedStrip(railMat, -5.32, .48, .18, 54, 1);
  curvedStrip(railMat, 5.32, .48, .18, 54, 1);

  // Two staggered lane dividers follow the same curve as the road.
  const dashGeometry = new PlaneGeometry(.075, 2.45);
  dashGeometry.rotateX(-Math.PI / 2);
  const dashes = new InstancedMesh(dashGeometry, paintMat, 84);
  dashes.instanceMatrix.setUsage(DynamicDrawUsage);
  dashes.frustumCulled = false;
  collegeGroup.add(dashes);
  const dashTransform = new Object3D();

  const dry = new Color(0xffffff), wet = new Color(0x9099a1);
  // High-Tech Expressway Boulevard: Ultra-Realistic Dark Asphalt Tarmac, Crisp Highway Markings & LED Studs
  const itParkGroup = new Group();
  itParkGroup.visible = false;
  scene.add(itParkGroup);
  let techDeckTex = null;
  let techWalkTex = null;
  if (typeof document !== 'undefined') {
    // 1. High-Detail Dark Asphalt Expressway Tarmac (512 x 1024)
    const cv = document.createElement('canvas');
    cv.width = 512; cv.height = 1024;
    const ctx = cv.getContext('2d');
    if (ctx) {
      // Base dark charcoal asphalt with natural road crown gradient
      const roadGrad = ctx.createLinearGradient(0, 0, 512, 0);
      roadGrad.addColorStop(0, '#151921');
      roadGrad.addColorStop(0.12, '#1c2029');
      roadGrad.addColorStop(0.5, '#222733');
      roadGrad.addColorStop(0.88, '#1c2029');
      roadGrad.addColorStop(1, '#151921');
      ctx.fillStyle = roadGrad;
      ctx.fillRect(0, 0, 512, 1024);

      // Fine aggregate stone chips and polymer bitumen texture flecks
      for (let i = 0; i < 4800; i++) {
        const ax = (Math.sin(i * 12.9898) * 43758.5453 % 1 + 1) * 256;
        const ay = (Math.cos(i * 78.233) * 43758.5453 % 1 + 1) * 512;
        const shade = (i % 3 === 0) ? '#11141a' : (i % 3 === 1) ? '#2d3442' : '#3d4657';
        ctx.fillStyle = shade;
        ctx.globalAlpha = 0.28;
        ctx.fillRect(Math.floor(ax), Math.floor(ay), (i % 5 === 0) ? 2 : 1, (i % 7 === 0) ? 2 : 1);
      }
      ctx.globalAlpha = 1.0;

      // Smooth polished wheel-path tracks along the 3 runner lanes (tire-burnished tarmac specular sheen)
      // Left lane: center x=85; Center lane: center x=256; Right lane: center x=427
      const tireTracks = [54, 116, 225, 287, 396, 458];
      ctx.fillStyle = 'rgba(255, 255, 255, 0.045)';
      for (const tx of tireTracks) {
        ctx.fillRect(tx - 15, 0, 30, 1024);
      }

      // Outer shoulder solid lines (crisp bright white with yellow curb chevrons)
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(16, 0, 6, 1024);
      ctx.fillRect(490, 0, 6, 1024);

      // Curb edge safety chevrons (alternating yellow #f59e0b & dark charcoal #1a1e24)
      for (let y = 0; y < 1024; y += 32) {
        ctx.fillStyle = (Math.floor(y / 32) % 2 === 0) ? '#f59e0b' : '#181c24';
        ctx.fillRect(0, y, 14, 32);
        ctx.fillRect(498, y, 14, 32);
      }

      // 3-Lane dividers: crisp dashed white highway stripes (left: x=171, right: x=341)
      ctx.fillStyle = '#ffffff';
      for (let y = 0; y < 1024; y += 96) {
        ctx.beginPath();
        ctx.roundRect(168, y + 8, 6, 56, 3);
        ctx.roundRect(338, y + 8, 6, 56, 3);
        ctx.fill();
      }

      // Painted forward expressway directional arrows in all 3 lanes (at y=200 and y=712)
      function drawHighwayArrow(cx, cy) {
        ctx.fillStyle = 'rgba(248, 250, 252, 0.88)';
        // Stem
        ctx.fillRect(cx - 3, cy - 8, 6, 44);
        // Arrowhead
        ctx.beginPath();
        ctx.moveTo(cx, cy - 28);
        ctx.lineTo(cx - 15, cy - 6);
        ctx.lineTo(cx - 5, cy - 6);
        ctx.lineTo(cx - 5, cy - 8);
        ctx.lineTo(cx + 5, cy - 8);
        ctx.lineTo(cx + 5, cy - 6);
        ctx.lineTo(cx + 15, cy - 6);
        ctx.closePath();
        ctx.fill();
      }
      for (const laneX of [85, 256, 427]) {
        drawHighwayArrow(laneX, 210);
        drawHighwayArrow(laneX, 722);
      }

      // Transverse pedestrian / speed rumble bar markings across the highway
      ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
      for (let y = 470; y <= 530; y += 12) {
        ctx.fillRect(28, y, 456, 6);
      }

      // Glowing solar LED road studs (Cat's Eyes / Lane Reflectors) along dashed dividers
      for (let y = 0; y < 1024; y += 96) {
        for (const sx of [171, 341]) {
          // Dark stud housing
          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.arc(sx, y + 8, 4.5, 0, Math.PI * 2);
          ctx.fill();
          // Glowing core (cyan/amber alternating)
          const studColor = (Math.floor(y / 96) % 2 === 0) ? '#00e5ff' : '#fbbf24';
          ctx.fillStyle = studColor;
          ctx.beginPath();
          ctx.arc(sx, y + 8, 2.5, 0, Math.PI * 2);
          ctx.fill();
          // Halo glow
          const halo = ctx.createRadialGradient(sx, y + 8, 1, sx, y + 8, 7);
          halo.addColorStop(0, studColor);
          halo.addColorStop(1, 'rgba(0, 229, 255, 0)');
          ctx.fillStyle = halo;
          ctx.beginPath();
          ctx.arc(sx, y + 8, 7, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      techDeckTex = new CanvasTexture(cv);
      techDeckTex.colorSpace = SRGBColorSpace;
      techDeckTex.wrapS = techDeckTex.wrapT = RepeatWrapping;
      techDeckTex.repeat.set(1, STRIP_LEN / 16);
      techDeckTex.anisotropy = 8;
      scrolling.push({ map: techDeckTex, span: 16 });
    }

    // 2. High-Tech Architectural Granite Sidewalk Pavers (256 x 256)
    const wcv = document.createElement('canvas');
    wcv.width = 256; wcv.height = 256;
    const wctx = wcv.getContext('2d');
    if (wctx) {
      wctx.fillStyle = '#cbd5e1';
      wctx.fillRect(0, 0, 256, 256);
      // Subtle granite grain
      for (let i = 0; i < 900; i++) {
        const gx = Math.random() * 256;
        const gy = Math.random() * 256;
        wctx.fillStyle = (i % 2 === 0) ? '#94a3b8' : '#e2e8f0';
        wctx.globalAlpha = 0.22;
        wctx.fillRect(gx, gy, 1, 1);
      }
      wctx.globalAlpha = 1.0;
      // Paver tile grid seams with chamfered joints
      wctx.strokeStyle = '#94a3b8';
      wctx.lineWidth = 2.5;
      for (let x = 0; x <= 256; x += 64) {
        wctx.beginPath(); wctx.moveTo(x, 0); wctx.lineTo(x, 256); wctx.stroke();
      }
      for (let y = 0; y <= 256; y += 64) {
        wctx.beginPath(); wctx.moveTo(0, y); wctx.lineTo(256, y); wctx.stroke();
      }
      // Inner tile bevel highlights
      wctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      wctx.lineWidth = 1.2;
      for (let x = 0; x < 256; x += 64) {
        for (let y = 0; y < 256; y += 64) {
          wctx.strokeRect(x + 2, y + 2, 60, 60);
        }
      }
      techWalkTex = new CanvasTexture(wcv);
      techWalkTex.colorSpace = SRGBColorSpace;
      techWalkTex.wrapS = techWalkTex.wrapT = RepeatWrapping;
      techWalkTex.repeat.set(2, STRIP_LEN / 8);
      techWalkTex.anisotropy = 8;
      scrolling.push({ map: techWalkTex, span: 8 });
    }
  }

  // Polished wet-look tarmac sheen: low roughness, high environment specular reflections
  const techDeckMat = new MeshStandardMaterial({
    color: 0xffffff, map: techDeckTex, roughness: 0.22, metalness: 0.18, envMapIntensity: 1.65
  });
  const techWalkMat = new MeshStandardMaterial({
    color: 0xffffff, map: techWalkTex, roughness: 0.44, metalness: 0.12
  });
  const techTurfMat = new MeshStandardMaterial({ color: 0x16a34a, roughness: 0.88 });
  const neonCyanMat = new MeshStandardMaterial({
    color: 0x00eeff, emissive: 0x00e5ff, emissiveIntensity: 1.45, roughness: 0.10, metalness: 0.20
  });
  const neonPulseMat = new MeshStandardMaterial({
    color: 0xffffff, emissive: 0x7ef9ff, emissiveIntensity: 1.9, roughness: 0.08
  });

  const parkTurf = box(itParkGroup, 0x16a34a, 0, -0.34, STRIP_Z, 280, 0.3, STRIP_LEN);
  parkTurf.material = techTurfMat;
  const parkDeck = box(itParkGroup, 0x242933, 0, 0.02, STRIP_Z, 7.25, 0.14, STRIP_LEN);
  parkDeck.material = techDeckMat;
  for (const side of [-1, 1]) {
    const sw = box(itParkGroup, 0xcbd8e6, side * 4.55, 0.06, STRIP_Z, 1.90, 0.22, STRIP_LEN);
    sw.material = techWalkMat;
  }
  // Ambient Glowing Electric-Cyan Curb Strips (Bordering outer road edges)
  for (const lx of [-3.54, 3.54]) {
    const rail = box(itParkGroup, 0x00eeff, lx, 0.104, STRIP_Z, 0.14, 0.024, STRIP_LEN);
    rail.material = neonCyanMat;
  }
  // Scrolling bright white-cyan energy pulses racing along the curb channels
  const pulseGeo = new PlaneGeometry(0.11, 2.2);
  pulseGeo.rotateX(-Math.PI / 2);
  const pulseInst = new InstancedMesh(pulseGeo, neonPulseMat, 56);
  pulseInst.instanceMatrix.setUsage(DynamicDrawUsage);
  pulseInst.frustumCulled = false;
  itParkGroup.add(pulseInst);
  const pulseXform = new Object3D();

  return (distance, weather, map = 'school', activeBranch = null, branchState = null) => {
    const isCollege = map === 'college';
    const isPark = map === 'itpark';
    const onPodium = branchState && (branchState.mode === 'ready' || branchState.mode === 'select');
    const onSkybridge = activeBranch === 'skybridge' || (isPark && onPodium);
    const inUnderpass = activeBranch === 'underpass';
    const onBranch = onSkybridge || inUnderpass;
    const bEnd = branchState && Number.isFinite(branchState.branchEnd) ? branchState.branchEnd : 0;
    const endRelZ = onBranch && bEnd > distance ? bEnd - distance : Infinity;
    // Keep the continuation main road visible from 350m away past the cave/bridge exit so there is NEVER a sky-void gap!
    const showAheadExit = onBranch && endRelZ > -2 && endRelZ < 350;
    const exitX = showAheadExit ? curveRelX(bEnd, branchState) : 0;
    const exitY = showAheadExit ? curveRelY(bEnd, branchState) : 0;
    const exitZShift = showAheadExit ? -(endRelZ + 35) : 0;

    schoolGroup.visible = !isCollege && !isPark && (!onBranch || showAheadExit);
    road.color.copy(dry).lerp(wet, weather.rain);
    collegeGroup.visible = isCollege && (!onBranch || showAheadExit);
    itParkGroup.visible = isPark && (!onBranch || showAheadExit);

    schoolGroup.position.set(exitX, exitY, exitZShift);
    itParkGroup.position.set(exitX, exitY, exitZShift);
    collegeGroup.position.set(showAheadExit ? exitX : 0, showAheadExit ? exitY : 0, showAheadExit ? -(endRelZ + 35) : 0);

    for (const {map: m, span} of scrolling) m.offset.y = (distance / span) % 1;
    if (itParkGroup.visible) {
      const lanes = [-3.54, 3.54];
      const baseStart = showAheadExit ? bEnd + 4 : distance - 20;
      const baseD = Math.floor(baseStart / 10) * 10;
      let idx = 0;
      for (let step = 0; step < 28; step++) {
        const worldD = baseD + step * 10;
        const z = (distance - worldD) - exitZShift;
        for (let l = 0; l < 2; l++) {
          pulseXform.position.set(lanes[l], 0.122, z + (l % 2) * 3.5);
          pulseXform.updateMatrix();
          pulseInst.setMatrixAt(idx++, pulseXform.matrix);
        }
      }
      pulseInst.instanceMatrix.needsUpdate = true;
      techDeckMat.roughness = 0.22 - 0.10 * weather.rain;
      neonCyanMat.emissiveIntensity = 1.35 + weather.night * 0.75;
    }
    if (isCollege) {
      const refDist = showAheadExit ? bEnd : distance;
      roadDistance.value = refDist + (showAheadExit ? 35 : 0);
      stormClock.value = branchState?.time || 0;
      const cWeather = branchState ? sceneWeather(branchState) : null;
      wetStrength.value = cWeather ? (cWeather.wet ?? (hasCollegeRain(branchState) ? 1 : 0)) : (branchState && hasCollegeRain(branchState) ? 1 : 0);
      rainbowStrength.value = cWeather ? (cWeather.rainbow || 0) : 0;
      const originX = roadCurveX(refDist, 'college');
      const originY = roadCurveY(refDist, 'college');
      const first = Math.floor((refDist - (showAheadExit ? 0 : 32)) / 7) * 7;
      for(let n=0;n<42;n++){
        const worldDist=first+n*7,curveX=roadCurveX(worldDist,'college')-originX;
        const curveY=roadCurveY(worldDist,'college')-originY;
        dashTransform.rotation.y=-Math.atan(roadCurveSlope(worldDist,'college'));
        const localZ = showAheadExit ? 35 - (worldDist - bEnd) : distance - worldDist;
        for(let lane=0;lane<2;lane++){
          dashTransform.position.set(curveX+(lane?1.1:-1.1),curveY+.116,localZ);
          dashTransform.updateMatrix();dashes.setMatrixAt(n*2+lane,dashTransform.matrix);
        }
      }
      dashes.instanceMatrix.needsUpdate=true;
      for (const { geom, pos, base } of collegeRibbons) {
        const arr = pos.array;
        for (let i = 0; i < arr.length; i += 3) {
          const zScene = base[i + 2];
          const worldDist = showAheadExit ? bEnd + (35 - zScene) : distance - zScene;
          arr[i] = base[i] + (roadCurveX(worldDist, 'college') - originX);
          arr[i + 1] = base[i + 1] + (roadCurveY(worldDist, 'college') - originY);
        }
        pos.needsUpdate = true;
      }
    }
    road.color.copy(dry).lerp(wet, weather.rain);
    road.roughness = 1 - .69 * weather.rain;
    road.envMapIntensity = .35 + weather.rain * 1.95;
    collegeRoadMat.color.set(0x969b9c).lerp(wetStrength.value ? soakedAsphalt : wet,weather.rain);
    collegeRoadMat.roughness = wetStrength.value ? .22 : 1 - .69 * weather.rain;
    collegeRoadMat.envMapIntensity = wetStrength.value ? 1.75 : 1;
    scene.environmentIntensity = .52 - weather.night * .39;
  };
}

const masonry = new Map([
  [0xffd888,0xc0a17d], [0xf3ead2,0xd6ceba], [0xe8794e,0xb47559],
  [0x208d9e,0x53716e], [0xf3bc88,0xc7ad91], [0x216c6c,0x4c6763],
  [0xffedc7,0xdad1bd], [0x44897e,0x607771]
]);
export function campusMaterial(color) {
  if (masonry.has(color)) return new MeshStandardMaterial({
    color:masonry.get(color), map:texture('plaster'), roughness:.93
  });
  if ([0x276fa0,0x537f91,0x55788d].includes(color)) return new MeshStandardMaterial({
    color:0x384f59, roughness:.17, metalness:.46, envMapIntensity:1.3,
    emissive:0xdfaa71, emissiveIntensity:0
  });
  if (color === 0x3da85a) return new MeshStandardMaterial({
    color:0xc7cc9c, map:texture('turf'), roughness:1
  });
  return new MeshStandardMaterial({color, roughness:.82});
}

const foliage = new Map();
export function roadsideTree(parent, x, z, height, palm = false, angle = 0) {
  const species = palm ? 'palm' : 'neem';
  if (!foliage.has(species)) {
    const material = new MeshStandardMaterial({
      map:texture(species), alphaTest:.45, side:DoubleSide, roughness:1,
      color:0xf0edda
    });
    foliage.set(species, material);
  }
  const width = height * (palm ? .77 : 1.05);
  const tree = new Mesh(treePlane, foliage.get(species));
  tree.scale.set(width, height, 1);
  tree.position.set(x, height/2 + .12, z);
  tree.rotation.y = angle;
  tree.castShadow = tree.receiveShadow = true;
  parent.add(tree);
  return tree;
}
const treePlane = new PlaneGeometry();
