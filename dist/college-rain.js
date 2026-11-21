// Repeatable particle samples keep a paused frame still and a restarted run identical.
export function rainSample(index, channel) {
  let bits = Math.imul(index + 1, 0x9e3779b1) ^ Math.imul(channel + 1, 0x85ebca6b);
  bits = Math.imul(bits ^ (bits >>> 16), 0x27d4eb2d);
  return ((bits ^ (bits >>> 15)) >>> 0) / 4294967296;
}

export function footSpray(state, draw) {
  if (state.mode !== 'running' || state.jump || state.drop || state.floor > .04 ||
      state.slide || state.roll || state.fallSpeed) return;
  const stride = state.time * 15 / Math.PI;
  const phase = stride % 1;
  const shoe = (Math.floor(stride) % 2 ? 1 : -1) * .17;
  for (let i = 0; i < 18; i++) {
    const age = phase - (i % 3) * .055;
    if (age < 0) continue;
    const angle = i * 2.39996;
    const speed = .28 + (i % 5) * .10;
    const x = state.x * 2.2 + shoe + Math.cos(angle) * age * speed;
    const y = .11 + age * (1 - age) * (.6 + (i % 4) * .19);
    const z = .03 + age * (.8 + Math.sin(angle) * speed);
    draw(x, y, z, Math.cos(angle) * .035, (.5 - age) * .13);
  }
}
