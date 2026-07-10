// Per-field merge strategies for reconciling local vs cloud sync data when
// the same account may have been used on two devices. Streak has its own
// merge in streak.js; these cover the rest.

// Per-verse merge: whichever side saw the verse more recently wins for that
// verse's entire entry (status/seen_count/scores/etc move together as a
// unit — never mix half of one device's record with half of another's).
// Falls back to seen_count when last_seen ties (e.g. both null/0).
export function mergeProgress(local = {}, cloud = {}) {
  const ids = new Set([...Object.keys(local || {}), ...Object.keys(cloud || {})]);
  const merged = {};
  for (const id of ids) {
    const l = local?.[id];
    const c = cloud?.[id];
    if (l && !c) { merged[id] = l; continue; }
    if (c && !l) { merged[id] = c; continue; }

    const lSeen = l?.last_seen || 0;
    const cSeen = c?.last_seen || 0;
    if (lSeen === cSeen) {
      const lCount = l?.seen_count || 0;
      const cCount = c?.seen_count || 0;
      merged[id] = cCount > lCount ? c : l;
    } else {
      merged[id] = cSeen > lSeen ? c : l;
    }
  }
  return merged;
}

// Custom verses are additive (users don't typically edit them after
// creation) — union by id, cloud entries win on an id collision.
export function mergeCustomVerses(local = [], cloud = []) {
  const byId = new Map();
  for (const v of local || []) byId.set(v.id, v);
  for (const v of cloud || []) byId.set(v.id, v);
  return [...byId.values()];
}

// Hidden-verse state as a timestamped map { [id]: { hidden, ts } } (see
// hiddenVerses.js). For each verse the most recent change wins, so a restore
// on one device (newer ts) correctly overrides an older "hidden" from another
// — which a plain union of hidden-id sets could never do (it could only ever
// re-add, silently undoing restores). Legacy array snapshots (a bare list of
// hidden ids) normalise to hidden@ts:0 so any real timestamped change beats
// them.
function normalizeHiddenMeta(m) {
  if (Array.isArray(m)) {
    const o = {};
    for (const id of m) o[id] = { hidden: true, ts: 0 };
    return o;
  }
  return m && typeof m === 'object' ? m : {};
}

export function mergeHiddenMeta(local = {}, cloud = {}) {
  const l = normalizeHiddenMeta(local);
  const c = normalizeHiddenMeta(cloud);
  const merged = {};
  for (const id of new Set([...Object.keys(l), ...Object.keys(c)])) {
    const a = l[id], b = c[id];
    if (a && !b) merged[id] = a;
    else if (b && !a) merged[id] = b;
    else merged[id] = (b.ts > a.ts) ? b : a;
  }
  return merged;
}

// Per-verse translation overrides: shallow-merge the two preference maps.
// `preferLocal` controls which side wins on a key present in both (pass
// true when the caller knows local has edits not yet confirmed synced).
export function mergeTranslations(local = {}, cloud = {}, preferLocal = false) {
  return preferLocal ? { ...cloud, ...local } : { ...local, ...cloud };
}
