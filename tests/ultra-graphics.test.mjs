import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Group, PerspectiveCamera } from '../dist/vendor/three.module.js';
import { createUltraEffects } from '../dist/ultra-effects.js';
import { fresh, step } from '../dist/engine.js';

test('ULTRA graphics pill sits after HIGH in Settings and leaves AUTO/LOW/MED/HIGH untouched', async () => {
  const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  const gameJs = await readFile(new URL('../dist/game.js', import.meta.url), 'utf8');
  const r3d = await readFile(new URL('../dist/renderer3d.js', import.meta.url), 'utf8');

  const highIdx = html.indexOf('data-gfx="high"');
  const ultraIdx = html.indexOf('data-gfx="ultra"');
  assert.ok(highIdx > 0 && ultraIdx > highIdx, 'ULTRA pill must appear right after HIGH');
  assert.ok(gameJs.includes("'ultra'") && gameJs.includes('Ultra · Realistic body physics'));
  assert.ok(r3d.includes("const isUltra=(tier==='ultra');") && r3d.includes('scene.userData.ultraQuality=isUltra;'));
  assert.ok(r3d.includes('ultraEffects.setEnabled(isUltra);'));
});

test('createUltraEffects stays completely disabled until ULTRA is turned on, emits landing/smash/shield VFX, and clears cleanly when disabled', () => {
  const scene = new Group();
  const cam = new PerspectiveCamera(60, 0.5, 0.1, 300);
  const fx = createUltraEffects(scene);

  assert.equal(fx.isEnabled(), false);
  assert.equal(fx.root.visible, false);

  const s = fresh(7);
  s.mode = 'running';
  s.map = 'college';
  s.speed = 65;
  s.time = 1.0;

  // Calling update while disabled (AUTO/LOW/MED/HIGH) keeps every pooled VFX hidden
  fx.update(s, 0.016, cam, 0, 0, 1, 0.35, { rain: 0.5, wetness: 0.7 });
  assert.equal(fx.root.children.some(c => c.visible), false, 'Nothing visible when ULTRA is off');

  // Enable ULTRA: contact shadow + landing water splash + Nitro smash debris + overload + shield shatter activate cleanly
  fx.setEnabled(true);
  assert.equal(fx.isEnabled(), true);
  assert.equal(fx.root.visible, true);

  s.nitro = 8;
  s.nitroHits = 4;
  const smashedObs = { z: s.distance + 4, lane: 0, type: 'block', done: true, smashed: true };
  s.items = [smashedObs];
  s.shieldAbsorbed = true;
  fx.update(s, 0.016, cam, 0, 0, 2, 0.4, { rain: 0.6, wetness: 0.8 });

  const visibleCount = fx.root.children.filter(c => c.visible).length;
  assert.ok(visibleCount >= 15, `Expected landing/smash/shield pooled meshes active in ULTRA, got ${visibleCount}`);

  // 5th-hit Nitro overload explosion
  s.nitro = 0;
  s.nitroHits = 5;
  s.nitroOverloaded = true;
  fx.update(s, 0.016, cam, 0, 0, 2, 0, { rain: 0.6, wetness: 0.8 });

  // Advance frames and confirm finite positions
  for (let i = 0; i < 10; i++) {
    s.time += 0.016;
    fx.update(s, 0.016, cam, 0, 0, 2, 0, { rain: 0.6, wetness: 0.8 });
  }
  for (const child of fx.root.children) {
    assert.ok(Number.isFinite(child.position.x) && Number.isFinite(child.position.y) && Number.isFinite(child.position.z));
  }

  // Switching back from ULTRA to HIGH immediately hides and clears all ULTRA pooled VFX
  fx.setEnabled(false);
  assert.equal(fx.root.visible, false);
  assert.equal(fx.root.children.some(c => c.visible), false, 'All ULTRA meshes must hide when switching back to HIGH');
});

