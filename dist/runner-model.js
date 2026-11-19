import { AnimationMixer, AnimationUtils, LoopOnce, MeshStandardMaterial, CanvasTexture, DoubleSide } from './vendor/three.module.js';
import { GLTFLoader } from './vendor/GLTFLoader.js';
import { SWEEP_SECONDS, JUMP_DURATION, SLIDE_DURATION, ROLL_DURATION, HIT_DURATION, FALL_DURATION, capturePose, isCapture } from './engine.js';

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

export function loadRunnerModel(parent, selected = 'male', onProgress) {
  let model, mixer, actions, current, capturing = false, lean=0, pace=1, motionId=-1, currentRotationY = 0;
  function load() {
    const asset = selected === 'female' ? './assets/schoolgirl.glb' : './assets/runverse-schoolboy.glb?v=2.1';
    new GLTFLoader().load(new URL(asset, import.meta.url).href, gltf => {
    const clips = new Map(gltf.animations.map(clip => [clip.name, clip]));
    const names = ['Idle', 'Run', 'Jump', 'Slide', 'Roll', 'Stumble', 'HeadHit', 'Fall', 'ShoulderSweep'];
    if (names.some(name => !clips.has(name))) { render.failed=true; return; }

    clips.set('HeadHit', AnimationUtils.subclip(clips.get('HeadHit'), 'HeadHit', 1, 20, 30));
    model = gltf.scene;
    model.rotation.y = Math.PI;
    model.scale.setScalar(1.22);
    model.position.y = .09;
    model.visible = false;
    model.traverse(object => {
      if (object.isMesh) {
        object.castShadow = true;
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
          const badgeTex = createSchoolBadgeTexture(CanvasTexture);
          if (badgeTex) badgeMat.map = badgeTex;
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
    mixer = new AnimationMixer(model);
    actions = Object.fromEntries(names.map(name => [name, mixer.clipAction(clips.get(name))]));
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
    if (onProgress) onProgress(1.0);
  }, xhr => {
    if (onProgress && xhr.lengthComputable) onProgress(xhr.loaded / xhr.total);
  }, error => { render.failed=true; console.warn('Could not load the runner character.', error); });

  }
  let requested = selected === 'male';
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
    if (state.mode === 'falling' || state.mode === 'crashed') name = 'Fall';
    else if (state.mode !== 'running') name = 'Idle';
    else if (state.hit) name = state.cause === 'slide' ? 'HeadHit' : 'Stumble';
    else if (state.jump || state.drop || state.fallSpeed) name = 'Jump';
    else if (state.roll) name = 'Roll';
    else if (state.slide) name = 'Slide';
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
    if (name === 'Run') next.setEffectiveTimeScale(pace);
    mixer.update(frozen ? 0 : Math.min(.05, Math.max(0, dt ?? 0)));
    return true;
  }
  return render;
}
