# LMSK RUNVERSE — prototype 0.2

A Three.js 3D endless runner with a Canvas 2D fallback when WebGL is unavailable. A Capacitor Android project packages the browser game; device performance still needs testing.

## Play locally
Install Python 3, then run `python -m http.server 3000 --directory dist` from this folder and open http://localhost:3000. Node users can also run `npm start` when Python 3 is on PATH.

## Controls
Arrow keys/WASD, Space to jump; swipe on the game view or use touch buttons. P/Escape pauses. Male/female selection appears on initial launch. Sound is optional. Best distance and character selection persist locally when storage is available.

## Implemented
Three lanes, jump/slide/crate obstacles, procedural safe rows, increasing capped speed, three skill pickups, preliminary career tendency including ties, pause/resume countdown, crash/restart, tab-hide pause, responsive UI, and procedural scenery. Three.js 0.180.0 is vendored locally under its MIT license; no CDN requests during gameplay.

## Checks
`npm test` runs the simulation tests. `node --check dist/game.js` checks renderer syntax.

## Files
- dist/engine.js: deterministic simulation functions and procedural obstacle rows.
- dist/game.js: controls, audio and UI integration.
- dist/renderer3d.js: 3D scene, animated procedural character, lighting and particles.
- dist/renderer-lite.js: Canvas fallback for devices without WebGL.
- dist/style.css and dist/index.html: responsive game shell.
- tests/engine.test.mjs: gameplay verification.

## Still to build
Android device testing; production character assets; separate endless modes and progression; branching narrative; the final baby-to-old-age life run. The career tendency is a small prototype mechanic, not the finished branching career system.

## Graphics validation limits
The test browser has WebGL disabled. The fallback can be visually checked here; real-device 3D appearance and performance still require testing. Scene-graph smoke checks use a stub GPU renderer and do not prove WebGL rendering.

## Reference-inspired camera update
The third-person camera is now closer and lower. The game occupies the portrait viewport; desktop uses a centered portrait frame. The character has alternating hip/knee/arm motion, a tucked jump, lower slide pose and lane-change lean. Buildings are taller with more windows. This is original procedural artwork, not the reference game's assets, and train-roof traversal is not implemented.

## Male rig study 01
`character.html` shows the actual original rigged male draft and five animation clips. `dist/assets/runverse-male.glb` is downloadable. The Blender source and repeatable generation script are in `art/`. This draft does NOT match the approved concept's face, hair or fabric fidelity; it is deliberately not installed as the finished gameplay hero. The preview honestly distinguishes still-render fallback from live 3D on WebGL-capable devices. Character likeness and mesh quality remain unfinished.

## Run layouts

Normal starts create a new run seed. The entry ramp, section order and spacing, traffic lanes and counts, obstacle types, coin trails and magnet/shield order vary between runs. Physics and both renderers use the same segment plan, which stays fixed during pause/resume. `fresh(seed)` replays a layout for debugging; `fresh(0)` preserves the original route for regression fixtures.

## Reference school uniform

The schoolgirl GLB includes a fitted charcoal jacket, folded red bow, silver buttons, red cuffs and a pleated skirt with two red hem bands. The outfit shares the existing skeleton; secondary cloth morphs blend through all nine original animation clips. Rebuild it with `python art/dress_schoolgirl.py` (numpy, scipy and Pillow). The GLB stores its original source document/data so repeated builds do not accumulate geometry or remove original character assets.

## Offline Android assets

`dist` is the Capacitor `webDir`. Run `npx cap copy android` after changing web files to copy the intro video, models, textures, music and effects into `android/app/src/main/assets/public`. Startup uses this installed bundle; JavaScript update downloads and native automatic updates are disabled. The local asset server still reads and decodes these files when the game opens; offline packaging removes network downloads, not 3D parsing or video decode cost. Rebuild the APK after copying assets for changes to reach an installed phone.

The same builder also fits a dark-brown swept scalp to the actual head surface, removes the intersecting temple hair cards and raised loops, and creates a narrower skinned school braid with a red tie. Hair fibre colour/normal textures stay opaque to avoid transparency artefacts.
