// Google AdMob controller for LMSK LifeRush (Capacitor 8 + @capacitor-community/admob)
// IMPORTANT: Keep useTestAds = true during all development & internal device testing.
// Swap to useTestAds = false and paste your live AdMob Ad Unit IDs (plus live App ID in
// android/app/src/main/res/values/strings.xml) ONLY for the signed Play Store release build!

export const AD_CONFIG = {
  useTestAds: true,
  testIds: {
    rewarded: 'ca-app-pub-3940256099942544/5224354917',
    interstitial: 'ca-app-pub-3940256099942544/1033173712'
  },
  liveIds: {
    rewarded: 'ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY',
    interstitial: 'ca-app-pub-XXXXXXXXXXXXXXXX/ZZZZZZZZZZ'
  },
  interstitialEveryRuns: 5,
  shopRewardCoins: 500,
  shopCooldownSeconds: 300
};

export const AD_STORAGE_KEYS = {
  runCount: 'runverse-ad-run-count',
  shopCooldownUntil: 'runverse-ad-shop-cd'
};

export function requiredAdsForRevive(reviveCount = 0) {
  const used = Math.max(0, Math.floor(Number(reviveCount) || 0));
  if (used === 0) return 1;
  if (used === 1) return 2;
  return 0;
}

export function formatCooldown(seconds) {
  const s = Math.max(0, Math.ceil(Number(seconds) || 0));
  const mins = Math.floor(s / 60);
  const rem = s % 60;
  return mins > 0 ? `${mins}m ${String(rem).padStart(2, '0')}s` : `${rem}s`;
}

export function activeAdIds(config = AD_CONFIG) {
  return config.useTestAds ? config.testIds : config.liveIds;
}

function defaultStorage() {
  try {
    if (typeof localStorage !== 'undefined') return localStorage;
  } catch {}
  const mem = new Map();
  return {
    getItem: k => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => mem.set(k, String(v))
  };
}

