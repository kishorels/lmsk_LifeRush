import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,action,step,height,JUMP_DURATION,ROLL_DURATION,SLIDE_DURATION} from '../dist/engine.js';
const run=()=>{const s=fresh(0);s.mode='running';s.next=10000;return s;};
test('jump interrupts slide and roll immediately',()=>{
 for(const state of ['slide','roll']){const s=run();s[state]=.4;action(s,'jump');assert.equal(s.jump,JUMP_DURATION);assert.equal(s.slide,0);assert.equal(s.roll,0);step(s,.025);assert.ok(height(s)>0);}
});
test('direction changes preserve air movement and down cancels jump',()=>{
 const s=run();action(s,'jump');step(s,.05);action(s,'right');assert.equal(s.lane,1);assert.ok(s.jump);action(s,'left');assert.equal(s.lane,0);const y=height(s);action(s,'slide');assert.ok(s.drop);step(s,.025);assert.ok(height(s)<y);
});
test('roll can be interrupted by down and another down rolls again',()=>{
 const s=run();s.roll=.4;action(s,'slide');assert.equal(s.roll,0);assert.equal(s.slide,SLIDE_DURATION);action(s,'slide');assert.equal(s.slide,0);assert.equal(s.roll,ROLL_DURATION);
});
test('near-landing jump is buffered without a midair double jump',()=>{
 const s=run();action(s,'jump');step(s,.05);const remaining=s.jump;action(s,'jump');assert.equal(s.jump,remaining);
 while(s.jump>.10)step(s,.01);action(s,'jump');for(let i=0;i<12;i++)step(s,.01);assert.ok(s.jump>.5);assert.equal(s.jumpBuffer,0);
});
test('jump completes in 0.76s and paused inputs stay ignored',()=>{
 const s=run();action(s,'jump');for(let i=0;i<77;i++)step(s,.01);assert.equal(s.jump,0);assert.equal(height(s),0);s.mode='paused';action(s,'slide');action(s,'jump');assert.equal(s.slide,0);assert.equal(s.jump,0);
});
