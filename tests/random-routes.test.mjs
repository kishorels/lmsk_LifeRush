import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,step,action,height} from '../dist/engine.js';
import {entryVan,routeSegment,segmentBase,repeatedVans,trafficPattern} from '../dist/traffic-rules.js';

test('every restart gets a new seed, while explicit seeds reproduce a stable route',()=>{
  let previous=fresh().runSeed;
  for(let i=0;i<20;i++){const s=fresh();assert.notEqual(s.runSeed,previous);previous=s.runSeed;}
  assert.deepEqual(fresh(1729),fresh(1729));
  const openings=new Set(),lanes=new Set(),orders=new Set();
  for(let seed=1;seed<=64;seed++){
    const s=fresh(seed),first=routeSegment(seed,0);
    openings.add(JSON.stringify([s.entryVan,trafficPattern(first.base,0,seed)]));
    lanes.add(s.entryVan.lane);orders.add([routeSegment(seed,0).kind,routeSegment(seed,1).kind].join(','));
  }
  assert.equal(openings.size,64);assert.equal(lanes.size,3);assert.equal(orders.size,2);
});

test('seeded buses, barriers and rewards share one layout and always leave a ground lane',()=>{
  const variants=new Set(),powerups=new Set(),gaps=new Set(),pickupDistances=new Set();
  for(let seed=1;seed<=100;seed++)for(let index=0;index<24;index++){
    const p=routeSegment(seed,index),items=trafficPattern(p.base,index,seed);
    assert.deepEqual(items,trafficPattern(p.base,index,seed),'re-reading a segment must not reroll it');
    const pickupTypes=['coin','magnet','shield','nitro','shoes'];
    const hazards=items.filter(o=>!pickupTypes.includes(o.type));
    assert.ok(hazards.every(o=>o.lane!==p.safeLane));
    assert.ok(items.filter(o=>pickupTypes.includes(o.type)).every(o=>o.lane===p.safeLane));
    const gap=segmentBase(seed,index+1)-p.base;
    assert.ok(gap>=220&&gap<=276);gaps.add(gap);
    const pickup=items.find(o=>['magnet','shield','nitro','shoes'].includes(o.type));
    powerups.add(pickup.type);pickupDistances.add(pickup.z-p.base);
    if(p.kind==='roof'){
      const vans=repeatedVans(p.base+30,seed).filter(v=>v.id==='van-'+index||v.id==='roof-'+index);
      assert.equal(vans.length,2);assert.ok(vans.every(v=>v.lane===p.roofLane&&v.lane!==p.safeLane));
      assert.ok(p.barrierAt-68>=90,'roof route retains reaction space');
    }else{
      const vehicle=items.find(o=>o.type==='sideVehicle');
      assert.ok([-1,1].includes(vehicle.lane));variants.add(vehicle.variant);
      assert.notEqual(vehicle.lane,items.find(o=>o.type==='bus').lane);
    }
    if(index%2===0)assert.notEqual(p.powerup,routeSegment(seed,index+1).powerup,'each pair offers distinct powerups');
  }
  assert.equal(variants.size,3);assert.equal(powerups.size,4);assert.ok(gaps.size>20);assert.ok(pickupDistances.size>15);
});

test('random routes remain escapable through lane changes at low and maximum speed',()=>{
  for(const seed of [...Array.from({length:64},(_,i)=>i+1),173])for(const start of [0,12]){
    const s=fresh(seed),plans=Array.from({length:7},(_,i)=>routeSegment(seed,start+i));
    s.mode='running';s.distance=start?plans[0].base-80:0;s.next=plans[0].base;s.trafficIndex=start;
    s.lane=s.x=start?0:(entryVan(seed).lane===0?-1:0);
    let next=0;
    while(s.distance<plans[5].base+180){
      if(next<plans.length&&s.distance>=plans[next].base-10){s.lane=plans[next].safeLane;next++;}
      step(s,.05);
      assert.equal(s.damage,0,`seed ${seed} at ${s.distance}: ${s.cause}`);
      assert.ok(!s.shieldAbsorbed,'safe route must not rely on shield protection');
      assert.equal(s.mode,'running');
    }
    assert.ok(s.coins>0);
  }
});

test('randomly placed roof routes still support the full jump onto a moving bus',()=>{
  for(const seed of [1,7,42,173]){
    const index=[0,1].find(i=>routeSegment(seed,i).kind==='roof');
    const p=routeSegment(seed,index),base=p.base,s=fresh(seed);
    s.mode='running';s.distance=base-25;s.next=100000;s.items=trafficPattern(base,index,seed);
    s.lane=s.x=p.roofLane;let first=false,second=false,landed=false;
    while(s.distance<base+143){
      if(!first&&s.distance>=base+30){action(s,'jump');first=true;}
      if(first&&!second&&s.distance>=base+64&&!s.jump&&s.floor===1.72){action(s,'jump');second=true;}
      step(s,.01);if(s.floor===2.8&&!s.jump)landed=true;
    }
    assert.ok(second&&landed,`seed ${seed} keeps its playable roof chain`);
    assert.equal(s.damage,0);assert.equal(height(s),0);
  }
});
