import {createCampus} from './campus-scene.js';
import {createTraffic} from './traffic-scene.js';
import * as T from './vendor/three.module.js';
import {createSchoolEntrance} from './school-scene.js';
import {createCaptureScene} from './capture-scene.js';
import {loadChaserModel} from './chaser-model.js';
import {loadRunnerModel} from './runner-model.js';
import {height,JUMP_DURATION,ROLL_DURATION,FALL_DURATION,HIT_DURATION,isCapture,capturePose} from './engine.js';
const COLORS=[0xffce36,0x73ffb3,0x8edcff];
export function createRenderer(canvas){
 const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.3;
 const scene=new T.Scene();scene.background=new T.Color('#a5c9dc');scene.fog=new T.Fog('#b9d0d5',85,175);
 const camera=new T.PerspectiveCamera(57,1,.1,180);camera.position.set(0,5.4,8.5);camera.lookAt(0,1,-18);
 scene.add(new T.HemisphereLight(0xe9fdff,0x65a889,2.5));const sun=new T.DirectionalLight(0xffead0,3.2);sun.position.set(-15,26,15);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-20,right:20,top:22,bottom:-26,near:1,far:80});sun.shadow.bias=-.001;scene.add(sun);sun.target.position.set(0,0,-13);scene.add(sun.target);
 const mats=new Map();function mat(c){if(!mats.has(c))mats.set(c,new T.MeshStandardMaterial({color:c,roughness:.78}));return mats.get(c);}
 const cube=new T.BoxGeometry(1,1,1),sphere=new T.SphereGeometry(1,12,8),cyl=new T.CylinderGeometry(1,1,1,8),cone=new T.ConeGeometry(1,1,7),ringGeometry=new T.TorusGeometry(.32,.075,6,16);
 function mesh(g,c,parent,x,y,z,sx=1,sy=1,sz=1,shadow=false){const m=new T.Mesh(g,mat(c));m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=shadow;m.receiveShadow=true;parent.add(m);return m;}
 const box=(p,c,x,y,z,sx,sy,sz,sh=false)=>mesh(cube,c,p,x,y,z,sx,sy,sz,sh);
 const ball=(p,c,x,y,z,sx,sy=sx,sz=sx,sh=false)=>mesh(sphere,c,p,x,y,z,sx,sy,sz,sh);
 box(scene,0x71926b,0,-.34,-65,240,.3,200);box(scene,0xeee1ad,0,-.12,-65,14,.3,200);box(scene,0x646f76,0,.02,-65,7.1,.14,200);box(scene,0xf8f0d0,-4.4,.06,-65,1.65,.22,200);box(scene,0xf8f0d0,4.4,.06,-65,1.65,.22,200);
 const updateCampus=createCampus(scene);
 // Puffy clouds and distant candy-coloured skyline.
 for(let i=0;i<9;i++){const g=new T.Group();scene.add(g);g.position.set((i-4)*12,16+i%3*3,-85-i%2*25);ball(g,0xffffff,0,0,0,4,1.2,1.6);ball(g,0xffffff,-2,1,0,2,1.8,1.6);ball(g,0xffffff,1,1.3,0,2.5,2,1.5);}
 const runner=new T.Group();scene.add(runner);const body=new T.Group();runner.add(body);
 const updateRunnerModel=loadRunnerModel(runner);
 const updateChaserModel=loadChaserModel(scene);
 const capture=createCaptureScene(scene);
 const updateSchool=createSchoolEntrance(scene);
 const updateTraffic=createTraffic(scene);
 const torso=ball(body,0xffcb38,0,1.25,0,.33,.46,.23,true);box(body,0x17a4a3,0,1.22,.22,.4,.47,.15,true);box(body,0x86ead6,0,1.23,.31,.24,.24,.05);box(body,0xffe67a,0,1.27,.35,.16,.06,.025);for(const side of [-1,1])box(body,0x16857f,side*.21,1.34,.17,.055,.55,.07);const head=ball(body,0xd9986f,0,1.91,0,.255,.28,.24,true);ball(body,0x273455,0,2.07,-.01,.27,.16,.25,true);const cap=ball(body,0xf65d78,0,2.16,0,.29,.11,.27,true);box(body,0xf65d78,0,2.11,-.22,.4,.045,.25);const pony=ball(body,0x273455,0,1.95,.28,.12,.26,.14,true);
 // Front details for the lightweight character mesh used by the female option.
 for(const x of [-.089,.089]){
   ball(body,0xfff4e1,x,1.94,-.229,.045,.036,.020);
   ball(body,0x29283b,x,1.941,-.247,.018,.024,.008);
   ball(body,0x342737,x,1.993,-.225,.043,.009,.012);
 }
 ball(body,0x813c40,0,1.835,-.226,.042,.014,.012);
 const legs=[],arms=[];for(const side of [-1,1]){const leg=new T.Group();leg.position.set(side*.17,.88,0);body.add(leg);mesh(cyl,0x283962,leg,0,-.21,0,.12,.45,.12,true);const knee=new T.Group();knee.position.y=-.42;leg.add(knee);mesh(cyl,0x344771,knee,0,-.18,0,.10,.38,.1,true);box(knee,0xffffff,0,-.4,-.08,.25,.17,.42,true);box(knee,0xf66d7d,0,-.35,-.1,.26,.05,.26);legs.push({leg,knee});const arm=new T.Group();arm.position.set(side*.36,1.53,0);body.add(arm);mesh(cyl,0xffcb38,arm,0,-.12,0,.115,.26,.115,true);mesh(cyl,0xd9986f,arm,0,-.35,0,.085,.3,.085,true);ball(arm,0xe7ae84,0,-.52,0,.09);arms.push(arm);}
 // Pooled obstacles / pickup models: no geometry allocation during a run.
 const pool=[];for(let i=0;i<32;i++){const root=new T.Group();scene.add(root);root.visible=false;pool.push(root);}
 function clear(g){while(g.children.length)g.remove(g.children[0]);}
 function obstacle(g,o){clear(g);if(o.type==='block'){box(g,0x8261bb,0,1.15,0,1.45,2.3,1.2,true);box(g,0xb7a1ee,0,2.32,0,1.55,.12,1.3);for(const x of [-.52,.52])box(g,0xd9c9ff,x,1.15,.62,.09,2,.04);box(g,0xf5dd6f,0,1.2,.64,.6,.55,.06);const bar=box(g,0x8466ad,0,1.2,.69,.42,.09,.03);bar.rotation.z=.78;}else if(o.type==='jump'){box(g,0xff794b,0,.4,0,1.8,.8,.5,true);for(let j=0;j<4;j++){const b=box(g,0xfff4d4,-.65+j*.43,.42,.26,.2,.65,.03);b.rotation.z=-.35;}box(g,0xffc33e,0,.84,0,1.94,.08,.6);}else if(o.type==='slide'){for(const x of [-.88,.88])box(g,0x14b9be,x,1.3,0,.16,2.6,.35,true);box(g,0x18c7be,0,2.1,0,1.93,1,.55,true);box(g,0xe1ffff,0,2.1,.29,.1,.5,.04);for(const x of [-.12,.12]){const b=box(g,0xe1ffff,x,1.93,.29,.1,.32,.04);b.rotation.z=x>0?-.75:.75;}}else{const ring=new T.Mesh(ringGeometry,mat(COLORS[o.skill]));ring.position.y=1.2;ring.castShadow=true;g.add(ring);if(o.skill===0){box(g,0xffed9b,0,1.2,0,.32,.34,.12);box(g,0x715c28,0,1.2,.07,.035,.28,.02);}if(o.skill===1){box(g,0xc9ffe0,0,1.2,0,.12,.4,.12);box(g,0xc9ffe0,0,1.2,0,.4,.12,.12);}if(o.skill===2){const shield=mesh(cone,0xd4f3ff,g,0,1.2,0,.24,.38,.08);shield.rotation.z=Math.PI;}}}
 const particles=[];for(let i=0;i<30;i++){const m=ball(scene,0xffdf62,0,0,0,.065);m.visible=false;particles.push({m,life:0,v:new T.Vector3()});}let trackCameraY=0,total=0,lastTime=0,lastMode='ready',burst=0;
 function resize(){const r=canvas.getBoundingClientRect();renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.fov=r.width/r.height<.8?64:58;camera.updateProjectionMatrix();}new ResizeObserver(resize).observe(canvas);resize();
 return function render(s,character,frameDt){capture.restore();runner.scale.setScalar(1);runner.rotation.set(0,0,0);const dt=Math.min(.05,Math.max(0,s.time-lastTime));lastTime=s.time;
 updateSchool(s);updateTraffic(s);
 updateCampus(s);
 updateChaserModel(s);
 runner.position.set(s.x*2.2,height(s),0);body.visible=!updateRunnerModel(s,character,frameDt);if(body.visible){const cycle=s.time?Math.sin(s.time*15):0;const tuck=s.jump?Math.sin(Math.PI*(1-s.jump/JUMP_DURATION)):0;body.position.y=s.slide?-.48:Math.abs(cycle)*.045;body.rotation.x=s.slide?-1.1:s.jump?-.15:.09;if(s.roll){const angle=-2*Math.PI*(1-s.roll/ROLL_DURATION);body.rotation.x=angle;body.position.y=.85*(1-Math.cos(angle));body.position.z=-.85*Math.sin(angle);}else{body.position.z=0;if(s.mode==='falling'||s.mode==='crashed'){const progress=1-s.fall/FALL_DURATION;body.rotation.x=-1.5*progress;body.position.y=.28*progress;}else if(s.hit){body.rotation.x=-.32*Math.sin(Math.PI*s.hit/HIT_DURATION);}}body.rotation.z=-(s.lane-s.x)*.22;body.rotation.y=(s.lane-s.x)*-.16;torso.material=mat(character==='female'?0xd77bf2:0xffcb38);pony.visible=character==='female';cap.visible=character!=='female';legs.forEach(({leg,knee},i)=>{leg.rotation.x=s.slide?-1.2:s.jump?-.8*tuck:cycle*(i?1:-1)*.85;knee.rotation.x=s.slide?-.65:s.jump?-1.1*tuck:-Math.max(0,cycle*(i?1:-1))*.95;});arms.forEach((a,i)=>{a.rotation.x=s.slide?-1.6:s.jump?-1.6:cycle*(i?-1:1)*.8-.25;a.rotation.z=s.jump?(i?-.35:.35):(i?-.1:.1);});}
 let n=0;for(const o of s.items){if(o.type==='bus')continue;const z=o.z-s.distance;if(o.done||z< -3||z>125)continue;const g=pool[n++];if(!g)break;const key=o.type+':'+o.skill;if(g.userData.key!==key){obstacle(g,o);g.userData.key=key;}g.visible=true;g.position.set(o.lane*2.2,0,-z);g.rotation.y=o.type==='skill'?s.time*2:0;if(o.type==='skill')g.position.y=Math.sin(s.time*3+o.z)*.13;}for(;n<pool.length;n++)pool[n].visible=false;
 const count=s.skills.reduce((a,b)=>a+b,0);if(count>total){burst=.22;for(const p of particles){p.life=.5+Math.random()*.3;p.m.visible=true;p.m.position.set(s.x*2.2,1.2,0);p.v.set((Math.random()-.5)*4,Math.random()*4,(Math.random()-.5)*4);}}total=count;if(s.mode==='running')for(const p of particles){p.life-=dt;p.m.visible=p.life>0;if(p.life>0){p.v.y-=dt*7;p.m.position.addScaledVector(p.v,dt);p.m.scale.setScalar(.07*p.life/.8);}}if(s.time===0)for(const p of particles)p.m.visible=false;
 burst=Math.max(0,burst-dt);camera.position.x+=(s.x*.65-camera.position.x)*(1-Math.exp(-8*(dt||.016)));if(s.time===0)trackCameraY=0;
 trackCameraY+=(s.floor*.7-trackCameraY)*(1-Math.exp(-7*dt));
 camera.position.y=3.8+trackCameraY;camera.position.z=6.8;camera.lookAt(camera.position.x*.37,1.35+trackCameraY,-12);
 if(isCapture(s)){
   if(body.visible){
     const {lift}=capturePose(s);
     legs.forEach(({leg,knee},i)=>{
       leg.rotation.x*=1-lift;
       leg.rotation.x+=Math.sin(s.capture*4.8+i)*.09*lift;
       knee.rotation.x*=1-lift;
     });
   }
   capture.frame(camera,s,runner,body.visible?null:updateRunnerModel.model,body,updateChaserModel.root,updateChaserModel.model);
 }
 renderer.render(scene,camera);lastMode=s.mode;};
}
