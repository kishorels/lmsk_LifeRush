import test from 'node:test';import assert from 'node:assert/strict';
import {Scene,Color,Fog,DirectionalLight,HemisphereLight} from '../dist/vendor/three.module.js';
import {createSky} from '../dist/sky-scene.js';import {weatherAt,cloudX} from '../dist/weather.js';
test('weather includes night and rain, moves clouds left and restores deterministically',()=>{
 const scene=new Scene();scene.background=new Color();scene.fog=new Fog(0,85,175);const draw=createSky(scene,new DirectionalLight(),new HemisphereLight());
 draw({time:0});const start=scene.background.clone(),cloud=scene.children[3].position.clone();
 assert.ok(cloudX(3,1)<cloudX(3,0));assert.equal(weatherAt(30).night,1);assert.equal(weatherAt(60).rain,1);
 for(const time of [10,30,45,60,75]){draw({time});scene.traverse(o=>assert.ok(o.position.toArray().every(Number.isFinite)));}
 draw({time:30});assert.ok(scene.children.find(o=>o.isPoints).visible);assert.ok(!scene.children.find(o=>o.isLineSegments).visible);
 draw({time:60});assert.ok(scene.children.find(o=>o.isLineSegments).visible);assert.ok(!scene.children.find(o=>o.isPoints).visible);
 const paused=scene.children[3].position.clone();draw({time:60});assert.ok(scene.children[3].position.equals(paused));
 draw({time:80});assert.ok(scene.background.equals(start));draw({time:0});assert.ok(scene.children[3].position.equals(cloud));
});
