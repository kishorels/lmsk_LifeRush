import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,step,action,height,hits,busSurface} from '../dist/engine.js';
import {trafficPattern} from '../dist/traffic-rules.js';
function setup(index){const base=100+index*160,s=fresh();s.mode='running';s.distance=base+55;s.next=100000;s.items=trafficPattern(base,index).filter(o=>o.roofRide);s.x=s.lane=[-1,1,0][index%3];s.floor=1.72;return {s,base};}
test('jump from parked roof lands on moving bus, runs and collects coins at both speeds',()=>{
 for(const index of [0,20])for(const dt of [.01,.05]){const {s,base}=setup(index);while(s.distance<base+64)step(s,dt);action(s,'jump');let roofFrames=0,air=false;const bus=s.items.find(o=>o.roofRide),start=bus.z;
  for(let i=0;i<Math.ceil(1.8/dt);i++){step(s,dt);if(s.floor===2.8&&!s.jump){roofFrames++;assert.equal(hits(s,bus),false);}if(height(s)>3)air=true;}
  assert.ok(air);assert.ok(roofFrames*dt>.15,`roof run ${roofFrames*dt}`);assert.ok(bus.z>start);assert.ok(s.coins>0);assert.equal(s.damage,0);
 }
});
test('moving roof freezes with pause and walking off its side falls naturally',()=>{const {s,base}=setup(0);while(s.distance<base+64)step(s,.01);action(s,'jump');for(let i=0;i<100&&s.floor!==2.8;i++)step(s,.01);assert.equal(s.floor,2.8);const bus=s.items.find(o=>o.roofRide),z=bus.z;s.mode='paused';step(s,.05);assert.equal(bus.z,z);assert.equal(busSurface(s),2.8);s.mode='running';action(s,'right');for(let i=0;i<100;i++)step(s,.01);assert.equal(height(s),0);assert.equal(s.damage,0);});
test('roofs are solid only from above: ground hits and airborne clearance remain correct',()=>{const s=fresh();s.x=0;const bus={type:'bus',lane:0,z:0,length:10,roof:2.8};assert.ok(hits(s,bus));s.floor=2.8;assert.equal(hits(s,bus),false);s.floor=3.5;assert.equal(hits(s,bus),false);s.floor=1.72;assert.ok(hits(s,bus));});
test('complete generated ramp-to-roof-to-moving-bus route is possible without damage',()=>{
 for(const index of [0,20]){const base=100+index*160,s=fresh();s.mode='running';s.distance=base-25;s.next=100000;s.items=trafficPattern(base,index);s.lane=s.x=[-1,1,0][index%3];let first=false,second=false,landed=false;
  while(s.distance<base+143){if(!first&&s.distance>=base+30){action(s,'jump');first=true;}if(first&&!second&&s.distance>=base+64&&!s.jump&&s.floor===1.72){action(s,'jump');second=true;}step(s,.01);if(s.floor===2.8&&!s.jump)landed=true;}
  assert.ok(second&&landed);assert.equal(s.damage,0);assert.equal(height(s),0);
 }
});
