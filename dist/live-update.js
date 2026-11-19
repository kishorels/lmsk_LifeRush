// Keep the installed Android bundle self-contained. No update manifest or
// downloadable web bundle is requested during startup.
export async function initLiveUpdate() {
  const updater = window.Capacitor?.Plugins?.CapacitorUpdater;
  if (!updater) return;
  try {
    // Older installs may already have an active update. Signal that this
    // launch succeeded so the native updater does not roll it back.
    await updater.notifyAppReady();
  } catch (error) {
    console.warn('Bundled app readiness signal failed:', error);
  }
}

initLiveUpdate();
