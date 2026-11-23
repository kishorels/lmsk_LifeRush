// A memory owns the screen until its film ends or the player skips it.
// The still also carries the story if a device cannot decode the video.
export function playVillageMemory(cue, sound, onReturn) {
  const base = new URL('./assets/homecoming/' + cue.film, import.meta.url).href;
  const dialog = document.createElement('dialog');
  dialog.className = 'village-memory';
  dialog.setAttribute('aria-labelledby', 'village-recollection');
  dialog.style.setProperty('--still', 'url("' + base + '.webp")');
  if (!document.querySelector('link[data-village-memory]')) {
    const style = document.createElement('link');
    style.rel = 'stylesheet';
    style.href = new URL('./village-memory.css', import.meta.url).href;
    style.dataset.villageMemory = '';
    document.head.append(style);
  }
  const video = document.createElement('video');
  video.playsInline = true;
  video.muted = !sound;
  video.poster = base + '.webp';
  video.src = base + '.mp4';
  const caption = document.createElement('p');
  caption.id = 'village-recollection';
  caption.lang = 'ta';
  caption.textContent = cue.caption;
  const skip = document.createElement('button');
  skip.type = 'button';
  skip.textContent = cue.film === 'home' ? 'Finish' : 'Continue run';
  let finished = false, timer;
  let fallbackLeft = (cue.film === 'home' ? 8 : 6) * 1000, started;
  function finish() {
    if (finished) return;
    finished = true;
    clearTimeout(timer);
    document.removeEventListener('visibilitychange', visibility);
    video.pause();
    dialog.close();
    dialog.remove();
    video.removeAttribute('src');
    video.load();
    onReturn();
  }
  function fallback() {
    if (finished || dialog.classList.contains('still')) return;
    dialog.classList.add('still');
    video.pause();
    visibility();
  }
  async function play() {
    try { await video.play(); }
    catch {
      if (finished || document.hidden) return;
      video.muted = true;
      try { await video.play(); } catch { fallback(); }
    }
  }
  function visibility() {
    clearTimeout(timer);
    if (dialog.classList.contains('still')) {
      if (started != null) fallbackLeft -= performance.now() - started;
      started = null;
      if (!document.hidden) {
        started = performance.now();
        timer = setTimeout(finish, Math.max(0, fallbackLeft));
      }
    } else if (document.hidden) video.pause();
    else {
      timer = setTimeout(fallback, 11000);
      void play();
    }
  }
  video.onplaying = () => clearTimeout(timer);
  video.onwaiting = () => { if (!finished && !document.hidden) {clearTimeout(timer);timer=setTimeout(fallback, 7000);} };
  video.onended = finish;
  video.onerror = fallback;
  skip.onclick = finish;
  dialog.oncancel = e => { e.preventDefault(); finish(); };
  dialog.addEventListener('keydown', e => e.stopPropagation());
  dialog.append(video, caption, skip);
  (document.fullscreenElement || document.body).append(dialog);
  dialog.showModal();
  document.addEventListener('visibilitychange', visibility);
  visibility();
}
