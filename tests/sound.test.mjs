import test from 'node:test';import assert from 'node:assert/strict';import {createSound} from '../dist/sound.js';
test('audio starts on gesture, mute silences master, and horns fire once',()=>{
 let voices=0,context;const param=()=>({value:0,setValueAtTime(){},exponentialRampToValueAtTime(){}});
 class FakeAudio {constructor(){context=this;this.state='running';this.currentTime=0;this.destination={};}resume(){return Promise.resolve();}createGain(){const n={gain:param(),connect(){return n;},disconnect(){}};this.lastGain=n;return n;}createOscillator(){voices++;const n={frequency:param(),connect(){return n;},disconnect(){},start(){},stop(){}};return n;}}
 globalThis.window={AudioContext:FakeAudio};const fx=createSound();fx.play('jump');assert.equal(voices,0);fx.unlock();const master=context.lastGain;fx.play('jump');assert.equal(voices,1);
 fx.setEnabled(false);assert.equal(master.gain.value,0);fx.play('coin');assert.equal(voices,1);fx.setEnabled(true);
 const s={time:1,mode:'running',jump:1,items:[{type:'bus',z:50}],distance:0,speed:22};fx.update(s);const after=voices;assert.ok(after>1);fx.update(s);assert.equal(voices,after);
 s.mode='paused';s.jump=0;fx.update(s);assert.equal(voices,after);
});

test('college rain triggers character oh_no voice reaction (male for boy, female for girl)',()=>{
 let playedSample = null;
 globalThis.Audio = class {
  constructor(src){ this.src = src; }
  cloneNode(){ return this; }
  play(){ playedSample = this.src; return Promise.resolve(); }
 };
 const fx = createSound();
 fx.unlock();
 
 // Male character reaction
 fx.play('oh_no', null, 'college-boy');
 assert.ok(playedSample && playedSample.includes('male_oh_no'));
 
 // Female character reaction
 fx.play('oh_no', null, 'college-girl');
 assert.ok(playedSample && playedSample.includes('female_oh_no'));
 
 // During update loop when rain starts in college
 const s = { map: 'college', mode: 'running', time: 10, items: [] };
 playedSample = null;
 fx.update(s, 'college-boy');
 assert.equal(playedSample, null);
 
 s.time = 35;
 fx.update(s, 'college-boy');
 assert.ok(playedSample && playedSample.includes('male_oh_no'));
 
 // Consecutive frames while raining should not spam
 playedSample = null;
 s.time = 36;
 fx.update(s, 'college-boy');
 assert.equal(playedSample, null);
 
 // After rain stops and starts again in next cycle
 s.time = 82;
 fx.update(s, 'college-girl');
 s.time = 90 + 35;
 fx.update(s, 'college-girl');
 assert.ok(playedSample && playedSample.includes('female_oh_no'));
});
