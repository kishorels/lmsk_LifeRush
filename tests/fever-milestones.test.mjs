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

test('Fever Rush is disabled and never activates during normal runs', () => {
  const s = fresh(12345);
  s.mode = 'running';
  s.map = 'school';
  assert.equal(addFeverCharge(s, FEVER_CHARGE_MAX), false);
  assert.equal(s.feverCharge, 0);
  assert.equal(s.feverTimer, 0);
  assert.equal(coinGain(s), 1);
  s.doubleCoins = 5;
  assert.equal(coinGain(s), 2);
});

test('Distance milestones award coins and emit milestoneEvent cleanly', () => {
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
  assert.equal(s.nextMilestoneDist, 1000);

  // Cross 1,000m
  s.distance = 1005;
  const m1000 = checkDistanceMilestones(s, 998);
  assert.equal(m1000?.distance, 1000);
  assert.equal(m1000?.coins, 100);
  assert.equal(s.coins, 150);
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
