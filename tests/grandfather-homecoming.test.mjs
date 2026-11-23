import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh, step} from '../dist/engine.js';
import {roadCurveX} from '../dist/campus-layout.js';
import {GRANDFATHER_GATE, HOME_YARD_START, SCHOOL_ROAD_START, memoryPace, populateGrandfatherPath, reachedMemory, villageMemories} from '../dist/grandfather-route.js';

test('the grandfather follows the original village bends up to the home yard', () => {
  for(let distance=SCHOOL_ROAD_START;distance<=HOME_YARD_START;distance+=8){
    assert.equal(roadCurveX(distance,'grandfather'),roadCurveX(distance-SCHOOL_ROAD_START,'finalrun'));
  }
});

test('each approach slows before the clip, resumes at the same point and only fires once', () => {
  const state=Object.assign(fresh(5),{map:'grandfather',mode:'running'});
  for(const cue of villageMemories){
    assert.equal(memoryPace(cue.at-42,18),18);
    assert.ok(memoryPace(cue.at-15,18)<memoryPace(cue.at-35,18));
    assert.ok(memoryPace(cue.at-2,18)<memoryPace(cue.at-15,18));
    state.distance=cue.at-.02;
    const before=state.distance;
    step(state,1/30);
    assert.equal(reachedMemory(state,before),cue);
    state.distance=cue.at;
    state.mode='remembering';
    step(state,.05);
    assert.equal(state.distance,cue.at);
    state.mode='running';
    step(state,1/30);
    assert.equal(reachedMemory(state,cue.at),undefined);
  }
  assert.equal(villageMemories.at(-1).at,GRANDFATHER_GATE);
  assert.ok(memoryPace(GRANDFATHER_GATE,18)<3);
});

test('the quiet school road offers two avoidable obstacles far from every film', () => {
  const state=Object.assign(fresh(15),{map:'grandfather',distance:GRANDFATHER_GATE,items:[]});
  populateGrandfatherPath(state);
  const obstacles=state.items.filter(item=>item.type!=='coin');
  for(const cue of villageMemories)assert.ok(obstacles.every(o=>Math.abs(o.z-cue.at)>40));
  const later=obstacles.filter(o=>o.z>villageMemories[0].at);
  assert.equal(later.length,2);
  assert.ok(later[1].z-later[0].z>=300);
  assert.ok(later.every(o=>Math.abs(o.lane*2.2)>o.halfWidth+.22));
});
