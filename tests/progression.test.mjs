import test from 'node:test';
import assert from 'node:assert/strict';
import {powers,playerLevel,xpForLevel,parkOpen,runPickup} from '../dist/progression.js';
import {fresh,step,action,height,hits} from '../dist/engine.js';

test('College goals are independent and power milestones gate the live route',()=>{
  assert.equal(parkOpen({collegeBest:14999,collegeCoins:40000}),false);
  assert.equal(parkOpen({collegeBest:15000,collegeCoins:39999}),false);
  assert.equal(parkOpen({collegeBest:15000,collegeCoins:40000}),true);
  for (const power of powers) {
    assert.equal(playerLevel(xpForLevel(power.level)-1),power.level-1);
    assert.equal(playerLevel(xpForLevel(power.level)),power.level);
    for(let i=0;i<30;i++) assert.notEqual(runPickup(power.level-1,12,i,power.id),power.id);
    const s=fresh(12);
    Object.assign(s,{mode:'running',map:'itpark',level:power.level,featured:power.id,next:30});
    step(s,.01);
    assert.ok(s.items.some(item=>item.type===power.id));
  }
  assert.equal(playerLevel(1000000),50);
});

test('each unlocked pickup applies its gameplay effect',()=>{
  for (const {id} of powers) {
    const s=fresh(1);
    Object.assign(s,{mode:'running',next:1000,items:[{type:id,z:0,lane:0},{type:'block',z:10,lane:1}]});
    step(s,.01);
    assert.equal(s.collectedPowerup,id);
    if (id==='wave') assert.equal(s.items[1].cleared,true);
    if (id==='trail') assert.ok(s.items.filter(item=>item.type==='coin').length>=4);
    if (id==='rush') assert.ok(s.nitro>0 && s.magnet>0);
    if (id==='ghost') assert.equal(hits(s,{type:'block',lane:0}),false);
    if (id==='slow') { step(s,.01);assert.ok(s.speed<28); }
    if (id==='shoes'||id==='nitro') assert.ok(s[id]>0);
    if (id==='doubleCoins') {
      s.items.push({type:'coin',z:s.distance,lane:0});
      step(s,.01);assert.equal(s.coins,2);
    }
    if (id==='doubleJump') {
      action(s,'jump');step(s,.04);
      const y=height(s);action(s,'jump');assert.equal(height(s),y);
      const second=s.motionId;action(s,'jump');assert.equal(s.motionId,second);
    }
  }
});
