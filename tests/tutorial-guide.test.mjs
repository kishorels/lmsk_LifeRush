import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createTutorialGuide, TUTORIAL_STORAGE_KEY } from '../dist/tutorial-guide.js';

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

test('How to Play notice board toggles cleanly and first-run interactive tutorial walks through gestures once', () => {
  const store = new Map();
  const els = Object.fromEntries([
    'howto-modal', 'btn-open-howto', 'btn-settings-howto', 'btn-close-howto', 'btn-howto-gotit', 'btn-replay-tutorial',
    'run-tutorial-banner', 'tut-step-badge', 'tut-icon', 'tut-title', 'tut-desc', 'btn-tut-skip', 'power-trigger',
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
    const state = { mode: 'running', map: 'itpark', time: 0, slots: [{ id: 'nitro' }, { id: 'doubleCoins' }] };
    const toasts = [];
    const guide = createTutorialGuide({ getState: () => state, onToast: m => toasts.push(m) });

    // 1) Notice Board opens & closes from Home or Settings buttons
    assert.equal(guide.isNoticeOpen(), false);
    els['btn-open-howto'].onclick();
    assert.equal(guide.isNoticeOpen(), true);
    els['btn-howto-gotit'].onclick();
    assert.equal(guide.isNoticeOpen(), false);

    // 2) First run walks through move -> jump -> slide -> power -> complete
    guide.startRun(state);
    assert.equal(guide.isActive(), true);
    assert.equal(guide.currentStepId(), 'move');
    assert.equal(els['run-tutorial-banner'].hidden, false);

    guide.onAction('left');
    assert.equal(guide.currentStepId(), 'jump');

    guide.onAction('jump');
    assert.equal(guide.currentStepId(), 'slide');

    guide.onAction('slide');
    assert.equal(guide.currentStepId(), 'power');
    assert.equal(els['power-trigger'].classList.contains('tutorial-highlight'), true);

    guide.onPowerInteract();
    assert.equal(guide.isActive(), false);
    assert.equal(guide.isCompleted(), true);
    assert.equal(store.get(TUTORIAL_STORAGE_KEY), '1');
    assert.equal(els['power-trigger'].classList.contains('tutorial-highlight'), false);
    assert.ok(els['tut-title'].textContent.includes('ALL SET'));

    // Celebration banner clears after 1.8s
    state.time = 2.0;
    guide.update(state);
    assert.equal(els['run-tutorial-banner'].hidden, true);

    // 3) Second run skips tutorial automatically
    guide.startRun(state);
    assert.equal(guide.isActive(), false);
    assert.equal(els['run-tutorial-banner'].hidden, true);

    // 4) Replay Tutorial button re-arms it for the next run
    els['btn-replay-tutorial'].onclick();
    assert.equal(guide.isCompleted(), false);
    assert.equal(store.has(TUTORIAL_STORAGE_KEY), false);
    assert.equal(toasts.length, 1);

    // 5) Without powers unlocked (e.g. Level 1), tutorial skips power step cleanly
    state.slots = [];
    guide.startRun(state);
    assert.equal(guide.currentStepId(), 'move');
    guide.onAction('right');
    guide.onAction('jump');
    guide.onAction('slide');
    assert.equal(guide.isCompleted(), true);
  } finally {
    globalThis.document = origDoc;
    globalThis.window = origWin;
    globalThis.localStorage = origLS;
  }

  // Verify Notice Board markup exists in index.html
  const html = fs.readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
  assert.ok(html.includes('id="howto-modal"'), 'index.html includes How to Play Notice Board modal');
  assert.ok(html.includes('id="btn-open-howto"'), 'index.html includes How to Play menu button');
  assert.ok(html.includes('id="run-tutorial-banner"'), 'index.html includes interactive first-run tutorial banner');
});
