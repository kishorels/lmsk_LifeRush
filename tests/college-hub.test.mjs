import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Scene} from '../dist/vendor/three.module.js';
import {createCollegeCampus} from '../dist/college-scene.js';
import {roadCurveX,roadCurveY,roadCurveSlope} from '../dist/campus-layout.js';
import {trafficPattern} from '../dist/traffic-rules.js';
import {createSound} from '../dist/sound.js';

async function glb(name){
 const bytes=await readFile(new URL(`../dist/assets/${name}`,import.meta.url));
 const size=bytes.readUInt32LE(12);
 return JSON.parse(bytes.subarray(20,20+size).toString());
}

test('college uses the original outfits while retaining the repaired hair and full motion set',async()=>{
 const girl=await glb('casual-schoolgirl.glb');
 const source=girl.asset.extras.uniformSourceDocument;
 assert.equal(girl.asset.extras.casualOutfit,true);
 assert.equal(girl.asset.extras.hairVersion,1);
 assert.deepEqual(girl.meshes[2],source.meshes[2],'original casual clothing mesh is restored');
 assert.equal(girl.nodes[67].name,'Ch02_Cloth');
 assert.ok(girl.nodes.some(node=>node.name==='Hair smooth swept crown'&&'mesh' in node));
 assert.equal(girl.animations.length,9);
 assert.ok(!girl.nodes.some(node=>node.name.startsWith('Uniform ')));
 const boy=await glb('runverse-runner-v6.glb');
 const schoolBoy=await glb('runverse-schoolboy.glb');
 const boyClips=new Set(boy.animations.map(clip=>clip.name));
 for(const clip of schoolBoy.animations)boyClips.add(clip.name);
 for(const name of ['Idle','Run','Jump','Slide','Roll','Stumble','HeadHit','Fall','ShoulderSweep'])assert.ok(boyClips.has(name));
 const boyBones=new Set(boy.nodes.map(node=>node.name));
 const gesture=schoolBoy.animations.find(clip=>clip.name==='ShoulderSweep');
 assert.ok(gesture.channels.every(channel=>boyBones.has(schoolBoy.nodes[channel.target.node].name)),'opening gesture targets exist on the casual boy rig');
});

test('college buildings appear only on the college map and remain bounded during travel',()=>{
 const scene=new Scene(),render=createCollegeCampus(scene);
 const state={map:'school',distance:0};render(state);
 assert.ok(scene.children.every(root=>!root.visible));
 state.map='college';render(state);
 assert.ok(scene.children.every(root=>root.visible&&root.children.length===1));
 const templates=new Set(scene.children.map(root=>root.children[0].children.length));
 assert.ok(Math.max(...templates)<20,'architecture is batched for mobile rendering');
 state.distance=18000;render(state);
 assert.ok(scene.children.every(root=>root.position.toArray().every(Number.isFinite)));
 state.map='school';render(state);
 assert.ok(scene.children.every(root=>!root.visible));
});

test('separate sound categories clamp their levels without muting the others',()=>{
 const sound=createSound();
 sound.setVolumes({music:.35,coins:0,powerups:.8,movement:2,damage:-1});
 assert.deepEqual(sound.getVolumes(),{music:.35,coins:0,powerups:.8,movement:1,damage:0,villain:1,ambience:1});
 sound.setVolumes({coins:.6});
 assert.equal(sound.getVolumes().coins,.6);
 assert.equal(sound.getVolumes().music,.35);
});

