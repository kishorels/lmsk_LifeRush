import { AnimationMixer, DirectionalLight, LoopOnce, Quaternion, Vector3 } from './vendor/three.module.js';
import { CAPTURE_GESTURE_START, capturePose, ease } from './engine.js';
import {gestureBodyFrame,mirroredGestureRotation} from './signature-gesture.js';

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
    const blend = ease(.10, .88, lift);
    if (!model || !blend) return;
    // Lively alternating mid-air kicking struggle instead of stiff hanging doll legs
    for (const [side, sign] of [['Left', -1], ['Right', 1]]) {
      const thigh = bone(model, side+'UpLeg');
      const knee = bone(model, side+'Leg');
      const foot = bone(model, side+'Foot');
      const toes = bone(model, side+'ToeBase');
      if (!thigh || !knee || !foot || !toes) continue;
      const phase = time * 8.2 + (sign > 0 ? Math.PI : 0);
      const kick = Math.sin(phase);
      const tuck = Math.max(0, Math.cos(phase));
      aim(thigh, knee, point(thigh).add(new Vector3(sign * (.09 + .05 * tuck), -.88, .28 * kick + .16)), blend);
      aim(knee, foot, point(knee).add(new Vector3(sign * .04, -.82, -.38 - .28 * tuck + .14 * kick)), blend);
      aim(foot, toes, point(foot).add(new Vector3(sign * .05, -.42 - .20 * kick, -.86)), blend);
    }
  }

  function struggleArmsAndTorso(model, lift, show, time) {
    const blend = ease(.12, .85, lift);
    if (!model || !blend) return;
    // Natural torso sway & twist while struggling in villain's grip
    const sway = Math.sin(time * 6.4);
    const heave = Math.sin(time * 9.5);
    turn(bone(model, 'Spine'), zAxis, (.09 * sway + .04) * blend);
    turn(bone(model, 'Spine'), up, (.16 * Math.cos(time * 4.2)) * blend);
    turn(bone(model, 'Spine2'), xAxis, (.14 + .06 * heave) * blend);

    // Left arm reaches across to push/pry against villain's grip
    const lArm = bone(model, 'LeftArm');
    const lFore = bone(model, 'LeftForeArm');
    const lHand = bone(model, 'LeftHand');
    if (lArm && lFore && lHand) {
      const lTarget = point(lArm).add(new Vector3(-.36 + .08 * Math.sin(time * 10), .18 + .07 * heave, .24 + .06 * sway));
      reach(lArm, lFore, lHand, lTarget, new Vector3(-.4, -.6, -.5));
    }

    // Right arm waves/flails dynamically for balance, then drops slightly in frustration during 'show'
    const rArm = bone(model, 'RightArm');
    const rFore = bone(model, 'RightForeArm');
    const rHand = bone(model, 'RightHand');
    if (rArm && rFore && rHand) {
      const wave = Math.sin(time * 8.6 + 1.1);
      const flailY = (.34 + .18 * wave) * (1 - .45 * show) - .10 * show;
      const rTarget = point(rArm).add(new Vector3(.42 + .09 * Math.cos(time * 7.2), flailY, .18 + .10 * wave));
      reach(rArm, rFore, rHand, rTarget, new Vector3(.3, -.7, -.4));
    }
  }

  // Retarget the opening clip's complete upper-arm, elbow and wrist rotations.
  // The other arm retains its grip on the hero throughout the gesture.
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
    const sourceFrame=gestureBodyFrame(sample.model),targetFrame=gestureBodyFrame(targetModel);
    if(!sourceFrame||!targetFrame)return;
    for(const part of ['Arm','ForeArm','Hand']){
      const joint=bone(targetModel,'Left'+part);
      const desired=mirroredGestureRotation(sample.model,source,targetModel,part,sourceFrame,targetFrame);
      if(!joint||!desired)continue;
      const delta=desired.multiply(joint.getWorldQuaternion(new Quaternion()).invert());
      rotate(joint,new Quaternion().slerp(delta,weight));
    }
  }

  function frame(camera, s, player, playerModel, fallback, monster, monsterModel, signatureClip) {
    const {lift, laugh, gesture, reach: reaching, show} = capturePose(s);
    const center = s.x * 2.2;
    const t = s.capture;
    const crouch = reaching * (1-lift);
    const bob = (.028 * Math.sin(t * 7.2) + .018 * laugh) * lift;
    player.scale.setScalar(1-.16*lift);
    player.position.set(center+.43 + .025*Math.sin(t*5.4)*lift, (.46+bob)*lift, -.04+.06*show);
    player.rotation.set(.04*Math.sin(t*6.4)*lift, -.12*(1-lift)+.06*Math.sin(t*4.0)*lift, (.06+.04*Math.sin(t*6.8))*lift);
    if (!playerModel) {
      fallback.rotation.set(1.17*(1-lift), 0, 0);
      fallback.position.set(0,.12*(1-lift),0);
    }
    // Confident upright villain stance with expressive laugh heave (no stiff frog squat!)
    monster.position.set(center-.54, .06-.07*crouch+.032*laugh, .25-.06*show);
    monster.rotation.set(0,-.16+.05*Math.sin(t*3.2)*lift, .025*Math.sin(t*6.0)*laugh);
    player.updateWorldMatrix(true,true);
    monster.updateWorldMatrix(true,true);

    // Expressive hero head: whips to villain in shock, then shakes head in frustration
    const heroHead = bone(playerModel,'Head');
    const headShake = Math.sin(t * 9.0) * .12 * show;
    turn(heroHead, xAxis, -.08*lift + .16*show + .05*Math.sin(t*7)*lift);
    turn(heroHead, up, .32*lift*(1-.7*show) - .14*show + headShake);
    turn(heroHead, zAxis, (-.12*Math.sin(t*5.5)*lift) - .08*show);
    hangLegs(playerModel, lift, t);
    struggleArmsAndTorso(playerModel, lift, show, t);

    // Expressive villain chest puff, shoulder heave, and head-back evil laugh
    const laughPulse = Math.sin(t * 16) * .06 * laugh;
    turn(bone(monsterModel,'Spine'), xAxis, -.32*crouch + .22*lift + (.16 + laughPulse)*laugh);
    turn(bone(monsterModel,'Head'), xAxis, .08*lift + (.34 + laughPulse*1.4)*laugh);
    turn(bone(monsterModel,'Head'), up, .14*show - .08*laugh);
    turn(bone(monsterModel,'Spine2'), zAxis, -.07*lift + (.09*Math.sin(t*11))*laugh);

    // Villain's free left arm pumps triumphantly before the signature shoulder gesture
    if (gesture < 0.08 && lift > 0.15) {
      const mLArm = bone(monsterModel, 'LeftArm');
      const mLFore = bone(monsterModel, 'LeftForeArm');
      const mLHand = bone(monsterModel, 'LeftHand');
      if (mLArm && mLFore && mLHand) {
        const pump = Math.sin(t * 10) * .10 * laugh;
        const mTarget = point(mLArm).add(new Vector3(-.24, -.04 + .24*laugh + pump, .32));
        reach(mLArm, mLFore, mLHand, mTarget, new Vector3(-.5, -.7, -.2));
      }
    }

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
        turn(bone(monsterModel,'RightHand'+digit), zAxis, -.18*lift);
      }
    }

    shoulderGesture(playerModel,signatureClip,monsterModel,gesture,t-CAPTURE_GESTURE_START);
    // Smooth dramatic cinematic arc-in camera (keeps both heads clearly framed above the Report Card!)
    const pushIn = ease(.04,1.45,t);
    const arcX = Math.sin(pushIn * Math.PI) * .28;
    camera.position.set(center + 1.52*(1-pushIn) + arcX + .016, 1.92 + .22*pushIn, -5.85 + .52*pushIn);
    camera.lookAt(center + .055, .92, -.01);
    fill.intensity = 1.85 * lift;
    fill.position.set(center + .55, 2.85, -2.6);
    fill.target.position.set(center, 1.65, 0);
  }
  return { restore, frame };
}
