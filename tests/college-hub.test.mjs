import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Scene} from '../dist/vendor/three.module.js';
import {createCollegeCampus} from '../dist/college-scene.js';
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
 assert.ok(gameSrc.includes("if(e.target.closest('input, textarea, select')) return;"),
   'input elements bypass game control preventDefault so keys like s, a, d, w, and spaces type cleanly');
 assert.ok(!gameSrc.includes("$('start').disabled=waiting;"),
   'start button is not locked disabled by loading poll');
});
