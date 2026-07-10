const KEY = (userId) => `mv-hidden-${userId}`;

// Hidden-verse state is stored as a timestamped map: { [id]: { hidden, ts } }.
// Keeping an explicit "shown" tombstone (hidden:false with its own timestamp)
// alongside hidden ones lets cross-device sync tell a deliberate restore apart
// from a stale "never hidden" — so the merge (mergeHiddenMeta) can honour the
// most recent change instead of a plain union that could only ever re-hide and
// would silently undo a restore. Legacy snapshots were a bare array of hidden
// ids; those normalise to hidden@ts:0 so any real timestamped change wins.

// Object keys are strings; restore numeric ids so callers' Set.has(numericId)
// keeps matching (curated + custom verse ids are numbers).
function normalizeId(id) {
  return (typeof id === 'string' && String(Number(id)) === id) ? Number(id) : id;
}

export function loadHiddenMeta(userId) {
  try {
    const raw = localStorage.getItem(KEY(userId));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const meta = {};
      for (const id of parsed) meta[id] = { hidden: true, ts: 0 };
      return meta;
    }
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch { return {}; }
}

export function saveHiddenMeta(userId, meta) {
  localStorage.setItem(KEY(userId), JSON.stringify(meta));
}

// Projection to the Set of currently-hidden ids that the rest of the app uses.
export function loadHiddenVerseIds(userId) {
  const meta = loadHiddenMeta(userId);
  const set = new Set();
  for (const [id, m] of Object.entries(meta)) {
    if (m && m.hidden) set.add(normalizeId(id));
  }
  return set;
}

// Replace-semantics save for callers that pass the Set of ids that should now
// be hidden (onboarding's initial hide, mirror-deck). Ids previously hidden but
// absent from the set become explicit "shown" tombstones so the change syncs.
export function saveHiddenVerseIds(userId, idSet) {
  const now = Date.now();
  const meta = loadHiddenMeta(userId);
  const next = {};
  // Carry forward existing shown-tombstones so past restores aren't forgotten.
  for (const [id, m] of Object.entries(meta)) {
    if (m && !m.hidden) next[id] = m;
  }
  for (const id of idSet) next[id] = { hidden: true, ts: now };
  for (const [id, m] of Object.entries(meta)) {
    if (m && m.hidden && !idSet.has(normalizeId(id)) && !idSet.has(id)) {
      next[id] = { hidden: false, ts: now };
    }
  }
  saveHiddenMeta(userId, next);
}

export function hideVerseId(userId, verseId) {
  const meta = loadHiddenMeta(userId);
  meta[verseId] = { hidden: true, ts: Date.now() };
  saveHiddenMeta(userId, meta);
  return loadHiddenVerseIds(userId);
}

export function restoreVerseId(userId, verseId) {
  const meta = loadHiddenMeta(userId);
  meta[verseId] = { hidden: false, ts: Date.now() };
  saveHiddenMeta(userId, meta);
  return loadHiddenVerseIds(userId);
}

export function restoreAllVerseIds(userId) {
  const now = Date.now();
  const meta = loadHiddenMeta(userId);
  const next = {};
  for (const [id, m] of Object.entries(meta)) {
    next[id] = { hidden: false, ts: now };
  }
  saveHiddenMeta(userId, next);
  return new Set();
}
