// Coordinates are local to each 64 m stretch. Seed by absolute distance so a
// recycled render slot gets new scenery, while a replay visits the same village.
export const SECTION_LENGTH=64;
export const houseTypes=['house','thatched','pink','cottage','veranda','farmhouse'];
export function cowPose(time,seed){
  const cycle=(time*.65+seed*1.7)%12, returning=cycle>=6;
  const along=returning?12-cycle:cycle;
  return {offset:2.4-along*.80,flip:returning?-1:1,frame:((Math.floor(time*4.8+seed)%4)+4)%4};
}
function sectionSeed(index) {
  let value=Math.imul(index+731,0x85ebca6b);
  value=Math.imul(value^(value>>>13),0xc2b2ae35);
  return (value^(value>>>16))>>>0;
}
export function villageLayout(index) {
  let seed=sectionSeed(index);
  const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  const between=(a,b)=>a+(b-a)*random();
  const items=[];
  const add=(type,x,z,w,h,angle=0)=>items.push({type,x,z,w,h,angle});
  const homestead=index===0 || (index>1 && index%2===sectionSeed(Math.floor(index/2))%2);
  const houseZ=-between(16,48);
  if(homestead){
    const h=between(4.4,5.8), x=-between(12.5,19);
    add(houseTypes[Math.floor(index/2)%houseTypes.length],x,houseZ,h*1.48,h,between(.05,.48));
    add('banana',x-between(3.5,5),houseZ-between(1,4),between(3,5),between(4,5.6));
  }
  if(random()<.42){
    const well=random()<.47;
    add(well?'well':'haycart',-between(13,18),houseZ>-32?-54:-7,well?2.8:5.1,well?2.7:3.2);
  }
  for(let i=0,count=Math.floor(between(1,5));i<count;i++){
    const z=-between(2,62);
    if(homestead&&Math.abs(z-houseZ)<6)continue;
    const h=between(5.5,11.2);
    add(random()<.22?'banana':'neem',-between(13,25),z,h*between(.73,1.2),h,between(-.4,.4));
  }
  for(let i=0,count=Math.floor(between(3,10));i<count;i++){
    const h=between(6,12);
    add(random()<.76?'palm':'neem',i===0?between(8,17):between(23,62),-between(2,62),h*between(.65,1),h,between(-.35,.35));
  }
  if(index===0||random()<.23){
    const z=-between(11,51);
    add('goat',between(5.1,6.7),z,1.95,1.39,-.12);
    if(random()<.55)add('goat',between(6.1,7.2),z-3.5,1.3,.92,.1);
  }
  if(index===0 || random()<.29)add('cow',-15-between(0,1.5),-between(8,18),3.1,2.0,.1);
  return {items,random};
}
