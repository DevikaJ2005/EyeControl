/**
 * WindowLauncher Utility
 * Launches real external websites (YouTube, India Today, etc.)
 * in a dedicated centered standalone browser window matching user UI preferences.
 */

export const openAppWindow = (url: string, windowName: string = 'EyeControlExternalWindow'): Window | null => {
  // Center window on screen taking ~85% of screen real estate
  const screenW = window.screen.availWidth || 1366;
  const screenH = window.screen.availHeight || 768;

  const width = Math.min(1240, Math.max(880, Math.round(screenW * 0.86)));
  const height = Math.min(800, Math.max(600, Math.round(screenH * 0.84)));
  const left = Math.max(10, Math.round((screenW - width) / 2));
  const top = Math.max(10, Math.round((screenH - height) / 2));

  const features = [
    `width=${width}`,
    `height=${height}`,
    `left=${left}`,
    `top=${top}`,
    'menubar=no',
    'toolbar=no',
    'location=yes',
    'status=no',
    'resizable=yes',
    'scrollbars=yes',
  ].join(',');

  try {
    const win = window.open(url, windowName, features);
    if (win) {
      win.focus();
    }
    return win;
  } catch (err) {
    console.error('Failed to open app window:', err);
    // Fallback to standard open
    return window.open(url, '_blank', 'noopener,noreferrer');
  }
};
