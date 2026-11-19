import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,step,trafficPattern} from '../dist/engine.js';
import {Group} from '../dist/vendor/three.module.js';
import {createPickupModels} from '../dist/pickup-models.js';

test('generated routes use coin trails and only magnet/shield powerups',()=>{
  for(let index=0;index<80;index++){
    const items=trafficPattern(100+index*160,index);
    assert.ok(items.filter(o=>o.type==='coin').length>=4);
    assert.ok(items.every(o=>!['book','skill'].includes(o.type)));
    const s=fresh(0);s.mode='running';s.distance=1000;s.next=1000;s.trafficIndex=index;
    step(s,.01);
    assert.ok(s.items.every(o=>!['book','skill'].includes(o.type)));
    assert.ok(s.items.some(o=>o.type==='coin'));
  }
});

test('magnet attracts coins only, freezes on pause and shield absorbs a hit',()=>{
  const s=fresh(0);s.mode='running';s.distance=1000;s.next=100000;s.magnet=12;
  const coin={type:'coin',lane:1,z:1012},magnet={type:'magnet',lane:-1,z:1016},shield={type:'shield',lane:-1,z:1018};
  s.items=[coin,magnet,shield];step(s,.025);
  assert.equal(coin.done,true);assert.equal(s.coinFlights.length,1);assert.equal(magnet.lane,-1);assert.equal(shield.lane,-1);
  const remaining=s.magnet,lane=coin.lane,flightTime=s.coinFlights[0].elapsed;s.mode='paused';step(s,.2);
  assert.equal(s.magnet,remaining);assert.equal(coin.lane,lane);assert.equal(s.coinFlights[0].elapsed,flightTime);
  s.mode='running';for(let n=0;n<24;n++)step(s,.025);
  assert.equal(s.coins,1);
  s.items=[{type:'magnet',lane:0,z:s.distance+1},{type:'shield',lane:0,z:s.distance+1}];
  step(s,.025);assert.equal(s.magnet,12);assert.equal(s.shield,true);
  s.items=[{type:'block',lane:0,z:s.distance+1}];step(s,.025);
  assert.equal(s.shield,false);assert.equal(s.shieldAbsorbed,true);assert.equal(s.damage,0);
});

test('metallic powerup models animate deterministically and share geometry',()=>{
  const models=createPickupModels(),a=new Group(),b=new Group();models.add(a,'magnet');models.add(b,'magnet');
  const magnet=a.getObjectByName('magnet-pickup'),other=b.getObjectByName('magnet-pickup');
  assert.equal(magnet.children[0].geometry,other.children[0].geometry);
  assert.ok(magnet.children[1].material.envMap,'chrome pole caps have reflections');
  models.animate(a,'magnet',1,.3);const start=magnet.rotation.clone();
  models.animate(a,'magnet',2,.3);assert.ok(!magnet.rotation.equals(start));
  const frozen=magnet.rotation.clone();models.animate(a,'magnet',2,.3);assert.ok(magnet.rotation.equals(frozen));
  const shield=new Group();models.add(shield,'shield');models.animate(shield,'shield',2);
  assert.ok(shield.getObjectByName('shield-pickup').userData.glint);
  shield.updateMatrixWorld(true);shield.traverse(o=>assert.ok(o.matrixWorld.elements.every(Number.isFinite)));
});

test('magnet pulls road, parked-roof and moving-roof coins across lanes and heights exactly once',()=>{
  const s=fresh(0);s.mode='running';s.distance=125;s.next=100000;s.magnet=12;
  const far={type:'coin',lane:0,z:200};
  s.items=[{type:'coin',lane:-1,z:130},{type:'coin',lane:1,z:113},far,
    {id:'magnet-bus',type:'bus',roofRide:true,started:true,lane:1,z:127,length:22,roof:2.8,velocity:0}];
  step(s,.01);
  assert.equal(s.floor,0,'runner stays on the road');
  assert.equal(s.collected.length,8,'four parked-roof and four moving-roof coins');
  assert.equal(s.coinFlights.length,10,'also pulls coins ahead and behind across all lanes');
  assert.ok(s.coinFlights.some(f=>f.y>3));
  assert.ok(s.coinFlights.some(f=>f.y===1.1));
  assert.ok(!far.done,'coins outside the pickup radius stay in the world');
  s.mode='paused';const times=s.coinFlights.map(f=>f.elapsed);step(s,.05);
  assert.deepEqual(s.coinFlights.map(f=>f.elapsed),times);
  s.mode='running';s.magnet=0;
  for(let i=0;i<12;i++)step(s,.05);
  assert.equal(s.coins,10);assert.equal(s.coinFlights.length,0);
  step(s,.05);assert.equal(s.coins,10,'no second count after a flight arrives');
});

test('magnet also retrieves the four entry-bus coins from the opposite ground lane',()=>{
  const s=fresh(0);s.mode='running';s.distance=40;s.next=100000;s.lane=s.x=-1;s.magnet=12;
  step(s,.01);assert.equal(s.roofCoins,15);assert.equal(s.coinFlights.length,4);
  s.magnet=0;for(let i=0;i<12;i++)step(s,.05);
  assert.equal(s.coins,4);assert.equal(s.floor,0);
});
