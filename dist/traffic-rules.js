export function repeatedVans(distance) {
  const vans=[],start=Math.max(0,Math.floor((distance-100)/160)-1);
  for(let i=start;i<start+3;i++) {
    const base=100+i*160,lane=[-1,1,0][i%3];
    vans.push({id:`van-${i}`,lane,ramp:base+12,rear:base+22,front:base+42,roof:1.72,width:1.94});
    vans.push({id:`roof-${i}`,lane,ramp:base+48,rear:base+48,front:base+68,roof:1.72,width:1.94});
  }
  return vans;
}
export function trafficPattern(base,index) {
  const roofLane=[-1,1,0][index%3],lane=[0,-1,1][index%3];
  // Moving traffic has its own lane for the whole section. No barrier can
  // hide an approaching bus or ask the player to slide into its path.
  return [
    {z:base+130,lane,type:'bus',velocity:18,activate:base-25,length:10,done:false},
    {z:base+190,lane,type:'bus',velocity:24,activate:base-25,length:10,done:false},
    {z:base+108,lane:roofLane,type:index%2?'slide':'jump',done:false},
    {z:base+148,lane:roofLane,type:index%2?'jump':'slide',done:false},
    {z:base+82,lane:-roofLane-lane,type:'skill',skill:index%3,done:false},
  ];
}
