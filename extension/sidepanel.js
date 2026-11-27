/**
 * EyeControl Extension Side Panel Script
 */

document.getElementById('btn-side-autoscroll')?.addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]?.id) {
      chrome.tabs.sendMessage(tabs[0].id, {
        type: 'SETTINGS_CHANGED',
        settings: { toggleAutoScroll: true },
      }).catch(() => {});
    }
  });
});
