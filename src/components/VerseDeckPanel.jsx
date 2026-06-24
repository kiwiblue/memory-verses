import { useState, useEffect, useRef } from 'react';
import { fetchVerse } from '../api/bible.js';

// ── Stats rings ───────────────────────────────────────────────────────────────
function Ring({ pct, color, size = 26, stroke = 3.5 }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e8e8e4" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color}
        strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={circ * (1 - Math.max(0, Math.min(1, pct)))} />
    </svg>
  );
}

function VerseStats({ entry }) {
  if (!entry || entry.seen_count === 0) return null;
  const recent = (entry.scores || []).slice(-5);
  const accuracyPct = recent.length ? recent.filter(s => s === 1).length / 5 : 0;
  const practicePct = Math.min((entry.seen_count || 0) / 20, 1);
  const accuracyColor = accuracyPct >= 0.8 ? '#3a8c5c' : accuracyPct >= 0.5 ? '#e69c2f' : '#e05252';
  return (
    <div className="deck-stats" title={`Accuracy: ${Math.round(accuracyPct*100)}% · Sessions: ${entry.seen_count}`}>
      <Ring pct={accuracyPct} color={accuracyColor} />
      <Ring pct={practicePct} color="#4a90d9" />
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const STATUS_LABEL = { mastered: 'Mastered', learning: 'Learning', unseen: 'New' };
const STATUS_CLASS = { mastered: 'deck-badge-mastered', learning: 'deck-badge-learning', unseen: 'deck-badge-unseen' };

function firstUnseenIndex(verses, progress) {
  return verses.findIndex(v => (progress[v.id]?.status || 'unseen') === 'unseen');
}

// ── Add tab ───────────────────────────────────────────────────────────────────
const ALL_VERSIONS = [['kjv','KJV'],['bsb','BSB'],['esv','ESV'],['niv','NIV'],['nkjv','NKJV'],['nasb','NASB']];

function AddTab({ curatedVerses, hiddenIds, allVerses, preferredVersion, onAddVerse, onRestoreVerse, onRestoreAll }) {
  const [section, setSection] = useState('search'); // 'search' | 'curated'
  const [query, setQuery]   = useState('');
  const [status, setStatus] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [result, setResult] = useState(null);
  const [added, setAdded]   = useState(null);
  const inputRef = useRef(null);

  useEffect(() => { if (section === 'search') inputRef.current?.focus(); }, [section]);

  async function handleSearch(e) {
    e.preventDefault();
    if (!query.trim()) return;
    setStatus('loading'); setResult(null); setErrorMsg(''); setAdded(null);
    try {
      const data = await fetchVerse(query.trim());
      setResult(data); setStatus('success');
    } catch (err) {
      setErrorMsg(err.message || 'Something went wrong.'); setStatus('error');
    }
  }

  function inDeck() {
    if (!result) return false;
    return allVerses.some(v => v.reference.toLowerCase() === result.reference.toLowerCase());
  }

  function handleAdd(key) {
    onAddVerse({ ...result, _preferredVersion: key });
    setAdded(key);
    setTimeout(() => { setQuery(''); setResult(null); setStatus(null); setAdded(null); }, 1200);
  }

  const pref = preferredVersion || 'kjv';
  const orderedVersions = result
    ? [[pref, ALL_VERSIONS.find(([k]) => k === pref)?.[1] || pref.toUpperCase()],
        ...ALL_VERSIONS.filter(([k]) => k !== pref)].filter(([k]) => result[k])
    : [];

  const hiddenCurated = curatedVerses.filter(v => hiddenIds.has(v.id) || hiddenIds.has(String(v.id)));

  return (
    <div className="deck-add-tab">
      <div className="deck-add-tabs">
        <button className={`deck-add-tab-btn${section === 'search' ? ' active' : ''}`} onClick={() => setSection('search')}>Search</button>
        <button className={`deck-add-tab-btn${section === 'curated' ? ' active' : ''}`} onClick={() => setSection('curated')}>
          Curated list {hiddenCurated.length > 0 && <span className="deck-add-badge">{hiddenCurated.length} removed</span>}
        </button>
      </div>

      {section === 'search' && (
        <div className="deck-search-section">
          <form className="deck-search-form" onSubmit={handleSearch}>
            <input ref={inputRef} type="text" className="deck-search-input"
              placeholder="e.g. Romans 12:2" value={query}
              onChange={e => { setQuery(e.target.value); setResult(null); setStatus(null); }} />
            <button type="submit" className="deck-search-btn" disabled={status === 'loading'}>
              {status === 'loading' ? '…' : 'Search'}
            </button>
          </form>
          {status === 'error' && <p className="deck-add-error">{errorMsg}</p>}
          {status === 'success' && result && (
            <div className="deck-search-result">
              <div className="deck-result-ref">{result.reference}</div>
              {inDeck() ? (
                <p className="deck-add-already">Already in your deck</p>
              ) : added ? (
                <p className="deck-add-ok">✓ Added!</p>
              ) : (
                orderedVersions.map(([key, label]) => (
                  <div key={key} className={`deck-result-row${key === pref ? ' pref' : ''}`}>
                    <span className="deck-result-label">{label}</span>
                    <span className="deck-result-text">{result[key]}</span>
                    <button className="deck-result-add" onClick={() => handleAdd(key)}>
                      {key === pref ? 'Add to deck' : '+'}
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {section === 'curated' && (
        <div className="deck-curated-section">
          {hiddenCurated.length === 0 ? (
            <p className="deck-curated-empty">All curated verses are in your deck.</p>
          ) : (
            <>
              <div className="deck-curated-hdr">
                <span className="deck-curated-note">{hiddenCurated.length} verse{hiddenCurated.length !== 1 ? 's' : ''} removed from your deck</span>
                <button className="deck-restore-all-btn" onClick={onRestoreAll}>Restore all</button>
              </div>
              {hiddenCurated.map(v => (
                <div key={v.id} className="deck-curated-row">
                  <div className="deck-curated-info">
                    <span className="deck-ref">{v.reference}</span>
                    {v.kjv && <span className="deck-curated-text">{v.kjv}</span>}
                  </div>
                  <button className="deck-restore-btn" onClick={() => onRestoreVerse(v.id)}>+ Add</button>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────
export default function VerseDeckPanel({
  verses, curatedVerses = [], hiddenIds = new Set(), progress, dailyQueue,
  currentUser, users, preferredVersion,
  onReorder, onRemoveVerse, onRestoreVerse, onRestoreAll, onAddVerse,
  onLearnNow, onLearnLater, onMirror, onClose,
}) {
  const queueIds = new Set((dailyQueue || []).map(v => String(v.id)));
  const [tab, setTab]             = useState('deck');
  const [list, setList]           = useState(verses);
  const [confirmId, setConfirmId] = useState(null);
  const [mirrorOpen, setMirrorOpen] = useState(false);
  const [mirrorIds, setMirrorIds] = useState([]);
  const [mirrorDone, setMirrorDone] = useState(false);
  const dragIdx = useRef(null);

  useEffect(() => { setList(verses); }, [verses]);

  function onDragStart(e, i) { dragIdx.current = i; e.dataTransfer.effectAllowed = 'move'; }
  function onDragOver(e, i) {
    e.preventDefault();
    const from = dragIdx.current;
    if (from === null || from === i) return;
    const next = [...list];
    const [item] = next.splice(from, 1);
    next.splice(i, 0, item);
    dragIdx.current = i;
    setList(next);
  }
  function onDrop() { onReorder(list.map(v => String(v.id))); dragIdx.current = null; }

  const otherUsers = users.filter(u => u.id !== currentUser.id);
  function toggleMirrorId(id) { setMirrorIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]); }
  function handleMirror() { onMirror(mirrorIds); setMirrorDone(true); setMirrorIds([]); setTimeout(() => setMirrorDone(false), 2500); }

  const upNextIdx = firstUnseenIndex(list, progress);

  return (
    <div className="profile-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="profile-modal">
        <div className="profile-modal-hdr">
          <button className="profile-back" onClick={onClose}>✕</button>
          <div className="profile-modal-title">My Deck ({list.length} verses)</div>
          <div style={{ width: 32 }} />
        </div>

        {/* Tab switcher */}
        <div className="deck-tabs">
          <button className={`deck-tab${tab === 'deck' ? ' active' : ''}`} onClick={() => setTab('deck')}>Deck</button>
          <button className={`deck-tab${tab === 'add' ? ' active' : ''}`} onClick={() => setTab('add')}>+ Add Verse</button>
        </div>

        {tab === 'deck' && (
          <div className="deck-list">
            {list.length === 0 && <div className="deck-empty">No verses in your deck yet.</div>}
            {list.map((verse, i) => {
              const status = progress[verse.id]?.status || 'unseen';
              const isConfirming = confirmId === verse.id;
              const inQueue = queueIds.has(String(verse.id));
              const isUpNext = !inQueue && i === upNextIdx;
              return (
                <div
                  key={verse.id}
                  className={`deck-row${dragIdx.current === i ? ' deck-row-dragging' : ''}`}
                  draggable
                  onDragStart={e => onDragStart(e, i)}
                  onDragOver={e => onDragOver(e, i)}
                  onDrop={onDrop}
                  onDragEnd={onDrop}
                >
                  <span className="deck-drag">⠿</span>
                  <div className="deck-info">
                    <div className="deck-ref">{verse.reference}</div>
                    {inQueue
                      ? <span className="deck-badge deck-badge-today">Today</span>
                      : isUpNext
                        ? <span className="deck-badge deck-badge-upnext">Up Next</span>
                        : <span className={`deck-badge ${STATUS_CLASS[status]}`}>{STATUS_LABEL[status]}</span>
                    }
                  </div>
                  <VerseStats entry={progress[verse.id]} />
                  {isConfirming ? (
                    <div className="deck-confirm">
                      <span className="deck-confirm-label">Remove?</span>
                      <button className="deck-confirm-yes" onClick={() => { onRemoveVerse(verse); setConfirmId(null); }}>Yes</button>
                      <button className="deck-confirm-no" onClick={() => setConfirmId(null)}>No</button>
                    </div>
                  ) : (
                    <div className="deck-row-actions">
                      {inQueue && status !== 'mastered' ? (
                        <button className="deck-learn-later-btn" onClick={() => onLearnLater?.(verse)}>
                          Learn Later
                        </button>
                      ) : !inQueue && status !== 'mastered' ? (
                        <button className="deck-learn-btn" onClick={() => onLearnNow(verse)}>
                          Learn Next
                        </button>
                      ) : null}
                      <button className="deck-remove-btn" onClick={() => setConfirmId(verse.id)}>✕</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {tab === 'add' && (
          <AddTab
            curatedVerses={curatedVerses}
            hiddenIds={hiddenIds}
            allVerses={verses}
            preferredVersion={preferredVersion}
            onAddVerse={onAddVerse}
            onRestoreVerse={onRestoreVerse}
            onRestoreAll={onRestoreAll}
          />
        )}

        {tab === 'deck' && otherUsers.length > 0 && (
          <div className="deck-mirror-section">
            <div className="panel-divider" />
            <div className="deck-mirror-hdr" onClick={() => setMirrorOpen(o => !o)}>
              <span className="deck-mirror-title">Copy deck to other profiles</span>
              <span className="deck-mirror-chevron">{mirrorOpen ? '▲' : '▼'}</span>
            </div>
            {mirrorOpen && (
              <div className="deck-mirror-body">
                <div className="deck-mirror-note">Copies your current verse list and order to selected profiles. Their existing progress is kept.</div>
                {otherUsers.map(u => (
                  <label key={u.id} className="deck-mirror-row">
                    <input type="checkbox" checked={mirrorIds.includes(u.id)} onChange={() => toggleMirrorId(u.id)} />
                    <span className="deck-mirror-avatar" style={{ background: u.colour || '#888' }}>{u.name[0].toUpperCase()}</span>
                    <span className="deck-mirror-name">{u.name}</span>
                    <span className="deck-mirror-bracket">{u.bracket || 'adult'}</span>
                  </label>
                ))}
                {mirrorDone
                  ? <div className="deck-mirror-done">✓ Copied!</div>
                  : <button className="btn btn-ok deck-mirror-btn" onClick={handleMirror} disabled={mirrorIds.length === 0}>Copy deck</button>
                }
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
