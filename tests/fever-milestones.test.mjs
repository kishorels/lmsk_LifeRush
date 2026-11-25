import test from 'node:test';
import assert from 'node:assert/strict';
import {
  fresh,
  step,
  addFeverCharge,
  checkDistanceMilestones,
  coinGain,
  FEVER_DURATION,
  FEVER_CHARGE_MAX,
} from '../dist/engine.js';

test('Fever Rush charges from coins and near-misses, activates 8s 2x coin Fever mode, and converts obstacles to coins', () => {
  const s = fresh(12345);
  s.mode = 'running';
  s.map = 'school';
  assert.equal(s.feverCharge, 0);
  assert.equal(s.feverTimer, 0);
  assert.equal(coinGain(s), 1);

  // Charge via helper up to 90%
  assert.equal(addFeverCharge(s, 90), false);
  assert.equal(s.feverCharge, 90);
  assert.equal(s.feverTimer, 0);

  // Pushing past 100% triggers Fever Rush!
  assert.equal(addFeverCharge(s, 15), true);
  assert.equal(s.feverCharge, 0);
  assert.equal(s.feverTimer, FEVER_DURATION);
  assert.equal(s.feverCount, 1);
  assert.equal(s.lastRoadSound, 'fever');
  assert.equal(s.eventBanner?.kind, 'fever');
  assert.equal(coinGain(s), 2);

  // Double coins stacks cleanly with Fever Rush
  s.doubleCoins = 5;
  assert.equal(coinGain(s), 4);
  s.doubleCoins = 0;

  // Static obstacles ahead turn into coins during Fever Rush
  s.items.push({ type: 'block', lane: 0, z: s.distance + 20, done: false });
  step(s, 0.016);
  const converted = s.items.find(o => o.lane === 0 && Math.abs(o.z - 20) < 2);
  assert.equal(converted?.type, 'coin');
});

test('Distance milestones award coins, emit milestoneEvent, and boost Fever charge', () => {
  const s = fresh(54321);
  s.mode = 'running';
  s.map = 'college';
  s.coins = 0;
  s.distance = 499;

  // Cross 500m
  s.distance = 502;
  const m500 = checkDistanceMilestones(s, 499);
  assert.equal(m500?.distance, 500);
  assert.equal(m500?.coins, 50);
  assert.equal(s.coins, 50);
  assert.equal(s.feverCharge, 20);
  assert.equal(s.nextMilestoneDist, 1000);

  // Cross 1,000m
  s.distance = 1005;
  const m1000 = checkDistanceMilestones(s, 998);
  assert.equal(m1000?.distance, 1000);
  assert.equal(m1000?.coins, 100);
  assert.equal(s.coins, 150);
  assert.equal(s.feverCharge, 40);
  assert.equal(s.nextMilestoneDist, 2000);

  // Cross 10,000m -> next repeats at 15,000m
  s.nextMilestoneDist = 10000;
  s.distance = 10005;
  const m10k = checkDistanceMilestones(s, 9995);
  assert.equal(m10k?.distance, 10000);
  assert.equal(m10k?.coins, 1000);
  assert.equal(s.nextMilestoneDist, 15000);
});

test('Grandfather peaceful finale ignores Fever Rush and competitive milestones', () => {
  const s = fresh(99);
  s.mode = 'running';
  s.map = 'grandfather';
  assert.equal(addFeverCharge(s, FEVER_CHARGE_MAX), false);
  assert.equal(s.feverTimer, 0);
  s.distance = 510;
  assert.equal(checkDistanceMilestones(s, 490), null);
  assert.equal(s.coins, 0);
});
