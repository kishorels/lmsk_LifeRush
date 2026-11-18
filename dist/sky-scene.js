import {Mesh,SphereGeometry,MeshBasicMaterial,Color,DataTexture,RGBAFormat,Sprite,SpriteMaterial,LinearFilter,Float32BufferAttribute,BackSide} from './vendor/three.module.js';
export function daylight(time){const phase=(time%180)/180;return {phase,noon:(1-Math.cos(phase*Math.PI*2))/2};}
function texture(glow=false){const w=128,h=64,data=new Uint8Array(w*h*4);const noise=(x,y)=>{const v=Math.sin(x*127.1+y*311.7)*43758.5453;return v-Math.floor(v);};
 const smooth=(x,y)=>{const i=Math.floor(x),j=Math.floor(y);let a=x-i,b=y-j;a=a*a*(3-2*a);b=b*b*(3-2*b);return (noise(i,j)*(1-a)+noise(i+1,j)*a)*(1-b)+(noise(i,j+1)*(1-a)+noise(i+1,j+1)*a)*b;};
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const u=(x/w-.5)*2,v=(y/h-.5)*2;let density=0;
  if(glow)density=Math.exp(-(u*u+v*v)*7)*.6;
  else{for(const [cx,cy,rx,ry]of [[-.4,.10,.39,.3],[0,-.12,.4,.47],[.38,.06,.35,.3]])density+=Math.exp(-((u-cx)**2/rx**2+(v-cy)**2/ry**2)*2);density=Math.max(0,(density-.10)*1.4)*( .58+.42*smooth(x/9,y/9));}
  const i=(y*w+x)*4,shade=glow?255:Math.round(238+17*(1-y/h));data.set([shade,shade,glow?220:255,Math.round(Math.min(1,density)*255)],i);
 }const t=new DataTexture(data,w,h,RGBAFormat);t.magFilter=t.minFilter=LinearFilter;t.needsUpdate=true;return t;}
export function createSky(scene,sun,ambient){
 const domeGeometry=new SphereGeometry(165,24,12),positions=domeGeometry.attributes.position;
 domeGeometry.setAttribute('color',new Float32BufferAttribute(new Float32Array(positions.count*3),3));
 const dome=new Mesh(domeGeometry,new MeshBasicMaterial({side:BackSide,depthWrite:false,vertexColors:true,fog:false}));dome.renderOrder=-10;scene.add(dome);
 const gradient=new Color();

 const disc=new Mesh(new SphereGeometry(1.35,24,16),new MeshBasicMaterial({color:0xfff7d7,fog:false}));scene.add(disc);
 const halo=new Sprite(new SpriteMaterial({map:texture(true),color:0xffdfaa,transparent:true,depthWrite:false,fog:false}));halo.scale.set(15,15,1);scene.add(halo);
 const cloudMap=texture(),clouds=[];for(let i=0;i<12;i++){const g=new Sprite(new SpriteMaterial({map:cloudMap,transparent:true,depthWrite:false,color:0xffffff,opacity:.85,fog:true}));g.scale.set(20+i%3*5,8+i%3*2,1);scene.add(g);clouds.push(g);}
 const morning=new Color('#f7c19c'),blue=new Color('#409ce8'),haze=new Color('#c3e6f7'),warm=new Color('#ffce9f'),white=new Color('#fff5dd');
 return s=>{const {phase,noon}=daylight(s.time);scene.background.copy(morning).lerp(blue,.4+.6*noon);scene.fog.color.copy(morning).lerp(haze,.35+.65*noon);for(let i=0;i<positions.count;i++){const blend=Math.pow(Math.max(0,Math.min(1,positions.getY(i)/165*2)),.65);gradient.copy(scene.fog.color).lerp(blue,blend);domeGeometry.attributes.color.setXYZ(i,gradient.r,gradient.g,gradient.b);}domeGeometry.attributes.color.needsUpdate=true;sun.color.copy(warm).lerp(white,noon);sun.intensity=2.5+noon*.7;ambient.intensity=1.8+noon*.3;
  disc.position.set(-48*Math.cos(phase*2*Math.PI),20+30*noon,-100);halo.position.copy(disc.position);sun.position.set(disc.position.x*.3,20+noon*15,10);clouds.forEach((g,i)=>{g.position.set(((i*19+s.time*(.22+i%3*.07)+110)%220)-110,19+i%4*3,-80-i%3*19);});
 };
}
