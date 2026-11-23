import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fresh,availablePowers,equipPowers,usePower,step} from '../dist/engine.js';
import {createPowerControls} from '../dist/power-controls.js';
test('owned power slots are capped, independent, recharge by distance, and scale +2s per upgrade',()=>{
  const s=fresh(14);
  s.mode='running';
  assert.deepEqual(availablePowers(1),[]);
  assert.deepEqual(availablePowers(25),['shoes','doubleCoins','nitro','ghost']);
  assert.ok(!availablePowers(25).includes('magnet')&&!availablePowers(25).includes('shield'),'magnet & shield are collectibles, not powers');
  s.level=25;
  s.powerUpgrades={nitro:2,doubleCoins:3};
  equipPowers(s,['nitro','magnet','nitro','shield','doubleCoins','slow']);
  assert.deepEqual(s.slots.map(slot=>slot.id),['nitro','doubleCoins']);
  s.distance=80;
  assert.ok(usePower(s,0));
  assert.equal(s.nitro,14,'Nitro at upgrade tier 2 lasts 10 + 2*2 = 14s');
  s.distance=250;
  assert.ok(usePower(s,1));
  assert.equal(s.doubleCoins,16,'2x Coins at upgrade tier 3 lasts 10 + 3*2 = 16s');
  s.time+=16;
  s.distance=1079.99;
  assert.equal(usePower(s,0),false);
  s.distance=1080;
  assert.ok(usePower(s,0));
  assert.equal(usePower(s,1),false);
  s.distance=1250;
  assert.ok(usePower(s,1));
  assert.equal(usePower(s,2),false);
});
test('every selected power lasts ten seconds base (and +2s per upgrade); new routes contain coins but no power pickups',()=>{
  for(const id of availablePowers(25)){
    const s=fresh(14);
    Object.assign(s,{level:25,mode:'running',next:40});
    equipPowers(s,[id]);
    assert.ok(usePower(s,0));
    step(s,.05);
    assert.ok(s.items.some(item=>item.type==='coin'));
    assert.ok(!s.items.some(item=>availablePowers(25).includes(item.type)));
    assert.equal(s.slots[0].until,10);
    const now=s.time;
    s.mode='paused';step(s,.1);
    assert.equal(s.time,now);
    assert.equal(usePower(s,0),false);
  }
});

function makeClassList() {
  const set = new Set();
  return {
    add: (...cls) => cls.forEach(c => set.add(c)),
    remove: (...cls) => cls.forEach(c => set.delete(c)),
    contains: c => set.has(c),
    toggle: (c, force) => {
      if (force === undefined) { if (set.has(c)) { set.delete(c); return false; } set.add(c); return true; }
      if (force) set.add(c); else set.delete(c);
      return !!force;
    },
  };
}
function makeMockEl(id = '') {
  const listeners = new Map();
  const attrs = new Map();
  return {
    id,
    hidden: false,
    tabIndex: 0,
    dataset: {},
    classList: makeClassList(),
    innerHTML: '',
    textContent: '',
    blurred: 0,
    captured: [],
    released: [],
    addEventListener(type, fn) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(fn);
    },
    dispatch(type, event) {
      for (const fn of (listeners.get(type) || [])) fn(event);
    },
    setAttribute(k, v) { attrs.set(k, String(v)); },
    removeAttribute(k) { attrs.delete(k); },
    getAttribute(k) { return attrs.get(k); },
    querySelector(sel) {
      if (sel === '.power-slot-status') return this._mockStatus || (this._mockStatus = { textContent: '' });
      return null;
    },
    querySelectorAll() { return []; },
    setPointerCapture(id) { this.captured.push(id); },
    releasePointerCapture(id) { this.released.push(id); },
    blur() { this.blurred++; },
  };
}
function makeEvent(extra = {}) {
  return {
    pointerId: 1,
    clientX: 300,
    clientY: 500,
    prevented: false,
    stopped: false,
    preventDefault() { this.prevented = true; },
    stopPropagation() { this.stopped = true; },
    ...extra,
  };
}

