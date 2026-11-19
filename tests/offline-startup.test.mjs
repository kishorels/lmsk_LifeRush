import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('startup acknowledges the installed bundle without fetching an update',async()=>{
 let ready=0,downloads=0,network=0;
 const originalWindow=globalThis.window,originalFetch=globalThis.fetch;
 globalThis.window={Capacitor:{Plugins:{CapacitorUpdater:{
  async notifyAppReady(){ready++;},
  async download(){downloads++;},
  async set(){downloads++;}
 }}}};
 globalThis.fetch=async()=>{network++;throw new Error('network request during offline startup');};
 try{
  await import('../dist/live-update.js?offline-startup-test');
  assert.equal(ready,1);
  assert.equal(downloads,0);
  assert.equal(network,0);
 }finally{
  globalThis.window=originalWindow;
  globalThis.fetch=originalFetch;
 }
});

test('installed Android config disables native automatic bundle downloads',async()=>{
 const source=JSON.parse(await readFile(new URL('../capacitor.config.json',import.meta.url),'utf8'));
 const packaged=JSON.parse(await readFile(new URL('../android/app/src/main/assets/capacitor.config.json',import.meta.url),'utf8'));
 assert.equal(source.plugins.CapacitorUpdater.autoUpdate,'off');
 assert.equal(source.plugins.CapacitorUpdater.statsUrl,'');
 assert.equal(source.plugins.CapacitorUpdater.resetWhenUpdate,true);
 assert.deepEqual(packaged.plugins.CapacitorUpdater,source.plugins.CapacitorUpdater);
 assert.equal('url' in source.server,false,'the WebView serves packaged files locally');
});
