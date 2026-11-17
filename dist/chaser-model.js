import { AnimationMixer, Group } from './vendor/three.module.js';
import { GLTFLoader } from './vendor/GLTFLoader.js';
import { chasePose } from './engine.js';

export function loadChaserModel(scene) {
  const guard = new Group();
  guard.position.y = .09;
  guard.scale.set(1.12, 1.15, 1.11);
  guard.visible = false;
  scene.add(guard);

  let mixer, run, idle;
  const url = new URL('./assets/runverse-chaser.glb', import.meta.url).href;
  new GLTFLoader().load(url, ({scene: model, animations}) => {
    const clip = animations.find(animation => animation.name === 'Run');
    const rest = animations.find(animation => animation.name === 'Idle');
    if (!clip || !rest) return;
    model.traverse(object => {
      if (object.isMesh) {
        object.castShadow = true;
        object.frustumCulled = false;
      }
    });
    guard.add(model);
    mixer = new AnimationMixer(model);
    run = mixer.clipAction(clip).play();
    idle = mixer.clipAction(rest).play();
  }, undefined, error => console.warn('Could not load the security guard.', error));

  return state => {
    const pose = chasePose(state);
    guard.visible = Boolean(pose && run);
    if (!guard.visible) return;
    guard.position.x = pose.x;
    guard.position.z = pose.z;
    guard.rotation.y = (pose.x - state.x * 2.2) * .15;
    run.time = (pose.stride * 1.08) % run.getClip().duration;
    run.setEffectiveWeight(1 - pose.stop);
    idle.setEffectiveWeight(pose.stop);
    mixer.update(0);
  };
}
