import { APP_VERSION } from './version.js';

// PWAs saved to the home screen have no browser chrome to hard-refresh from,
// so a stale install can silently sit on an old build indefinitely. This
// polls a small, never-cached file to find out if a newer build is live.
export async function fetchLatestVersion() {
  const res = await fetch('/version.json', { cache: 'no-store' });
  if (!res.ok) throw new Error('Version check failed');
  const data = await res.json();
  return data.version;
}

export async function isUpdateAvailable() {
  try {
    const latest = await fetchLatestVersion();
    return !!latest && latest !== APP_VERSION;
  } catch {
    return false;
  }
}

// A plain reload can still serve the cached document on some mobile browsers
// (notably standalone PWAs). Forcing a new URL (via a cache-busting query
// param) guarantees a fresh network request for the HTML document itself —
// the hashed JS/CSS it references are then fetched fresh too.
export function hardReload() {
  const url = new URL(window.location.href);
  url.searchParams.set('_r', Date.now().toString());
  window.location.href = url.toString();
}
