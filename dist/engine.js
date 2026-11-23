import {repeatedVans,trafficPattern,sideVehicleX,newRunSeed,entryVan,entryCoins,segmentBase,routeSegment} from './traffic-rules.js';
import {pickupTypes as PICKUP_TYPES, powerById, runPickup} from './progression.js';
import {ROAD_EVENT_TYPES,updateRoadEvents,triggerRoadEvent,forkPlanAt,branchElevationAt,branchOffsetXAt,roadHillY,LMSK_LETTERS} from './road-events.js';
import {populateGrandfatherPath,memoryPace,GRANDFATHER_GATE} from './grandfather-route.js?v=3.9.2';
export {trafficPattern, PICKUP_TYPES, ROAD_EVENT_TYPES, LMSK_LETTERS, powerById, forkPlanAt, branchElevationAt, branchOffsetXAt, roadHillY};
export const JUMP_DURATION = .76, SLIDE_DURATION = .85, ROLL_DURATION = .62;
export const HIT_DURATION = .65, FALL_DURATION = .9, CAPTURE_DURATION = 3.95, INJURED_DURATION = 10;
export const MAGNET_RADIUS = 18, CAPTURE_GESTURE_START = 2.55;
const DOUBLE_SWIPE = .32;
const OPENING_CHASE = 3, HIT_CHASE = 5;
export const SCHOOL_GATE = 11, FINALRUN_GATE = 10000, FINALRUN_COLLEGE_GATE = 5000, FINALRUN_ITPARK_GATE = 5000;
export function finalRunGateFor(stageOrMap) {
  if (stageOrMap === 'college') return FINALRUN_COLLEGE_GATE;
  if (stageOrMap === 'itpark') return FINALRUN_ITPARK_GATE;
  return FINALRUN_GATE;
}
export const SCHOOL_VAN = Object.freeze({ lane: 1, ramp: 22, rear: 32, front: 54, roof: 1.72, width: 1.94 });
export function routeVans(distance,seed=0) { return [entryVan(seed),...repeatedVans(distance,seed)]; }
export const ROOF_COINS = Object.freeze([35, 41, 47, 53]);
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function fresh(seed=newRunSeed()) {
  seed=seed>>>0;
  return {
    runSeed:seed,entryVan:entryVan(seed),entryCoins:entryCoins(seed),
    mode: 'ready', lane: 0, x: 0, time: 0, distance: 0, speed: 28,
    jump: 0, slide: 0, roll: 0, drop: null, jumpBuffer: 0, motionId: 0, lastGroundDown: -Infinity,
    roofGrace: 0, floor: 0, fallSpeed: 0, roofCoins: 0, coins: 0, vanHit: false, vanHits: [], collected: [], trafficIndex: 0,
    damage: 0, injured: false, injuredUntil: 0, hit: 0, fall: 0, capture: 0, items: [], next: segmentBase(seed,0),
    firstHitAt: null, chaseReentered: false, chaserX: 0, chaseSide: 1,
    skills: [0, 0, 0], countdown: 0, cause: '',
    level: 1, doubleCoins: 0, doubleJump: 0, slow: 0, ghost: 0, airJumpUsed: false,
    magnet: 0, shield: false, nitro: 0, shoes: 0,
    magnetDuration: 12, nitroDuration: 4.5, shoesDuration: 9,
    combo: 1, comboTimer: 0, nearMissCount: 0, nearMissEvent: null, nearMissId: 0, jumpsOver: 0, revivedOnce: false,
    turboBoost: 0, launchBoost: 0, feverTimer: 0, lmskMask: 0,
    activeBranch: null, branchElevation: 0, branchOffsetX: 0, branchCoinMult: 1, branchStart: 0, branchEnd: 0,
    activeForkIndex: -1, forkWarnedIndex: -1, eventBanner: null, eventBannerId: 0, lastRoadSound: null, mysteryCount: 0,
    nextTurboPad: 140, nextJumpPad: 195, nextMysteryCrate: 175, nextLetterAt: 105,
    books: 0, styleAction: 0, collectedPowerup: null, coinFlights: [],
    nextMidObstacle: 2000,
    nextLaneObstacle: 5000,
  };
}

export function action(s, input) {
  if (s.mode !== 'running') return;
  const stride = s.map === 'grandfather' ? .55 : 1;
  if (input === 'left') s.lane = clamp(s.lane - stride, -1, 1);
  if (input === 'right') s.lane = clamp(s.lane + stride, -1, 1);
  if (s.hit) return;
  if (input === 'jump') {
    if (s.jump && s.doubleJump > 0 && !s.airJumpUsed) {
      s.floor = height(s);
      s.jump = JUMP_DURATION;
      s.airJumpUsed = true;
      s.motionId++;
      return;
    }
    if(s.jump || s.drop || (s.fallSpeed && !s.roofGrace)) {
      // Queue near-landing inputs without granting an unlimited midair jump.
      s.jumpBuffer=.18;
      return;
    }
    s.airJumpUsed=false;
    s.slide=s.roll=0;
    s.fallSpeed=s.roofGrace=0;s.jump=JUMP_DURATION;s.jumpBuffer=0;s.motionId++;
    s.lastGroundDown=-Infinity;
    return;
  }
  if (input !== 'slide') return;
  s.jumpBuffer=0;
  if (s.jump || s.fallSpeed || s.drop) {
    const start=height(s),remaining=s.drop?.jumpRemaining ?? s.jump;
    const duration=Math.min(s.drop?.remaining || s.jump || .20,.08+start*.04);
    s.drop={start,duration,remaining:duration,jumpRemaining:remaining||.24};
    s.jump=s.fallSpeed=s.slide=s.roll=0;
    s.lastGroundDown=-Infinity;
    return;
  }
  if(s.slide && s.time-s.lastGroundDown<=DOUBLE_SWIPE) {
    s.slide=0;s.roll=ROLL_DURATION;s.lastGroundDown=-Infinity;
  } else {
    s.roll=0;s.slide=SLIDE_DURATION;s.lastGroundDown=s.time;
  }
  s.motionId++;

}

