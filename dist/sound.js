import {flightPhase} from './airliner.js';
import {hasCollegeRain, hasItParkRain} from './weather.js';

const SAMPLES = {
 coin: './assets/coins_collect.mp3',
 roofCoin: './assets/coins_collect1.mp3',
 shield: './assets/shiled_collect.mp3',
 magnet: './assets/magnectic_power_collect.mp3',
 swag: './assets/gesture_action_sound.mp3',
 evil_smile: './assets/evil_smile.mp3',
 damage: './assets/damage.mp3',
 male_hurt: './assets/male_hurt.mp3',
 female_hurt: './assets/female_hurt.mp3',
 male_oh_no: './assets/male_oh_no.wav',
 female_oh_no: './assets/female_oh_no.wav',
 thunder: './assets/thunder_sound.mp3',
};

let sharedAudioContext = null;
export function getSharedAudioContext() {
 if (typeof window === 'undefined') return null;
 const AudioCtx = window.AudioContext || window.webkitAudioContext;
 if (!AudioCtx) return null;
 if (!sharedAudioContext) {
  try {
   sharedAudioContext = new AudioCtx();
  } catch {}
 }
 if (sharedAudioContext && ['suspended','interrupted'].includes(sharedAudioContext.state)) {
  sharedAudioContext.resume().catch(() => {});
 }
 return sharedAudioContext;
}

const audioCache = new Map();
function getAudio(key) {
 if (typeof Audio === 'undefined') return null;
 let a = audioCache.get(key);
 if (!a && SAMPLES[key]) {
  try {
   a = new Audio(new URL(SAMPLES[key], import.meta.url).href);
   audioCache.set(key, a);
  } catch {}
 }
 return a;
}

