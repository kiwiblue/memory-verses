// Lightweight OS/browser sniffing — used only to tailor "Add to Home Screen"
// instructions, never for feature gating that would break if wrong.

export function detectPlatform() {
  const ua = navigator.userAgent || '';
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
  const isAndroid = /Android/.test(ua);
  const isMac = /Macintosh/.test(ua) && !isIOS;
  const isWindows = /Windows/.test(ua);

  const os = isIOS ? 'ios' : isAndroid ? 'android' : isMac ? 'mac' : isWindows ? 'windows' : 'other';
  const mobile = isIOS || isAndroid;

  const isEdge = /Edg\//.test(ua);
  const isFirefox = /Firefox/.test(ua);
  const isChrome = !isEdge && /Chrome/.test(ua);
  const isSafari = !isChrome && !isEdge && !isFirefox && /Safari/.test(ua);
  const browser = isEdge ? 'edge' : isChrome ? 'chrome' : isFirefox ? 'firefox' : isSafari ? 'safari' : 'other';

  return { os, browser, mobile };
}

// True if the app is already running as an installed PWA (standalone window),
// so we can hide "Add to Home Screen" for users who've already done it.
export function isStandalone() {
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
}
