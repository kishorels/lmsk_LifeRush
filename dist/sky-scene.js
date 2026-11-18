import {Group,Shape,ExtrudeGeometry,MeshStandardMaterial} from './vendor/three.module.js';
import {flightPhase} from './airliner.js';
import {weatherAt,cloudX} from './weather.js';
import {Mesh,SphereGeometry,MeshBasicMaterial,Color,DataTexture,RGBAFormat,Sprite,SpriteMaterial,LinearFilter,Float32BufferAttribute,BackSide,BufferGeometry,Points,PointsMaterial,LineSegments,LineBasicMaterial} from './vendor/three.module.js';
function texture(glow=false){const w=128,h=64,data=new Uint8Array(w*h*4);const noise=(x,y)=>{const v=Math.sin(x*127.1+y*311.7)*43758.5453;return v-Math.floor(v);};
 const smooth=(x,y)=>{const i=Math.floor(x),j=Math.floor(y);let a=x-i,b=y-j;a=a*a*(3-2*a);b=b*b*(3-2*b);return (noise(i,j)*(1-a)+noise(i+1,j)*a)*(1-b)+(noise(i,j+1)*(1-a)+noise(i+1,j+1)*a)*b;};
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const u=(x/w-.5)*2,v=(y/h-.5)*2;let density=0;
  if(glow)density=Math.exp(-(u*u+v*v)*7)*.6;
  else{for(const [cx,cy,rx,ry]of [[-.4,.10,.39,.3],[0,-.12,.4,.47],[.38,.06,.35,.3]])density+=Math.exp(-((u-cx)**2/rx**2+(v-cy)**2/ry**2)*2);density=Math.max(0,(density-.10)*1.4)*( .58+.42*smooth(x/9,y/9));}
  const i=(y*w+x)*4,shade=glow?255:Math.round(180+65*(y/h)+10*smooth(x/7,y/6));data.set([shade,shade,glow?220:Math.min(255,shade+8),Math.round(Math.min(1,density)*255)],i);
 }const t=new DataTexture(data,w,h,RGBAFormat);t.magFilter=t.minFilter=LinearFilter;t.needsUpdate=true;return t;}
export function createSky(scene,sun,ambient){
 const domeGeometry=new SphereGeometry(165,24,12),positions=domeGeometry.attributes.position;
 domeGeometry.setAttribute('color',new Float32BufferAttribute(new Float32Array(positions.count*3),3));
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

 const disc=new Mesh(new SphereGeometry(1.35,24,16),new MeshBasicMaterial({color:0xfff7d7,fog:false}));scene.add(disc);
 const halo=new Sprite(new SpriteMaterial({map:texture(true),color:0xffdfaa,transparent:true,depthWrite:false,fog:false}));halo.scale.set(15,15,1);scene.add(halo);
 const cloudMap=texture(),clouds=[];for(let i=0;i<12;i++){const g=new Sprite(new SpriteMaterial({map:cloudMap,transparent:true,depthWrite:false,color:0xffffff,opacity:.85,fog:true}));g.scale.set(20+i%3*5,8+i%3*2,1);scene.add(g);clouds.push(g);}

 const moon=new Mesh(new SphereGeometry(2,24,16),new MeshBasicMaterial({color:0xe5edff,fog:false}));moon.position.set(28,29,-95);moon.visible=false;scene.add(moon);
 for(let i=0;i<6;i++){const crater=new Mesh(new SphereGeometry(.18+i%3*.09,8,6),new MeshBasicMaterial({color:0xaebed5,fog:false}));const a=i*2.4;crater.position.set(Math.cos(a)*(.6+i%2*.4),Math.sin(a)*.8,1.74);moon.add(crater);}
 const starPositions=[];for(let i=0;i<320;i++){const a=i*2.399;starPositions.push(Math.sin(a)*125,14+(i*17%70),-60-(i*13%70));}
 const starGeo=new BufferGeometry();starGeo.setAttribute('position',new Float32BufferAttribute(starPositions,3));const stars=new Points(starGeo,new PointsMaterial({color:0xeaf3ff,size:.35,transparent:true,depthWrite:false,fog:false}));stars.visible=false;scene.add(stars);
 const rainGeo=new BufferGeometry(),drops=new Float32Array(260*6);rainGeo.setAttribute('position',new Float32BufferAttribute(drops,3));const rain=new LineSegments(rainGeo,new LineBasicMaterial({color:0xc7e4ff,transparent:true,opacity:0,depthWrite:false}));scene.add(rain);
 const top=new Color(),horizon=new Color(),warm=new Color('#ffce9f'),white=new Color('#fff5dd');
 return s=>{const weather=weatherAt(s.time),{phase,night}=weather;
  const flight=flightPhase(s.time);jet.visible=flight<1;jet.position.set(10-12*flight,10+2*flight,-145+170*flight);jet.rotation.set(.02,-.07,.13*Math.sin(Math.PI*flight));
  top.set(weather.a.top).lerp(destination.set(weather.b.top),weather.mix);horizon.set(weather.a.horizon).lerp(destination.set(weather.b.horizon),weather.mix);
  scene.background.copy(horizon);scene.fog.color.copy(horizon);
  for(let i=0;i<positions.count;i++){const blend=Math.pow(Math.max(0,Math.min(1,positions.getY(i)/165*2)),.65);gradient.copy(horizon).lerp(top,blend);domeGeometry.attributes.color.setXYZ(i,gradient.r,gradient.g,gradient.b);}domeGeometry.attributes.color.needsUpdate=true;
  const lowSun=Math.max(0,1-Math.abs(phase-.15)*7);sun.color.copy(white).lerp(warm,lowSun).lerp(moonlight,night);sun.intensity=2.8-night*2.05-weather.rain*2.42;ambient.intensity=1.46-night*.90+weather.rain*.16;
  const isNight=night>=.45;
  disc.visible=!isNight&&weather.rain<.7;halo.visible=disc.visible;
  if(disc.visible){
    disc.position.set(36-phase*72,25+Math.sin(phase*Math.PI*2)*12,-100);
    halo.position.copy(disc.position);
    sun.position.set(disc.position.x*.42,18+9*(1-lowSun),-32);
  }else{
    disc.position.set(0,-500,-100);halo.position.set(0,-500,-100);
  }
  scene.fog.near=75-37*weather.rain;scene.fog.far=172-57*weather.rain;
  moon.visible=isNight;
  if(moon.visible){
    moon.position.set(34-phase*50,29,-95);
    moon.material.color.set('#e5edff').multiplyScalar(.65+night*.35);
  }else{
    moon.position.set(0,-500,-95);
  }
  stars.visible=isNight;stars.material.opacity=night*.9;stars.rotation.z=-s.time*.002;
  clouds.forEach((g,i)=>{g.position.set(cloudX(i,s.time),17+i%4*3,-72-i%3*19);g.material.color.set('#ffffff').lerp(cloudShadow,Math.max(night*.75,weather.rain*.8));g.material.opacity=.7+weather.rain*.25;});
  rain.visible=weather.rain>.02;rain.material.opacity=weather.rain*.58;
  if(rain.visible){for(let i=0;i<260;i++){const x=(i*7.17%22)-11,y=(((i*.73-s.time*17)%14)+14)%14,z=3-(i*3.71%35),n=i*6;drops.set([x,y,z,x-.10,y-.65,z+.12],n);}rainGeo.attributes.position.needsUpdate=true;}
  return weather;
 };
}