test('Step 1 & Step 2 ULTRA atmospheres activate per map (School god-rays, College lamps & clocktower, coin bloom halos) and stay off on HIGH', async () => {
  const scene = new Group();
  const cam = new PerspectiveCamera(60, 0.5, 0.1, 300);
  const fx = createUltraEffects(scene);
  fx.setEnabled(true);

  const school = fresh(11);
  school.mode = 'running';
  school.map = 'school';
  school.distance = 90;
  school.time = 2.0;
  school.items = [
    { type: 'coin', lane: 0, z: 105, done: false, cleared: false },
    { type: 'coin', lane: 1, z: 112, done: false, cleared: false }
  ];
  fx.update(school, 0.016, cam, 0, 0, 0, 0, { rain: 0, wetness: 0 });
  const visibleGroupsSchool = fx.root.children.filter(c => c.isGroup && c.visible);
  const visibleSpritesSchool = fx.root.children.filter(c => c.isSprite && c.visible);
  assert.equal(visibleGroupsSchool.length, 1, 'Only School sun-shaft atmosphere group should be visible on School');
  assert.equal(visibleSpritesSchool.length, 2, 'Two visible coins should get two golden bloom halos');

  const college = fresh(12);
  college.mode = 'running';
  college.map = 'college';
  college.distance = 80;
  college.time = 2.5;
  college.items = [{ type: 'coin', lane: -1, z: 95, done: false, cleared: false }];
  fx.update(college, 0.016, cam, 0, 0, 0, 0, { rain: 0.7, wetness: 0.9 });
  const visibleGroupsCollege = fx.root.children.filter(c => c.isGroup && c.visible);
  assert.equal(visibleGroupsCollege.length, 1, 'Only College lamp/clocktower atmosphere group should be visible on College');
  const activeLampParts = visibleGroupsCollege[0].children.filter(c => c.visible);
  assert.ok(activeLampParts.length >= 10, `Expected College lamp halos, cones, and clocktower visible, got ${activeLampParts.length}`);

  // Confirm shader guards keep HIGH untouched (ultraStrength / uUltraSchool gated)
  const rain3d = await readFile(new URL('../dist/college-rain3d.js', import.meta.url), 'utf8');
  const streetMat = await readFile(new URL('../dist/street-materials.js', import.meta.url), 'utf8');
  const collegeScene = await readFile(new URL('../dist/college-scene.js', import.meta.url), 'utf8');
  assert.ok(rain3d.includes('if (ultraStrength > 0.01)') && rain3d.includes('reflectedLight.directSpecular = min('));
  assert.ok(streetMat.includes('attachUltraSchoolAsphalt') && streetMat.includes('if (uUltraSchool > 0.01)'));
  assert.ok(collegeScene.includes('gWin.emissiveIntensity = isUltraQ ?'));

  fx.setEnabled(false);
  assert.equal(fx.root.children.some(c => c.visible), false, 'All Step 1 & Step 2 atmospheres must vanish on HIGH');
});

