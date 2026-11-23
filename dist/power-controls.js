import {powerById} from './progression.js';

const nameOf = id => powerById[id]?.name || id;
const STORE_KEY = 'runverse-powers';

export const POWER_ICONS = {
  shoes: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none"><path d="M4 17l4-9 4 1 2 4h5a3 3 0 0 1 3 3v2H4z" fill="#00e5ff" fill-opacity="0.25" stroke="#00e5ff" stroke-width="1.8"/><path d="M7 8L3 5m4 7l-5-2" stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round"/><circle cx="17.5" cy="18" r="1.5" fill="#fff"/></svg>',
  doubleCoins: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none"><circle cx="10" cy="12" r="7.5" fill="#eab308" stroke="#fef08a" stroke-width="1.5"/><circle cx="15.5" cy="11" r="5.5" fill="#ca8a04" stroke="#fef08a" stroke-width="1.2" opacity="0.9"/><text x="10" y="15" font-size="7.5" font-weight="900" fill="#422006" text-anchor="middle" font-family="system-ui, sans-serif">2X</text></svg>',
  nitro: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none"><path d="M13 2L4 14h7l-2 8 11-12h-7l2-8z" fill="url(#pwrNitroGrad)" stroke="#ffedd5" stroke-width="1.2" stroke-linejoin="round"/><defs><linearGradient id="pwrNitroGrad" x1="4" y1="2" x2="20" y2="22"><stop offset="0%" stop-color="#ff0055"/><stop offset="50%" stop-color="#ff7700"/><stop offset="100%" stop-color="#ffdd00"/></linearGradient></defs></svg>',
  ghost: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none"><path d="M12 3a7 7 0 0 0-7 7v9l3-2 2 2 2-2 2 2 3-2 2 2V10a7 7 0 0 0-7-7z" fill="#818cf8" fill-opacity="0.3" stroke="#a5b4fc" stroke-width="1.8" stroke-linejoin="round"/><circle cx="9.5" cy="10" r="1.5" fill="#fff"/><circle cx="14.5" cy="10" r="1.5" fill="#fff"/></svg>'
};

function loadSaved() {
  try {
    const value = JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
    return Array.isArray(value) ? value.filter(id => powerById[id]) : [];
  } catch { return []; }
}
function save(ids) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(ids.slice(0,2))); } catch {}
}

