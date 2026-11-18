import test from 'node:test';import assert from 'node:assert/strict';
import {Scene,Color,Fog,DirectionalLight,HemisphereLight} from '../dist/vendor/three.module.js';
import {createSky,daylight} from '../dist/sky-scene.js';
test('daylight loop is continuous, clouds move and pause/reset are deterministic',()=>{
 const scene=new Scene();scene.background=new Color();scene.fog=new Fog(0,85,175);const sun=new DirectionalLight(),ambient=new HemisphereLight();const draw=createSky(scene,sun,ambient);
 draw({time:0});const morning=scene.background.clone(),cloud=scene.children[3].position.clone();draw({time:90});assert.equal(daylight(90).noon,1);assert.ok(!scene.background.equals(morning));assert.ok(!scene.children[3].position.equals(cloud));const paused=scene.children[3].position.clone();draw({time:90});assert.ok(scene.children[3].position.equals(paused));draw({time:180});assert.ok(scene.background.equals(morning));draw({time:0});assert.ok(scene.children[3].position.equals(cloud));
});
