import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createTutorialGuide, TUTORIAL_STORAGE_KEY, POWER_TUTORIAL_STORAGE_KEY } from '../dist/tutorial-guide.js';

function makeClassList() {
  const set = new Set();
  return {
    add: (...c) => c.forEach(x => set.add(x)),
    remove: (...c) => c.forEach(x => set.delete(x)),
    contains: c => set.has(c),
    toggle: (c, f) => {
      if (f === undefined) { if (set.has(c)) { set.delete(c); return false; } set.add(c); return true; }
      if (f) set.add(c); else set.delete(c);
      return !!f;
    },
  };
}
function makeEl(id) {
  return {
    id,
    hidden: true,
    className: '',
    textContent: '',
    innerHTML: '',
    classList: makeClassList(),
    listeners: new Map(),
    addEventListener(type, fn) {
      if (!this.listeners.has(type)) this.listeners.set(type, []);
      this.listeners.get(type).push(fn);
    },
  };
}

test('Live obstacle-freeze tutorial pauses before obstacles, teaches dodge/jump/slide/camera, and teaches power only when equipped', () => {
  const store = new Map();
  const els = Object.fromEntries([
    'howto-modal', 'btn-open-howto', 'btn-settings-howto', 'btn-close-howto', 'btn-howto-gotit', 'btn-replay-tutorial',
    'run-tutorial-banner', 'tut-step-badge', 'tut-icon', 'tut-title', 'tut-desc', 'btn-tut-skip', 'power-trigger', 'btn-camera',
  ].map(id => [id, makeEl(id)]));

  const origDoc = globalThis.document;
  const origWin = globalThis.window;
  const origLS = globalThis.localStorage;
  globalThis.document = { getElementById: id => els[id] || null };
  globalThis.window = { addEventListener: () => {} };
  globalThis.localStorage = {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k),
  };

  try {
    const state = {
      mode: 'running', map: 'school', time: 1, distance: 10, lane: 0,
      items: [], slots: [],
    };
    const toasts = [];
    const guide = createTutorialGuide({ getState: () => state, onToast: m => toasts.push(m) });

    // 1) Notice Board opens & closes cleanly
    els['btn-open-howto'].onclick();
    assert.equal(guide.isNoticeOpen(), true);
    els['btn-howto-gotit'].onclick();
    assert.equal(guide.isNoticeOpen(), false);

    // 2) First run without powers: no cue until an obstacle approaches
    guide.startRun(state);
    assert.equal(guide.isActive(), true);
    assert.equal(guide.isFrozen(), false);

    // Block obstacle approaches in lane 0 -> freezes and prompts Left/Right dodge
    state.items = [{ type: 'block', lane: 0, z: 22, done: false }];
    guide.update(state);
    assert.equal(guide.isFrozen(), true);
    assert.equal(guide.currentStepId(), 'move');
    assert.equal(els['run-tutorial-banner'].hidden, false);

    // Performing the dodge unfreezes immediately
    assert.equal(guide.onAction('left'), true);
    assert.equal(guide.isFrozen(), false);

    // Jump hurdle approaches -> freezes and prompts UP
    state.distance = 40;
    state.time = 3;
    state.items = [{ type: 'jump', lane: 0, z: 52, done: false }];
    guide.update(state);
    assert.equal(guide.isFrozen(), true);
    assert.equal(guide.currentStepId(), 'jump');
    assert.equal(guide.onAction('jump'), true);
    assert.equal(guide.isFrozen(), false);

    // Clear corridor after 2 moves -> freezes and highlights CAM button
    state.distance = 80;
    state.time = 6;
    state.items = [];
    guide.update(state);
    assert.equal(guide.isFrozen(), true);
    assert.equal(guide.currentStepId(), 'camera');
    assert.equal(els['btn-camera'].classList.contains('tutorial-highlight'), true);

    // Tapping CAM unfreezes and completes core tutorial (no powers equipped!)
    guide.onCameraInteract();
    assert.equal(guide.isFrozen(), false);
    assert.equal(guide.isCompleted(), true);
    assert.equal(store.get(TUTORIAL_STORAGE_KEY), '1');
    assert.equal(store.has(POWER_TUTORIAL_STORAGE_KEY), false);

    // 3) Later run AFTER unlocking powers -> teaches Power button once!
    state.slots = [{ id: 'shoes' }];
    state.distance = 35;
    state.time = 2;
    state.items = [];
    guide.startRun(state);
    assert.equal(guide.isActive(), true);
    assert.equal(guide.isFrozen(), true);
    assert.equal(guide.currentStepId(), 'power');
    assert.equal(els['power-trigger'].classList.contains('tutorial-highlight'), true);

    guide.onPowerInteract();
    assert.equal(guide.isFrozen(), false);
    assert.equal(store.get(POWER_TUTORIAL_STORAGE_KEY), '1');

    // 4) Replay Tutorial resets both flags
    els['btn-replay-tutorial'].onclick();
    assert.equal(store.has(TUTORIAL_STORAGE_KEY), false);
    assert.equal(store.has(POWER_TUTORIAL_STORAGE_KEY), false);
    assert.equal(toasts.length, 1);
  } finally {
    globalThis.document = origDoc;
    globalThis.window = origWin;
    globalThis.localStorage = origLS;
  }

  const html = fs.readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
  assert.ok(html.includes('id="howto-modal"'));
  assert.ok(html.includes('id="run-tutorial-banner"'));
  assert.equal(html.includes('id="player-progress"'), false, 'Home card shows only Map, Character, and Coins');
});
