export const JUMP_DURATION = .95, SLIDE_DURATION = .85, ROLL_DURATION = .62;
export const HIT_DURATION = .65, FALL_DURATION = .9;
const DOUBLE_SWIPE = .32;
const OPENING_CHASE = 3, HIT_CHASE = 5;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function fresh() {
  return {
    mode: 'ready', lane: 0, x: 0, time: 0, distance: 0, speed: 17,
    jump: 0, slide: 0, roll: 0, drop: null, lastGroundDown: -Infinity,
    damage: 0, hit: 0, fall: 0, items: [], next: 40,
    firstHitAt: null, chaseReentered: false, chaserX: 0, chaseSide: 1,
    skills: [0, 0, 0], countdown: 0, cause: '',
  };
}

export function action(s, input) {
  if (s.mode !== 'running') return;
  if (input === 'left') s.lane = clamp(s.lane - 1, -1, 1);
  if (input === 'right') s.lane = clamp(s.lane + 1, -1, 1);
  if (s.hit) return;
  if (input === 'jump' && !s.jump && !s.slide && !s.roll && !s.drop) {
    s.jump = JUMP_DURATION;
    s.lastGroundDown = -Infinity;
  }
  if (input !== 'slide') return;
  if (s.jump) {
    const start = height(s);
    const duration = Math.min(s.jump, .10 + start * .05);
    s.drop = { start, duration, remaining: duration, jumpRemaining: s.jump };
    s.jump = 0;
    s.lastGroundDown = -Infinity;
    return;
  }
  if (s.drop || s.roll) return;
  if (s.slide && s.time - s.lastGroundDown <= DOUBLE_SWIPE) {
    s.slide = 0;
    s.roll = ROLL_DURATION;
    s.lastGroundDown = -Infinity;
  } else if (!s.slide) {
    s.slide = SLIDE_DURATION;
    s.lastGroundDown = s.time;
  }
}

export function height(s) {
  if (s.drop) return s.drop.start * (s.drop.remaining / s.drop.duration);
  return s.jump ? Math.sin(Math.PI * (1 - s.jump / JUMP_DURATION)) * 2.3 : 0;
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
  if (Math.abs(s.x - obstacle.lane) > .48) return false;
  if (obstacle.type === 'jump') return height(s) < 1.05;
  if (obstacle.type === 'slide') return !(s.slide || s.roll);
  return obstacle.type === 'block';
}

function advanceDrop(s, dt) {
  if (!s.drop) return;
  s.drop.remaining -= dt;
  if (s.drop.remaining <= 0) s.drop = null;
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
    if (!s.fall) s.mode = 'crashed';
    return;
  }
  if (s.mode !== 'running') return;

  s.time += dt;
  s.speed = Math.min(29, 17 + s.distance / 350);
  s.distance += s.speed * dt;
  s.x += (s.lane - s.x) * Math.min(1, dt * 18);
  s.chaserX += (s.x - s.chaserX) * Math.min(1, dt * 5);
  s.jump = Math.max(0, s.jump - dt);
  s.slide = Math.max(0, s.slide - dt);
  s.roll = Math.max(0, s.roll - dt);
  s.hit = Math.max(0, s.hit - dt);
  advanceDrop(s, dt);
  if (s.distance + 120 > s.next) {
    s.items.push(...pattern(s.next, random));
    s.next += 38;
  }

  for (const obstacle of s.items) {
    if (obstacle.done || obstacle.z > s.distance + 1.1) continue;
    obstacle.done = true;
    if (obstacle.type === 'skill') {
      if (Math.abs(s.x - obstacle.lane) < .55) s.skills[obstacle.skill]++;
    } else if (!s.hit && hits(s, obstacle)) {
      s.cause = obstacle.type;
      s.damage++;
      const airborne = height(s);
      s.jump = s.slide = s.roll = 0;
      s.drop = airborne > 0 ? { start: airborne, duration: .16, remaining: .16 } : null;
      s.lastGroundDown = -Infinity;
      if (s.damage === 2) {
        s.mode = 'falling';
        s.fall = FALL_DURATION;
        break;
      }
      s.firstHitAt = s.time;
      s.chaseReentered = s.time >= OPENING_CHASE;
      if (s.chaseReentered) {
        s.chaserX = s.x;
        s.chaseSide = s.x > .2 ? -1 : 1;
      }
      s.hit = HIT_DURATION;
    }
  }
  s.items = s.items.filter(o => o.z > s.distance - 8);
}

export function career(skills) {
  const max = Math.max(...skills);
  if (!max) return 'Your story is still unwritten';
  const names = ['Engineer', 'Doctor', 'Police officer'];
  return skills.map((n,i) => n === max ? names[i] : null).filter(Boolean).join(' / ');
}
