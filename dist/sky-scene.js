import {Group,Shape,ExtrudeGeometry,MeshStandardMaterial,RingGeometry,AdditiveBlending,DoubleSide} from './vendor/three.module.js';
import {flightPhase} from './airliner.js';
import {sceneWeather,hasCollegeRain,cloudX} from './weather.js';
import {createCollegeShower,stormSkyMaterial} from './college-rain3d.js';
import {Mesh,SphereGeometry,MeshBasicMaterial,Color,DataTexture,RGBAFormat,Sprite,SpriteMaterial,LinearFilter,Float32BufferAttribute,BackSide,BufferGeometry,Points,PointsMaterial,LineSegments,LineBasicMaterial} from './vendor/three.module.js';
function texture(glow=false){const w=128,h=64,data=new Uint8Array(w*h*4);const noise=(x,y)=>{const v=Math.sin(x*127.1+y*311.7)*43758.5453;return v-Math.floor(v);};
 const smooth=(x,y)=>{const i=Math.floor(x),j=Math.floor(y);let a=x-i,b=y-j;a=a*a*(3-2*a);b=b*b*(3-2*b);return (noise(i,j)*(1-a)+noise(i+1,j)*a)*(1-b)+(noise(i,j+1)*(1-a)+noise(i+1,j+1)*a)*b;};
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const u=(x/w-.5)*2,v=(y/h-.5)*2;let density=0;
  if(glow)density=Math.exp(-(u*u+v*v)*7)*.6;
  else{for(const [cx,cy,rx,ry]of [[-.4,.10,.39,.3],[0,-.12,.4,.47],[.38,.06,.35,.3]])density+=Math.exp(-((u-cx)**2/rx**2+(v-cy)**2/ry**2)*2);density=Math.max(0,(density-.10)*1.4)*( .58+.42*smooth(x/9,y/9));}
  const i=(y*w+x)*4,shade=glow?255:Math.round(180+65*(y/h)+10*smooth(x/7,y/6));data.set([shade,shade,glow?220:Math.min(255,shade+8),Math.round(Math.min(1,density)*255)],i);
 }const t=new DataTexture(data,w,h,RGBAFormat);t.magFilter=t.minFilter=LinearFilter;t.needsUpdate=true;return t;}
function createRainbowTexture() {
 const w = 256, h = 64;
 const data = new Uint8Array(w * h * 4);
 const stops = [
  { u: 0.00, c: [180, 35, 225], a: 0.0 },
  { u: 0.04, c: [180, 35, 225], a: 0.90 },
  { u: 0.15, c: [160, 25, 220], a: 0.98 }, // Violet
  { u: 0.28, c: [25, 70, 245], a: 0.98 },  // Royal Blue
  { u: 0.42, c: [0, 215, 245], a: 0.98 },  // Cyan / Sky Aqua
  { u: 0.56, c: [20, 225, 60], a: 0.98 },  // Emerald Green
  { u: 0.70, c: [255, 230, 10], a: 0.98 }, // Pure Yellow
  { u: 0.83, c: [255, 120, 0], a: 0.98 },  // Orange
  { u: 0.93, c: [255, 25, 15], a: 0.98 },  // Crimson Red
  { u: 1.00, c: [255, 25, 15], a: 0.0 }
 ];
 function sampleColor(u) {
  u = Math.max(0, Math.min(1, u));
  for (let i = 0; i < stops.length - 1; i++) {
   if (u >= stops[i].u && u <= stops[i+1].u) {
    const f = (u - stops[i].u) / (stops[i+1].u - stops[i].u);
    return [
     stops[i].c[0] + (stops[i+1].c[0] - stops[i].c[0]) * f,
     stops[i].c[1] + (stops[i+1].c[1] - stops[i].c[1]) * f,
     stops[i].c[2] + (stops[i+1].c[2] - stops[i].c[2]) * f,
     stops[i].a + (stops[i+1].a - stops[i].a) * f
    ];
   }
  }
  return [0, 0, 0, 0];
 }
 for (let y = 0; y < h; y++) {
  const v = y / (h - 1);
  const vFade = Math.pow(Math.sin(v * Math.PI), 1.25);
  for (let x = 0; x < w; x++) {
   const u = x / (w - 1);
   const col = sampleColor(u);
   const idx = (y * w + x) * 4;
   data[idx]     = Math.round(col[0]);
   data[idx + 1] = Math.round(col[1]);
   data[idx + 2] = Math.round(col[2]);
   data[idx + 3] = Math.round(col[3] * vFade * 255);
  }
 }
 const tex = new DataTexture(data, w, h, RGBAFormat);
 tex.magFilter = LinearFilter;
 tex.minFilter = LinearFilter;
 tex.needsUpdate = true;
 return tex;
}

