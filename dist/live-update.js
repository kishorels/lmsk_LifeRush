export async function initLiveUpdate() {
  const updater = window.Capacitor?.Plugins?.CapacitorUpdater;
  if (!updater) return;

  try {
    // Notify native container that current bundle booted properly to prevent rollbacks
    await updater.notifyAppReady();

    // Fetch latest version manifest from GitHub raw CDN (bypassing cache)
    const res = await fetch('https://raw.githubusercontent.com/kishorels/lmsk_LifeRush/main/dist/version.json?_=' + Date.now(), {
      cache: 'no-store'
    });
    if (!res.ok) return;
    const remote = await res.json();
    const currentVer = localStorage.getItem('lmsk_app_version') || '2.1.0';

    if (remote.version && remote.version !== currentVer && remote.url) {
      console.log(`[OTA] New version available: ${remote.version} (current: ${currentVer}). Downloading background update...`);
      const bundle = await updater.download({
        url: remote.url,
        version: remote.version,
      });
      if (bundle) {
        await updater.set({ id: remote.version });
        localStorage.setItem('lmsk_app_version', remote.version);
        console.log(`[OTA] Version ${remote.version} downloaded and installed for next launch.`);
      }
    }
  } catch (err) {
    console.warn('[OTA] Live update check failed silently:', err);
  }
}

initLiveUpdate();
