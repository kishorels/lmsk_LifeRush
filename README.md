# LMSK RUNVERSE — prototype 0.2

A Three.js 3D endless runner with a Canvas 2D fallback when WebGL is unavailable. This is a browser gameplay prototype, not an Android APK or the finished game.

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
Native Android packaging/device testing; production character assets; separate endless modes and progression; branching narrative; the final baby-to-old-age life run. The career tendency is a small prototype mechanic, not the finished branching career system.

## Graphics validation limits
The test browser has WebGL disabled. The fallback can be visually checked here; real-device 3D appearance and performance still require testing. Scene-graph smoke checks use a stub GPU renderer and do not prove WebGL rendering.

## Reference-inspired camera update
The third-person camera is now closer and lower. The game occupies the portrait viewport; desktop uses a centered portrait frame. The character has alternating hip/knee/arm motion, a tucked jump, lower slide pose and lane-change lean. Buildings are taller with more windows. This is original procedural artwork, not the reference game's assets, and train-roof traversal is not implemented.