function createRainbowMesh() {
 const innerR = 56, outerR = 72, thetaSegs = 64, phiSegs = 20;
 const thetaStart = Math.PI * 0.07, thetaLength = Math.PI * 0.86;
 const geom = new RingGeometry(innerR, outerR, thetaSegs, phiSegs, thetaStart, thetaLength);
 const pos = geom.attributes.position;
 const uv = geom.attributes.uv;
 for (let i = 0; i < pos.count; i++) {
  const x = pos.getX(i), y = pos.getY(i);
  const r = Math.sqrt(x * x + y * y);
  const u = Math.max(0, Math.min(1, (r - innerR) / (outerR - innerR)));
  const theta = Math.atan2(y, x);
  const v = Math.max(0, Math.min(1, (theta - thetaStart) / thetaLength));
  uv.setXY(i, u, v);
 }
 const tex = createRainbowTexture();
 const mat = new MeshBasicMaterial({
  map: tex,
  transparent: true,
  opacity: 0,
  depthWrite: false,
  side: DoubleSide,
  fog: false
 });
 const mesh = new Mesh(geom, mat);
 mesh.name = 'college-rainbow';
 mesh.position.set(0, -22, -200);
 mesh.renderOrder = -5;
 mesh.visible = false;
 return mesh;
}

