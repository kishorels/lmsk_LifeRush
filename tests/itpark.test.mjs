import test from 'node:test';
import assert from 'node:assert/strict';
import { Box3, Group, Scene } from '../dist/vendor/three.module.js';
import { CAMPUS_SLOTS } from '../dist/campus-layout.js';
import { createItParkCampus } from '../dist/itpark-scene.js';
import {
  buildPorscheGT3RS,
  buildBugattiChiron,
  buildRedShuttleCart,
  buildFreightSemiTruck,
  buildDucatiStreetfighter,
  buildHumanoidRobot
} from '../dist/itpark-models.js';
import { trafficPattern } from '../dist/traffic-rules.js';

test('IT Park campus builds all 5 architectural landmark templates with bounded meshes and clear road corridor', () => {
  const scene = new Scene();
  const render = createItParkCampus(scene);

  for (const map of ['school', 'college']) {
    render({ map, distance: 120 }, { night: 0 });
    assert.ok(scene.children.every(child => !child.visible), `IT Park slots stay hidden on ${map}`);
  }

  for (const [distance, night] of [[0, 0], [80, 0], [220, 0.5], [640, 1], [1800, 0], [0, 0]]) {
    render({ map: 'itpark', distance }, { night });
    assert.equal(scene.children.length, CAMPUS_SLOTS);
    assert.ok(scene.children.every(child => child.visible));
    let meshCount = 0;
    scene.traverse(obj => {
      if (!obj.isMesh) return;
      meshCount++;
      assert.ok(obj.position.toArray().every(Number.isFinite));
      const pos = obj.geometry.attributes.position;
      assert.ok(pos && pos.count > 0);
      for (let i = 0; i < pos.count; i += 37) {
        const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
        assert.ok(Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z), 'finite vertices');
        if (y > 0.35) {
          assert.ok(Math.abs(x) >= 3.5, `building mesh at (${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)}) intrudes into road`);
        }
      }
      const bounds = new Box3().setFromBufferAttribute(pos);
      assert.ok(bounds.max.y > 0);
    });
    assert.ok(meshCount > 20 && meshCount < 320, `expected batched mesh count, got ${meshCount}`);
  }
});

test('IT Park custom vehicles (Porsche GT3 RS, Bugatti Chiron, Red Shuttle, Freight Semis, Ducati V4 S) and AI Robots build cleanly', () => {
  const models = [
    ['porsche-oncoming', buildPorscheGT3RS(4.6, false), 4, 2.4, 1.9, 5.2],
    ['porsche-side', buildPorscheGT3RS(3.8, true), 4, 2.4, 1.9, 4.4],
    ['bugatti-oncoming', buildBugattiChiron(4.6, false), 4, 2.4, 1.6, 5.2],
    ['bugatti-side', buildBugattiChiron(3.8, true), 4, 2.4, 1.6, 4.4],
    ['red-shuttle', buildRedShuttleCart(20, 1.72), 6, 2.5, 1.85, 21.0],
    ['semi-yellow', buildFreightSemiTruck(22, 2.8, 0), 10, 2.7, 3.1, 23.0],
    ['semi-red', buildFreightSemiTruck(22, 2.8, 1), 10, 2.7, 3.1, 23.0],
    ['semi-blue', buildFreightSemiTruck(10.5, 2.8, 2), 6, 2.7, 3.1, 11.5],
    ['ducati-rider', buildDucatiStreetfighter(false, true), 2, 1.2, 2.0, 2.6],
    ['ducati-parked', buildDucatiStreetfighter(true, false), 2, 1.2, 1.5, 2.6]
  ];

  for (const [name, g, expectedWheels, maxW, maxH, maxL] of models) {
    g.updateMatrixWorld(true);
    let meshes = 0;
    g.traverse(o => {
      if (!o.isMesh) return;
      meshes++;
      const pos = o.geometry.attributes.position;
      assert.ok(pos && pos.count > 0, `${name} mesh has vertices`);
      assert.ok(o.matrixWorld.elements.every(Number.isFinite), `${name} finite transform`);
    });
    assert.ok(meshes > 0, `${name} has meshes`);
    assert.equal(g.userData.wheels.length, expectedWheels, `${name} wheel count`);
    const b = new Box3().setFromObject(g);
    const sx = b.max.x - b.min.x, sy = b.max.y - b.min.y, sz = b.max.z - b.min.z;
    assert.ok(sx <= maxW && sy <= maxH && sz <= maxL, `${name} bounds (${sx.toFixed(2)}x${sy.toFixed(2)}x${sz.toFixed(2)}) exceed (${maxW}x${maxH}x${maxL})`);
  }

  for (const pose of ['wave', 'seated', 'head']) {
    const bot = buildHumanoidRobot(pose);
    bot.updateMatrixWorld(true);
    const box = new Box3().setFromObject(bot);
    assert.ok(Number.isFinite(box.max.y) && box.max.y > 0, `robot ${pose} has positive height`);
    if (pose !== 'head') assert.ok(bot.userData.waveArm, `robot ${pose} has animated waveArm`);
    if (pose === 'seated') assert.ok(box.max.y < 1.15, `seated jump robot clears jump height (${box.max.y})`);
  }

  // Verify IT Park traffic routes spawn all 4 vehicle types
  const kinds = new Set();
  for (let i = 0; i < 8; i++) {
    for (const o of trafficPattern(100 + i * 240, i, 7, 'itpark')) {
      if (o.collegeKind) kinds.add(o.collegeKind);
      if (o.type === 'sideVehicle') kinds.add('side:' + o.variant);
    }
  }
  for (const k of ['porsche', 'bugatti', 'ducati', 'semi', 'side:porsche', 'side:bugatti', 'side:ducati']) {
    assert.ok(kinds.has(k), `IT Park route should spawn ${k}`);
  }
});

