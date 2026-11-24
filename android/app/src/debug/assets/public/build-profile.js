// Debug builds keep Play Store locked progression while safely forcing official Google Test Ads.
export function initializeBuildProfile() {
  if (typeof window !== 'undefined') window.__LMSK_TEST_ADS__ = true;
}
