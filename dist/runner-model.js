import { AnimationMixer, AnimationUtils, LoopOnce } from './vendor/three.module.js';
import { GLTFLoader } from './vendor/GLTFLoader.js';
import { JUMP_DURATION, SLIDE_DURATION, ROLL_DURATION, HIT_DURATION, FALL_DURATION } from './engine.js';

export function loadRunnerModel(parent) {
  let model, mixer, actions, current;
  new GLTFLoader().load(new URL('./assets/runverse-runner-v6.glb', import.meta.url).href, gltf => {
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
  }, undefined, error => console.warn('Could not load the runner character.', error));

  return (state, character, dt) => {
    if (!model) return false;
    model.visible = character === 'male';
    if (!model.visible) return false;

    const frozen = state.mode === 'paused' || state.mode === 'countdown';
    if (frozen && current) return true;

    let name = 'Run';
    if (state.mode === 'falling' || state.mode === 'crashed') name = 'Fall';
    else if (state.mode !== 'running') name = 'Idle';
    else if (state.hit) name = state.cause === 'slide' ? 'HeadHit' : 'Stumble';
    else if (state.jump || state.drop) name = 'Jump';
    else if (state.roll) name = 'Roll';
    else if (state.slide) name = 'Slide';
    const next = actions[name];
    if (next !== current) {
      current?.fadeOut(.09);
      next.reset().setEffectiveWeight(1).fadeIn(current ? .09 : 0).play();
      current = next;
    }
    if (name === 'Jump') {
      const remaining = state.drop
        ? state.drop.jumpRemaining * state.drop.remaining / state.drop.duration
        : state.jump;
      next.setEffectiveTimeScale(0);
      next.time = next.getClip().duration * (1 - remaining / JUMP_DURATION);
    }
    if (name === 'Fall') {
      next.setEffectiveTimeScale(0);
      next.time = next.getClip().duration * Math.min(.9999, 1 - state.fall / FALL_DURATION);
    }
    if (name === 'Run') next.setEffectiveTimeScale(state.speed / 17);
    mixer.update(frozen ? 0 : Math.min(.05, Math.max(0, dt ?? 0)));
    return true;
  };
}
