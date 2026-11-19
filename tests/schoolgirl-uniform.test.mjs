import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {AnimationMixer,Vector3} from '../dist/vendor/three.module.js';
import {GLTFLoader} from '../dist/vendor/GLTFLoader.js';

test('reference uniform and clean hairstyle stay skinned through the original animations',async()=>{
  globalThis.self=globalThis;
  globalThis.createImageBitmap=async()=>({width:1024,height:1024,close(){}});
  const bytes=await readFile(new URL('../dist/assets/schoolgirl.glb',import.meta.url));
  const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  const json=gltf.parser.json,original=json.asset.extras.uniformSourceDocument;
  assert.equal(json.asset.extras.hairVersion,1);
  assert.ok(!json.nodes.some(n=>n.name==='Ch02_Hair'&&'mesh' in n),'intersecting alpha hair cards are removed');
  assert.ok(!json.nodes.some(n=>n.name.startsWith('Swept crown twist')&&'mesh' in n),'raised temple loops are removed');
  assert.ok(json.materials.some(m=>m.name==='Hair | natural dark brown'&&m.pbrMetallicRoughness.metallicFactor===0));
  assert.equal(json.animations.length,original.animations.length);
  assert.deepEqual(json.skins,original.skins,'existing skeleton is preserved');
  for(let i=0;i<original.animations.length;i++){
    assert.deepEqual(json.animations[i].channels.slice(0,-1),original.animations[i].channels,'original motion channels remain intact');
    assert.equal(json.animations[i].channels.at(-1).target.path,'weights','cloth motion is blended into the existing action');
  }
  const uniform=[],skirts=[];
  gltf.scene.traverse(o=>{
    if(o.isMesh&&(o.material.name.startsWith('Uniform |')||o.material.name.startsWith('Hair |'))){
      assert.ok(o.isSkinnedMesh);
      uniform.push(o);
      const weights=o.geometry.attributes.skinWeight;
      for(let i=0;i<weights.count;i+=17)assert.ok(Math.abs(weights.getX(i)+weights.getY(i)+weights.getZ(i)+weights.getW(i)-1)<.001);
      if(o.name.includes('pleated_skirt'))skirts.push(o);
    }
  });
  assert.ok(uniform.some(o=>o.material.name.includes('charcoal woven wool')&&o.material.normalMap));
  assert.ok(uniform.some(o=>o.name.includes('folded_red_bow')));
  assert.ok(uniform.some(o=>o.name.includes('eight_silver_buttons')));
  const hair=uniform.filter(o=>o.material.name.startsWith('Hair |'));
  assert.ok(hair.some(o=>o.name.includes('smooth_swept_crown')));
  assert.ok(hair.every(o=>!o.material.transparent&&o.material.opacity===1),'hair stays opaque without cutout-card artefacts');
  assert.ok(hair.every(o=>o.material.map&&o.material.normalMap),'fine strand texture replaces raised comb spokes');
  assert.equal(skirts.length,2,'hem bands and black pleats use the same animated skirt');
  assert.ok(skirts.every(o=>o.morphTargetInfluences.length===2));
  const mixer=new AnimationMixer(gltf.scene);
  for(const clip of gltf.animations){
    mixer.stopAllAction();mixer.clipAction(clip).reset().play();
    for(let frame=0;frame<16;frame++){
      mixer.update(clip.duration/16);gltf.scene.updateMatrixWorld(true);
      for(const mesh of uniform){
        mesh.skeleton.update();
        for(let i=0;i<mesh.geometry.attributes.position.count;i+=53){
          const p=mesh.getVertexPosition(i,new Vector3());
          assert.ok(p.toArray().every(Number.isFinite),clip.name+' deforms the actual uniform');
        }
      }
    }
  }
});
