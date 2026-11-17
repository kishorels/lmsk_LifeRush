import test from 'node:test';import assert from 'node:assert/strict';import {createSound} from '../dist/sound.js';
test('audio starts on gesture, mute silences master, and horns fire once',()=>{
 let voices=0,context;const param=()=>({value:0,setValueAtTime(){},exponentialRampToValueAtTime(){}});
 class FakeAudio {constructor(){context=this;this.state='running';this.currentTime=0;this.destination={};}resume(){return Promise.resolve();}createGain(){const n={gain:param(),connect(){return n;},disconnect(){}};this.lastGain=n;return n;}createOscillator(){voices++;const n={frequency:param(),connect(){return n;},disconnect(){},start(){},stop(){}};return n;}}
 globalThis.window={AudioContext:FakeAudio};const fx=createSound();fx.play('jump');assert.equal(voices,0);fx.unlock();const master=context.lastGain;fx.play('jump');assert.equal(voices,1);
 fx.setEnabled(false);assert.equal(master.gain.value,0);fx.play('coin');assert.equal(voices,1);fx.setEnabled(true);
 const s={time:1,mode:'running',jump:1,items:[{type:'bus',z:50}],distance:0,speed:22};fx.update(s);const after=voices;assert.ok(after>1);fx.update(s);assert.equal(voices,after);
 s.mode='paused';s.jump=0;fx.update(s);assert.equal(voices,after);
});