test('Camera has zero running bob/rumble and uses exact 1.0s hit-only shake across all maps; ULTRA School builds live-wind 3D trees, heritage buildings, and sculpted curved bus', async () => {
  const r3d = await readFile(new URL('../dist/renderer3d.js', import.meta.url), 'utf8');
  assert.ok(!r3d.includes('ultraBobX') && !r3d.includes('ultraBobY'), 'Continuous camera running bob/rumble must be removed');
  assert.ok(r3d.includes('hitShakeTimer=1.0;') && r3d.includes('hitShakeTimer=Math.max(0,hitShakeTimer-shakeDt);'), 'Camera must shake for exactly 1.0s on hit only');

  const { buildUltraSchoolTemplate, buildUltraSchoolEntrance, ultraSchoolWindClock } = await import('../dist/ultra-school.js');
  const { buildUltraSchoolBus } = await import('../dist/bus-model.js');
  const ultraSrc = await readFile(new URL('../dist/ultra-school.js', import.meta.url), 'utf8');
  assert.ok(ultraSrc.includes('attachLiveWind') && ultraSrc.includes('uWindTime'), 'ULTRA School trees must animate continuously via GPU wind shader');

  // Verify all 6 ULTRA School campus sections & ornate entrance arch build cleanly with finite vertices & bounded draw calls
  for (let kind = 0; kind < 6; kind++) {
    const tpl = buildUltraSchoolTemplate(kind);
    let meshes = 0;
    tpl.traverse(o => {
      if (o.isMesh) {
        meshes++;
        const pos = o.geometry.attributes.position.array;
        assert.ok(pos.length > 0 && Number.isFinite(pos[0]), `Section ${kind} geometry must be finite`);
      }
    });
    assert.ok(meshes >= 6 && meshes <= 38, `Expected batched ULTRA School section ${kind} mesh count in 6..38, got ${meshes}`);
  }
  const gate = buildUltraSchoolEntrance(-12);
  assert.ok(gate.children.length >= 6, 'Ornate ULTRA School entrance arch must build cleanly');
  ultraSchoolWindClock.value = 3.5;
  assert.equal(ultraSchoolWindClock.value, 3.5);

  // Verify sculpted curved ULTRA School Bus builds cleanly for parked (1.72m), oncoming (2.8m), and long (22m) sizes without protruding past roof!
  const { Box3 } = await import('../dist/vendor/three.module.js');
  const parkedBus = buildUltraSchoolBus(10, 1.72, false);
  const shortBus = buildUltraSchoolBus(10, 2.8, true);
  const longBus = buildUltraSchoolBus(22, 2.8, false);
  const parkedBox = new Box3().setFromObject(parkedBus);
  const shortBox = new Box3().setFromObject(shortBus);
  assert.ok(parkedBox.max.y <= 1.85, `Parked 1.72m ULTRA bus must stay within roof profile, got max.y=${parkedBox.max.y.toFixed(2)}`);
  assert.ok(shortBox.max.y <= 2.95, `Tall 2.8m ULTRA bus must stay within roof profile, got max.y=${shortBox.max.y.toFixed(2)}`);
  assert.equal(shortBus.userData.wheels.length, 4, 'Standard 10m ULTRA bus must have 4 spinning wheel assemblies');
  assert.equal(longBus.userData.wheels.length, 6, 'Long 22m ULTRA bus must have 6 spinning wheel assemblies (tandem rear axle)');
});

test('ULTRA College starts dry/sunny (no forced rain at start), builds heritage halls/banners/3D trees/umbrella students, and activates rain umbrellas & headlights when raining', async () => {
  const { buildUltraCollegeTemplate, updateUltraCollegeWeather } = await import('../dist/ultra-college.js');
  const skySrc = await readFile(new URL('../dist/sky-scene.js', import.meta.url), 'utf8');
  assert.ok(!skySrc.includes('(weather.rain>.02 || isUltraQ)'), 'ULTRA College must NOT force rain immediately at run start');
  assert.ok(!skySrc.includes('(weather.rain>.35 || isUltraQ)'), 'ULTRA College must NOT force storm clouds at sunny run start');

  for (let kind = 0; kind < 6; kind++) {
    const tpl = buildUltraCollegeTemplate(kind);
    const umb = tpl.getObjectByName('college-rain-umbrellas');
    assert.ok(umb, `College ULTRA section ${kind} must include rain-triggered student umbrellas`);
    assert.equal(umb.visible, false, 'Student umbrellas start hidden during dry sunny opening');
  }
  assert.equal(updateUltraCollegeWeather({ rain: 0, wet: 0 }, 1.0), false, 'Umbrellas stay closed when dry');
  assert.equal(updateUltraCollegeWeather({ rain: 0.75, wet: 0.85 }, 36.0), true, 'Umbrellas open automatically when rain starts');
});

