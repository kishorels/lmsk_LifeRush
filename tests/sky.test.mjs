import test from 'node:test';import assert from 'node:assert/strict';
import {Scene,Color,Fog,DirectionalLight,HemisphereLight} from '../dist/vendor/three.module.js';
import {createSky} from '../dist/sky-scene.js';import {weatherAt,cloudX,sceneWeather} from '../dist/weather.js';
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

test('college shower animates during a run and releases the sky when changing maps',()=>{
 const scene=new Scene();
 scene.background=new Color();
 scene.fog=new Fog(0,85,175);
 const update=createSky(scene,new DirectionalLight(),new HemisphereLight());
 const state={map:'college',mode:'ready',time:0,distance:0,x:0};
 update(state);
 const dome=scene.children[0],clearMaterial=dome.material;
 assert.equal(scene.getObjectByName('college-shower'),undefined);
 state.mode='running';
 state.time=48;
 assert.equal(update(state).rain,1);
 const shower=scene.getObjectByName('college-shower');
 const drops=shower.children[0].geometry.attributes.position;
 const spray=shower.children[2].geometry;
 const initial=drops.getY(0);
 state.time=48.1;update(state);
 assert.notEqual(drops.getY(0),initial);
 const paused=drops.getY(0);
 update(state);
 assert.equal(drops.getY(0),paused);
 assert.ok(spray.drawRange.count>0);
 state.jump=.5;update(state);
 assert.equal(spray.drawRange.count,0);
 assert.notEqual(dome.material,clearMaterial);
 for(const map of ['school','itpark']){
  state.map=map;
  for(const time of [0,30,60]){
   state.time=time;
   assert.deepEqual(update(state),sceneWeather(state));
   assert.equal(shower.visible,false);
   assert.equal(dome.material,clearMaterial);
  }
 }
 state.map='college';state.time=48;update(state);
 assert.equal(shower.visible,true);
 assert.equal(drops.getY(0),initial);
});

test('college dynamic weather cycles through sun, gathering storm, shower, rainbow, and post-rain fresh climate',()=>{
 const scene=new Scene();
 scene.background=new Color();
 scene.fog=new Fog(0,85,175);
 const update=createSky(scene,new DirectionalLight(),new HemisphereLight());
 const state={map:'college',mode:'running',time:0,distance:100,x:0};
 
 // 1. Initial stage: bright warm SUN
 state.time=10;
 const sunny=update(state);
 assert.equal(sunny.rain, 0);
 assert.equal(sunny.sun, 1);
 assert.equal(sunny.rainbow, 0);
 const rainbow=scene.getObjectByName('college-rainbow');
 assert.ok(rainbow);
 assert.equal(rainbow.visible, false);
 const shower=scene.getObjectByName('college-shower');
 assert.equal(shower.visible, false);

 // 2. Dark storm clouds and heavy mountain rain shower
 state.time=48;
 const stormy=update(state);
 assert.ok(stormy.rain >= 0.95);
 assert.ok(stormy.sun <= 0.1);
 assert.equal(shower.visible, true);
 assert.equal(rainbow.visible, false);

 // 3. Sunbreak and RAINBOW while rain is still present
 state.time=65;
 const rainbowWeather=update(state);
 assert.ok(rainbowWeather.rainbow >= 0.9);
 assert.ok(rainbowWeather.rain > 0.1);
 assert.ok(rainbowWeather.sun > 0.6);
 assert.equal(rainbow.visible, true);
 assert.ok(rainbow.material.opacity > 0.5);

 // 4. Post-rain fresh hill climate: rain stopped, rainbow faded, drying moist road
 state.time=80;
 const fresh=update(state);
 assert.equal(fresh.rain, 0);
 assert.equal(fresh.rainbow, 0);
 assert.equal(rainbow.visible, false);
 assert.equal(shower.visible, false);
 assert.equal(fresh.sun, 1);
 assert.ok(fresh.wet > 0);
});
