import test from 'node:test';
import assert from 'node:assert/strict';
import {Scene} from '../dist/vendor/three.module.js';
import {createFramePacer} from '../dist/frame-pacing.js';
import {createVillageRoute} from '../dist/village-scene.js';

test('sustained slow frames change drawing cadence without losing animation time',()=>{
  const pacer=createFramePacer();
  let time=0, drawnSeconds=0;
  pacer.frame(time);
  function tick(ms){
    time+=ms;
    const elapsed=pacer.frame(time);
    if(elapsed!==null)drawnSeconds+=elapsed;
    return elapsed;
  }
  tick(95);
  for(let i=0;i<130;i++)tick(1000/60);
  assert.equal(pacer.target,60);
  for(let i=0;i<180;i++)tick(25);
  assert.equal(pacer.target,30);
  let draws=0;
  for(let i=0;i<120;i++)if(tick(1000/60)!==null)draws++;
  assert.ok(Math.abs(draws-60)<=1);
  assert.ok(Math.abs(drawnSeconds-time/1000)<.034);
  for(let i=0;i<1500;i++)tick(1000/60);
  assert.equal(pacer.target,60);
  assert.equal(tick(2000),0);
});

test('village sections reuse their road, grass and houses with the original seeded layout on replay',()=>{
  const scene=new Scene();
  const update=createVillageRoute(scene);
  const state={map:'finalrun',mode:'running',distance:0,time:2};
  const draw=distance=>{state.distance=distance;update(state);};
  draw(0);
  const root=scene.getObjectByName('school-village-road');
  const slots=[...root.children];
  const first=slots.find(slot=>slot.userData.index===0);
  const road=first.children.find(child=>child.userData.tessellate);
  const grass=first.children.find(child=>child.geometry?.attributes.color);
  const home=first.children.find(child=>child.userData.villageHouse);
  const roadBuffer=road.geometry.attributes.position;
  const grassBuffer=grass.geometry.attributes.position;
  const coordinates=roadBuffer.array.slice();
  const grassCount=grass.geometry.drawRange.count;
  const grassVertices=grassBuffer.array.slice(0,3*grassCount);
  for(let i=1;i<=45;i++)draw(i*64);
  assert.equal(root.children.length,slots.length);
  assert.ok(slots.every((slot,i)=>slot===root.children[i]));
  assert.notDeepEqual(roadBuffer.array,coordinates);
  draw(0);
  assert.ok(home.visible);
  assert.equal(road.geometry.attributes.position,roadBuffer);
  assert.equal(grass.geometry.attributes.position,grassBuffer);
  assert.deepEqual(roadBuffer.array,coordinates);
  assert.equal(grass.geometry.drawRange.count,grassCount);
  assert.deepEqual(grassBuffer.array.slice(0,3*grassCount),grassVertices);
});