export function createPowerControls(state,activate,onHold) {
  const get = id => document.getElementById(id);
  const dialog = get('power-picker'), options = get('power-options'), confirm = get('confirm-powers');
  const title = get('power-title'), hint = get('power-hint');
  const wheel = get('run-powers'), trigger = get('power-trigger');
  const labels = [...wheel.querySelectorAll('.power-direction')];
  let pointer = null;

  // Slots are reveal-only while holding #power-trigger and activated strictly by swiping.
  labels.forEach(label => {
    label.tabIndex = -1;
  });
  wheel.addEventListener('pointerdown', event => {
    event.stopPropagation();
  });

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
      ? 'Select any 2 unlocked powers to equip for your runs.'
      : 'Select 2 powers for Slot 1 (↑) and Slot 2 (←). You can change them later in Settings.';
    confirm.textContent = mode === 'edit' ? 'Save powers' : 'Start run';
    function refresh() {
      for (const button of options.children) {
        const id = button.dataset.id;
        const index = chosen.indexOf(id);
        button.setAttribute('aria-pressed',String(index >= 0));
        const tag = button.querySelector('.picker-slot-tag');
        if (tag) tag.textContent = index === 0 ? 'Slot 1 (↑)' : index === 1 ? 'Slot 2 (←)' : '';
        button.disabled = chosen.length === 2 && index < 0;
      }
      confirm.disabled = chosen.length !== 2;
    }
    for (const id of ids) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.id = id;
      button.innerHTML = `
        <span class="picker-icon-wrap">${POWER_ICONS[id] || ''}</span>
        <span class="picker-text">
          <span class="picker-name">${nameOf(id)}</span>
          <span class="picker-slot-tag"></span>
        </span>
      `;
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

  // Ask to choose 2 powers ONLY the 1st time. Subsequent runs automatically use saved powers!
  function choose(ids,begin) {
    if (ids.length <= 2) { begin(ids); return; }
    const saved = current(ids);
    if (saved.length === 2) {
      begin(saved);
      return;
    }
    openPicker(ids, begin, 'start');
  }

  // Settings: change the default pair anytime.
  function edit(ids,onSaved) {
    if (ids.length <= 2) { onSaved?.(ids); return; }
    openPicker(ids, chosen => onSaved?.(chosen), 'edit');
  }

  function direction(event) {
    if (!pointer) return -1;
    const up = pointer.y-event.clientY, left = pointer.x-event.clientX;
    if (Math.max(up,left) < 24) return -1;
    const target = up > left ? 0 : 1;
    if (!labels[target] || labels[target].hidden) return -1;
    return target;
  }
  function release() {
    const activePointerId = pointer?.id;
    pointer = null;
    if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleCancel);
    }
    wheel.classList.remove('open');
    labels.forEach(label => label.classList.remove('aim'));
    if (activePointerId != null && typeof trigger.releasePointerCapture === 'function') {
      try { trigger.releasePointerCapture(activePointerId); } catch {}
    }
    if (typeof trigger.blur === 'function') {
      try { trigger.blur(); } catch {}
    }
  }
  const handleMove = event => {
    if (pointer?.id !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    const target = direction(event);
    labels.forEach((label,i) => label.classList.toggle('aim',i === target));
  };
  const handleUp = event => {
    if (pointer?.id !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    const target = direction(event);
    release();
    if (target >= 0) activate(target);
  };
  const handleCancel = event => {
    if (event && pointer && event.pointerId != null && pointer.id !== event.pointerId) return;
    release();
  };
  trigger.oncontextmenu = event => event.preventDefault();
  trigger.onclick = event => {
    event.preventDefault();
    event.stopPropagation();
    if (!pointer) release();
  };
  trigger.onpointerdown = event => {
    if (pointer || state().mode !== 'running') return;
    event.preventDefault();
    event.stopPropagation();
    pointer = {id:event.pointerId,x:event.clientX,y:event.clientY};
    if (typeof trigger.setPointerCapture === 'function') {
      try { trigger.setPointerCapture(event.pointerId); } catch {}
    }
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('pointermove', handleMove);
      window.addEventListener('pointerup', handleUp);
      window.addEventListener('pointercancel', handleCancel);
    }
    wheel.classList.add('open');
    onHold?.();
  };
  trigger.onpointermove = handleMove;
  trigger.onpointerup = handleUp;
  trigger.onpointercancel = trigger.onlostpointercapture = handleCancel;
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('blur', release);
    window.addEventListener('keydown',event => {
      if (state().mode !== 'running' || event.repeat || !['1','2'].includes(event.key)) return;
      activate(Number(event.key)-1);
    });
  }
  if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) release();
    });
  }

  function update() {
    const s = state();
    wheel.hidden = s.mode !== 'running' || !s.slots?.length;
    if (wheel.hidden) { if (pointer || wheel.classList.contains('open')) release(); return; }

    let anyReady = false;
    labels.forEach((label,i) => {
      const slot = s.slots[i];
      label.hidden = !slot;
      if (!slot) return;
      const seconds = Math.ceil(slot.until-s.time);
      const metres = Math.ceil(slot.readyAt-s.distance);
      const isReady = seconds <= 0 && metres <= 0;
      const isActive = seconds > 0;
      if (isReady) anyReady = true;
      const status = isActive ? seconds+'s' : metres > 0 ? metres+'m' : 'READY';

      label.classList.toggle('ready', isReady);
      label.classList.toggle('active', isActive);
      label.classList.toggle('recharging', !isReady && !isActive);

      const renderKey = `${slot.id}:${status}:${isReady ? '1' : '0'}:${isActive ? '1' : '0'}`;
      if (label.dataset.renderKey !== renderKey) {
        label.dataset.renderKey = renderKey;
        const slotName = nameOf(slot.id);
        const ariaText = (i === 0 ? '↑ ' : '← ') + slotName + ' · ' + status;
        label.setAttribute('aria-label', ariaText);
        label.removeAttribute('title');
        if (label.dataset.slotId !== slot.id || !label._statusEl) {
          label.dataset.slotId = slot.id;
          label.innerHTML = `
            <span class="power-slot-icon">${POWER_ICONS[slot.id] || ''}</span>
            <span class="power-slot-status">${status}</span>
            <span class="power-slot-arrow">${i === 0 ? '↑' : '←'}</span>
            <span class="power-slot-name">${slotName}</span>
          `;
          label._statusEl = label.querySelector('.power-slot-status');
        } else {
          label._statusEl.textContent = status;
        }
      }
    });

    trigger.classList.toggle('has-ready', anyReady);
  }
  return {choose,edit,current,update};
}
