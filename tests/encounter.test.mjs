import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,step,action} from '../dist/engine.js';
import {trafficPattern,sideVehicleX} from '../dist/traffic-rules.js';
import {createCaptureStage} from '../dist/capture-stage.js';
import {buildSideVehicle} from '../dist/side-vehicles.js';
import {Scene,Group,DirectionalLight} from '../dist/vendor/three.module.js';
function setup(index){const base=100+index*160,s=fresh();s.mode='running';s.distance=base+44;s.next=100000;s.items=trafficPattern(base,index);return s;}
test('side encounters give a one-second escape after entry on both sides and at maximum speed',()=>{
 for(const index of [3,7,11,19]){const s=setup(index),o=s.items.find(o=>o.type==='sideVehicle'),b=s.items.find(o=>o.type==='bus');s.x=s.lane=o.lane;
 while(!o.started)step(s,.01);assert.equal(o.startedAt,b.startedAt);assert.ok(Math.abs(sideVehicleX(o,s.time))>5);
 while(s.time-o.startedAt<.45)step(s,.01);assert.equal(s.damage,0);assert.ok(Math.abs(sideVehicleX(o,s.time)-o.lane*2.2)<.001);
 const remaining=(b.z-s.distance)/(s.speed+b.velocity);assert.ok(remaining>.9&&remaining<1.02);
 action(s,o.lane===1?'left':'right');action(s,o.lane===1?'left':'right');for(let i=0;i<160;i++)step(s,.01);assert.equal(s.damage,0);assert.equal(s.lane,-o.lane);
 }
});
test('pending vehicles cannot hit; pause freezes entry, and standing in centre hits the bus',()=>{const s=setup(3),o=s.items[0];step(s,.05);const x=sideVehicleX(o,s.time),time=s.time;s.mode='paused';step(s,.05);assert.equal(s.time,time);assert.equal(sideVehicleX(o,s.time),x);s.mode='running';for(let i=0;i<170;i++)step(s,.01);assert.equal(s.damage,1);assert.equal(s.cause,'bus');});
test('capture hides every route object and restores original visibility on restart',()=>{const scene=new Scene(),bus=new Group(),hero=new Group(),villain=new Group(),hidden=new Group(),light=new DirectionalLight();hidden.visible=false;scene.add(bus,hero,villain,hidden,light);const stage=createCaptureStage(scene);stage.show([hero,villain]);assert.equal(bus.visible,false);assert.ok(hero.visible&&villain.visible&&light.visible);stage.restore();assert.ok(bus.visible);assert.equal(hidden.visible,false);});
test('all side vehicle variants have finite geometry',()=>{for(const type of ['cycle','bike','car']){const g=buildSideVehicle(type);g.updateMatrixWorld(true);g.traverse(m=>{assert.ok(m.matrixWorld.elements.every(Number.isFinite));});assert.ok(g.userData.wheels.length>=2);}});
