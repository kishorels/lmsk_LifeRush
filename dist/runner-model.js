import { AnimationMixer, AnimationUtils, LoopOnce } from './vendor/three.module.js';
import { GLTFLoader } from './vendor/GLTFLoader.js';
import { JUMP_DURATION, SLIDE_DURATION, ROLL_DURATION, HIT_DURATION, FALL_DURATION, capturePose, isCapture } from './engine.js';

export function loadRunnerModel(parent, selected = 'male') {
  let model, mixer, actions, current, capturing = false, lean=0, pace=1, motionId=-1, bones = {}, currentRotationY = 0;
  function load() {
    const asset = selected === 'female' ? './assets/schoolgirl.glb' : './assets/runverse-schoolboy.glb';
    new GLTFLoader().load(new URL(asset, import.meta.url).href, gltf => {
    const clips = new Map(gltf.animations.map(clip => [clip.name, clip]));
    const names = ['Idle', 'Run', 'Jump', 'Slide', 'Roll', 'Stumble', 'HeadHit', 'Fall'];
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
      Jump: JUMP_DURATION, Slide: SLIDE_DURATION, Roll: ROLL_DURATION,
      Stumble: HIT_DURATION, HeadHit: HIT_DURATION, Fall: FALL_DURATION,
    };
    for (const [name, duration] of Object.entries(oneShots)) {
      const action = actions[name];
      action.setLoop(LoopOnce, 1).setDuration(duration);
      action.clampWhenFinished = true;
    }
    parent.add(model);
    model.traverse(object => {
      if (object.isBone) {
        if (object.name.includes('RightArm')) bones.rArm = object;
        if (object.name.includes('RightForeArm')) bones.rForeArm = object;
        if (object.name.includes('RightHand') && !object.name.includes('Thumb') && !object.name.includes('Index')) bones.rHand = object;
        if (object.name.includes('Head') && !object.name.includes('Top')) bones.head = object;
        if (object.name.includes('LeftArm')) bones.lArm = object;
      }
    });
    render.model = model;
  }, undefined, error => { render.failed=true; console.warn('Could not load the runner character.', error); });

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
    const next = actions[name];
    if (next !== current || (['Jump','Slide','Roll'].includes(name) && motionId!==state.motionId)) {
      const transition=['Jump','Slide','Roll'].includes(name) ? .065 : .14;
      current?.fadeOut(transition);
      const duration={Slide:SLIDE_DURATION,Roll:ROLL_DURATION,Stumble:HIT_DURATION,HeadHit:HIT_DURATION}[name];
      next.reset().setEffectiveTimeScale(duration?next.getClip().duration/duration:1).setEffectiveWeight(1).fadeIn(current ? transition : 0).play();
      current = next;motionId=state.motionId;
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
    const isFront = state.mode === 'ready' || state.mode === 'select';
    const targetRotY = isFront ? 0 : Math.PI;
    const turnBlend = 1 - Math.exp(-6.5 * Math.min(.05, dt || .016));
    currentRotationY += (targetRotY - currentRotationY) * turnBlend;
    model.rotation.y = currentRotationY - lean * .65;
    pace+=(Math.min(1.65,1+(state.speed-22)/40)-pace)*blend;
    if (name === 'Run') next.setEffectiveTimeScale(pace);
    mixer.update(frozen ? 0 : Math.min(.05, Math.max(0, dt ?? 0)));
    if (state.styleAction > 0 && bones.rArm && bones.rForeArm && bones.rHand && bones.head) {
      const TOTAL_STYLE = 1.8;
      const t = Math.min(1, Math.max(0, 1 - state.styleAction / TOTAL_STYLE));
      let lift = 0, flick = 0, headTilt = 0;
      if (t < 0.3) {
        lift = t / 0.3;
      } else if (t < 0.75) {
        lift = 1.0;
        const phase = (t - 0.3) / 0.45;
        flick = Math.sin(phase * Math.PI * 2);
        headTilt = Math.sin(phase * Math.PI);
      } else {
        lift = (1.0 - t) / 0.25;
      }
      bones.rArm.rotation.x -= lift * 0.95;
      bones.rArm.rotation.z += lift * 0.45;
      bones.rForeArm.rotation.x += lift * 1.55;
      bones.rForeArm.rotation.y += lift * 0.35;
      bones.rHand.rotation.z += (lift * 0.3 + flick * 0.65);
      bones.rHand.rotation.y += (lift * 0.5 + flick * 0.45);
      bones.head.rotation.z -= headTilt * 0.35;
      bones.head.rotation.y += headTilt * 0.25;
      bones.head.rotation.x -= headTilt * 0.15;
      if (bones.lArm) bones.lArm.rotation.z -= headTilt * 0.20;
    }
    return true;
  }
  return render;
}
