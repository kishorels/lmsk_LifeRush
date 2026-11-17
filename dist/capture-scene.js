import { DirectionalLight, Quaternion, Vector3 } from './vendor/three.module.js';
import { capturePose, ease } from './engine.js';

// Preserve the underlying animation poses before applying contact and acting.
export function createCaptureScene(scene) {
  const before = new Map();
  const saved = new WeakMap();
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

  function aim(joint, child, at) {
    const origin = point(joint);
    const current = point(child).sub(origin).normalize();
    const target = at.clone().sub(origin).normalize();
    rotate(joint, new Quaternion().setFromUnitVectors(current, target));
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

  function frame(camera, s, player, playerModel, fallback, monster, monsterModel) {
    const {lift, laugh, reach: reaching, show} = capturePose(s);
    const center = s.x * 2.2;
    const crouch = reaching * (1-lift);
    player.position.set(center + .43, .31*lift, -.04-.16*show);
    player.rotation.set(0, -.1*(1-lift)+.015*show, .07*lift);
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
    turn(bone(playerModel,'LeftUpLeg'), xAxis, .19*lift);
    turn(bone(playerModel,'RightLeg'), xAxis, -.28*lift);
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
        ? point(shoulder).add(new Vector3(-.045,.005,.12))
        : new Vector3(center+.24,.34+1.33*lift,.03-.18*show);
      const target = point(hand).lerp(contact,reaching);
      reach(upper,forearm,hand,target,new Vector3(.04,-1,.34));
      for (const digit of ['Index1','Pinky1','Thumb1']) {
        turn(bone(monsterModel,'RightHand'+digit), zAxis, -.15*lift);
      }
    }

    const pushIn = ease(.04,1.50,s.capture);
    camera.position.set(center+1.58*(1-pushIn)+.016, 1.46+.39*pushIn, -4.05+1.42*pushIn);
    camera.lookAt(center+.065,.99+.72*pushIn,-.01);
    fill.intensity = 1.35 * lift;
    fill.position.set(center+.45,2.75,-2.5);
    fill.target.position.set(center,1.75,0);
  }
  return { restore, frame };
}
