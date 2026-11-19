import {flightPhase} from './airliner.js';
// Locally synthesized effects & real MP3 audio stream.
const SAMPLES = {
 coin: new URL('./assets/coins_collect.mp3', import.meta.url).href,
 roofCoin: new URL('./assets/coins_collect1.mp3', import.meta.url).href,
 shield: new URL('./assets/shiled_collect.mp3', import.meta.url).href,
 magnet: new URL('./assets/magnectic_power_collect.mp3', import.meta.url).href,
 swag: new URL('./assets/gesture_action_sound.mp3', import.meta.url).href,
 bus: new URL('./assets/bus_sound.mp3', import.meta.url).href,
};

export function createSound() {
 let context,master,enabled=true,jetNoise,jetVoice,bgm=null;
 const buffers=new Map();
 let loadingSamples=false;

 function loadSamples(){
  if(loadingSamples||!context?.decodeAudioData||typeof fetch==='undefined')return;
  loadingSamples=true;
  for(const [key,url] of Object.entries(SAMPLES)){
   fetch(url)
    .then(r=>r.arrayBuffer())
    .then(b=>context.decodeAudioData(b))
    .then(decoded=>{buffers.set(key,decoded);})
    .catch(()=>{});
  }
 }

 function playSample(key,volume=.8){
  if(!enabled||!context||context.state!=='running')return false;
  const buf=buffers.get(key);
  if(!buf)return false;
  try{
   const src=context.createBufferSource();
   src.buffer=buf;
   const g=context.createGain();
   g.gain.value=volume;
   src.connect(g).connect(master);
   src.onended=()=>{src.disconnect();g.disconnect();};
   src.start();
   return true;
  }catch{
   return false;
  }
 }

 function initBgm(){
  if(typeof Audio==='undefined')return;
  if(!bgm){
   try{
    bgm=new Audio(new URL('./assets/bgm.mp3',import.meta.url).href);
    bgm.loop=true;
    bgm.volume=.42;
   }catch{}
  }
 }
 function startBgm(){
  initBgm();
  if(!bgm||!enabled)return;
  if(bgm.paused)bgm.play().catch(()=>{});
 }
 function pauseBgm(){
  if(bgm&&!bgm.paused)bgm.pause();
 }
 function unlock(){
  startBgm();
  try{
   context??=new (window.AudioContext||window.webkitAudioContext)();
   if(!master){master=context.createGain();master.connect(context.destination);}
   master.gain.value=enabled?.65:0;
   context.resume().catch(()=>{});
   loadSamples();
  }catch{}
 }
 function tone(from,to,duration=.12,volume=.1,type='sine',delay=0){
  if(!enabled||!context||context.state!=='running')return;
  const t=context.currentTime+delay,o=context.createOscillator(),g=context.createGain();
  o.type=type;o.frequency.setValueAtTime(from,t);o.frequency.exponentialRampToValueAtTime(Math.max(20,to),t+duration);
  g.gain.setValueAtTime(.001,t);g.gain.exponentialRampToValueAtTime(volume,t+.008);g.gain.exponentialRampToValueAtTime(.001,t+duration);
  o.connect(g).connect(master);o.onended=()=>{o.disconnect();g.disconnect();};o.start(t);o.stop(t+duration+.01);
 }
 function flyover(s){
  const phase=flightPhase(s.time);
  if(!enabled || !context?.createBuffer || context.state!=='running' || s.mode!=='running' || phase>=1){
   if(jetVoice){jetVoice.source.stop();jetVoice=null;}return;
  }
  if(!jetVoice){
   if(!jetNoise){
    jetNoise=context.createBuffer(1,context.sampleRate*2,context.sampleRate);
    const samples=jetNoise.getChannelData(0);let low=0;
    for(let i=0;i<samples.length;i++){low=.86*low+.14*(Math.random()*2-1);samples[i]=low*2;}
   }
   const source=context.createBufferSource(),filter=context.createBiquadFilter(),gain=context.createGain();
   source.buffer=jetNoise;source.loop=true;filter.type='lowpass';gain.gain.value=0;
   source.connect(filter).connect(gain).connect(master);
   source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};
   source.start();jetVoice={source,filter,gain};
  }
  const level=Math.exp(-Math.abs(phase-.83)*(phase<.83?6:19)),now=context.currentTime;
  jetVoice.gain.gain.setTargetAtTime(.52*level,now,.06);
  jetVoice.filter.frequency.setTargetAtTime(240+1900*level,now,.07);
  jetVoice.source.playbackRate.setTargetAtTime(phase<.83?1.13:.76,now,.18);
 }
 function play(name,cause){
  if(name==='jump')tone(240,730,.19,.10,'triangle');
  else if(name==='slide')tone(410,65,.20,.10,'sawtooth');
  else if(name==='roofCoin'){
   if(!playSample('roofCoin',.75)){
    tone(2180,2140,.14,.095);tone(3530,3450,.095,.045);tone(1120,1110,.19,.065,'sine',.022);
   }
  }
  else if(name==='coin'){
   if(!playSample('coin',.70)){
    tone(880,1320,.10,.12);tone(1320,1760,.13,.10,'sine',.075);
   }
  }
  else if(name==='hit'){const impact={bus:[97,780],van:[125,590],sideVehicle:[155,890],block:[100,200],jump:[180,270],slide:[200,1050]}[cause]||[140,400];
   tone(impact[0],32,.18,.19,'triangle');tone(impact[1],impact[1]*.4,.12,.10,'square');
   tone(185,84,.21,.12,'sawtooth',.065);tone(510,290,.15,.055,'triangle',.075);}
  else if(name==='horn'){
   tone(185,180,.30,.10,'sawtooth');tone(247,240,.30,.07,'triangle');
   playSample('bus',.45);
  }
  else if(name==='start'){for(let i=0;i<3;i++)tone(440*2**(i/4),440*2**(i/4),.13,.1,'triangle',i*.10);}
  else if(name==='laugh'){for(let i=0;i<4;i++)tone(140-i*8,78-i*4,.14,.10,'sawtooth',i*.22);}
  else if(name==='over'){tone(260,80,.45,.15,'triangle');}
  else if(name==='lane')tone(160,95,.07,.04,'triangle');
  else if(name==='bell'){for(let i=0;i<4;i++){tone(1180,1176,.28,.14,'sine',i*.18);tone(1780,1770,.22,.10,'triangle',i*.18+.02);}}
  else if(name==='magnet'){
   if(!playSample('magnet',.75)){
    tone(420,880,.25,.11,'sine');tone(880,1320,.20,.09,'triangle',.12);
   }
  }
  else if(name==='shield'){
   if(!playSample('shield',.80)){
    tone(320,640,.18,.12,'triangle');tone(640,960,.22,.10,'sine',.09);tone(960,1280,.25,.08,'sine',.18);
   }
  }
  else if(name==='book'){tone(620,980,.12,.11,'triangle');tone(980,1470,.14,.10,'sine',.06);}
  else if(name==='swag'){
   if(!playSample('swag',.85)){
    tone(180,680,.22,.18,'triangle');tone(90,45,.32,.22,'sawtooth',.06);tone(680,1200,.18,.12,'sine',.16);
   }
  }
 }
 return {unlock,play,startBgm,pauseBgm,setEnabled(value){
  enabled=value;
  if(master)master.gain.value=enabled?.65:0;
  if(value){startBgm();unlock();}
  else{pauseBgm();}
 },
 update(s){
  flyover(s);
  if(s.mode!=='running')return;
  for(const bus of s.items)if(bus.type==='bus'&&!bus.roofRide&&(!bus.encounter||bus.started)&&!bus.horned&&bus.z-s.distance<65&&bus.z>s.distance){bus.horned=true;play('horn');}
 }};
}
