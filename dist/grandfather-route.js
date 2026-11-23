export const SCHOOL_ROAD_START = 2000;
export const HOME_YARD_START = SCHOOL_ROAD_START + 15 * 64;
export const GRANDFATHER_GATE = HOME_YARD_START + 16;
export const villageMemories = [
  {at:SCHOOL_ROAD_START + 126, film:'school-road', caption:'இந்த வழியில்தானே நாம பள்ளிக்கூடம் போவோம்…'},
  {at:SCHOOL_ROAD_START + 441, film:'canal', caption:'பள்ளி முடிஞ்சதும், இந்த வாய்க்கால்ல கால நனைச்சுட்டு எவ்வளவு நேரம் கதை பேசுவோம்!'},
  {at:SCHOOL_ROAD_START + 776, film:'after-school', caption:'பையைத் தூக்கிட்டு ஓடி வரும்போதே, வாசல்ல அம்மா காத்திருப்பா…'},
  {at:GRANDFATHER_GATE, film:'home', followUp:'memory5', creditsBg:'finalvideo', showCredits:true, caption:'அதே வாசல். “அம்மா, வந்துட்டேன்.”'}
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

// One unmarked village path without coins — 2,000m soil trail followed by the normal quiet school road home.
const quietRoadObstacles = [SCHOOL_ROAD_START + 306, SCHOOL_ROAD_START + 621];
const encounters = ['logs', 'cloth', 'fence', 'haycart', 'arch', 'pottery', 'crate'];
const SOIL_SPACING = 48;
const SOIL_COUNT = Math.floor((SCHOOL_ROAD_START - 80 - 38) / SOIL_SPACING) + 1;
export function populateGrandfatherPath(state) {
  while (true) {
    const index = state.trafficIndex;
    const z = index < SOIL_COUNT ? 38 + index * SOIL_SPACING : quietRoadObstacles[index - SOIL_COUNT];
    if (z == null || z > state.distance + 230 || z > GRANDFATHER_GATE - 25) break;
    state.trafficIndex++;
    const variant = index < SOIL_COUNT ? encounters[index % encounters.length] : 'crate';
    const side = (Math.floor(index / encounters.length) + (state.runSeed & 1)) % 2 ? -1 : 1;
    const add = (type, lane, at, extra) => state.items.push({type, lane, z:at, done:false, ...extra});
    if (variant === 'pottery') {
      add('block', -1, z, {variant:'pot', halfWidth:.53});
      add('block', 1, z, {variant:'rock', halfWidth:.80});
    } else {
      const type = variant === 'cloth' ? 'slide' : variant === 'arch' ? 'arch' : 'jump';
      add(type, index >= SOIL_COUNT ? side * .83 : variant === 'haycart' ? side * .30 : 0, z, {
        variant, halfWidth: variant === 'crate' ? .83 : variant === 'haycart' ? 1.04 : 3.5,
        clearance: variant === 'haycart' ? 1.85 : 1.05
      });
    }
  }
}
