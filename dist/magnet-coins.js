import {makeCoin,spinCoin} from './coin.js';
import {height} from './engine.js';

export function createMagnetCoins(scene) {
  const pool=[];
  return function update(s) {
    const visible=['running','paused','countdown'].includes(s.mode)?s.coinFlights:[];
    for(let i=0;i<visible.length;i++){
      const f=visible[i];
      if(!pool[i])pool[i]=makeCoin(scene,0,0,0);
      const coin=pool[i],p=Math.min(1,f.elapsed/f.duration),blend=1-Math.pow(1-p,2);
      coin.visible=true;
      const y=f.y+(height(s)+1.05-f.y)*blend+Math.sin(p*Math.PI)*.28;
      spinCoin(coin,s.time,i,y);
      coin.position.x=f.x+(s.x*2.2-f.x)*blend;
      coin.position.z=(s.distance-f.z)*(1-blend);
      coin.scale.setScalar(1.22*(1-.35*p));
    }
    for(let i=visible.length;i<pool.length;i++)pool[i].visible=false;
  };
}