import { fresh, step, height } from '../dist/engine.js';
import { branchForkClearance, FORK_LEN } from '../dist/road-events.js';
import { createRoadEventsScene, buildRoadEventMesh } from '../dist/itpark-events-scene.js';
import { branchCurveX, branchCurveY, curveSlopeAt } from '../dist/campus-layout.js';
import { streetSurfaces } from '../dist/street-materials.js';
import { createTraffic } from '../dist/traffic-scene.js';
import {
  buildLaptopDesk, buildServerRack, buildCableBarrier, buildGlassOfficePod,
  buildDocumentBoxes, buildWifiRouterTower, buildOfficeChair, buildMeetingTable,
  buildTurnstileGate, buildCodeHologram
} from '../dist/itpark-obstacles.js';

test('Phase 1-3: Road Y-splits (1,000m Glass Bridge vs 1,000m 2x Underpass), Turbo/Jump pads, Drone Mystery Crates, L-M-S-K Fever Rush & all 10 IT Park tech obstacles work cleanly', () => {
  assert.equal(FORK_LEN, 1000, 'Fork branch persists for a full 1,000 meters');

  // 1. Road Split: Center lane hits divider; Left -> 1,000m Glass Bridge; Right -> 1,000m Underpass
  const sCenter = fresh(0);
  sCenter.mode = 'running'; sCenter.next = 100000; sCenter.enableForks = true; sCenter.distance = 219; sCenter.lane = sCenter.x = 0;
  step(sCenter, 0.05); // Approaches plan.start (220) in center lane
  sCenter.distance = 220;
  step(sCenter, 0.05); // Crosses plan.start in center lane -> hits divider!
  assert.ok(sCenter.hit > 0 || sCenter.damage > 0 || sCenter.shieldAbsorbed, 'Staying in center at 2-way split hits the divider pier');

  const sL = fresh(0);
  sL.mode = 'running'; sL.next = 100000; sL.enableForks = true; sL.distance = 219; sL.lane = sL.x = -1;
  step(sL, 0.05);
  sL.distance = 222;
  step(sL, 0.05);
  assert.equal(sL.hit, 0, 'Left lane avoids divider cleanly');
  assert.equal(sL.activeBranch, 'skybridge');
  assert.equal(sL.branchCoinMult, 1);
  // Persists all the way through 1,000m (220..1220) even if player switches lanes, then exits cleanly back to normal road!
  for (const d of [500, 880, 1210]) {
    sL.distance = d; sL.lane = sL.x = 1;
    step(sL, 0.05);
    assert.equal(sL.activeBranch, 'skybridge', `Glass Bridge continues at ${d}m`);
  }
  sL.distance = 1230;
  step(sL, 0.05);
  assert.equal(sL.activeBranch, null, 'Returns cleanly to normal road after 1,000m Glass Bridge');

  const sR = fresh(0);
  sR.mode = 'running'; sR.next = 100000; sR.enableForks = true; sR.distance = 219; sR.lane = sR.x = 1;
  step(sR, 0.05);
  sR.distance = 222;
  sR.items = [{ type: 'coin', lane: 1, z: 223, done: false }];
  step(sR, 0.05);
  assert.equal(sR.hit, 0, 'Right lane avoids divider cleanly');
  assert.equal(sR.activeBranch, 'underpass');
  assert.equal(sR.branchCoinMult, 2);
  assert.equal(sR.coins, 2, 'Underpass doubles collected coins');
  // Exterior campus clearance keeps campus visible (spread outward) in Underpass and drops/spreads under Glass Bridge
  assert.equal(branchForkClearance(500, { activeBranch: 'underpass', branchStart: 220, branchEnd: 1220, map: 'itpark' }).spreadX > 0, true);
  assert.equal(branchForkClearance(500, { activeBranch: 'skybridge', branchStart: 220, branchEnd: 1220, map: 'itpark' }).dropY, -4.2);
  // Cave Underpass: no climbing up (launch pads removed, jump apex capped), campus stays visible through glass skylight
  assert.equal(branchForkClearance(500, { activeBranch: 'underpass', branchStart: 220, branchEnd: 1220, map: 'school' }).hide, false);
  sR.items = [{ type: 'jumpPad', lane: 1, z: sR.distance + 20, done: false }];
  step(sR, 0.05);
  assert.ok(!sR.items.some(o => o.type === 'jumpPad' && !o.done && o.z > sR.distance), 'launch pads are removed inside the Underpass cave');
  sR.shoes = 5; sR.jump = 0.38; sR.floor = 0;
  assert.ok(height(sR) <= 2.31, 'jump apex stays capped inside the Underpass');
  sR.shoes = 0; sR.jump = 0;
  sR.distance = 1210; step(sR, 0.05);
  assert.equal(sR.activeBranch, 'underpass', 'Underpass continues through 1,000m');
  sR.distance = 1230; step(sR, 0.05);
  assert.equal(sR.activeBranch, null, 'Returns cleanly to normal road after 1,000m Underpass');

  // Verify live seeded runs follow standard school speed progression without forced turbo pads or jump pads
  const sLive = fresh(1234);
  sLive.mode = 'running';
  for (let m = 0; m < 500; m += 20) {
    sLive.distance = m;
    step(sLive, 0.05);
  }
  assert.ok(!sLive.items.some(o => o.type === 'turboPad'), 'Live run follows normal school speed progression without forced turbo pads');
  assert.ok(!sLive.items.some(o => o.type === 'jumpPad'), 'Live run never spawns jump pads');

  // 2. Turbo Boost Pad (+15 coins & speed surge), Jump Launch Pad (>3.3m apex), Mystery Crate, and L-M-S-K Fever Rush
  const sEv = fresh(0);
  sEv.mode = 'running'; sEv.next = 100000; sEv.lane = sEv.x = 0;
  sEv.items = [{ type: 'turboPad', lane: 0, z: 1, done: false }];
  step(sEv, 0.05);
  assert.ok(sEv.turboBoost > 1);
  assert.equal(sEv.coins, 15);
  step(sEv, 0.05);
  assert.ok(sEv.speed >= 40, 'Turbo pad boosts speed');

  sEv.items = [{ type: 'jumpPad', lane: 0, z: sEv.distance + 0.5, done: false }];
  step(sEv, 0.05);
  let maxJump = 0;
  for (let i = 0; i < 20; i++) { step(sEv, 0.04); maxJump = Math.max(maxJump, height(sEv)); }
  assert.ok(maxJump > 3.3, `Launch pad jumps above 3.3m, got ${maxJump}`);

  // Mystery crate awards jackpot/power
  const beforeC = sEv.coins;
  sEv.items = [{ type: 'mysteryCrate', lane: 0, z: sEv.distance + 0.5, done: false }];
  step(sEv, 0.05);
  assert.ok(sEv.mysteryCount === 1);
  assert.ok(sEv.coins >= beforeC + 50, 'Drone crate gives coins only');
  assert.ok(sEv.coins > beforeC || sEv.shield || sEv.doubleCoins > 0);

  // Collecting L-M-S-K triggers Fever Rush and turns upcoming obstacles into gold coins
  sEv.lmskMask = 0;
  for (let i = 0; i < 4; i++) {
    sEv.items = [
      { type: 'letter', letter: ['L', 'M', 'S', 'K'][i], letterIndex: i, lane: 0, z: sEv.distance + 0.5, done: false },
      { type: 'block', lane: 1, z: sEv.distance + 18, done: false }
    ];
    step(sEv, 0.05);
  }
  assert.ok(sEv.feverTimer > 5, 'All 4 LMSK letters activate Fever Rush');
  step(sEv, 0.05);
  assert.equal(sEv.items.find(o => o.lane === 1)?.type, 'coin', 'Fever Rush turns ahead block into coin');

  // 3. All 10 Image-5 IT Park tech obstacles & 4 interactive road-event 3D meshes have valid finite geometry & safe heights
  const jumpObs = [buildLaptopDesk(), buildCableBarrier(), buildOfficeChair(), buildMeetingTable()];
  for (const g of jumpObs) {
    g.updateMatrixWorld(true);
    const b = new Box3().setFromObject(g);
    assert.ok(b.max.y > 0.6 && b.max.y <= 1.1, `jump obstacle height ${b.max.y.toFixed(2)}m is jumpable`);
  }
  const tallObs = [buildServerRack(), buildGlassOfficePod(), buildDocumentBoxes(), buildWifiRouterTower(), buildTurnstileGate(), buildCodeHologram()];
  for (const g of tallObs) {
    g.updateMatrixWorld(true);
    const b = new Box3().setFromObject(g);
    assert.ok(b.max.y >= 1.7 && b.max.y <= 2.9, `tall obstacle height ${b.max.y.toFixed(2)}m`);
  }
  for (const type of ['turboPad', 'jumpPad', 'mysteryCrate', 'letter']) {
    const m = buildRoadEventMesh(type, { letter: 'M' });
    m.updateMatrixWorld(true);
    const b = new Box3().setFromObject(m);
    assert.ok(Number.isFinite(b.max.y) && b.max.y > 0);
    if (type === 'mysteryCrate') assert.equal(m.userData.rotors.length, 4, 'Quadcopter drone has 4 spinning rotors');
  }

  // 4. Road Events Scene (Fork Gantry, Glass Skywalk, Underpass Tunnel, Animated Overhead Metro Bridge, Helicopter & Blimp)
  const sc = new Scene();
  const upd = createRoadEventsScene(sc);
  for (const [distance, activeBranch, rain] of [[150, null, 0], [200, null, 0], [240, 'skybridge', 0], [260, 'underpass', 0.4]]) {
    upd({ map: 'itpark', mode: 'running', distance, time: 12, activeBranch }, { night: 0, rain });
    sc.traverse(o => { if (o.isMesh) assert.ok(o.position.toArray().every(Number.isFinite)); });
  }
});
test('sea-bridge piers keep their world coordinates across bay and pool boundaries',()=>{
 const scene=new Scene(), render=createRoadEventsScene(scene);
 function supports(distance){
   render({map:'itpark',mode:'running',activeBranch:'skybridge',distance,time:4},{night:0,rain:0});
   return scene.getObjectByName('glass-bridge-deck').children
     .filter(bay=>bay.visible && bay.userData.hasPier)
     .map(bay=>Math.round(distance-bay.position.z)).sort((a,b)=>a-b);
 }
 for(const boundary of [256,416,640,960]){
   const nearby=list=>list.filter(z=>z>=boundary && z<=boundary+120);
   const before=nearby(supports(boundary-.1));
   assert.ok(before.length>=3);
   assert.deepEqual(nearby(supports(boundary+.1)),before);
 }
 const state={map:'itpark',activeBranch:'skybridge',branchStart:220,branchEnd:1220,distance:600};
 assert.equal(branchForkClearance(250,state).hide,false);
 assert.equal(branchForkClearance(670,state).hide,true);
 assert.equal(branchForkClearance(1210,state).hide,false);
});

