import { AnimationMixer, Group } from './vendor/three.module.js';
import { GLTFLoader } from './vendor/GLTFLoader.js';
import { chasePose, isCapture, SCHOOL_VAN } from './engine.js';

export function loadChaserModel(scene, onProgress) {
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
    render.model = model;
    mixer = new AnimationMixer(model);
    run = mixer.clipAction(clip).play();
    idle = mixer.clipAction(rest).play();
    if (onProgress) onProgress(1.0);
  }, xhr => {
    if (onProgress && xhr.lengthComputable) onProgress(xhr.loaded / xhr.total);
  }, error => console.warn('Could not load the Mutant chaser.', error));

  function render(state) {
    const capture = isCapture(state);
    const pose = chasePose(state);
    chaser.visible = Boolean((capture || pose) && run);
    if (!chaser.visible) return;
    if (capture) {
      run.setEffectiveWeight(0);
      idle.setEffectiveWeight(1);
      idle.time = .45 + state.capture * .46;
      mixer.update(0);
      return;
    }
    chaser.position.y = .09;
    const behind = state.distance-pose.z;
    const van = SCHOOL_VAN;
    const avoidVan = Math.min(1, Math.max(0, (behind-van.ramp+2)/2),
      Math.max(0,(van.front+2-behind)/2));
    chaser.position.x = pose.x - Math.max(0,pose.x-.52)*avoidVan;
    chaser.position.z = pose.z;
    chaser.rotation.y = (pose.x - state.x * 2.2) * .15;
    run.time = (pose.stride * 1.08) % run.getClip().duration;
    run.setEffectiveWeight(1 - pose.stop);
    idle.time = pose.stride % idle.getClip().duration;
    idle.setEffectiveWeight(pose.stop);
    mixer.update(0);
  }
  render.root = chaser;
  return render;
}
