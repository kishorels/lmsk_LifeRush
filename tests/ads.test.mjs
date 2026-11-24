import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { AD_CONFIG, activeAdIds, createAdManager, formatCooldown, requiredAdsForRevive } from '../dist/ads.js';
import { fresh, reviveRun, reviveAdsRequired, MAX_REVIVES_PER_RUN } from '../dist/engine.js';

function createMockStorage() {
  const map = new Map();
  return {
    getItem: k => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v))
  };
}

function createMockAdMobPlugin({ rewardShouldSucceed = true, interstitialShouldSucceed = true } = {}) {
  const calls = [];
  const listeners = new Map();
  return {
    calls,
    async initialize(opts) { calls.push(['initialize', opts]); },
    async requestConsentInfo() { calls.push(['requestConsentInfo']); return { status: 'NOT_REQUIRED', isConsentFormAvailable: false }; },
    async addListener(name, fn) { listeners.set(name, fn); return { remove() {} }; },
    async prepareRewardVideoAd(opts) {
      calls.push(['prepareRewardVideoAd', opts]);
      return { adUnitId: opts.adId };
    },
    async showRewardVideoAd() {
      calls.push(['showRewardVideoAd']);
      if (!rewardShouldSucceed) return null;
      listeners.get('onRewardedVideoAdReward')?.({ type: 'coins', amount: 1 });
      listeners.get('onRewardedVideoAdDismissed')?.();
      return { type: 'coins', amount: 1 };
    },
    async prepareInterstitial(opts) {
      calls.push(['prepareInterstitial', opts]);
      return { adUnitId: opts.adId };
    },
    async showInterstitial() {
      calls.push(['showInterstitial']);
      if (!interstitialShouldSucceed) throw new Error('failed');
      listeners.get('interstitialAdDismissed')?.();
    }
  };
}

test('escalating Save Me requires 1 ad on 1st crash, 2 ads on 2nd crash, and blocks 3rd save', () => {
  assert.equal(MAX_REVIVES_PER_RUN, 2);
  assert.equal(requiredAdsForRevive(0), 1);
  assert.equal(requiredAdsForRevive(1), 2);
  assert.equal(requiredAdsForRevive(2), 0);
  assert.equal(requiredAdsForRevive(3), 0);
  assert.equal(reviveAdsRequired(0), 1);
  assert.equal(reviveAdsRequired(1), 2);
  assert.equal(reviveAdsRequired(2), 0);

  const s = fresh(1);
  s.mode = 'crashed';
  assert.equal(reviveRun(s), true);
  assert.equal(s.reviveCount, 1);
  assert.equal(s.mode, 'countdown');

  s.mode = 'crashed';
  assert.equal(reviveRun(s), true);
  assert.equal(s.reviveCount, 2);
  assert.equal(s.mode, 'countdown');

  s.mode = 'crashed';
  assert.equal(reviveRun(s), false, '3rd crash in same run cannot revive');
  assert.equal(s.reviveCount, 2);
});

test('AdMob manager uses official Google Test IDs, pauses/resumes BGM, enforces 5-game interstitial & 5-min shop cooldown', async () => {
  assert.equal(AD_CONFIG.useTestAds, true);
  assert.equal(activeAdIds().rewarded, 'ca-app-pub-3940256099942544/5224354917');
  assert.equal(activeAdIds().interstitial, 'ca-app-pub-3940256099942544/1033173712');
  assert.equal(AD_CONFIG.interstitialEveryRuns, 5);
  assert.equal(AD_CONFIG.shopRewardCoins, 500);
  assert.equal(formatCooldown(125), '2m 05s');

  let clock = 1_000_000;
  let audioPaused = 0, audioResumed = 0;
  const plugin = createMockAdMobPlugin();
  const storage = createMockStorage();
  const ads = createAdManager({
    plugin,
    storage,
    now: () => clock,
    onPauseAudio: () => audioPaused++,
    onResumeAudio: () => audioResumed++
  });

  await ads.init();
  assert.equal(ads.isAvailable(), true);
  assert.ok(plugin.calls.some(([m]) => m === 'initialize'));

  // Rewarded ad pauses/resumes audio and grants reward
  const rew = await ads.showRewardedAd();
  assert.equal(rew.rewarded, true);
  assert.equal(audioPaused, 1);
  assert.equal(audioResumed, 1);

  // Shop +500 coins claim & cooldown enforcement
  const shop1 = await ads.claimShopCoinAd();
  assert.equal(shop1.rewarded, true);
  assert.equal(shop1.coins, 500);
  assert.equal(ads.getShopCooldownRemaining(), 300);

  const shopBlocked = await ads.claimShopCoinAd();
  assert.equal(shopBlocked.rewarded, false);
  assert.equal(shopBlocked.reason, 'cooldown');

  clock += 300_000;
  assert.equal(ads.getShopCooldownRemaining(), 0);
  const shop2 = await ads.claimShopCoinAd();
  assert.equal(shop2.rewarded, true);

  // Interstitial triggers strictly every 5 completed games (runs 1-4 no ad, run 5 ad, runs 6-9 no ad, run 10 ad)
  const shownAt = [];
  for (let i = 1; i <= 10; i++) {
    const r = await ads.maybeShowInterstitialForRun();
    if (r.shown) shownAt.push(i);
  }
  assert.deepEqual(shownAt, [5, 10]);

  // Dismissed rewarded ad never grants reward
  const dismissAds = createAdManager({
    plugin: createMockAdMobPlugin({ rewardShouldSucceed: false }),
    storage: createMockStorage(),
    now: () => clock
  });
  const dismissed = await dismissAds.showRewardedAd();
  assert.equal(dismissed.rewarded, false);
  assert.equal(dismissed.reason, 'dismissed');
});

test('AndroidManifest and strings.xml declare Google AdMob APPLICATION_ID using Test App ID', async () => {
  const manifest = await readFile(new URL('../android/app/src/main/AndroidManifest.xml', import.meta.url), 'utf8');
  const strings = await readFile(new URL('../android/app/src/main/res/values/strings.xml', import.meta.url), 'utf8');
  assert.ok(manifest.includes('com.google.android.gms.ads.APPLICATION_ID') && manifest.includes('@string/admob_app_id'));
  assert.ok(strings.includes('ca-app-pub-3940256099942544~3347511713'));
});