test('curly S-bend transitions smoothly at branch entry/exit and continuation road stays visible ahead of exit', () => {
 for (const branch of ['skybridge', 'underpass']) {
  const st = { map: 'itpark', activeBranch: branch, branchStart: 220, branchEnd: 1220, distance: 1120 };
  assert.equal(branchCurveX(220, st), 0);
  assert.equal(branchCurveX(1220, st), 0);
  assert.ok(Math.abs(curveSlopeAt(220, st)) < 0.001, `${branch} entry slope vanishes cleanly`);
  assert.ok(Math.abs(curveSlopeAt(1220, st)) < 0.001, `${branch} exit slope vanishes cleanly`);
  assert.ok(Math.abs(branchCurveX(420, st)) > 5, `${branch} sweeps into a visible curly bend`);
  assert.ok(Math.abs(branchCurveX(1020, st)) > 5, `${branch} sweeps around an exit curly bend`);
  if (branch === 'skybridge') assert.ok(branchCurveY(720, st) > 0.8, 'glass bridge arches above sea level');
 }
 // Verify continuation road stays visible ahead of the cave/bridge exit instead of leaving blue sky void!
 const sc = new Scene();
 const box = (parent, color, x, y, z, w, h, d) => { const m = new Group(); m.position.set(x, y, z); parent.add(m); return m; };
 const updStreet = streetSurfaces(sc, box);
 const stNearExit = { map: 'itpark', activeBranch: 'underpass', branchStart: 220, branchEnd: 1220, distance: 1140 };
 updStreet(1140, { rain: 0, night: 1 }, 'itpark', 'underpass', stNearExit);
 const itParkRoad = sc.children[2];
 assert.equal(itParkRoad.visible, true, 'continuation IT Park road stays visible 80m before cave exit');
 assert.equal(itParkRoad.position.z, -(80 + 35), 'continuation road aligns flush with plan.end (no gap, no overlap)');

 // Pending encounter buses render smoothly from far horizon (no pop-in at trigger!)
 const tScene = new Group();
 const updTraffic = createTraffic(tScene);
 const encBus = { type: 'bus', lane: 0, z: 400, velocity: 22, length: 10, roof: 2.8, trigger: 300, encounter: true, started: false, done: false };
 const tState = { map: 'itpark', mode: 'running', runSeed: 1, distance: 200, speed: 28, time: 5, items: [encBus], collected: [], activeBranch: null };
 updTraffic(tState);
 assert.equal(tScene.children.length > 0, true, 'pending encounter bus renders 100m before trigger instead of popping in');
});

