import { useState, useEffect, useRef } from 'react';

const STATUS_LABEL = { mastered: 'Mastered', learning: 'Learning', unseen: 'New' };
const STATUS_CLASS = { mastered: 'deck-badge-mastered', learning: 'deck-badge-learning', unseen: 'deck-badge-unseen' };

function firstUnseenIndex(verses, progress) {
  return verses.findIndex(v => (progress[v.id]?.status || 'unseen') === 'unseen');
}

function verseStatus(progress, verseId) {
  return progress[verseId]?.status || 'unseen';
}

export default function VerseDeckPanel({
  verses, progress, currentUser, users,
  onReorder, onRemoveVerse, onMirror, onClose,
}) {
  const [list, setList]               = useState(verses);
  const [confirmId, setConfirmId]     = useState(null);   // verse id awaiting remove confirm
  const [mirrorOpen, setMirrorOpen]   = useState(false);
  const [mirrorIds, setMirrorIds]     = useState([]);
  const [mirrorDone, setMirrorDone]   = useState(false);
  const dragIdx                        = useRef(null);

  useEffect(() => { setList(verses); }, [verses]);

  // ── Drag and drop ─────────────────────────────────────────────────────────
  function onDragStart(e, i) {
    dragIdx.current = i;
    e.dataTransfer.effectAllowed = 'move';
  }

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

  function onDrop() {
    onReorder(list.map(v => String(v.id)));
    dragIdx.current = null;
  }

  // ── Mirror ────────────────────────────────────────────────────────────────
  const otherUsers = users.filter(u => u.id !== currentUser.id);

  function toggleMirrorId(id) {
    setMirrorIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  function handleMirror() {
    onMirror(mirrorIds);
    setMirrorDone(true);
    setMirrorIds([]);
    setTimeout(() => setMirrorDone(false), 2500);
  }

  return (
    <div className="profile-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="profile-modal">
        <div className="profile-modal-hdr">
          <button className="profile-back" onClick={onClose}>✕</button>
          <div className="profile-modal-title">My Deck ({list.length} verses)</div>
          <div style={{ width: 32 }} />
        </div>

        <div className="deck-list">
          {list.length === 0 && (
            <div className="deck-empty">No verses in your deck yet. Add some below!</div>
          )}
          {(() => {
            const upNextIdx = firstUnseenIndex(list, progress);
            return list.map((verse, i) => {
            const status = verseStatus(progress, verse.id);
            const isConfirming = confirmId === verse.id;
            const isUpNext = i === upNextIdx;
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
                  {isUpNext
                    ? <span className="deck-badge deck-badge-upnext">Up Next</span>
                    : <span className={`deck-badge ${STATUS_CLASS[status]}`}>{STATUS_LABEL[status]}</span>
                  }
                </div>
                {isConfirming ? (
                  <div className="deck-confirm">
                    <span className="deck-confirm-label">Remove?</span>
                    <button className="deck-confirm-yes" onClick={() => { onRemoveVerse(verse); setConfirmId(null); }}>Yes</button>
                    <button className="deck-confirm-no" onClick={() => setConfirmId(null)}>No</button>
                  </div>
                ) : (
                  <button className="deck-remove-btn" onClick={() => setConfirmId(verse.id)}>✕</button>
                )}
              </div>
            );
          });
          })()}
        </div>

        {otherUsers.length > 0 && (
          <div className="deck-mirror-section">
            <div className="panel-divider" />
            <div className="deck-mirror-hdr" onClick={() => setMirrorOpen(o => !o)}>
              <span className="deck-mirror-title">Copy deck to other profiles</span>
              <span className="deck-mirror-chevron">{mirrorOpen ? '▲' : '▼'}</span>
            </div>
            {mirrorOpen && (
              <div className="deck-mirror-body">
                <div className="deck-mirror-note">
                  Copies your current verse list and order to selected profiles. Their existing progress is kept.
                </div>
                {otherUsers.map(u => (
                  <label key={u.id} className="deck-mirror-row">
                    <input
                      type="checkbox"
                      checked={mirrorIds.includes(u.id)}
                      onChange={() => toggleMirrorId(u.id)}
                    />
                    <span
                      className="deck-mirror-avatar"
                      style={{ background: u.colour || '#888' }}
                    >
                      {u.name[0].toUpperCase()}
                    </span>
                    <span className="deck-mirror-name">{u.name}</span>
                    <span className="deck-mirror-bracket">{u.bracket || 'adult'}</span>
                  </label>
                ))}
                {mirrorDone
                  ? <div className="deck-mirror-done">✓ Copied!</div>
                  : <button
                      className="btn btn-ok deck-mirror-btn"
                      onClick={handleMirror}
                      disabled={mirrorIds.length === 0}
                    >Copy deck</button>
                }
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
