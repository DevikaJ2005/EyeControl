/**
 * EyeControl Extension Popup Script
 */

document.addEventListener('DOMContentLoaded', () => {
  const dwellSelect = document.getElementById('dwell-duration-select');
  const navModeSelect = document.getElementById('nav-mode-select');
  const debugCheck = document.getElementById('debug-mode-check');
  const snapCheck = document.getElementById('magnetic-snap-check');
  const soundCheck = document.getElementById('sound-feedback-check');

  const bridgeStatus = document.getElementById('bridge-status');
  const hzVal = document.getElementById('hz-val');
  const activeTabVal = document.getElementById('active-tab-val');

  // Load current settings & status from background worker
  chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (res) => {
    if (res && res.settings) {
      if (dwellSelect) dwellSelect.value = String(res.settings.dwellTimeMs || 900);
      if (navModeSelect) navModeSelect.value = res.settings.navigationMode || 'gaze-zone';
      if (debugCheck) debugCheck.checked = !!res.settings.debugMode;
      if (snapCheck) snapCheck.checked = res.settings.magneticSnap !== false;
      if (soundCheck) soundCheck.checked = res.settings.soundFeedback !== false;
    }
    if (bridgeStatus) {
      bridgeStatus.textContent = res && res.hasGazeData ? 'Streaming Gaze' : 'Awaiting EyeControl';
      bridgeStatus.style.color = res && res.hasGazeData ? '#16A34A' : '#D97706';
    }
    if (hzVal) {
      hzVal.textContent = `${res?.gazeFrequencyHz || 0} Hz`;
    }
    if (activeTabVal && res?.activeTabUrl) {
      try {
        const u = new URL(res.activeTabUrl);
        activeTabVal.textContent = u.hostname;
      } catch {
        activeTabVal.textContent = res.activeTabUrl;
      }
    }
  });

  const saveSettings = () => {
    const payload = {
      dwellTimeMs: Number(dwellSelect.value),
      navigationMode: navModeSelect.value,
      debugMode: debugCheck.checked,
      magneticSnap: snapCheck.checked,
      soundFeedback: soundCheck.checked,
    };
    chrome.runtime.sendMessage({ type: 'UPDATE_SETTINGS', payload });
  };

  dwellSelect?.addEventListener('change', saveSettings);
  navModeSelect?.addEventListener('change', saveSettings);
  debugCheck?.addEventListener('change', saveSettings);
  snapCheck?.addEventListener('change', saveSettings);
  soundCheck?.addEventListener('change', saveSettings);
});