test('Glass Bridge and Cave forks are exclusive to IT Park; School and College keep continuous scenery and baked deck draw calls stay bounded', () => {
 // School & College never trigger forks or hide buildings at fork distances even on live seeded runs!
 for (const map of ['school', 'college']) {
  const s = fresh(12345);
  s.map = map;
  s.mode = 'running';
  s.enableForks = false;
  s.distance = 219;
  s.lane = s.x = -1;
  step(s, 0.05);
  s.distance = 240;
  step(s, 0.05);
  assert.equal(s.activeBranch, null, `${map} never enters Glass Bridge or Cave`);
  for (const anchor of [204, 220, 250, 284, 500, 1670]) {
   const clr = branchForkClearance(anchor, { map, enableForks: false, runSeed: 12345, next: 500, activeBranch: null });
   assert.deepEqual(clr, { hide: false, dropY: 0, spreadX: 0 }, `${map} keeps full scenery at ${anchor}m`);
  }
  // Even if enableForks were accidentally set on school/college, updateRoadEvents & scenery stay IT Park–only!
  const sGuard = fresh(99);
  sGuard.map = map;
  sGuard.mode = 'running';
  sGuard.enableForks = true;
  sGuard.distance = 230;
  step(sGuard, 0.05);
  assert.equal(sGuard.activeBranch, null, `${map} guard blocks fork activation`);
 }

 // IT Park road-events scene hides all IT Park props on School & College and keeps baked Glass Bridge draw calls bounded!
 const sc = new Scene();
 const upd = createRoadEventsScene(sc);
 upd({ map: 'itpark', mode: 'running', enableForks: true, activeBranch: 'skybridge', distance: 240, time: 5 }, { night: 0, rain: 0 });
 const deck = sc.getObjectByName('glass-bridge-deck');
 let visibleDeckMeshes = 0;
 deck.traverseVisible(o => { if (o.isMesh) visibleDeckMeshes++; });
 assert.ok(visibleDeckMeshes < 260, `baked Glass Bridge deck keeps low visible draw-call count (got ${visibleDeckMeshes})`);

 for (const map of ['school', 'college']) {
  upd({ map, mode: 'running', enableForks: false, activeBranch: null, distance: 220, time: 6 }, { night: 0, rain: 0 });
  assert.ok(sc.children.every(c => !c.visible), `all IT Park bridge/cave/sea/viaduct groups hide on ${map}`);
 }
});
