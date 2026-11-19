import {createMagnetCoins} from './magnet-coins.js?v=2.8.8';
import {createPickupModels} from './pickup-models.js?v=2.8.8';
import {createGuardEffect} from './guard-effect.js?v=2.8.8';
import {streetSurfaces} from './street-materials.js?v=2.8.8';
import {createSideTraffic} from './side-vehicles.js?v=2.8.8';
import {createCaptureStage} from './capture-stage.js?v=2.8.8';
import {createSky} from './sky-scene.js?v=2.8.8';
import {createCampus} from './campus-scene.js?v=2.8.8';
import {createCollegeCampus} from './college-scene.js?v=2.8.8';
import {createTraffic} from './traffic-scene.js?v=2.8.8';
import * as T from './vendor/three.module.js';
import {createSchoolEntrance} from './school-scene.js?v=2.8.8';
import {createCaptureScene} from './capture-scene.js?v=2.8.8';
import {loadChaserModel} from './chaser-model.js?v=2.8.8';
import {loadRunnerModel} from './runner-model.js?v=2.8.8';
import {height,JUMP_DURATION,ROLL_DURATION,FALL_DURATION,HIT_DURATION,isCapture,capturePose} from './engine.js?v=2.8.8';
export function createRenderer(canvas, callbacks = {}){
 let renderer;try{renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});}catch{renderer=new T.WebGLRenderer({canvas,antialias:false,alpha:false});}
 const gl=renderer.getContext?.();if(gl&&typeof gl.isContextLost==='function'&&gl.isContextLost())throw new Error('WebGL context lost');
 let contextLost=false;canvas.addEventListener?.('webglcontextlost',()=>{contextLost=true;},false);canvas.addEventListener?.('webglcontextrestored',()=>{contextLost=false;},false);
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.02;
 const scene=new T.Scene();scene.background=new T.Color('#a5c9dc');scene.fog=new T.Fog('#b9d0d5',85,175);
 const camera=new T.PerspectiveCamera(57,1,.1,180);camera.position.set(0,1.52,3.65);camera.lookAt(0,.98,0);
 const ambient=new T.HemisphereLight(0xe5edf7,0x9b8b77,2.1);scene.add(ambient);const sun=new T.DirectionalLight(0xffead0,3.2);sun.position.set(-15,26,15);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-20,right:20,top:22,bottom:-26,near:1,far:80});sun.shadow.normalBias=.025;sun.shadow.bias=-.00025;scene.add(sun);sun.target.position.set(0,0,-13);scene.add(sun.target);
 const mats=new Map();function mat(c){if(!mats.has(c))mats.set(c,new T.MeshStandardMaterial({color:c,roughness:.78}));return mats.get(c);}
 const cube=new T.BoxGeometry(1,1,1),sphere=new T.SphereGeometry(1,12,8),cyl=new T.CylinderGeometry(1,1,1,8),cone=new T.ConeGeometry(1,1,7),ringGeometry=new T.TorusGeometry(.32,.075,6,16);
 function mesh(g,c,parent,x,y,z,sx=1,sy=1,sz=1,shadow=false){const m=new T.Mesh(g,mat(c));m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=shadow;m.receiveShadow=true;parent.add(m);return m;}
 const box=(p,c,x,y,z,sx,sy,sz,sh=false)=>mesh(cube,c,p,x,y,z,sx,sy,sz,sh);
 const ball=(p,c,x,y,z,sx,sy=sx,sz=sx,sh=false)=>mesh(sphere,c,p,x,y,z,sx,sy,sz,sh);
 const updateStreet=streetSurfaces(scene,box);
 const updateCampus=createCampus(scene);
 const updateCollege=createCollegeCampus(scene);
 const updateSky=createSky(scene,sun,ambient);
 const runner=new T.Group();scene.add(runner);const body=new T.Group();runner.add(body);
 const podiumCyl=new T.CylinderGeometry(1,1,1,32);
 const podium=new T.Group();scene.add(podium);podium.position.set(0,.09,0);
 mesh(podiumCyl,0x1b4347,podium,0,.02,0,.92,.04,.92);mesh(podiumCyl,0xf4d03f,podium,0,.041,0,.85,.006,.85);mesh(podiumCyl,0x132f34,podium,0,.042,0,.77,.006,.77);
 const updateGuard=createGuardEffect(runner),pickups=createPickupModels();
 const activeKey=callbacks?.initialModelKey||'male';
 const heroModels={male:loadRunnerModel(runner,'male',activeKey==='male'?callbacks?.onBoyProgress:null,activeKey==='male'),female:loadRunnerModel(runner,'female',activeKey==='female'?callbacks?.onBoyProgress:null,activeKey==='female'),'college-male':loadRunnerModel(runner,'college-male',activeKey==='college-male'?callbacks?.onBoyProgress:null,activeKey==='college-male'),'college-female':loadRunnerModel(runner,'college-female',activeKey==='college-female'?callbacks?.onBoyProgress:null,activeKey==='college-female')};
 const updateChaserModel=loadChaserModel(scene, callbacks?.onChaserProgress);
 let compiled = false;
 const capture=createCaptureScene(scene);
 const updateSchool=createSchoolEntrance(scene);
 const updateMagnetCoins=createMagnetCoins(scene);const updateTraffic=createTraffic(scene);const updateSideTraffic=createSideTraffic(scene);const stage=createCaptureStage(scene);
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
 const pool=[];for(let i=0;i<64;i++){const root=new T.Group();root.userData.captureObstacle=true;scene.add(root);root.visible=false;pool.push(root);}
 function clear(g){while(g.children.length)g.remove(g.children[0]);}
 function obstacle(g,o){clear(g);if(['coin','magnet','shield'].includes(o.type)){pickups.add(g,o.type);}else if(o.type==='jump'&&o.variant==='bench'){for(const x of [-.65,.65])box(g,0x244e63,x,.35,0,.12,.7,.55,true);for(let j=0;j<3;j++)box(g,0xe9a33a,0,.73,-.21+j*.21,1.85,.14,.17,true);box(g,0xe9a33a,0,.92,-.27,1.85,.18,.10,true);}else if(o.type==='jump'&&o.variant==='hurdle'){for(const x of [-.77,.77]){box(g,0x215b9b,x,.4,0,.10,.8,.12,true);box(g,0x215b9b,x,.08,0,.24,.12,.75);}box(g,0xfff1ce,0,.8,0,1.85,.25,.16,true);for(const x of [-.6,0,.6])box(g,0xf34c48,x,.8,.09,.25,.25,.02);}else if(o.type==='slide'&&o.variant==='scaffold'){for(const x of [-.88,.88]){box(g,0xfbbd23,x,1.25,0,.14,2.5,.4,true);box(g,0x263a53,x,.08,0,.36,.16,.6);}box(g,0xfbbd23,0,2.1,0,1.94,1,.5,true);for(let j=0;j<5;j++){const b=box(g,0x253e58,-.72+j*.36,2.1,.26,.14,.85,.03);b.rotation.z=-.3;}}else if(o.type==='block'){box(g,0x796348,0,1.15,0,1.45,2.3,1.2,true);box(g,0x9b886b,0,2.32,0,1.55,.12,1.3);for(const x of [-.52,.52])box(g,0xafaa99,x,1.15,.62,.09,2,.04);box(g,0xf5dd6f,0,1.2,.64,.6,.55,.06);const bar=box(g,0x363a37,0,1.2,.69,.42,.09,.03);bar.rotation.z=.78;}else if(o.type==='jump'){box(g,0xff794b,0,.4,0,1.8,.8,.5,true);for(let j=0;j<4;j++){const b=box(g,0xfff4d4,-.65+j*.43,.42,.26,.2,.65,.03);b.rotation.z=-.35;}box(g,0xffc33e,0,.84,0,1.94,.08,.6);}else if(o.type==='slide'){for(const x of [-.88,.88])box(g,0x14b9be,x,1.3,0,.16,2.6,.35,true);box(g,0x18c7be,0,2.1,0,1.93,1,.55,true);box(g,0xe1ffff,0,2.1,.29,.1,.5,.04);for(const x of [-.12,.12]){const b=box(g,0xe1ffff,x,1.93,.29,.1,.32,.04);b.rotation.z=x>0?-.75:.75;}}}

 const particles=[];for(let i=0;i<30;i++){const m=ball(scene,0xffdf62,0,0,0,.065);m.visible=false;particles.push({m,life:0,v:new T.Vector3()});}let trackCameraY=0,total=0,lastTime=0,lastMode='ready',burst=0,currentLookY=.98,currentLookZ=0;
 function resize(){const r=canvas.getBoundingClientRect();renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.fov=r.width/r.height<.8?64:58;camera.updateProjectionMatrix();}new ResizeObserver(resize).observe(canvas);resize();
 return function render(s,character,frameDt){if(contextLost||renderer.getContext?.()?.isContextLost?.())return 'context-lost';stage.restore();capture.restore();runner.scale.setScalar(1);runner.rotation.set(0,0,0);const dt=Math.min(.05,Math.max(0,s.time-lastTime));lastTime=s.time;
 updateSchool(s);updateTraffic(s);updateSideTraffic(s);updateMagnetCoins(s);
 const weather=updateSky(s);updateStreet(s.distance,weather);updateCampus(s,weather);updateCollege(s);
 updateChaserModel(s);
 const onPodium=s.mode==='ready'||s.mode==='select';
 podium.position.set(0,.09,s.distance);
 podium.visible=onPodium;
 const fallRecoil = s.mode==='falling' ? Math.sin(Math.min(1,(1-s.fall/FALL_DURATION)/.38)*Math.PI)*.45 : 0;
 runner.position.set(s.x*2.2,height(s)+(onPodium?.04:0),fallRecoil);const desiredKey=s.map==='college'?`college-${character}`:character,altKey=s.map==='college'?character:`college-${character}`;if(!heroModels[desiredKey]?.model)heroModels[desiredKey]?.(s,desiredKey,frameDt);const modelKey=heroModels[desiredKey]?.model?desiredKey:heroModels[altKey]?.model?altKey:desiredKey;let selectedVisible=false;for(const [key,update] of Object.entries(heroModels))if(update(s,modelKey,frameDt))selectedVisible=key===modelKey;const selectedModel=heroModels[modelKey];body.visible=!selectedVisible;if(body.visible){const inFront=s.mode==='ready'||s.mode==='select'||s.mode==='intro';const cycle=s.time?Math.sin(s.time*15):0;const tuck=s.jump?Math.sin(Math.PI*(1-s.jump/JUMP_DURATION)):0;body.position.y=s.slide?-.48:Math.abs(cycle)*.045;body.rotation.x=s.slide?-1.1:s.jump?-.15:inFront?0:.09;if(s.roll){const angle=-2*Math.PI*(1-s.roll/ROLL_DURATION);body.rotation.x=angle;body.position.y=.85*(1-Math.cos(angle));body.position.z=-.85*Math.sin(angle);}else{body.position.z=0;if(s.mode==='falling'||s.mode==='crashed'){const progress=1-s.fall/FALL_DURATION;body.rotation.x=-1.5*progress;body.position.y=.28*progress;}else if(s.hit){body.rotation.x=-.32*Math.sin(Math.PI*s.hit/HIT_DURATION);}}body.rotation.z=-(s.lane-s.x)*.22;body.rotation.y=inFront?Math.PI:(s.lane-s.x)*-.16;const torsoColor=character==='female'?(s.map==='college'?0xd77bf2:0x1e293b):(s.map==='college'?0x2ec4b6:0xf8fafc);torso.material=mat(torsoColor);pony.visible=character==='female';cap.visible=character!=='female';legs.forEach(({leg,knee},i)=>{leg.rotation.x=s.slide?-1.2:s.jump?-.8*tuck:cycle*(i?1:-1)*.85;knee.rotation.x=s.slide?-.65:s.jump?-1.1*tuck:-Math.max(0,cycle*(i?1:-1))*.95;});arms.forEach((a,i)=>{const gestureWave=inFront&&s.styleAction>0&&i===1?Math.sin(s.styleAction*4)*1.1:0;a.rotation.x=s.slide?-1.6:s.jump?-1.6:gestureWave?-1.15*gestureWave:cycle*(i?-1:1)*.8-.25;a.rotation.z=s.jump?(i?-.35:.35):gestureWave?-.45*gestureWave:(i?-.1:.1);});}
 updateGuard(s,selectedModel?.model);
 let n=0;for(const o of s.items){if(o.type==='bus'||o.type==='sideVehicle')continue;const z=o.z-s.distance;if(o.done||z< -3||z>125)continue;const g=pool[n++];if(!g)break;const key=o.type+':'+o.skill+':'+o.variant;if(g.userData.key!==key){obstacle(g,o);g.userData.key=key;}g.visible=true;g.position.set(o.lane*2.2,0,-z);const isFloat=['coin','magnet','shield'].includes(o.type);g.rotation.y=0;if(isFloat){g.position.y=Math.sin(s.time*3+o.z)*.10;pickups.animate(g,o.type,s.time,o.z);}}for(;n<pool.length;n++)pool[n].visible=false;
 const count=s.coins;if(count>total){burst=.22;for(const p of particles){p.life=.5+Math.random()*.3;p.m.visible=true;p.m.position.set(s.x*2.2,height(s)+.8,0);p.v.set((Math.random()-.5)*4,Math.random()*4,(Math.random()-.5)*4);}}total=count;if(s.mode==='running')for(const p of particles){p.life-=dt;p.m.visible=p.life>0;if(p.life>0){p.v.y-=dt*7;p.m.position.addScaledVector(p.v,dt);p.m.scale.setScalar(.07*p.life/.8);}}if(s.time===0)for(const p of particles)p.m.visible=false;
 burst=Math.max(0,burst-dt);if(s.time===0)trackCameraY=0;
 trackCameraY+=(s.floor*.7-trackCameraY)*(1-Math.exp(-7*dt));
 const inSelect=s.mode==='ready'||s.mode==='select'||s.mode==='intro';
 const targetCamY=inSelect?1.52:3.8+trackCameraY;
 const targetCamZ=inSelect?3.65:6.8;
 const targetLookY=inSelect?.98:1.35+trackCameraY;
 const targetLookZ=inSelect?0:-12;
 const camBlend=1-Math.exp(-5.5*Math.min(.05,dt||.016));
 camera.position.x+=((s.mode==='intro'?.48:inSelect?0:s.x*.65)-camera.position.x)*camBlend;
 camera.position.y+=(targetCamY-camera.position.y)*camBlend;
 camera.position.z+=(targetCamZ-camera.position.z)*camBlend;
 currentLookY+=(targetLookY-currentLookY)*camBlend;
 currentLookZ+=(targetLookZ-currentLookZ)*camBlend;
 if(s.mode==='falling'){
   const shake=(s.fall/FALL_DURATION)*.35;
   camera.position.x+=(Math.sin(s.time*65)*.7+Math.cos(s.time*85)*.3)*shake;
   camera.position.y+=(Math.cos(s.time*70)*.7)*shake*.6;
 }else if(s.hit>0){
   const shake=(s.hit/HIT_DURATION)*.22;
   camera.position.x+=Math.sin(s.time*60)*shake;
   camera.position.y+=Math.cos(s.time*75)*shake*.5;
 }
 camera.lookAt(camera.position.x*.37,currentLookY,currentLookZ);
 if(isCapture(s)){

   if(body.visible){
     const {lift}=capturePose(s);
     legs.forEach(({leg,knee},i)=>{
       leg.rotation.x*=1-lift;
       leg.rotation.x+=Math.sin(s.capture*4.8+i)*.09*lift;
       knee.rotation.x*=1-lift;
     });
   }
   capture.frame(camera,s,runner,body.visible?null:selectedModel.model,body,updateChaserModel.root,updateChaserModel.model,selectedModel.signatureClip);
   stage.show([runner,updateChaserModel.root],camera);
 }
  if(selectedVisible&&!compiled&&typeof renderer.compile==='function'){try{renderer.compile(scene,camera);compiled=true;}catch{}}
 renderer.render(scene,camera);lastMode=s.mode;return selectedModel.failed?'error':selectedVisible?'ready':'loading';};
}
