import test from 'node:test';import assert from 'node:assert/strict';import{readFile}from'node:fs/promises';import{fresh}from'../dist/engine.js';import{SCHOOL_ROAD_START,HOME_YARD_START,GRANDFATHER_GATE}from'../dist/grandfather-route.js';
test('3D scene builds and animates all obstacle types, characters and reset without a GPU',async t=>{let src=(await readFile(new URL('../dist/renderer3d.js',import.meta.url),'utf8')).replace(/\.js\?v=[^'"]+/g,'.js');const three=new URL('../dist/vendor/three.module.js',import.meta.url).href;const engine=new URL('../dist/engine.js',import.meta.url).href;src=src.replace("import * as T from './vendor/three.module.js';",`import * as Actual from '${three}';const T={...Actual,WebGLRenderer:class{constructor({canvas}){this.shadowMap={};this.canvas=canvas;}setDrawingBufferSize(w,h,dpr){this.canvas.width=Math.floor(w*dpr);this.canvas.height=Math.floor(h*dpr);}render(scene,camera){this.canvas.scene=scene;scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);scene.traverse(o=>{if(!o.position.toArray().every(Number.isFinite))throw Error('Invalid mesh position');});}}};`);src=src.replace("'./engine.js'",JSON.stringify(engine)).replace("'./runner-model.js'",JSON.stringify(new URL('../dist/runner-model.js',import.meta.url).href)).replace("'./chaser-model.js'",JSON.stringify(new URL('../dist/chaser-model.js',import.meta.url).href));src=src.replace("'./traffic-scene.js'",JSON.stringify(new URL('../dist/traffic-scene.js',import.meta.url).href));src=src.replace("'./campus-scene.js'",JSON.stringify(new URL('../dist/campus-scene.js',import.meta.url).href));src=src.replace("'./college-scene.js'",JSON.stringify(new URL('../dist/college-scene.js',import.meta.url).href));src=src.replace("'./itpark-scene.js'",JSON.stringify(new URL('../dist/itpark-scene.js',import.meta.url).href));src=src.replace("'./itpark-models.js'",JSON.stringify(new URL('../dist/itpark-models.js',import.meta.url).href));src=src.replace("'./itpark-obstacles.js'",JSON.stringify(new URL('../dist/itpark-obstacles.js',import.meta.url).href));src=src.replace("'./itpark-events-scene.js'",JSON.stringify(new URL('../dist/itpark-events-scene.js',import.meta.url).href));src=src.replace("'./sky-scene.js'",JSON.stringify(new URL('../dist/sky-scene.js',import.meta.url).href));for(const name of ['side-vehicles','capture-stage','street-materials','guard-effect','pickup-models','magnet-coins','village-scene','grandfather-scene','ultra-effects'])src=src.replace("'./"+name+".js'",JSON.stringify(new URL('../dist/'+name+'.js',import.meta.url).href));const nativeFetch=globalThis.fetch;src=src.replace("'./capture-scene.js'",JSON.stringify(new URL('../dist/capture-scene.js',import.meta.url).href));src=src.replace("'./school-scene.js'",JSON.stringify(new URL('../dist/school-scene.js',import.meta.url).href));globalThis.fetch=async (request,options)=>{const url=typeof request==='string'?request:request.url;return url.startsWith('file:')?new Response(await readFile(new URL(url))):nativeFetch(request,options);};globalThis.self=globalThis;globalThis.createImageBitmap=async()=>({width:1024,height:1024,close(){}});globalThis.ProgressEvent=class extends Event{constructor(type,init){super(type);Object.assign(this,init);}};globalThis.devicePixelRatio=1;globalThis.ResizeObserver=class{observe(){}};const {createRenderer}=await import('data:text/javascript;base64,'+Buffer.from(src).toString('base64'));const originalWindow=globalThis.window;
 let viewport={width:360,height:780},onResize;
 globalThis.window={devicePixelRatio:3,ontouchstart:null,addEventListener:(name,fn)=>{if(name==='resize')onResize=fn;}};
 t.after(()=>{if(originalWindow===undefined)delete globalThis.window;else globalThis.window=originalWindow;});
 const canvas={getBoundingClientRect:()=>viewport};
 const draw=createRenderer(canvas);
 // Verify mobile quality tiers dynamically scale buffer pixels (low < med < high) & respond to viewport/DPR changes.
 draw.setGraphicsQuality('low');
 const lowW=canvas.width, lowH=canvas.height;
 draw.setGraphicsQuality('med');
 const medW=canvas.width, medH=canvas.height;
 draw.setGraphicsQuality('high');
 const highW=canvas.width, highH=canvas.height;
 assert.equal(draw.isUltraActive(), false, 'HIGH tier must NOT enable ULTRA physics/VFX');
 draw.setGraphicsQuality('ultra');
 const ultraW=canvas.width, ultraH=canvas.height;
 assert.equal(draw.isUltraActive(), true, 'ULTRA tier must enable ULTRA physics/VFX');
 assert.ok(ultraW>=highW && ultraH>=highH, 'ULTRA drawing buffer matches or exceeds HIGH');
 draw.setGraphicsQuality('high');
 assert.equal(draw.isUltraActive(), false, 'Switching back to HIGH must cleanly disable ULTRA');
 assert.ok(lowW>0 && lowW<medW && medW<highW, 'mobile tiers scale drawing buffer width dynamically');
 assert.ok(lowH>0 && lowH<medH && medH<highH, 'mobile tiers scale drawing buffer height dynamically');
 globalThis.window.devicePixelRatio=1;
 onResize();
 assert.deepEqual([canvas.width,canvas.height],[360,780]);
 viewport={width:780,height:360};
 onResize();
 assert.deepEqual([canvas.width,canvas.height],[780,360]);
 viewport={width:390,height:780};
 onResize();
 const s=fresh(0);s.mode='running';s.items=['block','jump','slide','coin','magnet','shield'].map((type,i)=>({type,z:10+i*10,lane:i%3-1,skill:i%3}));for(let frame=0;frame<200;frame++){s.time=frame/60;s.distance=frame/15;s.x=Math.sin(frame/30);s.lane=1;s.jump=frame<30?.475:0;s.slide=frame>50&&frame<80?.5:0;if(frame===10)s.coins++;if(frame===25)s.coinFlights=[{x:2.2,y:3.4,z:s.distance+12,elapsed:.2,duration:.5}];if(frame===35)s.coinFlights=[];s.shield=frame>=15&&frame<90;s.hit=frame===90?.45:0;draw(s,frame%2?'male':'female');}for(const [type,variant]of [['jump','bench'],['jump','hurdle'],['slide','scaffold']]){s.items=[{type,variant,lane:0,z:s.distance+15}];draw(s,'male');}s.distance=140;s.items=[{type:'bus',lane:0,z:170,length:10}];draw(s,'male');s.items.push({type:'bus',roofRide:true,started:true,id:'test-roof',lane:1,z:150,length:22,roof:2.8,velocity:-12});draw(s,'male');s.mode='captured';s.capture=1.6;draw(s,'male');draw(s,'female');draw(fresh(0),'male');const college=fresh(1);college.map='college';draw(college,'male');draw(college,'female');const itpark=fresh(2);itpark.map='itpark';itpark.mode='running';itpark.distance=230;itpark.activeBranch='skybridge';itpark.items=[{type:'block',z:240,lane:-1},{type:'block',z:241,lane:0},{type:'block',z:242,lane:1},{type:'block',z:243,lane:-1},{type:'block',z:244,lane:0},{type:'block',z:245,lane:1},{type:'block',z:246,lane:0},{type:'jump',z:248,lane:0},{type:'jump',z:249,lane:1},{type:'jump',z:250,lane:-1},{type:'jump',z:251,lane:0},{type:'jump',z:252,lane:1},{type:'slide',z:255,lane:-1},{type:'slide',z:256,lane:1},{type:'turboPad',z:260,lane:0},{type:'jumpPad',z:264,lane:1},{type:'mysteryCrate',z:268,lane:-1},{type:'letter',letter:'L',letterIndex:0,z:272,lane:0},{type:'bus',collegeKind:'porsche',z:276,lane:0,length:4.6,roof:1.45},{type:'bus',collegeKind:'bugatti',z:280,lane:1,length:4.6,roof:1.45},{type:'bus',collegeKind:'ducati',z:284,lane:-1,length:2.6,roof:1.65},{type:'bus',collegeKind:'semi',z:288,lane:0,length:10.5,roof:2.8},{type:'bus',roofRide:true,started:true,id:'it-roof',z:292,lane:1,length:22,roof:2.8,velocity:-10},{type:'sideVehicle',variant:'porsche',started:true,startedAt:0,z:247,lane:-1,length:3.4}];draw(itpark,'male');itpark.activeBranch='underpass';draw(itpark,'female');const village=fresh(3);village.map='finalrun';village.mode='running';for(const distance of [0,24,373,1024,9088,9995]){village.distance=distance;village.time=distance/17;draw(village,'male');}
 const elder=fresh(4);
 elder.map='grandfather';elder.mode='running';
 elder.items=[{type:'jump',variant:'logs',lane:0,z:38}];
 const {Raycaster,Vector3}=await import(three);
 const down=new Vector3(0,-1,0);
 for(const distance of [0,38,SCHOOL_ROAD_START-9,SCHOOL_ROAD_START,SCHOOL_ROAD_START+126,SCHOOL_ROAD_START+480,HOME_YARD_START-1,GRANDFATHER_GATE-5,GRANDFATHER_GATE]){
   elder.distance=distance;
   draw(elder,'aged-elder');
   const root=canvas.scene.getObjectByName('grandfather-village');
   assert.equal(root?.visible,true);
   for(const x of [-2.2,0,2.2]){
     const schoolRoad=distance>=SCHOOL_ROAD_START&&distance<HOME_YARD_START;
     const ground=schoolRoad?canvas.scene.getObjectByName('school-village-road'):root;
     const hits=new Raycaster(new Vector3(x,1,0),down,0,2).intersectObjects(ground.children.filter(object=>object.visible),schoolRoad);
     assert.ok(hits.some(hit=>Math.abs(hit.point.y-(schoolRoad?.115:distance>=HOME_YARD_START?.11:.03))<.015),'walkable ground under the runner at '+distance);
   }
 }
 draw(village,'male');
 assert.equal(canvas.scene.getObjectByName('grandfather-village').visible,false);
});
