/**
 * EyeControl Background Service Worker (Manifest V3)
 * Bridges gaze tracking coordinates, grid settings, and scrolling commands
 * to active content scripts on YouTube, India Today, etc.
 */

let latestGazeData = null;
let lastGazeTime = 0;
let gazeFrequencyHz = 0;
let frameCount = 0;
let lastFpsUpdateTime = performance.now();

let settings = {
  dwellTimeMs: 900,
  gracePeriodMs: 450,
  navigationMode: 'gaze-zone', // 'gaze-zone' | 'grid' | 'manual'
  gridRows: 3,
  gridCols: 3,
  debugMode: false,
  scrollSpeed: 3.5,
  scrollThresholdMs: 350,
  magneticSnap: true,
  soundFeedback: true,
  highlightElements: true,
  isPaused: false,
};

// Calculate gaze stream update frequency
function recordGazeUpdate(payload) {
  latestGazeData = payload;
  frameCount++;
  const now = performance.now();
  const elapsed = now - lastFpsUpdateTime;
  if (elapsed >= 1000) {
    gazeFrequencyHz = Math.round((frameCount * 1000) / elapsed);
    frameCount = 0;
    lastFpsUpdateTime = now;
  }
}

// 1. External messages from localhost:5173 / localhost:5174
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  if (message.type === 'EYECONTROL_GAZE_UPDATE') {
    recordGazeUpdate(message.payload);
    relayGazeToActiveTab(message.payload);
    sendResponse({ status: 'relayed', hz: gazeFrequencyHz, timestamp: Date.now() });
    return true;
  }

  if (message.type === 'EYECONTROL_PING') {
    sendResponse({ status: 'connected', version: '1.1.0', settings, hz: gazeFrequencyHz });
    return true;
  }

  if (message.type === 'EYECONTROL_SETTINGS_SYNC') {
    if (message.payload) {
      settings = { ...settings, ...message.payload };
      broadcastSettings();
    }
    sendResponse({ status: 'settings_updated', settings });
    return true;
  }
});

// 2. Internal messages (from bridge_injector.js, popup, sidepanel, content.js)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'EYECONTROL_GAZE_UPDATE') {
    recordGazeUpdate(message.payload);
    relayGazeToActiveTab(message.payload);
    sendResponse({ status: 'relayed', hz: gazeFrequencyHz });
    return true;
  }

  if (message.type === 'GET_STATUS') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTabUrl = tabs && tabs[0] ? tabs[0].url : 'Unknown';
      sendResponse({
        hasGazeData: latestGazeData !== null,
        latestGazeData,
        gazeFrequencyHz,
        settings,
        activeTabUrl,
      });
    });
    return true;
  }

  if (message.type === 'UPDATE_SETTINGS') {
    settings = { ...settings, ...message.payload };
    chrome.storage.local.set({ eyecontrol_settings: settings });
    broadcastSettings();
    sendResponse({ success: true, settings });
    return true;
  }
});

// Relay gaze data to active tab
function relayGazeToActiveTab(gazePayload) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs && tabs[0] && tabs[0].id) {
      chrome.tabs.sendMessage(tabs[0].id, {
        type: 'GAZE_POINT_UPDATE',
        payload: gazePayload,
        hz: gazeFrequencyHz,
        settings: settings,
      }).catch(() => {
        // Active tab may not have content script (e.g. chrome://)
      });
    }
  });
}

function broadcastSettings() {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, {
          type: 'SETTINGS_CHANGED',
          settings,
        }).catch(() => {});
      }
    });
  });
}

// Load persistent settings on install/startup
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['eyecontrol_settings'], (result) => {
    if (result && result.eyecontrol_settings) {
      settings = { ...settings, ...result.eyecontrol_settings };
    }
  });
  console.log('[EyeControl Extension v1.1.0] Background Service Worker Active.');
});