export function height(s) {
  if (s.drop) return s.drop.start * (s.drop.remaining / s.drop.duration);
  const jumpApex = s.activeBranch === 'underpass' && s.map !== 'itpark' ? 2.3 : s.launchBoost ? 3.55 : s.shoes > 0 ? 3.35 : 2.3;
  return s.floor + (s.jump ? Math.sin(Math.PI * (1 - s.jump / JUMP_DURATION)) * jumpApex : 0);
}

// Range ignores elevation so a magnet works from the road and from any roof.
export function inMagnetRange(s,lane,z) {
  return s.magnet>0 && Math.hypot((lane-s.x)*2.2,z-s.distance)<=MAGNET_RADIUS;
}

function pullCoin(s,lane,z,y) {
  s.coinFlights.push({x:lane*2.2,y,z,elapsed:0,duration:.30+.20*Math.min(1,Math.abs(z-s.distance)/MAGNET_RADIUS)});
}

function collectMagnetCoins(s) {
  if(s.magnet<=0)return;
  for(const item of s.items)if(item.type==='coin'&&!item.done&&inMagnetRange(s,item.lane,item.z)){
    item.done=true;pullCoin(s,item.lane,item.z,1.1+(item.lift||0));
  }
  if(s.map==='grandfather')return;
  s.entryCoins.forEach((z,i)=>{
    if(!(s.roofCoins&(1<<i))&&inMagnetRange(s,s.entryVan.lane,z)){
      s.roofCoins|=1<<i;pullCoin(s,s.entryVan.lane,z,s.entryVan.roof+.67);
    }
  });
  for(const van of routeVans(s.distance,s.runSeed)){
    if(van.id==='entry')continue;
    for(let i=0;i<4;i++){
      const z=van.rear+2+i*4,id=van.id+':'+i;
      if(!s.collected.includes(id)&&inMagnetRange(s,van.lane,z)){
        s.collected.push(id);pullCoin(s,van.lane,z,van.roof+.69);
      }
    }
  }
  for(const bus of s.items){
    if(!bus.roofRide||!bus.started)continue;
    for(let i=0;i<4;i++){
      const z=bus.z+4+i*4,id=bus.id+':'+i;
      if(!s.collected.includes(id)&&inMagnetRange(s,bus.lane,z)){
        s.collected.push(id);pullCoin(s,bus.lane,z,bus.roof+.69);
      }
    }
  }
}

function advanceCoinFlights(s,dt) {
  for(const flight of s.coinFlights)flight.elapsed+=dt;
  s.coinFlights=s.coinFlights.filter(flight=>{
    if(flight.elapsed<flight.duration)return true;
    s.coins += (s.doubleCoins > 0 ? 2 : 1) * (s.branchCoinMult || 1);return false;
  });
}

export function vanSurface(distance, lanePosition,seed=0) {
  let surface=0;
  for(const van of routeVans(distance,seed)) {
    if(Math.abs(lanePosition-van.lane)*2.2>van.width/2 || distance<van.ramp || distance>=van.front) continue;
    surface=Math.max(surface,van.roof*(van.rear===van.ramp?1:clamp((distance-van.ramp)/(van.rear-van.ramp),0,1)));
  }
  return surface;
}

function onVanRamp(distance, lanePosition, seed = 0) {
  for (const van of routeVans(distance, seed)) {
    if (van.rear > van.ramp && Math.abs(lanePosition - van.lane) * 2.2 <= van.width / 2 && distance >= van.ramp && distance < van.rear) {
      return true;
    }
  }
  return false;
}

export function busSurface(s){
 let surface=0;
 for(const bus of s.items){
  if(bus.type!=='bus'||((bus.encounter||bus.roofRide)&&!bus.started))continue;
  if(bus.collegeKind==='scooty'||bus.collegeKind==='ducati')continue;
  if(Math.abs(s.x-bus.lane)*2.2>.94||s.distance<bus.z||s.distance>=bus.z+bus.length)continue;
  surface=Math.max(surface,bus.roof||2.8);
 }
 return surface;
}

function updateElevation(s, dt) {
  const previous = height(s);
  const jumped = s.jump > 0;
  const dropped = s.drop !== null;
  s.jump = Math.max(0, s.jump-dt);
  if (dropped) s.drop.remaining = Math.max(0, s.drop.remaining-dt);
  const surface = s.map === 'grandfather' ? 0 : Math.max(vanSurface(s.distance, s.x,s.runSeed),busSurface(s));
  const rampNow = s.map !== 'grandfather' && onVanRamp(s.distance, s.x, s.runSeed);
  const prevSurface = rampNow ? vanSurface(Math.max(0, s.distance - s.speed * dt), s.x, s.runSeed) : surface;
  const wasFalling = s.fallSpeed > 0;
  if (wasFalling) {
    s.fallSpeed += 18*dt;
    s.floor -= s.fallSpeed*dt;
  }

  const descending = dropped || wasFalling || (jumped && s.jump <= JUMP_DURATION/2);
  const next = height(s);
  const landMin = rampNow ? Math.min(surface, prevSurface) - .12 : surface - .045;
  if (descending && next <= surface && previous >= landMin) {
    s.floor = surface;
    s.jump = s.fallSpeed = 0;
    s.drop = null;
  } else if (rampNow && next < surface) {
    s.floor = surface;
    s.jump = s.fallSpeed = 0;
    s.drop = null;
  } else if (dropped && s.drop.remaining === 0) {
    s.floor = 0;
    s.drop = null;
  } else if (!jumped && !dropped && !wasFalling && (Math.abs(surface-s.floor) <= .44 || (rampNow && surface >= s.floor))) {
    s.floor = surface;
  } else if (!s.jump && !s.drop && s.floor > surface && !s.fallSpeed) {
    s.fallSpeed = .6;
  }
  if (s.floor < 0 && !s.jump && !s.drop) {
    s.floor = 0;
    s.fallSpeed = 0;
  }

  s.roofGrace = surface>0 && Math.abs(height(s)-surface)<.02 && !s.jump && !s.drop && !s.fallSpeed
    ? .12 : Math.max(0,s.roofGrace-dt);
  if(s.map==='grandfather')return;
  for(const van of routeVans(s.distance,s.runSeed)) {
    if(van.id==='entry')continue;
    for(let n=0;n<4;n++) {
      const z=van.rear+2+n*4,id=van.id+':'+n;
      if(Math.abs(s.distance-z)<.9 && Math.abs(s.x-van.lane)<.34 && height(s)>=van.roof-.12 && height(s)<van.roof+1.2 && !s.collected.includes(id)) {
        s.collected.push(id);s.coins += s.doubleCoins > 0 ? 2 : 1;
      }
    }
  }
  for(const bus of s.items){if(!bus.roofRide||!bus.started)continue;
   for(let i=0;i<4;i++){const id=bus.id+':'+i,z=bus.z+4+i*4;
    if(!s.collected.includes(id)&&Math.abs(s.distance-z)<1.2&&Math.abs(s.x-bus.lane)<.34&&height(s)>=bus.roof-.12&&height(s)<bus.roof+1.1){s.collected.push(id);s.coins += s.doubleCoins > 0 ? 2 : 1;}
   }
  }
  s.entryCoins.forEach((distance,index) => {
    if ((s.roofCoins & (1<<index)) || Math.abs(s.distance-distance) > .60 ||
        Math.abs(s.x-s.entryVan.lane) > .34) return;
    const elevation = height(s);
    if (elevation < s.entryVan.roof-.12 || elevation > s.entryVan.roof+.84) return;
    s.roofCoins |= 1<<index;
    s.coins += s.doubleCoins > 0 ? 2 : 1;
  });
}

