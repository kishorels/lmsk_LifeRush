import test from 'node:test';
import assert from 'node:assert/strict';
import {MAX_LEVEL,POWER_BASE_SECONDS,POWER_UPGRADE_STEP_SECONDS,POWER_UPGRADE_COSTS,powers,powerDuration,playerLevel,xpForLevel,parkOpen,runPickup} from '../dist/progression.js';
import {fresh,step,hits} from '../dist/engine.js';

test('College goals are independent, max level is 25, and only the 4 powers unlock at Lv 10/15/20/25 with +2s upgrades',()=>{
  assert.equal(parkOpen({collegeBest:14999,collegeCoins:40000}),false);
  assert.equal(parkOpen({collegeBest:15000,collegeCoins:39999}),false);
  assert.equal(parkOpen({collegeBest:15000,collegeCoins:40000}),true);
  assert.equal(MAX_LEVEL, 25);
  assert.deepEqual(
    powers.map(p => [p.level, p.id, p.name]),
    [
      [10, 'shoes', 'Super Jump Shoes'],
      [15, 'doubleCoins', '2x Coins'],
      [20, 'nitro', 'Nitro Rush'],
      [25, 'ghost', 'Invisible'],
    ]
  );
  for (const power of powers) {
    assert.equal(playerLevel(xpForLevel(power.level)-1),power.level-1);
    assert.equal(playerLevel(xpForLevel(power.level)),power.level);
    for(let i=0;i<30;i++) assert.notEqual(runPickup(power.level-1,12,i,power.id),power.id);
    const s=fresh(12);
    Object.assign(s,{mode:'running',map:'itpark',level:power.level,featured:power.id,next:30});
    step(s,.01);
    assert.ok(s.items.some(item=>item.type===power.id));
    for (let tier = 0; tier <= POWER_UPGRADE_COSTS.length; tier++) {
      assert.equal(powerDuration(power.id, { [power.id]: tier }), POWER_BASE_SECONDS + tier * POWER_UPGRADE_STEP_SECONDS);
    }
  }
  assert.equal(playerLevel(1000000),25);
});

test('each unlocked pickup applies its gameplay effect',()=>{
  for (const {id} of powers) {
    const s=fresh(1);
    Object.assign(s,{mode:'running',next:1000,items:[{type:id,z:0,lane:0},{type:'block',z:10,lane:1}]});
    step(s,.01);
    assert.equal(s.collectedPowerup,id);
    if (id==='ghost') assert.equal(hits(s,{type:'block',lane:0}),false);
    if (id==='shoes'||id==='nitro') assert.ok(s[id]>0);
    if (id==='doubleCoins') {
      s.items.push({type:'coin',z:s.distance,lane:0});
      step(s,.01);assert.equal(s.coins,2);
    }
  }
});
