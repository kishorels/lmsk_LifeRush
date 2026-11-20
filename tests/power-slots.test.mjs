import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,availablePowers,equipPowers,usePower,step} from '../dist/engine.js';
test('owned power slots are capped, independent, and recharge by distance from use',()=>{
  const s=fresh(14);
  s.mode='running';
  assert.deepEqual(availablePowers(1),[]);
  assert.ok(!availablePowers(50).includes('magnet')&&!availablePowers(50).includes('shield'),'magnet & shield are collectibles, not powers');
  s.level=50;
  equipPowers(s,['nitro','magnet','nitro','shield','doubleCoins','slow']);
  assert.deepEqual(s.slots.map(slot=>slot.id),['nitro','doubleCoins']);
  s.distance=80;
  assert.ok(usePower(s,0));
  assert.equal(s.nitro,10);
  s.distance=250;
  assert.ok(usePower(s,1));
  s.time+=10;
  s.distance=1079.99;
  assert.equal(usePower(s,0),false);
  s.distance=1080;
  assert.ok(usePower(s,0));
  assert.equal(usePower(s,1),false);
  s.distance=1250;
  assert.ok(usePower(s,1));
  assert.equal(usePower(s,2),false);
});
test('every selected power lasts ten seconds of simulation; new routes contain coins but no power pickups',()=>{
  for(const id of availablePowers(50)){
    const s=fresh(14);
    Object.assign(s,{level:50,mode:'running',next:40});
    equipPowers(s,[id]);
    assert.ok(usePower(s,0));
    step(s,.05);
    assert.ok(s.items.some(item=>item.type==='coin'));
    assert.ok(!s.items.some(item=>availablePowers(50).includes(item.type)));
    assert.equal(s.slots[0].until,10);
    const now=s.time;
    s.mode='paused';step(s,.1);
    assert.equal(s.time,now);
    assert.equal(usePower(s,0),false);
  }
});
