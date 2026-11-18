import test from 'node:test';import assert from 'node:assert/strict';
import {campusAnchor,CAMPUS_SLOTS} from '../dist/campus-layout.js';
import {trafficPattern,repeatedVans} from '../dist/traffic-rules.js';
import {createCampus} from '../dist/campus-scene.js';import {Scene} from '../dist/vendor/three.module.js';
test('visible campus slots move continuously and only recycle behind the camera',()=>{
 for(let d=0;d<3000;d+=.4)for(let i=0;i<CAMPUS_SLOTS;i++){
  const a=campusAnchor(i,d),b=campusAnchor(i,d+.4);
  if(a!==b){assert.ok(d+.4-a>40);assert.ok(b-(d+.4)>200);}
  else assert.ok(Math.abs(((d+.4-b)-(d-a))-.4)<1e-9);
 }
});
test('bus lane never contains a slide/jump barrier and roof exit has reaction space',()=>{
 for(let i=0;i<100;i++){
  const base=100+i*160,row=trafficPattern(base,i),busLane=row.find(o=>o.type==='bus').lane;
  const barriers=row.filter(o=>['slide','jump','block'].includes(o.type));
  assert.ok(barriers.every(o=>o.lane!==busLane));
  if(row.some(o=>o.type==='sideVehicle')){assert.equal(barriers.length,1);assert.equal(barriers[0].z,base+145);continue;}
  assert.equal(barriers.length,1);assert.ok(barriers[0].z-(base+68)>=70);
 }
});
test('campus keeps bounded batched geometry through long runs and restart',()=>{
 const scene=new Scene(),render=createCampus(scene);
 for(const distance of [0,100,300,700,3000,0]){
  render({distance});let count=0;scene.traverse(o=>{if(o.isMesh)count++;assert.ok(o.position.toArray().every(Number.isFinite));});assert.ok(count<250);assert.equal(scene.children.length,CAMPUS_SLOTS);
 }
});