export function isCapture(s) {
  return s.mode === 'captured' || s.mode === 'crashed';
}

export function ease(from, to, t) {
  const x = clamp((t - from) / (to - from), 0, 1);
  return x*x*(3-2*x);
}

export function capturePose(s) {
  const t = s.capture;
  const lift = ease(.38, 1.30, t);
  const laughIn = ease(1.22, 1.43, t) * (1 - ease(2.22, 2.58, t));
  const laugh = laughIn * (.55 + .45 * Math.sin((t-1.3) * (2*Math.PI/.22)));
  const gesture=ease(CAPTURE_GESTURE_START,CAPTURE_GESTURE_START+.14,t)
    *(1-ease(CAPTURE_GESTURE_START+SWEEP_SECONDS-.12,CAPTURE_GESTURE_START+SWEEP_SECONDS,t));
  return { lift, laugh, gesture, reach: ease(0, .40, t), show: ease(1.02, 1.58, t) };
}

export function chaseRemaining(s) {
  if (s.mode === 'ready') return 0;
  const end = s.firstHitAt === null ? OPENING_CHASE : s.firstHitAt + HIT_CHASE;
  return Math.max(0, end - s.time);
}

export function chasePose(s) {
  if (s.map === 'grandfather' && s.firstHitAt == null) return null;
  const remaining = chaseRemaining(s);
  if (!remaining) return null;
  const caught = s.mode === 'falling' || s.mode === 'crashed';
  const elapsed = s.firstHitAt === null ? s.time : s.time - s.firstHitAt;
  const retreat = caught ? 0 : 1 - clamp(remaining / .55, 0, 1);
  const arrival = s.chaseReentered && !caught ? 1 - clamp(elapsed / .25, 0, 1) : 0;
  const catchup = caught ? 1 - s.fall / FALL_DURATION : 0;
  const center = .65 * s.x;
  const x = clamp(s.chaserX * 2.2 + s.chaseSide * (.96 - .34*catchup),
                  center - 1.24, center + 1.24);
  return {
    x, z: 1.68 + 1.35*retreat + .95*arrival - .90*catchup,
    stride: s.time + Math.min(catchup * FALL_DURATION, .6),
    stop: clamp((catchup - .5) * 2, 0, 1),
  };
}

export function pattern(z, random = Math.random) {
  const lane = Math.floor(random() * 3) - 1;
  const type = ['block', 'jump', 'slide'][Math.floor(random() * 3)];
  return [{z, lane, type, done: false}, {z: z + 9, lane: lane === 1 ? 0 : lane + 1, type: 'coin', done: false}];
}

export function hits(s, obstacle) {
  if (s.ghost > 0) return false;
  const lane=obstacle.type==='sideVehicle'?sideVehicleX(obstacle,s.time)/2.2:obstacle.lane;
  const reach = s.map === 'grandfather' ? ((obstacle.halfWidth ?? .82) + .22) / 2.2 : .48;
  if (Math.abs(s.x - lane) > reach) return false;
  if (obstacle.type === 'jump') return height(s) < (obstacle.clearance ?? 1.05);
  if (obstacle.type === 'slide') return !(s.slide || s.roll);
  if(obstacle.type==='bus') {
    const isTwoWheeler = obstacle.collegeKind === 'scooty' || obstacle.collegeKind === 'ducati';
    const clearH = isTwoWheeler ? 0.90 : (obstacle.roof || 2.8) - .12;
    return height(s) < clearH;
  }
  if(obstacle.type==='sideVehicle') {
    const isTwoWheeler = obstacle.variant === 'scooty' || obstacle.variant === 'bike';
    if (isTwoWheeler) return height(s) < 0.90;
    return true;
  }
  if(obstacle.type==='block') {
    if(s.map==='college') {
      const blockKind = Math.abs(Math.floor(obstacle.z) + obstacle.lane) % 7;
      if (blockKind >= 3) {
        return height(s) < 0.75 && !(s.jump > 0 && (JUMP_DURATION - s.jump) < 0.25);
      }
    } else if(s.map==='itpark') {
      const bKind = Math.abs(Math.floor(obstacle.z) + obstacle.lane) % 7;
      if (bKind === 6) {
        return height(s) < 0.75 && !(s.jump > 0 && (JUMP_DURATION - s.jump) < 0.25);
      }
    }
    return true;
  }
  return false;
}

