import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { AD_CONFIG, activeAdIds, isTestAdsMode, createAdManager, formatCooldown, requiredAdsForRevive } from '../dist/ads.js';
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

test('AdMob manager defaults to live Play Store IDs, switches safely to Google Test IDs when __LMSK_TEST_ADS__ is set, pauses/resumes BGM, enforces 5-game interstitial & 5-min shop cooldown', async () => {
  assert.equal(AD_CONFIG.useTestAds, false);
  assert.equal(isTestAdsMode(), false);
  assert.equal(activeAdIds().rewarded, 'ca-app-pub-6566735355781173/4758626673');
  assert.equal(activeAdIds().interstitial, 'ca-app-pub-6566735355781173/1544985027');

  // Dev/team build-profile flag forces Google Test IDs safely
  globalThis.window = { __LMSK_TEST_ADS__: true };
  try {
    assert.equal(isTestAdsMode(), true);
    assert.equal(activeAdIds().rewarded, 'ca-app-pub-3940256099942544/5224354917');
    assert.equal(activeAdIds().interstitial, 'ca-app-pub-3940256099942544/1033173712');
  } finally {
    delete globalThis.window;
  }

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

test('AndroidManifest and strings.xml declare live Play Store AdMob App ID while debug and level50 stay on Test App ID', async () => {
  const manifest = await readFile(new URL('../android/app/src/main/AndroidManifest.xml', import.meta.url), 'utf8');
  const mainStrings = await readFile(new URL('../android/app/src/main/res/values/strings.xml', import.meta.url), 'utf8');
  const debugStrings = await readFile(new URL('../android/app/src/debug/res/values/strings.xml', import.meta.url), 'utf8');
  const level50Strings = await readFile(new URL('../android/app/src/level50/res/values/strings.xml', import.meta.url), 'utf8');
  const debugProfile = await readFile(new URL('../android/app/src/debug/assets/public/build-profile.js', import.meta.url), 'utf8');
  const level50Profile = await readFile(new URL('../android/app/src/level50/assets/public/build-profile.js', import.meta.url), 'utf8');
  assert.ok(manifest.includes('com.google.android.gms.ads.APPLICATION_ID') && manifest.includes('@string/admob_app_id'));
  assert.ok(mainStrings.includes('ca-app-pub-6566735355781173~2497220023'));
  assert.ok(debugStrings.includes('ca-app-pub-3940256099942544~3347511713'));
  assert.ok(level50Strings.includes('ca-app-pub-3940256099942544~3347511713'));
  assert.ok(debugProfile.includes('__LMSK_TEST_ADS__ = true'));
  assert.ok(level50Profile.includes('__LMSK_TEST_ADS__ = true'));
});

test('Play Store compliance hardening is intact (backup disabled, mixed content off, R8 release enabled, privacy policy & app-ads.txt present)', async () => {
  const manifest = await readFile(new URL('../android/app/src/main/AndroidManifest.xml', import.meta.url), 'utf8');
  const gradle = await readFile(new URL('../android/app/build.gradle', import.meta.url), 'utf8');
  const capCfg = JSON.parse(await readFile(new URL('../capacitor.config.json', import.meta.url), 'utf8'));
  const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  const policyHtml = await readFile(new URL('../docs/privacy-policy.html', import.meta.url), 'utf8');
  const appAds = await readFile(new URL('../docs/app-ads.txt', import.meta.url), 'utf8');
  assert.ok(manifest.includes('android:allowBackup="false"'));
  assert.equal(capCfg.android.allowMixedContent, false);
  assert.match(gradle, /minifyEnabled\s+true/);
  assert.match(gradle, /shrinkResources\s+true/);
  assert.ok(html.includes('id="btn-privacy-policy"') && html.includes('id="privacy-modal"'));
  assert.ok(policyHtml.includes('com.lmsk.liferush') && policyHtml.includes('Google AdMob'));
  assert.ok(appAds.includes('pub-6566735355781173'));
});
