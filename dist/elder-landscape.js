// World units are metres. The same planting and greeting timing drive both renderers.
export const elderTrees = [
  {name:'banyan',width:12,height:10,bend:.23},
  {name:'mango',width:7.1,height:7.8,bend:.32},
  {name:'coconut',width:6,height:9.5,bend:.63},
  {name:'plantain',width:3.7,height:4.1,bend:.34},
  {name:'neem',width:6.8,height:8.4,bend:.38}
];

export function planting(index,side){
  const key=Math.abs(index*13+(side<0?3:0));
  return Array.from({length:3},(_,j)=>{
    const species=elderTrees[(key+j*2)%elderTrees.length];
    const scale=.83+.23*(.5+.5*Math.sin(key*3.73+j));
    return {...species,w:species.width*scale,h:species.height*scale,
      x:side*(j===1?14.2:species.name==='banyan'?9.6:6.7+.8*Math.cos(key+j)),
      z:-10+j*9+1.7*Math.sin(key+j*6.4)};
  });
}
export const greeterSpacing=155;
export const greeterStart=28;
export function greetingFrame(metresAhead){
  const t=Math.min(1,Math.max(0,(23-metresAhead)/26));
  // Slower at the deepest bow, then unfold as the runner passes.
  const key=[0,.18,.32,.52,.67,.84,1],pose=[0,5,10,15,15,20,25];
  for(let i=1;i<key.length;i++)if(t<=key[i]){
    const u=(t-key[i-1])/(key[i]-key[i-1]);
    return Math.round(pose[i-1]+(pose[i]-pose[i-1])*u*u*(3-2*u));
  }
  return 25;
}
export const propSizes={logs:[6.45,1.05],haycart:[2.25,1.96],arch:[6.67,5.6],rock:[1.85,1.42],pot:[1.15,1.12],crate:[1.68,1.08],fence:[6.2,1.08],cloth:[6.55,2.96]};
