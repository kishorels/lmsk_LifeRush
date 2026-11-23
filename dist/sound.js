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
let sharedOutputNode = null;

export function getSharedAudioContext() {
 if (typeof window === 'undefined') return null;
 const AudioCtx = window.AudioContext || window.webkitAudioContext;
 if (!AudioCtx) return null;
 // Reset cached context if AudioContext constructor changed (e.g. unit tests) or context closed.
 if (sharedAudioContext && (!(sharedAudioContext instanceof AudioCtx) || sharedAudioContext.state === 'closed')) {
  sharedAudioContext = null;
  sharedOutputNode = null;
 }
 if (!sharedAudioContext) {
  try {
   // 'playback' latencyHint uses a large, stable hardware mixer buffer on Android WebView
   // instead of the fragile 5ms 'interactive' AAudio fast-track that crackles and drops out!
   try {
    sharedAudioContext = new AudioCtx({ latencyHint: 'playback' });
   } catch {
    sharedAudioContext = new AudioCtx();
   }
  } catch {}
 }
 if (sharedAudioContext && ['suspended', 'interrupted'].includes(sharedAudioContext.state)) {
  try { sharedAudioContext.resume?.()?.catch?.(() => {}); } catch {}
 }
 return sharedAudioContext;
}

function getSharedOutput(ctx) {
 if (!ctx) return null;
 if (sharedOutputNode && sharedAudioContext === ctx) return sharedOutputNode;
 if (typeof ctx.createDynamicsCompressor === 'function') {
  try {
   // Soft master limiter prevents digital clipping ("kora koranu" speaker distortion) when BGM + SFX overlap.
   const comp = ctx.createDynamicsCompressor();
   comp.threshold.value = -10;
   comp.knee.value = 12;
   comp.ratio.value = 8;
   comp.attack.value = 0.003;
   comp.release.value = 0.16;
   comp.connect(ctx.destination);
   sharedOutputNode = comp;
   return sharedOutputNode;
  } catch {}
 }
 sharedOutputNode = ctx.destination;
 return sharedOutputNode;
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
 let rainBuffer = null, rainLoading = false, rainSource = null, rainGain = null;
 const volumes={music:1,coins:1,powerups:1,movement:1,damage:1,villain:1,ambience:1};
 let currentCategory='movement';
 const level=category=>volumes[category]??1;
 const buffers = new Map();
 const clonePool = new Map();
 const lastSampleAt = new Map();
 let activeSfxCount = 0;
 let loadingSamples = false;
 let lastCollegeRainActive = false;
 let lastThunderTime = -99;
 let stateHookedCtx = null;

 const MASTER_GAIN = 0.56;
 const MUSIC_BASE_GAIN = 0.34;
 const MAX_SIMULTANEOUS_SFX = 8;

 function resumeIfNeeded() {
  if (!context) return;
  if (['suspended', 'interrupted'].includes(context.state)) {
   try { context.resume?.()?.catch?.(() => {}); } catch {}
  }
 }

 function hookStateRecovery(ctx) {
  if (!ctx || stateHookedCtx === ctx || typeof ctx.addEventListener !== 'function') return;
  stateHookedCtx = ctx;
  ctx.addEventListener('statechange', () => {
   if (enabled && ['suspended', 'interrupted'].includes(ctx.state)) {
    try { ctx.resume?.()?.catch?.(() => {}); } catch {}
   }
  });
 }

 function loadSamples() {
  if (loadingSamples || !context?.decodeAudioData || typeof fetch === 'undefined') return;
  loadingSamples = true;
  async function decodeSamples() {
   for (const [key, path] of Object.entries(SAMPLES)) {
    try {
     const response = await fetch(new URL(path, import.meta.url));
     if (response.ok) {
      buffers.set(key, await context.decodeAudioData(await response.arrayBuffer()));
      // Space out Android MP3 decodes by 120ms so we never starve the audio playback thread!
      await new Promise(r => setTimeout(r, 120));
     }
    } catch {}
   }
  }
  setTimeout(decodeSamples, 60);
 }

 function playSample(key, volume = 0.8) {
  if (!enabled) return true;
  volume *= level(currentCategory);
  if (volume <= 0) return true;
  const nowMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const minGap = (key === 'coin' || key === 'roofCoin') ? 75 : (key === 'damage' || key === 'male_hurt' || key === 'female_hurt') ? 120 : 0;
  if (minGap > 0) {
   const prevMs = lastSampleAt.get(key) || -1e9;
   if ((nowMs - prevMs) < minGap) return true;
   lastSampleAt.set(key, nowMs);
  }

  if (context && buffers.has(key)) {
   try {
    resumeIfNeeded();
    if (activeSfxCount >= MAX_SIMULTANEOUS_SFX) return true;
    const src = context.createBufferSource();
    src.buffer = buffers.get(key);
    const g = context.createGain();
    g.gain.value = Math.min(1, volume);
    src.connect(g).connect(master);
    activeSfxCount++;
    src.onended = () => {
     activeSfxCount = Math.max(0, activeSfxCount - 1);
     try { src.disconnect(); g.disconnect(); } catch {}
    };
    src.start();
    return true;
   } catch {}
  }

  // On real browsers with WebAudio decodeAudioData, avoid spawning HTML5 <audio> clones that steal
  // Android AudioFocus & exhaust MediaPlayer tracks while samples finish decoding.
  if (context && typeof context.decodeAudioData === 'function') {
   if (key === 'coin' || key === 'roofCoin') {
    tone(key === 'roofCoin' ? 1180 : 960, key === 'roofCoin' ? 1680 : 1420, 0.085, 0.09, 'sine');
    return true;
   }
   return false;
  }

  // Fallback path when WebAudio decodeAudioData is unavailable (e.g. legacy environments & unit tests).
  try {
   const a = getAudio(key);
   if (a) {
    if (a.paused || a.ended || a.paused === undefined) {
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
    if (!recycled && pool.length < 2) {
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
  const volume = MUSIC_BASE_GAIN * volumes.music * duck;
  if (musicGain && context) musicGain.gain.setTargetAtTime(volume, context.currentTime, .05);
  if (mediaFallback && mediaFallback.volume !== volume) mediaFallback.volume = volume;
 }

 function playMusic() {
  if (!musicWanted || !enabled) return;
  resumeIfNeeded();
  if (musicSource) return;
  if (musicBuffer && context) {
   musicGain.gain.cancelScheduledValues(context.currentTime);
   musicGain.gain.setValueAtTime(MUSIC_BASE_GAIN * volumes.music * duck, context.currentTime);
   const source = context.createBufferSource();
   source.buffer = musicBuffer;
   source.loop = true;
   source.connect(musicGain);
   const safeOffset = (musicBuffer.duration > 0 && Number.isFinite(musicOffset))
    ? ((musicOffset % musicBuffer.duration) + musicBuffer.duration) % musicBuffer.duration
    : 0;
   source.start(0, safeOffset);
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
  resumeIfNeeded();
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
    musicGain.connect(getSharedOutput(context));
   } catch { useMedia = true; }
   playMusic();
  })();
 }

 function pauseBgm() {
  musicWanted = false;
  if (musicSource && context && musicBuffer) {
   if (musicBuffer.duration > 0) {
    musicOffset = (musicOffset + Math.max(0, context.currentTime - musicStartedAt)) % musicBuffer.duration;
   }
   try { musicSource.stop(); } catch {}
   try { musicSource.disconnect(); } catch {}
   musicSource = null;
  }
  mediaFallback?.pause();
 }

 function startWebAudioRain() {
  if (!rainPlaying || !enabled || !context || !rainBuffer || rainSource) return;
  try {
   resumeIfNeeded();
   const src = context.createBufferSource();
   src.buffer = rainBuffer;
   src.loop = true;
   const g = context.createGain();
   g.gain.value = 0.36 * level('ambience');
   src.connect(g).connect(master || getSharedOutput(context));
   src.start();
   rainSource = src;
   rainGain = g;
  } catch {}
 }

 function initRainAudio() {
  if (typeof Audio === 'undefined') return;
  if (!rainAudio) {
   try {
    rainAudio = new Audio(new URL('./assets/rain_sound.mp3', import.meta.url).href);
    rainAudio.loop = true;
    rainAudio.volume = 0.42 * level('ambience');
   } catch (e) {
    console.warn('Init rain audio error:', e);
   }
  }
 }

 function startRainAudio() {
  if (!enabled || rainPlaying) return;
  rainPlaying = true;
  // Prefer WebAudio buffer on real browsers so rain never clashes with WebAudio BGM on Android AudioFocus.
  if (context?.decodeAudioData && typeof fetch !== 'undefined') {
   if (rainBuffer) { startWebAudioRain(); return; }
   if (!rainLoading) {
    rainLoading = true;
    (async () => {
     try {
      const response = await fetch(new URL('./assets/rain_sound.mp3', import.meta.url));
      if (response.ok) {
       rainBuffer = await context.decodeAudioData(await response.arrayBuffer());
       startWebAudioRain();
      }
     } catch {}
    })();
   }
   return;
  }
  initRainAudio();
  if (!rainAudio) return;
  try {
   rainAudio.volume = 0.42 * level('ambience');
   const p = rainAudio.play();
   if (p !== undefined) p.catch(() => {});
  } catch {}
 }

 function stopRainAudio() {
  if (!rainPlaying) return;
  rainPlaying = false;
  if (rainSource) {
   try { rainSource.stop(); } catch {}
   try { rainSource.disconnect(); } catch {}
   try { rainGain?.disconnect(); } catch {}
   rainSource = null;
   rainGain = null;
  }
  if (rainAudio) {
   try { rainAudio.pause(); } catch {}
  }
 }

 function unlock() {
  if (audioUnlocked && context && context.state === 'running' && master) return;
  audioUnlocked = true;
  try {
   context = getSharedAudioContext();
   hookStateRecovery(context);
   resumeIfNeeded();
   if (context && !master) {
    const out = getSharedOutput(context);
    master = context.createGain();
    master.connect(out);
   }
   if (master) master.gain.value = enabled ? MASTER_GAIN : 0;
   loadSamples();
  } catch {}
 }

 function tone(from, to, duration = 0.12, volume = 0.1, type = 'sine', delay = 0) {
  if (!enabled || !context) return;
  if (context.state !== 'running') {
   resumeIfNeeded();
   if (context.state !== 'running') return;
  }
  volume *= level(currentCategory);
  if (volume <= 0) return;
  const t = context.currentTime + delay, o = context.createOscillator(), g = context.createGain();
  o.type = type;
  o.frequency.setValueAtTime(from, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + duration);
  g.gain.setValueAtTime(0.001, t);
  g.gain.exponentialRampToValueAtTime(volume, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.001, t + duration);
  o.connect(g).connect(master);
  o.onended = () => { try { o.disconnect(); g.disconnect(); } catch {} };
  o.start(t);
  o.stop(t + duration + 0.01);
 }

 function flyover(s) {
  const phase = flightPhase(s.time);
  if (!enabled || !context?.createBuffer || context.state !== 'running' || s.mode !== 'running' || phase >= 1) {
   if (jetVoice) { try { jetVoice.source.stop(); } catch {} jetVoice = null; }
   if (duck !== 1) { duck = 1; updateMusicVolume(); }
   return;
  }
  if (!jetVoice) {
   if (!jetNoise) {
    jetNoise = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
    const samples = jetNoise.getChannelData(0);
    let low = 0;
    for (let i = 0; i < samples.length; i++) { low = 0.86 * low + 0.14 * (Math.random() * 2 - 1); samples[i] = low * 1.4; }
   }
   const source = context.createBufferSource(), filter = context.createBiquadFilter(), gain = context.createGain();
   source.buffer = jetNoise;
   source.loop = true;
   filter.type = 'lowpass';
   gain.gain.value = 0;
   source.connect(filter).connect(gain).connect(master);
   source.onended = () => { try { source.disconnect(); filter.disconnect(); gain.disconnect(); } catch {} };
   source.start();
   jetVoice = { source, filter, gain, nextUpdate: 0 };
  }
  if (context.currentTime < jetVoice.nextUpdate) return;
  jetVoice.nextUpdate = context.currentTime + .08;
  const jetLevel = Math.exp(-Math.abs(phase - 0.83) * (phase < 0.83 ? 6 : 19)), now = context.currentTime;
  // Kept well below 0.5 so overhead airliner noise never clips mobile speakers!
  jetVoice.gain.gain.setTargetAtTime(0.42 * jetLevel * volumes.ambience, now, 0.05);
  jetVoice.filter.frequency.setTargetAtTime(320 + 2400 * jetLevel, now, 0.06);
  jetVoice.source.playbackRate.setTargetAtTime(phase < 0.83 ? 1.13 : 0.76, now, 0.18);
  duck = 1 - .40 * jetLevel;
  updateMusicVolume();
 }

 function play(name, cause, character = 'male') {
  currentCategory=({coin:'coins',roofCoin:'coins',magnet:'powerups',shield:'powerups',nitro:'powerups',shoes:'powerups',nearMiss:'coins',upgrade:'coins',jump:'movement',slide:'movement',lane:'movement',hit:'damage',over:'damage',laugh:'villain',swag:'villain',horn:'ambience',bell:'ambience',start:'movement',tap:'movement',oh_no:'damage',thunder:'ambience'})[name]||'movement';
  if (name === 'jump') tone(240, 730, 0.19, 0.09, 'triangle');
  else if (name === 'slide') tone(410, 65, 0.20, 0.08, 'sawtooth');
  else if (name === 'roofCoin') {
   playSample('roofCoin', 0.68);
  }
  else if (name === 'coin') {
   playSample('coin', 0.62);
  }
  else if (name === 'hit') {
   playSample('damage', 0.80);
   if (String(character).includes('female') || String(character).includes('woman') || String(character).includes('girl')) {
    playSample('female_hurt', 0.85);
   } else {
    playSample('male_hurt', 0.85);
   }
  }
  else if (name === 'oh_no') {
   const isFemale = String(character).includes('female') || String(character).includes('woman') || String(character).includes('girl');
   if (isFemale) {
    playSample('female_oh_no', 0.85);
   } else {
    playSample('male_oh_no', 0.85);
   }
  }
  else if (name === 'horn') {
   tone(185, 180, 0.28, 0.085, 'sawtooth');
   tone(247, 240, 0.28, 0.06, 'triangle');
  }
  else if (name === 'tap') {
   tone(540, 1080, 0.08, 0.09, 'triangle');
  }
  else if (name === 'start') {
   for (let i = 0; i < 3; i++) tone(440 * 2 ** (i / 4), 440 * 2 ** (i / 4), 0.13, 0.09, 'triangle', i * 0.10);
  }
  else if (name === 'laugh') {
   if (!playSample('evil_smile', 0.80)) {
    for (let i = 0; i < 4; i++) tone(140 - i * 8, 78 - i * 4, 0.14, 0.085, 'sawtooth', i * 0.22);
   }
  }
  else if (name === 'over') {
   tone(260, 80, 0.45, 0.12, 'triangle');
  }
  else if (name === 'lane') tone(160, 95, 0.07, 0.04, 'triangle');
  else if (name === 'bell') {
   for (let i = 0; i < 4; i++) {
    tone(1180, 1176, 0.26, 0.10, 'sine', i * 0.18);
    tone(1780, 1770, 0.20, 0.07, 'triangle', i * 0.18 + 0.02);
   }
  }
  else if (name === 'magnet') {
   playSample('magnet', 0.72);
  }
  else if (name === 'shield') {
   playSample('shield', 0.75);
  }
  else if (name === 'nitro') {
   tone(260, 1280, 0.26, 0.11, 'sawtooth');
   tone(520, 1640, 0.22, 0.09, 'triangle', 0.06);
  }
  else if (name === 'shoes') {
   tone(320, 920, 0.14, 0.10, 'triangle');
   tone(480, 1180, 0.16, 0.09, 'sine', 0.08);
  }
  else if (name === 'nearMiss') {
   tone(760, 1180, 0.09, 0.08, 'sine');
   tone(1180, 1520, 0.11, 0.07, 'triangle', 0.05);
  }
  else if (name === 'upgrade') {
   tone(520, 660, 0.10, 0.10, 'triangle');
   tone(660, 880, 0.12, 0.10, 'triangle', 0.08);
   tone(880, 1180, 0.18, 0.11, 'sine', 0.16);
  }
  else if (name === 'turbo') {
   tone(340, 1420, 0.22, 0.11, 'sawtooth');
   tone(680, 1780, 0.18, 0.09, 'triangle', 0.05);
  }
  else if (name === 'launch') {
   tone(240, 1120, 0.26, 0.12, 'triangle');
   tone(480, 1520, 0.20, 0.08, 'sine', 0.07);
  }
  else if (name === 'mystery') {
   tone(523, 659, 0.10, 0.10, 'triangle');
   tone(659, 784, 0.10, 0.10, 'triangle', 0.08);
   tone(784, 1046, 0.20, 0.12, 'sine', 0.16);
  }
  else if (name === 'letter') {
   tone(698, 1046, 0.12, 0.10, 'sine');
   tone(1046, 1396, 0.15, 0.09, 'triangle', 0.07);
  }
  else if (name === 'fever') {
   for (let i = 0; i < 4; i++) tone(440 + i * 165, 660 + i * 220, 0.14, 0.11, 'triangle', i * 0.07);
  }
  else if (name === 'book') {
   tone(620, 980, 0.12, 0.09, 'triangle');
   tone(980, 1470, 0.14, 0.08, 'sine', 0.06);
  }
  else if (name === 'swag') {
   playSample('swag', 0.78);
  }
  else if (name === 'thunder') {
   playSample('thunder', 0.80);
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
   if(rainGain && context)rainGain.gain.setTargetAtTime(0.36*level('ambience'), context.currentTime, 0.05);
   if(rainAudio)rainAudio.volume=0.42*level('ambience');
  },
  getVolumes(){return {...volumes};},
  setEnabled(value) {
   enabled = value;
   if (master) master.gain.value = enabled ? MASTER_GAIN : 0;
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
    const out = getSharedOutput(ctx);
    const now = ctx.currentTime;
    // Crisp tactile dual-harmonic mechanical pop click for responsive UI feedback.
    const pop = ctx.createOscillator();
    const popGain = ctx.createGain();
    pop.type = 'sine';
    pop.frequency.setValueAtTime(840, now);
    pop.frequency.exponentialRampToValueAtTime(1380, now + 0.042);
    popGain.gain.setValueAtTime(0.0001, now);
    popGain.gain.linearRampToValueAtTime(0.13, now + 0.004);
    popGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.062);
    pop.connect(popGain);
    popGain.connect(out);
    pop.onended = () => { try { pop.disconnect(); popGain.disconnect(); } catch {} };
    pop.start(now);
    pop.stop(now + 0.068);

    const body = ctx.createOscillator();
    const bodyGain = ctx.createGain();
    body.type = 'triangle';
    body.frequency.setValueAtTime(360, now);
    body.frequency.exponentialRampToValueAtTime(190, now + 0.038);
    bodyGain.gain.setValueAtTime(0.0001, now);
    bodyGain.gain.linearRampToValueAtTime(0.085, now + 0.003);
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);
    body.connect(bodyGain);
    bodyGain.connect(out);
    body.onended = () => { try { body.disconnect(); bodyGain.disconnect(); } catch {} };
    body.start(now);
    body.stop(now + 0.052);
  } catch {}
}

export function playLaunchClick(enabled = true) {
  if (!enabled) return;
  try {
    const ctx = uiAudioContext();
    if (!ctx) return;
    const out = getSharedOutput(ctx);
    const now = ctx.currentTime;
    // Tactile punch click + crisp rising game-start launch chime for LET'S RUN.
    const notes = [
      { f0: 420, f1: 240, t: 0, dur: 0.045, vol: 0.12, type: 'triangle' },
      { f0: 523, f1: 659, t: 0.015, dur: 0.10, vol: 0.12, type: 'triangle' },
      { f0: 784, f1: 1046, t: 0.075, dur: 0.16, vol: 0.11, type: 'sine' }
    ];
    for (const n of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = n.type;
      osc.frequency.setValueAtTime(n.f0, now + n.t);
      osc.frequency.exponentialRampToValueAtTime(n.f1, now + n.t + n.dur);
      gain.gain.setValueAtTime(0.0001, now + n.t);
      gain.gain.linearRampToValueAtTime(n.vol, now + n.t + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + n.t + n.dur);
      osc.connect(gain);
      gain.connect(out);
      osc.onended = () => { try { osc.disconnect(); gain.disconnect(); } catch {} };
      osc.start(now + n.t);
      osc.stop(now + n.t + n.dur + 0.015);
    }
  } catch {}
}

export function playEnterSound(enabled = true) {
  if (!enabled) return;
  try {
    const ctx = uiAudioContext();
    if (!ctx) return;
    const out = getSharedOutput(ctx);
    const now = ctx.currentTime;
    // Soft, gentle low-volume entry chime so tapping "Enter LifeRush" is smooth and pleasant on mobile speakers.
    const notes = [
      { f0: 392, f1: 523, t: 0, dur: 0.11, vol: 0.060, type: 'sine' },
      { f0: 523, f1: 659, t: 0.06, dur: 0.13, vol: 0.052, type: 'sine' },
      { f0: 659, f1: 784, t: 0.12, dur: 0.16, vol: 0.045, type: 'sine' }
    ];
    for (const n of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = n.type;
      osc.frequency.setValueAtTime(n.f0, now + n.t);
      osc.frequency.exponentialRampToValueAtTime(n.f1, now + n.t + n.dur);
      gain.gain.setValueAtTime(0.0001, now + n.t);
      gain.gain.linearRampToValueAtTime(n.vol, now + n.t + 0.014);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + n.t + n.dur);
      osc.connect(gain);
      gain.connect(out);
      osc.onended = () => { try { osc.disconnect(); gain.disconnect(); } catch {} };
      osc.start(now + n.t);
      osc.stop(now + n.t + n.dur + 0.015);
    }
  } catch {}
}
