import test from 'node:test';
import * as T from '../dist/vendor/three.module.js';
import {loadRunnerModel} from '../dist/runner-model.js';
import {loadChaserModel} from '../dist/chaser-model.js';
import {createCaptureScene} from '../dist/capture-scene.js';
import {fresh} from '../dist/engine.js';
import {readFile} from 'node:fs/promises';
test('actual hero and villain heads remain above the result card throughout the final lift',async()=>{
const realFetch=globalThis.fetch;globalThis.fetch=async(request,options)=>{const url=typeof request==='string'?request:request.url;return url.startsWith('file:')?new Response(await readFile(new URL(url))):realFetch(request,options);};globalThis.self=globalThis;globalThis.createImageBitmap=async()=>({width:1024,height:1024,close(){}});globalThis.ProgressEvent=class extends Event{constructor(type,init){super(type);Object.assign(this,init);}};
const scene=new T.Scene(),hero=new T.Group(),fallback=new T.Group();scene.add(hero);const run=loadRunnerModel(hero),chase=loadChaserModel(scene),capture=createCaptureScene(scene),camera=new T.PerspectiveCamera(64,390/800,.1,180);
for(let i=0;i<100&&(!run.model||!chase.model);i++)await new Promise(r=>setTimeout(r,20));
if(!run.model||!chase.model)throw Error('Models not loaded');
const s=fresh();s.mode='captured';
for(const t of [0,.5,1.3,2.65]){s.capture=t;capture.restore();run(s,'male',.016);chase(s);capture.frame(camera,s,hero,run.model,fallback,chase.root,chase.model);scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);for(const [name,m]of [['hero',run.model],['villain',chase.model]]){const p=m.getObjectByName('mixamorigHead').getWorldPosition(new T.Vector3()).project(camera);if(t>1.2&&(Math.abs(p.x)>.9||p.y<-.2||p.y>.9))throw Error('Head outside upper visible stage');}}

});
