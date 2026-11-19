import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,step,height,trafficPattern,routeVans,action} from '../dist/engine.js';
test('oncoming bus movement, pause, and one hit per vehicle',()=>{
 const s=fresh(0);s.mode='running';s.next=10000;s.distance=100;
 const b={type:'bus',lane:0,z:106,length:10,velocity:18,activate:0,done:false};s.items=[b];
 step(s,.05);assert.ok(b.z<106);const z=b.z;s.mode='paused';step(s,.05);assert.equal(b.z,z);s.mode='running';
 for(let i=0;i<14;i++)step(s,.05);assert.equal(s.damage,1);assert.equal(s.mode,'running');
});
test('late lane entry hits bus side but not a passed bus',()=>{
 for(const [z,damage]of [[96,1],[85,0]]){const s=fresh(0);s.mode='running';s.next=10000;s.distance=100;s.items=[{type:'bus',lane:0,z,length:10,done:false}];step(s,.025);assert.equal(s.damage,damage);}
});
test('repeated ramp works at maximum speed',()=>{
 const s=fresh(0);s.mode='running';s.next=100000;s.distance=2670;s.x=s.lane=1;let reached=false;
 while(s.distance<2701){step(s,.05);if(s.distance>2683 && height(s)===1.72)reached=true;}
 assert.ok(reached);assert.equal(s.damage,0);assert.ok(s.coins>0);
});
test('every traffic block leaves a ground lane free',()=>{
 for(let i=0;i<90;i++){const base=100+i*160,items=trafficPattern(base,i),lanes=new Set(items.filter(o=>o.type!=='coin').map(o=>o.lane));
 for(const v of routeVans(base))if(v.ramp>=base&&v.ramp<base+160)lanes.add(v.lane);
 assert.equal(lanes.size,2);assert.ok(!lanes.has(items.find(o=>o.type==='coin').lane));}
});
test('jump bridges roof gap and lands on the second vehicle',()=>{
 const s=fresh(0);s.mode='running';s.next=100000;s.distance=110;s.x=s.lane=-1;
 while(s.distance<137)step(s,.025);assert.equal(height(s),1.72);action(s,'jump');
 while(s.jump>0)step(s,.01);assert.ok(s.distance<168);assert.equal(s.damage,0);assert.equal(height(s),1.72);
});

test('first bus hit relocates to an empty ground lane and second hit still ends run',()=>{
 const s=fresh(0);s.mode='running';s.distance=120;s.next=100000;s.x=s.lane=0;
 s.items=[{type:'bus',lane:0,z:120,length:10,done:false},{type:'block',lane:-1,z:127,done:false}];
 step(s,.025);assert.equal(s.damage,1);assert.equal(s.lane,1);assert.equal(s.x,1);assert.ok(s.hit>.9);
 for(let i=0;i<40;i++)step(s,.025);
 s.items.push({type:'bus',lane:1,z:s.distance+1,length:10,done:false});step(s,.025);
 assert.equal(s.mode,'falling');assert.equal(s.damage,2);
});
test('crowded recovery corridor is cleared without chained hits',()=>{
 const s=fresh(0);s.mode='running';s.distance=80;s.next=100000;s.x=s.lane=0;
 s.items=[{type:'bus',lane:0,z:80,length:10,done:false},...[-1,0,1].map(lane=>({type:'block',lane,z:81,done:false}))];
 step(s,.025);assert.equal(s.damage,1);assert.equal(s.mode,'running');
 assert.equal(s.items.filter(o=>o.lane===s.lane&&o.type!=='coin').length,0);
});
