# LMSK RUNVERSE — prototype 0.1

A dependency-free Canvas 2D perspective endless runner. This is a browser gameplay prototype, not an Android APK or the finished game.

## Play locally
Install Python 3, then run `python -m http.server 3000 --directory dist` from this folder and open http://localhost:3000. Node users can also run `npm start` when Python 3 is on PATH.

## Controls
Arrow keys/WASD, Space to jump; swipe on the game view or use touch buttons. P/Escape pauses. Male/female selection appears on initial launch. Sound is optional. Best distance and character selection persist locally when storage is available.

## Implemented
Three lanes, jump/slide/crate obstacles, procedural safe rows, increasing capped speed, three skill pickups, preliminary career tendency including ties, pause/resume countdown, crash/restart, tab-hide pause, responsive UI, and procedural scenery. No external assets or dependencies.

## Checks
`npm test` runs the simulation tests. `node --check dist/game.js` checks renderer syntax.

## Files
- dist/engine.js: deterministic simulation functions and procedural obstacle rows.
- dist/game.js: Canvas renderer, controls, audio and UI integration.
- dist/style.css and dist/index.html: responsive game shell.
- tests/engine.test.mjs: gameplay verification.

## Still to build
Native Android packaging/device testing; true 3D models; separate endless modes and progression; branching narrative; the final baby-to-old-age life run. The career tendency is a small prototype mechanic, not the finished branching career system.
