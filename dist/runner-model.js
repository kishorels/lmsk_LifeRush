import { AnimationMixer, AnimationUtils, LoopOnce } from './vendor/three.module.js';
import { GLTFLoader } from './vendor/GLTFLoader.js';
import { JUMP_DURATION, SLIDE_DURATION, ROLL_DURATION, HIT_DURATION, FALL_DURATION, capturePose, isCapture } from './engine.js';

export function loadRunnerModel(parent) {
  let model, mixer, actions, current, capturing = false, lean=0, pace=1, motionId=-1;
  new GLTFLoader().load(new URL('./assets/runverse-schoolboy.glb', import.meta.url).href, gltf => {
    const clips = new Map(gltf.animations.map(clip => [clip.name, clip]));
    const names = ['Idle', 'Run', 'Jump', 'Slide', 'Roll', 'Stumble', 'HeadHit', 'Fall'];
    if (names.some(name => !clips.has(name))) return;

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
    render.model = model;
  }, undefined, error => console.warn('Could not load the runner character.', error));

  function render(state, character, dt) {
    if (!model) return false;
    model.visible = character === 'male';
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
    model.rotation.z=lean;model.rotation.y=Math.PI-lean*.65;
    pace+=(Math.min(1.65,1+(state.speed-22)/40)-pace)*blend;
    if (name === 'Run') next.setEffectiveTimeScale(pace);
    mixer.update(frozen ? 0 : Math.min(.05, Math.max(0, dt ?? 0)));
    return true;
  }
  return render;
}
