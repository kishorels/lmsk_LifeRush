import test from 'node:test';import assert from 'node:assert/strict';import{fresh,action,step,hits,pattern,career,height,chaseRemaining,chasePose,capturePose,CAPTURE_DURATION,reviveRun,PICKUP_TYPES,ROAD_EVENT_TYPES}from'../dist/engine.js';
test('lane boundaries and pause input',()=>{const s=fresh(0);s.mode='running';for(let i=0;i<10;i++)action(s,'right');assert.equal(s.lane,1);for(let i=0;i<10;i++)action(s,'left');assert.equal(s.lane,-1);s.mode='paused';action(s,'right');assert.equal(s.lane,-1);});
test('jump, slide and collision outcomes',()=>{const s=fresh(0);s.mode='running';assert.ok(hits(s,{lane:0,type:'jump'}));action(s,'jump');s.jump=.475;assert.equal(hits(s,{lane:0,type:'jump'}),false);assert.ok(hits(s,{lane:0,type:'block'}));s.jump=0;action(s,'slide');assert.equal(hits(s,{lane:0,type:'slide'}),false);for(let i=0;i<20;i++)step(s,.05);assert.equal(s.slide,0);assert.ok(hits(s,{lane:0,type:'slide'}));});
test('safe generated rows and reset',()=>{for(let i=0;i<1000;i++){const row=pattern(50);assert.equal(row.filter(x=>x.type!=='coin').length,1);assert.notEqual(row[0].lane,row[1].lane);}const s=fresh(0);s.skills[0]=100;s.distance=300;s.items.push({});const reset=fresh(0);assert.deepEqual(reset.skills,[0,0,0]);assert.equal(reset.distance,0);assert.equal(reset.items.length,0);});
test('collection, crash, frozen pause, and countdown',()=>{const s=fresh(0);s.mode='running';s.next=1000;s.items=[{z:1,lane:0,type:'coin'}];step(s,.05);assert.equal(s.coins,1);s.mode='paused';const d=s.distance;step(s,.05);assert.equal(s.distance,d);s.mode='countdown';s.countdown=.02;step(s,.05);assert.equal(s.mode,'running');s.items=[{z:1,lane:0,type:'block'}];step(s,.05);assert.equal(s.mode,'running');assert.equal(s.damage,1);assert.ok(s.hit);for(let i=0;i<15;i++)step(s,.05);assert.equal(s.damage,1);s.items=[{z:s.distance+1,lane:0,type:'slide'}];step(s,.05);assert.equal(s.mode,'falling');assert.equal(s.damage,2);for(let i=0;i<20;i++)step(s,.05);assert.equal(s.mode,'captured');for(let i=0;i<Math.ceil(CAPTURE_DURATION/.05)+1;i++)step(s,.05);assert.equal(s.mode,'crashed');});
test('career ties are explicit',()=>{assert.equal(career([2,2,0]),'Engineer / Doctor');assert.equal(career([0,0,0]),'Your story is still unwritten');});

test('airborne down input drops from the current height and ground double down rolls', () => {
  const s = fresh(0);
  s.mode = 'running';
  s.next = 1000;
  action(s, 'jump');
  for (let i = 0; i < 7; i++) step(s, .05);
  const airborne = height(s);
  action(s, 'slide');
  assert.equal(height(s), airborne);
  step(s, .05);
  assert.ok(height(s) < airborne && height(s) > 0);
  action(s, 'slide');
  assert.equal(s.roll, 0);
  for (let i = 0; i < 5; i++) step(s, .05);
  assert.equal(height(s), 0);
  action(s, 'slide');
  assert.ok(s.slide);
  step(s, .05);
  action(s, 'slide');
  assert.equal(s.slide, 0);
  assert.ok(s.roll);
  assert.equal(hits(s, { lane: 0, type: 'slide' }), false);
});

