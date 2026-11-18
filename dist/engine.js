import {repeatedVans,trafficPattern,sideVehicleX} from './traffic-rules.js';
export {trafficPattern};
export const JUMP_DURATION = .76, SLIDE_DURATION = .85, ROLL_DURATION = .62;
export const HIT_DURATION = .65, FALL_DURATION = .9, CAPTURE_DURATION = 2.65;
const DOUBLE_SWIPE = .32;
const OPENING_CHASE = 3, HIT_CHASE = 5;
export const SCHOOL_GATE = 11;
export const SCHOOL_VAN = Object.freeze({ lane: 1, ramp: 22, rear: 32, front: 54, roof: 1.72, width: 1.94 });
export function routeVans(distance) { return [{...SCHOOL_VAN,id:'entry'},...repeatedVans(distance)]; }
export const ROOF_COINS = Object.freeze([35, 41, 47, 53]);
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function fresh() {
  return {
    mode: 'ready', lane: 0, x: 0, time: 0, distance: 0, speed: 28,
    jump: 0, slide: 0, roll: 0, drop: null, jumpBuffer: 0, motionId: 0, lastGroundDown: -Infinity,
    roofGrace: 0, floor: 0, fallSpeed: 0, roofCoins: 0, coins: 0, vanHit: false, vanHits: [], collected: [], trafficIndex: 0,
    damage: 0, hit: 0, fall: 0, capture: 0, items: [], next: 100,
    firstHitAt: null, chaseReentered: false, chaserX: 0, chaseSide: 1,
    skills: [0, 0, 0], countdown: 0, cause: '',
    magnet: 0, shield: false, books: 0, styleAction: 0, collectedPowerup: null,
  };
}

