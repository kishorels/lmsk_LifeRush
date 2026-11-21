import {makeCoin,spinCoin} from './coin.js?v=3.4.3';
import {height} from './engine.js';
import {curveRelX,curveRelY} from './campus-layout.js';

export function createMagnetCoins(scene) {
  const pool=[];
  return function update(s) {
    const visible=['running','paused','countdown'].includes(s.mode)?s.coinFlights:[];
    for(let i=0;i<visible.length;i++){
      const f=visible[i];
      if(!pool[i])pool[i]=makeCoin(scene,0,0,0);
      const coin=pool[i],p=Math.min(1,f.elapsed/f.duration),blend=1-Math.pow(1-p,2);
      coin.visible=true;
      const startX=f.x+curveRelX(f.z,s);
      const startY=f.y+curveRelY(f.z,s);
      const y=startY+(height(s)+1.05-startY)*blend+Math.sin(p*Math.PI)*.28;
      spinCoin(coin,s.time,i,y);
      coin.position.x=startX+(s.x*2.2-startX)*blend;
      coin.position.z=(s.distance-f.z)*(1-blend);
      coin.scale.setScalar(1.22*(1-.35*p));
    }
    for(let i=visible.length;i<pool.length;i++)pool[i].visible=false;
  };
}
