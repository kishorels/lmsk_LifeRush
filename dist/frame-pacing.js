// Timestamps are animation-frame timestamps in milliseconds. Only drawing is paced.
export function createFramePacer() {
  let target, previousTick, previousDraw, nextDraw, windowStart, samples, slow, fast;
  function reset() {
    target=60;
    previousTick=previousDraw=nextDraw=windowStart=null;
    samples=slow=fast=0;
  }
  reset();
  function frame(now) {
    if(previousTick===null || now-previousTick>250 || now<=previousTick) {
      reset();
      windowStart=nextDraw=now;
    } else {
      const interval=now-previousTick;
      samples++;
      if(interval>21)slow++;
      if(interval<19)fast++;
      const windowMs=target===60?2000:12000;
      if(now-windowStart>=windowMs){
        const nextTarget=target===60 && slow>samples*.30 ? 30
          : target===30 && fast>samples*.90 ? 60 : target;
        if(target!==nextTarget)nextDraw=now;
        target=nextTarget;
        windowStart=now;
        samples=slow=fast=0;
      }
    }
    previousTick=now;
    if(now+.75<nextDraw)return null;
    const period=1000/target;
    nextDraw+=Math.max(1,Math.floor((now+.75-nextDraw)/period)+1)*period;
    const elapsed=previousDraw===null?0:(now-previousDraw)/1000;
    previousDraw=now;
    return elapsed;
  }
  return {frame,reset,get target(){return target;}};
}
