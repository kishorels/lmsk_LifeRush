import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Scene,Vector3} from '../dist/vendor/three.module.js';
import {createSchoolEntrance} from '../dist/school-scene.js';
import {createTraffic} from '../dist/traffic-scene.js';
import {preloadCoinModel} from '../dist/coin.js';
import {fresh,routeVans} from '../dist/engine.js';
import {routeSegment} from '../dist/traffic-rules.js';

test('entry bus, ramp, coins and parked traffic match seeded physics after every restart',async()=>{
  const nativeFetch=globalThis.fetch;
  globalThis.fetch=async(request,options)=>{
    const url=typeof request==='string'?request:request.url;
    return url.startsWith('file:')?new Response(await readFile(new URL(url))):nativeFetch(request,options);
  };
  globalThis.self=globalThis;
  globalThis.createImageBitmap=async()=>({width:1024,height:1024,close(){}});
  globalThis.ProgressEvent=class extends Event{constructor(type,init){super(type);Object.assign(this,init);}};
  try{
    const scene=new Scene(),school=createSchoolEntrance(scene),traffic=createTraffic(scene);
    let previous=[];
    for(const seed of [1,7,42,173,1]){
      const s=fresh(seed);school(s);scene.updateMatrixWorld(true);
      const at=name=>scene.getObjectByName(name).getWorldPosition(new Vector3());
      assert.ok(Math.abs(at('entry-bus').x-s.entryVan.lane*2.2)<1e-8);
      assert.ok(Math.abs(at('entry-bus').z+s.entryVan.rear)<1e-8);
      assert.ok(Math.abs(at('entry-ramp').z+(s.entryVan.ramp+s.entryVan.rear)/2)<1e-8);
      const coins=scene.getObjectByName('entry-vehicle').children.filter(o=>o.name==='GoldCoin');
      assert.equal(coins.length,4);
      coins.forEach((coin,i)=>assert.ok(Math.abs(coin.getWorldPosition(new Vector3()).z+s.entryCoins[i])<1e-8));
      const index=[0,1].find(i=>routeSegment(seed,i).kind==='roof');
      s.distance=routeSegment(seed,index).base+20;traffic(s);scene.updateMatrixWorld(true);
      assert.ok(previous.every(root=>root.parent===null),'old run traffic is removed');
      const parked=scene.children.filter(root=>root.userData.routeVanId);
      assert.ok(parked.length>=2);
      for(const root of parked){
        const van=routeVans(s.distance,seed).find(v=>v.id===root.userData.routeVanId);
        assert.ok(van);
        assert.equal(root.position.x,van.lane*2.2);
        assert.equal(root.position.z,s.distance-van.rear);
      }
      previous=parked;
    }
    // Verify entry bus stays aligned directly under the runner on curved roads (College & Final One)
    for(const map of ['college','finalrun']){
      const s=fresh(7);s.map=map;s.mode='running';
      for(const dist of [s.entryVan.ramp+4, s.entryVan.rear+10, s.entryVan.front-2]){
        s.distance=dist;school(s);scene.updateMatrixWorld(true);
        const veh=scene.getObjectByName('entry-vehicle');
        const pt=new Vector3(0,0,s.entryVan.rear-dist).applyMatrix4(veh.matrixWorld);
        assert.ok(Math.abs(pt.x-s.entryVan.lane*2.2)<1e-5,`${map} entry bus drifts at ${dist}m: x=${pt.x} vs ${s.entryVan.lane*2.2}`);
        assert.ok(Math.abs(pt.z)<1e-5,`${map} entry bus z drifts at ${dist}m: z=${pt.z}`);
      }
    }
    assert.ok(await preloadCoinModel());
  }finally{globalThis.fetch=nativeFetch;}
});
