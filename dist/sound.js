// Locally synthesized effects: no downloads, keys or recurring audio requests.
export function createSound() {
 let context,master,enabled=true,nextStep=0,lastTime=0;
 function unlock(){try{context??=new (window.AudioContext||window.webkitAudioContext)();if(!master){master=context.createGain();master.connect(context.destination);}master.gain.value=enabled?.65:0;context.resume().catch(()=>{});}catch{}}
 function tone(from,to,duration=.12,volume=.1,type='sine',delay=0){
  if(!enabled||!context||context.state!=='running')return;
  const t=context.currentTime+delay,o=context.createOscillator(),g=context.createGain();
  o.type=type;o.frequency.setValueAtTime(from,t);o.frequency.exponentialRampToValueAtTime(Math.max(20,to),t+duration);
  g.gain.setValueAtTime(.001,t);g.gain.exponentialRampToValueAtTime(volume,t+.008);g.gain.exponentialRampToValueAtTime(.001,t+duration);
  o.connect(g).connect(master);o.onended=()=>{o.disconnect();g.disconnect();};o.start(t);o.stop(t+duration+.01);
 }
 function play(name,cause){
  if(name==='jump')tone(240,730,.19,.10,'triangle');
  else if(name==='slide')tone(410,65,.20,.10,'sawtooth');
  else if(name==='coin'){tone(880,1320,.10,.12);tone(1320,1760,.13,.10,'sine',.075);}
  else if(name==='hit'){const impact={bus:[97,780],van:[125,590],sideVehicle:[155,890],block:[100,200],jump:[180,270],slide:[200,1050]}[cause]||[140,400];
   tone(impact[0],32,.18,.19,'triangle');tone(impact[1],impact[1]*.4,.12,.10,'square');
   tone(185,84,.21,.12,'sawtooth',.065);tone(510,290,.15,.055,'triangle',.075);}
  else if(name==='horn'){tone(185,180,.30,.10,'sawtooth');tone(247,240,.30,.07,'triangle');}
  else if(name==='start'){for(let i=0;i<3;i++)tone(440*2**(i/4),440*2**(i/4),.13,.1,'triangle',i*.10);}
  else if(name==='laugh'){for(let i=0;i<4;i++)tone(140-i*8,78-i*4,.14,.10,'sawtooth',i*.22);}
  else if(name==='over'){tone(260,80,.45,.15,'triangle');}
  else if(name==='lane')tone(160,95,.07,.04,'triangle');
 }
 return {unlock,play,setEnabled(value){enabled=value;if(master)master.gain.value=enabled?.65:0;if(value)unlock();},
 update(s){
  if(s.time<lastTime)nextStep=0;lastTime=s.time;
  if(s.mode!=='running')return;
  if(!s.jump&&!s.drop&&!s.fallSpeed&&!s.slide&&!s.roll&&s.time>=nextStep){tone(100,40,.055,.055,'triangle');nextStep=s.time+.19*22/s.speed;}
  for(const bus of s.items)if(bus.type==='bus'&&!bus.roofRide&&(!bus.encounter||bus.started)&&!bus.horned&&bus.z-s.distance<65&&bus.z>s.distance){bus.horned=true;play('horn');}
 }};
}
