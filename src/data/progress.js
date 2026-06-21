const KEY = (userId) => `mv-progress-${userId}`;

// Migrate old format { [id]: 'unseen'|'learning'|'mastered' }
// to new format { [id]: { status, seen_count, last_seen, scores, next_review } }
function migrate(raw) {
  const result = {};
  for (const [id, val] of Object.entries(raw)) {
    if (typeof val === 'string') {
      result[id] = { status: val, seen_count: 0, last_seen: null, scores: [], next_review: null };
    } else {
      result[id] = val;
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
