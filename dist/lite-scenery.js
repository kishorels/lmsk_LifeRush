const streetImage = name => {
  const image = new Image();
  image.src = new URL('./assets/street/' + name + '.webp', import.meta.url).href;
  return image;
};

export function createLiteScenery(ctx, project, polygon, box) {
  const asphalt = streetImage('asphalt');
  const pavers = streetImage('pavers');
  const trees = ['neem', 'palm'].map(streetImage);
  const turf = streetImage('turf');
  let turfPattern=null;
  turf.onload=()=>{turfPattern=ctx.createPattern(turf,'repeat');};
  const clouds = [0, 1, 2].map(cloudImage);
  const quad = (points, color) => polygon(points.map(point => {
    const p = project(...point);
    return [p.x, p.y];
  }), color);

  function cloudLayer(w, h, time, weather) {
    ctx.save();
    ctx.globalAlpha = .92 - .49 * Math.max(weather.night, weather.rain);
    for (let i = 0; i < 6; i++) {
      const span = w * 1.55;
      const x = ((i * w * .29 - time * (13 + 5 * (i % 3))) % span + span) % span - w * .30;
      const width = w * (.26 + .055 * (i % 3));
      ctx.drawImage(clouds[i % 3], x, h * (.072 + .055 * (i % 4)), width, width * .42);
    }
    ctx.restore();
  }

  function tree(x, z, variant, distance, large=false) {
    const palm = Math.round(z + distance) % 3 === 1;
    const sprite = trees[Number(palm)];
    const p = project(x, z);
    const height = p.k * (large ? 6.3 + variant * 1.2 : 4.7 + variant);
    if (sprite.complete && sprite.naturalWidth) {
      const width = height * sprite.naturalWidth / sprite.naturalHeight;
      ctx.drawImage(sprite, p.x - width / 2, p.y - height, width, height);
    }
  }

  function grassClump(x,z,seed,scale=1,time=0) {
    const base=project(x,z),salt=Math.abs(Math.sin(seed*91.7));
    ctx.save();ctx.lineCap='round';
    for(let blade=0;blade<13;blade++){
      const phase=blade*2.399+salt*5;
      const rootX=(Math.sin(phase)*.22)*scale,lean=(Math.cos(phase*1.7)*.24+Math.sin(time*1.25+seed+blade)*.075)*scale;
      const height=(.38+((blade*7+seed)%5)*.09)*scale;
      const start=project(x+rootX,z,0),tip=project(x+rootX+lean,z,height);
      ctx.strokeStyle=['#4c8c36','#6ba948','#85b94d','#3f7a32'][blade%4];
      ctx.lineWidth=Math.max(.6,base.k*(.025+((blade+seed)%3)*.008));
      ctx.beginPath();ctx.moveTo(start.x,start.y);
      ctx.quadraticCurveTo(start.x+lean*base.k*.35,start.y-height*base.k*.52,tip.x,tip.y);ctx.stroke();
    }
    ctx.restore();
  }

  function grassGround(x,z,width,depth){
    if(!turfPattern)return;
    const corners=[project(x-width/2,z),project(x+width/2,z),project(x+width/2,z+depth),project(x-width/2,z+depth)];
    const left=Math.min(...corners.map(point=>point.x)),right=Math.max(...corners.map(point=>point.x));
    const top=Math.min(...corners.map(point=>point.y)),bottom=Math.max(...corners.map(point=>point.y));
    ctx.save();ctx.beginPath();corners.forEach((point,index)=>index?ctx.lineTo(point.x,point.y):ctx.moveTo(point.x,point.y));ctx.closePath();ctx.clip();
    ctx.globalAlpha=.62;ctx.fillStyle=turfPattern;ctx.fillRect(left,top,right-left,bottom-top);ctx.restore();
  }

  function goat(x,z,time,side,seed) {
    const cycle=(time*.62+seed*1.7)%9,walking=cycle<3.0,grazing=cycle>3.6&&cycle<8.4;
    const progress=walking?cycle/3.0:cycle>=3.0?1:0;
    const drift=side*progress*.65+Math.sin(time*.42+seed)*(walking ? .035 : .06);
    const depth=z+progress*.7+Math.cos(time*.37+seed)*(walking ? .04 : .08),p=project(x+drift,depth),k=p.k*.88;
    const facing=side<0?1:-1,walk=walking?Math.sin(time*5.2+seed)*.16:0;
    ctx.save();ctx.translate(p.x,p.y);ctx.scale(k*facing,k);ctx.lineCap='round';ctx.lineJoin='round';
    ctx.fillStyle='rgba(24,34,27,.22)';ctx.beginPath();ctx.ellipse(0,-.04,.57,.15,0,0,Math.PI*2);ctx.fill();
    // Four short legs and split hooves.
    for(let leg=0;leg<4;leg++){
      const front=leg<2,near=leg%2===0,lx=front?-.31:.30,phase=walk*(leg%2?1:-1);
      ctx.strokeStyle=front?'#e6ded1':'#d7d0c5';ctx.lineWidth=.105;
      ctx.beginPath();ctx.moveTo(lx,-.54+(near?-.025:.025));ctx.lineTo(lx+phase,-.035+Math.abs(phase)*.10);ctx.stroke();
      ctx.fillStyle='#3b3632';ctx.fillRect(lx+phase-.07,-.045+Math.abs(phase)*.10,.14,.12);
    }
    // Cream coat, shoulder and hindquarter shading.
    ctx.fillStyle='#e9e0d2';ctx.beginPath();ctx.ellipse(0,-.77,.52,.36,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='rgba(174,158,137,.25)';ctx.beginPath();ctx.ellipse(.12,-.58,.35,.14,0,0,Math.PI*2);ctx.fill();
    for(let tuft=0;tuft<9;tuft++){
      const tx=-.38+(tuft%5)*.17,ty=-.85-Math.floor(tuft/5)*.14;
      ctx.strokeStyle=tuft%2?'rgba(255,249,238,.48)':'rgba(156,145,128,.24)';ctx.lineWidth=.018;
      ctx.beginPath();ctx.moveTo(tx,ty);ctx.quadraticCurveTo(tx+.07,ty-.03,tx+.13,ty+.015);ctx.stroke();
    }
    // Neck, head, muzzle, ears and backward-curving horns.
    const lower=grazing ? .31 : .04;
    ctx.fillStyle='#e8dfd2';ctx.beginPath();ctx.ellipse(-.36,-.94,.22,.35,-.38,0,Math.PI*2);ctx.fill();
    ctx.save();ctx.translate(-.53,-1.05+lower);ctx.rotate(grazing ? .34 : .02);
    ctx.fillStyle='#eee6d9';ctx.beginPath();ctx.ellipse(0,0,.23,.25,-.15,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#c7b8a7';ctx.beginPath();ctx.ellipse(.10,-.13,.18,.095,-.15,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#8b786d';ctx.beginPath();ctx.ellipse(.12,.075,.105,.046+Math.abs(Math.sin(time*4.4+seed))*(grazing ? .018 : .003),-.08,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#594b43';ctx.beginPath();ctx.arc(.22,-.13,.025,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#201f1d';ctx.beginPath();ctx.arc(-.10,.01,.028,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#6b5542';ctx.lineWidth=.055;ctx.beginPath();ctx.moveTo(-.10,-.18);ctx.quadraticCurveTo(-.28,-.32,-.17,-.45);ctx.stroke();
    ctx.beginPath();ctx.moveTo(.035,-.18);ctx.quadraticCurveTo(.20,-.34,.12,-.47);ctx.stroke();
    ctx.fillStyle='#d8cdbd';ctx.beginPath();ctx.ellipse(-.17,.22,.19,.055,-.28,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#f2eadf';ctx.beginPath();ctx.moveTo(.12,.14);ctx.lineTo(.24,.28);ctx.lineTo(.10,.23);ctx.closePath();ctx.fill();
    ctx.restore();
    ctx.strokeStyle='#ded2c0';ctx.lineWidth=.06;ctx.beginPath();ctx.moveTo(.49,-.78);ctx.quadraticCurveTo(.69,-.86,.58,-1.03);ctx.stroke();
    ctx.restore();
  }

  function roadStrip(left, right, image, length, distance, color) {
    const far = 180, near = -1.5;
    quad([[left,near],[right,near],[right,far],[left,far]], color);
    if (!image.complete || !image.naturalWidth) return;
    // Horizontal slices keep the texture in road perspective as it travels toward the runner.
    const sections = 4, step = length / sections;
    const offset = ((distance % length) + length) % length;
    for (let index = 0; index * step - offset - length < far; index++) {
      const start = index * step - offset - length;
      const end = start + step;
      if (end <= near) continue;
      const a = project(left, Math.max(start,near));
      const b = project(right, Math.min(far,end));
      const c = project(right, Math.max(start,near));
      const d = project(left, Math.min(far,end));
      const stripY = (sections - 1 - index % sections) * image.height / sections;
      const cut = Math.max(0,near-start) / step * image.height / sections;
      const croppedHeight = image.height / sections - cut;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(a.x,a.y+.5); ctx.lineTo(c.x,c.y+.5);
      ctx.lineTo(b.x,b.y-.5); ctx.lineTo(d.x,d.y-.5);
      ctx.closePath(); ctx.clip();
      ctx.drawImage(image,0,stripY,image.width,croppedHeight,a.x,b.y-.5,c.x-a.x,a.y-b.y+1);
      ctx.restore();
    }
  }

  function road(distance, weather) {
    roadStrip(-3.55,3.55,asphalt,16,distance,'#515454');
    for (const side of [-1,1]) {
      roadStrip(side*4.35-.8,side*4.35+.8,pavers,5,distance,'#aca395');
      const left = side*3.56-.035, right = side*3.56+.035;
      quad([[left,-1.5],[right,-1.5],[right,138],[left,138]],'#e6dbbb');
    }
    if (weather.rain > .02 || weather.night > .02) {
      quad([[-3.55,-1.5],[3.55,-1.5],[3.55,180],[-3.55,180]],
        `rgba(21,37,52,${.25 * weather.rain + .30 * weather.night})`);
    }
    for (let z = -(distance % 7); z < 155; z += 7) {
      const near = Math.max(-1.5,z), far = z+3.4;
      if (far <= near) continue;
      for (const x of [-1.1,1.1]) quad([
        [x-.045,near],[x+.045,near],[x+.045,far],[x-.045,far]
      ],'#e0ddd1');
    }
  }

  function bus(x, start, end, width, roof, facingAway = false) {
    const z = Math.max(-1, start);
    if (end <= z) return;
    const center = project(x,z);
    const side = center.x < ctx.canvas.clientWidth / 2 ? 1 : -1;
    const edge = x + side * width / 2;
    const body = facingAway ? '#ddad42' : '#e2af45';
    const paint = '#ae7b2b';
    const sidePanel = (from,to,bottom,top,color) => quad([
      [edge,from,bottom],[edge,to,bottom],[edge,to,top],[edge,from,top]
    ],color);
    const face = (offset,y,w,h,color) => quad([
      [x+offset-w/2,z,y],[x+offset+w/2,z,y],
      [x+offset+w/2,z,y+h],[x+offset-w/2,z,y+h]
    ],color);
    const base = project(x,z);
    const shadow = ctx.createRadialGradient(base.x,base.y,0,base.x,base.y,base.k*.95);
    shadow.addColorStop(0,'#12171683'); shadow.addColorStop(1,'#12171600');
    quad([[x-width*.72,z-.08],[x+width*.72,z-.08],[x+width*.72,end],[x-width*.72,end]],shadow);
    box(x,z,width,roof-.48,end-z,body,paint,'#eed48e',.42,side);
    box(x,z,width*.88,.12,end-z,'#f3d586','#d5a353','#eac976',roof-.14,side);
    sidePanel(z,end,.65,.77,'#634c34');
    sidePanel(z,end,roof*.65,roof*.88,'#1d2e35');
    for (let from=start+.72; from+.16<end-.45; from+=1.43) {
      const near = Math.max(z,from);
      const far = Math.min(end-.35,from+1.27);
      if (far <= near) continue;
      sidePanel(near,far,roof*.68,roof*.85,'#54727a');
      sidePanel(near,far,roof*.69,roof*.71,'#95aab0');
      sidePanel(near,far,roof*.53,roof*.56,'#c69643');
    }
    for (const at of [start+1.35,end-1.45]) {
      if (at-.45<z || at+.45>end) continue;
      const tire = [];
      for (let i=0;i<16;i++) {
        const angle = i * Math.PI / 8;
        tire.push([edge,at+.46*Math.cos(angle),.44+.44*Math.sin(angle)]);
      }
      quad(tire,'#242626');
      const hub = project(edge,at,.44);
      const longitudinal = Math.abs(project(edge,at+.18,.44).x-project(edge,at-.18,.44).x);
      ctx.fillStyle = '#a4a29a';
      ctx.beginPath(); ctx.ellipse(hub.x,hub.y,Math.max(.38,longitudinal/2),hub.k*.18,0,0,Math.PI*2); ctx.fill();
    }
    if (start < z) return;
    const glass = ctx.createLinearGradient(0,center.y-roof*center.k,0,center.y-roof*.6*center.k);
    glass.addColorStop(0,'#99b3bd'); glass.addColorStop(.52,'#476671'); glass.addColorStop(1,'#25383f');
    face(0,roof*.59,width*.86,roof*.31,'#283439');
    face(0,roof*.62,width*.77,roof*.25,glass);
    face(0,roof*.62,.035,roof*.25,'#263337');
    face(0,.38,width*1.01,.17,'#323534');
    face(0,.59,width*.39,.15,facingAway?'#c6c5ad':'#424641');
    for (const direction of [-1,1]) {
      face(direction*width*.345,.57,width*.18,.20,'#423a31');
      face(direction*width*.345,.60,width*.14,.14,facingAway?'#d84633':'#fff1bd');
      if (!facingAway) face(direction*width*.51,roof*.64,width*.09,roof*.12,'#262d2e');
    }
  }

  function village(distance,time) {
    const entries=[];
    const first=Math.max(0,Math.floor((distance-96)/48)*48);
    for(let anchor=first;anchor<distance+230;anchor+=48){
      const z=3+anchor-distance;
      if(z+48<0||z>190)continue;
      const index=Math.floor(anchor/48),kind=anchor<220?index%3:anchor>9000?10+Math.abs(index%2):3+Math.abs(index%8);
      entries.push({z:Math.max(.1,z),draw:()=>{
        for(const side of [-1,1]){
          const fieldX=side*14.2;
          box(fieldX,z+5,18,.10,47,kind%3===0?'#69ae42':'#78bd4e','#579440','#9bd368',-.08);
          grassGround(fieldX,z+5,18,47);
          if(kind%3===1){
            box(side*6.55,z+5,1.25,.035,47,'#68c5d1','#549aa6','#a5e8e0',.01);
          }else{
            for(let row=0;row<5;row++){
              const cropX=fieldX+side*(row-2)*2.3;
              box(cropX,z+5,.16,.32,46,'#65a940','#5c943a','#aad764',.08);
            }
          }
          for(let post=0;post<6;post++){
            const pz=z+4+post*8;
            box(side*5.55,pz,.12,.9,.12,'#765333','#67492f','#ad8050',.12);
          }
          box(side*5.55,z+26,.12,.12,45,'#926b41','#795939','#b08b59',.55);
          box(side*5.55,z+26,.12,.12,45,'#926b41','#795939','#b08b59',.82);
          tree(side*(8.0+(kind%2)*1.5),z+14,kind%3,distance,true);
          if(kind%4===0)tree(side*10.4,z+39,kind%2,distance,true);
          for(let patch=0;patch<7;patch++){
            const seed=index*37+patch*13+side*7,scatter=Math.abs(Math.sin(seed*19.1));
            grassClump(side*(6.7+scatter*12.7),z+6+(patch+.5)*5.8,seed,.82+scatter*.42,time);
          }
        }

        if(kind<3||kind===6||kind===8||kind===10){
          const side=kind%2?-1:1,x=side*11.2,h=kind===0?3.6:3.0,hx=x-side*3.3;
          const houseZ=z+21;
          box(x,houseZ,6.6,h,9.3,kind===2?'#d7c9a6':'#e7d7b7','#b9a88b','#f1e4c8',.05,side);
          const roofPoly=(points,color)=>poly(points.map(pt=>{const p=project(...pt);return[p.x,p.y];}),color);
          const ridge=h+1.05,eave=h+.05,left=x-3.7,right=x+3.7,back=houseZ+4.8,front=houseZ-4.8;
          roofPoly([[left,front,eave],[x,front,ridge],[x,back,ridge],[left,back,eave]],'#b74d31');
          roofPoly([[x,front,ridge],[right,front,eave],[right,back,eave],[x,back,ridge]],'#c55b37');
          box(hx,houseZ+1, .10,1.95,1.05,'#70462f','#513621','#d7b081',.1);
          for(const wz of [houseZ-2.5,houseZ+2.6])box(hx,houseZ+1.2,.08,1.0,1.15,'#5a7776','#3e5b5b','#a7c5ad',1.35);
          box(x-side*4.0,houseZ+1,.75,.13,6.4,'#9c7650','#815f3f','#c7a273',h+.02);
          if(kind===0)tree(-6.3,z+12,1,distance,true);
        }

        if(kind===2||kind===5||kind===8){
          const sx=kind===2?-8.7:8.7,stallZ=z+7;
          box(sx,stallZ,4.8,2.8,4.3,'#e7d7b7','#ae9672','#ead9b7',.05);
          box(sx,stallZ,5.4,.16,5.0,'#2874ac','#1f557e','#f4eee0',3.0);
          for(let stripe=-2;stripe<=2;stripe++)box(sx+stripe*.9,stallZ-1.0,.86,.12,2.0,stripe%2?'#f5f1e5':'#2874ac','#2874ac','#ffffff',2.85);
          const signAt=project(sx,stallZ-2.25,2.4);
          ctx.fillStyle='#fff2d2';ctx.font='900 '+Math.max(5,signAt.k*.27)+'px system-ui';ctx.textAlign='center';ctx.fillText(kind===2?'TEA SHOP':'VILLAGE STORE',signAt.x,signAt.y,signAt.k*5);
        }
        if(kind===4||kind===7||kind===11){
          const bx=kind===11?8.8:9.2,stopZ=z+34;
          box(bx,stopZ,4.8,.22,5.5,'#2777a7','#20597c','#2d86b7',2.7);
          for(const dx of [-2,2])box(bx+dx,stopZ,.14,2.7,.18,'#28678a','#215573','#80bdc5',.08);
          box(bx,stopZ-1,3.0,.16,.58,'#906b45','#755333','#b08b59',.65);
          const label=project(bx+2.6,stopZ,2.6);
          ctx.fillStyle='#1974a5';ctx.fillRect(label.x-label.k*.18,label.y-label.k*.35,label.k*.36,label.k*.7);
        }
        if(kind===10||kind===11){
          const board=project(-5.1,z+13,3.2);
          ctx.fillStyle='#245843';ctx.fillRect(board.x-board.k*.82,board.y-board.k*.20,board.k*1.64,board.k*.40);
          ctx.strokeStyle='#f5d27a';ctx.lineWidth=Math.max(1,board.k*.035);ctx.strokeRect(board.x-board.k*.82,board.y-board.k*.20,board.k*1.64,board.k*.40);
          ctx.fillStyle='#fff7dc';ctx.textAlign='center';ctx.font='900 '+Math.max(5,board.k*.20)+'px system-ui';ctx.fillText('SCHOOL ROAD',board.x,board.y+board.k*.07,board.k*1.5);
        }
        if(kind===1||kind===4||kind===7){
          const waterX=side*6.8,waterZ=z+15;
          box(waterX,waterZ,1.4,.03,44,'#64c3d1','#4d9ba8','#a5e3d9',.015);
          const glint=project(waterX,waterZ+((time*3)%36),.05);
          ctx.strokeStyle='rgba(230,255,232,.75)';ctx.lineWidth=Math.max(1,glint.k*.06);
          ctx.beginPath();ctx.moveTo(glint.x-glint.k*.28,glint.y);ctx.lineTo(glint.x+glint.k*.28,glint.y);ctx.stroke();
        }
      }});
      if(anchor===0||(anchor>9500&&index%3===0)){
        const side=index%2===0?-1:1,goatZ=z+17,goatX=side*8.2;
        entries.push({z:goatZ,draw:()=>goat(goatX,goatZ,time,side,index)});
      }
    }
    return entries;
  }

  return {cloudLayer,tree,road,bus,village};
}

function cloudImage(variant) {
  const canvas = document.createElement('canvas');
  canvas.width = 280;
  canvas.height = 116;
  const ctx = canvas.getContext('2d');
  for (let i = 0; i < 55; i++) {
    const x = 25 + (i*83+variant*43)%218;
    const arch = Math.sin((x-24)/221*Math.PI);
    const y = 72-arch*(12+(i*43%35));
    const radius = 10+(i*61%23)*(.5+arch*.5);
    const puff = ctx.createRadialGradient(x,y-radius*.24,0,x,y,radius);
    puff.addColorStop(0,'#f8fafce0');
    puff.addColorStop(.48,'#e3eaf1ac');
    puff.addColorStop(1,'#becddb00');
    ctx.fillStyle = puff;
    ctx.fillRect(x-radius,y-radius,radius*2,radius*2);
  }
  return canvas;
}
