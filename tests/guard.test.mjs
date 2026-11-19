import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Group, AnimationMixer, Vector3} from '../dist/vendor/three.module.js';
import {GLTFLoader} from '../dist/vendor/GLTFLoader.js';
import {createGuardEffect} from '../dist/guard-effect.js';

test('amber curved panels orbit both runners, freeze, break and reset', async () => {
  globalThis.self = globalThis;
  globalThis.createImageBitmap = async () => ({width:1024,height:1024,close(){}});
  const runner = new Group();
  const update = createGuardEffect(runner);
  const armour = runner.getObjectByName('guard-protection');
  const leftShield = runner.getObjectByName('guard-panel-0');
  const rightShield = runner.getObjectByName('guard-panel-1');
  let time = 0;
  for (const asset of ['runverse-schoolboy', 'schoolgirl']) {
    const bytes = await readFile(new URL('../dist/assets/' + asset + '.glb', import.meta.url));
    const {scene:model, animations} = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
    model.scale.setScalar(1.22);
    model.rotation.y = Math.PI;
    runner.add(model);
    const mixer = new AnimationMixer(model);
    update({time:0,shield:false}, model);
    assert.equal(armour.visible, false);
    time = .01;
    update({time,shield:true}, model);
    const assembling = leftShield.position.clone();
    time = 1;
    update({time,shield:true}, model);
    assert.ok(leftShield.position.distanceTo(assembling) > .1);
    assert.equal(leftShield.scale.x, 1);
    assert.equal(rightShield.visible, true);
    const panels=armour.children.filter(o=>o.name.startsWith('guard-panel-'));
    assert.equal(panels.length,3);
    for(const panel of panels){
      assert.ok(Math.hypot(panel.position.x,panel.position.z)>.95, 'panels surround the runner with open gaps');
      const face=panel.getObjectByName('guard-hex-surface');
      assert.equal(face.material.transparent,true);
      assert.equal(face.material.depthWrite,false);
      const frame=panel.getObjectByName('guard-gold-frame');
      assert.ok(frame.material.isMeshStandardMaterial,'wide gold frame responds to scene light');
      assert.ok(frame.material.emissiveIntensity>0);
      assert.ok(panel.getObjectByName('guard-gold-tabs'));
      const glow=panel.getObjectByName('guard-soft-glow');
      assert.ok(glow.material.isShaderMaterial,'glow fades softly instead of drawing a thick wire');
      face.geometry.computeBoundingBox();
      assert.ok(face.geometry.boundingBox.getSize(new Vector3()).z>.1, 'panels curve around the runner');
    }
    const orbit=leftShield.position.clone();
    update({time:1.2,shield:true},model);
    assert.ok(leftShield.position.distanceTo(orbit)>.01,'panels orbit while protection stays active');
    time=1.2;
    assert.equal(armour.getObjectByName('guard-back-lower'), undefined);
    assert.equal(armour.getObjectByName('guard-clear-shell'), undefined);
    let spine;
    model.traverse(o => {if (o.isBone && o.name.endsWith('Spine1')) spine = o;});
    for (const name of ['Run', 'Jump', 'Slide', 'Roll']) {
      mixer.stopAllAction();
      mixer.clipAction(animations.find(clip => clip.name === name)).reset().play();
      for (let frame = 0; frame < 15; frame++) {
        mixer.update(1 / 30);
        time += 1 / 30;
        update({time,shield:true}, model);
        const expected = runner.worldToLocal(spine.getWorldPosition(new Vector3()));
        assert.ok(armour.position.distanceTo(expected) < 1e-6, asset + ' ' + name);
        armour.updateMatrixWorld(true);
        armour.traverse(o => assert.ok(o.matrixWorld.elements.every(Number.isFinite)));
      }
    }
    const frozen = leftShield.matrixWorld.clone();
    update({time,shield:true,mode:'paused'}, model);
    armour.updateMatrixWorld(true);
    assert.ok(leftShield.matrixWorld.equals(frozen));
    const attached = leftShield.position.clone();
    update({time:time+.01,shield:false,hit:.45,shieldAbsorbed:false}, model);
    update({time:time+.2,shield:false,hit:.25}, model);
    assert.equal(armour.visible, true);
    assert.ok(leftShield.position.distanceTo(attached) > .1);
    assert.ok(leftShield.scale.x < 1);
    update({time:time+.8,shield:false,hit:0}, model);
    assert.equal(armour.visible, false);
    update({time:0,shield:false}, model);
    assert.equal(armour.visible, false);
    runner.remove(model);
  }
});
