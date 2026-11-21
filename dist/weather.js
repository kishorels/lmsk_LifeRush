export const WEATHER_CYCLE=80;
const keys=[
 {t:0,night:0,rain:0,top:'#0c7ff2',horizon:'#7edbff',label:'DAY'},
 {t:14,night:0,rain:0,top:'#4338ca',horizon:'#ff9752',label:'SUNSET'},
 {t:24,night:1,rain:0,top:'#07174d',horizon:'#1d4899',label:'NIGHT'},
 {t:36,night:1,rain:0,top:'#07174d',horizon:'#1d4899',label:'NIGHT'},
 {t:48,night:0,rain:0,top:'#2188f0',horizon:'#ffc178',label:'DAWN'},
 {t:56,night:0,rain:1,top:'#1a4f8a',horizon:'#67a9dc',label:'RAIN'},
 {t:64,night:0,rain:1,top:'#1a4f8a',horizon:'#67a9dc',label:'RAIN'},
 {t:72,night:0,rain:0,top:'#0c7ff2',horizon:'#7edbff',label:'CLEAR'},
 {t:80,night:0,rain:0,top:'#0c7ff2',horizon:'#7edbff',label:'DAY'}
];

export const COLLEGE_WEATHER_CYCLE = 90;
export const collegeKeys = [
 {t:0,night:0,rain:0,sun:1,rainbow:0,wet:0,top:'#0a7ceb',horizon:'#78d4ff',label:'SUNNY'},
 {t:22,night:0,rain:0,sun:1,rainbow:0,wet:0,top:'#0a7ceb',horizon:'#78d4ff',label:'SUNNY'},
 {t:30,night:0,rain:0.25,sun:0.45,rainbow:0,wet:0.2,top:'#1c3454',horizon:'#5c789a',label:'OVERCAST'},
 {t:38,night:0,rain:0.85,sun:0.10,rainbow:0,wet:0.8,top:'#15273f',horizon:'#4a6585',label:'RAIN'},
 {t:48,night:0,rain:1.0,sun:0.0,rainbow:0,wet:1.0,top:'#13243a',horizon:'#445e7c',label:'RAIN'},
 {t:58,night:0,rain:0.85,sun:0.15,rainbow:0.15,wet:1.0,top:'#172d48',horizon:'#4f6d8f',label:'RAIN'},
 {t:65,night:0,rain:0.45,sun:0.80,rainbow:1.0,wet:0.75,top:'#1476db',horizon:'#74cbff',label:'RAINBOW'},
 {t:72,night:0,rain:0.15,sun:1.0,rainbow:0.75,wet:0.5,top:'#0e7eec',horizon:'#7ed6ff',label:'RAINBOW'},
 {t:78,night:0,rain:0.0,sun:1.0,rainbow:0.0,wet:0.35,top:'#0d80ea',horizon:'#89e3ff',label:'FRESH'},
 {t:86,night:0,rain:0.0,sun:1.0,rainbow:0.0,wet:0.05,top:'#0a7ceb',horizon:'#78d4ff',label:'CLEAR'},
 {t:90,night:0,rain:0.0,sun:1.0,rainbow:0.0,wet:0.0,top:'#0a7ceb',horizon:'#78d4ff',label:'SUNNY'}
];

export function collegeWeatherAt(time){
 const t=((time%COLLEGE_WEATHER_CYCLE)+COLLEGE_WEATHER_CYCLE)%COLLEGE_WEATHER_CYCLE;
 const i=collegeKeys.findIndex((k,n)=>n<collegeKeys.length-1&&t>=k.t&&t<collegeKeys[n+1].t);
 const a=collegeKeys[i],b=collegeKeys[i+1];
 let mix=(t-a.t)/(b.t-a.t);
 mix=mix*mix*(3-2*mix);
 return {
  phase:t/COLLEGE_WEATHER_CYCLE,
  a,b,mix,
  night:a.night+(b.night-a.night)*mix,
  rain:a.rain+(b.rain-a.rain)*mix,
  sun:(a.sun??1)+((b.sun??1)-(a.sun??1))*mix,
  rainbow:(a.rainbow??0)+((b.rainbow??0)-(a.rainbow??0))*mix,
  wet:(a.wet??0)+((b.wet??0)-(a.wet??0))*mix,
  label:mix<.5?a.label:b.label
 };
}

