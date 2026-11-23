export const GRANDFATHER_GATE = 1200;

export const SCHOOL_ROAD_START = 224;
export const HOME_YARD_START = SCHOOL_ROAD_START + 15 * 64;
export const villageMemories = [
  {at:350, film:'school-road', caption:'இந்த வழியில்தானே நாம பள்ளிக்கூடம் போவோம்…'},
  {at:665, film:'canal', caption:'பள்ளி முடிஞ்சதும், இந்த வாய்க்கால்ல கால நனைச்சுட்டு எவ்வளவு நேரம் கதை பேசுவோம்!'},
  {at:1000, film:'after-school', caption:'பையைத் தூக்கிட்டு ஓடி வரும்போதே, வாசல்ல அம்மா காத்திருப்பா…'},
  {at:GRANDFATHER_GATE, film:'home', caption:'அதே வாசல். “அம்மா, வந்துட்டேன்.”'}
];

export function memoryPace(distance, normalSpeed) {
  for (const memory of villageMemories) {
    const gap = memory.at - distance;
    if (gap > 40 || gap < -22) continue;
    const low = memory.at === GRANDFATHER_GATE ? 2.1 : 4;
    const t = gap >= 0 ? gap / 40 : -gap / 22;
    return low + (normalSpeed - low) * t * t * (3 - 2 * t);
  }
  return normalSpeed;
}

export function reachedMemory(state, previousDistance) {
  if (state.map !== 'grandfather' || state.mode !== 'running') return;
  return villageMemories.find(memory => previousDistance < memory.at && state.distance >= memory.at);
}

// One unmarked village path. The coin trail bends around the loaded cart
// and runs through the openings in the stone arch and the pottery market.
const quietRoadObstacles = [530, 845];
const encounters = ['logs', 'cloth', 'fence', 'haycart', 'arch', 'pottery', 'crate'];
export function populateGrandfatherPath(state) {
  const spacing = 44;
  while (true) {
    const index = state.trafficIndex;
    const sandCount = encounters.length;
    const z = index < sandCount ? 38 + index * spacing : quietRoadObstacles[index - sandCount];
    if (z == null || z > state.distance + 230 || z > GRANDFATHER_GATE - 25) break;
    state.trafficIndex++;
    const variant = index < sandCount ? encounters[index] : 'crate';
    const side = (Math.floor(index / encounters.length) + (state.runSeed & 1)) % 2 ? -1 : 1;
    const add = (type, lane, at, extra) => state.items.push({type, lane, z:at, done:false, ...extra});
    if (variant === 'pottery') {
      add('block', -1, z, {variant:'pot', halfWidth:.53});
      add('block', 1, z, {variant:'rock', halfWidth:.80});
    } else {
      const type = variant === 'cloth' ? 'slide' : variant === 'arch' ? 'arch' : 'jump';
      add(type, index >= sandCount ? side * .83 : variant === 'haycart' ? side * .30 : 0, z, {
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
