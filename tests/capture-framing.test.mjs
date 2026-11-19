import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.module.js';
import {loadRunnerModel} from '../dist/runner-model.js';
import {loadChaserModel} from '../dist/chaser-model.js';
import {createCaptureScene} from '../dist/capture-scene.js';
import {fresh,CAPTURE_DURATION,capturePose} from '../dist/engine.js';
import {readFile} from 'node:fs/promises';
import {gestureBodyFrame} from '../dist/signature-gesture.js';
test('actual hero and villain heads remain above the result card throughout the final lift',async()=>{
const realFetch=globalThis.fetch;globalThis.fetch=async(request,options)=>{const url=typeof request==='string'?request:request.url;return url.startsWith('file:')?new Response(await readFile(new URL(url))):realFetch(request,options);};globalThis.self=globalThis;globalThis.createImageBitmap=async()=>({width:1024,height:1024,close(){}});globalThis.ProgressEvent=class extends Event{constructor(type,init){super(type);Object.assign(this,init);}};
const scene=new T.Scene(),hero=new T.Group(),fallback=new T.Group();scene.add(hero);const run=loadRunnerModel(hero),chase=loadChaserModel(scene),capture=createCaptureScene(scene),camera=new T.PerspectiveCamera(64,390/800,.1,180);
for(let i=0;i<100&&(!run.model||!chase.model);i++)await new Promise(r=>setTimeout(r,20));
if(!run.model||!chase.model)throw Error('Models not loaded');
const s=fresh(0);s.mode='captured';
assert.equal(capturePose({...s,capture:1.6}).gesture,0);
assert.ok(capturePose({...s,capture:1.6}).laugh>0);
assert.equal(capturePose({...s,capture:2.9}).laugh,0);
assert.ok(capturePose({...s,capture:2.9}).gesture>.9);
const freeHand=[];
for(const t of [0,.5,1.3,2.65,3.05,3.5,CAPTURE_DURATION]){s.capture=t;capture.restore();run(s,'male',.016);chase(s);capture.frame(camera,s,hero,run.model,fallback,chase.root,chase.model,run.signatureClip);scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);if(t>=2.65&&t<=3.5)freeHand.push(chase.model.getObjectByName('mixamorigLeftHand').getWorldPosition(new T.Vector3()));for(const [name,m]of [['hero',run.model],['villain',chase.model]]){const p=m.getObjectByName('mixamorigHead').getWorldPosition(new T.Vector3()).project(camera);if(t>1.2&&(Math.abs(p.x)>.9||p.y<-.2||p.y>.9))throw Error('Head outside upper visible stage');}}
assert.ok(freeHand[0].distanceTo(freeHand[1])>.05,'free hand performs the opening gesture after the laugh');
assert.ok(freeHand.every(p=>p.toArray().every(Number.isFinite)));

// Verify shoulder, elbow and wrist animation fidelity, not just a moving hand.
const sample=run.model.clone(true);sample.rotation.set(0,0,0);sample.scale.setScalar(1);
const mixer=new T.AnimationMixer(sample),action=mixer.clipAction(run.signatureClip).play();
const reference=[],actual=[];
for(const elapsed of [.25,.5,.75]){
  action.time=elapsed;mixer.update(0);sample.updateWorldMatrix(true,true);
  s.capture=2.55+elapsed;capture.restore();run(s,'male',.016);chase(s);
  capture.frame(camera,s,hero,run.model,fallback,chase.root,chase.model,run.signatureClip);
  const sourceBody=gestureBodyFrame(sample).invert(),targetBody=gestureBodyFrame(chase.model).invert();
  reference.push(['Arm','ForeArm','Hand'].map(part=>sourceBody.clone().multiply(sample.getObjectByName('mixamorigRight'+part).getWorldQuaternion(new T.Quaternion()))));
  actual.push(['Arm','ForeArm','Hand'].map(part=>targetBody.clone().multiply(chase.model.getObjectByName('mixamorigLeft'+part).getWorldQuaternion(new T.Quaternion()))));
}
for(let frame=1;frame<reference.length;frame++)for(let joint=0;joint<3;joint++){
  const sourceAngle=reference[frame-1][joint].angleTo(reference[frame][joint]);
  const targetAngle=actual[frame-1][joint].angleTo(actual[frame][joint]);
  assert.ok(Math.abs(sourceAngle-targetAngle)<.003,'villain preserves the original joint animation');
}

});
