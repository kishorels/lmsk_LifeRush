import { AnimationMixer, Group } from './vendor/three.module.js';
import { GLTFLoader } from './vendor/GLTFLoader.js';
import { chasePose, isCapture, SCHOOL_VAN } from './engine.js';
import {saveGestureBindPose} from './signature-gesture.js';

export function loadChaserModel(scene, onProgress, defer = false, onLoaded = null) {
  const chaser = new Group();
  chaser.position.y = .09;
  chaser.scale.setScalar(1.18);
  chaser.visible = false;
  scene.add(chaser);

  let mixer, run, idle, loading;
  function ensureLoaded() {
    if (loading) return loading;
    const url = new URL('./assets/villain.glb', import.meta.url).href;
    const progress = xhr => {
      if (onProgress && xhr.lengthComputable) onProgress(xhr.loaded / xhr.total);
    };
    loading = new GLTFLoader().loadAsync(url, progress).then(({scene: model, animations}) => {
      const clip = animations.find(animation => animation.name === 'Run') || animations[0];
      const rest = animations.find(animation => animation.name === 'Idle') || clip;
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
      saveGestureBindPose(model);
      mixer = new AnimationMixer(model);
      run = mixer.clipAction(clip).play();
      idle = mixer.clipAction(rest).play();
      if (onLoaded) onLoaded(model);
      if (onProgress) onProgress(1.0);
    }).catch(error => console.warn('Could not load the villain chaser.', error));
    return loading;
  }
  if (!defer) ensureLoaded();

  function render(state) {
    const capture = isCapture(state);
    const pose = chasePose(state);
    if (capture || pose || state.mode === 'running' || state.mode === 'intro' || state.mode === 'starting') ensureLoaded();
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
    const van = state.entryVan??SCHOOL_VAN;
    const avoidVan = Math.min(1, Math.max(0, (behind-van.ramp+2)/2),
      Math.max(0,(van.front+2-behind)/2));
    const vanX=van.lane*2.2,gap=pose.x-vanX;
    chaser.position.x=pose.x;
    if(Math.abs(gap)<1.75)chaser.position.x+=(vanX+(gap<0?-1:1)*1.75-pose.x)*avoidVan;
    chaser.position.z = pose.z;
    chaser.rotation.y = (pose.x - state.x * 2.2) * .15;
    run.time = (pose.stride * 1.08) % run.getClip().duration;
    run.setEffectiveWeight(1 - pose.stop);
    idle.time = pose.stride % idle.getClip().duration;
    idle.setEffectiveWeight(pose.stop);
    mixer.update(0);
  }
  render.root = chaser;
  render.preload = ensureLoaded;
  return render;
}
