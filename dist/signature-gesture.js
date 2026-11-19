import {Matrix4,Quaternion,Vector3} from './vendor/three.module.js';

// Anatomical torso coordinates make retargeting independent of each GLB's root
// axes and the actor's current lean. Local bone axes differ between the rigs.
export function gestureBodyFrame(model) {
  const at=name=>model.getObjectByName('mixamorig'+name)?.getWorldPosition(new Vector3());
  const left=at('LeftArm'),right=at('RightArm'),neck=at('Neck'),hips=at('Hips');
  if(!left||!right||!neck||!hips)return null;
  const x=left.sub(right).normalize(),y=neck.sub(hips).normalize(),z=new Vector3().crossVectors(x,y).normalize();
  y.crossVectors(z,x).normalize();
  return new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(x,y,z));
}

export function saveGestureBindPose(model) {
  model.updateWorldMatrix(true,true);
  const frame=gestureBodyFrame(model);if(!frame)return;
  const inverse=frame.invert(),pose={};
  for(const side of ['Left','Right'])for(const part of ['Arm','ForeArm','Hand']){
    const name=side+part,bone=model.getObjectByName('mixamorig'+name);
    if(bone)pose[name]=inverse.clone().multiply(bone.getWorldQuaternion(new Quaternion())).toArray();
  }
  model.userData.gestureBindPose=pose;
}

export function mirroredGestureRotation(sample,source,target,part,sourceFrame,targetFrame) {
  const sourceBind=source.userData.gestureBindPose?.['Right'+part];
  const targetBind=target.userData.gestureBindPose?.['Left'+part];
  const animated=sample.getObjectByName('mixamorigRight'+part);
  if(!sourceBind||!targetBind||!animated)return null;
  // Use the full joint rotation, not an approximated wrist destination.
  const delta=sourceFrame.clone().invert().multiply(animated.getWorldQuaternion(new Quaternion()))
    .multiply(new Quaternion().fromArray(sourceBind).invert());
  delta.set(delta.x,-delta.y,-delta.z,delta.w);
  return targetFrame.clone().multiply(delta).multiply(new Quaternion().fromArray(targetBind));
}
