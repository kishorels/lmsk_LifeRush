import test from 'node:test';
import assert from 'node:assert/strict';
import { itparkWeatherAt, hasItParkRain, hasCollegeRain, sceneWeather } from '../dist/weather.js';
import { createSound } from '../dist/sound.js';
import { Scene, DirectionalLight, HemisphereLight, Color } from '../dist/vendor/three.module.js';
import { createRoadEventsScene } from '../dist/itpark-events-scene.js';
import { createSky } from '../dist/sky-scene.js';

test('IT Park weather progression: good weather at start, dark storm clouds rain and thunder near 2 paths (charcoal sky, NO navy blue)', () => {
  // 1. Start of run (0..139m): Clear sunny weather
  const startW = itparkWeatherAt(50, 5);
  assert.equal(startW.rain, 0, 'Rain must be 0 at start');
  assert.equal(startW.stormDark, 0, 'Storm darkness must be 0 at start');
  assert.equal(startW.sun, 1, 'Sun must be full at start');
  assert.equal(startW.label, 'CLEAR');
  assert.equal(startW.a.top, '#0078ff');
  assert.equal(startW.a.horizon, '#64d6ff');

  // 2. Approaching 2 paths (140..220m): Gathering dark clouds and rain starts
  const warnW = itparkWeatherAt(180, 10);
  assert.ok(warnW.rain > 0.4 && warnW.rain < 0.6, 'Rain should be ramping up near 2 paths');
  assert.ok(warnW.stormDark > 0.4, 'Dark clouds should be gathering');
  assert.equal(warnW.label, 'RAIN');

  // 3. Peak storm along 2 paths (220..1220m): Charcoal storm clouds (NOT navy blue!)
  const stormW = itparkWeatherAt(500, 25);
  assert.equal(stormW.rain, 1.0, 'Rain should be 1.0 along 2 paths');
  assert.equal(stormW.stormDark, 1.0, 'Storm darkness should be 1.0');
  assert.equal(stormW.label, 'STORM');
  assert.equal(stormW.a.top, '#10141a', 'Dark thunder sky ceiling must be deep charcoal (NOT navy blue!)');
  assert.equal(stormW.a.horizon, '#1b2028', 'Dark storm horizon must be turbulent slate (NOT navy blue!)');

  // 4. Clearing after 2 paths exit (1220..1320m)
  const clearingW = itparkWeatherAt(1270, 60);
  assert.ok(clearingW.rain > 0 && clearingW.rain < 1, 'Rain clears after exiting 2 paths');

  // 5. Cleared back to sunny weather after 1320m
  const clearedW = itparkWeatherAt(1350, 70);
  assert.equal(clearedW.rain, 0, 'Rain clears back to 0');
  assert.equal(clearedW.stormDark, 0, 'Storm dark clears back to 0');
});

test('3D IT Park Scene: Tornado and sea whirlpool removed; Road circles removed; Lightning appears during storm rain in dark clouds', () => {
  const scene = new Scene();
  const updateScene = createRoadEventsScene(scene);

  const skyCyclone = scene.getObjectByName('sky-cyclone');
  const seaWhirlpool = scene.getObjectByName('sea-whirlpool');
  const lightningBolts = scene.getObjectByName('sky-lightning');

  assert.equal(skyCyclone, undefined, 'Sky tornado must be completely removed from scene');
  assert.equal(seaWhirlpool, undefined, 'Sea whirlpool vortex must be completely removed from scene');
  assert.ok(lightningBolts, 'lightningBolts (sky-lightning) should exist in scene');

  // Case A: Start of run (distance = 50m) - Good weather
  const stateStart = {
    mode: 'running',
    map: 'itpark',
    distance: 50,
    time: 2.0,
    activeBranch: null
  };
  const weatherStart = itparkWeatherAt(50, 2.0);
  updateScene(stateStart, weatherStart);

  assert.equal(lightningBolts.visible, false, 'Lightning must NOT be visible at start of run in good weather');

  // Case B: Along 2 paths (distance = 450m) - Peak storm with lightning
  const stateStorm = {
    mode: 'running',
    map: 'itpark',
    distance: 450,
    time: 5.6, // flashCycle = (5.6 + 1.2) % 6.8 = 0.0 -> flash active!
    activeBranch: 'skybridge'
  };
  const weatherStorm = itparkWeatherAt(450, 5.6);
  updateScene(stateStorm, weatherStorm);

  assert.equal(lightningBolts.visible, true, 'Lightning MUST be visible during storm flash');

  // Case C: Inside Underpass cave (activeBranch = underpass)
  const stateTunnel = {
    mode: 'running',
    map: 'itpark',
    distance: 450,
    time: 5.6,
    activeBranch: 'underpass'
  };
  updateScene(stateTunnel, weatherStorm);

  assert.equal(lightningBolts.visible, false, 'Lightning must be hidden inside underpass tunnel');
});