export function action(s, input) {
  if (s.mode !== 'running') return;
  if (input === 'left') s.lane = clamp(s.lane - 1, -1, 1);
  if (input === 'right') s.lane = clamp(s.lane + 1, -1, 1);
  if (s.hit) return;
  if (input === 'jump') {
    if(s.jump || s.drop || (s.fallSpeed && !s.roofGrace)) {
      // Queue near-landing inputs without granting an unlimited midair jump.
      s.jumpBuffer=.18;
      return;
    }
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
  return s.floor + (s.jump ? Math.sin(Math.PI * (1 - s.jump / JUMP_DURATION)) * 2.3 : 0);
}

export function vanSurface(distance, lanePosition) {
  let surface=0;
  for(const van of routeVans(distance)) {
    if(Math.abs(lanePosition-van.lane)*2.2>van.width/2 || distance<van.ramp || distance>=van.front) continue;
    surface=Math.max(surface,van.roof*(van.rear===van.ramp?1:clamp((distance-van.ramp)/(van.rear-van.ramp),0,1)));
  }
  return surface;
}

export function busSurface(s){
 let surface=0;
 for(const bus of s.items){
  if(bus.type!=='bus'||((bus.encounter||bus.roofRide)&&!bus.started))continue;
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
  const surface = Math.max(vanSurface(s.distance, s.x),busSurface(s));
  const wasFalling = s.fallSpeed > 0;
  if (wasFalling) {
    s.fallSpeed += 18*dt;
    s.floor -= s.fallSpeed*dt;
  }

  const descending = dropped || wasFalling || (jumped && s.jump <= JUMP_DURATION/2);
  const next = height(s);
  if (descending && next <= surface && previous >= surface-.045) {
    s.floor = surface;
    s.jump = s.fallSpeed = 0;
    s.drop = null;
  } else if (dropped && s.drop.remaining === 0) {
    s.floor = 0;
    s.drop = null;
  } else if (!jumped && !dropped && !wasFalling && Math.abs(surface-s.floor) <= .44) {
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
  for(const van of routeVans(s.distance)) {
    if(van.id==='entry')continue;
    for(let n=0;n<4;n++) {
      const z=van.rear+2+n*4,id=van.id+':'+n;
      if(Math.abs(s.distance-z)<.9 && Math.abs(s.x-van.lane)<.34 && height(s)>=van.roof-.12 && height(s)<van.roof+1.2 && !s.collected.includes(id)) {
        s.collected.push(id);s.coins++;
      }
    }
  }
  for(const bus of s.items){if(!bus.roofRide||!bus.started)continue;
   for(let i=0;i<4;i++){const id=bus.id+':'+i,z=bus.z+4+i*4;
    if(!s.collected.includes(id)&&Math.abs(s.distance-z)<1.2&&Math.abs(s.x-bus.lane)<.34&&height(s)>=bus.roof-.12&&height(s)<bus.roof+1.1){s.collected.push(id);s.coins++;}
   }
  }
  ROOF_COINS.forEach((distance,index) => {
    if ((s.roofCoins & (1<<index)) || Math.abs(s.distance-distance) > .60 ||
        Math.abs(s.x-SCHOOL_VAN.lane) > .34) return;
    const elevation = height(s);
    if (elevation < SCHOOL_VAN.roof-.12 || elevation > SCHOOL_VAN.roof+.84) return;
    s.roofCoins |= 1<<index;
    s.coins++;
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
  return { lift, laugh, reach: ease(0, .40, t), show: ease(1.02, 1.58, t) };
}

export function chaseRemaining(s) {
  if (s.mode === 'ready') return 0;
  const end = s.firstHitAt === null ? OPENING_CHASE : s.firstHitAt + HIT_CHASE;
  return Math.max(0, end - s.time);
}

export function chasePose(s) {
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
  const skill = Math.floor(random() * 3);
  return [{z, lane, type, done: false}, {z: z + 9, lane: lane === 1 ? 0 : lane + 1, type: 'skill', skill, done: false}];
}

export function hits(s, obstacle) {
  const lane=obstacle.type==='sideVehicle'?sideVehicleX(obstacle,s.time)/2.2:obstacle.lane;
  if (Math.abs(s.x - lane) > .48) return false;
  if (obstacle.type === 'jump') return height(s) < 1.05;
  if (obstacle.type === 'slide') return !(s.slide || s.roll);
  if(obstacle.type==='bus')return height(s)<(obstacle.roof||2.8)-.12;
  return obstacle.type === 'block' || obstacle.type === 'sideVehicle';
}

function advanceDrop(s, dt) {
  if (!s.drop) return;
  s.drop.remaining -= dt;
  if (s.drop.remaining <= 0) s.drop = null;
}

export function recoverFromBus(s) {
  const horizon=s.speed*1.15;
  const vans=routeVans(s.distance);
  const candidates=[-1,0,1].filter(lane=>!vans.some(v=>v.lane===lane && v.front>s.distance && v.ramp<s.distance+horizon));
  const blocked=(lane)=>s.items.filter(o=>o.type!=='skill' && o.lane===lane && o.z+(o.length||0)>s.distance-1 && o.z<s.distance+horizon+(o.velocity||0)*1.15);
  candidates.sort((a,b)=>blocked(a).length-blocked(b).length || Math.abs(a-s.x)-Math.abs(b-s.x));
  const lane=candidates[0]??0;
  // In a fully crowded recovery window, clear just the landing corridor.
  const hazards=new Set(blocked(lane));for(const o of hazards)o.done=true;s.items=s.items.filter(o=>!hazards.has(o));
  s.lane=s.x=lane;s.jump=s.slide=s.roll=s.floor=s.fallSpeed=0;s.drop=null;s.hit=.95;
}

function takeHit(s, type) {
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
  if (s.damage === 2) {
    s.mode = 'falling';
    s.fall = FALL_DURATION;
    return;
  }
  s.firstHitAt = s.time;
  s.chaseReentered = s.time >= OPENING_CHASE;
  if (s.chaseReentered) {
    s.chaserX = s.x;
    s.chaseSide = s.x > .2 ? -1 : 1;
  }
  s.hit = HIT_DURATION;
}

export function step(s, dt, random = Math.random) {
  dt = clamp(dt, 0, .05);
  if (s.mode === 'countdown') {
    s.countdown -= dt;
    if (s.countdown <= 0) s.mode = 'running';
    return;
  }
  if (s.mode === 'falling') {
    advanceDrop(s, dt);
    s.fall = Math.max(0, s.fall - dt);
    if (!s.fall) s.mode = 'captured';
    return;
  }
  if (s.mode === 'captured') {
    s.capture = Math.min(CAPTURE_DURATION, s.capture + dt);
    if (s.capture >= CAPTURE_DURATION) s.mode = 'crashed';
    return;
  }
  if (s.mode !== 'running') return;

  s.time += dt;
  // End the chase before resolving any collisions on this frame.
  if (s.firstHitAt !== null && chaseRemaining(s) === 0) {
    s.firstHitAt = null;
    s.chaseReentered = false;
    s.damage = 0;
  }
  s.speed = Math.min(48, 28 + s.distance / 55);
  s.distance += s.speed * dt;
  s.x += (s.lane - s.x) * (1-Math.exp(-18*dt));
  s.chaserX += (s.x - s.chaserX) * (1-Math.exp(-5*dt));
  s.slide = Math.max(0, s.slide - dt);
  s.roll = Math.max(0, s.roll - dt);
  s.hit = Math.max(0, s.hit - dt);
  s.jumpBuffer=Math.max(0,s.jumpBuffer-dt);
  if(s.styleAction>0) s.styleAction=Math.max(0, s.styleAction-dt);
  if(s.magnet>0){
    s.magnet=Math.max(0,s.magnet-dt);
    for(const item of s.items){
      if(['skill','book','magnet','shield'].includes(item.type)&&!item.done){
        const dz=item.z-s.distance;
        if(dz>-1&&dz<18)item.lane+=(s.x-item.lane)*Math.min(1,14*dt);
      }
    }
  }
  if(s.distance+120>s.next) {
    const newItems=trafficPattern(s.next,s.trafficIndex++);
    const safeLane=newItems.find(o=>o.type==='skill')?.lane??0;
    if(s.trafficIndex%2===0) newItems.push({z:s.next+28,lane:safeLane,type:'book',done:false});
    if(s.trafficIndex%4===1) newItems.push({z:s.next+52,lane:safeLane,type:'magnet',done:false});
    else if(s.trafficIndex%4===3) newItems.push({z:s.next+52,lane:safeLane,type:'shield',done:false});
    s.items.push(...newItems);s.next+=160;
  }
  for(const item of s.items){
    if(item.roofRide&&!item.started&&s.distance>=item.activate){item.started=true;item.velocity=-s.speed*.35;}
    if(item.encounter&&!item.started&&s.distance>=item.trigger){
      item.started=true;item.startedAt=s.time;
      item.z=s.distance+(s.speed+(item.velocity||0))*1.45;
      s.warning={until:s.time+1.45,side:item.type==='sideVehicle'?item.lane:s.warning?.side};
    }
    if(item.velocity && ((item.encounter||item.roofRide)?item.started:s.distance>=item.activate))item.z-=item.velocity*dt;
  }

  updateElevation(s, dt);
  if(s.jumpBuffer>0 && !s.jump && !s.drop && !s.fallSpeed && !s.hit)action(s,'jump');
  for(const van of routeVans(s.distance)) {
    if(s.distance>=van.rear && s.distance<van.front && Math.abs(s.x-van.lane)*2.2<=van.width/2 && height(s)<van.roof-.18) {
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
      if(!obstacle.done && relative<=1.1 && relative>=-obstacle.length && hits(s,obstacle)) {
        obstacle.done=true;if(!s.hit){takeHit(s,obstacle.type);if(s.mode==='running')recoverFromBus(s);}if(s.mode!=='running')break;
      }
      continue;
    }
    if (obstacle.done || obstacle.z > s.distance + 1.1) continue;
    obstacle.done = true;
    if (obstacle.type === 'skill') {
      if (Math.abs(s.x - obstacle.lane) < .55) s.skills[obstacle.skill]++;
    } else if (obstacle.type === 'book') {
      if (Math.abs(s.x - obstacle.lane) < .65) { s.books = (s.books || 0) + 1; s.collectedPowerup = 'book'; }
    } else if (obstacle.type === 'magnet') {
      if (Math.abs(s.x - obstacle.lane) < .65) { s.magnet = 12; s.collectedPowerup = 'magnet'; }
    } else if (obstacle.type === 'shield') {
      if (Math.abs(s.x - obstacle.lane) < .65) { s.shield = true; s.collectedPowerup = 'shield'; }
    } else if (!s.hit && hits(s, obstacle)) {
      takeHit(s, obstacle.type);
      if (s.mode !== 'running') break;
    }
  }
  s.items = s.items.filter(o => o.z > s.distance - (o.length || 8)-4);
}

export function career(skills) {
  const max = Math.max(...skills);
  if (!max) return 'Your story is still unwritten';
  const names = ['Engineer', 'Doctor', 'Police officer'];
  return skills.map((n,i) => n === max ? names[i] : null).filter(Boolean).join(' / ');
}