test('escaping the chaser restores both hearts and starts a fresh chase on the next hit', () => {
  const s = fresh(0);
  const advance = frames => { for (let i = 0; i < frames; i++) step(s,.05); };
  const hit = () => {
    s.items.push({z:s.distance+1,lane:0,type:'block'});
    step(s,.05);
  };
  assert.equal(chasePose(s), null);
  s.mode = 'running';
  s.next = 10000;
  assert.equal(chaseRemaining(s), 3);
  advance(59);
  assert.ok(chasePose(s));
  advance(2);
  assert.equal(chasePose(s), null);
  hit();
  assert.equal(s.damage, 1);
  assert.ok(Math.abs(chaseRemaining(s) - 5) < 1e-10);
  const beforePause = chasePose(s);
  s.mode = 'paused';
  advance(20);
  assert.deepEqual(chasePose(s), beforePause);
  s.mode = 'running';
  for (let cycle = 0; cycle < 2; cycle++) {
    advance(99);
    assert.ok(chasePose(s));
    assert.equal(s.damage, 1);
    advance(2);
    assert.equal(chasePose(s), null);
    assert.equal(s.damage, 0);
    assert.equal(s.firstHitAt, null);
    hit();
    assert.equal(s.mode, 'running');
    assert.equal(s.damage, 1);
    assert.ok(Math.abs(chaseRemaining(s)-5) < 1e-10);
  }
  advance(15);
  hit();
  assert.equal(s.mode, 'falling');
  assert.equal(s.damage, 2);
  assert.equal(chaseRemaining(fresh(0)), 0);
});

test('a second hit during pursuit lets the chaser catch up during the fall', () => {
  const s = fresh(0);
  s.mode = 'running';
  s.next = 10000;
  s.items = [{z:1,lane:0,type:'block'}];
  step(s,.05);
  for (let i = 0; i < 15; i++) step(s,.05);
  s.items = [{z:s.distance+1,lane:0,type:'block'}];
  step(s,.05);
  assert.equal(s.mode,'falling');
  const behind = chasePose(s).z;
  for (let i = 0; i < 20; i++) step(s,.05);
  assert.equal(s.mode,'captured');
  const distance = s.distance;
  for (let i=0;i<30;i++) step(s,.05);
  assert.ok(capturePose(s).lift>.9);
  assert.equal(s.distance,distance);
  for (let i=0;i<Math.ceil(CAPTURE_DURATION/.05)+1;i++) step(s,.05);
  assert.equal(s.mode,'crashed');
  assert.equal(s.capture,CAPTURE_DURATION);
  assert.ok(chasePose(s).z < behind);
  assert.equal(chasePose(s).stop,1);
});

test('a collision exactly when the chase expires opens a new chase', () => {
  const s = fresh(0);
  s.mode = 'running';
  s.next = 10000;
  s.firstHitAt = 1;
  s.time = 5.96875;
  s.damage = 1;
  s.items = [{ z: 1, lane: 0, type: 'block' }];
  step(s, .03125);
  assert.equal(s.time, 6);
  assert.equal(s.mode, 'running');
  assert.equal(s.damage, 1);
  assert.equal(s.firstHitAt, 6);
  assert.equal(chaseRemaining(s), 5);
});

test('the right ramp leads onto the van roof and back to the road', () => {
  const s = fresh(0);
  s.mode = 'running';
  s.next = 10000;
  action(s, 'right');
  let roofHeight = 0;
  let airborneAfterExit = false;
  for (let i = 0; i < 85; i++) {
    step(s, .05);
    if (s.distance > 42 && s.distance < 54) {
      roofHeight = Math.max(roofHeight, height(s));
    }
    if (s.distance >= 54 && s.fallSpeed) airborneAfterExit = true;
  }
  assert.equal(roofHeight, 1.72);
  assert.equal(s.coins, 4);
  assert.equal(s.damage, 0);
  assert.ok(airborneAfterExit);
  assert.equal(height(s), 0);
  assert.equal(s.fallSpeed, 0);
});

test('the middle lane stays clear and a late lane change cannot climb the van side', () => {
  const s = fresh(0);
  s.mode = 'running';
  s.next = 10000;
  while (s.distance < 44) step(s,.05);
  assert.equal(height(s), 0);
  assert.equal(s.damage, 0);
  action(s,'right');
  for(let i=0;i<8;i++) step(s,.05);
  assert.equal(s.damage, 1);
  assert.ok(s.vanHit);
  assert.equal(s.lane, 0);
  assert.equal(height(s), 0);
});