export function itparkWeatherAt(distance = 0, time = 0) {
 if (distance === undefined || distance === null || !Number.isFinite(distance)) {
  return weatherAt(time || 0);
 }
 const FORK_FIRST = 220;
 const FORK_STRIDE = 1450;
 const FORK_WARN = 80;
 const FORK_LEN = 1000;
 const CLEAR_LEN = 100;

 const warnStart = FORK_FIRST - FORK_WARN; // 140m
 let rain = 0;
 let stormDark = 0;

 if (distance < warnStart) {
  // Good sunny weather at start (0..140m)
  rain = 0;
  stormDark = 0;
 } else {
  const rel = (distance - warnStart) % FORK_STRIDE;
  if (rel < FORK_WARN) {
   // Near 2 paths (140m..220m): gathering dark clouds, rain starts, thunder rolls
   const p = rel / FORK_WARN;
   rain = p;
   stormDark = p;
  } else if (rel < FORK_WARN + FORK_LEN) {
   // Along 2 paths (220m..1220m): full storm with dark clouds, rain, thunder & tornado
   rain = 1.0;
   stormDark = 1.0;
  } else if (rel < FORK_WARN + FORK_LEN + CLEAR_LEN) {
   // Clearing after 2 paths exit (1220m..1320m)
   const p = 1 - (rel - (FORK_WARN + FORK_LEN)) / CLEAR_LEN;
   rain = p;
   stormDark = p;
  } else {
   // Clear sunny weather until next fork cycle
   rain = 0;
   stormDark = 0;
  }
 }

 return {
  phase: 0,
  night: 0,
  rain,
  stormDark,
  sun: 1 - stormDark * 0.85,
  wet: rain,
  label: rain > 0.5 ? 'STORM' : rain > 0 ? 'RAIN' : 'CLEAR',
  a: {
   top: stormDark > 0.4 ? '#10141a' : '#0078ff',
   horizon: stormDark > 0.4 ? '#1b2028' : '#64d6ff'
  },
  b: {
   top: stormDark > 0.4 ? '#10141a' : '#0078ff',
   horizon: stormDark > 0.4 ? '#1b2028' : '#64d6ff'
  },
  mix: 0
 };
}

export function hasItParkRain(state) {
 if (!state || state.map !== 'itpark') return false;
 return sceneWeather(state).rain > 0.15;
}

export function hasCollegeRain(state) {
 if (!state || state.map !== 'college') return false;
 if ((state.mode === 'ready' || state.mode === 'select') && !state.previewRain) return false;
 return collegeWeatherAt(state.time || 0).rain > 0.05 || Boolean(state.previewRain);
}

export function sceneWeather(state) {
 if (state?.map === 'college') {
  if (state.previewRain) {
   return collegeWeatherAt(48);
  }
  return collegeWeatherAt(state.time || 0);
 }
 if (state?.map === 'itpark') {
  if (state.distance !== undefined && Number.isFinite(state.distance)) {
   return itparkWeatherAt(state.distance, state.time || 0);
  }
 }
 return weatherAt(state?.time || 0);
}
export function weatherAt(time){const t=((time%80)+80)%80,i=keys.findIndex((k,n)=>n<keys.length-1&&t>=k.t&&t<keys[n+1].t),a=keys[i],b=keys[i+1];let mix=(t-a.t)/(b.t-a.t);mix=mix*mix*(3-2*mix);return {phase:t/80,a,b,mix,night:a.night+(b.night-a.night)*mix,rain:a.rain+(b.rain-a.rain)*mix,label:mix<.5?a.label:b.label};}
export function cloudX(index,time){return ((index*19-time*(3.8+index%3*.65)+110)%220+220)%220-110;}

export function weatherColor(a,b,t){const x=parseInt(a.slice(1),16),y=parseInt(b.slice(1),16);return 'rgb('+[16,8,0].map(shift=>Math.round(((x>>shift)&255)*(1-t)+((y>>shift)&255)*t)).join(',')+')';}
