export const WEATHER_CYCLE=80;
const keys=[
 {t:0,night:0,rain:0,top:'#399fe9',horizon:'#c3e7fa',label:'DAY'},
 {t:12,night:0,rain:0,top:'#bd6b9b',horizon:'#ffc183',label:'SUNSET'},
 {t:22,night:1,rain:0,top:'#0a1639',horizon:'#35547e',label:'NIGHT'},
 {t:38,night:1,rain:0,top:'#0a1639',horizon:'#35547e',label:'NIGHT'},
 {t:48,night:0,rain:0,top:'#6aaee1',horizon:'#ffcfab',label:'DAWN'},
 {t:56,night:0,rain:1,top:'#435a75',horizon:'#a1b5c7',label:'RAIN'},
 {t:65,night:0,rain:1,top:'#435a75',horizon:'#a1b5c7',label:'RAIN'},
 {t:74,night:0,rain:0,top:'#399fe9',horizon:'#c3e7fa',label:'CLEAR'},
 {t:80,night:0,rain:0,top:'#399fe9',horizon:'#c3e7fa',label:'DAY'}
];
export function weatherAt(time){const t=((time%80)+80)%80,i=keys.findIndex((k,n)=>n<keys.length-1&&t>=k.t&&t<keys[n+1].t),a=keys[i],b=keys[i+1];let mix=(t-a.t)/(b.t-a.t);mix=mix*mix*(3-2*mix);return {phase:t/80,a,b,mix,night:a.night+(b.night-a.night)*mix,rain:a.rain+(b.rain-a.rain)*mix,label:mix<.5?a.label:b.label};}
export function cloudX(index,time){return ((index*19-time*(3.8+index%3*.65)+110)%220+220)%220-110;}

export function weatherColor(a,b,t){const x=parseInt(a.slice(1),16),y=parseInt(b.slice(1),16);return 'rgb('+[16,8,0].map(shift=>Math.round(((x>>shift)&255)*(1-t)+((y>>shift)&255)*t)).join(',')+')';}