test('late swipe or jump onto sloped entry ramp climbs cleanly instead of clipping inside the bus', () => {
  // Swiping onto the middle of the sloped ramp (distance 27 of 22..32) climbs onto the roof without taking a hit
  const s1 = fresh(0);
  s1.mode = 'running';
  s1.next = 10000;
  while (s1.distance < 27) step(s1, .05);
  action(s1, 'right');
  let reachedRoof = false;
  while (s1.distance < 48) {
    step(s1, .05);
    if (s1.distance > 34 && height(s1) === 1.72) reachedRoof = true;
  }
  assert.ok(reachedRoof, 'swiping onto mid-ramp climbs cleanly onto the 1.72m roof');
  assert.equal(s1.damage, 0, 'mid-ramp swipe does not clip into the bus body');

  // Jumping just before the ramp and landing on the rising slope stays above the ramp and climbs to roof
  const s2 = fresh(0);
  s2.mode = 'running';
  s2.next = 10000;
  action(s2, 'right');
  while (s2.distance < 10) step(s2, .05);
  action(s2, 'jump');
  let landedRoof = false;
  while (s2.distance < 48) {
    step(s2, .05);
    if (s2.distance > 35 && height(s2) === 1.72) landedRoof = true;
  }
  assert.ok(landedRoof, 'jumping onto rising ramp climbs cleanly onto roof without falling through');
  assert.equal(s2.damage, 0, 'jumping onto rising ramp never clips inside bus');
});

test('quick drop during a roof jump snaps to the roof and leaving the lane drops to ground', () => {
  const s = fresh(0);
  s.mode = 'running';
  s.next = 10000;
  action(s,'right');
  while (s.distance<42) step(s,.025);
  action(s,'jump');
  for(let i=0;i<5;i++) step(s,.025);
  assert.ok(height(s)>2);
  action(s,'slide');
  for(let i=0;i<8;i++) step(s,.025);
  assert.equal(height(s), 1.72);
  assert.equal(s.drop, null);
  action(s,'left');
  for(let i=0;i<30;i++) step(s,.025);
  assert.equal(height(s), 0);
  assert.equal(s.damage, 0);
});

test('above 5k m obstacles target player lane and scale with distance', () => {
  const s = fresh(0);
  s.mode = 'running';
  s.distance = 5000;
  s.lane = s.x = 1; // player is in lane 1
  s.next = 100000;
  step(s, .05);
  // An obstacle must be generated in lane 1
  const targeted = s.items.filter(o => !['coin','magnet','shield'].includes(o.type) && o.lane === 1);
  assert.ok(targeted.length >= 1, 'obstacle placed in player lane 1');

  // Change lane to -1
  action(s, 'left');
  action(s, 'left');
  assert.equal(s.lane, -1);
  // Advance distance
  s.distance = 5200;
  step(s, .05);
  const leftTargeted = s.items.filter(o => !['coin','magnet','shield'].includes(o.type) && o.lane === -1 && o.z > 5200);
  assert.ok(leftTargeted.length >= 1, 'obstacle placed in player lane -1 after lane switch');
});

test('continuous multi-tier speed climbs across 0, 1k, 2k, 5k, 8k, 10k and beyond', () => {
  const checkpoints = [[0, 28], [1000, 34], [2000, 41], [5000, 48], [7000, 64], [8000, 78], [10000, 96], [12000, 136]];
  let previous = 0;
  for (const [distance, expected] of checkpoints) {
    const s = fresh(0);
    s.mode = 'running';
    s.distance = distance;
    s.next = 100000;
    step(s, .01);
    assert.equal(Math.round(s.speed), expected, `expected ~${expected} m/s at ${distance}m`);
    assert.ok(s.speed > previous, `speed at ${distance}m must exceed previous tier`);
    previous = s.speed;
  }
});

