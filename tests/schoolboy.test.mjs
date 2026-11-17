import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {GLTFLoader} from '../dist/vendor/GLTFLoader.js';import {AnimationMixer,Vector3} from '../dist/vendor/three.module.js';
test('uniform and all eight animations remain skinned and finite',async()=>{
 globalThis.self=globalThis;globalThis.createImageBitmap=async()=>({width:1024,height:1024,close(){}});
 const bytes=await readFile(new URL('../dist/assets/runverse-schoolboy.glb',import.meta.url));
 const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 assert.deepEqual(gltf.animations.map(a=>a.name).sort(),['Fall','HeadHit','Idle','Jump','Roll','Run','Slide','Stumble']);
 let tie=false;gltf.scene.traverse(o=>{if(o.name.includes('School_tie')){assert.ok(o.isSkinnedMesh);tie=true;}});assert.ok(tie);
 const mixer=new AnimationMixer(gltf.scene);
 for(const clip of gltf.animations){mixer.stopAllAction();mixer.clipAction(clip).reset().play();for(let t=0;t<12;t++){
  mixer.update(clip.duration/12);gltf.scene.updateMatrixWorld(true);
  gltf.scene.traverse(o=>{assert.ok(o.matrixWorld.elements.every(Number.isFinite));if(o.isSkinnedMesh){o.skeleton.update();for(let i=0;i<o.geometry.attributes.position.count;i+=31){const p=o.getVertexPosition(i,new Vector3());assert.ok(p.toArray().every(Number.isFinite));}}});
 }}
});
