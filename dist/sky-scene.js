import {Group,Mesh,SphereGeometry,MeshBasicMaterial,MeshStandardMaterial,Color} from './vendor/three.module.js';
// A continuous three-minute daylight loop; gameplay time freezes it on pause.
export function daylight(time){const phase=(time%180)/180;return {phase,noon:(1-Math.cos(phase*Math.PI*2))/2};}
export function createSky(scene,sun,ambient){
 const geometry=new SphereGeometry(1,16,10),cloudMat=new MeshStandardMaterial({color:0xffffff,roughness:1});
 const disc=new Mesh(geometry,new MeshBasicMaterial({color:0xffec97,fog:false}));disc.scale.setScalar(3.3);scene.add(disc);
 const clouds=[];for(let i=0;i<12;i++){const g=new Group();for(const [x,y,r] of [[0,0,3.4],[-2,1,2.2],[1.5,1.2,2.7]]){const m=new Mesh(geometry,cloudMat);m.position.set(x,y,0);m.scale.set(r,r*.58,r*.68);g.add(m);}scene.add(g);clouds.push(g);}
 const morning=new Color('#f7c19c'),blue=new Color('#53b9f4'),haze=new Color('#b9e7f2'),warm=new Color('#ffce9f'),white=new Color('#fff5dd');
 return s=>{const {phase,noon}=daylight(s.time);scene.background.copy(morning).lerp(blue,.4+.6*noon);scene.fog.color.copy(morning).lerp(haze,.35+.65*noon);sun.color.copy(warm).lerp(white,noon);sun.intensity=2.5+noon*.7;ambient.intensity=1.8+noon*.3;
  disc.position.set(-48*Math.cos(phase*2*Math.PI),20+30*noon,-100);sun.position.set(disc.position.x*.3,20+noon*15,10);clouds.forEach((g,i)=>{g.position.set(((i*19+s.time*(.22+i%3*.07)+110)%220)-110,19+i%4*3,-80-i%3*19);});
 };
}
