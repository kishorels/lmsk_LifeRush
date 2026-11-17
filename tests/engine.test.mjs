import test from 'node:test';import assert from 'node:assert/strict';import{fresh,action,step,hits,pattern,career,height,chaseRemaining,chasePose,capturePose,CAPTURE_DURATION}from'../dist/engine.js';
test('lane boundaries and pause input',()=>{const s=fresh();s.mode='running';for(let i=0;i<10;i++)action(s,'right');assert.equal(s.lane,1);for(let i=0;i<10;i++)action(s,'left');assert.equal(s.lane,-1);s.mode='paused';action(s,'right');assert.equal(s.lane,-1);});
test('jump, slide and collision outcomes',()=>{const s=fresh();s.mode='running';assert.ok(hits(s,{lane:0,type:'jump'}));action(s,'jump');s.jump=.475;assert.equal(hits(s,{lane:0,type:'jump'}),false);assert.ok(hits(s,{lane:0,type:'block'}));s.jump=0;action(s,'slide');assert.equal(hits(s,{lane:0,type:'slide'}),false);for(let i=0;i<20;i++)step(s,.05);assert.equal(s.slide,0);assert.ok(hits(s,{lane:0,type:'slide'}));});
test('safe generated rows and reset',()=>{for(let i=0;i<1000;i++){const row=pattern(50);assert.equal(row.filter(x=>x.type!=='skill').length,1);assert.notEqual(row[0].lane,row[1].lane);}const s=fresh();s.skills[0]=100;s.distance=300;s.items.push({});const reset=fresh();assert.deepEqual(reset.skills,[0,0,0]);assert.equal(reset.distance,0);assert.equal(reset.items.length,0);});
test('collection, crash, frozen pause, and countdown',()=>{const s=fresh();s.mode='running';s.next=1000;s.items=[{z:1,lane:0,type:'skill',skill:1}];step(s,.05);assert.equal(s.skills[1],1);s.mode='paused';const d=s.distance;step(s,.05);assert.equal(s.distance,d);s.mode='countdown';s.countdown=.02;step(s,.05);assert.equal(s.mode,'running');s.items=[{z:1,lane:0,type:'block'}];step(s,.05);assert.equal(s.mode,'running');assert.equal(s.damage,1);assert.ok(s.hit);for(let i=0;i<15;i++)step(s,.05);assert.equal(s.damage,1);s.items=[{z:s.distance+1,lane:0,type:'slide'}];step(s,.05);assert.equal(s.mode,'falling');assert.equal(s.damage,2);for(let i=0;i<20;i++)step(s,.05);assert.equal(s.mode,'captured');for(let i=0;i<54;i++)step(s,.05);assert.equal(s.mode,'crashed');});
test('career ties are explicit',()=>{assert.equal(career([2,2,0]),'Engineer / Doctor');assert.equal(career([0,0,0]),'Your story is still unwritten');});

test('airborne down input drops from the current height and ground double down rolls', () => {
  const s = fresh();
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
  const s = fresh();
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
  assert.equal(chaseRemaining(fresh()), 0);
});

test('a second hit during pursuit lets the chaser catch up during the fall', () => {
  const s = fresh();
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
  for (let i=0;i<30;i++) step(s,.05);
  assert.equal(s.mode,'crashed');
  assert.equal(s.capture,CAPTURE_DURATION);
  assert.ok(chasePose(s).z < behind);
  assert.equal(chasePose(s).stop,1);
});

test('a collision exactly when the chase expires opens a new chase', () => {
  const s = fresh();
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
