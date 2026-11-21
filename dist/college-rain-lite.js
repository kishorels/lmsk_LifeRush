import {footSpray, rainSample} from './college-rain.js';

export function createLiteCollegeRain(ctx, project) {
  const drops = Array.from({length:210}, (_,i) => ({
    x:rainSample(i,0), y:rainSample(i,1), length:.012+.031*rainSample(i,2),
    speed:.82+rainSample(i,3)*.73
  }));

  function surface(state) {
    ctx.save();
    // Break each elongated reflection into short glints, projected onto the road.
    for (let i=0;i<150;i++) {
      const z=(i*.43+68-state.distance%68)%68-1;
      const side=i%2 ? 1 : -1;
      const x=side*(2.45+.8*rainSample(i,0));
      const p=project(x,z);
      const gleam=.5+.5*Math.cos((z+state.distance)*.59);
      ctx.fillStyle=i%4 ? 'rgba(255,189,98,'+(.05+.42*gleam)+')' : 'rgba(179,212,245,.36)';
      ctx.fillRect(p.x,p.y,p.k*(.04+.25*rainSample(i,1)),Math.max(.7,p.k*.018));
    }
    for (let i=0;i<45;i++) {
      const z=(rainSample(i,3)*30+30-state.distance%30)%30-1;
      const p=project((rainSample(i,4)-.5)*6.7,z);
      const age=(state.time*(.9+rainSample(i,5)*.45)+rainSample(i,6))%1;
      const radius=p.k*(.02+.21*age);
      ctx.strokeStyle='rgba(199,228,252,'+(.44*(1-age))+')';
      ctx.lineWidth=Math.max(.6,p.k*.009);
      ctx.beginPath();ctx.ellipse(p.x,p.y,radius,radius*.24,0,0,Math.PI*2);ctx.stroke();
    }
    ctx.restore();
  }

  function shower(state,w,h) {
    ctx.save();
    for (let layer=0;layer<2;layer++) {
      ctx.strokeStyle=layer?'rgba(220,236,255,.49)':'rgba(195,218,245,.31)';
      ctx.lineWidth=layer?1.15:.75;
      ctx.beginPath();
      for (let i=layer;i<drops.length;i+=2) {
        const d=drops[i], travel=state.time*d.speed;
        const y=((d.y+travel)%1)*(h+40)-40;
        const x=((d.x+(travel*.23*h/w))%1)*(w+40)-20;
        const len=d.length*h*(layer?1:.65);
        ctx.moveTo(x,y);ctx.lineTo(x+len*.23,y+len);
      }
      ctx.stroke();
    }
    ctx.strokeStyle='rgba(220,241,255,.84)';
    ctx.lineWidth=Math.max(1,h*.002);
    ctx.beginPath();
    footSpray(state,(x,y,z,dx,dy) => {
      const a=project(x,3-z,y), b=project(x+dx,3-z-.025,y+dy);
      ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);
    });
    ctx.stroke();
    ctx.restore();
  }
  return {surface,shower};
}
