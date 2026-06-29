const KEY = (userId) => `mv-progress-${userId}`;

// Migrate old format { [id]: 'unseen'|'learning'|'mastered' }
// to new format { [id]: { status, seen_count, last_seen, scores, next_review } }
function migrate(raw) {
  const result = {};
  for (const [id, val] of Object.entries(raw)) {
    if (typeof val === 'string') {
      result[id] = { status: val, seen_count: 0, last_seen: null, scores: [], next_review: null };
    } else {
      const e = { ...val };
      // Heal entries corrupted by the old revise-queue bug (≤ v0.8.12), where a
      // skill-level string was fed to recordAttempt and next_review became NaN.
      // Reset the broken due-date to "now" so the verse re-enters rotation.
      if ((e.status === 'learning' || e.status === 'mastered') &&
          !Number.isFinite(e.next_review)) {
        e.next_review = Date.now();
      }
      result[id] = e;
    }
  }
  return result;
}

export function loadProgress(userId) {
  try {
    const raw = localStorage.getItem(KEY(userId));
    if (raw) return migrate(JSON.parse(raw));
  } catch (_) {}
  return {};
}

export function saveProgress(userId, progress) {
  localStorage.setItem(KEY(userId), JSON.stringify(progress));
}

export function getEntry(progress, verseId) {
  return progress[verseId] || { status: 'unseen', seen_count: 0, last_seen: null, scores: [], next_review: null };
}
