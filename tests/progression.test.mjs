import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_LEVEL, POWER_BASE_SECONDS, POWER_UPGRADE_STEP_SECONDS, POWER_UPGRADE_COSTS,
  MAP_ORDER, MAP_UNLOCK_RULES, CHARACTER_COSTS, ALL_CHARACTER_IDS,
  powers, powerDuration, playerLevel, xpForLevel, parkOpen, runPickup,
  freshProfile, normalizeProfile, mapBestFor, recordMapRunDistance,
  isMapUnlocked, isMapDistanceMet, canBuyMap, buyMap,
  characterCost, isCharacterUnlocked, canBuyCharacter, buyCharacter
} from '../dist/progression.js';
import {fresh,step,hits} from '../dist/engine.js';

test('fresh profile locks all maps except School and all characters except School Boy', () => {
  const p = freshProfile();
  assert.deepEqual(MAP_ORDER, ['school', 'college', 'itpark', 'finalrun']);
  assert.equal(isMapUnlocked(p, 'school'), true);
  assert.equal(isMapUnlocked(p, 'college'), false);
  assert.equal(isMapUnlocked(p, 'itpark'), false);
  assert.equal(isMapUnlocked(p, 'finalrun'), false);
  assert.equal(parkOpen(p), false);

  assert.equal(isCharacterUnlocked(p, 'male'), true);
  for (const id of ['female', 'college-male', 'college-woman', 'college-man', 'aged-elder']) {
    assert.equal(isCharacterUnlocked(p, id), false, `${id} starts locked`);
  }
  assert.deepEqual(CHARACTER_COSTS, {
    male: 0,
    female: 10000,
    'college-male': 12000,
    'college-woman': 15000,
    'college-man': 20000,
    'aged-elder': 25000
  });
});

test('map unlocks require single-run distance milestone AND spending exact coins (deducted from wallet)', () => {
  const p = freshProfile();

  // College: 15,000m in School + 20,000 Coins
  assert.equal(MAP_UNLOCK_RULES.college.reqMap, 'school');
  assert.equal(MAP_UNLOCK_RULES.college.reqDistance, 15000);
  assert.equal(MAP_UNLOCK_RULES.college.cost, 20000);

  recordMapRunDistance(p, 'school', 14999);
  assert.equal(isMapDistanceMet(p, 'college'), false);
  assert.equal(canBuyMap(p, 'college', 25000), false);
  assert.equal(buyMap(p, 'college', 25000).reason, 'distance');

  recordMapRunDistance(p, 'school', 15000);
  assert.equal(isMapDistanceMet(p, 'college'), true);
  assert.equal(canBuyMap(p, 'college', 19999), false);
  assert.equal(buyMap(p, 'college', 19999).reason, 'coins');

  // Exact coins -> drops wallet to 0
  const colRes = buyMap(p, 'college', 20000);
  assert.equal(colRes.ok, true);
  assert.equal(colRes.coins, 0);
  assert.equal(isMapUnlocked(p, 'college'), true);

  // IT Park: 10,000m in College (School 15k does NOT count!) + 20,000 Coins
  assert.equal(isMapDistanceMet(p, 'itpark'), false);
  recordMapRunDistance(p, 'college', 9999);
  assert.equal(isMapDistanceMet(p, 'itpark'), false);
  recordMapRunDistance(p, 'college', 10000);
  assert.equal(isMapDistanceMet(p, 'itpark'), true);
  assert.equal(canBuyMap(p, 'itpark', 19999), false);

  // Surplus coins -> leaves remaining coins
  const parkRes = buyMap(p, 'itpark', 27500);
  assert.equal(parkRes.ok, true);
  assert.equal(parkRes.coins, 7500);
  assert.equal(isMapUnlocked(p, 'itpark'), true);
  assert.equal(parkOpen(p), true);

  // Final Run: 10,000m in IT Park + 30,000 Coins
  assert.equal(isMapDistanceMet(p, 'finalrun'), false);
  recordMapRunDistance(p, 'itpark', 10000);
  assert.equal(isMapDistanceMet(p, 'finalrun'), true);
  assert.equal(buyMap(p, 'finalrun', 29999).reason, 'coins');

  const finalRes = buyMap(p, 'finalrun', 35250);
  assert.equal(finalRes.ok, true);
  assert.equal(finalRes.coins, 5250);
  assert.equal(isMapUnlocked(p, 'finalrun'), true);
  assert.equal(mapBestFor(p, 'school'), 15000);
  assert.equal(mapBestFor(p, 'college'), 10000);
  assert.equal(mapBestFor(p, 'itpark'), 10000);
});

test('characters unlock with exact coin spending (10k, 12k, 15k, 20k, 25k) and persist across normalizeProfile', () => {
  const p = freshProfile();
  let coins = 85000;

  assert.equal(buyCharacter(p, 'female', 9999).ok, false);
  assert.equal(canBuyCharacter(p, 'female', 10000), true);

  for (const [id, cost] of [
    ['female', 10000],
    ['college-male', 12000],
    ['college-woman', 15000],
    ['college-man', 20000],
    ['aged-elder', 25000]
  ]) {
    assert.equal(characterCost(id), cost);
    const res = buyCharacter(p, id, coins);
    assert.equal(res.ok, true, `should unlock ${id}`);
    assert.equal(res.coins, coins - cost);
    coins = res.coins;
    assert.equal(isCharacterUnlocked(p, id), true);
  }
  assert.equal(coins, 3000);
  assert.deepEqual(p.unlockedChars.length, ALL_CHARACTER_IDS.length);

  // Round-trip through JSON & normalizeProfile preserves unlocks; legacy v1 saves stay locked
  const restored = normalizeProfile(JSON.parse(JSON.stringify(p)));
  assert.deepEqual(restored.unlockedChars, p.unlockedChars);
  const legacy = normalizeProfile({ xp: 900, itParkUnlocked: true, collegeBest: 5000 });
  assert.equal(legacy.xp, 900);
  assert.equal(isMapUnlocked(legacy, 'itpark'), false);
  assert.equal(isCharacterUnlocked(legacy, 'female'), false);
});

test('max level is 25 and only the 4 powers unlock at Lv 10/15/20/25 with +2s upgrades',()=>{
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
