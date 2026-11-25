import('./live-update.js?v=offline-1').catch(()=>{});
const bootGame = () => {
  if (bootGame.done) return;
  bootGame.done = true;
  import('./game.js?v=3.10.22w').catch(error=>{console.error(error);const t=document.getElementById('title');if(t)t.textContent='3D could not start';const m=document.getElementById('message');if(m)m.textContent='Try opening this game in an updated Chrome browser with graphics acceleration enabled.';const st=document.getElementById('start');if(st){st.textContent='RELOAD GAME';st.onclick=()=>location.reload();}const sel=document.getElementById('selection');if(sel)sel.style.display='none';const tip=document.getElementById('tip');if(tip)tip.textContent='Your saved best score is kept.';});
};
const introVid = typeof document !== 'undefined' ? document.getElementById('intro-video') : null;
if (introVid) {
  try {
    const wantSound = localStorage.getItem('runverse-sound') !== 'off';
    introVid.muted = !wantSound;
    introVid.defaultMuted = !wantSound;
  } catch {}
  // Let the opening video decoder buffer and render smoothly before loading the tiny 2D game shell (Three.js loads lazily only when running).
  introVid.addEventListener('playing', () => setTimeout(bootGame, 320), { once: true });
  setTimeout(bootGame, 900);
} else {
  bootGame();
}
