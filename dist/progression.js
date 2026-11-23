export const MAX_LEVEL = 25;
export const POWER_BASE_SECONDS = 10;
export const POWER_UPGRADE_STEP_SECONDS = 2;
export const POWER_UPGRADE_COSTS = [500, 1000, 2000, 3500, 5000];
export const powers = [
  {level:10,id:'shoes',name:'Super Jump Shoes',icon:'▲'},
  {level:15,id:'doubleCoins',name:'2x Coins',icon:'×2'},
  {level:20,id:'nitro',name:'Nitro Rush',icon:'»'},
  {level:25,id:'ghost',name:'Invisible',icon:'◌'}
];
export const powerById = Object.fromEntries(powers.map(power => [power.id,power]));
export const pickupTypes = new Set(['coin','magnet','shield',...powers.map(power => power.id)]);
export function powerDuration(id, upgradeLevels = null) {
  const maxTier = POWER_UPGRADE_COSTS.length;
  const raw = Number(upgradeLevels?.[id] ?? 0);
  const lv = Math.max(0, Math.min(maxTier, Math.floor(Number.isFinite(raw) ? raw : 0)));
  return POWER_BASE_SECONDS + lv * POWER_UPGRADE_STEP_SECONDS;
}
export const xpForLevel = level => 5 * (level - 1) * (level + 8);
export function playerLevel(xp) {
  let level = 1;
  while (level < MAX_LEVEL && xp >= xpForLevel(level + 1)) level++;
  return level;
}
export const parkOpen = profile => Boolean(profile?.itParkUnlocked || (profile?.collegeBest >= 15000 && profile?.collegeCoins >= 40000));
export function runPickup(level,seed,index,featured) {
  if (featured && index === 0 && powerById[featured]?.level <= level) return featured;
  const pool = ['magnet','shield',...powers.filter(power => power.level <= level).map(power => power.id)];
  return pool[((seed >>> 0) + index) % pool.length];
}
