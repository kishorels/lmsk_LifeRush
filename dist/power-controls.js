import {powerById} from './progression.js';

const nameOf = id => powerById[id]?.name || id;
const STORE_KEY = 'runverse-powers';

function loadSaved() {
  try {
    const value = JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
    return Array.isArray(value) ? value.filter(id => powerById[id]) : [];
  } catch { return []; }
}
function save(ids) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(ids.slice(0,2))); } catch {}
}

export function createPowerControls(state,activate) {
  const get = id => document.getElementById(id);
  const dialog = get('power-picker'), options = get('power-options'), confirm = get('confirm-powers');
  const title = get('power-title'), hint = get('power-hint');
  const wheel = get('run-powers'), trigger = get('power-trigger');
  const labels = [...wheel.querySelectorAll('.power-direction')];
  let pointer = null;

  // Current default pair (the first 2 picked are kept until changed in Settings).
  function current(ids) {
    if (ids.length <= 2) return ids.slice();
    return loadSaved().filter(id => ids.includes(id)).slice(0,2);
  }

  function openPicker(ids, done, mode) {
    const chosen = current(ids);
    if (chosen.length !== 2) chosen.length = 0;
    options.replaceChildren();
    if (title) title.textContent = mode === 'edit' ? 'Change your 2 powers' : 'Choose your 2 powers';
    if (hint) hint.textContent = mode === 'edit'
      ? 'Choose the pair to preselect for your next run.'
      : 'Choose the upper and left slots for this run.';
    confirm.textContent = mode === 'edit' ? 'Save powers' : 'Start run';
    function refresh() {
      for (const button of options.children) {
        const index = chosen.indexOf(button.dataset.id);
        button.setAttribute('aria-pressed',String(index >= 0));
        button.textContent = (index === 0 ? '↑ ' : index === 1 ? '← ' : '') + nameOf(button.dataset.id);
        button.disabled = chosen.length === 2 && index < 0;
      }
      confirm.disabled = chosen.length !== 2;
    }
    for (const id of ids) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.id = id;
      button.onclick = () => {
        const index = chosen.indexOf(id);
        if (index >= 0) chosen.splice(index,1);
        else if (chosen.length < 2) chosen.push(id);
        refresh();
      };
      options.append(button);
    }
    refresh();
    confirm.onclick = () => {
      if (chosen.length !== 2) return;
      save(chosen);
      dialog.close();
      done(chosen.slice());
    };
    get('cancel-powers').onclick = () => dialog.close();
    if (!dialog.open) dialog.showModal();
  }

  // Confirm the loadout each round once a third option is available.
  function choose(ids,begin) {
    if (ids.length <= 2) { begin(ids); return; }
    openPicker(ids, begin, 'start');
  }

  // Settings: change the default pair (exactly 2).
  function edit(ids,onSaved) {
    if (ids.length <= 2) { onSaved?.(ids); return; }
    openPicker(ids, chosen => onSaved?.(chosen), 'edit');
  }

  function direction(event) {
    const up = pointer.y-event.clientY, left = pointer.x-event.clientX;
    if (Math.max(up,left) < 24) return -1;
    return up > left ? 0 : 1;
  }
  function release() {
    pointer = null;
    wheel.classList.remove('open');
    labels.forEach(label => label.classList.remove('aim'));
  }
  trigger.oncontextmenu = event => event.preventDefault();
  trigger.onpointerdown = event => {
    if (pointer || state().mode !== 'running') return;
    event.preventDefault();
    pointer = {id:event.pointerId,x:event.clientX,y:event.clientY};
    trigger.setPointerCapture(event.pointerId);
    wheel.classList.add('open');
  };
  trigger.onpointermove = event => {
    if (pointer?.id !== event.pointerId) return;
    const target = direction(event);
    labels.forEach((label,i) => label.classList.toggle('aim',i === target));
  };
  trigger.onpointerup = event => {
    if (pointer?.id !== event.pointerId) return;
    const target = direction(event);
    release();
    if (target >= 0) activate(target);
  };
  trigger.onpointercancel = trigger.onlostpointercapture = release;
  window.addEventListener('keydown',event => {
    if (state().mode !== 'running' || event.repeat || !['1','2'].includes(event.key)) return;
    activate(Number(event.key)-1);
  });

  function update() {
    const s = state();
    wheel.hidden = s.mode !== 'running' || !s.slots?.length;
    if (wheel.hidden) { if (pointer) release(); return; }
    labels.forEach((label,i) => {
      const slot = s.slots[i];
      label.hidden = !slot;
      if (!slot) return;
      const seconds = Math.ceil(slot.until-s.time);
      const metres = Math.ceil(slot.readyAt-s.distance);
      const status = seconds > 0 ? seconds+'s' : metres > 0 ? metres+' m' : 'Ready';
      const text = (i === 0 ? '↑ ' : '← ') + nameOf(slot.id) + ' · ' + status;
      if (label.textContent !== text) label.textContent = text;
    });
  }
  return {choose,edit,current,update};
}