function advanceDrop(s, dt) {
  if (!s.drop) return;
  s.drop.remaining -= dt;
  if (s.drop.remaining <= 0) s.drop = null;
}

export function recoverFromBus(s) {
  const horizon=s.speed*1.15;
  const vans=routeVans(s.distance,s.runSeed);
  const candidates=[-1,0,1].filter(lane=>!vans.some(v=>v.lane===lane && v.front>s.distance && v.ramp<s.distance+horizon));
  const blocked=(lane)=>s.items.filter(o=>!PICKUP_TYPES.has(o.type) && !ROAD_EVENT_TYPES.has(o.type) && o.lane===lane && o.z+(o.length||0)>s.distance-1 && o.z<s.distance+horizon+(o.velocity||0)*1.15);
  candidates.sort((a,b)=>blocked(a).length-blocked(b).length || Math.abs(a-s.x)-Math.abs(b-s.x));
  const lane=candidates[0]??0;
  // In a fully crowded recovery window, clear just the landing corridor.
  const hazards=new Set(blocked(lane));for(const o of hazards)o.done=true;s.items=s.items.filter(o=>!hazards.has(o));
  s.lane=s.x=lane;s.jump=s.slide=s.roll=s.floor=s.fallSpeed=0;s.drop=null;s.hit=.95;
}

function takeHit(s, type) {
  if (s.slots?.some(slot => slot.id === 'shield' && slot.until > s.time)) {
    s.shieldAbsorbed = true; s.hit = .45; return;
  }
  if (s.shield) {
    s.shield = false;
    s.shieldAbsorbed = true;
    s.hit = .45;
    return;
  }
  s.jumpBuffer=0;
  s.cause = type;
  s.damage++;
  const airborne = height(s);
  s.jump = s.slide = s.roll = s.floor = s.fallSpeed = 0;
  s.drop = airborne > 0 ? { start: airborne, duration: .16, remaining: .16, jumpRemaining: .24 } : null;
  s.lastGroundDown = -Infinity;
  if (s.damage === 2 || s.distance >= 10000) {
    s.damage = 2;
    s.mode = 'falling';
    s.fall = FALL_DURATION;
    return;
  }
  s.injured = true;
  s.injuredUntil = s.time + INJURED_DURATION;
  s.firstHitAt = s.time;
  s.chaseReentered = s.time >= OPENING_CHASE;
  if (s.chaseReentered) {
    s.chaserX = s.x;
    s.chaseSide = s.x > .2 ? -1 : 1;
  }
  s.hit = HIT_DURATION;
}

export const SWEEP_SECONDS = 27 / 24;



function awardNearMiss(s, kind) {
  s.nearMissCount = (s.nearMissCount || 0) + 1;
  s.combo = Math.min(5, (s.comboTimer > 0 ? (s.combo || 1) : 1) + 1);
  s.comboTimer = 4.5;
  const bonus = 5 * s.combo;
  s.coins += bonus;
  s.nearMissId = (s.nearMissId || 0) + 1;
  const label = kind === 'nitro' ? 'NITRO SMASH!'
    : kind === 'vehicle' ? 'CLOSE CALL!'
    : kind === 'clean-jump' ? 'CLEAN JUMP!'
    : kind === 'clean-slide' ? 'SLICK SLIDE!'
    : 'NEAR MISS!';
  s.nearMissEvent = { id: s.nearMissId, label, bonus, combo: s.combo };
}

export function reviveRun(s) {
  if (!s) return false;
  s.damage = 0;
  s.injured = false;
  s.injuredUntil = 0;
  s.firstHitAt = null;
  s.chaseReentered = false;
  s.hit = 0;
  s.fall = 0;
  s.capture = 0;
  s.jump = s.slide = s.roll = s.fallSpeed = 0;
  s.drop = null;
  s.floor = 0;
  s.shield = true;
  s.revivedOnce = true;
  s.mode = 'countdown';
  s.countdown = 3;
  // Clear all hazards near and ahead of the player so the revived restart is 100% fair
  for (const o of s.items) {
    if (!PICKUP_TYPES.has(o.type) && o.z >= s.distance - 15 && o.z <= s.distance + 58) {
      o.done = true;
      o.z = s.distance - 100;
    }
  }
  const safeLanes = [-1, 0, 1].filter(l => vanSurface(s.distance, l, s.runSeed) === 0 && vanSurface(s.distance + 12, l, s.runSeed) === 0);
  if (safeLanes.length && !safeLanes.includes(s.lane)) {
    s.lane = safeLanes[0];
    s.x = s.lane;
  }
  return true;
}

function predictedBlockedLanesAt(s, targetZ, reactionSec = 0.95) {
  const blocked = new Set();
  const speed = Math.max(24, s.speed || 28);
  const tArrive = Math.max(0, (targetZ - s.distance) / speed);
  const padZ = Math.max(11, speed * reactionSec * 0.55);
  for (const van of routeVans(targetZ, s.runSeed)) {
    if (targetZ >= van.ramp - padZ && targetZ <= van.front + padZ * 0.6) {
      blocked.add(van.lane);
    }
  }
  for (const o of s.items) {
    if (o.done || PICKUP_TYPES.has(o.type) || ROAD_EVENT_TYPES.has(o.type)) continue;
    let predZ = o.z;
    if (o.velocity) {
      if (o.encounter && !o.started) {
        const tTrigger = Math.max(0, (o.trigger - s.distance) / speed);
        const encZ = o.trigger + (speed + o.velocity) * 1.45;
        predZ = encZ - o.velocity * Math.max(0, tArrive - tTrigger);
      } else if (o.roofRide && !o.started) {
        const tAct = Math.max(0, (o.activate - s.distance) / speed);
        predZ = o.z + (speed * 0.35) * Math.max(0, tArrive - tAct);
      } else if (o.activate !== undefined && s.distance < o.activate) {
        const tAct = Math.max(0, (o.activate - s.distance) / speed);
        predZ = o.z - o.velocity * Math.max(0, tArrive - tAct);
      } else {
        predZ = o.z - o.velocity * tArrive;
      }
    }
    const len = o.length || 2.5;
    if (targetZ >= predZ - padZ && targetZ <= predZ + len + padZ * 0.65) {
      blocked.add(o.lane);
    }
  }
  return blocked;
}

