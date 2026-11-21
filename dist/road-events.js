// Dynamic Road Splits (Glass Skywalk vs Neon Underpass), Interactive Pads,
// Autonomous Delivery Drone Mystery Crates, and L-M-S-K Fever Rush state engine.
import { routeSegment } from './traffic-rules.js';

export const FORK_FIRST = 220;
export const FORK_STRIDE = 1450;
export const FORK_WARN = 80;
export const FORK_LOOKAHEAD = 420;
export const FORK_LEN = 1000;
export const METRO_FIRST = 150;
export const METRO_STRIDE = 210;
export const LMSK_LETTERS = Object.freeze(['L', 'M', 'S', 'K']);
export const ROAD_EVENT_TYPES = new Set(['turboPad', 'jumpPad', 'mysteryCrate', 'letter']);

function smoothstep(t) {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

export function forkPlanAt(distance) {
  const index = Math.max(0, Math.floor((distance - FORK_FIRST + FORK_LOOKAHEAD) / FORK_STRIDE));
  const start = FORK_FIRST + index * FORK_STRIDE;
  const warnStart = start - FORK_WARN;
  const end = start + FORK_LEN;
  return {
    index,
    start,
    warnStart,
    end,
    approaching: distance >= warnStart && distance < start,
    active: distance >= start && distance < end
  };
}

export function branchRampAt(distance, start, end) {
  if (distance < start || distance > end) return 0;
  const rampLen = 22;
  if (distance < start + rampLen) return smoothstep((distance - start) / rampLen);
  if (distance > end - rampLen) return smoothstep((end - distance) / rampLen);
  return 1;
}

export function branchElevationAt(distance, branch, start, end) {
  if (!branch) return 0;
  const r = branchRampAt(distance, start, end);
  return branch === 'skybridge' ? 2.35 * r : -1.10 * r;
}

export function branchOffsetXAt(distance, branch, start, end) {
  if (!branch) return 0;
  const r = branchRampAt(distance, start, end);
  return (branch === 'skybridge' ? -3.4 : 3.4) * r;
}

export function roadHillY(distance, map = 'school') {
  if (map === 'college') return 0;
  // Gentle cinematic rolling flyover hills on IT Park & School maps
  const ramp = smoothstep((distance - 55) / 60);
  const amp = map === 'itpark' ? 0.55 : 0.28;
  return ramp * amp * Math.sin(distance * 0.011);
}

export function pushEventBanner(s, text, kind = 'info') {
  s.eventBannerId = (s.eventBannerId || 0) + 1;
  s.eventBanner = { id: s.eventBannerId, text, kind };
}

function safeLaneAt(s, z) {
  const idx = Math.max(0, Math.floor((z - 120) / 248));
  const seg = routeSegment(s.runSeed, idx);
  return seg ? seg.safeLane : 0;
}

export function branchForkClearance(anchor, state) {
  if (!state) return { hide: false, dropY: 0, spreadX: 0 };
  const active = state.activeBranch;
  const forksOn = Boolean(state.enableForks) && state.map === 'itpark';
  if (active === 'underpass') {
    // Cave walls enclose the roadside; campus stays visible above through the glass skylight,
    // pushed outward so nothing pokes through the rock walls.
    if (anchor >= state.branchStart - 24 && anchor <= state.branchEnd - 14) {
      return { hide: false, dropY: 0, spreadX: 2.6 };
    }
  }
  if (active === 'skybridge') {
    // First ~5 seconds (160m) departure shore & last ~5 seconds (160m) return shore stay firmly planted
    // on solid coastal seawall peninsulas (fixed spreadX, dropY = 0 -> ZERO floating or sideways sliding!).
    // Between the two shores (open sea span), buildings hide completely for a pure 360° panoramic ocean view.
    const COAST_LEN = 160;
    const coast = Math.min(anchor - state.branchStart, state.branchEnd - anchor);
    if (anchor >= state.branchStart - 24 && anchor <= state.branchEnd + 24) {
      if (coast > COAST_LEN) {
        return { hide: true, dropY: -4.2, spreadX: 30 };
      }
      return { hide: false, dropY: 0, spreadX: 2.2 };
    }
  }
  if (forksOn) {
    const plan = forkPlanAt(anchor);
    if (anchor >= plan.start - 16 && anchor <= plan.start + 64) {
      return { hide: false, dropY: 0, spreadX: 3.4 };
    }
  }
  return { hide: false, dropY: 0, spreadX: 0 };
}

export function updateRoadEvents(s, dt, vanSurfaceFn) {
  s.turboBoost = Math.max(0, (s.turboBoost || 0) - dt);
  s.feverTimer = Math.max(0, (s.feverTimer || 0) - dt);
  if (!s.jump && s.launchBoost) s.launchBoost = 0;

  const forksEnabled = Boolean(s.enableForks) && (!s.map || s.map === 'itpark');
  const plan = forksEnabled ? forkPlanAt(s.distance) : { approaching: false, active: false, index: -1, start: 0, end: 0 };
  if (forksEnabled && (plan.approaching || (plan.active && s.distance <= plan.start + 2.5))) {
    if (!s.items.some(o => o.isForkDivider && o.z === plan.start)) {
      s.items.push({
        z: plan.start,
        lane: 0,
        type: 'block',
        length: 2.4,
        isForkDivider: true,
        done: false
      });
    }
  }
  if (plan.approaching) {
    if (s.forkWarnedIndex !== plan.index) {
      s.forkWarnedIndex = plan.index;
      pushEventBanner(s, s.map === 'itpark' ? 'LEFT: GLASS BRIDGE | RIGHT: METRO RAIL' : 'ROAD SPLIT AHEAD · LEFT: SKYWALK | RIGHT: UNDERPASS', 'fork-warn');
    }
    s.activeBranch = null;
    s.branchStart = plan.start;
    s.branchEnd = plan.end;
    s.branchElevation = 0;
    s.branchOffsetX = 0;
    s.branchCoinMult = 1;
  } else if (plan.active) {
    if (!s.activeBranch || s.activeForkIndex !== plan.index) {
      s.activeForkIndex = plan.index;
      const picked = s.lane < 0 ? 'skybridge'
        : s.lane > 0 ? 'underpass'
        : s.x < -0.05 ? 'skybridge'
        : s.x > 0.05 ? 'underpass'
        : (plan.index % 2 === 0 ? 'skybridge' : 'underpass');
      s.activeBranch = picked;
      s.branchStart = plan.start;
      s.branchEnd = plan.end;
      if (s.lane === 0 && s.distance >= plan.start + 1.2) {
        s.lane = picked === 'skybridge' ? -1 : 1;
        s.x = s.lane;
      }
      if (picked === 'skybridge') {
        pushEventBanner(s, 'GLASS BRIDGE · 1,000m SKYWAY!', 'skybridge');
      } else {
        pushEventBanner(s, s.map === 'itpark' ? 'METRO TUNNEL · 1,000m · 2x COINS!' : 'NEON UNDERPASS · 1,000m · 2x COINS!', 'underpass');
      }
      // Spawn exciting recurring rewards across the full 1,000m branch!
      if (s.runSeed > 0 && s.next < 90000) {
        const lane = safeLaneAt(s, plan.start + 35);
        if (picked === 'skybridge') {
          for (let off = 28; off < FORK_LEN - 40; off += 130) {
            const bLane = safeLaneAt(s, plan.start + off);
            for (let i = 0; i < 8; i++) s.items.push({ z: plan.start + off + i * 4.5, lane: bLane, type: 'coin', done: false });
          }
        } else {
          for (let off = 32; off < FORK_LEN - 40; off += 130) {
            const bLane = safeLaneAt(s, plan.start + off);
            for (let i = 0; i < 8; i++) s.items.push({ z: plan.start + off + i * 4.5, lane: bLane, type: 'coin', done: false });
          }
        }
      }
    }
    // Inside the Underpass cave: convert oncoming rail vehicles to Indian Railways WDP4D 45420 train, never vanish approaching vehicles!
    if (s.activeBranch === 'underpass') {
      for (const o of s.items) {
        if (!o.done && o.z >= s.distance - 2 && o.z <= plan.end) {
          if (o.type === 'jumpPad' || (o.roofRide && s.map !== 'itpark')) {
            o.done = true;
            o.z = s.distance - 100;
            continue;
          }
          if (o.type === 'sideVehicle') {
            o.type = 'bus';
            o.metro = true;
            o.velocity = 24;
            o.length = 18;
            o.roof = 2.6;
            o.activate = o.z - 260;
            o.started = true;
            o.encounter = false;
          }
        }
        if (o.type === 'bus' && !o.done && o.z >= plan.start && o.z < plan.end) {
          o.metro = true;
          if (!o.roofRide) {
            o.length = Math.max(o.length || 12, 12);
            o.roof = Math.max(o.roof || 2.8, 2.8);
          }
        }
      }
      s.launchBoost = 0;
    } else if (s.activeBranch === 'skybridge') {
      // On the Glass Bridge: cars only come straight down the bridge lanes, never cutting in across open sea!
      for (const o of s.items) {
        if (!o.done && o.z >= s.distance - 2 && o.z <= plan.end) {
          if (o.type === 'sideVehicle') {
            o.type = 'bus';
            o.collegeKind = o.variant || 'porsche';
            o.velocity = 18;
            o.length = 4.6;
            o.roof = 1.45;
            o.activate = o.z - 260;
            o.started = true;
            o.encounter = false;
          }
        }
      }
    }
    s.branchElevation = branchElevationAt(s.distance, s.activeBranch, plan.start, plan.end);
    s.branchOffsetX = branchOffsetXAt(s.distance, s.activeBranch, plan.start, plan.end);
    s.branchCoinMult = s.activeBranch === 'underpass' ? 2 : 1;
  } else {
    s.activeBranch = null;
    s.branchElevation = 0;
    s.branchOffsetX = 0;
    s.branchCoinMult = 1;
  }

  // LMSK FEVER RUSH: turn upcoming static obstacles into pure gold coins!
  if (s.feverTimer > 0) {
    for (const o of s.items) {
      if (!o.done && (o.type === 'block' || o.type === 'jump' || o.type === 'slide') && o.z >= s.distance + 4 && o.z <= s.distance + 48) {
        o.type = 'coin';
        o.variant = undefined;
      }
    }
  }

  // Live seeded runs: follow standard school map speed progression without forced turbo pads per user request
}

export function triggerRoadEvent(s, obstacle, jumpDuration) {
  if (Math.abs(s.x - obstacle.lane) >= 0.72) return false;

  if (obstacle.type === 'turboPad') {
    s.turboBoost = 1.65;
    s.coins += 15;
    s.lastRoadSound = 'turbo';
    pushEventBanner(s, 'TURBO BOOST! +15 COINS', 'turbo');
    return true;
  }

  if (obstacle.type === 'jumpPad') {
    s.slide = s.roll = 0;
    s.drop = null;
    s.fallSpeed = 0;
    s.launchBoost = 1;
    s.jump = jumpDuration;
    s.airJumpUsed = false;
    s.motionId = (s.motionId || 0) + 1;
    s.lastRoadSound = 'launch';
    pushEventBanner(s, 'LAUNCH PAD!', 'launch');
    return true;
  }

  if (obstacle.type === 'mysteryCrate') {
    // Drone crates give COINS ONLY (no powers) — powers come only from your 2 chosen slots.
    const roll = ((s.runSeed || 1) + Math.floor(obstacle.z) + (s.mysteryCount || 0)) % 4;
    s.mysteryCount = (s.mysteryCount || 0) + 1;
    s.lastRoadSound = 'mystery';
    const reward = [50, 75, 100, 150][roll];
    s.coins += reward;
    pushEventBanner(s, reward >= 150 ? `DRONE JACKPOT! +${reward} COINS` : `DRONE DELIVERY! +${reward} COINS`, 'mystery');
    return true;
  }

  if (obstacle.type === 'letter') {
    const idx = obstacle.letterIndex ?? LMSK_LETTERS.indexOf(obstacle.letter);
    if (idx >= 0) {
      s.lmskMask = (s.lmskMask || 0) | (1 << idx);
      s.coins += 20;
      if (s.lmskMask === 15) {
        s.lmskMask = 0;
        s.feverTimer = 6.5;
        s.shield = true;
        s.lastRoadSound = 'fever';
        pushEventBanner(s, 'LMSK FEVER RUSH! GOLD ROAD!', 'fever');
      } else {
        s.lastRoadSound = 'letter';
        pushEventBanner(s, `LETTER "${LMSK_LETTERS[idx]}" COLLECTED! +20 COINS`, 'letter');
      }
    }
    return true;
  }

  return false;
}
