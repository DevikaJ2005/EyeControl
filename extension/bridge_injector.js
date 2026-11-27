/**
 * EyeControl Extension — Automatic Bridge Injector
 * Injected automatically on http://localhost:5173/* and http://localhost:5174/*
 * Relays gaze coordinates from the EyeControl Web Application to background.js
 * requiring ZERO manual extension ID configuration!
 */

(function () {
  if (window.__EYECONTROL_BRIDGE_INJECTED__) return;
  window.__EYECONTROL_BRIDGE_INJECTED__ = true;

  console.log('[EyeControl Extension Bridge] Connected to EyeControl Web App on:', window.location.href);

  // Notify the web application that the extension bridge is active
  window.postMessage({ type: 'EYECONTROL_EXTENSION_INSTALLED', version: '1.0.0' }, '*');

  // Listen for gaze data streamed from the EyeControl application
  window.addEventListener('message', (event) => {
    // Only accept messages from same window
    if (event.source !== window) return;

    if (event.data && event.data.type === 'EYECONTROL_GAZE_STREAM') {
      try {
        chrome.runtime.sendMessage({
          type: 'EYECONTROL_GAZE_UPDATE',
          payload: event.data.payload,
        });
      } catch (err) {
        // Background worker asleep or extension reloaded
      }
    }
  });

  // Also support BroadcastChannel
  try {
    const channel = new BroadcastChannel('eyecontrol_gaze_channel');
    channel.onmessage = (event) => {
      if (event.data && event.data.type === 'EYECONTROL_GAZE_STREAM') {
        try {
          chrome.runtime.sendMessage({
            type: 'EYECONTROL_GAZE_UPDATE',
            payload: event.data.payload,
          });
        } catch {}
      }
    };
  } catch {}
})();