export function createAdManager(opts = {}) {
  const config = { ...AD_CONFIG, ...(opts.config || {}) };
  const storage = opts.storage || defaultStorage();
  const now = opts.now || (() => Date.now());
  const onPauseAudio = opts.onPauseAudio || (() => {});
  const onResumeAudio = opts.onResumeAudio || (() => {});
  const webSimEnabled = Boolean(
    opts.simulateWeb ||
    (typeof window !== 'undefined' && window.location?.search?.includes('adtest=1'))
  );

  const getPlugin = () => {
    if (opts.plugin !== undefined) return opts.plugin;
    if (typeof window === 'undefined') return null;
    const cap = window.Capacitor;
    const native = typeof cap?.isNativePlatform === 'function' ? cap.isNativePlatform() : Boolean(cap?.Plugins?.AdMob);
    return native ? (cap?.Plugins?.AdMob || null) : null;
  };

  let initialized = false;
  let initPromise = null;
  let rewardedReady = false;
  let interstitialReady = false;
  let rewardedPreloading = null;
  let interstitialPreloading = null;
  let busy = false;
  let lastRewardEventAt = 0;

  function ids() {
    return activeAdIds(config);
  }

  function isAvailable() {
    return Boolean(getPlugin() || webSimEnabled);
  }

  function isOnline() {
    if (typeof navigator === 'undefined') return true;
    return navigator.onLine !== false;
  }

  async function init() {
    if (initialized) return true;
    if (initPromise) return initPromise;
    const plugin = getPlugin();
    if (!plugin) {
      initialized = webSimEnabled;
      return initialized;
    }
    initPromise = (async () => {
      try {
        await plugin.initialize({
          initializeForTesting: Boolean(config.useTestAds)
        });
      } catch (err) {
        console.warn('AdMob initialize failed:', err);
      }

      // Google UMP consent (non-blocking if offline or not required for user region)
      try {
        if (typeof plugin.requestConsentInfo === 'function') {
          const info = await plugin.requestConsentInfo();
          if (info?.isConsentFormAvailable && info?.status === 'REQUIRED' && typeof plugin.showConsentForm === 'function') {
            await plugin.showConsentForm();
          }
        }
      } catch {}

      try {
        if (typeof plugin.addListener === 'function') {
          plugin.addListener('onRewardedVideoAdReward', () => { lastRewardEventAt = now(); });
          plugin.addListener('onRewardedVideoAdLoaded', () => { rewardedReady = true; });
          plugin.addListener('onRewardedVideoAdFailedToLoad', () => { rewardedReady = false; });
          plugin.addListener('onRewardedVideoAdDismissed', () => {
            rewardedReady = false;
            preloadRewarded();
          });
          plugin.addListener('interstitialAdLoaded', () => { interstitialReady = true; });
          plugin.addListener('interstitialAdFailedToLoad', () => { interstitialReady = false; });
          plugin.addListener('interstitialAdDismissed', () => {
            interstitialReady = false;
            preloadInterstitial();
          });
        }
      } catch {}

      initialized = true;
      preloadRewarded();
      preloadInterstitial();
      return true;
    })();
    return initPromise;
  }

  async function preloadRewarded() {
    const plugin = getPlugin();
    if (!plugin || !isOnline()) return false;
    if (rewardedReady) return true;
    if (rewardedPreloading) return rewardedPreloading;
    rewardedPreloading = (async () => {
      try {
        await plugin.prepareRewardVideoAd({
          adId: ids().rewarded,
          isTesting: Boolean(config.useTestAds),
          immersiveMode: true
        });
        rewardedReady = true;
        return true;
      } catch {
        rewardedReady = false;
        return false;
      } finally {
        rewardedPreloading = null;
      }
    })();
    return rewardedPreloading;
  }

  async function preloadInterstitial() {
    const plugin = getPlugin();
    if (!plugin || !isOnline()) return false;
    if (interstitialReady) return true;
    if (interstitialPreloading) return interstitialPreloading;
    interstitialPreloading = (async () => {
      try {
        await plugin.prepareInterstitial({
          adId: ids().interstitial,
          isTesting: Boolean(config.useTestAds),
          immersiveMode: true
        });
        interstitialReady = true;
        return true;
      } catch {
        interstitialReady = false;
        return false;
      } finally {
        interstitialPreloading = null;
      }
    })();
    return interstitialPreloading;
  }

  async function showRewardedAd() {
    if (busy) return { rewarded: false, reason: 'busy' };
    const plugin = getPlugin();
    if (!plugin) {
      if (!webSimEnabled) return { rewarded: false, reason: 'unavailable' };
      busy = true;
      onPauseAudio();
      try {
        await new Promise(r => setTimeout(r, opts.simDelayMs ?? 350));
        return { rewarded: true, reason: 'simulated' };
      } finally {
        busy = false;
        onResumeAudio();
      }
    }
    if (!isOnline() && !rewardedReady) {
      return { rewarded: false, reason: 'offline' };
    }
    busy = true;
    onPauseAudio();
    const beforeTs = now();
    try {
      await init();
      if (!rewardedReady) {
        const loaded = await preloadRewarded();
        if (!loaded) return { rewarded: false, reason: 'no-fill' };
      }
      const reward = await plugin.showRewardVideoAd();
      rewardedReady = false;
      const earned = Boolean(
        (reward && (Number(reward.amount) > 0 || reward.type)) ||
        lastRewardEventAt >= beforeTs
      );
      return earned ? { rewarded: true, reason: 'rewarded' } : { rewarded: false, reason: 'dismissed' };
    } catch {
      rewardedReady = false;
      return { rewarded: false, reason: 'failed' };
    } finally {
      busy = false;
      onResumeAudio();
      preloadRewarded();
    }
  }

  function getCompletedRuns() {
    const n = Number(storage.getItem(AD_STORAGE_KEYS.runCount) || 0);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  }

  function recordCompletedRun() {
    const next = getCompletedRuns() + 1;
    try { storage.setItem(AD_STORAGE_KEYS.runCount, String(next)); } catch {}
    const freq = Math.max(1, Math.floor(Number(config.interstitialEveryRuns) || 5));
    return { runCount: next, shouldShowInterstitial: next > 0 && next % freq === 0 };
  }

  async function maybeShowInterstitialForRun() {
    const { runCount, shouldShowInterstitial } = recordCompletedRun();
    if (!shouldShowInterstitial) return { shown: false, runCount, reason: 'frequency' };
    if (busy) return { shown: false, runCount, reason: 'busy' };
    const plugin = getPlugin();
    if (!plugin) {
      if (!webSimEnabled) return { shown: false, runCount, reason: 'unavailable' };
      busy = true;
      onPauseAudio();
      try {
        await new Promise(r => setTimeout(r, opts.simDelayMs ?? 300));
        return { shown: true, runCount, reason: 'simulated' };
      } finally {
        busy = false;
        onResumeAudio();
      }
    }
    if (!isOnline() && !interstitialReady) {
      return { shown: false, runCount, reason: 'offline' };
    }
    busy = true;
    onPauseAudio();
    try {
      await init();
      if (!interstitialReady) {
        const loaded = await preloadInterstitial();
        if (!loaded) return { shown: false, runCount, reason: 'no-fill' };
      }
      await plugin.showInterstitial();
      interstitialReady = false;
      return { shown: true, runCount, reason: 'shown' };
    } catch {
      interstitialReady = false;
      return { shown: false, runCount, reason: 'failed' };
    } finally {
      busy = false;
      onResumeAudio();
      preloadInterstitial();
    }
  }

  function getShopCooldownRemaining() {
    const until = Number(storage.getItem(AD_STORAGE_KEYS.shopCooldownUntil) || 0);
    if (!Number.isFinite(until) || until <= 0) return 0;
    const remMs = until - now();
    return remMs > 0 ? Math.ceil(remMs / 1000) : 0;
  }

  async function claimShopCoinAd() {
    const rem = getShopCooldownRemaining();
    if (rem > 0) return { rewarded: false, coins: 0, cooldownRemaining: rem, reason: 'cooldown' };
    const res = await showRewardedAd();
    if (!res.rewarded) return { rewarded: false, coins: 0, cooldownRemaining: 0, reason: res.reason };
    const until = now() + config.shopCooldownSeconds * 1000;
    try { storage.setItem(AD_STORAGE_KEYS.shopCooldownUntil, String(until)); } catch {}
    return {
      rewarded: true,
      coins: config.shopRewardCoins,
      cooldownRemaining: config.shopCooldownSeconds,
      reason: res.reason
    };
  }

  return {
    config,
    init,
    isAvailable,
    isBusy: () => busy,
    preloadRewarded,
    preloadInterstitial,
    showRewardedAd,
    getCompletedRuns,
    recordCompletedRun,
    maybeShowInterstitialForRun,
    getShopCooldownRemaining,
    claimShopCoinAd
  };
}
