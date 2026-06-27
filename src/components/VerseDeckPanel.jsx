import { useState, useEffect, useRef } from 'react';
import { fetchVerse } from '../api/bible.js';

const SKILL_LABEL = { easy: 'easy', moderate: 'moderate', hard: 'hard' };

function getBadge(verse, progress, queueIds, upNextIdx, idx) {
  const status = progress[verse.id]?.status || 'unseen';
  const inQueue = queueIds.has(String(verse.id));
  if (inQueue) return { label: 'today', cls: 'deck-badge-today' };
  if (idx === upNextIdx) return { label: 'up next', cls: 'deck-badge-upnext' };
  if (status === 'unseen') return { label: 'new', cls: 'deck-badge-unseen' };
  const skill = progress[verse.id]?.skill_level || 'easy';
  const cls = skill === 'hard' ? 'deck-badge-hard' : skill === 'moderate' ? 'deck-badge-mod' : 'deck-badge-easy';
  return { label: SKILL_LABEL[skill], cls };
}

function firstUnseenIndex(verses, progress) {
  return verses.findIndex(v => (progress[v.id]?.status || 'unseen') === 'unseen');
}

// ── Add tab ───────────────────────────────────────────────────────────────────
const ALL_VERSIONS = [['kjv','KJV'],['bsb','BSB'],['esv','ESV'],['niv','NIV'],['nkjv','NKJV'],['nasb','NASB']];