export function createSky(scene,sun,ambient){
 const DOME_R=320;
 const domeGeometry=new SphereGeometry(DOME_R,24,12),positions=domeGeometry.attributes.position;
 const domeBlend=new Float32Array(positions.count);
 for(let i=0;i<positions.count;i++)domeBlend[i]=Math.pow(Math.max(0,Math.min(1,positions.getY(i)/DOME_R*2)),.65);
 domeGeometry.setAttribute('color',new Float32BufferAttribute(new Float32Array(positions.count*3),3));
 let lastDomeR=-1,lastDomeG=-1,lastDomeB=-1,lastTopR=-1,lastTopG=-1,lastTopB=-1;
 const dome=new Mesh(domeGeometry,new MeshBasicMaterial({side:BackSide,depthWrite:false,vertexColors:true,fog:false}));dome.renderOrder=-10;scene.add(dome);
 const jet=new Group();scene.add(jet);
 const paint=color=>new MeshStandardMaterial({color,roughness:.48});
 const ivory=paint(0xf3f3ef),blue=paint(0x15509a),glass=paint(0x193647);
 const sphere=new SphereGeometry(1,24,16);
 function pod(material,x,y,z,w,h,d){
  const mesh=new Mesh(sphere,material);mesh.scale.set(w,h,d);mesh.position.set(x,y,z);jet.add(mesh);return mesh;
 }
 pod(ivory,0,0,0,.66,.72,4.9);
 pod(glass,0,.30,3.56,.47,.35,.95);
 function foil(points,y,material){
  const shape=new Shape();points.forEach(([x,z],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));
  const mesh=new Mesh(new ExtrudeGeometry(shape,{depth:.10,bevelEnabled:false}),material);
  mesh.rotation.x=-Math.PI/2;mesh.position.y=y;jet.add(mesh);
 }
 for(const side of [-1,1]){
  foil([[0,1.5],[side*5.6,-1.25],[side*5.5,-1.78],[0,-.65]],-.12,ivory);
  foil([[0,-3],[side*2.22,-4.3],[side*2.12,-4.66],[0,-4.05]],.15,blue);
  pod(blue,side*2.15,-.49,.04,.35,.38,1.15);
  pod(glass,side*2.15,-.49,.89,.30,.31,.29);
  for(let j=0;j<10;j++)pod(glass,side*.63,.13,2.5-j*.48,.045,.085,.105);
 }
 const fin=pod(blue,0,.62,-3.65,.10,.97,.62);fin.rotation.x=-.38;
 const gradient=new Color(), destination=new Color(), moonlight=new Color('#a9c5ed'), cloudShadow=new Color('#707c88');

 const disc=new Mesh(new SphereGeometry(2.6,24,16),new MeshBasicMaterial({color:0xfff7d7,fog:false}));scene.add(disc);
 const halo=new Sprite(new SpriteMaterial({map:texture(true),color:0xffdfaa,transparent:true,depthWrite:false,fog:false}));halo.scale.set(28,28,1);scene.add(halo);
 const cloudMap=texture(),clouds=[];for(let i=0;i<12;i++){const g=new Sprite(new SpriteMaterial({map:cloudMap,transparent:true,depthWrite:false,color:0xffffff,opacity:.85,fog:true}));g.scale.set(28+i%3*8,11+i%3*3,1);scene.add(g);clouds.push(g);}

 const moon=new Mesh(new SphereGeometry(3.8,24,16),new MeshBasicMaterial({color:0xe5edff,fog:false}));moon.position.set(52,54,-210);moon.visible=false;scene.add(moon);
 for(let i=0;i<6;i++){const crater=new Mesh(new SphereGeometry(.34+i%3*.16,8,6),new MeshBasicMaterial({color:0xaebed5,fog:false}));const a=i*2.4;crater.position.set(Math.cos(a)*(1.1+i%2*.75),Math.sin(a)*1.5,3.3);moon.add(crater);}
 const starPositions=[];for(let i=0;i<320;i++){const a=i*2.399;starPositions.push(Math.sin(a)*220,24+(i*17%120),-130-(i*13%120));}
 const starGeo=new BufferGeometry();starGeo.setAttribute('position',new Float32BufferAttribute(starPositions,3));const stars=new Points(starGeo,new PointsMaterial({color:0xeaf3ff,size:.55,transparent:true,depthWrite:false,fog:false}));stars.visible=false;scene.add(stars);
 const rainGeo=new BufferGeometry(),drops=new Float32Array(260*6);rainGeo.setAttribute('position',new Float32BufferAttribute(drops,3));const rain=new LineSegments(rainGeo,new LineBasicMaterial({color:0xc7e4ff,transparent:true,opacity:0,depthWrite:false}));scene.add(rain);
 const rainbow=createRainbowMesh();scene.add(rainbow);
 const top=new Color(),horizon=new Color(),warm=new Color('#ffd199'),white=new Color('#fff8e6'),parkTop=new Color('#0078ff'),parkHor=new Color('#64d6ff');
 const parkStormTop=new Color('#10141a'),parkStormHor=new Color('#1b2028');
 const flashHorCol=new Color('#d2e3f8'),flashCloudCol=new Color('#d8e6f8');
 const baseTop=new Color(),baseHor=new Color();
 const clearDome=dome.material,stormClock={value:0};
 let stormDome,updateCollegeShower;
 return s=>{const weather=sceneWeather(s),{phase,night}=weather;
  const isCollege=s?.map==='college';
  const isPark=s?.map==='itpark';
  const inTunnel=isPark&&s?.activeBranch==='underpass';
  const isCollegeRunning=isCollege&&s?.mode!=='ready'&&s?.mode!=='select';
  const isParkRunning=isPark&&s?.mode!=='ready'&&s?.mode!=='select';

  const collegeRainActive=isCollege&&(isCollegeRunning||s?.previewRain)&&weather.rain>.02;
  const parkRainActive=isPark&&isParkRunning&&!inTunnel&&weather.rain>0.05;
  const rainActive=collegeRainActive||parkRainActive;

  if(isCollegeRunning || isParkRunning || (isCollege && s?.previewRain)){
   stormClock.value=s.time || 0;
   stormDome ??= stormSkyMaterial(stormClock);
   updateCollegeShower ??= createCollegeShower(scene);
  }
  const showStorm=isCollege&&(isCollegeRunning||s?.previewRain)&&weather.rain>.35;
  dome.material=showStorm?stormDome:clearDome;
  updateCollegeShower?.(s,rainActive);

  const rainbowActive=isCollege&&(weather.rainbow||0)>.01;
  rainbow.visible=rainbowActive;
  if(rainbowActive){
   rainbow.material.opacity=Math.min(0.96,weather.rainbow*.96);
  }

  const flight=flightPhase(s.time);jet.visible=flight<1;jet.position.set(16-24*flight,14+3*flight,-240+265*flight);jet.rotation.set(.02,-.07,.13*Math.sin(Math.PI*flight));
  const effNight=isPark?0:night;
  baseTop.set(weather.a.top).lerp(destination.set(weather.b.top),weather.mix);
  baseHor.set(weather.a.horizon).lerp(destination.set(weather.b.horizon),weather.mix);
  const stormDark = isPark ? (weather.stormDark || 0) : 0;
  let flashFlicker = false;
  if(isPark){
    baseTop.copy(parkTop).lerp(parkStormTop, stormDark);
    baseHor.copy(parkHor).lerp(parkStormHor, stormDark);

    const t = s?.time || 0;
    const flashCycle = (t + 1.2) % 6.8;
    const isLightningActive = !inTunnel && weather.rain > 0.15 && stormDark > 0.15 && (flashCycle < 0.24);
    flashFlicker = isLightningActive && (flashCycle < 0.07 || (flashCycle > 0.11 && flashCycle < 0.20));
  }
  else if(night<.45&&weather.rain<.35){
    const vivid=Math.max(0,(1-night*2)*(1-weather.rain*2.2)*.38);
    baseTop.lerp(parkTop,vivid);
    baseHor.lerp(parkHor,vivid);
  }

  top.copy(baseTop);
  horizon.copy(baseHor);
  if(isPark && flashFlicker){
    horizon.lerp(flashHorCol, 0.88);
  }

  if(scene.background)scene.background.copy(horizon);
  if(scene.fog)scene.fog.color.copy(horizon);

  // Dome gradient vertex colors update only on gradual weather shifts (avoids costly vertex buffer re-upload during flash)
  const colDirty=Math.abs(baseHor.r-lastDomeR)+Math.abs(baseHor.g-lastDomeG)+Math.abs(baseHor.b-lastDomeB)+Math.abs(baseTop.r-lastTopR)+Math.abs(baseTop.g-lastTopG)+Math.abs(baseTop.b-lastTopB)>.008;
  if(colDirty){
   lastDomeR=baseHor.r;lastDomeG=baseHor.g;lastDomeB=baseHor.b;lastTopR=baseTop.r;lastTopG=baseTop.g;lastTopB=baseTop.b;
   const colAttr=domeGeometry.attributes.color;
   const arr=colAttr.array;
   let ptr=0;
   for(let i=0;i<positions.count;i++){
     const b=domeBlend[i];
     arr[ptr++]=baseHor.r+(baseTop.r-baseHor.r)*b;
     arr[ptr++]=baseHor.g+(baseTop.g-baseHor.g)*b;
     arr[ptr++]=baseHor.b+(baseTop.b-baseHor.b)*b;
   }
   colAttr.needsUpdate=true;
  }
  const lowSun=isPark?0.12:Math.max(0,1-Math.abs(phase-.15)*7);
  const sunFactor=isPark ? (1 - stormDark * 0.85) : (weather.sun??(1-weather.rain));
  sun.color.copy(white).lerp(warm,lowSun).lerp(moonlight,effNight);
  sun.intensity=isPark ? (flashFlicker ? 4.2 : Math.max(0.35, 3.35 - stormDark * 2.85)) : Math.max(0.8,3.35-night*1.95-(1-sunFactor)*1.95);
  ambient.intensity=isPark ? (flashFlicker ? 3.6 : Math.max(0.65, 1.85 - stormDark * 1.15)) : (1.82-night*.88+weather.rain*.22+(isCollege&&sunFactor>.5?.2:0));
  const isNight=!isPark&&night>=.45;
  const sunActive=isPark ? (stormDark < 0.85) : (!isNight&&(weather.rain<.65||(weather.sun||0)>.35));
  disc.visible=sunActive;halo.visible=sunActive;
  if(disc.visible){
    disc.position.set(isPark?54:(64-phase*128),isPark?48:(46+Math.sin(phase*Math.PI*2)*20),-220);
    halo.position.copy(disc.position);
    sun.position.set(disc.position.x*.28,18+9*(1-lowSun),-32);
  }else{
    disc.position.set(0,-500,-220);halo.position.set(0,-500,-220);
  }
  if(scene.fog){scene.fog.near=isPark ? (flashFlicker ? 160 : 120 - stormDark * 40) : (150-50*weather.rain);scene.fog.far=isPark ? (flashFlicker ? 380 : 270 - stormDark * 70) : (325-85*weather.rain);}
  moon.visible=isNight;
  if(moon.visible){
    moon.position.set(58-phase*90,54,-210);
    moon.material.color.set('#e5edff').multiplyScalar(.65+night*.35);
  }else{
    moon.position.set(0,-500,-210);
  }
  stars.visible=isNight;stars.material.opacity=night*.9;stars.rotation.z=-s.time*.002;
  clouds.forEach((g,i)=>{
    g.position.set(cloudX(i,s.time)*1.45,25+i%4*5,-135-i%3*32);
    const shadowWeight=isPark ? (stormDark * 0.95) : Math.max(night*.75,weather.rain*.8*(1-(weather.rainbow||0)*.75));
    g.material.color.set('#ffffff').lerp(cloudShadow,shadowWeight);
    if(isPark && flashFlicker){
      g.material.color.lerp(flashCloudCol, 0.85);
    }
    g.material.opacity=isPark ? (0.85 + stormDark * 0.15) : (.7+weather.rain*.25);
  });
  rain.visible = !isPark && !isCollege && !inTunnel && weather.rain > 0.02;
  rain.material.opacity = weather.rain * .65;
  if(rain.visible){for(let i=0;i<260;i++){const x=(i*7.17%22)-11,y=(((i*.73-s.time*17)%14)+14)%14,z=3-(i*3.71%35),n=i*6;drops.set([x,y,z,x-.10,y-.65,z+.12],n);}rainGeo.attributes.position.needsUpdate=true;}
  return weather;
 };
}