test('first hit enables injured state for InjuredRun playback and recovers after 10 seconds', () => {
  const s = fresh(0);
  assert.equal(s.injured, false);
  s.mode = 'running';
  s.next = 100000;
  s.items = [{ z: 1, lane: 0, type: 'block' }];
  step(s, .05);
  assert.equal(s.damage, 1);
  assert.equal(s.injured, true);
  // Still injured at ~9.5s after hit (even after chaser escapes at 5s)
  for (let i = 0; i < 190; i++) step(s, .05);
  assert.equal(s.injured, true);
  // Recovers back to normal run once 10s have elapsed
  for (let i = 0; i < 15; i++) step(s, .05);
  assert.equal(s.injured, false);
});

test('above 10k m one hit causes instant game over', () => {
  const s = fresh(0);
  s.mode = 'running';
  s.distance = 10050;
  s.next = 100000;
  s.items = [{ z: s.distance + 1, lane: 0, type: 'block' }];
  step(s, .05);
  assert.equal(s.damage, 2, 'damage immediately set to 2');
  assert.equal(s.mode, 'falling', 'one hit directly triggers falling/out');
});

test('all 3 lanes are never simultaneously blocked across low, mid, and high speeds', () => {
  for (const seed of [1, 7, 42]) {
    for (const startDist of [100, 2200, 5200, 8400, 10400]) {
      const s = fresh(seed);
      s.mode = 'running';
      s.distance = startDist;
      s.next = startDist + 10;
      s.nextMidObstacle = startDist + 50;
      s.nextLaneObstacle = startDist + 50;
      for (let i = 0; i < 120; i++) {
        step(s, .05);
        s.damage = 0; s.mode = 'running'; s.hit = 0;
        const nearZ = s.distance + s.speed * 0.55;
        const blocked = new Set();
        for (const o of s.items) {
          if (o.done || PICKUP_TYPES.has(o.type) || ROAD_EVENT_TYPES.has(o.type)) continue;
          if (o.encounter && !o.started) continue;
          const len = o.length || 2.5;
          if (nearZ >= o.z - 2 && nearZ <= o.z + len + 2) blocked.add(o.lane);
        }
        assert.ok(blocked.size < 3, `seed ${seed} dist ${Math.round(s.distance)} must leave >=1 escape lane`);
      }
    }
  }
});

test('near-miss close calls award combo bonuses, nitro smashes obstacles, super shoes boost jump, and revive clears hazards', () => {
  const s = fresh(0);
  s.mode = 'running';
  s.next = 100000;
  s.lane = s.x = 0;
  // Adjacent block triggers Near Miss + combo x2 + 10 bonus coins
  s.items = [{ z: 1, lane: 1, type: 'block', done: false }];
  step(s, .05);
  assert.equal(s.nearMissCount, 1);
  assert.equal(s.combo, 2);
  assert.equal(s.coins, 10);

  // Super Jump Shoes raise jump apex above 3m (clearing 2.8m bus roofs)
  s.items = [{ z: s.distance + 0.5, lane: 0, type: 'shoes', done: false }];
  step(s, .05);
  assert.ok(s.shoes > 8);
  action(s, 'jump');
  let maxH = 0;
  for (let i = 0; i < 20; i++) { step(s, .04); maxH = Math.max(maxH, height(s)); }
  assert.ok(maxH > 3.1, `Super Shoes jump apex should clear bus roofs, got ${maxH}`);

  // Nitro Rush boosts speed and smashes right through a block without damage
  s.items = [{ z: s.distance + 0.5, lane: 0, type: 'nitro', done: false }];
  step(s, .05);
  assert.ok(s.nitro > 4);
  assert.ok(s.speed >= 56);
  s.items = [{ z: s.distance + 0.5, lane: 0, type: 'block', done: false }];
  const beforeDamage = s.damage;
  step(s, .05);
  assert.equal(s.damage, beforeDamage, 'Nitro smashes obstacle without taking damage');

  // Revive clears ahead obstacles, restores shield, and enters countdown
  s.nitro = 0; s.damage = 2; s.mode = 'crashed'; s.injured = true;
  s.items = [{ z: s.distance + 15, lane: 0, type: 'block', done: false }];
  reviveRun(s);
  assert.equal(s.mode, 'countdown');
  assert.equal(s.damage, 0);
  assert.equal(s.injured, false);
  assert.equal(s.shield, true);
  assert.equal(s.revivedOnce, true);
  assert.equal(s.items[0].done, true);
});