function AddTab({ curatedVerses, hiddenIds, allVerses, preferredVersion, onAddVerse, onRestoreVerse, onRestoreAll }) {
  const [section, setSection] = useState('search');
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
          Curated {hiddenCurated.length > 0 && <span className="deck-add-badge">{hiddenCurated.length} removed</span>}
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
                <span className="deck-curated-note">{hiddenCurated.length} verse{hiddenCurated.length !== 1 ? 's' : ''} removed</span>
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

// ── Deck row ──────────────────────────────────────────────────────────────────
function DeckRow({ verse, i, progress, queueIds, upNextIdx, dragging,
  onDragStart, onDragOver, onDrop,
  onVerseDetails, onLearnToday, onBackOfDeck, onRemoveVerse }) {

  const [expanded, setExpanded] = useState(null); // null | 'delete'
  const status = progress[verse.id]?.status || 'unseen';
  const isActive = status === 'learning' || status === 'mastered';
  const inQueue  = queueIds.has(String(verse.id));
  const badge    = getBadge(verse, progress, queueIds, upNextIdx, i);

  function handleDeleteBtn() {
    setExpanded(e => e === 'delete' ? null : 'delete');
  }

  return (
    <div
      className={`deck-row2${dragging ? ' deck-row-dragging' : ''}`}
      draggable
      onDragStart={e => onDragStart(e, i)}
      onDragOver={e => onDragOver(e, i)}
      onDrop={onDrop}
      onDragEnd={onDrop}
    >
      {/* Main row */}
      <div className="deck-row2-main">
        <span className="deck-drag">⠿</span>
        <span className="deck-ref2">{verse.reference}</span>
        <span className={`deck-badge2 ${badge.cls}`}>{badge.label}</span>

        {/* ⓘ → verse screen (active verses only) */}
        {isActive && (
          <button className="deck-icon-btn deck-info-btn" onClick={() => onVerseDetails?.(verse)} title="Verse details">
            ⓘ
          </button>
        )}

        {/* ⊕ → learn today (not in queue, not mastered) */}
        {!inQueue && status !== 'mastered' && (
          <button className="deck-icon-btn deck-learn-btn2" onClick={() => onLearnToday(verse)} title="Learn today">
            ⊕
          </button>
        )}

        {/* ⊗ → delete options */}
        <button
          className={`deck-icon-btn deck-delete-btn${expanded === 'delete' ? ' active' : ''}`}
          onClick={handleDeleteBtn}
          title="Remove options"
        >
          ⊗
        </button>
      </div>

      {/* Expanded: delete options */}
      {expanded === 'delete' && (
        <div className="deck-row2-expanded">
          <button className="deck-expand-btn deck-back-btn"
            onClick={() => { onBackOfDeck(verse); setExpanded(null); }}>
            Back of deck
          </button>
          <button className="deck-expand-btn deck-delete-confirm-btn"
            onClick={() => { onRemoveVerse(verse); setExpanded(null); }}>
            Delete
          </button>
          <button className="deck-expand-btn deck-cancel-btn" onClick={() => setExpanded(null)}>
            Cancel
          </button>
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
  onLearnNow, onLearnLater, onMirror, onVerseDetails, onClose,
}) {
  const queueIds = new Set((dailyQueue || []).map(v => String(v.id)));
  const [tab, setTab]     = useState('deck');
  const [list, setList]   = useState(verses);
  const [mirrorOpen, setMirrorOpen] = useState(false);
  const [mirrorIds, setMirrorIds]   = useState([]);
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

  function handleLearnToday(verse) {
    onLearnNow(verse);
    // Move the verse just above the first unseen (up-next) position
    const idx = list.findIndex(v => String(v.id) === String(verse.id));
    const upNext = firstUnseenIndex(list, progress);
    if (idx === -1 || upNext === -1 || idx <= upNext) return;
    const next = [...list];
    const [item] = next.splice(idx, 1);
    next.splice(upNext, 0, item);
    setList(next);
    onReorder(next.map(v => String(v.id)));
  }

  function handleBackOfDeck(verse) {
    const next = list.filter(v => String(v.id) !== String(verse.id));
    next.push(verse);
    setList(next);
    onReorder(next.map(v => String(v.id)));
    onLearnLater?.(verse);
  }

  const upNextIdx = firstUnseenIndex(list, progress);
  const otherUsers = users.filter(u => u.id !== currentUser.id);

  function toggleMirrorId(id) { setMirrorIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]); }
  function handleMirror() { onMirror(mirrorIds); setMirrorDone(true); setMirrorIds([]); setTimeout(() => setMirrorDone(false), 2500); }

  return (
    <div className="profile-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="profile-modal">

        <div className="profile-modal-hdr">
          <button className="profile-back" onClick={onClose}>✕</button>
          <div className="profile-modal-title">My Deck</div>
          <button className="deck-add-hdr-btn" onClick={() => setTab('add')}>+ add</button>
        </div>

        {/* Tab switcher */}
        <div className="deck-tabs">
          <button className={`deck-tab${tab === 'deck' ? ' active' : ''}`} onClick={() => setTab('deck')}>
            Deck ({list.length})
          </button>
          <button className={`deck-tab${tab === 'add' ? ' active' : ''}`} onClick={() => setTab('add')}>
            + Add Verse
          </button>
        </div>

        {tab === 'deck' && (
          <div className="deck-list">
            {list.length === 0 && <div className="deck-empty">No verses in your deck yet.</div>}
            {list.map((verse, i) => (
              <DeckRow
                key={verse.id}
                verse={verse}
                i={i}
                progress={progress}
                queueIds={queueIds}
                upNextIdx={upNextIdx}
                dragging={dragIdx.current === i}
                onDragStart={onDragStart}
                onDragOver={onDragOver}
                onDrop={onDrop}
                onVerseDetails={onVerseDetails}
                onLearnToday={handleLearnToday}
                onBackOfDeck={handleBackOfDeck}
                onRemoveVerse={onRemoveVerse}
              />
            ))}
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
                <div className="deck-mirror-note">Copies your current verse list and order to selected profiles.</div>
                {otherUsers.map(u => (
                  <label key={u.id} className="deck-mirror-row">
                    <input type="checkbox" checked={mirrorIds.includes(u.id)} onChange={() => toggleMirrorId(u.id)} />
                    <span className="deck-mirror-avatar" style={{ background: u.colour || '#888' }}>{u.name[0].toUpperCase()}</span>
                    <span className="deck-mirror-name">{u.name}</span>
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
