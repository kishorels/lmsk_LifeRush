import {GRANDFATHER_GATE} from './grandfather-route.js';
import {planting,greeterStart,greeterSpacing,greetingFrame,propSizes} from './elder-landscape.js';
import {SECTION_LENGTH,villageLayout,houseTypes,cowPose} from './village-layout.js';
const streetImage = name => {
  const image = new Image();
  image.src = new URL('./assets/street/' + name + '.webp', import.meta.url).href;
  return image;
};

export function createLiteScenery(ctx, project, polygon, box) {
  const asphalt = streetImage('asphalt');
  const pavers = streetImage('pavers');
  const trees = ['neem', 'palm'].map(streetImage);
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

  const villageImages = {};
  const elderImages={};
  function elderImage(name){
    if(!elderImages[name]){
      const img=new Image();img.src=new URL('./assets/elder/'+name+'.webp',import.meta.url).href;
      elderImages[name]=img;
    }
    return elderImages[name];
  }
  function groundShade(x,z,width){
    const shade=elderImage('shadow'),p=project(x,z);
    if(shade.naturalWidth)ctx.drawImage(shade,p.x-width*p.k*.55,p.y-width*p.k*.085,width*p.k*1.1,width*p.k*.17);
  }
  const layouts=new Map();
  function village(distance,time,elder=false) {
    if(!villageImages.plaster){
      for(const name of [...houseTypes.map((_,i)=>'front-'+i),'plaster','tile','thatch','cow0','cow1','cow2','cow3','canal-clear','banana','haycart','well','palm','goat','grass','paddy','verge','lane','earth','neem']){
        const image=new Image();
        image.src=new URL((name==='neem'?'./assets/street/':'./assets/village/')+name+'.webp',import.meta.url).href;
        villageImages[name]=image;
      }
    }
    const entries=[];
    function add(name,x,z,width,height,sway=0){
      if(z<-.8||z>170)return;
      entries.push({z,draw:()=>{
        const img=villageImages[name],p=project(x,z);
        if(!img.naturalWidth)return;
        ctx.save();ctx.translate(p.x,p.y);ctx.rotate(sway);if(width<0){ctx.scale(-1,1);width=-width;}
        ctx.drawImage(img,-width*p.k/2,-height*p.k,width*p.k,height*p.k);
        ctx.restore();
      }});
    }
    // Each surface is projected separately so the porch, eaves and side wall
    // change perspective as the runner passes the house.
    function house(o,z){
      if(z<0 || z>170)return;
      entries.push({z,draw:()=>{
        const yaw=o.yaw??(1.03+o.angle*.5),cs=Math.cos(yaw),sn=Math.sin(yaw);
        const w=o.w*(o.type==='veranda'?1.15:1)/2,d=o.h*.475,h=o.h*.59;
        const point=(x,y,depth)=>project(o.x+x*cs+depth*sn,z+x*sn-depth*cs,y+.19);
        function face(points,name,color){
          const q=points.map(pt=>point(...pt));
          polygon(q.map(p=>[p.x,p.y]),color);
          const img=villageImages[name];
          if(!img?.naturalWidth)return;
          // UV corners are top-left, top-right, bottom-right, bottom-left.
          const src=[[0,0],[img.width,0],[img.width,img.height],[0,img.height]];
          for(const ids of [[0,1,2],[0,2,3]]){
            const [a,b,c]=ids.map(i=>q[i]),[u,v,r]=ids.map(i=>src[i]);
            const dx=v[0]-u[0],dy=v[1]-u[1],ex=r[0]-u[0],ey=r[1]-u[1],det=dx*ey-ex*dy;
            const A=((b.x-a.x)*ey-(c.x-a.x)*dy)/det,B=((b.y-a.y)*ey-(c.y-a.y)*dy)/det;
            const C=((c.x-a.x)*dx-(b.x-a.x)*ex)/det,D=((c.y-a.y)*dx-(b.y-a.y)*ex)/det;
            ctx.save();ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.lineTo(c.x,c.y);ctx.closePath();ctx.clip();
            ctx.transform(A,B,C,D,a.x-A*u[0]-C*u[1],a.y-B*u[0]-D*u[1]);ctx.drawImage(img,0,0);ctx.restore();
          }
        }
        const top=h+.35,flat=o.type==='pink',ridge=top+(flat?.16:d*(o.type==='thatched'?.57:.33));
        const side=(point(w,0,0).x>point(0,0,0).x?-1:1)*w;
        face([[side,top,-d],[side,top,d],[side,0,d],[side,0,-d]],'plaster','#ad9374');
        const gable=[point(side,top,-d),point(side,ridge,0),point(side,top,d)];
        polygon(gable.map(p=>[p.x,p.y]),'#b19b7c');
        face([[-w,top,d],[w,top,d],[w,.28,d],[-w,.28,d]],'front-'+houseTypes.indexOf(o.type),'#d3bea0');
        const roof=flat?'plaster':o.type==='thatched'?'thatch':'tile';
        face([[-w-.34,ridge,0],[w+.34,ridge,0],[w+.34,top,d+.35],[-w-.34,top,d+.35]],roof,'#955637');
        face([[-w,.30,d],[w,.30,d],[w,.30,d+1.2],[-w,.30,d+1.2]],'plaster','#ae987c');
        for(const x of [-w*.82,w*.82])face([[x-.08,h*.83,d+1],[x+.08,h*.83,d+1],[x+.08,.30,d+1],[x-.08,.30,d+1]],null,'#62412b');
        face([[-w-.14,h*.88,d],[w+.14,h*.88,d],[w+.14,h*.81,d+1.3],[-w-.14,h*.81,d+1.3]],roof,'#936448');
      }});
    }
    if(elder){
      const verge=elderImage('verge'),earth=elderImage('path');
      const surfaces=[[-15,-3.66,verge,'#80834f'],[-3.68,3.68,earth,'#bd9169'],[3.66,15,verge,'#80834f']];
      const step=1.5,period=8;
      for(let row=Math.floor((distance+172)/step);row>=Math.floor((distance-2)/step);row--){
        const near=Math.max(-2,row*step-distance),far=(row+1)*step-distance;
        if(far<=near)continue;
        for(const [left,right,img,color] of surfaces){
          const a=project(left,near),b=project(right,near),c=project(right,far),d=project(left,far);
          ctx.save();ctx.beginPath();ctx.moveTo(a.x,a.y+.5);ctx.lineTo(b.x,b.y+.5);
          ctx.lineTo(c.x,c.y-.5);ctx.lineTo(d.x,d.y-.5);ctx.closePath();
          ctx.fillStyle=color;ctx.fill();
          if(img.naturalWidth){
            ctx.clip();
            const crop=img.height/period,sy=(period-1-(row%period+period)%period)*crop;
            const hh=a.y-d.y,sourceH=crop*(far-near)/step;
            // Match the road width at both ends of the slice, especially underfoot.
            const strips=Math.max(1,Math.ceil(hh/7));
            for(let band=0;band<strips;band++){
              const t=(band+.5)/strips;
              const l=d.x+(a.x-d.x)*t,r=c.x+(b.x-c.x)*t;
              ctx.drawImage(img,0,sy+sourceH*band/strips,img.width,sourceH/strips,l-.6,d.y+hh*band/strips-.5,r-l+1.2,hh/strips+1);
            }
          }
          ctx.restore();
        }
      }
      const first=Math.floor(distance/6)-1;
      for(let i=first;i<first+30;i++){
        const z=i*6-distance+3;
        if(z<0||z>170)continue;
        for(const side of [-1,1]){
          const x=side*3.98;
          entries.push({z,draw:()=>{
            for(const y of [.38,.77])box(x,z,.14,.13,6,'#b18252','#926337','#cd9d62',y);
            box(x,z,.19,1.04,.22,'#99643b','#805634','#d19c61');
          }});
          const n=Math.abs(i+(side===1?2:0));
          if(n%4===0)house({type:houseTypes[n/4%6],x:side*8.7,h:4.8,w:6.8,yaw:-side*.65},z);
          const name=n%3?'wildflowers':'jasmine';
          villageImages[name]=elderImage(name);
          add(name,side*(4.5+.63*Math.sin(i*3.8)),z,1.1+.4*Math.cos(i),.68,.035*Math.sin(time*1.5+i));

        }
      }
      const firstSection=Math.floor(distance/28)-1;
      for(let index=firstSection;index<firstSection+8;index++){
        const centre=(index+.5)*28;
        for(const side of [-1,1])for(const tree of planting((index%4+4)%4,side)){
          const z=centre-tree.z-distance+3;
          if(z<0||z>165)continue;
          entries.push({z,draw:()=>{
            const img=tree.name==='neem'?villageImages.neem:elderImage(tree.name);
            if(!img.naturalWidth)return;
            groundShade(tree.x+.45,z,tree.w);
            const p=project(tree.x,z),w=tree.w*p.k,h=tree.h*p.k;
            // Shear connected strips continuously. Root stays planted while the crown catches the gust.
            const phase=time*1.55+centre*.021+tree.z*.27+tree.x*.35;
            const shift=u=>tree.bend*p.k*u*u*(Math.sin(phase)+.37*Math.sin(phase*.63+u*3.5));
            const bands=z<50?8:3;
            for(let j=0;j<bands;j++){
              const u=1-j/bands,v=1-(j+1)/bands,dy=h/bands,top=p.y-u*h;
              ctx.save();ctx.translate(p.x-w/2+shift(u),top);
              ctx.transform(1,0,(shift(v)-shift(u))/Math.max(.01,dy),1,0,0);
              ctx.drawImage(img,0,img.height*j/bands,img.width,img.height/bands,0,0,w,dy+.5);
              ctx.restore();
            }
          }});
        }
      }
      const visit=Math.max(0,Math.ceil((distance-greeterStart-6)/greeterSpacing)),at=greeterStart+visit*greeterSpacing,z=at-distance+3;
      if(at<=GRANDFATHER_GATE&&z>0&&z<98)entries.push({z,draw:()=>{
        const img=elderImage('greeting'),x=visit%2?4.52:-4.52,p=project(x,z),f=greetingFrame(at-distance);
        if(!img.naturalWidth)return;
        groundShade(x,z,.9);
        ctx.drawImage(img,(f%8)*img.width/8,Math.floor(f/8)*img.height/4,img.width/8,img.height/4,p.x-.49*p.k,p.y-1.86*p.k,.98*p.k,1.86*p.k);
      }});
      return entries;
    }
    roadStrip(-36,-11.95,villageImages.verge,8,distance,'#708249');
    roadStrip(-11.95,-6.45,villageImages['canal-clear'],32,distance+time*.045,'#438a98');
    roadStrip(-6.45,-3.55,villageImages.verge,8,distance,'#708249');
    roadStrip(3.55,8,villageImages.verge,6,distance,'#769042');
    roadStrip(8,65,villageImages.paddy,12,distance,'#879d69');
    roadStrip(-3.55,3.55,villageImages.lane,32,distance,'#787068');
    const first=Math.max(0,Math.floor((distance-10)/SECTION_LENGTH));
    for(const key of layouts.keys())if(key<first||key>first+4)layouts.delete(key);
    for(let i=first;i<=first+4;i++){
      if(!layouts.has(i)){
        const layout=villageLayout(i);
        const random=layout.random;
        for(let j=0;j<40;j++){
          const side=j%2?1:-1;
          layout.items.push({type:'grass',x:side*(4.1+random()*(side<0?2.2:3)),z:-random()*64,w:.35+random()*.48,h:.16+random()*.29});
        }
        layouts.set(i,layout.items);
      }
      for(const o of layouts.get(i)){
        const z=i*SECTION_LENGTH-o.z-distance+3;
        if(houseTypes.includes(o.type)){house(o,z);continue;}
        if(o.type==='cow'){
          const pose=cowPose(time,i);
          add('cow'+pose.frame,o.x+pose.offset,z,o.w*pose.flip,o.h);
          continue;
        }
        const sway=['palm','banana','neem','grass'].includes(o.type)?.034*Math.sin(time*1.55+i+o.z):0;
        add(o.type,o.x,z,o.w,o.h,sway);
      }
    }
    return entries;
  }

  function villageProp(variant,x,z){
    const size=propSizes[variant],img=size&&elderImage(variant);
    if(img?.naturalWidth){
      const p=project(x,z),left=project(x-size[0]/2,z).x,right=project(x+size[0]/2,z).x;
      groundShade(x,z,size[0]);
      ctx.drawImage(img,left,p.y-size[1]*p.k,right-left,size[1]*p.k);
      return;
    }
    const timber=(dx,y,w,h,d)=>box(x+dx,z,w,h,d,'#955c34','#704329','#c99051',y);
    const oval=(dx,y,w,h,color)=>{
      const p=project(x+dx,z,y);
      ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(p.x,p.y,w*p.k,h*p.k,0,0,Math.PI*2);ctx.fill();
    };
    switch(variant){
      case 'logs':
        for(const y of [0,.34,.65])timber(0,y,6.4,.29,.48);
        break;
      case 'fence':
        for(const y of [.32,.75])timber(0,y,6.1,.17,.19);
        for(const dx of [-2.9,0,2.9])timber(dx,0,.23,1.05,.22);
        break;
      case 'cloth':
        for(const dx of [-3,3])timber(dx,0,.30,2.9,.38);
        timber(0,2.55,6.5,.37,.44);
        for(let i=0;i<7;i++)box(x+(i-3)*.84,z-.05,.76,.75,.06,['#bb4141','#e5af43','#3d799c'][i%3],undefined,undefined,1.8);
        break;
      case 'haycart':
        for(const dx of [-.82,.82])oval(dx,.42,.25,.4,'#4c3b2b');
        timber(0,.48,1.95,.68,2.38);oval(0,1.34,.92,.52,'#ddb148');
        break;
      case 'arch':
      case 'temple':
        for(const dx of [-2.9,2.9])box(x+dx,z,.8,2.45,1.3,'#aa9673');
        for(let i=0;i<15;i++){
          const a=i*Math.PI/14,dx=2.9*Math.cos(a),y=2.38+2.9*Math.sin(a);
          box(x+dx,z,.8,.65,1.32,i%2?'#b19e80':'#bcaa8c');
        }
        if(variant==='temple')for(let i=0;i<5;i++)box(x,z,8.4-i*1.35,.89,3.1,'#edd396','#b99565','#b8693f',5.55+i*.88);
        break;
      case 'pot':
        oval(0,.4,.56,.42,'#b8653a');oval(0,.79,.29,.09,'#713b29');break;
      case 'rock':
        oval(0,.57,.85,.68,'#9b8e7b');break;
      case 'crate':
        timber(0,0,1.65,1.05,1.1);for(const dx of [-.66,.66])timber(dx,0,.14,1.08,.13);break;
    }
  }
  function elderHorizon(w,h,distance){
    const img=elderImage('horizon');
    if(!img.naturalWidth)return;
    const height=h*.43,width=Math.max(w*1.18,height*img.width/img.height);
    ctx.drawImage(img,(w-width)*(.5+.12*Math.sin(distance/78)),0,width,height);
  }
  return {cloudLayer,tree,road,bus,village,villageProp,elderHorizon};
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
