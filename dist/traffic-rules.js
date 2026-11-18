export function repeatedVans(distance) {
  const vans=[],start=Math.max(0,Math.floor((distance-100)/160)-1);
  for(let i=start;i<start+3;i++) {
    if(i%2===1)continue;
    const base=100+i*160,lane=[-1,1,0][i%3];
    vans.push({id:`van-${i}`,lane,ramp:base+12,rear:base+22,front:base+42,roof:1.72,width:1.94});
    vans.push({id:`roof-${i}`,lane,ramp:base+48,rear:base+48,front:base+68,roof:1.72,width:1.94});
  }
  return vans;
}
export function trafficPattern(base,index) {
  if(index%2===1){
    const lane=Math.floor(index/2)%2? -1:1,trigger=base+45;
    return [
      {z:base+110,lane,type:'sideVehicle',variant:['cycle','bike','car'][Math.floor(index/2)%3],trigger,encounter:true,started:false,length:3.4,done:false},
      {z:base+140,lane:0,type:'bus',velocity:22,trigger,encounter:true,started:false,length:10,done:false},
      {z:base+130,lane,type:'bus',velocity:20,activate:base+45,length:10,done:false},
      {z:base+145,lane,type:['jump','slide','block'][Math.floor(index/2)%3],variant:'scaffold',done:false},
      {z:base+122,lane:-lane,type:'skill',skill:index%3,done:false}
    ];
  }
  const roofLane=[-1,1,0][index%3],lane=[0,-1,1][index%3];
  // Moving traffic has its own lane for the whole section. No barrier can
  // hide an approaching bus or ask the player to slide into its path.
  return [
    {z:base+130,lane,type:'bus',velocity:18,activate:base-25,length:10,done:false},
    {z:base+235,lane:roofLane,type:'bus',velocity:18,activate:base+65,length:10,done:false},
    {z:base+190,lane,type:'bus',velocity:24,activate:base-25,length:10,done:false},
    {id:'moving-roof-'+index,z:base+70,lane:roofLane,type:'bus',roofRide:true,started:false,activate:base+56,length:22,roof:2.8,done:false},
    {z:base+158,lane:roofLane,type:Math.floor(index/2)%2?'jump':'slide',variant:Math.floor(index/2)%2?'hurdle':'scaffold',done:false},
    {z:base+82,lane:-roofLane-lane,type:'skill',skill:index%3,done:false},
  ];
}

export function sideVehicleX(o,time){const t=Math.max(0,Math.min(1,(time-o.startedAt)/.45));return o.lane*(5.3-3.1*t*t*(3-2*t));}