test('Step 3 IT Park ULTRA upgrades activate bollards/fork arrows on boulevard, amber sconces & red conduits in Metro Tunnel, and deck bollards/lightning on Sky Bridge (off on HIGH)', () => {
  const scene = new Group();
  const cam = new PerspectiveCamera(60, 0.5, 0.1, 300);
  const fx = createUltraEffects(scene);
  fx.setEnabled(true);

  const blvd = fresh(21);
  blvd.mode = 'running';
  blvd.map = 'itpark';
  blvd.enableForks = true;
  blvd.distance = 190; // approaching first IT Park fork at 220m
  blvd.time = 5.0;
  fx.update(blvd, 0.016, cam, 0, 0, 0, 0, { rain: 0, wet: 0 });
  const itGroup = fx.root.children.filter(c => c.isGroup && c.visible)[0];
  assert.ok(itGroup, 'IT Park ULTRA atmosphere group must activate on IT Park boulevard');
  assert.ok(itGroup.children.filter(c => c.visible).length >= 10, 'Curb bollards & fork directional arrows must activate approaching fork');

  const tunnel = fresh(22);
  tunnel.mode = 'running';
  tunnel.map = 'itpark';
  tunnel.activeBranch = 'underpass';
  tunnel.branchStart = 220;
  tunnel.branchEnd = 1220;
  tunnel.distance = 320;
  tunnel.time = 10.0;
  fx.update(tunnel, 0.016, cam, 0, 0, 0, 0, { rain: 0, wet: 0 });
  assert.ok(itGroup.children.filter(c => c.visible).length >= 20, 'Metro Tunnel amber sconce halos, cones & triple red conduit pipes must activate');

  const bridge = fresh(23);
  bridge.mode = 'running';
  bridge.map = 'itpark';
  bridge.activeBranch = 'skybridge';
  bridge.branchStart = 220;
  bridge.branchEnd = 1220;
  bridge.distance = 350;
  bridge.time = 5.65; // inside lightning flash window
  fx.update(bridge, 0.016, cam, 0, 0, 0, 0, { rain: 0.9, wet: 0.9 });
  assert.ok(itGroup.children.filter(c => c.visible).length >= 12, 'Sky Bridge glowing deck bollard halos & forked lightning bolt must activate');

  fx.setEnabled(false);
  assert.equal(fx.root.children.some(c => c.visible), false, 'All Step 3 IT Park ULTRA effects must hide cleanly on HIGH');
});

test('Step 4 Final Run ULTRA upgrades activate sunset horizon glow, cottage lanterns, fireflies, moon halo & night vehicle lights (off on HIGH)', () => {
  const scene = new Group();
  const cam = new PerspectiveCamera(60, 0.5, 0.1, 300);
  const fx = createUltraEffects(scene);
  fx.setEnabled(true);

  const dayFinal = fresh(31);
  dayFinal.mode = 'running';
  dayFinal.map = 'finalrun';
  dayFinal.distance = 140;
  dayFinal.time = 6.0;
  fx.update(dayFinal, 0.016, cam, 0, 0, 0, 0, { night: 0, rain: 0 });
  const finalGrp = fx.root.children.filter(c => c.isGroup && c.visible)[0];
  assert.ok(finalGrp, 'Final Run ULTRA atmosphere group must activate on finalrun');
  assert.ok(finalGrp.children.filter(c => c.visible).length >= 5, 'Sunset glow, cottage lanterns & drifting golden motes must activate in Final Run Day');

  const nightFinal = fresh(32);
  nightFinal.mode = 'running';
  nightFinal.map = 'finalrun';
  nightFinal.distance = 220;
  nightFinal.time = 88.0;
  nightFinal.items = [{ type: 'bus', z: 250, lane: 0, roofRide: false, cleared: false }];
  fx.update(nightFinal, 0.016, cam, 0, 0, 0, 0, { night: 0.92, rain: 0 });
  assert.ok(finalGrp.children.filter(c => c.visible).length >= 6, 'Moon halo, warm village lanterns, fireflies & night headlight beams must activate in Final Run Night');

  fx.setEnabled(false);
  assert.equal(fx.root.children.some(c => c.visible), false, 'All Step 4 Final Run ULTRA effects must hide cleanly on HIGH');
});

test('Camera angle toggle provides Classic, Low Action, Close-Up & First-Person POV in HUD and Settings with smooth transition', async () => {
  const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  const game = await readFile(new URL('../dist/game.js', import.meta.url), 'utf8');
  const r3d = await readFile(new URL('../dist/renderer3d.js', import.meta.url), 'utf8');
  assert.ok(html.includes('id="btn-camera"'), 'In-game HUD must include live Camera Angle toggle button');
  assert.ok(html.includes('data-cam="classic"') && html.includes('data-cam="action"') && html.includes('data-cam="closeup"') && html.includes('data-cam="fpv"'), 'Settings must include CLASSIC, ACTION, CLOSE, and FPV camera angle pills');
  assert.ok(game.includes('runverse-camera') && game.includes('cycleCameraAngle'), 'game.js must persist camera angle and cycle all 4 modes');
  assert.ok(r3d.includes('renderFn.setCameraAngle') && r3d.includes('closeCamBlend') && r3d.includes('fpvCamBlend'), 'renderer3d.js must smoothly blend all 4 camera angles');
});