test('3D Sky Scene: IT Park gets real 3D volumetric rain shower like college map', () => {
  const scene = new Scene();
  scene.background = new Color();
  const updateSky = createSky(scene, new DirectionalLight(), new HemisphereLight());

  // 1. At start of IT Park run (distance = 50m) -> no shower
  const stateStart = {
    mode: 'running',
    map: 'itpark',
    distance: 50,
    time: 1.0,
    x: 0
  };
  updateSky(stateStart);
  const showerStart = scene.getObjectByName('college-shower');
  assert.ok(!showerStart || !showerStart.visible, 'Shower must not be visible at start in good weather');

  // 2. Along 2 paths storm in IT Park (distance = 300m) -> real 3D rain shower is active!
  const stateStorm = {
    mode: 'running',
    map: 'itpark',
    distance: 300,
    time: 10.0,
    x: 0,
    activeBranch: 'skybridge'
  };
  updateSky(stateStorm);
  const showerStorm = scene.getObjectByName('college-shower');
  assert.ok(showerStorm && showerStorm.visible, 'Real 3D rain shower MUST be active during IT Park storm rain');

  // 3. Inside underpass cave -> shower must be hidden
  const stateTunnel = {
    mode: 'running',
    map: 'itpark',
    distance: 300,
    time: 10.0,
    x: 0,
    activeBranch: 'underpass'
  };
  updateSky(stateTunnel);
  assert.equal(showerStorm.visible, false, 'Real 3D rain shower must be hidden inside underpass cave');
});

test('Audio: IT Park plays rain_sound.mp3 and thunder_sound.mp3; College plays rain_sound.mp3 ONLY (NO thunder)', () => {
  const playedAudios = [];

  class MockAudio {
    constructor(src) {
      this.src = src;
      this.loop = false;
      this.volume = 1;
      this.paused = true;
    }
    cloneNode() {
      return new MockAudio(this.src);
    }
    play() {
      this.paused = false;
      playedAudios.push(this.src);
      return Promise.resolve();
    }
    pause() {
      this.paused = true;
    }
  }

  globalThis.Audio = MockAudio;

  const sound = createSound();
  sound.unlock();

  // Test 1: Start of IT Park run (distance = 50m) -> No rain sound, no thunder
  playedAudios.length = 0;
  const sStart = {
    mode: 'running',
    map: 'itpark',
    distance: 50,
    time: 1.0,
    items: []
  };
  sound.update(sStart);
  assert.ok(!playedAudios.some(src => src.includes('rain_sound')), 'Rain sound must NOT play at start of IT Park');
  assert.ok(!playedAudios.some(src => src.includes('thunder_sound')), 'Thunder sound must NOT play at start of IT Park');

  // Test 2: Near 2 paths (distance = 180m) -> Rain sound starts, thunder fires
  playedAudios.length = 0;
  const sWarn = {
    mode: 'running',
    map: 'itpark',
    distance: 180,
    time: 5.6, // flashCycle = (5.6 + 1.2) % 6.8 = 0.0 -> triggers thunder!
    items: []
  };
  sound.update(sWarn);
  assert.ok(playedAudios.some(src => src.includes('rain_sound')), 'Rain sound MUST play during IT Park storm rain');
  assert.ok(playedAudios.some(src => src.includes('thunder_sound')), 'Thunder sound MUST play during IT Park storm rain');

  // Test 3: Inside Underpass tunnel -> Rain sound and thunder must stop
  playedAudios.length = 0;
  const sTunnel = {
    mode: 'running',
    map: 'itpark',
    distance: 350,
    time: 12.4, // flashCycle = 0.0
    activeBranch: 'underpass',
    items: []
  };
  sound.update(sTunnel);
  assert.ok(!playedAudios.some(src => src.includes('rain_sound')), 'Rain sound must NOT play inside underpass');
  assert.ok(!playedAudios.some(src => src.includes('thunder_sound')), 'Thunder sound must NOT play inside underpass');

  // Test 4: College Map with rain -> Rain sound plays, but STRICTLY NO thunder sound
  playedAudios.length = 0;
  const sCollegeRain = {
    mode: 'running',
    map: 'college',
    distance: 300,
    time: 48.0, // peak college shower
    items: []
  };
  sound.update(sCollegeRain, 'college-girl');
  assert.ok(playedAudios.some(src => src.includes('rain_sound')), 'Rain sound MUST play during College shower');
  assert.ok(!playedAudios.some(src => src.includes('thunder_sound')), 'STRICT: College MUST NOT play thunder sound!');
});
