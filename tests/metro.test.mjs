import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,step} from '../dist/engine.js';
import {Box3,Group} from '../dist/vendor/three.module.js';
import {createTraffic} from '../dist/traffic-scene.js';
import {buildWDP4DTrain,buildRailRampWagon} from '../dist/wdp4d-train.js';

test('right IT Park fork preserves a moving train roof and matches the carriage to its collision span',()=>{
 for(const lane of [-1,1]){
  const s=Object.assign(fresh(0),{map:'itpark',enableForks:true,mode:'running',distance:224,next:100000,lane,x:lane});
  const roof={type:'bus',lane:0,z:255,activate:240,length:22,roof:2.8,roofRide:true,id:'roof',started:false};
  s.items=[roof];
  step(s,.01);
  assert.equal(s.activeBranch,lane===1?'underpass':'skybridge');
  assert.equal(Boolean(roof.metro),lane===1);
  if(lane<0)continue;
  assert.equal(roof.z,255);
  const scene=new Group();createTraffic(scene)(s);
  const train=scene.getObjectByName('metro-train');
  assert.ok(train);assert.equal(train.position.z,s.distance-roof.z);
  assert.equal(train.userData.coins.length,4);
 }
});

test('cave trains use the Indian Railways WDP4D 45420 locomotive with Co-Co bogies and valid dimensions',()=>{
 const single=buildWDP4DTrain({length:12,roof:2.8,lane:0});
 single.updateMatrixWorld(true);
 const b1=new Box3().setFromObject(single);
 assert.equal(single.name,'metro-train');
 assert.equal(single.userData.wheels.length,6,'single WDP4D unit has two 3-axle Co-Co bogies (6 axles)');
 assert.ok(b1.min.x>=-1.05 && b1.max.x<=1.05,`fits inside lane width (${b1.min.x.toFixed(2)}..${b1.max.x.toFixed(2)})`);
 assert.ok(b1.min.y>=0 && b1.max.y<=2.92,`height matches roof (${b1.min.y.toFixed(2)}..${b1.max.y.toFixed(2)})`);
 assert.ok(b1.max.z<=0.15 && b1.min.z>=-12.2,`spans collision length (${b1.min.z.toFixed(2)}..${b1.max.z.toFixed(2)})`);

 const twin=buildWDP4DTrain({length:22,roof:2.8,lane:0,roofRide:true});
 twin.updateMatrixWorld(true);
 const b2=new Box3().setFromObject(twin);
 assert.equal(twin.userData.wheels.length,12,'22m roof-ride couples two WDP4D units (12 axles)');
 assert.equal(twin.userData.coins.length,4);
 assert.ok(b2.min.z<=-21.5 && b2.min.z>=-22.2);

 const wagon=buildRailRampWagon(20,1.72);
 wagon.updateMatrixWorld(true);
 const bw=new Box3().setFromObject(wagon);
 assert.ok(bw.min.y>=0 && bw.max.y<=1.8 && bw.min.z>=-20.3);

 // Oncoming short car/bike inside cave promotes to full WDP4D 45420 locomotive dimensions
 const s=Object.assign(fresh(0),{map:'itpark',enableForks:true,mode:'running',distance:230,next:100000,lane:1,x:1});
 const car={type:'bus',collegeKind:'porsche',lane:0,z:290,length:4.6,roof:1.45,velocity:18,done:false};
 s.items=[car];
 step(s,.01);
 assert.equal(s.activeBranch,'underpass');
 assert.equal(car.metro,true);
 assert.ok(car.length>=12 && car.roof>=2.8,'oncoming cave train upgrades to full WDP4D locomotive size');
});