test('power wheel reveals slots only while holding POWER, activates strictly on directional swipe, and hides immediately on release', () => {
  const slot0 = makeMockEl('slot0');
  const slot1 = makeMockEl('slot1');
  const trigger = makeMockEl('power-trigger');
  const wheel = makeMockEl('run-powers');
  wheel.querySelectorAll = () => [slot0, slot1];
  const byId = {
    'power-picker': makeMockEl('power-picker'),
    'power-options': makeMockEl('power-options'),
    'confirm-powers': makeMockEl('confirm-powers'),
    'power-title': makeMockEl('power-title'),
    'power-hint': makeMockEl('power-hint'),
    'run-powers': wheel,
    'power-trigger': trigger,
  };
  const winListeners = new Map();
  const origDoc = globalThis.document;
  const origWin = globalThis.window;
  globalThis.document = {
    hidden: false,
    getElementById: id => byId[id] || null,
    addEventListener: () => {},
  };
  globalThis.window = {
    addEventListener(type, fn) {
      if (!winListeners.has(type)) winListeners.set(type, []);
      winListeners.get(type).push(fn);
    },
    removeEventListener(type, fn) {
      const list = winListeners.get(type);
      if (!list) return;
      const idx = list.indexOf(fn);
      if (idx >= 0) list.splice(idx, 1);
    },
  };
  try {
    const s = fresh(14);
    s.level = 25;
    s.mode = 'running';
    equipPowers(s, ['nitro', 'doubleCoins']);
    const activated = [];
    const controls = createPowerControls(() => s, idx => activated.push(idx));
    controls.update();

    assert.equal(wheel.hidden, false);
    assert.equal(wheel.classList.contains('open'), false);
    assert.ok(slot0.innerHTML.includes('Nitro Rush'), 'Slot 1 should render its power name');
    assert.ok(slot1.innerHTML.includes('2x Coins'), 'Slot 2 should render its power name');

    // 1) Quick tap (down + up with no swipe) opens only while pressed, hides on release, activates nothing
    const downTap = makeEvent({ pointerId: 1, clientX: 300, clientY: 500 });
    trigger.onpointerdown(downTap);
    assert.equal(downTap.stopped, true);
    assert.equal(wheel.classList.contains('open'), true);
    trigger.onpointerup(makeEvent({ pointerId: 1, clientX: 302, clientY: 496 }));
    trigger.onclick(makeEvent({ pointerId: 1 }));
    assert.equal(wheel.classList.contains('open'), false, 'Wheel must close immediately on release');
    assert.deepEqual(activated, [], 'Tap without swipe must never activate a power');
    assert.ok(trigger.blurred > 0, 'Trigger should blur on release so focus never sticks');

    // 2) Direct click on slot button must not activate anything
    slot0.dispatch('click', makeEvent());
    slot1.dispatch('click', makeEvent());
    assert.deepEqual(activated, [], 'Direct slot taps must not activate powers');

    // 3) Hold + swipe UP -> highlights Slot 0, closes on release, activates Slot 0
    trigger.onpointerdown(makeEvent({ pointerId: 2, clientX: 300, clientY: 500 }));
    assert.equal(wheel.classList.contains('open'), true);
    trigger.onpointermove(makeEvent({ pointerId: 2, clientX: 300, clientY: 455 }));
    assert.equal(slot0.classList.contains('aim'), true);
    assert.equal(slot1.classList.contains('aim'), false);
    trigger.onpointerup(makeEvent({ pointerId: 2, clientX: 300, clientY: 455 }));
    assert.equal(wheel.classList.contains('open'), false);
    assert.equal(slot0.classList.contains('aim'), false);
    assert.deepEqual(activated, [0]);

    // 4) Hold + swipe LEFT -> highlights Slot 1, closes on release, activates Slot 1
    trigger.onpointerdown(makeEvent({ pointerId: 3, clientX: 300, clientY: 500 }));
    trigger.onpointermove(makeEvent({ pointerId: 3, clientX: 250, clientY: 500 }));
    assert.equal(slot0.classList.contains('aim'), false);
    assert.equal(slot1.classList.contains('aim'), true);
    trigger.onpointerup(makeEvent({ pointerId: 3, clientX: 250, clientY: 500 }));
    assert.equal(wheel.classList.contains('open'), false);
    assert.equal(slot1.classList.contains('aim'), false);
    assert.deepEqual(activated, [0, 1]);

    // 5) Hold + pointercancel -> closes immediately with zero activation and detaches global pointermove listener
    trigger.onpointerdown(makeEvent({ pointerId: 4, clientX: 300, clientY: 500 }));
    assert.equal(wheel.classList.contains('open'), true);
    assert.equal((winListeners.get('pointermove') || []).length, 1);
    trigger.onpointercancel(makeEvent({ pointerId: 4 }));
    assert.equal(wheel.classList.contains('open'), false);
    assert.equal((winListeners.get('pointermove') || []).length, 0);
    assert.deepEqual(activated, [0, 1]);
  } finally {
    globalThis.document = origDoc;
    globalThis.window = origWin;
  }

  // CSS regression guard: no sticky :hover or :focus-within, and closed slots stay hidden even when recharging
  const css = fs.readFileSync(new URL('../dist/style.css', import.meta.url), 'utf8');
  assert.ok(!css.includes('#run-powers:hover'), 'CSS must not use sticky :hover on #run-powers');
  assert.ok(!css.includes('#run-powers:focus-within'), 'CSS must not use sticky :focus-within on #run-powers');
  assert.ok(css.includes('#run-powers:not(.open) .power-direction'), 'CSS must enforce hidden closed state');
});
