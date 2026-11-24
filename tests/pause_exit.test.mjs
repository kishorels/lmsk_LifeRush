import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('Game script updates pause screen button to EXIT GAME and report card button to CHARACTER', async () => {
  const gameSrc = await readFile(new URL('../dist/game.js', import.meta.url), 'utf-8');

  // Verify IC_EXIT is defined with exit door SVG
  assert.ok(gameSrc.includes('const IC_EXIT ='), 'IC_EXIT icon must be defined');

  // Verify show() changes btn-change-char to EXIT GAME when paused
  assert.ok(
    gameSrc.includes("if(s.mode==='paused'){\n      $('btn-change-char').innerHTML=IC_EXIT+' EXIT GAME'") ||
    gameSrc.includes("$('btn-change-char').innerHTML=IC_EXIT+' EXIT GAME'"),
    'Button must show EXIT GAME when paused'
  );

  // Verify show() restores btn-change-char to CHARACTER on game over / report card
  assert.ok(
    gameSrc.includes("$('btn-change-char').innerHTML=IC_CHAR+' CHARACTER'"),
    'Button must show CHARACTER on game over report card'
  );

  // Verify exit action routes to home on pause exit
  assert.ok(
    gameSrc.includes("showHub(wasPaused ? 'home' : 'characters')") ||
    gameSrc.includes("exitGameOverToHub(wasPaused ? 'home' : 'characters'"),
    'Exit game button must route to home hub when exiting a paused run'
  );
});
