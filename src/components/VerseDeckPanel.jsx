import { useState, useEffect, useRef } from 'react';
import OverlayHeader from './OverlayHeader.jsx';
import Icon from './Icon.jsx';

const SKILL_LABEL = { easy: 'easy', moderate: 'moderate', hard: 'hard' };

function getBadge(verse, progress, queueIds, upNextIdx, idx) {
  const status = progress[verse.id]?.status || 'unseen';
  const inQueue = queueIds.has(String(verse.id));
  if (inQueue) return null; // shown as a "learn today" action button on the right instead
  if (idx === upNextIdx) return { label: 'up next', cls: 'dp-badge-upnext' };
  if (status === 'unseen') return null;
  const skill = progress[verse.id]?.skill_level || 'easy';
  const cls = skill === 'hard' ? 'dp-badge-hard' : skill === 'moderate' ? 'dp-badge-mod' : 'dp-badge-easy';
  return { label: SKILL_LABEL[skill], cls };
}

function firstUnseenIndex(verses, progress) {
  return verses.findIndex(v => (progress[v.id]?.status || 'unseen') === 'unseen');
}

// ── Deck row ──────────────────────────────────────────────────────────────────
function DeckRow({ verse, i, progress, queueIds, upNextIdx, dragging,
  onDragStart, onDragOver, onDrop, onTouchDragStart,
  onVerseDetails, onLearnToday, onStartLearn, onBackOfDeck, onRemoveVerse }) {

  const [expanded, setExpanded] = useState(false);
  const [swipeDx, setSwipeDx] = useState(0);
  const swipe = useRef(null);
  const rowRef = useRef(null);
  const suppressClickUntil = useRef(0);
  const status = progress[verse.id]?.status || 'unseen';

  // Swipe a row left to delete it straight away (mobile).
  function onRowTouchStart(e) {
    if (expanded) return;
    swipe.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, locked: null };
  }
  function onRowTouchMove(e) {
    if (!swipe.current) return;
    const dx = e.touches[0].clientX - swipe.current.x;
    const dy = e.touches[0].clientY - swipe.current.y;
    if (swipe.current.locked === null && (Math.abs(dx) > 16 || Math.abs(dy) > 16)) {
      swipe.current.locked = Math.abs(dx) > Math.abs(dy) * 1.5 ? 'h' : 'v';
    }
    if (swipe.current.locked === 'h' && dx < 0) setSwipeDx(Math.max(dx, -140));
  }
  function onRowTouchEnd() {
    const wasHorizontal = swipe.current?.locked === 'h';
    if (wasHorizontal && Math.abs(swipeDx) > 8) {
      suppressClickUntil.current = Date.now() + 500;
    }
    if (wasHorizontal && swipeDx <= -100) {
      onRemoveVerse(verse); // row unmounts
    } else {
      setSwipeDx(0);
    }
    swipe.current = null;
  }
  function onRowMainClickCapture(e) {
    if (Date.now() < suppressClickUntil.current) {
      e.preventDefault();
      e.stopPropagation();
      suppressClickUntil.current = 0;
    }
  }
  const isActive = status === 'learning' || status === 'mastered';
  const inQueue  = queueIds.has(String(verse.id));
  const badge    = getBadge(verse, progress, queueIds, upNextIdx, i);

  // Collapse the delete options when clicking anywhere outside this row
  useEffect(() => {
    if (!expanded) return;
    function onDocDown(e) {
      if (rowRef.current && !rowRef.current.contains(e.target)) setExpanded(false);
    }
    document.addEventListener('mousedown', onDocDown);
    return () => document.removeEventListener('mousedown', onDocDown);
  }, [expanded]);

  return (
    <div
      ref={rowRef}
      data-row-idx={i}
      className={`dp-row${dragging ? ' dp-row-dragging' : ''}`}
      draggable={!expanded}
      onDragStart={e => onDragStart(e, i)}
      onDragOver={e => onDragOver(e, i)}
      onDrop={onDrop}
      onDragEnd={onDrop}
      onTouchStart={onRowTouchStart}
      onTouchMove={onRowTouchMove}
      onTouchEnd={onRowTouchEnd}
    >
      <div className="dp-swipe-bg"><Icon name="close" size={15} weight="bold" /> Delete</div>
      <div
        className="dp-row-main"
        style={{ transform: `translateX(${swipeDx}px)`, transition: swipeDx === 0 ? 'transform .2s' : 'none' }}
        onClickCapture={onRowMainClickCapture}
      >
        <span
          className="dp-drag"
          onTouchStart={e => { e.stopPropagation(); onTouchDragStart(e, i); }}
          style={{ touchAction: 'none' }}
        ><Icon name="drag" size={18} weight="regular" /></span>
        {progress[verse.id]?.starred && <span className="dp-star" title="Starred"><Icon name="star" size={16} weight="fill" /></span>}
        <span className="dp-ref">{verse.reference}</span>
        {badge && <span className={`dp-badge ${badge.cls}`}>{badge.label}</span>}

        {expanded ? (
          <div className="dp-row-btns dp-row-options">
            <button className="dp-action-pill dp-pill-back" onClick={() => { onBackOfDeck(verse); setExpanded(false); }}>
              back of deck
            </button>
            <button className="dp-action-pill dp-pill-delete" onClick={() => { onRemoveVerse(verse); setExpanded(false); }}>
              delete
            </button>
          </div>
        ) : (
          <div className="dp-row-btns">
            {inQueue ? (
              <button className="dp-learn-today-btn" onClick={() => onStartLearn?.(verse)}>learn today</button>
            ) : isActive ? (
              <button className="dp-circle-btn dp-btn-info" onClick={() => onVerseDetails?.(verse)} title="Verse details"><Icon name="info" size={19} weight="bold" /></button>
            ) : (
              <button className="dp-circle-btn dp-btn-add" onClick={() => onLearnToday(verse)} title="Learn today"><Icon name="add" size={19} weight="bold" /></button>
            )}
            <button className="dp-circle-btn dp-btn-del" onClick={() => setExpanded(true)} title="Remove options"><Icon name="close" size={19} weight="bold" /></button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────
export default function VerseDeckPanel({
  verses, progress, dailyQueue,
  currentUser, users,
  onReorder, onRemoveVerse, onOpenAddVerse,
  onLearnNow, onLearnLater, onStartLearn, onMirror, onVerseDetails, onClose, onHome,
}) {
  const queueIds = new Set((dailyQueue || []).map(v => String(v.id)));
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

  // Touch reordering (mobile): native HTML5 drag doesn't fire on touch, so we
  // drive it from touchstart on the drag handle + document-level move/end.
  function onTouchDragStart(e, startIdx) {
    dragIdx.current = startIdx;
    function move(ev) {
      if (dragIdx.current === null) return;
      ev.preventDefault(); // stop the page scrolling while dragging
      const t = ev.touches[0];
      const el = document.elementFromPoint(t.clientX, t.clientY);
      const rowEl = el?.closest('[data-row-idx]');
      if (!rowEl) return;
      const over = Number(rowEl.dataset.rowIdx);
      const from = dragIdx.current;
      if (Number.isNaN(over) || over === from) return;
      setList(prev => {
        const next = [...prev];
        const [item] = next.splice(from, 1);
        next.splice(over, 0, item);
        return next;
      });
      dragIdx.current = over;
    }
    function end() {
      document.removeEventListener('touchmove', move);
      document.removeEventListener('touchend', end);
      document.removeEventListener('touchcancel', end);
      setList(curr => { onReorder(curr.map(v => String(v.id))); return curr; });
      dragIdx.current = null;
    }
    document.addEventListener('touchmove', move, { passive: false });
    document.addEventListener('touchend', end);
    document.addEventListener('touchcancel', end);
  }

  function handleLearnToday(verse) {
    onLearnNow(verse);
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
    <div className="dp-overlay">

      {/* ── Header (on dark bg) ──────────────────────────────────────────── */}
      <div className="dp-hdr-panel">
        <OverlayHeader onBack={onClose} user={currentUser} onHome={onHome} />
      </div>

      {/* ── White content sheet ──────────────────────────────────────────── */}
      <div className="dp-sheet">
        <div className="dp-sheet-inner">

              <div className="dp-title-row">
                <span className="dp-title">My Deck</span>
                <button className="dp-add-btn" onClick={onOpenAddVerse}>+ Add</button>
              </div>

              <div className="dp-list">
                {list.length === 0 && <div className="dp-empty">No verses in your deck yet.</div>}
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
                    onTouchDragStart={onTouchDragStart}
                    onVerseDetails={v => { onVerseDetails?.(v); }}
                    onLearnToday={handleLearnToday}
                    onStartLearn={onStartLearn}
                    onBackOfDeck={handleBackOfDeck}
                    onRemoveVerse={onRemoveVerse}
                  />
                ))}
              </div>

              {otherUsers.length > 0 && (
                <div className="deck-mirror-section">
                  <div className="panel-divider" style={{ margin: '12px 0' }} />
                  <div className="deck-mirror-hdr" onClick={() => setMirrorOpen(o => !o)}>
                    <span className="deck-mirror-title">Copy deck to other profiles</span>
                    <span className="deck-mirror-chevron">{mirrorOpen ? <Icon name="up" size={14} /> : <Icon name="down" size={14} />}</span>
                  </div>
                  {mirrorOpen && (
                    <div className="deck-mirror-body">
                      <div className="deck-mirror-note">Copies your current verse list and order to selected profiles.</div>
                      {otherUsers.map(u => (
                        <label key={u.id} className="deck-mirror-row">
                          <input type="checkbox" checked={mirrorIds.includes(u.id)} onChange={() => toggleMirrorId(u.id)} />
                          <span className="deck-mirror-avatar" style={{ background: u.colour || 'var(--color-text-muted)' }}>{u.name[0].toUpperCase()}</span>
                          <span className="deck-mirror-name">{u.name}</span>
                        </label>
                      ))}
                      {mirrorDone
                        ? <div className="deck-mirror-done"><Icon name="check" size={16} /> Copied!</div>
                        : <button className="btn btn-ok deck-mirror-btn" onClick={handleMirror} disabled={mirrorIds.length === 0}>Copy deck</button>
                      }
                    </div>
                  )}
                </div>
              )}

        </div>
      </div>
    </div>
  );
}
