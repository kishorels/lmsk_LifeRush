// The same silhouette is used for the sky sprite and the lightweight canvas.
export const outline = [[60,0],[53,-4],[15,-5],[-6,-28],[-15,-28],[-6,-5],[-43,-4],[-53,-16],[-59,-16],[-54,-1],[-58,4],[-42,4],[-7,5],[-24,22],[-14,22],[16,5],[48,4]];
export function drawAirliner(ctx) {

  ctx.beginPath();
  outline.forEach(([x,y],i)=>i ? ctx.lineTo(x,y) : ctx.moveTo(x,y));
  ctx.closePath();
  ctx.fillStyle='#eff7ff';ctx.fill();
  ctx.strokeStyle='#406482';ctx.lineWidth=1.8;ctx.stroke();
  ctx.fillStyle='#215982';
  for(let x=-30;x<42;x+=6)ctx.fillRect(x,-2,3,2);
  ctx.fillRect(44,-2,7,2);
}
export const flightPhase = time => (time%30)/9;
