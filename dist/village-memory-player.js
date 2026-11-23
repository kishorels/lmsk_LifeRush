// Clean full-screen memory video player with seamless continuous follow-up shots
// and the cinematic ending credits (background video + letter-by-letter story typewriter + big credit).
const MEMORY_ASSET_VERSION = '3.9.11';

// Slow, deliberate letter-by-letter pacing timed so the full story completes right as finalvideo (~77.8s) concludes
// and lands smoothly on the big DEVELOPED BY KISHORE L M / CONTINUE finale page.
const STORY_PARAGRAPHS = [
  { text: 'This was never just a running game.', className: 'vc-lead', charMs: 132, pauseAfter: 2500 },
  { text: 'Through school, college, and work, you faced obstacle after obstacle. Every hurdle on this road represents the real problems and challenges we face in life.', className: '', charMs: 100, pauseAfter: 2700 },
  { text: 'Just as you kept facing every barrier and turned this character’s journey into the peaceful, positive life they truly wished for…', className: '', charMs: 104, pauseAfter: 2700 },
  { text: 'In your own life too, never lose hope. Keep trying without giving up — and one day, we will achieve our dream life.', className: 'vc-hope', charMs: 112, pauseAfter: 0 }
];

export function playVillageMemory(cue, sound, onReturn, options = {}) {
  const keepBgmPlaying = Boolean(options?.keepBgmPlaying);
  const onCreditsStart = typeof options?.onCreditsStart === 'function' ? options.onCreditsStart : null;
  const ver = '?v=' + MEMORY_ASSET_VERSION;
  const mediaBase = film => new URL('./assets/homecoming/' + film, import.meta.url).href;
  const host = document.fullscreenElement || document.getElementById('game') || document.body;

  const overlay = document.createElement('div');
  overlay.className = 'village-memory';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Memory video');
  overlay.style.setProperty('--still', 'url("' + mediaBase(cue.film) + '.webp' + ver + '")');

  const existingLink = document.querySelector('link[data-village-memory]');
  const desiredHref = new URL('./village-memory.css' + ver, import.meta.url).href;
  if (!existingLink) {
    const style = document.createElement('link');
    style.rel = 'stylesheet';
    style.href = desiredHref;
    style.dataset.villageMemory = '';
    document.head.append(style);
  } else if (existingLink.href !== desiredHref) {
    existingLink.href = desiredHref;
  }

  const timers = new Set();
  function schedule(fn, ms) {
    const id = setTimeout(() => {
      timers.delete(id);
      if (!finished) fn();
    }, ms);
    timers.add(id);
    return id;
  }
  function clearAllTimers() {
    for (const id of timers) clearTimeout(id);
    timers.clear();
  }

  function gamePause(v) {
    if (!v) return;
    v.dataset.gamePaused = '1';
    try { v.pause(); } catch {}
  }

  function createVideo(film, loadNow, forceMuted = false) {
    const base = mediaBase(film);
    const v = document.createElement('video');
    v.playsInline = true;
    v.controls = false;
    v.tabIndex = -1;
    v.setAttribute('playsinline', '');
    v.setAttribute('tabindex', '-1');
    v.setAttribute('controlslist', 'nodownload noplaybackrate noremoteplayback');
    v.setAttribute('disablepictureinpicture', '');
    v.setAttribute('disableremoteplayback', '');
    v.preload = loadNow ? 'auto' : 'none';
    const muteVideo = forceMuted || keepBgmPlaying || !sound;
    v.muted = muteVideo;
    v.defaultMuted = muteVideo;
    v.volume = muteVideo ? 0 : 1.0;
    v.poster = base + '.webp' + ver;
    v.dataset.film = film;
    v.dataset.srcUrl = base + '.mp4' + ver;
    v.onloadedmetadata = () => {
      v.classList.toggle('is-landscape', v.videoWidth > v.videoHeight);
    };
    v.addEventListener('contextmenu', e => e.preventDefault());
    // Prevent users, media keys, or OS controls from pausing any playing memory/credits video.
    v.addEventListener('pause', () => {
      if (finished || document.hidden || v.ended || v.dataset.gamePaused === '1') return;
      const shouldPlay = (phase === 'credits' && v === creditsBgVideo) || (phase !== 'credits' && v === activeVideo);
      if (shouldPlay) {
        queueMicrotask(() => {
          if (!finished && !document.hidden && !v.ended && v.dataset.gamePaused !== '1') {
            v.play().catch(() => {});
          }
        });
      }
    });
    if (loadNow) v.src = v.dataset.srcUrl;
    return v;
  }

  const primaryVideo = createVideo(cue.film, true, false);
  const followVideo = cue.followUp ? createVideo(cue.followUp, false, false) : null;
  if (followVideo) followVideo.classList.add('is-standby');

  const creditsBgVideo = cue.creditsBg ? createVideo(cue.creditsBg, false, false) : null;
  if (creditsBgVideo) {
    creditsBgVideo.loop = false;
    creditsBgVideo.classList.add('vc-bg-video');
  }

  let activeVideo = primaryVideo;
  let phase = 'primary'; // 'primary' | 'followup' | 'credits'
  let finished = false;
  let stallTimer = 0;
  let fallbackLeft = (cue.film === 'home' ? 8 : 6) * 1000;
  let started = null;
  let followPreloaded = false;
  let creditsBgPreloaded = false;
  let creditsEl = null;
  let creditsStage = 0; // 1 = intro, 2 = story, 3 = finale
  let storyTypingDone = false;
  let finaleContinueReady = false;
  let revealAllStoryFn = null;
  let advanceToFinaleFn = null;

  function clearStallTimer() {
    if (stallTimer) { clearTimeout(stallTimer); stallTimer = 0; }
  }

  function preloadFollowUp() {
    if (!followVideo || followPreloaded || finished) return;
    followPreloaded = true;
    followVideo.preload = 'auto';
    if (!followVideo.getAttribute('src')) {
      followVideo.src = followVideo.dataset.srcUrl;
      try { followVideo.load(); } catch {}
    }
  }

  function preloadCreditsBg() {
    if (!creditsBgVideo || creditsBgPreloaded || finished) return;
    creditsBgPreloaded = true;
    creditsBgVideo.preload = 'auto';
    if (!creditsBgVideo.getAttribute('src')) {
      creditsBgVideo.src = creditsBgVideo.dataset.srcUrl;
      try { creditsBgVideo.load(); } catch {}
    }
  }

  function finish() {
    if (finished) return;
    finished = true;
    clearStallTimer();
    clearAllTimers();
    document.removeEventListener('visibilitychange', visibility);
    window.removeEventListener('keydown', onKeyDown, true);
    for (const v of [primaryVideo, followVideo, creditsBgVideo]) {
      if (!v) continue;
      v.onplaying = null;
      v.onwaiting = null;
      v.onended = null;
      v.onerror = null;
      gamePause(v);
      v.removeAttribute('src');
    }
    overlay.remove();
    onReturn();
  }

  function closeWithFade() {
    if (finished) return;
    overlay.classList.add('is-closing');
    // Smoothly fade out finalvideo audio along with the visual fade-out.
    if (creditsBgVideo && !creditsBgVideo.muted && creditsBgVideo.volume > 0) {
      const startVol = creditsBgVideo.volume;
      for (let i = 1; i <= 10; i++) {
        schedule(() => {
          try { creditsBgVideo.volume = Math.max(0, startVol * (1 - i / 10)); } catch {}
        }, i * 50);
      }
    }
    schedule(finish, 600);
  }

  function onKeyDown(e) {
    e.stopPropagation();
    if ([' ', 'k', 'K', 'p', 'P', 'Escape', 'MediaPlayPause', 'MediaPause', 'MediaStop'].includes(e.key)) {
      e.preventDefault();
    }
    if (phase === 'credits' && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      if (creditsStage === 3 && finaleContinueReady) closeWithFade();
    }
  }

  async function playVideo(v, isCreditsBg = false) {
    if (finished || document.hidden || !v) return;
    delete v.dataset.gamePaused;
    // During ending credits (finalvideo), Courtyard Sunset fades out and finalvideo's OWN audio takes over!
    const muteVideo = isCreditsBg ? !sound : (keepBgmPlaying || !sound);
    v.muted = muteVideo;
    v.defaultMuted = muteVideo;
    v.volume = muteVideo ? 0 : 1.0;
    try {
      await v.play();
    } catch {
      if (finished || document.hidden) return;
      v.muted = true;
      try {
        await v.play();
      } catch {
        if (!isCreditsBg) triggerStillFallback();
      }
    }
  }

  function onActiveVideoEnded() {
    if (finished) return;
    clearStallTimer();
    if (phase === 'primary' && followVideo) {
      startFollowUpShot();
      return;
    }
    if (cue.showCredits && phase !== 'credits') {
      startEndingCredits();
      return;
    }
    finish();
  }

  function startFollowUpShot() {
    if (finished || phase !== 'primary' || !followVideo) return;
    phase = 'followup';
    overlay.classList.remove('still');
    overlay.style.setProperty('--still', 'url("' + mediaBase(cue.followUp) + '.webp' + ver + '")');
    fallbackLeft = 14000;
    started = null;

    preloadFollowUp();
    followVideo.classList.remove('is-standby');
    followVideo.classList.add('is-active-shot');
    activeVideo = followVideo;

    try {
      if (followVideo.readyState >= 1) followVideo.currentTime = 0;
    } catch {}

    // Keep primary's last frame underneath for a brief instant so the continuous shot has zero black flicker.
    const cleanupPrimary = () => {
      primaryVideo.onplaying = null;
      primaryVideo.onwaiting = null;
      primaryVideo.onended = null;
      primaryVideo.onerror = null;
      gamePause(primaryVideo);
      primaryVideo.remove();
      primaryVideo.removeAttribute('src');
    };
    followVideo.addEventListener('playing', cleanupPrimary, { once: true });
    schedule(cleanupPrimary, 350);

    attachVideoHandlers(followVideo, false);
    stallTimer = setTimeout(triggerStillFallback, 11000);
    void playVideo(followVideo, false);
  }

  function startEndingCredits() {
    if (finished || phase === 'credits') return;
    phase = 'credits';
    clearStallTimer();
    overlay.classList.remove('still');
    overlay.classList.add('is-credits-mode');

    // Fade down & cut Courtyard Sunset smoothly BEFORE finalvideo & "Developed by Kishore" begin!
    try { onCreditsStart?.(); } catch {}

    // Phase A: Slow cinematic fade of memory5 into deep black before finalvideo & credits emerge.
    if (activeVideo) {
      activeVideo.classList.add('is-fading-out');
      const vRef = activeVideo;
      schedule(() => {
        gamePause(vRef);
        vRef.remove();
        vRef.removeAttribute('src');
      }, 1900);
    }

    // Start finalvideo WITH its own audio right as Courtyard Sunset finishes fading out (~1.35s).
    if (creditsBgVideo) {
      preloadCreditsBg();
      overlay.append(creditsBgVideo);
      schedule(() => {
        try {
          if (creditsBgVideo.readyState >= 1) creditsBgVideo.currentTime = 0;
        } catch {}
        void playVideo(creditsBgVideo, true);
        requestAnimationFrame(() => creditsBgVideo.classList.add('is-playing-bg'));
      }, 1350);
    }

    creditsEl = document.createElement('div');
    creditsEl.className = 'village-credits';
    creditsEl.innerHTML = `
      <div class="vc-scrim" aria-hidden="true"></div>
      <div class="vc-aura" aria-hidden="true"></div>
      <section class="vc-act vc-act-intro" aria-hidden="true">
        <div class="vc-rule"></div>
        <p class="vc-eyebrow">THE FINAL RUN · COMPLETE</p>
        <h2 class="vc-intro-credit">Developed by Kishore L M</h2>
        <p class="vc-intro-tag">( L M S K )</p>
      </section>
      <section class="vc-act vc-act-story" aria-hidden="true">
        <p class="vc-eyebrow">WHY THIS STORY</p>
        <div class="vc-story-body"></div>
      </section>
      <section class="vc-act vc-act-finale" aria-hidden="true">
        <div class="vc-rule vc-rule-wide"></div>
        <p class="vc-finale-label">DEVELOPED BY</p>
        <h1 class="vc-finale-name">KISHORE L M</h1>
        <p class="vc-finale-tag">( L M S K )</p>
        <p class="vc-finale-sub">Never give up on your dream life.</p>
        <button type="button" class="vc-continue">CONTINUE</button>
      </section>
    `;
    overlay.append(creditsEl);

    const introAct = creditsEl.querySelector('.vc-act-intro');
    const storyAct = creditsEl.querySelector('.vc-act-story');
    const storyBody = creditsEl.querySelector('.vc-story-body');
    const finaleAct = creditsEl.querySelector('.vc-act-finale');
    const continueBtn = creditsEl.querySelector('.vc-continue');

    // Create empty paragraph slots for smooth letter-by-letter typewriter reveal.
    const storyEls = STORY_PARAGRAPHS.map(item => {
      const p = document.createElement('p');
      p.className = 'vc-story-line' + (item.className ? ' ' + item.className : '');
      storyBody.append(p);
      return p;
    });

    continueBtn.onclick = e => {
      e.stopPropagation();
      closeWithFade();
    };

    let typingTimer = 0;
    let finaleShown = false;
    let finaleAutoTimer = 0;
    let continueShown = false;

    function revealContinueButton() {
      if (continueShown || finished) return;
      continueShown = true;
      finaleContinueReady = true;
      continueBtn.classList.add('is-visible');
    }

    function stopTypingTimer() {
      if (typingTimer) { clearTimeout(typingTimer); typingTimer = 0; }
      if (finaleAutoTimer) { clearTimeout(finaleAutoTimer); finaleAutoTimer = 0; }
    }

    function showFinale(fromVideoEnd = false) {
      if (finaleShown || finished) {
        if (fromVideoEnd) revealContinueButton();
        return;
      }
      finaleShown = true;
      stopTypingTimer();
      creditsStage = 3;
      introAct.classList.remove('is-visible');
      introAct.setAttribute('aria-hidden', 'true');
      storyAct.classList.remove('is-visible');
      storyAct.setAttribute('aria-hidden', 'true');
      schedule(() => {
        finaleAct.classList.add('is-visible');
        finaleAct.setAttribute('aria-hidden', 'false');
        // Show CONTINUE right when finalvideo ends (or 3.2s into the big signature if video already finished).
        schedule(revealContinueButton, fromVideoEnd ? 1100 : 3200);
      }, 950);
    }
    advanceToFinaleFn = showFinale;

    if (creditsBgVideo) {
      creditsBgVideo.onended = () => {
        if (finished) return;
        creditsBgVideo.classList.add('is-ended-bg');
        if (!finaleShown) showFinale(true);
        else revealContinueButton();
      };
    }

    function finishStoryTyping() {
      if (storyTypingDone || finished) return;
      storyTypingDone = true;
      stopTypingTimer();
      STORY_PARAGRAPHS.forEach((item, idx) => {
        storyEls[idx].textContent = item.text;
        storyEls[idx].classList.remove('is-typing');
        storyEls[idx].classList.add('is-shown');
      });
      // Hold the completed story warmly (~5.8s) so Act 3 & CONTINUE land right at the end of finalvideo (~77.8s).
      finaleAutoTimer = schedule(() => showFinale(false), 5800);
    }
    revealAllStoryFn = finishStoryTyping;

    function startStoryTypewriter() {
      let paraIdx = 0;
      let charIdx = 0;

      function typeNext() {
        if (finished || storyTypingDone || creditsStage !== 2) return;
        const item = STORY_PARAGRAPHS[paraIdx];
        const el = storyEls[paraIdx];
        if (charIdx === 0) {
          el.classList.add('is-shown', 'is-typing');
        }
        charIdx++;
        el.textContent = item.text.slice(0, charIdx);

        if (charIdx < item.text.length) {
          const ch = item.text[charIdx - 1];
          let delay = item.charMs;
          if (ch === '.' || ch === '…' || ch === '—') delay += 380;
          else if (ch === ',') delay += 210;
          typingTimer = schedule(typeNext, delay);
        } else {
          el.classList.remove('is-typing');
          paraIdx++;
          charIdx = 0;
          if (paraIdx < STORY_PARAGRAPHS.length) {
            typingTimer = schedule(typeNext, item.pauseAfter);
          } else {
            finishStoryTyping();
          }
        }
      }

      typingTimer = schedule(typeNext, 700);
    }

    // Act 1: Opening "Developed by Kishore L M ( L M S K )" appears gently as finalvideo emerges behind it.
    schedule(() => {
      if (finaleShown) return;
      creditsStage = 1;
      introAct.classList.add('is-visible');
      introAct.setAttribute('aria-hidden', 'false');
    }, 2400);

    // Fade out Act 1 -> enter Act 2 ("Why This Story" slow letter-by-letter typewriter synced to finalvideo).
    schedule(() => {
      introAct.classList.remove('is-visible');
      introAct.setAttribute('aria-hidden', 'true');
    }, 9000);

    schedule(() => {
      if (finaleShown) return;
      creditsStage = 2;
      storyAct.classList.add('is-visible');
      storyAct.setAttribute('aria-hidden', 'false');
      startStoryTypewriter();
    }, 10200);
  }

  function triggerStillFallback() {
    if (finished || phase === 'credits' || overlay.classList.contains('still')) return;
    overlay.classList.add('still');
    gamePause(activeVideo);
    visibility();
  }

  function visibility() {
    if (phase === 'credits') {
      if (!creditsBgVideo) return;
      if (document.hidden) {
        gamePause(creditsBgVideo);
      } else {
        void playVideo(creditsBgVideo, true);
      }
      return;
    }
    clearStallTimer();
    if (overlay.classList.contains('still')) {
      if (started != null) fallbackLeft -= performance.now() - started;
      started = null;
      if (!document.hidden) {
        started = performance.now();
        stallTimer = setTimeout(onActiveVideoEnded, Math.max(0, fallbackLeft));
      }
    } else if (document.hidden) {
      gamePause(activeVideo);
    } else {
      stallTimer = setTimeout(triggerStillFallback, 11000);
      void playVideo(activeVideo, false);
    }
  }

  function attachVideoHandlers(v, isPrimary) {
    v.onplaying = () => {
      clearStallTimer();
      // Quietly preload the next video in sequence once current shot is smoothly playing.
      if (isPrimary && followVideo) {
        schedule(preloadFollowUp, 1200);
      } else if (!isPrimary && creditsBgVideo) {
        schedule(preloadCreditsBg, 2500);
      }
    };
    v.onwaiting = () => {
      if (!finished && !document.hidden && activeVideo === v) {
        clearStallTimer();
        stallTimer = setTimeout(triggerStillFallback, 8000);
      }
    };
    v.onended = () => {
      if (activeVideo === v) onActiveVideoEnded();
    };
    v.onerror = () => {
      if (activeVideo === v) triggerStillFallback();
    };
  }

  overlay.addEventListener('contextmenu', e => e.preventDefault());
  attachVideoHandlers(primaryVideo, true);
  overlay.append(primaryVideo);
  if (followVideo) overlay.append(followVideo);
  host.append(overlay);
  window.addEventListener('keydown', onKeyDown, true);
  document.addEventListener('visibilitychange', visibility);
  visibility();
}
