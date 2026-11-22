import test from 'node:test';
import assert from 'node:assert/strict';
import {createSound} from '../dist/sound.js';

test('one buffered song survives repeated start, mute during decode, and returning to the app', async t => {
  const decoded = Promise.withResolvers();
  const starts = [], stops = [];
  let songFetches = 0, clock;
  class AudioClock {
    constructor() { clock = this; this.state = 'running'; this.currentTime = 0; this.destination = {}; }
    createGain() { return {connect(){}, gain:{cancelScheduledValues(){},setValueAtTime(){},setTargetAtTime(){}}}; }
    createBufferSource() {
      return {connect(){}, disconnect(){}, start(when,offset){starts.push([this.loop,offset]);}, stop(){stops.push(1);}};
    }
    decodeAudioData() { return decoded.promise; }
    resume() { this.state='running'; return Promise.resolve(); }
  }
  t.mock.method(globalThis,'fetch',async url => {
    if (!String(url).endsWith('/bgm.mp3')) return {ok:false};
    songFetches++;
    return {ok:true,arrayBuffer:async()=>new ArrayBuffer(1)};
  });
  const oldWindow=globalThis.window;
  globalThis.window={AudioContext:AudioClock};
  try {
    const sound=createSound();
    sound.startBgm();
    sound.startBgm();
    sound.setEnabled(false);
    decoded.resolve({duration:78});
    await new Promise(resolve=>setImmediate(resolve));
    assert.deepEqual(starts,[]);
    sound.setEnabled(true);
    sound.startBgm();
    sound.startBgm();
    assert.deepEqual(starts,[[true,0]]);
    clock.currentTime=81;
    sound.pauseBgm();
    sound.pauseBgm();
    clock.currentTime=100;
    clock.state='suspended';
    sound.startBgm();
    assert.equal(clock.state,'running');
    assert.deepEqual(starts,[[true,0],[true,3]]);
    assert.equal(stops.length,1);
    assert.equal(songFetches,1);
    // Finish the deferred effects preload before restoring fetch.
    await new Promise(resolve=>setTimeout(resolve,65));
  } finally { globalThis.window=oldWindow; }
});
