import {createMagnetCoins} from './magnet-coins.js?v=3.0.0';
import {createPickupModels,makeCoin} from './pickup-models.js?v=3.4.8';
import {createGuardEffect} from './guard-effect.js?v=3.4.8';
import {streetSurfaces,curveRelX,curveRelY,curveSlopeAt} from './street-materials.js?v=3.2.6';
import {createSideTraffic} from './side-vehicles.js?v=3.2.0';
import {createCaptureStage} from './capture-stage.js?v=3.0.0';
import {createSky} from './sky-scene.js?v=3.4.2';
import {createCampus} from './campus-scene.js?v=3.2.6';
import {createCollegeCampus} from './college-scene.js?v=3.2.6';
import {createItParkCampus} from './itpark-scene.js?v=3.2.6';
import {buildDucatiStreetfighter,buildHumanoidRobot} from './itpark-models.js?v=3.4.2';
import {buildLaptopDesk,buildServerRack,buildCableBarrier,buildGlassOfficePod,buildDocumentBoxes,buildWifiRouterTower,buildOfficeChair,buildMeetingTable,buildTurnstileGate,buildCodeHologram} from './itpark-obstacles.js?v=3.1.1';
import {createRoadEventsScene,buildRoadEventMesh} from './itpark-events-scene.js?v=3.4.2';
import {createTraffic} from './traffic-scene.js?v=3.4.2';
import * as T from './vendor/three.module.js';
import {createSchoolEntrance} from './school-scene.js?v=3.0.3';
import {createCaptureScene} from './capture-scene.js?v=3.0.0';
import {loadChaserModel} from './chaser-model.js?v=3.0.0';
import {loadRunnerModel} from './runner-model.js?v=3.3.0';
import {PICKUP_TYPES,ROAD_EVENT_TYPES,height,JUMP_DURATION,ROLL_DURATION,FALL_DURATION,HIT_DURATION,isCapture,capturePose} from './engine.js?v=3.2.6';
export function createRenderer(canvas, callbacks = {}){
 let renderer;
 try{
   renderer=new T.WebGLRenderer({
     canvas,
     antialias:true,
     alpha:false,
     powerPreference:'high-performance',
     precision:'highp',
     stencil:false
   });
 }catch{
   renderer=new T.WebGLRenderer({canvas,antialias:false,alpha:false});
 }
 const gl=renderer.getContext?.();if(gl&&typeof gl.isContextLost==='function'&&gl.isContextLost())throw new Error('WebGL context lost');
 let contextLost=false;canvas.addEventListener?.('webglcontextlost',()=>{contextLost=true;},false);canvas.addEventListener?.('webglcontextrestored',()=>{contextLost=false;},false);
 const isTouchDevice=typeof navigator!=='undefined'&&(navigator.maxTouchPoints>0||(typeof window!=='undefined'&&'ontouchstart' in window));
 const dpr=typeof window!=='undefined'?(window.devicePixelRatio||1):1;
 // High-DPI balanced pixel ratio: 1.5 on mobile touch screens, 2.0 on desktop
 // DPR 1.5 renders at ~618x1372 (over 850k pixels) on modern phones with WebGL MSAA (antialias: true).
 // This delivers tack-sharp 1080p Retina clarity with 0 blur, while slashing fragment shading load by 44% compared to DPR 2.0!
 const maxDpr = isTouchDevice ? 1.5 : 2.0;
 renderer.setPixelRatio(Math.min(dpr, maxDpr));
 renderer.shadowMap.enabled=true;
 renderer.shadowMap.type=T.PCFShadowMap;
 renderer.outputColorSpace=T.SRGBColorSpace;
 renderer.toneMapping=T.ACESFilmicToneMapping;
 renderer.toneMappingExposure=1.22;
 const scene=new T.Scene();scene.background=new T.Color('#64d6ff');scene.fog=new T.Fog('#78dcff',150,325);
 const camera=new T.PerspectiveCamera(57,1,.1,375);camera.position.set(0,1.52,3.65);camera.lookAt(0,.98,0);
 const ambient=new T.HemisphereLight(0xdaf0ff,0x628096,2.25);scene.add(ambient);
 const sun=new T.DirectionalLight(0xfff4d6,3.65);sun.position.set(-15,26,15);sun.castShadow=true;
 sun.shadow.mapSize.set(1024, 1024);
 Object.assign(sun.shadow.camera,{left:-12,right:12,top:14,bottom:-18,near:4,far:52});
 sun.shadow.normalBias=.025;sun.shadow.bias=-.00025;scene.add(sun);sun.target.position.set(0,0,-13);scene.add(sun.target);
 const mats=new Map();function mat(c){if(!mats.has(c))mats.set(c,new T.MeshStandardMaterial({color:c,roughness:.78}));return mats.get(c);}
 const cube=new T.BoxGeometry(1,1,1),sphere=new T.SphereGeometry(1,12,8),cyl=new T.CylinderGeometry(1,1,1,8),cone=new T.ConeGeometry(1,1,7),ringGeometry=new T.TorusGeometry(.32,.075,6,16);
 function mesh(g,c,parent,x,y,z,sx=1,sy=1,sz=1,shadow=false){const m=new T.Mesh(g,mat(c));m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=shadow;m.receiveShadow=true;parent.add(m);return m;}
 const box=(p,c,x,y,z,sx,sy,sz,sh=false)=>mesh(cube,c,p,x,y,z,sx,sy,sz,sh);
 const ball=(p,c,x,y,z,sx,sy=sx,sz=sx,sh=false)=>mesh(sphere,c,p,x,y,z,sx,sy,sz,sh);
 const updateStreet=streetSurfaces(scene,box);
 let updateCampus=null;
 let updateCollege=null;
 let updateItPark=null;
 function updatePark(state, weather) {
   if (!updateItPark && state.map === 'itpark') {
     updateItPark = createItParkCampus(scene);
   }
   if (updateItPark) updateItPark(state, weather);
 }
 const updateSky=createSky(scene,sun,ambient);
 const runner=new T.Group();scene.add(runner);const body=new T.Group();runner.add(body);
 const podiumCyl=new T.CylinderGeometry(1,1,1,32);
 const podium=new T.Group();scene.add(podium);podium.position.set(0,.09,0);
 mesh(podiumCyl,0x091c3a,podium,0,.02,0,.96,.045,.96);mesh(podiumCyl,0x0e3366,podium,0,.046,0,.84,.014,.84);
 const cyanGlowMat=new T.MeshBasicMaterial({color:0x00e5ff});
 const cyanRingMat=new T.MeshBasicMaterial({color:0x38bdf8,transparent:true,opacity:0.12,side:T.DoubleSide,depthWrite:false});
 const podiumOuterGlow=new T.Mesh(new T.TorusGeometry(.90,.024,8,40),cyanGlowMat);podiumOuterGlow.rotation.x=Math.PI/2;podiumOuterGlow.position.y=.046;podium.add(podiumOuterGlow);
 const podiumInnerGlow=new T.Mesh(new T.TorusGeometry(.72,.015,8,40),cyanGlowMat);podiumInnerGlow.rotation.x=Math.PI/2;podiumInnerGlow.position.y=.056;podium.add(podiumInnerGlow);
 const podiumAura=new T.Mesh(new T.CylinderGeometry(.80,.88,.22,32,1,true),cyanRingMat);podiumAura.position.y=.16;podium.add(podiumAura);
 const updateGuard=createGuardEffect(runner);
 let pickups=null;
 const ensurePickups=()=>{if(!pickups)pickups=createPickupModels();return pickups;};
 const activeKey=callbacks?.initialModelKey||'male';
 const heroModels={male:loadRunnerModel(runner,'male',activeKey==='male'?callbacks?.onBoyProgress:null,activeKey==='male'),female:loadRunnerModel(runner,'female',activeKey==='female'?callbacks?.onBoyProgress:null,activeKey==='female'),'college-male':loadRunnerModel(runner,'college-male',activeKey==='college-male'?callbacks?.onBoyProgress:null,activeKey==='college-male'),'college-woman':loadRunnerModel(runner,'college-woman',activeKey==='college-woman'?callbacks?.onBoyProgress:null,activeKey==='college-woman'),'college-man':loadRunnerModel(runner,'college-man',activeKey==='college-man'?callbacks?.onBoyProgress:null,activeKey==='college-man'),'aged-elder':loadRunnerModel(runner,'aged-elder',activeKey==='aged-elder'?callbacks?.onBoyProgress:null,activeKey==='aged-elder')};
 const updateChaserModel=loadChaserModel(scene, callbacks?.onChaserProgress, true);
 let compiled = false;
 const capture=createCaptureScene(scene);
 const updateSchool=createSchoolEntrance(scene);
 // Lazy-load IT Park Glass Bridge, Sea World, Cave & Metro Viaducts ONLY on IT Park (zero overhead on School/College!)
 let updateRoadEvents=null,roadEventsActive=false;
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
 // Pooled obstacles / pickup models: persistent item-to-slot binding + key-matched free pool for 0 domino rebuilds during gameplay.
 const pool=[];for(let i=0;i<240;i++){const root=new T.Group();root.userData.captureObstacle=true;scene.add(root);root.visible=false;pool.push(root);}
 const freePool=[...pool],itemPoolMap=new Map(),visItems=[],activeItemSet=new Set();
 const obsTexMats=new Map();
 function canvasObsMat(key,w,h,paintFn,rough=.45,metal=.1,emissiveInt=.18){
  if(obsTexMats.has(key))return obsTexMats.get(key);
  if(typeof document==='undefined')return null;
  const cv=document.createElement('canvas');cv.width=w;cv.height=h;
  const ctx=cv.getContext('2d');if(!ctx)return null;
  paintFn(ctx,w,h);
  const tex=new T.CanvasTexture(cv);tex.colorSpace=T.SRGBColorSpace;
  const m=new T.MeshStandardMaterial({map:tex,emissiveMap:emissiveInt?tex:null,emissive:emissiveInt?0xffffff:0,emissiveIntensity:emissiveInt,roughness:rough,metalness:metal});
  obsTexMats.set(key,m);return m;
 }
 function getFestBannerMat(){
  return canvasObsMat('fest',512,160,(ctx,w,h)=>{
   const g=ctx.createLinearGradient(0,0,w,h);g.addColorStop(0,'#0d1e3a');g.addColorStop(.5,'#193663');g.addColorStop(1,'#0d1e3a');
   ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
   ctx.fillStyle='#f59e0b';ctx.fillRect(0,0,w,16);ctx.fillRect(0,h-16,w,16);
   ctx.strokeStyle='#38bdf8';ctx.lineWidth=4;ctx.strokeRect(10,22,w-20,h-44);
   ctx.fillStyle='#fde68a';ctx.font='900 44px system-ui, sans-serif';ctx.textAlign='center';
   ctx.fillText('TECH FEST · LIFE RUSH',w/2,86,465);
   ctx.fillStyle='#7dd3fc';ctx.font='700 22px system-ui, sans-serif';
   ctx.fillText('ANNUAL INNOVATION & CULTURAL EXPO',w/2,126,460);
  },.35,.2,.35)||mat(0x132b4f);
 }
 function getNoticeMat(){
  return canvasObsMat('notice',512,384,(ctx,w,h)=>{
   ctx.fillStyle='#a1683a';ctx.fillRect(0,0,w,h);
   for(let i=0;i<160;i++){ctx.fillStyle=i%2?'rgba(0,0,0,.06)':'rgba(255,255,255,.05)';ctx.fillRect((i*73)%w,(i*41)%h,6,4);}
   const posters=[
    [24,24,148,165,'#fef08a','#b91c1c','HACKATHON','48HR CODE','REGISTER'],
    [186,28,144,175,'#e0f2fe','#0369a1','CULTURALS','TECH STAGE','6 PM TODAY'],
    [346,24,142,155,'#dcfce7','#15803d','SPORTS MEET','TRACK FINALS','MAIN GROUND'],
    [40,210,196,144,'#fff1f2','#be123c','EXAM NOTICE','TIMETABLE','OUT NOW'],
    [256,214,224,140,'#f8fafc','#1e293b','PLACEMENT CELL','DRIVE MONDAY','ROOM 304']
   ];
   for(const [x,y,pw,ph,bg,hd,t1,t2,t3]of posters){
    ctx.fillStyle=bg;ctx.fillRect(x,y,pw,ph);
    ctx.fillStyle=hd;ctx.fillRect(x,y,pw,34);
    ctx.fillStyle='#ffffff';ctx.font='900 17px sans-serif';ctx.textAlign='center';ctx.fillText(t1,x+pw/2,y+23,pw-10);
    ctx.fillStyle='#0f172a';ctx.font='800 18px sans-serif';ctx.fillText(t2,x+pw/2,y+80,pw-12);
    ctx.fillStyle='#475569';ctx.font='700 15px sans-serif';ctx.fillText(t3,x+pw/2,y+118,pw-12);
    ctx.fillStyle='#ef4444';ctx.beginPath();ctx.arc(x+pw/2,y+8,6,0,Math.PI*2);ctx.fill();
   }
  },.55,.04,.06)||mat(0xfef3c7);
 }
 function getVendingMat(){
  return canvasObsMat('vending',256,384,(ctx,w,h)=>{
   ctx.fillStyle='#0f172a';ctx.fillRect(0,0,w,h);
   const cols=['#ef4444','#3b82f6','#22c55e','#f59e0b','#ec4899'];
   for(let r=0;r<4;r++){
    const sy=22+r*88;
    ctx.fillStyle='#1e293b';ctx.fillRect(10,sy+58,w-20,10);
    ctx.fillStyle='rgba(191,219,254,0.12)';ctx.fillRect(10,sy,w-20,56);
    for(let c=0;c<4;c++){
     const col=cols[(r*2+c)%cols.length],cx=22+c*56;
     ctx.fillStyle=col;ctx.fillRect(cx,sy+10,36,46);
     ctx.fillStyle='#ffffff';ctx.fillRect(cx+6,sy+20,24,10);
     ctx.fillStyle='#cbd5e1';ctx.fillRect(cx+8,sy+2,20,8);
    }
   }
  },.12,.3,.42)||mat(0xbfdbfe);
 }
 function getWoodMat(){
  return canvasObsMat('wood',256,128,(ctx,w,h)=>{
   ctx.fillStyle='#b7773b';ctx.fillRect(0,0,w,h);
   for(let y=0;y<h;y+=32){ctx.fillStyle=y%64?'#c58447':'#ab6c32';ctx.fillRect(0,y,w,30);ctx.fillStyle='#6e421b';ctx.fillRect(0,y+30,w,2);}
  },.65,0,0)||mat(0xc98a4b);
 }
 function getChevronMat(){
  return canvasObsMat('chevron',512,64,(ctx,w,h)=>{
   ctx.fillStyle='#f8fafc';ctx.fillRect(0,0,w,h);
   ctx.fillStyle='#dc2626';
   for(let x=-64;x<w+64;x+=64){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x+32,0);ctx.lineTo(x+64,h);ctx.lineTo(x+32,h);ctx.closePath();ctx.fill();}
  },.35,.05,.18)||mat(0xffffff);
 }
 function getSolarMat(){
  return canvasObsMat('solar',512,192,(ctx,w,h)=>{
   ctx.fillStyle='#0f295c';ctx.fillRect(0,0,w,h);
   ctx.strokeStyle='#38bdf8';ctx.lineWidth=3;
   for(let x=0;x<=w;x+=32){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}
   for(let y=0;y<=h;y+=32){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
  },.15,.55,.22)||mat(0x1d4ed8);
 }
 function clear(g){while(g.children.length)g.remove(g.children[0]);}
 function texturedPanel(g,m,x,y,z,w,h,d,fallback){const p=new T.Mesh(cube,m||mat(fallback));p.position.set(x,y,z);p.scale.set(w,h,d);p.castShadow=p.receiveShadow=true;g.add(p);return p;}
 function collegeObstacle(g,o,blockKind){
  if(o.type==='jump'&&o.variant==='bench'){
   // Realistic Campus Canteen Table: planked wood tabletop, steel frame, coffee cups & laptop
   for(const x of [-.72,.72]){box(g,0x1e293b,x,.38,0,.09,.74,.58,true);box(g,0x475569,x,.04,0,.18,.07,.70,true);}
   box(g,0x334155,0,.68,0,1.64,.06,.56);
   texturedPanel(g,getWoodMat(),0,.77,0,1.90,.09,.78,0xc98a4b);
   for(const x of [-.52,.52]){mesh(cyl,0xf8fafc,g,x,.88,0,.07,.13,.07,true);mesh(cyl,0x78350f,g,x,.88,0,.073,.06,.073);mesh(cyl,0x0f172a,g,x,.95,0,.075,.02,.075);}
   box(g,0x94a3b8,-.12,.83,.14,.32,.025,.24);box(g,0x38bdf8,-.12,.94,.02,.32,.20,.02).rotation.x=-.2;
  }else if(o.type==='jump'&&o.variant==='hurdle'){
   // University Security Boom Barrier + Reflective Cones
   for(const x of [-.84,.84]){
    box(g,0x1e3a5f,x,.48,0,.22,.96,.24,true);
    box(g,0xfacc15,x,.98,0,.25,.08,.26);
    box(g,0xef4444,x,.78,.125,.08,.06,.02);
   }
   texturedPanel(g,getChevronMat(),0,.80,0,1.94,.16,.12,0xffffff);
   for(const x of [-.76,.76]){
    box(g,0x0f172a,x,.025,.28,.34,.05,.34,true);
    mesh(cone,0xf97316,g,x,.25,.28,.15,.46,.15,true);
    mesh(cyl,0xf8fafc,g,x,.28,.28,.10,.11,.10);
   }
  }else if(o.type==='jump'){
   // Steel Library Book Trolley with angled shelves & colorful hardcover books
   for(const x of [-.74,.74]){box(g,0x94a3b8,x,.44,0,.07,.80,.48,true);mesh(cyl,0x0f172a,g,x,.06,.16,.06,.05,.06);mesh(cyl,0x0f172a,g,x,.06,-.16,.06,.05,.06);}
   box(g,0x334155,.78,.86,0,.06,.06,.48);
   for(const y of [.26,.54,.80])box(g,0xcbd5e1,0,y,0,1.56,.05,.48,true);
   const cols=[0xdc2626,0x2563eb,0xd97706,0x059669,0x7c3aed,0x0284c7];
   for(let j=0;j<6;j++){box(g,cols[j],-.56+j*.22,.70,0,.18,.28,.36,true);box(g,0xf8fafc,-.56+j*.22,.70,.185,.12,.08,.01);}
  }else if(o.type==='slide'&&o.variant==='scaffold'){
   // Realistic Aluminum Space-Frame Truss Archway ("TECH FEST · LIFE RUSH")
   for(const x of [-.92,.92]){
    box(g,0x0f172a,x,.09,0,.40,.18,.58,true);
    for(const dx of [-.08,.08])for(const dz of [-.12,.12])box(g,0xcbd5e1,x+dx,1.34,dz,.045,2.62,.045,true);
    for(let y=.42;y<=2.4;y+=.48)box(g,0x94a3b8,x,y,0,.18,.04,.28);
    box(g,0x38bdf8,x-.09*(x<0?-1:1),2.56,.18,.12,.12,.14);
   }
   box(g,0x1e293b,0,2.16,0,2.04,.94,.18,true);
   texturedPanel(g,getFestBannerMat(),0,2.16,.11,1.94,.86,.03,0x132b4f);
   texturedPanel(g,getFestBannerMat(),0,2.16,-.11,1.94,.86,.03,0x132b4f);
   box(g,0xfacc15,0,2.66,0,2.08,.09,.30);
  }else if(o.type==='slide'){
   // Realistic Solar Campus Skywalk Canopy
   for(const x of [-.92,.92]){box(g,0x334155,x,1.32,0,.16,2.64,.34,true);box(g,0x0f172a,x,.08,0,.36,.16,.50);}
   box(g,0x0f172a,0,2.16,0,2.02,.82,.60,true);
   texturedPanel(g,getSolarMat(),0,2.16,.31,1.88,.68,.03,0x1d4ed8);
   box(g,0x38bdf8,0,1.76,.32,1.60,.06,.04);
  }else if(o.type==='block'){
   if(blockKind===0){
    // Illuminated Glass-Front Campus Vending Machine
    box(g,0x1e3a8a,0,1.18,0,1.34,2.38,.96,true);
    box(g,0x0f172a,0,1.18,.48,1.16,2.14,.04);
    texturedPanel(g,getVendingMat(),0,1.42,.51,.84,1.26,.02,0xbfdbfe);
    box(g,0x334155,.49,1.36,.51,.14,.56,.03);
    box(g,0x22c55e,.49,1.52,.53,.09,.06,.02);
    box(g,0x0f172a,-.10,.44,.51,.88,.34,.05);
    box(g,0x38bdf8,0,2.24,.51,1.08,.12,.03);
   }else if(blockKind===1){
    // Glass-Framed Campus Cork Notice Board
    for(const x of [-.72,.72])box(g,0x334155,x,1.15,0,.12,2.32,.18,true);
    box(g,0x78350f,0,1.46,0,1.64,1.28,.14,true);
    texturedPanel(g,getNoticeMat(),0,1.46,.08,1.46,1.10,.02,0xfef3c7);
    box(g,0x1e293b,0,2.16,0,1.50,.14,.16);
   }else if(blockKind===2){
    // 3-Bin Molded Campus Recycling Station
    box(g,0x334155,0,.12,0,1.72,.24,.82,true);
    const binCols=[0x2563eb,0x16a34a,0xeab308];
    for(let b=0;b<3;b++){
     const bx=-.54+b*.54;
     box(g,binCols[b],bx,.76,0,.46,1.12,.64,true);
     box(g,0x0f172a,bx,1.38,0,.50,.14,.68);
     box(g,0xf8fafc,bx,.82,.33,.28,.22,.02);
    }
    box(g,0x1e293b,0,1.92,0,1.68,.52,.12,true);
    box(g,0x22c55e,0,2.14,0,1.60,.08,.14);
   }else{
    // Realistic Parked Campus Scooty with front forks, apron, chrome muffler & spoked wheels
    box(g,0x0f172a,0,.26,0,1.28,.09,.34,true);
    box(g,0x0284c7,-.44,.60,0,.38,.56,.34,true);
    box(g,0xf8fafc,-.58,.62,0,.08,.36,.24);
    box(g,0x0284c7,.38,.54,0,.74,.34,.36,true);
    box(g,0x1e293b,.36,.78,0,.64,.12,.30);
    box(g,0xdbe6ef,.66,.80,0,.06,.05,.28);
    box(g,0xdbe6ef,-.50,.48,.10,.05,.52,.05).rotation.z=.22;
    box(g,0xdbe6ef,-.50,.48,-.10,.05,.52,.05).rotation.z=.22;
    box(g,0x0f172a,-.42,1.02,0,.07,.06,.68);
    box(g,0xf8fbff,-.64,.74,0,.06,.12,.14);
    box(g,0xff3434,.76,.60,0,.05,.08,.14);
    box(g,0xdbe6ef,.46,.32,.21,.44,.08,.08);
    for(const x of [-.56,.54]){mesh(cyl,0x0f172a,g,x,.25,0,.26,.14,.26,true);mesh(cyl,0xdbe6ef,g,x,.25,0,.15,.16,.15);}
   }
  }
 }
 function getRoboticsBannerMat(){
  return canvasObsMat('robotics',512,160,(ctx,w,h)=>{
   const g=ctx.createLinearGradient(0,0,w,h);g.addColorStop(0,'#091426');g.addColorStop(.5,'#112a46');g.addColorStop(1,'#091426');
   ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
   ctx.fillStyle='#22ff55';ctx.fillRect(0,0,w,12);ctx.fillRect(0,h-12,w,12);
   ctx.strokeStyle='#38bdf8';ctx.lineWidth=4;ctx.strokeRect(10,20,w-20,h-40);
   ctx.fillStyle='#f8fafc';ctx.font='900 42px system-ui, sans-serif';ctx.textAlign='center';
   ctx.fillText('LMSK IT PARK · AI ZONE',w/2,84,465);
   ctx.fillStyle='#4ade80';ctx.font='700 22px system-ui, sans-serif';
   ctx.fillText('ROBOTICS & AUTONOMOUS TECH DISTRICT',w/2,126,460);
  },.28,.35,.40)||mat(0x0f1f36);
 }
 function itParkObstacle(g,o,blockKind){
  g.userData.waveArm=null;g.userData.serverScan=null;g.userData.papers=null;g.userData.swivel=null;g.userData.holoPanel=null;
  if(o.type==='jump'){
   const jKind=blockKind%5;
   if(jKind===0){g.add(buildCableBarrier());}
   else if(jKind===1){g.add(buildLaptopDesk());}
   else if(jKind===2){const bot=buildHumanoidRobot('seated');g.add(bot);g.userData.waveArm=bot.userData.waveArm||null;}
   else if(jKind===3){g.add(buildMeetingTable());}
   else{const ch=buildOfficeChair();g.add(ch);g.userData.swivel=ch.userData.swivel||null;}
  }else if(o.type==='slide'){
   if(blockKind%2===0){
    // Badge Turnstile Gate & Hologram Overhead Arch (Image 5 #9!)
    g.add(buildTurnstileGate());
   }else{
    // Futuristic IT Park AI Robotics Archway with twin glossy-white green-eyed Robot Heads on top
    for(const x of [-.92,.92]){
     box(g,0x1e293b,x,.10,0,.40,.20,.54,true);
     box(g,0xf1f5f9,x,1.34,0,.20,2.56,.34,true);
     box(g,0x22ff55,x-(x<0?-.11:.11),1.34,.14,.04,2.10,.05);
     const head=buildHumanoidRobot('head');head.scale.setScalar(.62);head.position.set(x,2.80,0);g.add(head);
    }
    box(g,0x0f172a,0,2.16,0,2.06,.94,.20,true);
    texturedPanel(g,getRoboticsBannerMat(),0,2.16,.12,1.96,.84,.03,0x0f1f36);
    texturedPanel(g,getRoboticsBannerMat(),0,2.16,-.12,1.96,.84,.03,0x0f1f36);
    box(g,0xf1f5f9,0,2.67,0,2.12,.10,.30);
   }
  }else if(o.type==='block'){
   const bKind=blockKind%7;
   if(bKind===0){const bot=buildHumanoidRobot('wave');g.add(bot);g.userData.waveArm=bot.userData.waveArm||null;}
   else if(bKind===1){const sr=buildServerRack();g.add(sr);g.userData.serverScan=sr.userData.serverScan||null;}
   else if(bKind===2){g.add(buildGlassOfficePod());}
   else if(bKind===3){g.add(buildWifiRouterTower());}
   else if(bKind===4){const hl=buildCodeHologram();g.add(hl);g.userData.holoPanel=hl.userData.holoPanel||null;}
   else if(bKind===5){const db=buildDocumentBoxes();g.add(db);g.userData.papers=db.userData.papers||null;}
   else{const bike=buildDucatiStreetfighter(true,false);bike.rotation.y=Math.PI/2.6;g.add(bike);}
  }
 }
 function obstacle(g,o,map='school',blockKind=0){clear(g);g.userData.waveArm=null;g.userData.rotors=null;g.userData.crate=null;g.userData.spinBadge=null;g.userData.serverScan=null;g.userData.papers=null;g.userData.swivel=null;g.userData.holoPanel=null;if(PICKUP_TYPES.has(o.type)){ensurePickups().add(g,o.type);return;}if(ROAD_EVENT_TYPES.has(o.type)){const ev=buildRoadEventMesh(o.type,o);g.add(ev);g.userData.rotors=ev.userData.rotors||null;g.userData.crate=ev.userData.crate||null;g.userData.spinBadge=ev.userData.spinBadge||null;return;}if(map==='itpark'){itParkObstacle(g,o,blockKind);return;}if(map==='college'){collegeObstacle(g,o,blockKind);return;}if(o.type==='jump'&&o.variant==='bench'){for(const x of [-.65,.65])box(g,0x244e63,x,.35,0,.12,.7,.55,true);for(let j=0;j<3;j++)box(g,0xe9a33a,0,.73,-.21+j*.21,1.85,.14,.17,true);box(g,0xe9a33a,0,.92,-.27,1.85,.18,.10,true);}else if(o.type==='jump'&&o.variant==='hurdle'){for(const x of [-.77,.77]){box(g,0x215b9b,x,.4,0,.10,.8,.12,true);box(g,0x215b9b,x,.08,0,.24,.12,.75);}box(g,0xfff1ce,0,.8,0,1.85,.25,.16,true);for(const x of [-.6,0,.6])box(g,0xf34c48,x,.8,.09,.25,.25,.02);}else if(o.type==='slide'&&o.variant==='scaffold'){for(const x of [-.88,.88]){box(g,0xfbbd23,x,1.25,0,.14,2.5,.4,true);box(g,0x263a53,x,.08,0,.36,.16,.6);}box(g,0xfbbd23,0,2.1,0,1.94,1,.5,true);for(let j=0;j<5;j++){const b=box(g,0x253e58,-.72+j*.36,2.1,.26,.14,.85,.03);b.rotation.z=-.3;}}else if(o.type==='block'){box(g,0x796348,0,1.15,0,1.45,2.3,1.2,true);box(g,0x9b886b,0,2.32,0,1.55,.12,1.3);for(const x of [-.52,.52])box(g,0xafaa99,x,1.15,.62,.09,2,.04);box(g,0xf5dd6f,0,1.2,.64,.6,.55,.06);const bar=box(g,0x363a37,0,1.2,.69,.42,.09,.03);bar.rotation.z=.78;}else if(o.type==='jump'){box(g,0xff794b,0,.4,0,1.8,.8,.5,true);for(let j=0;j<4;j++){const b=box(g,0xfff4d4,-.65+j*.43,.42,.26,.2,.65,.03);b.rotation.z=-.35;}box(g,0xffc33e,0,.84,0,1.94,.08,.6);}else if(o.type==='slide'){for(const x of [-.88,.88])box(g,0x14b9be,x,1.3,0,.16,2.6,.35,true);box(g,0x18c7be,0,2.1,0,1.93,1,.55,true);box(g,0xe1ffff,0,2.1,.29,.1,.5,.04);for(const x of [-.12,.12]){const b=box(g,0xe1ffff,x,1.93,.29,.1,.32,.04);b.rotation.z=x>0?-.75:.75;}}}

 // Use the actual 3D Dark Gold & Crimson-Red coin model (makeCoin / mantis-flip-coin.glb) for collected-coin burst particles
 const particles=[];let particleCursor=0;for(let i=0;i<28;i++){const m=makeCoin(scene,0,0,0);m.scale.setScalar(.55);m.visible=false;particles.push({m,life:0,maxLife:.52,v:new T.Vector3(),angle:i*.55,spin:(i%2?1:-1)*(11+i%5*1.8),tilt:(i%3-1)*.16});}let trackCameraY=0,total=0,lastTime=0,lastMode='ready',burst=0,currentLookX=0,currentLookY=.98,currentLookZ=0,lastOnPodium=null,lastCanvasW=0,lastCanvasH=0,baseFov=64;
 function resize(){const r=canvas.getBoundingClientRect();const rw=Math.round(r.width),rh=Math.round(r.height);if(!rw||!rh||(rw===lastCanvasW&&rh===lastCanvasH))return;lastCanvasW=rw;lastCanvasH=rh;renderer.setSize(rw,rh,false);camera.aspect=rw/rh;baseFov=rw/rh<.8?64:58;camera.fov=baseFov;camera.updateProjectionMatrix();}new ResizeObserver(resize).observe(canvas);resize();
 const renderFn=function render(s,character,frameDt){if(contextLost||renderer.getContext?.()?.isContextLost?.())return 'context-lost';stage.restore();capture.restore();runner.scale.setScalar(1);runner.rotation.set(0,0,0);const dt=Math.min(.05,Math.max(0,s.time-lastTime));lastTime=s.time;
 const onPodium=s.mode==='ready'||s.mode==='select';
 const podiumChanged=onPodium!==lastOnPodium;
 if(podiumChanged){
   lastOnPodium=onPodium;
   sun.castShadow=!onPodium;
   camera.far=375;
   camera.updateProjectionMatrix();
   if(onPodium){
     trackCameraY=0;
     camera.position.set(0,1.52,3.65);
     currentLookX=0;currentLookY=.98;currentLookZ=0;
   }
 }
 updateSchool(s);if(!onPodium||podiumChanged){updateTraffic(s);updateSideTraffic(s);updateMagnetCoins(s);}
 const weather=updateSky(s);
 const branchCovering=(s.map==='itpark'&&s.activeBranch&&s.distance>=s.branchStart+1&&s.distance<=s.branchEnd)?s.activeBranch:null;
 updateStreet(s.distance,weather,s.map,branchCovering,s);
 if(s.map==='itpark'){
   if(!updateRoadEvents)updateRoadEvents=createRoadEventsScene(scene);
   updateRoadEvents(s,weather);
   roadEventsActive=true;
 }else if(roadEventsActive&&updateRoadEvents){
   updateRoadEvents(s,weather);
   roadEventsActive=false;
 }
 updatePark(s,weather);
 if(s.map==='college'){if(!updateCollege)updateCollege=createCollegeCampus(scene);updateCollege(s);if(updateCampus)updateCampus(s,weather);}
 else{if(!onPodium||podiumChanged){if(!updateCampus&&!onPodium&&s.map!=='itpark')updateCampus=createCampus(scene);if(updateCampus)updateCampus(s,weather);}if(updateCollege)updateCollege(s);}
 updateChaserModel(s);
 podium.position.set(0,.09,s.distance);
 podium.visible=onPodium;
 const fallRecoil = s.mode==='falling' ? Math.sin(Math.min(1,(1-s.fall/FALL_DURATION)/.38)*Math.PI)*.45 : 0;
 runner.position.set(s.x*2.2,height(s)+(onPodium?.04:0),fallRecoil);const rawChar=String(character||'male');const selectedKey=rawChar==='aged-elder'?'aged-elder':rawChar.startsWith('college-')?rawChar:(rawChar.includes('female')||rawChar.includes('woman'))?'female':'male';const altKey=selectedKey==='aged-elder'?'male':selectedKey==='college-woman'?'female':(selectedKey.startsWith('college-')?'male':`college-${selectedKey}`);const isFemaleMesh=selectedKey.includes('female')||selectedKey.includes('woman'),isCollegeBody=selectedKey.startsWith('college-')||s.map==='college';if(!heroModels[selectedKey]?.model)heroModels[selectedKey]?.(s,selectedKey,frameDt);const modelKey=onPodium?selectedKey:(heroModels[selectedKey]?.model?selectedKey:heroModels[altKey]?.model?altKey:selectedKey);let selectedVisible=false;for(const [key,update] of Object.entries(heroModels))if(update(s,modelKey,frameDt))selectedVisible=key===modelKey;const selectedModel=heroModels[modelKey];body.visible=!selectedVisible&&!onPodium;if(body.visible){const inFront=s.mode==='ready'||s.mode==='select'||s.mode==='intro';const cycle=s.time?Math.sin(s.time*15):0;const tuck=s.jump?Math.sin(Math.PI*(1-s.jump/JUMP_DURATION)):0;body.position.y=s.slide?-.48:Math.abs(cycle)*.045;body.rotation.x=s.slide?-1.1:s.jump?-.15:inFront?0:.09;if(s.roll){const angle=-2*Math.PI*(1-s.roll/ROLL_DURATION);body.rotation.x=angle;body.position.y=.85*(1-Math.cos(angle));body.position.z=-.85*Math.sin(angle);}else{body.position.z=0;if(s.mode==='falling'||s.mode==='crashed'){const progress=1-s.fall/FALL_DURATION;body.rotation.x=-1.5*progress;body.position.y=.28*progress;}else if(s.hit){body.rotation.x=-.32*Math.sin(Math.PI*s.hit/HIT_DURATION);}}body.rotation.z=-(s.lane-s.x)*.22;body.rotation.y=inFront?Math.PI:(s.lane-s.x)*-.16;const torsoColor=isFemaleMesh?(isCollegeBody?0xd77bf2:0x1e293b):(isCollegeBody?0x2ec4b6:0xf8fafc);torso.material=mat(torsoColor);pony.visible=isFemaleMesh;cap.visible=!isFemaleMesh;legs.forEach(({leg,knee},i)=>{leg.rotation.x=s.slide?-1.2:s.jump?-.8*tuck:cycle*(i?1:-1)*.85;knee.rotation.x=s.slide?-.65:s.jump?-1.1*tuck:-Math.max(0,cycle*(i?1:-1))*.95;});arms.forEach((a,i)=>{const gestureWave=inFront&&s.styleAction>0&&i===1?Math.sin(s.styleAction*4)*1.1:0;a.rotation.x=s.slide?-1.6:s.jump?-1.6:gestureWave?-1.15*gestureWave:cycle*(i?-1:1)*.8-.25;a.rotation.z=s.jump?(i?-.35:.35):gestureWave?-.45*gestureWave:(i?-.1:.1);});}
 updateGuard(s,selectedModel?.model);
 visItems.length=0;activeItemSet.clear();
 if(!onPodium){
  const pk=ensurePickups();
  const coinFar=isTouchDevice?155:230;
  // Render solid obstacles & pads FIRST (priority over coins) so pool limits NEVER hide a slide/jump/block barrier!
  // Keep solid obstacles visible even after `o.done` until completely behind the camera (`z < -10`) — ZERO disappearing in front of you!
  for(const o of s.items){
   if(o.type==='bus'||o.type==='sideVehicle'||o.type==='coin')continue;
   const z=o.z-s.distance;
   if(o.cleared||o.smashed||o.isForkDivider||z<-10||z>340)continue;
   const isCollectible=PICKUP_TYPES.has(o.type)||o.type==='mysteryCrate'||o.type==='letter';
   if(o.done&&isCollectible)continue;
   visItems.push(o);activeItemSet.add(o);
   if(visItems.length>=pool.length)break;
  }
  if(visItems.length<pool.length){
   for(const o of s.items){
    if(o.type!=='coin'||o.done||o.cleared)continue;
    const z=o.z-s.distance;
    if(z<-10||z>coinFar)continue;
    visItems.push(o);activeItemSet.add(o);
    if(visItems.length>=pool.length)break;
   }
  }
  for(const [item,grp] of itemPoolMap){
   if(!activeItemSet.has(item)){
    grp.visible=false;
    itemPoolMap.delete(item);
    freePool.push(grp);
   }
  }
  for(let vi=0;vi<visItems.length;vi++){
   const o=visItems[vi];
   const z=o.z-s.distance;
   const blockKind=Math.abs(Math.floor(o.z)+o.lane)%7;
   const key=(s.map==='itpark'?'itp:':s.map==='college'?'col:':'sch:')+o.type+':'+(o.letter||o.skill)+':'+o.variant+':'+((o.type==='block'||o.type==='jump'||o.type==='slide')?blockKind:0);
   let g=itemPoolMap.get(o);
   if(!g){
    let matchIdx=-1;
    for(let fi=freePool.length-1;fi>=0;fi--){
     if(freePool[fi].userData.key===key){matchIdx=fi;break;}
    }
    if(matchIdx>=0){
     g=freePool[matchIdx];
     freePool[matchIdx]=freePool[freePool.length-1];
     freePool.pop();
    }else{
     g=freePool.pop();
    }
    if(!g)continue;
    itemPoolMap.set(o,g);
   }
   if(g.userData.key!==key){obstacle(g,o,s.map,blockKind);g.userData.key=key;}
   g.visible=true;const cx=curveRelX(o.z,s),cy=curveRelY(o.z,s);const isFloat=PICKUP_TYPES.has(o.type);
   g.position.set(o.lane*2.2+cx,(isFloat?Math.sin(s.time*3+o.z)*.10:0)+cy,-z);
   g.rotation.y=isFloat?0:-Math.atan(curveSlopeAt(o.z,s));
   if(isFloat){
    pk.animate(g,o.type,s.time,o.z);
    if(o.type==='coin'){
     const glints=g.userData.pickupVisual?.userData?.glints;
     if(glints){const showGlint=z<52;for(let gi=0;gi<glints.length;gi++)glints[gi].visible=showGlint;}
    }
   }else if(g.userData.waveArm){g.userData.waveArm.rotation.z=Math.sin(s.time*6.5+o.z)*.24;}
   if(g.userData.rotors){for(const r of g.userData.rotors)r.rotation.y=s.time*26;if(g.userData.crate)g.userData.crate.position.y=1.05+Math.sin(s.time*4+o.z)*.12;}
   if(g.userData.spinBadge){g.userData.spinBadge.rotation.y=s.time*2.6+o.z;g.userData.spinBadge.position.y=1.25+Math.sin(s.time*3.5+o.z)*.12;}
   if(g.userData.serverScan){g.userData.serverScan.position.y=1.16+Math.sin(s.time*3.8+o.z)*.74;}
   if(g.userData.holoPanel){g.userData.holoPanel.position.y=1.36+Math.sin(s.time*3.2+o.z)*.10;}
   if(g.userData.swivel){g.userData.swivel.rotation.y=Math.sin(s.time*2.4+o.z)*.42;}
   if(g.userData.papers){for(let pi=0;pi<g.userData.papers.length;pi++){const sh=g.userData.papers[pi];sh.position.y=sh.userData.baseY+Math.sin(s.time*4.2+o.z+pi*1.7)*.09;sh.rotation.z=Math.sin(s.time*3.4+pi)*.35;}}
  }
 }else if(itemPoolMap.size>0){
  for(const [,grp] of itemPoolMap){grp.visible=false;freePool.push(grp);}
  itemPoolMap.clear();
 }
 const count=s.coins;if(count>total||((s.nitro>0||s.turboBoost>0||s.feverTimer>0)&&s.mode==='running'&&burst<=0)){burst=(s.nitro>0||s.turboBoost>0)?.07:.14;const emitCount=count>total?5:3;for(let k=0;k<emitCount;k++){const p=particles[particleCursor];particleCursor=(particleCursor+1)%particles.length;const side=(particleCursor%2?1:-1),lat=side*(.08+Math.random()*.12)+(Math.random()-.5)*.05;p.maxLife=.50+k*.055+Math.random()*.08;p.life=p.maxLife;p.m.visible=true;p.angle=Math.random()*Math.PI*2;p.m.rotation.set(-.18,p.angle,p.tilt);p.m.position.set(s.x*2.2+lat,height(s)+.10+k*.03+Math.random()*.05,.08+k*.16+Math.random()*.06);p.v.set(lat*2.2+(Math.random()-.5)*.40,1.65+k*.20+Math.random()*.55,5.5+k*.95+Math.random()*1.8);}}total=count;if(s.mode==='running')for(const p of particles){p.life-=dt;p.m.visible=p.life>0;if(p.life>0){p.v.y-=dt*2.1;p.m.position.addScaledVector(p.v,dt);const minFootY=height(s)+.08,maxArcY=height(s)+.64;if(p.m.position.y<minFootY)p.m.position.y=minFootY;else if(p.m.position.y>maxArcY)p.m.position.y=maxArcY;p.angle+=dt*p.spin;p.m.rotation.set(-.18,p.angle,p.tilt);const lifeRatio=Math.max(0,Math.min(1,p.life/(p.maxLife||.52)));p.m.scale.setScalar(.56*Math.pow(lifeRatio,.80));p.m.userData.glints?.forEach((glint,gi)=>glint.scale.setScalar(.012+.075*Math.pow(Math.max(0,Math.sin(p.angle*2+gi*2)),10)));}}if(s.time===0)for(const p of particles)p.m.visible=false;
 burst=Math.max(0,burst-dt);if(s.time===0)trackCameraY=0;
 trackCameraY+=(s.floor*.7-trackCameraY)*(1-Math.exp(-7*dt));
 const inSelect=s.mode==='ready'||s.mode==='select'||s.mode==='intro';
 const targetFov=inSelect?baseFov:baseFov+Math.min(11,Math.max(0,(s.speed-30)/65)*11)+(s.nitro>0?7:s.turboBoost>0?6:0)+(s.feverTimer>0?4:0);
 if(Math.abs(targetFov-camera.fov)>.12){camera.fov+=(targetFov-camera.fov)*Math.min(1,(dt||.016)*6);camera.updateProjectionMatrix();}
 const collegeRun=!inSelect&&s.map==='college'&&!s.activeBranch;
 const branchCurved=!inSelect&&(s.activeBranch==='skybridge'||s.activeBranch==='underpass');
 const curvedRun=collegeRun||branchCurved;
 const camCurveX=curvedRun?curveRelX(Math.max(0,s.distance-6.8),s):0;
 const camCurveY=curvedRun?curveRelY(Math.max(0,s.distance-6.8),s):0;
 const bendX=curvedRun?curveRelX(s.distance+(branchCurved?16:12),s)*(branchCurved?.40:.35):0;
 const bendY=curvedRun?curveRelY(s.distance+(branchCurved?16:12),s)*.35:0;
 const curSlope=curvedRun?curveSlopeAt(s.distance,s):0;
 if(curvedRun&&s.mode==='running'){runner.rotation.z=-Math.atan(curSlope)*.24-(s.lane-s.x)*.16;runner.rotation.x=branchCurved?-.08:0;}
 else if(!inSelect&&s.mode==='running'){runner.rotation.z=-(s.lane-s.x)*.18;runner.rotation.x=-.08;}
 const yTurnProgress=s.activeBranch?Math.max(0,Math.min(1,(s.distance-s.branchStart)/18)):0;
 const yTurnBank=s.activeBranch?Math.sin(yTurnProgress*Math.PI)*(s.activeBranch==='skybridge'?0.055:-0.055):0;
 const curveBank=branchCurved?-Math.atan(curveSlopeAt(s.distance+12,s))*.26:0;
 const laneBank=inSelect?0:-(s.lane-s.x)*.038;
 const targetCamX=s.mode==='intro'?.48:inSelect?0:camCurveX+s.x*.65;
 const targetCamY=inSelect?1.52:(collegeRun?4.25+camCurveY*.8:3.8+camCurveY*.75)+trackCameraY;
 const targetCamZ=inSelect?3.65:6.8;
 const targetLookX=inSelect?0:s.x*(collegeRun?.42:.37*.65)+bendX;
 const targetLookY=inSelect?.98:(collegeRun?1.02:1.35)+trackCameraY+bendY;
 const targetLookZ=inSelect?0:collegeRun?-7.5:-12;
 const camBlend=1-Math.exp(-(curvedRun?7.5:5.5)*Math.min(.05,dt||.016));
 camera.position.x+=(targetCamX-camera.position.x)*camBlend;
 camera.position.y+=(targetCamY-camera.position.y)*camBlend;
 camera.position.z+=(targetCamZ-camera.position.z)*camBlend;
 currentLookX+=(targetLookX-currentLookX)*camBlend;
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
 camera.lookAt(inSelect?camera.position.x*.37:currentLookX,currentLookY,currentLookZ);
 if(!inSelect&&!isCapture(s))camera.rotation.z+=yTurnBank+laneBank+curveBank;
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
 renderer.render(scene,camera);lastMode=s.mode;return selectedModel.failed?'error':selectedVisible?'ready':'loading';};
 renderFn.isLoaded=key=>Boolean(heroModels[key]?.model);
 renderFn.preload=key=>heroModels[key]?.preload?.();
 return renderFn;
}
