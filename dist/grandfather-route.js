export const GRANDFATHER_GATE = 1200;

// One unmarked village path. The coin trail bends around the loaded cart
// and runs through the openings in the stone arch and the pottery market.
const encounters = ['logs', 'cloth', 'fence', 'haycart', 'arch', 'pottery', 'crate'];
export function populateGrandfatherPath(state) {
  const spacing = 44;
  while (true) {
    const index = state.trafficIndex;
    const z = 38 + index * spacing;
    if (z > state.distance + 230 || z > GRANDFATHER_GATE - 25) break;
    state.trafficIndex++;
    const variant = encounters[index % encounters.length];
    const side = (Math.floor(index / encounters.length) + (state.runSeed & 1)) % 2 ? -1 : 1;
    const add = (type, lane, at, extra) => state.items.push({type, lane, z:at, done:false, ...extra});
    if (variant === 'pottery') {
      add('block', -1, z, {variant:'pot', halfWidth:.53});
      add('block', 1, z, {variant:'rock', halfWidth:.80});
    } else {
      const type = variant === 'cloth' ? 'slide' : variant === 'arch' ? 'arch' : 'jump';
      add(type, variant === 'haycart' ? side * .30 : 0, z, {
        variant, halfWidth: variant === 'crate' ? .83 : variant === 'haycart' ? 1.04 : 3.5,
        clearance: variant === 'haycart' ? 1.85 : 1.05
      });
    }
    for (let offset = -24; offset < 20; offset += 4) {
      const bypass = variant === 'haycart' ? -side * Math.min(1, Math.max(0, (24 - Math.abs(offset)) / 14)) : 0;
      const jumping = ['logs','fence','crate'].includes(variant);
      const lift = jumping ? 1.55 * Math.max(0, 1 - Math.abs(offset) / 9) : 0;
      add('coin', bypass, z + offset, {lift});
    }
  }
}
