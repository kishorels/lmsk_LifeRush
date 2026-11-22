import { AnimationClip, AnimationMixer, AnimationUtils, LoopOnce, MeshStandardMaterial, CanvasTexture, DoubleSide, VectorKeyframeTrack, QuaternionKeyframeTrack, Group, Mesh, BufferGeometry, Float32BufferAttribute, TorusGeometry, PlaneGeometry, BoxGeometry } from './vendor/three.module.js';
import { GLTFLoader } from './vendor/GLTFLoader.js';
import { SWEEP_SECONDS, JUMP_DURATION, SLIDE_DURATION, ROLL_DURATION, HIT_DURATION, FALL_DURATION, capturePose, isCapture } from './engine.js';
import {saveGestureBindPose} from './signature-gesture.js';

function createSchoolBadgeTexture(CanvasTextureClass) {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 320;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Outer Golden Rim (Shield outline)
  ctx.beginPath();
  ctx.moveTo(20, 24);
  ctx.lineTo(236, 24);
  ctx.lineTo(236, 190);
  ctx.quadraticCurveTo(236, 275, 128, 306);
  ctx.quadraticCurveTo(20, 275, 20, 190);
  ctx.closePath();
  ctx.fillStyle = '#b38728';
  ctx.fill();
  ctx.lineWidth = 10;
  ctx.strokeStyle = '#fbf5b7';
  ctx.stroke();

  // Inner Deep Navy Enamel Shield
  ctx.beginPath();
  ctx.moveTo(30, 34);
  ctx.lineTo(226, 34);
  ctx.lineTo(226, 185);
  ctx.quadraticCurveTo(226, 265, 128, 294);
  ctx.quadraticCurveTo(30, 265, 30, 185);
  ctx.closePath();
  const grad = ctx.createLinearGradient(0, 34, 0, 294);
  grad.addColorStop(0, '#12326b');
  grad.addColorStop(1, '#06132b');
  ctx.fillStyle = grad;
  ctx.fill();

  // Inner Gold Filigree Accent
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#d4af37';
  ctx.stroke();

  // Golden LMSK Header
  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 38px "Segoe UI", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('LMSK', 128, 78);

  // Decorative Golden Divider
  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(48, 108);
  ctx.lineTo(208, 108);
  ctx.stroke();

  // Golden Star Emblem
  ctx.font = '34px serif';
  ctx.fillText('★', 128, 146);

  // Subtitle "LIFE RUSH"
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px "Segoe UI", Arial, sans-serif';
  ctx.fillText('LIFE RUSH', 128, 196);

  // School Motto Tag
  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 15px "Segoe UI", Arial, sans-serif';
  ctx.fillText('HIGHER SEC', 128, 236);

  const tex = new CanvasTextureClass(canvas);
  tex.anisotropy = 4;
  return tex;
}

let sharedMaleClipsPromise = null;
let sharedInjuredClipsPromise = null;
let sharedCollegeIdlePromise = null;
let sharedFemaleCollegeAnimsPromise = null;
let sharedSchoolBadgeTex = null;
let sharedBackEmbroiderTex = null;
const isTouchDevice = typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0;