const FAR_ESCAPE_HORIZONS = [8.5, 7.2, 6.0, 4.8, 3.6, 2.5, 1.45, 1.15, 0.85, 0.55];
const NEAR_ESCAPE_HORIZONS = [1.45, 1.15, 0.85, 0.55];
function enforceOpenEscapeLane(s, checkFar = false) {
  if (s.next >= 90000) return;
  const speed = Math.max(24, s.speed || 28);
  const horizons = checkFar ? FAR_ESCAPE_HORIZONS : NEAR_ESCAPE_HORIZONS;
  // Check far horizon when spawning / periodically so 3-lane conflicts clear BEFORE the player ever sees them!
  for (const t of horizons) {
    const targetZ = s.distance + speed * t;
    const padZ = Math.max(9, speed * 0.38);
    const vanLanes = new Set();
    for (const van of routeVans(targetZ, s.runSeed)) {
      if (targetZ >= van.ramp - padZ && targetZ <= van.front + padZ * 0.6) vanLanes.add(van.lane);
    }
    const byLane = new Map([[-1, []], [0, []], [1, []]]);
    for (const o of s.items) {
      if (o.done || PICKUP_TYPES.has(o.type) || ROAD_EVENT_TYPES.has(o.type)) continue;
      if (o.encounter && !o.started) continue;
      let predZ = o.z;
      if (o.velocity) {
        if (o.activate !== undefined && !o.encounter && !o.roofRide && s.distance < o.activate) {
          const tAct = Math.max(0, (o.activate - s.distance) / speed);
          predZ = o.z - o.velocity * Math.max(0, t - tAct);
        } else {
          predZ = o.z - o.velocity * t;
        }
      }
      const len = o.length || 2.5;
      if (targetZ >= predZ - padZ && targetZ <= predZ + len + padZ * 0.6) {
        byLane.get(o.lane)?.push(o);
      }
    }
    const blockedCount = [-1, 0, 1].filter(l => vanLanes.has(l) || byLane.get(l).length > 0).length;
    if (blockedCount < 3) continue;
    const removable = [-1, 0, 1].filter(l => !vanLanes.has(l) && byLane.get(l).every(o => !o.roofRide));
    const pool = removable.length ? removable : [-1, 0, 1].filter(l => !vanLanes.has(l));
    if (!pool.length) continue;
    pool.sort((a, b) => Math.abs(a - s.lane) - Math.abs(b - s.lane));
    for (const o of byLane.get(pool[0])) {
      o.done = true;
      o.cleared = true;
      o.z = s.distance - 100;
    }
  }
}

export function availablePowers(level) {
  // Magnet & Shield are road collectibles only — never part of the power list.
  return Object.values(powerById).filter(p => p.level <= level).map(p => p.id);
}

export function equipPowers(s, ids) {
  const available = availablePowers(s.level);
  s.slots = [...new Set(ids)].filter(id => available.includes(id)).slice(0,2)
    .map(id => ({id,readyAt:0,until:0,nextPulse:0}));
}

function pulsePower(s,type) {
  if (type === 'trail') {
    const lane = s.lane;
    for (let offset=4; offset<=32; offset+=4) {
      const z = s.distance + offset;
      const blocked = s.items.some(item => !item.done && !PICKUP_TYPES.has(item.type) &&
        item.lane === lane && item.z < z+2 && item.z+(item.length||0) > z-2);
      if (!blocked) s.items.push({type:'coin',lane,z,done:false});
    }
  } else if (type === 'wave') {
    const hazards = s.items.filter(item => !item.done && !item.roofRide &&
      !PICKUP_TYPES.has(item.type) && item.z >= s.distance);
    const first = Math.min(...hazards.map(item => item.z));
    for (const item of hazards) if (item.z <= first+2) { item.done = true; item.cleared = true; }
  }
}

export function usePower(s,index) {
  const slot = s.slots?.[index];
  if (!slot || s.mode !== 'running' || s.distance < slot.readyAt || s.time < slot.until) return false;
  slot.readyAt = s.distance + 1000;
  slot.until = s.time + 10;
  const id = slot.id;
  if (id === 'wave' || id === 'trail') {
    pulsePower(s,id);
    slot.nextPulse = s.time + 1;
  } else if (id === 'rush') {
    s.nitro = s.magnet = 10;
  } else if (id !== 'shield') {
    s[id] = 10;
  }
  s.collectedPowerup = id;
  return true;
}

