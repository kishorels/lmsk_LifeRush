import { AnimationMixer, LoopOnce } from './vendor/three.module.js';
import { GLTFLoader } from './vendor/GLTFLoader.js';
import { JUMP_DURATION, SLIDE_DURATION } from './engine.js';

export function loadRunnerModel(parent) {
  let model, mixer, actions, current;
  new GLTFLoader().load(new URL('./assets/runverse-runner.glb', import.meta.url).href, gltf => {
    const clips = new Map(gltf.animations.map(clip => [clip.name, clip]));
    const names = ['Idle', 'Run', 'Jump', 'Slide'];
    if (names.some(name => !clips.has(name))) return;

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
    for (const [name, duration] of [['Jump', JUMP_DURATION], ['Slide', SLIDE_DURATION]]) {
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

    const frozen = state.mode === 'paused' || state.mode === 'crashed' || state.mode === 'countdown';
    if (frozen && current) return true;

    const name = state.mode !== 'running' ? 'Idle' : state.jump ? 'Jump' : state.slide ? 'Slide' : 'Run';
    const next = actions[name];
    if (next !== current) {
      current?.fadeOut(.09);
      next.reset().setEffectiveWeight(1).fadeIn(current ? .09 : 0).play();
      current = next;
    }
    if (name === 'Run') next.setEffectiveTimeScale(state.speed / 17);
    mixer.update(frozen ? 0 : Math.min(.05, Math.max(0, dt ?? 0)));
    return true;
  };
}