function createBackEmbroideryTexture(CanvasTextureClass) {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 340; // 1.5:1 ratio matching official lmsk-logo.jpg (1024 x 682)
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const w = canvas.width;
  const h = canvas.height;
  const r = 26;

  function drawPatch(logoImg = null) {
    ctx.clearRect(0, 0, w, h);

    // Outer embroidered fabric backing (athletic rounded patch)
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(6, 6, w - 12, h - 12, r);
    ctx.fillStyle = '#060d1a';
    ctx.fill();

    // Metallic gold embroidery outer stitched rim
    ctx.strokeStyle = '#b38728';
    ctx.lineWidth = 8;
    ctx.stroke();

    // Golden running stitch dashes
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 3.5;
    ctx.setLineDash([9, 6]);
    ctx.beginPath();
    ctx.roundRect(10, 10, w - 20, h - 20, r - 4);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    if (logoImg && logoImg.complete && logoImg.naturalWidth > 0) {
      // Draw actual official LMSK LifeRush logo inside the embroidered patch
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(15, 15, w - 30, h - 30, r - 8);
      ctx.clip();
      ctx.drawImage(logoImg, 15, 15, w - 30, h - 30);

      // Inner golden border trim
      ctx.strokeStyle = 'rgba(254, 240, 138, 0.65)';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.restore();
    } else {
      // Crisp athletic embroidery fallback while image loads
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const goldGrad = ctx.createLinearGradient(0, 60, 0, 180);
      goldGrad.addColorStop(0, '#fff494');
      goldGrad.addColorStop(0.4, '#ffd700');
      goldGrad.addColorStop(0.8, '#f59e0b');
      goldGrad.addColorStop(1, '#b45309');

      ctx.font = '900 84px "Segoe UI", "Arial Black", Impact, sans-serif';
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#78350f';
      ctx.strokeText('LMSK', w / 2, 115);
      ctx.fillStyle = goldGrad;
      ctx.fillText('LMSK', w / 2, 115);

      ctx.font = '900 44px "Segoe UI", Arial, sans-serif';
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#0369a1';
      ctx.strokeText('— LifeRush —', w / 2, 225);
      ctx.fillStyle = '#ffffff';
      ctx.fillText('— LifeRush —', w / 2, 225);
      ctx.restore();
    }
  }

  drawPatch(null);

  const tex = new CanvasTextureClass(canvas);
  tex.anisotropy = 4;
  tex.needsUpdate = true;

  if (typeof Image !== 'undefined') {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      drawPatch(img);
      tex.needsUpdate = true;
    };
    img.src = './assets/lmsk-logo.jpg';
  }

  return tex;
}

function loadInjuredRunData() {
  if (!sharedInjuredClipsPromise) {
    sharedInjuredClipsPromise = typeof fetch === 'function'
      ? fetch(new URL('./assets/injured-run.json', import.meta.url).href)
          .then(r => (r.ok ? r.json() : null))
          .catch(() => null)
      : Promise.resolve(null);
  }
  return sharedInjuredClipsPromise;
}

function loadCollegeIdleData() {
  if (!sharedCollegeIdlePromise) {
    sharedCollegeIdlePromise = typeof fetch === 'function'
      ? fetch(new URL('./assets/college-idle.json', import.meta.url).href)
          .then(r => (r.ok ? r.json() : null))
          .catch(() => null)
      : Promise.resolve(null);
  }
  return sharedCollegeIdlePromise;
}

function loadFemaleCollegeAnims() {
  if (!sharedFemaleCollegeAnimsPromise) {
    sharedFemaleCollegeAnimsPromise = typeof fetch === 'function'
      ? fetch(new URL('./assets/female-college-anims.json?v=3.2.7', import.meta.url).href)
          .then(r => (r.ok ? r.json() : null))
          .catch(() => null)
      : Promise.resolve(null);
  }
  return sharedFemaleCollegeAnimsPromise;
}