export function step(s, dt, random = Math.random) {
  dt = clamp(dt, 0, .05);
  if (s.styleAction > 0) s.styleAction = Math.max(0, s.styleAction - dt);
  if (s.mode === 'intro') {
    if (s.styleAction === 0) s.mode = 'starting';
    return;
  }
  if (s.mode === 'countdown') {
    s.countdown -= dt;
    if (s.countdown <= 0) s.mode = 'running';
    return;
  }
  if (s.mode === 'falling') {
    advanceCoinFlights(s,dt);
    advanceDrop(s, dt);
    s.fall = Math.max(0, s.fall - dt);
    if (!s.fall) s.mode = 'captured';
    return;
  }
  if (s.mode === 'captured') {
    advanceCoinFlights(s,dt);
    s.capture = Math.min(CAPTURE_DURATION, s.capture + dt);
    if (s.capture >= CAPTURE_DURATION) s.mode = 'crashed';
    return;
  }
  if (s.mode !== 'running') return;

  s.time += dt;
  for (const slot of s.slots || []) {
    if (slot.nextPulse && s.time < slot.until && s.time >= slot.nextPulse) {
      pulsePower(s,slot.id);
      slot.nextPulse += 1;
    }
  }
  advanceCoinFlights(s,dt);
  // End the chase before resolving any collisions on this frame.
  if (s.firstHitAt !== null && chaseRemaining(s) === 0) {
    s.firstHitAt = null;
    s.chaseReentered = false;
    s.damage = 0;
  }
  if (s.injured && s.time >= s.injuredUntil) {
    s.injured = false;
  }
  for (const timer of ['doubleCoins','doubleJump','slow','ghost']) s[timer] = Math.max(0,s[timer]-dt);
  const trafficRate = s.slow > 0 ? .5 : 1;
  const d = s.distance;
  if (s.map === 'grandfather') s.speed = 15 + Math.min(5, d / 200);
  else if (d <= 180) s.speed = 28;
  else if (d <= 1000) s.speed = 28 + ((d - 180) / 820) * 6;
  else if (d <= 2000) s.speed = 34 + ((d - 1000) / 1000) * 7;
  else if (d <= 5000) s.speed = 41 + ((d - 2000) / 3000) * 7;
  else if (d < 8000) s.speed = 48 + ((d - 5000) / 3000) * 24;
  else if (d <= 10000) s.speed = 78 + ((d - 8000) / 2000) * 18;
  else s.speed = 96 + (d - 10000) * 0.02;
  if (s.nitro > 0) s.speed = Math.max(s.speed * 1.45, 56);
  if (s.turboBoost > 0) s.speed = Math.max(s.speed + 13, 46);
  s.speed *= trafficRate;
  if (s.map === 'grandfather') {
    s.speed = memoryPace(d, s.speed);
    if (d >= GRANDFATHER_GATE - 12) s.lane = 0;
  }
  s.distance += s.speed * dt;
  const villageFinale = s.map === 'grandfather';
  if (!villageFinale) updateRoadEvents(s, dt, vanSurface);
  s.x += (s.lane - s.x) * (1-Math.exp(-18*dt));
  s.chaserX += (s.x - s.chaserX) * (1-Math.exp(-5*dt));
  s.slide = Math.max(0, s.slide - dt);
  s.roll = Math.max(0, s.roll - dt);
  s.hit = Math.max(0, s.hit - dt);
  s.jumpBuffer=Math.max(0,s.jumpBuffer-dt);
  s.magnet=Math.max(0,s.magnet-dt);
  s.nitro=Math.max(0,(s.nitro||0)-dt);
  s.shoes=Math.max(0,(s.shoes||0)-dt);
  if (s.comboTimer > 0) {
    s.comboTimer = Math.max(0, s.comboTimer - dt);
    if (s.comboTimer === 0) s.combo = 1;
  }
  let spawnedFar = false;
  if (villageFinale) populateGrandfatherPath(s);
  while (!villageFinale && s.distance + 340 > s.next) {
    spawnedFar = true;
    const index=s.trafficIndex++;
    const newItems=trafficPattern(s.next,index,s.runSeed,s.map);
    const pickup = newItems.find(item => item.type !== 'coin' && PICKUP_TYPES.has(item.type));
    if (pickup) {
      if (s.slots) {
        // Collectible map pickups: alternate between magnet and shield along the running route in all maps
        pickup.type = (index % 2 === 0) ? 'magnet' : 'shield';
      } else {
        pickup.type = runPickup(s.level,s.runSeed,index,s.featured);
      }
    }
    const safeLane=newItems.find(o=>o.type==='coin')?.lane??0;
    if(!s.runSeed)for(let i=0;i<3;i++)newItems.push({z:s.next+28+i*4,lane:safeLane,type:'coin',done:false});
    if(!s.runSeed&&s.trafficIndex%4===1) newItems.push({z:s.next+52,lane:safeLane,type:'magnet',done:false});
    else if(!s.runSeed&&s.trafficIndex%4===3) newItems.push({z:s.next+52,lane:safeLane,type:'shield',done:false});
    const pushed = s.slots ? newItems.filter(item => item.type === 'coin' || item.type === 'magnet' || item.type === 'shield' || !PICKUP_TYPES.has(item.type)) : newItems;
    if (s.activeBranch === 'underpass') {
      for (const o of pushed) {
        if (o.type === 'bus' && o.z >= s.branchStart && o.z < s.branchEnd) {
          o.metro = true;
          if (!o.roofRide) { o.length = Math.max(o.length || 12, 12); o.roof = Math.max(o.roof || 2.8, 2.8); }
        } else if (o.type === 'sideVehicle' && o.z >= s.branchStart && o.z <= s.branchEnd) {
          o.type = 'bus'; o.metro = true; o.velocity = 24; o.length = 18; o.roof = 2.6; o.activate = o.z - 260; o.started = true; o.encounter = false;
        }
      }
    } else if (s.activeBranch === 'skybridge') {
      for (const o of pushed) {
        if (o.type === 'sideVehicle' && o.z >= s.branchStart && o.z <= s.branchEnd) {
          o.type = 'bus'; o.collegeKind = o.variant || 'porsche'; o.velocity = 18; o.length = 4.6; o.roof = 1.45; o.activate = o.z - 260; o.started = true; o.encounter = false;
        }
      }
    }
    s.items.push(...pushed);
    s.next=s.runSeed?segmentBase(s.runSeed,s.trafficIndex):s.next+160;
  }
  if (s.distance >= 2000 && s.distance < 5000 && s.next < 90000) {
    if (!s.nextMidObstacle || s.nextMidObstacle < s.distance + 40) {
      s.nextMidObstacle = Math.max(2000, s.distance + 240);
    }
    while (s.distance + 340 >= s.nextMidObstacle && s.nextMidObstacle < 5000) {
      const targetZ = s.nextMidObstacle;
      const fPlan = forkPlanAt(targetZ);
      if (Math.abs(targetZ - fPlan.start) <= 26) {
        s.nextMidObstacle += 75;
        continue;
      }
      const unsafeSegLanes = new Set([s.lane, Math.round(s.x)]);
      const baseIdx = Math.max(0, s.trafficIndex - 2);
      let safeWindow = true;
      for (let i = baseIdx; i <= s.trafficIndex + 2; i++) {
        const seg = routeSegment(s.runSeed, i);
        unsafeSegLanes.add(seg.safeLane);
        if (targetZ >= seg.base - 45 && targetZ <= seg.base + 20) safeWindow = false;
      }
      if (safeWindow) {
        const blockedLanes = predictedBlockedLanesAt(s, targetZ, 0.95);
        const candidates = [-1, 0, 1].filter(
          l => !unsafeSegLanes.has(l) && !blockedLanes.has(l) && vanSurface(targetZ, l, s.runSeed) === 0
        );
        if (candidates.length > 0 && blockedLanes.size <= 1) {
          const seedHash = ((s.runSeed || 1) ^ Math.imul(Math.floor(targetZ), 0x9e3779b9)) >>> 0;
          const lane = candidates[seedHash % candidates.length];
          const roll = (seedHash % 100) / 100;
          const type = roll < 0.38 ? 'jump' : roll < 0.74 ? 'slide' : 'block';
          const variant = type === 'jump' ? (seedHash % 2 ? 'hurdle' : 'bench') : type === 'slide' ? 'scaffold' : undefined;
          s.items.push({ z: targetZ, lane, type, variant, done: false });
        }
      }
      s.nextMidObstacle += 75;
    }
  }
  if (s.distance >= 5000) {
    if (!s.nextLaneObstacle || s.nextLaneObstacle < s.distance + 40) {
      s.nextLaneObstacle = Math.max(5000, s.distance + 240);
    }
    while (s.distance + 340 >= s.nextLaneObstacle) {
      const targetZ = s.nextLaneObstacle;
      const fPlan = forkPlanAt(targetZ);
      if (Math.abs(targetZ - fPlan.start) <= 26) {
        s.nextLaneObstacle += 80;
        continue;
      }
      const targetLane = s.lane;
      const vanHitCheck = vanSurface(targetZ, targetLane, s.runSeed) > 0;
      if (!vanHitCheck) {
        const blockedLanes = predictedBlockedLanesAt(s, targetZ, 0.95);
        if (!blockedLanes.has(targetLane) && blockedLanes.size <= 1) {
          const freeLanes = [-1, 0, 1].filter(l => l !== targetLane && !blockedLanes.has(l));
          if (freeLanes.length > 0) {
            const seedHash = ((s.runSeed || 1) ^ Math.imul(Math.floor(targetZ), 0x9e3779b9)) >>> 0;
            const roll = (seedHash % 100) / 100;
            let type, variant;
            if (roll < 0.40) {
              type = 'jump';
              variant = (seedHash % 2) ? 'hurdle' : 'bench';
            } else if (roll < 0.78) {
              type = 'slide';
              variant = 'scaffold';
            } else if (roll < 0.92) {
              type = 'block';
            } else {
              type = 'bus';
            }
            if (type === 'bus') {
              const isPark=s.map==='itpark',isCol=s.map==='college'||isPark;
              const cKind=isPark?['porsche','bugatti','ducati','semi'][seedHash%4]:isCol?((seedHash%2)?'scooty':'car'):undefined;
              const inCave = s.activeBranch === 'underpass' && targetZ + 15 >= s.branchStart && targetZ + 15 < s.branchEnd;
              s.items.push({
                z: targetZ + 15,
                lane: targetLane,
                type: 'bus',
                collegeKind: cKind,
                metro: inCave || undefined,
                velocity: 18,
                activate: targetZ - 30,
                length: inCave ? 12 : (isCol ? (cKind==='semi'?10.5:cKind==='scooty'?2.2:cKind==='ducati'?2.4:4.6) : 10),
                roof: inCave ? 2.8 : (isCol ? (cKind==='semi'?2.8:cKind==='scooty'?0.95:cKind==='ducati'?1.05:1.45) : 2.8),
                done: false,
              });
            } else {
              s.items.push({
                z: targetZ,
                lane: targetLane,
                type,
                variant,
                done: false,
              });
            }
            if (roll < 0.6) {
              const rewardLane = freeLanes[seedHash % freeLanes.length];
              s.items.push({
                z: targetZ,
                lane: rewardLane,
                type: 'coin',
                done: false,
              });
            }
          }
        }
      }
      const minReactionGap = Math.max(24, s.speed * 0.55);
      const baseGap = s.distance >= 10000
        ? Math.max(18, 26 - (s.distance - 10000) / 350)
        : s.distance >= 8000
          ? Math.max(24, 34 - (s.distance - 8000) / 250)
          : Math.max(30, 44 - (s.distance - 5000) / 180);
      s.nextLaneObstacle += Math.max(minReactionGap, baseGap);
    }
  }
  for(const item of s.items){
    if(item.roofRide&&!item.started&&s.distance>=item.activate){item.started=true;item.velocity=-s.speed*.35;}
    if(item.encounter&&!item.started&&s.distance>=item.trigger){
      if (s.activeBranch === 'skybridge' && item.z >= (s.branchStart || 0) - 10 && item.z <= (s.branchEnd || 0) + 10) {
        item.type = 'bus';
        item.collegeKind = item.variant || 'porsche';
        item.velocity = 18;
        item.length = 4.6;
        item.roof = 1.45;
        item.started = true;
        item.encounter = false;
      } else {
        item.started=true;item.startedAt=s.time;
        item.z=s.distance+(s.speed+(item.velocity||0))*1.45;
        s.warning={until:s.time+1.45,side:item.type==='sideVehicle'?item.lane:s.warning?.side};
      }
    }
    if(item.velocity && ((item.encounter||item.roofRide)?item.started:s.distance>=item.activate))item.z-=item.velocity*dt*trafficRate;
  }
  const farCheckDue = spawnedFar || !s.lastFarEscape || (s.time - s.lastFarEscape) >= 0.25;
  if (farCheckDue) s.lastFarEscape = s.time;
  if (!villageFinale) enforceOpenEscapeLane(s, farCheckDue);

  const stageGate = finalRunGateFor(s.map);
  if (!villageFinale && (s.map === 'finalrun' || s.isFinalRun)) {
    for (const o of s.items) {
      if (!o.done && !PICKUP_TYPES.has(o.type) && o.z >= stageGate - 65) {
        o.done = true;
        o.cleared = true;
      }
    }
    if ((s.map === 'finalrun' || (s.isFinalRun && s.map === 'college')) && s.distance >= stageGate - 30) {
      s.lane = 0;
    }
  }

  collectMagnetCoins(s);
  updateElevation(s, dt);
  if(s.jumpBuffer>0 && !s.jump && !s.drop && !s.fallSpeed && !s.hit)action(s,'jump');
  for(const van of villageFinale ? [] : routeVans(s.distance,s.runSeed)) {
    if(s.ghost > 0) continue;
    if((s.map === 'finalrun' || s.isFinalRun) && van.ramp >= stageGate - 85) continue;
    if(s.distance>=van.rear && s.distance<van.front && Math.abs(s.x-van.lane)*2.2<=van.width/2 && height(s)<van.roof-.18) {
      if (s.nitro > 0) {
        s.floor = van.roof;
        s.jump = s.fallSpeed = 0;
        s.drop = null;
        continue;
      }
      s.lane=van.lane===0?-1:0;s.x=van.lane+(s.lane-van.lane)*.55;
      if(!s.vanHits.includes(van.id) && !s.hit)takeHit(s,'van');
      if(!s.vanHits.includes(van.id))s.vanHits.push(van.id);
      if(van.id==='entry')s.vanHit=true;
      if(s.mode!=='running')return;
    }
  }

  for (const obstacle of s.items) {
    if(obstacle.encounter&&!obstacle.started)continue;
    if(obstacle.type==='bus'||obstacle.type==='sideVehicle') {
      const relative=obstacle.z-s.distance;
      const isTwoWheeler = obstacle.collegeKind === 'scooty' || obstacle.collegeKind === 'ducati' || obstacle.variant === 'scooty' || obstacle.variant === 'bike';
      if (isTwoWheeler && !obstacle.jumpCleared && relative <= 0.8 && relative >= -obstacle.length && !hits(s, obstacle)) {
        obstacle.jumpCleared = true;
      }
      if(!obstacle.done && !obstacle.jumpCleared && relative<=1.1 && relative>=-obstacle.length && hits(s,obstacle)) {
        if (s.nitro > 0) {
          obstacle.done = true;
          awardNearMiss(s, 'nitro');
          continue;
        }
        obstacle.done=true;if(!s.hit){takeHit(s,obstacle.type);if(s.mode==='running')recoverFromBus(s);}if(s.mode!=='running')break;
      } else if (!obstacle.done && !obstacle.nearMissed && !obstacle.roofRide && relative < -0.6 && relative > -obstacle.length - 3) {
        const dx = Math.abs(s.x - obstacle.lane);
        if (dx >= 0.68 && dx <= 1.38 && s.floor < 1) {
          obstacle.nearMissed = true;
          awardNearMiss(s, 'vehicle');
        }
      }
      continue;
    }
    if (obstacle.done || obstacle.z > s.distance + 1.1) continue;
    obstacle.done = true;
    if (obstacle.type === 'coin') {
      if (Math.abs(s.x - obstacle.lane) < .65) s.coins += (s.doubleCoins > 0 ? 2 : 1) * (s.branchCoinMult || 1);
    } else if (ROAD_EVENT_TYPES.has(obstacle.type)) {
      triggerRoadEvent(s, obstacle, JUMP_DURATION);
    } else if (obstacle.type === 'magnet') {
      if (Math.abs(s.x - obstacle.lane) < .65) { s.magnet = s.magnetDuration || 12; s.collectedPowerup = 'magnet'; }
    } else if (obstacle.type === 'shield') {
      if (Math.abs(s.x - obstacle.lane) < .65) { s.shield = true; s.collectedPowerup = 'shield'; }
    } else if (obstacle.type === 'nitro') {
      if (Math.abs(s.x - obstacle.lane) < .65) { s.nitro = s.nitroDuration || 4.5; s.shield = true; s.speed = Math.max(s.speed * 1.45, 56); s.collectedPowerup = 'nitro'; }
    } else if (obstacle.type === 'shoes') {
      if (Math.abs(s.x - obstacle.lane) < .65) { s.shoes = s.shoesDuration || 9; s.collectedPowerup = 'shoes'; }
    } else if (powerById[obstacle.type]) {
      if (Math.abs(s.x - obstacle.lane) >= .65) continue;
      const type = obstacle.type;
      s.collectedPowerup = type;
      if (type === 'trail' || type === 'wave') {
        pulsePower(s,type);
      } else if (type === 'rush') {
        s.nitro = s.nitroDuration;
        s.magnet = s.magnetDuration;
        s.shield = true;
      } else {
        s[type] = type === 'ghost' || type === 'slow' ? 6 : 10;
      }
    } else if (s.nitro > 0 && Math.abs(s.x - obstacle.lane) < .7) {
      obstacle.smashed = true;
      awardNearMiss(s, 'nitro');
    } else if (!s.hit && hits(s, obstacle)) {
      takeHit(s, obstacle.type);
      if (s.mode !== 'running') break;
    } else if (!s.hit && s.mode === 'running') {
      const dx = Math.abs(s.x - obstacle.lane);
      if (obstacle.type === 'jump' && dx < .55 && height(s) > .65) {
        s.jumpsOver = (s.jumpsOver || 0) + 1;
        awardNearMiss(s, 'clean-jump');
      } else if (obstacle.type === 'slide' && dx < .55 && (s.slide > 0 || s.roll > 0)) {
        awardNearMiss(s, 'clean-slide');
      } else if (obstacle.type === 'block' && !obstacle.isForkDivider && dx >= .72 && dx <= 1.35) {
        awardNearMiss(s, 'block');
      }
    }
  }
  collectMagnetCoins(s);
  s.items = s.items.filter(o => o.z > s.distance - (o.length || 8) - 10);
}

export function career(skills) {
  const max = Math.max(...skills);
  if (!max) return 'Your story is still unwritten';
  const names = ['Engineer', 'Doctor', 'Police officer'];
  return skills.map((n,i) => n === max ? names[i] : null).filter(Boolean).join(' / ');
}
