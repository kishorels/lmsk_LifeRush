import { AnimationMixer, DirectionalLight, LoopOnce, Quaternion, Vector3 } from './vendor/three.module.js';
import { CAPTURE_GESTURE_START, capturePose, ease } from './engine.js';

// Preserve the underlying animation poses before applying contact and acting.
export function createCaptureScene(scene) {
  const before = new Map();
  const saved = new WeakMap();
  const gestures = new WeakMap();
  const up = new Vector3(0, 1, 0);
  const fill = new DirectionalLight(0xffebda, 0);
  scene?.add(fill, fill.target);
  const xAxis = new Vector3(1, 0, 0);
  const zAxis = new Vector3(0, 0, 1);
  const bone = (model, name) => model?.getObjectByName('mixamorig' + name);
  const point = object => object.getWorldPosition(new Vector3());

  function restore() {
    for (const [joint, rotation] of before) joint.quaternion.copy(rotation);
    before.clear();
    fill.intensity = 0;
  }

  function rotate(joint, delta) {
    if (!joint) return;
    if (!before.has(joint)) {
      if (!saved.has(joint)) saved.set(joint, new Quaternion());
      const pose = saved.get(joint).copy(joint.quaternion);
      before.set(joint, pose);
    }
    const parent = joint.parent.getWorldQuaternion(new Quaternion());
    joint.quaternion.premultiply(parent.clone().invert().multiply(delta).multiply(parent));
    joint.updateWorldMatrix(false, true);
  }

  function turn(joint, axis, angle) {
    rotate(joint, new Quaternion().setFromAxisAngle(axis, angle));
  }

  function aim(joint, child, at, blend = 1) {
    const origin = point(joint);
    const current = point(child).sub(origin).normalize();
    const target = at.clone().sub(origin).normalize();
    const delta = new Quaternion().setFromUnitVectors(current, target);
    rotate(joint, new Quaternion().slerp(delta, blend));
  }

  function reach(upper, lower, end, at, pole) {
    if (!upper || !lower || !end) return;
    const shoulder = point(upper);
    const elbow = point(lower);
    const wrist = point(end);
    const upperLength = shoulder.distanceTo(elbow);
    const lowerLength = elbow.distanceTo(wrist);
    const delta = at.clone().sub(shoulder);
    const direction = delta.clone().normalize();
    const distance = Math.max(Math.abs(upperLength - lowerLength)+.002,
                              Math.min(upperLength + lowerLength-.002, delta.length()));
    const along = (upperLength**2 - lowerLength**2 + distance**2)/(2*distance);
    const bend = pole.clone().addScaledVector(direction, -pole.dot(direction)).normalize();
    const newElbow = shoulder.clone().addScaledVector(direction, along)
      .addScaledVector(bend, Math.sqrt(Math.max(0, upperLength**2-along**2)));
    aim(upper, lower, newElbow);
    aim(lower, end, shoulder.clone().addScaledVector(direction, distance));
  }

  function hangLegs(model, lift, time) {
    const blend = ease(.12, .94, lift);
    if (!model || !blend) return;
    for (const [side, sign] of [['Left', -1], ['Right', 1]]) {
      const thigh = bone(model, side+'UpLeg');
      const knee = bone(model, side+'Leg');
      const foot = bone(model, side+'Foot');
      const toes = bone(model, side+'ToeBase');
      if (!thigh || !knee || !foot || !toes) continue;
      const swing = Math.sin(time*4.8 + sign*.8);
      aim(thigh, knee, point(thigh).add(new Vector3(sign*.038, -1, swing*.085)), blend);
      aim(knee, foot, point(knee).add(new Vector3(sign*.017, -1, .085+swing*.10)), blend);
      aim(foot, toes, point(foot).add(new Vector3(sign*.045, -.56, -.83)), blend);
    }
  }

  // Mirror the actual opening clip's hand/elbow path onto the free arm.
  // IK adapts to the villain's proportions while its other hand holds the hero.
  function shoulderGesture(source, clip, targetModel, weight, time) {
    if (!source || !clip || !targetModel || weight<=0) return;
    let sample=gestures.get(source);
    if (!sample) {
      const model=source.clone(true);
      model.position.set(0,0,0);model.rotation.set(0,0,0);model.scale.setScalar(1);
      const mixer=new AnimationMixer(model),action=mixer.clipAction(clip);
      action.setLoop(LoopOnce,1);action.clampWhenFinished=true;action.play();
      sample={model,mixer,action};gestures.set(source,sample);
    }
    sample.action.time=Math.max(0,Math.min(clip.duration-.0001,time));
    sample.mixer.update(0);sample.model.updateWorldMatrix(true,true);
    const sourceUpper=bone(sample.model,'RightArm'),sourceElbow=bone(sample.model,'RightForeArm'),sourceHand=bone(sample.model,'RightHand');
    const upper=bone(targetModel,'LeftArm'),elbow=bone(targetModel,'LeftForeArm'),hand=bone(targetModel,'LeftHand');
    if(!sourceUpper||!sourceElbow||!sourceHand||!upper||!elbow||!hand)return;
    const sourceOrigin=point(sourceUpper),sourceWrist=point(sourceHand),sourceBend=point(sourceElbow);
    const sourceLength=sourceOrigin.distanceTo(sourceBend)+sourceBend.distanceTo(sourceWrist);
    const scale=(point(upper).distanceTo(point(elbow))+point(elbow).distanceTo(point(hand)))/sourceLength;
    const orientation=targetModel.getWorldQuaternion(new Quaternion());
    const offset=sourceWrist.sub(sourceOrigin);offset.x*=-1;offset.multiplyScalar(scale).applyQuaternion(orientation);
    const pole=sourceBend.sub(sourceOrigin);pole.x*=-1;pole.applyQuaternion(orientation).normalize();
    const target=point(upper).add(offset);
    reach(upper,elbow,hand,point(hand).lerp(target,weight),pole);
    const wrist=sourceHand.getWorldQuaternion(new Quaternion());
    wrist.set(wrist.x,-wrist.y,-wrist.z,wrist.w).premultiply(orientation);
    const delta=wrist.multiply(hand.getWorldQuaternion(new Quaternion()).invert());
    rotate(hand,new Quaternion().slerp(delta,weight));
  }

  function frame(camera, s, player, playerModel, fallback, monster, monsterModel, signatureClip) {
    const {lift, laugh, gesture, reach: reaching, show} = capturePose(s);
    const center = s.x * 2.2;
    const crouch = reaching * (1-lift);
    player.scale.setScalar(1-.17*lift);
    player.position.set(center+.43, (.46+.018*Math.sin(s.capture*5))*lift, -.04+.06*show);
    player.rotation.set(0, -.1*(1-lift)+.015*show, .042*lift);
    if (!playerModel) {
      fallback.rotation.set(1.17*(1-lift), 0, 0);
      fallback.position.set(0,.12*(1-lift),0);
    }
    monster.position.set(center-.54, .09-.13*crouch+.018*laugh, .25-.05*show);
    monster.rotation.set(0,-.13,0);
    player.updateWorldMatrix(true,true);
    monster.updateWorldMatrix(true,true);

    const heroHead = bone(playerModel,'Head');
    turn(heroHead, xAxis, -.035*lift+.12*show);
    turn(heroHead, up, .13*lift-.16*show);
    turn(heroHead, zAxis, -.06*show);
    hangLegs(playerModel, lift, s.capture);
    turn(bone(monsterModel,'Spine'), xAxis, -.40*crouch+.34*lift+.09*laugh);
    turn(bone(monsterModel,'Head'), xAxis, .10*lift+.28*laugh);
    turn(bone(monsterModel,'Head'), up, .10*show);
    turn(bone(monsterModel,'Spine2'), zAxis, -.06*lift+.055*laugh);

    const upper = bone(monsterModel,'RightArm');
    const forearm = bone(monsterModel,'RightForeArm');
    const hand = bone(monsterModel,'RightHand');
    if (hand) {
      const shoulder = bone(playerModel,'LeftArm');
      const contact = shoulder
        ? point(shoulder).add(new Vector3(-.045,-.085,.15))
        : new Vector3(center+.24,.34+1.27*lift,.11+.05*show);
      const target = point(hand).lerp(contact,reaching);
      reach(upper,forearm,hand,target,new Vector3(.04,-1,.34));
      for (const digit of ['Index1','Pinky1','Thumb1']) {
        turn(bone(monsterModel,'RightHand'+digit), zAxis, -.15*lift);
      }
    }

    shoulderGesture(playerModel,signatureClip,monsterModel,gesture,s.capture-CAPTURE_GESTURE_START);
    const pushIn = ease(.04,1.50,s.capture);
    camera.position.set(center+1.58*(1-pushIn)+.016, 2.0+.15*pushIn, -5.8+.45*pushIn);
    camera.lookAt(center+.065,.90,-.01);
    fill.intensity = 1.35 * lift;
    fill.position.set(center+.45,2.75,-2.5);
    fill.target.position.set(center,1.75,0);
  }
  return { restore, frame };
}
