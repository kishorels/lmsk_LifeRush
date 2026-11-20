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
export function weatherAt(time){const t=((time%80)+80)%80,i=keys.findIndex((k,n)=>n<keys.length-1&&t>=k.t&&t<keys[n+1].t),a=keys[i],b=keys[i+1];let mix=(t-a.t)/(b.t-a.t);mix=mix*mix*(3-2*mix);return {phase:t/80,a,b,mix,night:a.night+(b.night-a.night)*mix,rain:a.rain+(b.rain-a.rain)*mix,label:mix<.5?a.label:b.label};}
export function cloudX(index,time){return ((index*19-time*(3.8+index%3*.65)+110)%220+220)%220-110;}

export function weatherColor(a,b,t){const x=parseInt(a.slice(1),16),y=parseInt(b.slice(1),16);return 'rgb('+[16,8,0].map(shift=>Math.round(((x>>shift)&255)*(1-t)+((y>>shift)&255)*t)).join(',')+')';}