test('typing inside text input is never blocked by game keydown controls',async()=>{
 const gameSrc=await readFile(new URL('../dist/game.js',import.meta.url),'utf8');
 const htmlSrc=await readFile(new URL('../dist/index.html',import.meta.url),'utf8');
 assert.ok(gameSrc.includes("if(e.target?.closest?.('input, textarea, select')) return;"),
   'input elements bypass game control preventDefault so keys like s, a, d, w, and spaces type cleanly');
 assert.ok(!gameSrc.includes("$('start').disabled=waiting;"),
   'start button is not locked disabled by loading poll');
 assert.ok(htmlSrc.includes('src="assets/videos/intro_video.mp4"'),
   'splash screen plays intro_video.mp4 on launch');
 assert.ok(htmlSrc.includes('>Enter LifeRush<')&&gameSrc.includes("'Enter LifeRush'"),
   'frozen end frame reveals Enter LifeRush button');
 const cssSrc=await readFile(new URL('../dist/style.css',import.meta.url),'utf8');
 const enterWrapBlock=cssSrc.match(/\.splash-enter-wrap\s*\{[^}]+\}/)?.[0]||'';
 assert.ok(enterWrapBlock.includes('left: 0')&&enterWrapBlock.includes('right: 0')&&enterWrapBlock.includes('margin: 0 auto')&&!enterWrapBlock.includes('translateX(-50%)'),
   'Enter LifeRush button wrapper centers via margin: 0 auto so modalPop scale animation never shifts it to the right corner');
 assert.ok(gameSrc.includes('switchToLiteRenderer')&&gameSrc.includes("status === 'context-lost'"),
   'game loop recovers automatically from WebGL context loss or render error by switching to a clean 2D canvas');
 const injuredJson=JSON.parse(await readFile(new URL('../dist/assets/injured-run.json',import.meta.url),'utf8'));
 assert.equal(injuredJson.name,'InjuredRun');
 assert.ok(injuredJson.male.length>40&&injuredJson.female.length>40,'injured-run.json carries both male and female bone tracks');
 assert.ok(htmlSrc.includes('id="report-records"')&&htmlSrc.includes('id="report-challenge-banner"')&&gameSrc.includes('ARE YOU A LOSER?!'),
   'report card displays Highest Record comparison and challenge replay prompt');
});

test('unified character carousel with left/right arrows and 2-step College unlock (10k distance + 20k coins)',async()=>{
 const gameSrc=await readFile(new URL('../dist/game.js',import.meta.url),'utf8');
 const htmlSrc=await readFile(new URL('../dist/index.html',import.meta.url),'utf8');
 const r3dSrc=await readFile(new URL('../dist/renderer3d.js',import.meta.url),'utf8');
 const liteSrc=await readFile(new URL('../dist/renderer-lite.js',import.meta.url),'utf8');

 // No Boy/Girl gender-split selector buttons remain in the Characters hub or top bar
 assert.ok(!htmlSrc.includes('hub-character-options')&&!htmlSrc.includes('char-selector-pills'),
   'gender-split character menus removed in favor of unified carousel');
 assert.ok(htmlSrc.includes('id="char-prev"')&&htmlSrc.includes('id="char-next"')&&htmlSrc.includes('id="char-equip-btn"'),
   'Characters screen exposes Left/Right arrow navigation and select button');
assert.ok(gameSrc.includes('CHARACTER_ROSTER')&&gameSrc.includes("id: 'male'")&&gameSrc.includes("id: 'female'")&&gameSrc.includes("id: 'college-male'")&&gameSrc.includes("id: 'college-woman'")&&gameSrc.includes("id: 'college-man'"),
  'unified roster cycles cleanly through all 5 characters (2 School + 3 College)');
 const moveFn = gameSrc.match(/function moveCarousel\([^)]*\)\s*\{[^}]*\}/)?.[0] || '';
 assert.ok(moveFn && !moveFn.includes('selectUnlockedCharacter'),
   'Left/Right arrows only preview characters and never auto-select unlocked characters until SELECT CHARACTER is clicked');

 // Two-step College unlock thresholds: 10,000m in 1 run + 20,000 cumulative coins
 assert.ok(gameSrc.includes('COLLEGE_UNLOCK_DISTANCE = 10000')&&gameSrc.includes('COLLEGE_UNLOCK_COINS = 20000'),
   'College unlock defines 10,000m single-run and 20,000 cumulative coin targets');
 assert.ok(gameSrc.includes('runverse-total-coins')&&gameSrc.includes('runverse-college-dist-done')&&gameSrc.includes('runverse-college-coins-done'),
   'single-run 10k milestone and cumulative coin bank persist across runs');
 assert.ok(gameSrc.includes('isDistGoalMet')&&gameSrc.includes('isCoinsGoalMet')&&gameSrc.includes('isCollegeUnlocked'),
   'both goals must complete before College map and College characters unlock');
 assert.ok(htmlSrc.includes('id="map-unlock-checklist"')&&htmlSrc.includes('id="char-unlock-checklist"'),
   'both Maps and Characters tabs render the 2-step unlock checklist');

 // 3D and 2D renderers handle all 5 character keys ('college-male', 'college-woman', 'college-man') and Neutral Idle
 assert.ok(r3dSrc.includes("rawChar.startsWith('college-')?rawChar")&&r3dSrc.includes("'college-woman'")&&r3dSrc.includes("'college-man'"),
   '3D renderer supports explicit college character preview keys without double-prefixing');
 assert.ok(liteSrc.includes("String(character).includes('female')")&&liteSrc.includes("String(character).startsWith('college-')"),
   '2D lite renderer supports full character preview keys');
 const collegeMan=await glb('college-man.glb');
 const collegeWoman=await glb('college-woman.glb');
 assert.equal(collegeMan.animations.length,9,'college-man.glb carries all 9 animations including Idle');
 assert.equal(collegeWoman.animations.length,9,'college-woman.glb carries all 9 animations including Idle');
 const injuredAll=JSON.parse(await readFile(new URL('../dist/assets/injured-run.json',import.meta.url),'utf8'));
 assert.ok(injuredAll['college-man']?.length>40&&injuredAll['college-woman']?.length>40,'injured-run.json carries CC_Base tracks for college-man and college-woman');
 const collegeIdleJson=JSON.parse(await readFile(new URL('../dist/assets/college-idle.json',import.meta.url),'utf8'));
 assert.ok(collegeIdleJson['college-male']?.length>40,'college-idle.json carries Neutral Idle tracks for college-male');
 const cssSrc=await readFile(new URL('../dist/style.css',import.meta.url),'utf8');
 assert.ok(htmlSrc.includes('id="char-side-prev"')&&htmlSrc.includes('id="char-side-next"')&&htmlSrc.includes('id="char-loading-veil"'),
   'Characters page includes Left/Right holographic preview cards and character loading blur veil');
 assert.ok(cssSrc.includes('.game.is-char-loading #world')&&cssSrc.includes('blur('),
   'Canvas blurs cleanly with blue hologram veil whenever a character is still loading or failed to load');
});

