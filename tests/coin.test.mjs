import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Box3, EquirectangularReflectionMapping, Group, Vector3} from '../dist/vendor/three.module.js';
import {makeCoin, preloadCoinModel, spinCoin} from '../dist/coin.js';

test('the supplied textured coin loads once, fits pickups, shares resources and preserves collection', async () => {
  const nativeFetch = globalThis.fetch;
  globalThis.fetch = async (request, options) => {
    const url = typeof request === 'string' ? request : request.url;
    return url.startsWith('file:') ? new Response(await readFile(new URL(url))) : nativeFetch(request, options);
  };
  globalThis.self = globalThis;
  globalThis.createImageBitmap = async () => ({width:1024,height:1024,close(){}});
  globalThis.ProgressEvent = class extends Event {
    constructor(type, init) { super(type); Object.assign(this, init); }
  };
  try {
    const parent = new Group();
    const first = makeCoin(parent, 1, 2.32, -4);
    const second = makeCoin(parent, -1, 2.32, -8);
    first.visible = false; // A pickup can be collected while textures are loading.
    const loading = preloadCoinModel();
    assert.equal(preloadCoinModel(), loading);
    const model = await loading;
    assert.ok(model, 'bundled GLB must load successfully');
    await Promise.resolve();
    assert.equal(first.visible, false);
    assert.equal(first.userData.coinModelReady, true);
    assert.equal(second.userData.coinModelReady, true);
    assert.equal(first.parent, parent);
    assert.deepEqual(first.position.toArray(), [1, 2.32, -4]);
    const size = new Box3().setFromObject(model).getSize(new Vector3());
    assert.ok(Math.abs(size.x - .54) < .001);
    assert.ok(Math.abs(size.y - .54) < .001, 'coin stands upright');
    assert.ok(size.z < .1, 'coin stays thin');
    const meshes = [];
    second.traverse(o => {if (o.isMesh) meshes.push(o);});
    assert.equal(meshes.length, 2, 'original coin face and outline meshes are retained');
    assert.ok(meshes.some(o => o.material.map && o.material.normalMap && o.material.metalnessMap));
    const face=meshes.find(o=>o.material.map);
    const outline=meshes.find(o=>!o.material.map);
    assert.equal(outline.visible,false,'black cartoon outline must not darken the coin');
    assert.equal(face.visible,true);
    assert.equal(face.material.envMap.mapping,EquirectangularReflectionMapping);
    assert.ok(face.material.envMap.image.data.some(value=>value>1),'gold gets HDR reflections');
    assert.ok(face.material.metalness<1,'painted red areas retain diffuse light');
    assert.equal(face.material.emissiveMap,face.material.map,'shadow fill preserves the red/gold colours');
    assert.ok(face.material.emissiveIntensity>0 && face.material.emissiveIntensity<.25);
    assert.ok(second.scale.x>1,'coin details remain readable at pickup scale');
    const otherMeshes = [];
    first.traverse(o => {if (o.isMesh) otherMeshes.push(o);});
    assert.equal(meshes[0].geometry, otherMeshes[0].geometry);
    assert.equal(meshes[0].material, otherMeshes[0].material);
    assert.equal(meshes[0].material.envMap,otherMeshes[0].material.envMap);
    spinCoin(second, 2, 1, 2.32);
    assert.equal(second.position.x, -1);
    assert.equal(second.position.z, -8);
    assert.ok(Math.abs(second.position.y - 2.32) <= .06);
    const position = second.position.clone(), rotation = second.rotation.clone();
    spinCoin(second, 2, 1, 2.32);
    assert.ok(second.position.equals(position));
    assert.ok(second.rotation.equals(rotation));
  } finally {
    globalThis.fetch = nativeFetch;
  }
});