export function loadRunnerModel(parent, selected = 'male', onProgress, isInitiallyActive = false, onLoaded = null) {
  let model, mixer, actions, current, capturing = false, lean=0, pace=1, motionId=-1, currentRotationY = 0;
  let skirtMeshes = [], clothL = 0.06, clothR = 0.06, clothVelL = 0, clothVelR = 0, stridePhase = 0, scarfMeshes = [];
  function load() {
    const assets = {
      male: './assets/runverse-schoolboy.glb?v=2.2-opt',
      female: './assets/casual-schoolgirl.glb?v=3.2.7',
      'college-male': './assets/runverse-runner-v6.glb',
      'college-woman': './assets/college-woman.glb?v=3.2.5',
      'college-man': './assets/college-man.glb?v=1',
      'aged-elder': './assets/aged-elder.glb?v=4'
    };
    const loader = new GLTFLoader();
    const progress = xhr => { if (onProgress && xhr.lengthComputable) onProgress(xhr.loaded / xhr.total); };
    const main = loader.loadAsync(new URL(assets[selected], import.meta.url).href, progress);
    if (selected === 'male' && !sharedMaleClipsPromise) {
      sharedMaleClipsPromise = main;
    }
    const schoolMotion = selected === 'college-male'
      ? (sharedMaleClipsPromise || (sharedMaleClipsPromise = loader.loadAsync(new URL(assets.male, import.meta.url).href)))
      : Promise.resolve(null);
    const collegeIdlePromise = selected === 'college-male' ? loadCollegeIdleData() : Promise.resolve(null);
    const femaleCollegeAnimsPromise = selected === 'female' ? loadFemaleCollegeAnims() : Promise.resolve(null);
    Promise.all([main, schoolMotion, loadInjuredRunData(), collegeIdlePromise, femaleCollegeAnimsPromise]).then(([gltf, schoolGltf, injuredData, collegeIdleData, femaleCollegeAnims]) => {
    const clips = new Map(gltf.animations.map(clip => [clip.name, clip]));
    const names = ['Idle', 'Run', 'Jump', 'Slide', 'Roll', 'Stumble', 'HeadHit', 'Fall', 'ShoulderSweep'];
    if (schoolGltf) for (const clip of schoolGltf.animations) if (!clips.has(clip.name)) clips.set(clip.name, clip);
    if (selected === 'college-male' && collegeIdleData?.['college-male']?.length) {
      const idleTracks = collegeIdleData['college-male'].map(t => t.type === 'vector'
        ? new VectorKeyframeTrack(t.name, t.times, t.values)
        : new QuaternionKeyframeTrack(t.name, t.times, t.values));
      clips.set('Idle', new AnimationClip('Idle', collegeIdleData.duration, idleTracks));
    }
    // Retarget the exact College woman animation set (Neutral Idle + athletic Run/Jump/Slide/Roll/etc.) onto the original schoolgirl model!
    if (selected === 'female' && femaleCollegeAnims?.clips) {
      const hasColon = Boolean(gltf.scene?.getObjectByName?.('mixamorig:Hips'));
      for (const nm of names) {
        const entry = femaleCollegeAnims.clips[nm];
        if (!entry?.tracks?.length) continue;
        const tracks = entry.tracks.map(t => {
          let trackName = t.name;
          if (hasColon && trackName.startsWith('mixamorig') && !trackName.startsWith('mixamorig:')) {
            trackName = trackName.replace(/^mixamorig/, 'mixamorig:');
          } else if (!hasColon && trackName.startsWith('mixamorig:')) {
            trackName = trackName.replace(/^mixamorig:/, 'mixamorig');
          }
          return t.type === 'vector'
            ? new VectorKeyframeTrack(trackName, t.times, t.values)
            : new QuaternionKeyframeTrack(trackName, t.times, t.values);
        });
        clips.set(nm, new AnimationClip(nm, entry.duration, tracks));
      }
    }
    if (names.some(name => !clips.has(name))) { render.failed=true; return; }

    clips.set('HeadHit', AnimationUtils.subclip(clips.get('HeadHit'), 'HeadHit', 1, 20, 30));
    model = gltf.scene;
    model.rotation.y = Math.PI;
    model.scale.setScalar(1.22);
    model.position.y = .09;
    model.visible = false;
    model.traverse(object => {
      if (object.isMesh) {
        const skipMobileShadow = isTouchDevice && /eye|brow|mouth|teeth|tongue|lash|glass|hair|tie|pocket|badge|button|shoe_lace/i.test(object.name + ' ' + (object.material?.name || ''));
        object.castShadow = !(isTouchDevice && selected === 'female') && !skipMobileShadow;
        object.frustumCulled = false;
        // Hide awkward collar cardboard flaps
        if (/collar/i.test(object.name)) {
          object.visible = false;
          return;
        }
        // School Crest Badge on the left chest pocket area
        if (/pocket/i.test(object.name)) {
          object.visible = true;
          const badgeMat = new MeshStandardMaterial({
            color: 0x0a1b3a,
            metalness: 0.85,
            roughness: 0.25,
            side: DoubleSide,
          });
          if (!sharedSchoolBadgeTex) sharedSchoolBadgeTex = createSchoolBadgeTexture(CanvasTexture);
          if (sharedSchoolBadgeTex) badgeMat.map = sharedSchoolBadgeTex;
          object.material = badgeMat;
          return;
        }
        // Upper Tie Clip (gleaming metallic gold bar across tie)
        if (/Tie_stripe002/i.test(object.name)) {
          object.visible = true;
          object.material = new MeshStandardMaterial({
            color: 0xffd700,
            metalness: 0.95,
            roughness: 0.15,
            side: DoubleSide,
          });
          return;
        }
        // Hide extra diagonal stripes so the tie remains clean, solid navy
        if (/Tie_stripe/i.test(object.name)) {
          object.visible = false;
          return;
        }
        // These face textures use alpha cutouts. Depth-test the solid pixels
        // so eyes, eyelids and brows sort correctly against the glasses.
        const material = object.material;
        if (['Boy01_Eyes_MAT2', 'Boy01_Brows_MAT2', 'Boy01_Mouth_MAT2'].includes(material?.name)) {
          material.transparent = false;
          material.alphaTest = .38;
          material.depthWrite = true;
          material.specularIntensity = .32;
          material.roughness = .70;
          object.castShadow = false;
        }
      }
    });
    if (selected === 'female') {
      skirtMeshes = [];
      let crownMesh = null;
      model.traverse(o => {
        if (o.isMesh && /pleated_skirt/i.test(o.name) && o.morphTargetInfluences?.length >= 2) {
          skirtMeshes.push(o);
        }
        if (!crownMesh && o.isMesh && /swept_crown|Hair_smooth/i.test(o.name)) crownMesh = o;
      });
      const headBone = model.getObjectByName('mixamorigHead') || model.getObjectByName('mixamorig:Head');
      if (crownMesh && headBone) {
        const rawMat = crownMesh.material?.clone?.() || new MeshStandardMaterial({ color: 0x3b2618, roughness: 0.72, metalness: 0 });
        rawMat.roughness = 0.72;
        rawMat.metalness = 0;
        rawMat.transparent = false;
        rawMat.side = DoubleSide;
        const hairGroup = new Group();
        hairGroup.name = 'SchoolgirlFrontHair';
        // Smoothly contoured swept curtain bangs emerging seamlessly from inside the crown hairline
        const cols = 20, rows = 8;
        const pos = [], uvs = [], idx = [];
        const cx = 0, cy = 1.664, cz = -0.006;
        for (let r = 0; r <= rows; r++) {
          const v = r / rows;
          for (let c = 0; c <= cols; c++) {
            const u = c / cols;
            const theta = (u - 0.5) * Math.PI * 0.90;
            const absT = Math.abs(theta);
            const partLift = Math.exp(-Math.pow((theta + 0.12) / 0.24, 2)) * 0.022;
            const wisp = Math.sin(theta * 15) * 0.0045 * Math.max(0, 1 - absT * 0.55);
            const templeDrop = Math.pow(Math.max(0, absT - 0.68) / 0.72, 1.3) * 0.054;
            const yTop = 1.750 - absT * 0.018;
            const yBot = 1.658 + partLift + wisp - templeDrop;
            const y = yTop * (1 - v) + yBot * v;
            const lat = (y - cy) / 0.095;
            const profileR = Math.sqrt(Math.max(0.24, 1 - lat * lat * 0.50));
            // Tuck top edge inside existing crown (0.071) so there is zero visor ledge, then drape closely over forehead
            const easeOut = Math.sin(Math.min(1, v * 1.35) * Math.PI * 0.5);
            const strandRipple = Math.cos(theta * 40) * 0.0014 * Math.sin(v * Math.PI);
            const baseR = 0.071 + 0.0205 * easeOut - Math.pow(absT / 1.42, 2) * 0.005 + strandRipple;
            const x = cx + Math.sin(theta) * baseR * profileR;
            const z = cz + Math.cos(theta) * (baseR + 0.003 * easeOut) * profileR;
            pos.push(x, y, z);
            uvs.push(u * 6.0, v * 1.2);
          }
        }
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const a = r * (cols + 1) + c, b = a + 1, d = a + cols + 1, e = d + 1;
            idx.push(a, d, b, b, d, e);
          }
        }
        const bangsGeo = new BufferGeometry();
        bangsGeo.setAttribute('position', new Float32BufferAttribute(pos, 3));
        bangsGeo.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
        bangsGeo.setIndex(idx);
        bangsGeo.computeVertexNormals();
        const bangsMesh = new Mesh(bangsGeo, rawMat);
        bangsMesh.castShadow = false;
        hairGroup.add(bangsMesh);
        model.add(hairGroup);
        model.updateMatrixWorld(true);
        headBone.attach(hairGroup);
      }
    }
    if (selected === 'aged-elder') {
      scarfMeshes = [];
      const neckBone = model.getObjectByName('mixamorigNeck') || model.getObjectByName('mixamorigSpine2');
      if (neckBone) {
        const scarfGroup = new Group();
        scarfGroup.name = 'ElderRedScarf';
        const scarfMat = new MeshStandardMaterial({
          color: 0xc9182b,
          roughness: 0.65,
          metalness: 0.05,
          side: DoubleSide,
        });
        const goldMat = new MeshStandardMaterial({
          color: 0xffb703,
          roughness: 0.35,
          metalness: 0.65,
        });
        // Wrapped collar loop
        const loop = new Mesh(new TorusGeometry(0.16, 0.045, 8, 18), scarfMat);
        loop.rotation.x = Math.PI / 2;
        loop.position.set(0, 0.06, -0.02);
        scarfGroup.add(loop);

        // Left flowing scarf tail trailing behind left shoulder
        const leftTailGeo = new PlaneGeometry(0.13, 0.82, 2, 6);
        leftTailGeo.translate(0, -0.40, 0);
        const leftTail = new Mesh(leftTailGeo, scarfMat);
        leftTail.position.set(-0.13, 0.04, 0.08);
        leftTail.rotation.x = 0.52;
        leftTail.rotation.y = -0.15;
        leftTail.castShadow = true;
        scarfGroup.add(leftTail);

        // Right flowing scarf tail trailing behind right shoulder
        const rightTailGeo = new PlaneGeometry(0.13, 0.88, 2, 6);
        rightTailGeo.translate(0, -0.44, 0);
        const rightTail = new Mesh(rightTailGeo, scarfMat);
        rightTail.position.set(0.13, 0.04, 0.08);
        rightTail.rotation.x = 0.48;
        rightTail.rotation.y = 0.15;
        rightTail.castShadow = true;
        scarfGroup.add(rightTail);

        // Gold tassel trims on scarf ends
        const trimL = new Mesh(new BoxGeometry(0.13, 0.04, 0.015), goldMat);
        trimL.position.set(-0.13, -0.38, 0.32);
        scarfGroup.add(trimL);
        const trimR = new Mesh(new BoxGeometry(0.13, 0.04, 0.015), goldMat);
        trimR.position.set(0.13, -0.42, 0.34);
        scarfGroup.add(trimR);

        model.updateMatrixWorld(true);
        neckBone.getWorldPosition(scarfGroup.position);
        model.worldToLocal(scarfGroup.position);
        model.add(scarfGroup);
        model.updateMatrixWorld(true);
        neckBone.attach(scarfGroup);
        scarfMeshes = [leftTail, rightTail];
      }
    }

    // Dress Backside Embroidered Badge ("LMSK - LifeRush") visible in center of back while running
    const spineBone = (selected === 'female')
      ? (model.getObjectByName('mixamorig:Spine1') || model.getObjectByName('mixamorigSpine1') || model.getObjectByName('mixamorig:Spine2') || model.getObjectByName('mixamorigSpine2'))
      : (model.getObjectByName('mixamorig:Spine2') || model.getObjectByName('mixamorigSpine2') || model.getObjectByName('CC_Base_Spine02') || model.getObjectByName('mixamorig:Spine1') || model.getObjectByName('mixamorigSpine1'));

    if (spineBone) {
      const isCC = spineBone.name.startsWith('CC_');
      const badgeGeo = new PlaneGeometry(0.26, 0.17);

      const badgeMat = new MeshStandardMaterial({
        color: 0xffffff,
        metalness: 0.12,
        roughness: 0.45,
        side: DoubleSide,
        depthWrite: false,
        depthTest: true,
        polygonOffset: true,
        polygonOffsetFactor: -8.0,
        polygonOffsetUnits: -8.0,
      });

      if (!sharedBackEmbroiderTex) sharedBackEmbroiderTex = createBackEmbroideryTexture(CanvasTexture);
      if (sharedBackEmbroiderTex) badgeMat.map = sharedBackEmbroiderTex;

      const backBadge = new Mesh(badgeGeo, badgeMat);
      backBadge.name = 'DressBackEmbroiderBadge';
      backBadge.castShadow = false;
      backBadge.renderOrder = 16;

      const spineOffsets = {
        male: [0, 0.05, -0.168],
        female: [0, 0.08, -0.155],
        'college-male': [0, 0.05, -0.180],
        'college-woman': [0, 0.02, -0.182],
        'college-man': [0, 0.02, -0.192],
        'aged-elder': [0, 0.04, -0.155]
      };
      const [bx, by, bz] = spineOffsets[selected] || (isCC ? [0, 0.02, -0.190] : [0, 0.05, -0.168]);
      backBadge.position.set(bx, by, bz);
      backBadge.rotation.set(0.06, Math.PI, 0);

      spineBone.add(backBadge);
    }
    saveGestureBindPose(model);
    mixer = new AnimationMixer(model);
    actions = Object.fromEntries(names.map(name => [name, mixer.clipAction(clips.get(name))]));
    if (injuredData) {
      const trackKey = injuredData[selected]
        ? selected
        : (selected.includes('female') || selected.includes('woman') ? 'female' : 'male');
      const rawTracks = injuredData[trackKey] || [];
      if (rawTracks.length) {
        const hasColon = Boolean(model?.getObjectByName?.('mixamorig:Hips'));
        const tracks = rawTracks.map(t => {
          let trackName = t.name;
          if (hasColon && trackName.startsWith('mixamorig') && !trackName.startsWith('mixamorig:')) {
            trackName = trackName.replace(/^mixamorig/, 'mixamorig:');
          } else if (!hasColon && trackName.startsWith('mixamorig:')) {
            trackName = trackName.replace(/^mixamorig:/, 'mixamorig');
          }
          return t.type === 'vector'
            ? new VectorKeyframeTrack(trackName, t.times, t.values)
            : new QuaternionKeyframeTrack(trackName, t.times, t.values);
        });
        const injuredClip = new AnimationClip('InjuredRun', injuredData.duration, tracks);
        actions.InjuredRun = mixer.clipAction(injuredClip);
      }
    }
    const oneShots = {
      ShoulderSweep: SWEEP_SECONDS, Jump: JUMP_DURATION, Slide: SLIDE_DURATION, Roll: ROLL_DURATION,
      Stumble: HIT_DURATION, HeadHit: HIT_DURATION, Fall: FALL_DURATION,
    };
    for (const [name, duration] of Object.entries(oneShots)) {
      const action = actions[name];
      action.setLoop(LoopOnce, 1).setDuration(duration);
      action.clampWhenFinished = true;
    }
    parent.add(model);
    render.model = model;
    render.signatureClip = clips.get('ShoulderSweep');
    if (onLoaded) onLoaded(model, selected);
    if (onProgress) onProgress(1.0);
  }).catch(error => { render.failed=true; console.warn('Could not load the runner character.', error); });

  }
  let requested = Boolean(isInitiallyActive || selected === 'male');
  if (requested) load();
  function render(state, character, dt) {
    if (!requested && character === selected) { requested = true; load(); }
    if (!model) return false;
    model.visible = character === selected;
    if (!model.visible) return false;

    if (isCapture(state)) {
      const lift = capturePose(state).lift;
      if (!capturing) {
        mixer.stopAllAction();
        actions.Fall.reset().setEffectiveTimeScale(0).play();
        actions.Idle.reset().setEffectiveTimeScale(0).play();
        capturing = true;
      }
      actions.Fall.time = actions.Fall.getClip().duration * .9999;
      actions.Fall.setEffectiveWeight(1-lift);
      actions.Idle.time = .3 + state.capture * .28;
      actions.Idle.setEffectiveWeight(lift);
      mixer.update(0);
      return true;
    }
    if (capturing) {
      mixer.stopAllAction();
      capturing = false;
      current = null;
    }

    const frozen = state.mode === 'paused' || state.mode === 'countdown';
    if (frozen && current) return true;

    let name = 'Run';
    if (state.mode === 'falling' || state.mode === 'crashed') {
      const progress = 1 - (state.fall || 0) / FALL_DURATION;
      if (progress < 0.38) {
        name = state.cause === 'slide' ? 'HeadHit' : 'Stumble';
      } else {
        name = 'Fall';
      }
    }
    else if (state.mode !== 'running') name = 'Idle';
    else if (state.hit) name = state.cause === 'slide' ? 'HeadHit' : 'Stumble';
    else if (state.jump || state.drop || state.fallSpeed) name = 'Jump';
    else if (state.roll) name = 'Roll';
    else if (state.slide) name = 'Slide';
    else if (state.injured && actions.InjuredRun) name = 'InjuredRun';
    if (state.styleAction > 0 && ['Idle','Run'].includes(name)) name = 'ShoulderSweep';
    if (state.mode === 'starting') name = 'Run';
    const next = actions[name];
    if (next !== current || (['Jump','Slide','Roll'].includes(name) && motionId!==state.motionId)) {
      const transition=['Jump','Slide','Roll'].includes(name) ? .065 : .14;
      current?.fadeOut(transition);
      const duration={Slide:SLIDE_DURATION,Roll:ROLL_DURATION,Stumble:HIT_DURATION,HeadHit:HIT_DURATION}[name];
      next.reset().setEffectiveTimeScale(duration?next.getClip().duration/duration:1).setEffectiveWeight(1).fadeIn(current ? transition : 0).play();
      current = next;motionId=state.motionId;
    }
    if (name === 'ShoulderSweep') {
      next.setEffectiveTimeScale(0);
      next.time = next.getClip().duration * (1 - state.styleAction / SWEEP_SECONDS);
    }
    if (name === 'Jump') {
      const remaining = state.drop
        ? state.drop.jumpRemaining * state.drop.remaining / state.drop.duration
        : state.jump || .24;
      next.setEffectiveTimeScale(0);
      next.time = next.getClip().duration * (1 - remaining / JUMP_DURATION);
    }
    if (name === 'Fall') {
      next.setEffectiveTimeScale(0);
      next.time = next.getClip().duration * Math.min(.9999, 1 - state.fall / FALL_DURATION);
    }
    const blend=1-Math.exp(-10*Math.min(.05,dt||0));
    lean+=((state.mode==='running'?(state.lane-state.x)*.20:0)-lean)*blend;
    model.rotation.z=lean;
    const isFront = state.mode === 'ready' || state.mode === 'select' || state.mode === 'intro';
    const targetRotY = isFront ? 0 : Math.PI;
    const turnBlend = 1 - Math.exp(-6.5 * Math.min(.05, dt || .016));
    currentRotationY += (targetRotY - currentRotationY) * turnBlend;
    model.rotation.y = currentRotationY - lean * .65;
    pace+=(Math.min(1.65,1+(state.speed-22)/40)-pace)*blend;
    if (name === 'Run' || name === 'InjuredRun') next.setEffectiveTimeScale(pace);
    const stepDt = frozen ? 0 : Math.min(.05, Math.max(0, dt ?? 0));
    mixer.update(stepDt);

    // Spring-damped real-time cloth dynamics for the School Female pleated skirt (wind billow, stride flutter, jump flare, turn swing!)
    if (skirtMeshes.length) {
      let targetL = 0.05, targetR = 0.05;
      const tNow = state.time || 0;
      if (name === 'Run' || name === 'InjuredRun') {
        stridePhase += stepDt * pace * 12.2;
        const speedDrag = Math.min(0.56, Math.max(0.26, ((state.speed || 28) - 16) / 62));
        const strideSwing = Math.sin(stridePhase) * 0.42;
        const flutter = Math.sin(stridePhase * 2.3 + 0.7) * 0.09;
        const turnLag = -lean * 1.65;
        targetL = Math.max(0.08, Math.min(1.15, speedDrag + Math.max(0, strideSwing) + flutter + Math.max(0, turnLag)));
        targetR = Math.max(0.08, Math.min(1.15, speedDrag + Math.max(0, -strideSwing) - flutter + Math.max(0, -turnLag)));
      } else if (name === 'Jump') {
        const airFlare = 0.78 + Math.sin(tNow * 14) * 0.10;
        const turnLag = -lean * 1.4;
        targetL = Math.max(0.25, Math.min(1.2, airFlare + turnLag));
        targetR = Math.max(0.25, Math.min(1.2, airFlare - turnLag));
      } else if (name === 'Slide' || name === 'Roll') {
        targetL = 0.68;
        targetR = 0.68;
      } else if (name === 'ShoulderSweep') {
        const swirl = Math.sin((1 - (state.styleAction || 0) / SWEEP_SECONDS) * Math.PI * 2) * 0.34;
        targetL = Math.max(0.06, 0.22 + swirl);
        targetR = Math.max(0.06, 0.22 - swirl);
      } else {
        const breeze = Math.sin(tNow * 1.9) * 0.055;
        targetL = 0.07 + Math.max(0, breeze);
        targetR = 0.07 + Math.max(0, -breeze);
      }
      if (stepDt > 0) {
        const stiff = 64, damp = 10.5;
        clothVelL += ((targetL - clothL) * stiff - clothVelL * damp) * stepDt;
        clothVelR += ((targetR - clothR) * stiff - clothVelR * damp) * stepDt;
        clothL = Math.max(0, Math.min(1.25, clothL + clothVelL * stepDt));
        clothR = Math.max(0, Math.min(1.25, clothR + clothVelR * stepDt));
      }
      for (const sm of skirtMeshes) {
        sm.morphTargetInfluences[0] = clothL;
        sm.morphTargetInfluences[1] = clothR;
      }
    }
    if (selected === 'aged-elder' && scarfMeshes.length) {
      const tNow = state.time || 0;
      const flutter = Math.sin(tNow * 24) * 0.14;
      const turnLag = -lean * 0.9;
      const runLift = (state.mode === 'running') ? 0.44 + flutter : 0.08;
      scarfMeshes[0].rotation.x = 0.48 + runLift;
      scarfMeshes[0].rotation.z = turnLag + Math.cos(tNow * 18) * 0.09;
      scarfMeshes[1].rotation.x = 0.44 + runLift;
      scarfMeshes[1].rotation.z = turnLag - Math.cos(tNow * 18) * 0.09;
    }
    return true;
  }
  render.preload = () => { if (!requested) { requested = true; load(); } };
  return render;
}
