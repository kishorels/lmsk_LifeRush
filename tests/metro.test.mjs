import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,step} from '../dist/engine.js';
import {Box3,Group,Matrix4,Scene} from '../dist/vendor/three.module.js';
import {createTraffic} from '../dist/traffic-scene.js';
import {buildWDP4DTrain,buildRailRampWagon} from '../dist/wdp4d-train.js';
import {createRoadEventsScene} from '../dist/itpark-events-scene.js';
import {curveRelX,curveRelY,curveSlopeAt} from '../dist/campus-layout.js';

test('IT Park keeps one moving vehicle model until its route changes it into a train',()=>{
 const scene=new Group(), render=createTraffic(scene);
 const bus={type:'bus',collegeKind:'semi',z:110,lane:0,length:10.5,roof:2.8,velocity:18};
 const state=Object.assign(fresh(2),{map:'itpark',mode:'running',distance:80,items:[bus]});
 render(state);
 const truck=scene.children.find(o=>o.position.z===-30);
 assert.ok(truck?.userData.wheels.length);
 for(let i=1;i<=4;i++){
  bus.z--;state.time+=1/18;
  render(state);
  assert.equal(truck.parent,scene);
  assert.equal(truck.position.z,state.distance-bus.z);
  assert.ok(truck.userData.wheels[0].rotation.x<0);
 }
 Object.assign(bus,{metro:true,length:12});
 render(state);
 assert.equal(truck.parent,null);
 assert.ok(scene.getObjectByName('metro-train'));
});

test('instanced tunnel walls and transparent panels follow the full curve up to the exit',()=>{
 const scene=new Scene(), render=createRoadEventsScene(scene);
 for(const start of [220,1670]){
  const state={map:'itpark',mode:'running',activeBranch:'underpass',branchStart:start,branchEnd:start+1000,time:5};
  for(const d of [0,183.9,184.1,720,997]){
   state.distance=start+d;
   render(state,{night:0,rain:0});
   scene.updateMatrixWorld();
   const tunnel=scene.getObjectByName('metro-tunnel');
   const panels=tunnel.children.filter(o=>o.isGroup&&o.visible);
   const walls=tunnel.children.filter(o=>o.isInstancedMesh&&o.visible);
   const first=Math.max(0,Math.floor((d-32)/16));
   const count=Math.min(24,Math.ceil(1000/16)-first);
   assert.equal(panels.length,count);
   assert.ok(walls.length>0&&walls.every(o=>!o.material.transparent));
   const instancedCenters=new Set();
   for(const wall of walls){
    for(let i=0;i<wall.count;i++){
     const m=new Matrix4();wall.getMatrixAt(i,m);
     instancedCenters.add(Math.round(-m.elements[14]));
    }
   }
   assert.equal(instancedCenters.size,count);
   for(const [i,panel] of panels.entries()){
    const from=(first+i)*16,length=Math.min(16,1000-from),center=start+from+length/2;
    assert.ok(instancedCenters.has(center-start));
    const expected=new Group();
    expected.position.set(curveRelX(center,state),curveRelY(center,state),state.distance-center);
    expected.rotation.y=-Math.atan(curveSlopeAt(center,state));
    expected.scale.z=length/16;expected.updateMatrix();
    assert.ok(panel.matrixWorld.elements.every((v,j)=>Math.abs(v-expected.matrix.elements[j])<1e-6));
    assert.ok(panel.children.every(o=>o.material.transparent));
   }
  }
 }
});

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
