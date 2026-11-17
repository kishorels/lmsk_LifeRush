import { AnimationMixer, Group } from './vendor/three.module.js';
import { GLTFLoader } from './vendor/GLTFLoader.js';
import { chasePose } from './engine.js';

export function loadChaserModel(scene) {
  const chaser = new Group();
  chaser.position.y = .09;
  chaser.scale.setScalar(1.18);
  chaser.visible = false;
  scene.add(chaser);

  let mixer, run, idle;
  const url = new URL('./assets/runverse-mutant.glb', import.meta.url).href;
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
    model.rotation.y = Math.PI;
    chaser.add(model);
    mixer = new AnimationMixer(model);
    run = mixer.clipAction(clip).play();
    idle = mixer.clipAction(rest).play();
  }, undefined, error => console.warn('Could not load the Mutant chaser.', error));

  return state => {
    const pose = chasePose(state);
    chaser.visible = Boolean(pose && run);
    if (!chaser.visible) return;
    chaser.position.x = pose.x;
    chaser.position.z = pose.z;
    chaser.rotation.y = (pose.x - state.x * 2.2) * .15;
    run.time = (pose.stride * 1.08) % run.getClip().duration;
    run.setEffectiveWeight(1 - pose.stop);
    idle.time = pose.stride % idle.getClip().duration;
    idle.setEffectiveWeight(pose.stop);
    mixer.update(0);
  };
}