test('college uses Kodaikanal-style winding road, scooty/car traffic instead of buses, and college obstacles',async()=>{
 assert.equal(roadCurveX(500,'school'),0);
 assert.equal(roadCurveY(500,'school'),0);
 const xValues=[120,250,400,600].map(d=>roadCurveX(d,'college'));
 assert.ok(xValues.some(x=>x>3)&&xValues.some(x=>x<-3),'College road sweeps left and right in S-curves');
 assert.ok(Number.isFinite(roadCurveSlope(300,'college'))&&roadCurveSlope(300,'college')!==0);

 const colItems=[0,1,2,3].flatMap(i=>trafficPattern(120+i*240,i,42,'college'));
 const oncoming=colItems.filter(i=>i.type==='bus'&&!i.roofRide);
 assert.ok(oncoming.length>0&&oncoming.every(i=>i.collegeKind==='car'||i.collegeKind==='scooty'),
   'College oncoming traffic uses cars and scooties rather than yellow school buses');
 const side=colItems.find(i=>i.type==='sideVehicle');
 assert.ok(side&&['scooty','car','bike'].includes(side.variant),'College side encounters include scooties and cars');

 const busModelSrc=await readFile(new URL('../dist/bus-model.js',import.meta.url),'utf8');
 const r3dSrc=await readFile(new URL('../dist/renderer3d.js',import.meta.url),'utf8');
 assert.ok(busModelSrc.includes('export function buildCollegeVehicle'),
   'bus-model exports dedicated College cars, scooties and campus SUVs');
 assert.ok(r3dSrc.includes('function collegeObstacle')&&r3dSrc.includes('TECH FEST · LIFE RUSH'),
   'renderer3d builds College-themed obstacles (Fest Arch, Vending Machine, Book Trolley, Scooty)');
});
