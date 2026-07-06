// Tracks whether the local device has edits that haven't been confirmed pushed
// to the cloud yet. The cloud sync push is debounced (10s) and does not survive
// the app being closed, so without this flag a startup pull would blindly
// overwrite local work that never got a chance to upload. When this flag is
// set, the startup pull keeps local data instead of clobbering it, then
// re-uploads it.
const KEY = 'mv-sync-pending';

export function markSyncPending() {
  try { localStorage.setItem(KEY, '1'); } catch {}
}

export function isSyncPending() {
  try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
}

export function clearSyncPending() {
  try { localStorage.removeItem(KEY); } catch {}
}
