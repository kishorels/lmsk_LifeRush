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

 // Decode bundled music tracks once. Each loop runs on the audio clock, independently of rendering.
 const MUSIC_TRACKS = {
  default: './assets/bgm.mp3',
  grandfather: './assets/courtyard_sunset.mp3?v=2',
 };
 const TRACK_BASE_GAIN = {
  default: MUSIC_BASE_GAIN,
  grandfather: 0.56,
 };
 const musicBuffers = new Map();
 const musicLoadings = new Map();
 const musicOffsets = new Map();
 const mediaFallbacks = new Map();
 let activeMusicTrack = 'default';
 let musicSource, musicGain, activeMediaFallback;
 let musicWanted = false, useMedia = false, musicStartedAt = 0, duck = 1;
 let musicFadeTimer = 0;

 function clearMusicFadeTimer() {
  if (musicFadeTimer) { clearTimeout(musicFadeTimer); musicFadeTimer = 0; }
 }

 function currentMusicGain() {
  return (TRACK_BASE_GAIN[activeMusicTrack] ?? MUSIC_BASE_GAIN) * volumes.music * duck;
 }

 function updateMusicVolume() {
  const volume = currentMusicGain();
  if (musicGain && context) musicGain.gain.setTargetAtTime(volume, context.currentTime, .05);
  if (activeMediaFallback && activeMediaFallback.volume !== volume) activeMediaFallback.volume = volume;
 }

 function stopCurrentMusicSource(saveOffset = true) {
  if (musicSource && context) {
   const buf = musicBuffers.get(activeMusicTrack);
   if (saveOffset && buf && buf.duration > 0) {
    const prev = musicOffsets.get(activeMusicTrack) || 0;
    musicOffsets.set(activeMusicTrack, (prev + Math.max(0, context.currentTime - musicStartedAt)) % buf.duration);
   }
   try { musicSource.stop(); } catch {}
   try { musicSource.disconnect(); } catch {}
   musicSource = null;
  }
  if (activeMediaFallback) {
   try { activeMediaFallback.pause(); } catch {}
   activeMediaFallback = null;
  }
 }

 function getMediaFallback(trackKey) {
  let el = mediaFallbacks.get(trackKey);
  if (!el && typeof Audio !== 'undefined') {
   if (trackKey === 'default') {
    el = (typeof document !== 'undefined' && document.getElementById('bgm-player'))
      || new Audio(new URL(MUSIC_TRACKS.default, import.meta.url).href);
   } else {
    el = new Audio(new URL(MUSIC_TRACKS[trackKey], import.meta.url).href);
   }
   mediaFallbacks.set(trackKey, el);
  }
  return el;
 }

 function loadTrack(trackKey) {
  if (!MUSIC_TRACKS[trackKey]) return Promise.resolve();
  if (musicBuffers.has(trackKey)) return Promise.resolve();
  const existing = musicLoadings.get(trackKey);
  if (existing) return existing;
  if (!context?.decodeAudioData || typeof fetch === 'undefined') {
   useMedia = true;
   return Promise.resolve();
  }
  const job = (async () => {
   try {
    const response = await fetch(new URL(MUSIC_TRACKS[trackKey], import.meta.url));
    if (!response.ok) throw new Error('Music unavailable');
    const decoded = await context.decodeAudioData(await response.arrayBuffer());
    musicBuffers.set(trackKey, decoded);
    if (!musicGain) {
     musicGain = context.createGain();
     musicGain.connect(getSharedOutput(context));
    }
   } catch {
    useMedia = true;
   }
  })();
  musicLoadings.set(trackKey, job);
  return job;
 }

 function playMusic() {
  if (!musicWanted || !enabled) return;
  resumeIfNeeded();
  if (musicSource || activeMediaFallback) return;
  const buf = musicBuffers.get(activeMusicTrack);
  if (buf && context) {
   if (!musicGain) {
    musicGain = context.createGain();
    musicGain.connect(getSharedOutput(context));
   }
   musicGain.gain.cancelScheduledValues(context.currentTime);
   musicGain.gain.setValueAtTime(currentMusicGain(), context.currentTime);
   const source = context.createBufferSource();
   source.buffer = buf;
   source.loop = true;
   source.connect(musicGain);
   const rawOffset = musicOffsets.get(activeMusicTrack) || 0;
   const safeOffset = (buf.duration > 0 && Number.isFinite(rawOffset))
    ? ((rawOffset % buf.duration) + buf.duration) % buf.duration
    : 0;
   source.start(0, safeOffset);
   musicSource = source;
   musicStartedAt = context.currentTime;
  } else if (useMedia && typeof Audio !== 'undefined') {
   const el = getMediaFallback(activeMusicTrack);
   if (el) {
    el.loop = true;
    activeMediaFallback = el;
    updateMusicVolume();
    if (el.paused) el.play()?.catch(() => {});
   }
  }
 }

 function setBgmTrack(trackKey = 'default', { restart = false } = {}) {
  if (!MUSIC_TRACKS[trackKey]) return;
  const changed = trackKey !== activeMusicTrack;
  if (changed) {
   stopCurrentMusicSource(true);
   activeMusicTrack = trackKey;
  }
  if (restart) {
   stopCurrentMusicSource(false);
   musicOffsets.set(trackKey, 0);
   const el = mediaFallbacks.get(trackKey);
   if (el) { try { el.currentTime = 0; } catch {} }
  }
  if (musicWanted && enabled && (changed || restart)) {
   startBgm(trackKey);
  }
 }

 function preloadBgm(trackKey = 'grandfather') {
  if (!MUSIC_TRACKS[trackKey]) return;
  unlock();
  if (context?.decodeAudioData && typeof fetch !== 'undefined') {
   void loadTrack(trackKey);
  }
 }

 function startBgm(trackKey, options = {}) {
  clearMusicFadeTimer();
  const targetTrack = (trackKey && MUSIC_TRACKS[trackKey]) ? trackKey : activeMusicTrack;
  if (targetTrack !== activeMusicTrack) {
   stopCurrentMusicSource(true);
   activeMusicTrack = targetTrack;
  }
  if (options?.restart) {
   stopCurrentMusicSource(false);
   musicOffsets.set(activeMusicTrack, 0);
   const el = mediaFallbacks.get(activeMusicTrack);
   if (el) { try { el.currentTime = 0; } catch {} }
  }
  if (!enabled) return;
  musicWanted = true;
  unlock();
  resumeIfNeeded();
  if (musicBuffers.has(activeMusicTrack) || useMedia) { playMusic(); return; }
  if (!context?.decodeAudioData || typeof fetch === 'undefined') {
   useMedia = true;
   playMusic();
   return;
  }
  const trackAtCall = activeMusicTrack;
  loadTrack(trackAtCall).then(() => {
   if (activeMusicTrack === trackAtCall) playMusic();
  });
 }

 function pauseBgm() {
  clearMusicFadeTimer();
  musicWanted = false;
  stopCurrentMusicSource(true);
 }

 function fadeOutBgm(durationSec = 1.3) {
  clearMusicFadeTimer();
  musicWanted = false;
  const dur = Math.max(0.15, Number(durationSec) || 1.3);
  if (musicSource && musicGain && context) {
   try {
    const now = context.currentTime;
    const cur = Math.max(0.0001, musicGain.gain.value || currentMusicGain());
    musicGain.gain.cancelScheduledValues(now);
    musicGain.gain.setValueAtTime(cur, now);
    musicGain.gain.linearRampToValueAtTime(0.0001, now + dur);
   } catch {}
   musicFadeTimer = setTimeout(() => {
    musicFadeTimer = 0;
    if (!musicWanted) {
     stopCurrentMusicSource(true);
     if (musicGain && context) {
      try { musicGain.gain.setValueAtTime(currentMusicGain(), context.currentTime); } catch {}
     }
    }
   }, Math.round(dur * 1000) + 40);
   return;
  }
  if (activeMediaFallback) {
   const el = activeMediaFallback;
   const startVol = Math.max(0, el.volume || currentMusicGain());
   const steps = 16;
   const stepMs = Math.max(25, Math.round((dur * 1000) / steps));
   let i = 0;
   const tickFade = () => {
    if (musicWanted || activeMediaFallback !== el) { musicFadeTimer = 0; return; }
    i++;
    el.volume = Math.max(0, startVol * (1 - i / steps));
    if (i < steps) {
     musicFadeTimer = setTimeout(tickFade, stepMs);
    } else {
     musicFadeTimer = 0;
     stopCurrentMusicSource(true);
     el.volume = startVol;
    }
   };
   musicFadeTimer = setTimeout(tickFade, stepMs);
   return;
  }
  stopCurrentMusicSource(true);
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

 // Mild pure WebAudio village nature soundscape (soft palm breeze + gentle evening birds) for Grandfather's road.
 let naturePlaying = false, natureBuffer = null, natureSource = null, natureFilter = null, natureLfo = null, natureLfoGain = null, natureGain = null;
 let nextBirdAt = 1.8, birdIdx = 0;

 function getNatureBuffer() {
  if (natureBuffer || !context || typeof context.createBuffer !== 'function') return natureBuffer;
  try {
   const sr = context.sampleRate || 44100;
   const len = Math.floor(sr * 4);
   const buf = context.createBuffer(1, len, sr);
   const data = buf.getChannelData(0);
   // Smooth warm pink-ish noise (palm leaves & gentle canal breeze)
   let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
   for (let i = 0; i < len; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    b3 = 0.86650 * b3 + white * 0.3104856;
    b4 = 0.55000 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.0168980;
    const pink = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.09;
    b6 = white * 0.115926;
    data[i] = pink;
   }
   // Seamless 0.25s edge crossfade so the 4s breeze loop has zero click
   const fade = Math.min(Math.floor(sr * 0.25), Math.floor(len / 4));
   for (let i = 0; i < fade; i++) {
    const w = i / fade;
    data[i] = data[i] * w + data[len - fade + i] * (1 - w);
   }
   natureBuffer = buf;
  } catch {}
  return natureBuffer;
 }

 function startVillageNature() {
  if (!enabled || naturePlaying) return;
  if (!context || typeof context.createBuffer !== 'function' || typeof context.createBiquadFilter !== 'function') return;
  const buf = getNatureBuffer();
  if (!buf) return;
  naturePlaying = true;
  try {
   resumeIfNeeded();
   const src = context.createBufferSource();
   src.buffer = buf;
   src.loop = true;

   const filter = context.createBiquadFilter();
   filter.type = 'bandpass';
   filter.frequency.value = 540;
   filter.Q.value = 0.65;

   const gain = context.createGain();
   const targetGain = 0.10 * level('ambience');
   gain.gain.setValueAtTime(0.0001, context.currentTime);
   gain.gain.linearRampToValueAtTime(targetGain, context.currentTime + 1.2);

   src.connect(filter).connect(gain).connect(master || getSharedOutput(context));
   src.start();

   // Slow breathing wind swell LFO modulating filter frequency gently between 360Hz and 720Hz
   if (typeof context.createOscillator === 'function') {
    const lfo = context.createOscillator();
    const lfoGain = context.createGain();
    lfo.type = 'sine';
    lfo.frequency.value = 0.12;
    lfoGain.gain.value = 180;
    lfo.connect(lfoGain).connect(filter.frequency);
    lfo.start();
    natureLfo = lfo;
    natureLfoGain = lfoGain;
   }

   natureSource = src;
   natureFilter = filter;
   natureGain = gain;
  } catch {
   naturePlaying = false;
  }
 }

 function stopVillageNature() {
  if (!naturePlaying) return;
  naturePlaying = false;
  try { natureSource?.stop(); } catch {}
  try { natureSource?.disconnect(); } catch {}
  try { natureFilter?.disconnect(); } catch {}
  try { natureLfo?.stop(); } catch {}
  try { natureLfo?.disconnect(); } catch {}
  try { natureLfoGain?.disconnect(); } catch {}
  try { natureGain?.disconnect(); } catch {}
  natureSource = natureFilter = natureLfo = natureLfoGain = natureGain = null;
 }

 function playMildVillageBird(pattern = 0) {
  if (!enabled || !context || typeof context.createOscillator !== 'function') return;
  const amb = level('ambience');
  if (amb <= 0) return;
  try {
   resumeIfNeeded();
   const now = context.currentTime;
   const out = master || getSharedOutput(context);
   const notes = pattern % 3 === 0
    // Distant gentle sparrow double-chirp
    ? [
       { f0: 2150, f1: 2780, f2: 2350, t: 0, dur: 0.11, vol: 0.022 },
       { f0: 2280, f1: 2920, f2: 2480, t: 0.17, dur: 0.12, vol: 0.020 }
      ]
    : pattern % 3 === 1
     // Soft distant sunset koel-like flute call
     ? [
        { f0: 1180, f1: 1460, f2: 1260, t: 0, dur: 0.28, vol: 0.024 },
        { f0: 1240, f1: 1520, f2: 1200, t: 0.42, dur: 0.34, vol: 0.022 }
       ]
     // Quiet single meadow trill
     : [
        { f0: 2420, f1: 3020, f2: 2560, t: 0, dur: 0.14, vol: 0.019 }
       ];
   for (const n of notes) {
    const osc = context.createOscillator();
    const g = context.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(n.f0, now + n.t);
    osc.frequency.exponentialRampToValueAtTime(n.f1, now + n.t + n.dur * 0.45);
    osc.frequency.exponentialRampToValueAtTime(n.f2, now + n.t + n.dur);
    g.gain.setValueAtTime(0.0001, now + n.t);
    g.gain.linearRampToValueAtTime(n.vol * amb, now + n.t + n.dur * 0.25);
    g.gain.exponentialRampToValueAtTime(0.0001, now + n.t + n.dur);
    osc.connect(g).connect(out);
    osc.onended = () => { try { osc.disconnect(); g.disconnect(); } catch {} };
    osc.start(now + n.t);
    osc.stop(now + n.t + n.dur + 0.02);
   }
  } catch {}
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
  currentCategory=({coin:'coins',roofCoin:'coins',magnet:'powerups',shield:'powerups',nitro:'powerups',shoes:'powerups',nearMiss:'coins',milestone:'coins',fever:'powerups',upgrade:'coins',jump:'movement',slide:'movement',lane:'movement',hit:'damage',over:'damage',laugh:'villain',swag:'villain',horn:'ambience',bell:'ambience',start:'movement',tap:'movement',oh_no:'damage',thunder:'ambience'})[name]||'movement';
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
  else if (name === 'milestone') {
   tone(523.25, 523.25, 0.11, 0.10, 'triangle', 0);
   tone(659.25, 659.25, 0.11, 0.10, 'triangle', 0.08);
   tone(783.99, 783.99, 0.13, 0.10, 'triangle', 0.16);
   tone(1046.5, 1046.5, 0.24, 0.12, 'sine', 0.24);
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
  fadeOutBgm,
  setBgmTrack,
  preloadBgm,
  setVolumes(next){
   for(const key of Object.keys(volumes))if(Number.isFinite(Number(next?.[key])))volumes[key]=Math.max(0,Math.min(1,Number(next[key])));
   updateMusicVolume();
   if(rainGain && context)rainGain.gain.setTargetAtTime(0.36*level('ambience'), context.currentTime, 0.05);
   if(rainAudio)rainAudio.volume=0.42*level('ambience');
   if(natureGain && context)natureGain.gain.setTargetAtTime(0.10*level('ambience'), context.currentTime, 0.08);
  },
  getVolumes(){return {...volumes};},
  setEnabled(value) {
   enabled = value;
   if (master) master.gain.value = enabled ? MASTER_GAIN : 0;
   if (!value) { pauseBgm(); stopRainAudio(); stopVillageNature(); }
  },
  update(s, character = 'male') {
   flyover(s);
   if (!s || s.mode !== 'running') {
    lastCollegeRainActive = false;
    stopRainAudio();
    stopVillageNature();
    return;
   }
   const isGrandfatherRoad = s.map === 'grandfather';
   if (isGrandfatherRoad && enabled) {
    startVillageNature();
    const t = s.time || 0;
    if (t < nextBirdAt - 8) nextBirdAt = t + 1.8;
    if (t >= nextBirdAt) {
     playMildVillageBird(birdIdx++);
     nextBirdAt = t + 2.8 + ((birdIdx * 1.37) % 2.9);
    }
   } else {
    stopVillageNature();
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
