export const powers = [
  {level:10,id:'shoes',name:'Super Jump Shoes',icon:'▲'},
  {level:15,id:'doubleCoins',name:'Double Coins',icon:'×2'},
  {level:20,id:'nitro',name:'Nitro Rush',icon:'»'},
  {level:25,id:'doubleJump',name:'Double Jump',icon:'↑↑'},
  {level:30,id:'slow',name:'Slow Motion',icon:'◷'},
  {level:35,id:'trail',name:'Coin Trail',icon:'●●'},
  {level:40,id:'ghost',name:'Ghost Run',icon:'◌'},
  {level:45,id:'wave',name:'Shockwave',icon:'◎'},
  {level:50,id:'rush',name:'Power Rush',icon:'★'}
];
export const powerById = Object.fromEntries(powers.map(power => [power.id,power]));
export const pickupTypes = new Set(['coin','magnet','shield',...powers.map(power => power.id)]);
export const xpForLevel = level => 5 * (level - 1) * (level + 8);
export function playerLevel(xp) {
  let level = 1;
  while (level < 50 && xp >= xpForLevel(level + 1)) level++;
  return level;
}
export const parkOpen = profile => profile.collegeBest >= 15000 && profile.collegeCoins >= 40000;
export function runPickup(level,seed,index,featured) {
  if (featured && index === 0 && powerById[featured]?.level <= level) return featured;
  const pool = ['magnet','shield',...powers.filter(power => power.level <= level).map(power => power.id)];
  return pool[((seed >>> 0) + index) % pool.length];
}