export function createSound() {
 let context, master, enabled = true, jetNoise, jetVoice, rainAudio = null, rainPlaying = false, audioUnlocked = false;
 const volumes={music:1,coins:1,powerups:1,movement:1,damage:1,villain:1,ambience:1};
 let currentCategory='movement';
 const level=category=>volumes[category]??1;
 const buffers = new Map();
 const clonePool = new Map();
 let loadingSamples = false;
 let lastCollegeRainActive = false;
 let lastThunderTime = -99;

 function loadSamples() {
  if (loadingSamples || !context?.decodeAudioData || typeof fetch === 'undefined') return;
  loadingSamples = true;
  async function decodeSamples() {
   for (const [key,path] of Object.entries(SAMPLES)) {
    try {
     const response = await fetch(new URL(path, import.meta.url));
     if (response.ok) buffers.set(key, await context.decodeAudioData(await response.arrayBuffer()));
    } catch {}
   }
  }
  setTimeout(decodeSamples, 60);
 }

 function playSample(key, volume = 0.8) {
  if (!enabled) return true;
  volume*=level(currentCategory);
  if(volume<=0)return true;
  if (context && buffers.has(key)) {
   try {
    if (context.state === 'suspended') context.resume().catch(() => {});
    const src = context.createBufferSource();
    src.buffer = buffers.get(key);
    const g = context.createGain();
    g.gain.value = volume;
    src.connect(g).connect(master);
    src.onended = () => { src.disconnect(); g.disconnect(); };
    src.start();
    return true;
   } catch {}
  }
  try {
   const a = getAudio(key);
   if (a) {
    if (a.paused || a.ended) {
     a.volume = Math.min(1, volume * (enabled ? 1 : 0));
     a.currentTime = 0;
     a.play().catch(() => {});
     return true;
    }
    let pool = clonePool.get(key);
    if (!pool) {
     pool = [];
     clonePool.set(key, pool);
    }
    let recycled = pool.find(el => el.paused || el.ended);
    if (!recycled && pool.length < 3) {
     recycled = a.cloneNode();
     recycled.onended = () => { recycled.pause(); };
     pool.push(recycled);
    }
    if (recycled) {
     recycled.volume = Math.min(1, volume * (enabled ? 1 : 0));
     recycled.currentTime = 0;
     recycled.play().catch(() => {});
     return true;
    }
   }
  } catch {}
  return false;
 }

 // Decode the bundled song once. Its loop then runs on the audio clock, independently of rendering.
 let musicBuffer, musicLoading, musicSource, musicGain, mediaFallback;
 let musicWanted = false, useMedia = false, musicOffset = 0, musicStartedAt = 0, duck = 1;

 function updateMusicVolume() {
  const volume = .45 * volumes.music * duck;
  if (musicGain) musicGain.gain.setTargetAtTime(volume, context.currentTime, .05);
  if (mediaFallback && mediaFallback.volume !== volume) mediaFallback.volume = volume;
 }

 function playMusic() {
  if (!musicWanted || !enabled || musicSource) return;
  if (musicBuffer) {
   musicGain.gain.cancelScheduledValues(context.currentTime);
   musicGain.gain.setValueAtTime(.45 * volumes.music * duck, context.currentTime);
   const source = context.createBufferSource();
   source.buffer = musicBuffer;
   source.loop = true;
   source.connect(musicGain);
   source.start(0, musicOffset);
   musicSource = source;
   musicStartedAt = context.currentTime;
  } else if (useMedia && typeof Audio !== 'undefined') {
   mediaFallback ??= (typeof document !== 'undefined' && document.getElementById('bgm-player'))
     || new Audio(new URL('./assets/bgm.mp3', import.meta.url).href);
   mediaFallback.loop = true;
   updateMusicVolume();
   if (mediaFallback.paused) mediaFallback.play()?.catch(() => {});
  }
 }

 function startBgm() {
  if (!enabled) return;
  musicWanted = true;
  unlock();
  if (musicBuffer || useMedia) { playMusic(); return; }
  if (musicLoading) return;
  if (!context?.decodeAudioData || typeof fetch === 'undefined') {
   useMedia = true;
   playMusic();
   return;
  }
  musicLoading = (async () => {
   try {
    const response = await fetch(new URL('./assets/bgm.mp3', import.meta.url));
    if (!response.ok) throw new Error('Music unavailable');
    musicBuffer = await context.decodeAudioData(await response.arrayBuffer());
    musicGain = context.createGain();
    musicGain.connect(context.destination);
   } catch { useMedia = true; }
   playMusic();
  })();
 }

 function pauseBgm() {
  musicWanted = false;
  if (musicSource) {
   musicOffset = (musicOffset + context.currentTime - musicStartedAt) % musicBuffer.duration;
   musicSource.stop();
   musicSource.disconnect();
   musicSource = null;
  }
  mediaFallback?.pause();
 }

 function initRainAudio() {
  if (typeof Audio === 'undefined') return;
  if (!rainAudio) {
   try {
    rainAudio = new Audio(new URL('./assets/rain_sound.mp3', import.meta.url).href);
    rainAudio.loop = true;
    rainAudio.volume = 0.55 * level('ambience');
   } catch (e) {
    console.warn('Init rain audio error:', e);
   }
  }
 }

 function startRainAudio() {
  initRainAudio();
  if (!rainAudio || !enabled || rainPlaying) return;
  rainPlaying = true;
  try {
   rainAudio.volume = 0.55 * level('ambience');
   const p = rainAudio.play();
   if (p !== undefined) p.catch(() => {});
  } catch {}
 }

 function stopRainAudio() {
  if (rainAudio && rainPlaying) {
   rainPlaying = false;
   try {
    rainAudio.pause();
   } catch {}
  }
 }

 function unlock() {
  if (audioUnlocked && context && context.state === 'running') return;
  audioUnlocked = true;
  try {
   context = getSharedAudioContext();
   if (context && !master) {
    master = context.createGain();
    master.connect(context.destination);
   }
   if (master) master.gain.value = enabled ? 0.65 : 0;
   loadSamples();
  } catch {}
 }

 function tone(from, to, duration = 0.12, volume = 0.1, type = 'sine', delay = 0) {
  if (!enabled || !context || context.state !== 'running') return;
  volume*=level(currentCategory);
  if(volume<=0)return;
  const t = context.currentTime + delay, o = context.createOscillator(), g = context.createGain();
  o.type = type;
  o.frequency.setValueAtTime(from, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + duration);
  g.gain.setValueAtTime(0.001, t);
  g.gain.exponentialRampToValueAtTime(volume, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.001, t + duration);
  o.connect(g).connect(master);
  o.onended = () => { o.disconnect(); g.disconnect(); };
  o.start(t);
  o.stop(t + duration + 0.01);
 }

 function flyover(s) {
  const phase = flightPhase(s.time);
  if (!enabled || !context?.createBuffer || context.state !== 'running' || s.mode !== 'running' || phase >= 1) {
   if (jetVoice) { jetVoice.source.stop(); jetVoice = null; }
   if (duck !== 1) { duck = 1; updateMusicVolume(); }
   return;
  }
  if (!jetVoice) {
   if (!jetNoise) {
    jetNoise = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
    const samples = jetNoise.getChannelData(0);
    let low = 0;
    for (let i = 0; i < samples.length; i++) { low = 0.86 * low + 0.14 * (Math.random() * 2 - 1); samples[i] = low * 2; }
   }
   const source = context.createBufferSource(), filter = context.createBiquadFilter(), gain = context.createGain();
   source.buffer = jetNoise;
   source.loop = true;
   filter.type = 'lowpass';
   gain.gain.value = 0;
   source.connect(filter).connect(gain).connect(master);
   source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
   source.start();
   jetVoice = { source, filter, gain, nextUpdate: 0 };
  }
  if (context.currentTime < jetVoice.nextUpdate) return;
  jetVoice.nextUpdate = context.currentTime + .08;
  const jetLevel = Math.exp(-Math.abs(phase - 0.83) * (phase < 0.83 ? 6 : 19)), now = context.currentTime;
  jetVoice.gain.gain.setTargetAtTime(1.35 * jetLevel * volumes.ambience, now, 0.05);
  jetVoice.filter.frequency.setTargetAtTime(320 + 2800 * jetLevel, now, 0.06);
  jetVoice.source.playbackRate.setTargetAtTime(phase < 0.83 ? 1.13 : 0.76, now, 0.18);
  duck = 1 - .55 * jetLevel;
  updateMusicVolume();
 }

 function play(name, cause, character = 'male') {
  currentCategory=({coin:'coins',roofCoin:'coins',magnet:'powerups',shield:'powerups',nitro:'powerups',shoes:'powerups',nearMiss:'coins',upgrade:'coins',jump:'movement',slide:'movement',lane:'movement',hit:'damage',over:'damage',laugh:'villain',swag:'villain',horn:'ambience',bell:'ambience',start:'movement',tap:'movement',oh_no:'damage',thunder:'ambience'})[name]||'movement';
  if (name === 'jump') tone(240, 730, 0.19, 0.10, 'triangle');
  else if (name === 'slide') tone(410, 65, 0.20, 0.10, 'sawtooth');
  else if (name === 'roofCoin') {
   playSample('roofCoin', 0.80);
  }
  else if (name === 'coin') {
   playSample('coin', 0.75);
  }
  else if (name === 'hit') {
   playSample('damage', 0.95);
   if (String(character).includes('female') || String(character).includes('woman') || String(character).includes('girl')) {
    playSample('female_hurt', 1.0);
   } else {
    playSample('male_hurt', 1.0);
   }
  }
  else if (name === 'oh_no') {
   const isFemale = String(character).includes('female') || String(character).includes('woman') || String(character).includes('girl');
   if (isFemale) {
    playSample('female_oh_no', 1.0);
   } else {
    playSample('male_oh_no', 1.0);
   }
  }
  else if (name === 'horn') {
   tone(185, 180, 0.30, 0.10, 'sawtooth');
   tone(247, 240, 0.30, 0.07, 'triangle');
  }
  else if (name === 'tap') {
   tone(540, 1080, 0.08, 0.12, 'triangle');
  }
  else if (name === 'start') {
   for (let i = 0; i < 3; i++) tone(440 * 2 ** (i / 4), 440 * 2 ** (i / 4), 0.13, 0.1, 'triangle', i * 0.10);
  }
  else if (name === 'laugh') {
   if (!playSample('evil_smile', 0.95)) {
    for (let i = 0; i < 4; i++) tone(140 - i * 8, 78 - i * 4, 0.14, 0.10, 'sawtooth', i * 0.22);
   }
  }
  else if (name === 'over') {
   tone(260, 80, 0.45, 0.15, 'triangle');
  }
  else if (name === 'lane') tone(160, 95, 0.07, 0.04, 'triangle');
  else if (name === 'bell') {
   for (let i = 0; i < 4; i++) {
    tone(1180, 1176, 0.28, 0.14, 'sine', i * 0.18);
    tone(1780, 1770, 0.22, 0.10, 'triangle', i * 0.18 + 0.02);
   }
  }
  else if (name === 'magnet') {
   playSample('magnet', 0.80);
  }
  else if (name === 'shield') {
   playSample('shield', 0.85);
  }
  else if (name === 'nitro') {
   tone(260, 1280, 0.28, 0.14, 'sawtooth');
   tone(520, 1640, 0.24, 0.11, 'triangle', 0.06);
  }
  else if (name === 'shoes') {
   tone(320, 920, 0.14, 0.12, 'triangle');
   tone(480, 1180, 0.16, 0.11, 'sine', 0.08);
  }
  else if (name === 'nearMiss') {
   tone(760, 1180, 0.09, 0.09, 'sine');
   tone(1180, 1520, 0.11, 0.08, 'triangle', 0.05);
  }
  else if (name === 'upgrade') {
   tone(520, 660, 0.10, 0.12, 'triangle');
   tone(660, 880, 0.12, 0.12, 'triangle', 0.08);
   tone(880, 1180, 0.18, 0.13, 'sine', 0.16);
  }
  else if (name === 'turbo') {
   tone(340, 1420, 0.22, 0.14, 'sawtooth');
   tone(680, 1780, 0.18, 0.11, 'triangle', 0.05);
  }
  else if (name === 'launch') {
   tone(240, 1120, 0.26, 0.15, 'triangle');
   tone(480, 1520, 0.20, 0.10, 'sine', 0.07);
  }
  else if (name === 'mystery') {
   tone(523, 659, 0.10, 0.13, 'triangle');
   tone(659, 784, 0.10, 0.13, 'triangle', 0.08);
   tone(784, 1046, 0.20, 0.15, 'sine', 0.16);
  }
  else if (name === 'letter') {
   tone(698, 1046, 0.12, 0.13, 'sine');
   tone(1046, 1396, 0.15, 0.11, 'triangle', 0.07);
  }
  else if (name === 'fever') {
   for (let i = 0; i < 4; i++) tone(440 + i * 165, 660 + i * 220, 0.14, 0.14, 'triangle', i * 0.07);
  }
  else if (name === 'book') {
   tone(620, 980, 0.12, 0.11, 'triangle');
   tone(980, 1470, 0.14, 0.10, 'sine', 0.06);
  }
  else if (name === 'swag') {
   playSample('swag', 0.95);
  }
  else if (name === 'thunder') {
   playSample('thunder', 0.95);
  }
 }

 return {
  unlock,
  play,
  startBgm,
  pauseBgm,
  setVolumes(next){
   for(const key of Object.keys(volumes))if(Number.isFinite(Number(next?.[key])))volumes[key]=Math.max(0,Math.min(1,Number(next[key])));
   updateMusicVolume();
   if(rainAudio)rainAudio.volume=0.55*level('ambience');
  },
  getVolumes(){return {...volumes};},
  setEnabled(value) {
   enabled = value;
   if (master) master.gain.value = enabled ? 0.65 : 0;
   if (!value) { pauseBgm(); stopRainAudio(); }
  },
  update(s, character = 'male') {
   flyover(s);
   if (!s || s.mode !== 'running') {
    lastCollegeRainActive = false;
    stopRainAudio();
    return;
   }
   const isCollegeRain = s.map === 'college' && hasCollegeRain(s);
   const isParkRain = s.map === 'itpark' && hasItParkRain(s);
   const inTunnel = s.map === 'itpark' && s.activeBranch === 'underpass';
   const shouldPlayRain = enabled && (isCollegeRain || (isParkRain && !inTunnel));

   if (shouldPlayRain) {
    startRainAudio();
   } else {
    stopRainAudio();
   }

   if (isCollegeRain && !lastCollegeRainActive) {
    play('oh_no', null, character);
   }
   lastCollegeRainActive = isCollegeRain;

   if (isParkRain && !inTunnel && enabled) {
    const t = s.time || 0;
    const flashCycle = (t + 1.2) % 6.8;
    if (flashCycle < 0.12 && (t - lastThunderTime) > 4.5) {
     lastThunderTime = t;
     play('thunder');
    }
   }

   if (Array.isArray(s.items)) {
    for (const bus of s.items) {
     if (bus.type === 'bus' && !bus.roofRide && (!bus.encounter || bus.started) && !bus.horned && bus.z - s.distance < 65 && bus.z > s.distance) {
      bus.horned = true;
      play('horn');
     }
    }
   }
  }
 };
}

function uiAudioContext() {
  return getSharedAudioContext();
}

export function playUiClick(enabled = true) {
  if (!enabled) return;
  try {
    const ctx = uiAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(620, now);
    osc.frequency.exponentialRampToValueAtTime(1180, now + 0.055);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.24, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.095);
  } catch {}
}

export function playEnterSound(enabled = true) {
  if (!enabled) return;
  try {
    const ctx = uiAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [
      { f0: 440, f1: 660, t: 0, dur: 0.11, vol: 0.24, type: 'triangle' },
      { f0: 660, f1: 990, t: 0.055, dur: 0.14, vol: 0.22, type: 'sine' },
      { f0: 880, f1: 1320, t: 0.11, dur: 0.18, vol: 0.18, type: 'triangle' }
    ];
    for (const n of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = n.type;
      osc.frequency.setValueAtTime(n.f0, now + n.t);
      osc.frequency.exponentialRampToValueAtTime(n.f1, now + n.t + n.dur);
      gain.gain.setValueAtTime(0.0001, now + n.t);
      gain.gain.linearRampToValueAtTime(n.vol, now + n.t + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + n.t + n.dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + n.t);
      osc.stop(now + n.t + n.dur + 0.01);
    }
  } catch {}
}
