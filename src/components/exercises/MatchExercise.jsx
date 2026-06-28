import { useState, useMemo, useRef } from 'react';
import Icon from '../Icon.jsx';
import { logEvent } from '../../data/telemetry.js';
import { parseRef, toDisplayRef } from '../../api/bibleRef.js';

const DIFFICULTY_LABEL = { easy: 'Easy', moderate: 'Moderate', hard: 'Hard' };
const VERSE_COUNT = { easy: 2, moderate: 4, hard: 2 };
const MAX_TEXT_WORDS = 12; // truncate long verse previews

function truncate(text) {
  if (!text) return '…';
  const words = text.split(/\s+/);
  return words.length <= MAX_TEXT_WORDS
    ? text
    : words.slice(0, MAX_TEXT_WORDS).join(' ') + '…';
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Drag-and-drop match (Easy / Moderate) ──────────────────────────────────

function DragMatch({ verses, version = 'kjv', onComplete, onSkip }) {
  // slots[i] = reference string placed in slot i, or null
  const [slots, setSlots]         = useState(() => verses.map(() => null));
  // available pool (shuffled references not yet placed)
  const [pool, setPool]           = useState(() => shuffle(verses.map(v => v.reference)));
  const [dragSource, setDragSource] = useState(null); // { from: 'pool'|'slot', index }
  const [checked, setChecked]     = useState(false);
  const [errors, setErrors]       = useState(0);

  const allFilled = slots.every(s => s !== null);
  const correct   = verses.map((v, i) => slots[i] === v.reference);

  function startDragPool(ref) {
    setDragSource({ from: 'pool', ref });
  }
  function startDragSlot(i) {
    if (!slots[i]) return;
    setDragSource({ from: 'slot', index: i, ref: slots[i] });
  }

  function dropOnSlot(targetIdx) {
    if (!dragSource) return;
    const newSlots = [...slots];
    const { from, ref, index: srcIdx } = dragSource;

    if (from === 'pool') {
      const displaced = newSlots[targetIdx];
      newSlots[targetIdx] = ref;
      setPool(p => {
        const next = p.filter(r => r !== ref);
        return displaced ? [...next, displaced] : next;
      });
    } else {
      // slot → slot: swap
      const displaced = newSlots[targetIdx];
      newSlots[targetIdx] = ref;
      newSlots[srcIdx] = displaced;
    }
    setSlots(newSlots);
    setDragSource(null);
  }

  function dropOnPool() {
    if (!dragSource || dragSource.from !== 'slot') return;
    const { index: srcIdx, ref } = dragSource;
    const newSlots = [...slots];
    newSlots[srcIdx] = null;
    setSlots(newSlots);
    setPool(p => [...p, ref]);
    setDragSource(null);
  }

  // Reveal one correct pairing (counts as an error/hint penalty)
  function handleHint() {
    const i = verses.findIndex((v, idx) => slots[idx] !== v.reference);
    if (i === -1) return;
    const correctRef = verses[i].reference;
    const newSlots = [...slots];
    const existingIdx = newSlots.indexOf(correctRef);
    if (existingIdx !== -1) newSlots[existingIdx] = null;
    newSlots[i] = correctRef;
    setSlots(newSlots);
    const allRefs = verses.map(v => v.reference);
    setPool(shuffle(allRefs.filter(r => !newSlots.includes(r))));
    setErrors(e => e + 1);
  }

  function handleCheck() {
    const wrongCount = correct.filter(c => !c).length;
    setErrors(e => e + wrongCount);
    setChecked(true);
    if (correct.every(c => c)) {
      setTimeout(() => onComplete?.({ errors: errors + wrongCount, total: verses.length }), 800);
    }
  }

  // Touch drag support
  const touchDragRef = useRef(null);

  function onTouchStart(source, e) {
    touchDragRef.current = { source, startY: e.touches[0].clientY };
    setDragSource(source);
  }

  function onTouchEnd(e) {
    if (!touchDragRef.current) return;
    const touch = e.changedTouches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    const slotEl = el?.closest('[data-slot]');
    const poolEl = el?.closest('[data-pool]');
    if (slotEl) {
      dropOnSlot(Number(slotEl.dataset.slot));
    } else if (poolEl) {
      dropOnPool();
    }
    touchDragRef.current = null;
    setDragSource(null);
  }

  return (
    <div className="match-ex">
      {/* Verse rows */}
      <div className="match-rows">
        {verses.map((v, i) => {
          const isCorrect = checked ? correct[i] : null;
          return (
            <div key={v.id} className="match-row">
              <div className="match-verse-text">{truncate(v[version] || v.kjv || '')}</div>
              <div
                className={`match-slot${slots[i] ? ' match-slot-filled' : ''}${
                  isCorrect === true ? ' match-slot-correct' : isCorrect === false ? ' match-slot-wrong' : ''
                }${dragSource ? ' match-slot-target' : ''}`}
                data-slot={i}
                onDragOver={e => e.preventDefault()}
                onDrop={() => dropOnSlot(i)}
                onTouchEnd={onTouchEnd}
              >
                {slots[i]
                  ? (
                    <span
                      className="match-ref-chip match-ref-in-slot"
                      draggable
                      onDragStart={() => startDragSlot(i)}
                      onTouchStart={e => onTouchStart({ from: 'slot', index: i, ref: slots[i] }, e)}
                    >
                      {slots[i]}
                    </span>
                  )
                  : <span className="match-slot-placeholder">Drop here</span>
                }
              </div>
            </div>
          );
        })}
      </div>

      {/* Reference pool */}
      {pool.length > 0 && (
        <div
          className="match-pool"
          data-pool
          onDragOver={e => e.preventDefault()}
          onDrop={dropOnPool}
        >
          {pool.map(ref => (
            <span
              key={ref}
              className={`match-ref-chip${dragSource?.ref === ref ? ' match-chip-dragging' : ''}`}
              draggable
              onDragStart={() => startDragPool(ref)}
              onTouchStart={e => onTouchStart({ from: 'pool', ref }, e)}
              onTouchEnd={onTouchEnd}
            >
              {ref}
            </span>
          ))}
        </div>
      )}

      {/* Check / result */}
      {allFilled && !checked && (
        <button className="ob-btn-primary match-check-btn" onClick={handleCheck}>
          Check answers →
        </button>
      )}
      {checked && !correct.every(c => c) && (
        <p className="match-hint-msg">Move the highlighted ones to correct them.</p>
      )}

      {!checked && (
        <div className="ex-actions-row">
          <button className="type-hint-btn" onClick={handleHint} disabled={correct.every(c => c)}>Hint</button>
          {onSkip && <button className="ex-skip-btn" onClick={onSkip}>Skip <Icon name="forward" size={18} /></button>}
        </div>
      )}
    </div>
  );
}

// ── Type-the-reference match (Hard) ────────────────────────────────────────

// Parse a reference into {book, chapter, verse} parts for progressive hints
function refParts(ref) {
  const m = ref.match(/^(.+?)\s+(\d+):(.+)$/);
  if (!m) return { book: ref, chapter: '', verse: '' };
  return { book: m[1], chapter: m[2], verse: m[3] };
}

function hintForLevel(ref, level) {
  const { book, chapter } = refParts(ref);
  if (level === 1) return book;
  if (level === 2) return `${book} ${chapter}`;
  return ref; // level 3 = full reference
}

const HINT_LABELS = ['Hint', 'Chapter', 'Verse'];

// 'correct' | 'close' | 'wrong'
function gradeAnswer(input, correctRef) {
  const norm = raw => {
    try {
      const p = parseRef(raw.trim());
      return p ? toDisplayRef(p).toLowerCase() : raw.trim().toLowerCase();
    } catch { return raw.trim().toLowerCase(); }
  };

  if (norm(input) === norm(correctRef)) return 'correct';

  // Extract {book, chapter, verse} from a reference string
  const parts = ref => {
    const m = ref.match(/^(.+?)\s+(\d+):(\S+)$/);
    return m ? { book: m[1].toLowerCase(), chapter: m[2], verse: m[3] } : null;
  };

  const inp = parts(norm(input));
  const cor = parts(norm(correctRef));
  if (!inp || !cor) return 'wrong';

  // Numbers must match exactly; book just needs to be a prefix of the other
  const numMatch  = inp.chapter === cor.chapter && inp.verse === cor.verse;
  const bookMatch = inp.book.startsWith(cor.book) || cor.book.startsWith(inp.book);
  return (numMatch && bookMatch) ? 'close' : 'wrong';
}

function TypeMatch({ verses, version = 'kjv', onComplete, onSkip }) {
  const [inputs, setInputs]       = useState(() => verses.map(() => ''));
  const [hintLevels, setHintLevels] = useState(() => verses.map(() => 0));
  const [results, setResults]     = useState(null); // null | Array<'correct'|'close'|'wrong'>
  const [errors, setErrors]       = useState(0);

  function handleHint(i) {
    const nextLevel = Math.min(hintLevels[i] + 1, 3);
    const newHintLevels = [...hintLevels];
    newHintLevels[i] = nextLevel;
    setHintLevels(newHintLevels);

    const newInputs = [...inputs];
    newInputs[i] = hintForLevel(verses[i].reference, nextLevel);
    setInputs(newInputs);
    if (results) setResults(null);
  }

  function handleCheck() {
    const grades = verses.map((v, i) => gradeAnswer(inputs[i], v.reference));
    const wrongCount = grades.filter(g => g === 'wrong').length;
    setErrors(e => e + wrongCount);
    setResults(grades);
    if (grades.every(g => g !== 'wrong')) {
      setTimeout(() => onComplete?.({ errors: errors + wrongCount, total: verses.length }), 800);
    }
  }

  const allFilled = inputs.every(s => s.trim().length > 0);
  const allPassed = results && results.every(g => g !== 'wrong');

  return (
    <div className="match-ex">
      <div className="match-rows">
        {verses.map((v, i) => {
          const grade = results?.[i] ?? null;
          const hintLevel = hintLevels[i];
          return (
            <div key={v.id} className="match-type-row">
              <div className="match-verse-text">{truncate(v[version] || v.kjv || '')}</div>
              <div className="match-type-controls">
                <div className="match-input-wrap">
                  <input
                    className={`match-type-input${
                      grade === 'correct' ? ' match-slot-correct'
                      : grade === 'close' ? ' match-slot-close'
                      : grade === 'wrong' ? ' match-slot-wrong' : ''
                    }`}
                    placeholder="Reference…"
                    value={inputs[i]}
                    onChange={e => {
                      const next = [...inputs];
                      next[i] = e.target.value;
                      setInputs(next);
                      if (results) setResults(null);
                    }}
                  />
                  {grade === 'close' && (
                    <span className="match-close-label">Close! ({v.reference})</span>
                  )}
                </div>
                {hintLevel < 3 && (
                  <button className="match-hint-btn" onClick={() => handleHint(i)}>
                    {HINT_LABELS[hintLevel]}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {allFilled && !allPassed && (
        <button className="ob-btn-primary match-check-btn" onClick={handleCheck}>
          Check answers →
        </button>
      )}
      {results && !allPassed && results.some(g => g === 'wrong') && (
        <p className="match-hint-msg">Correct the highlighted references and try again.</p>
      )}
      {onSkip && !allPassed && (
        <div className="ex-actions-row">
          <button className="ex-skip-btn" onClick={onSkip}>Skip <Icon name="forward" size={18} /></button>
        </div>
      )}
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

export default function MatchExercise({ verses: allVerses, version = 'kjv', difficulty = 'easy', onDowngrade, onComplete, onSkip }) {
  const count = VERSE_COUNT[difficulty];

  // Pick `count` verses deterministically from the provided list
  const verses = useMemo(() => allVerses.slice(0, count), [allVerses, count]);

  const [done, setDone]     = useState(false);
  const [result, setResult] = useState(null);

  function handleComplete(r) {
    setResult(r);
    setDone(true);
    logEvent('exercise_complete', { type: 'match', difficulty, errors: r.errors, total: r.total });
    if (r.errors > 4) onDowngrade?.();
    setTimeout(() => onComplete?.(r), 700);
  }

  return (
    <div className="fill-ex match-ex-wrap">
      <div className="fill-ex-header">
        <span className="fill-ex-ref">Match the reference</span>
        <span className={`fill-ex-badge fill-ex-badge-${difficulty}`}>{DIFFICULTY_LABEL[difficulty]}</span>
      </div>
      <p className="fill-ex-progress-label" style={{ marginBottom: 16 }}>
        {difficulty === 'hard'
          ? 'Type the reference for each verse'
          : 'Drag each reference to the correct verse'}
      </p>

      {done ? (
        <div className="fill-done">
          <span className="fill-done-icon"><Icon name="check" size={28} /></span>
          <span className="fill-done-msg">{result?.errors === 0 ? 'Perfect!' : 'Well done!'}</span>
        </div>
      ) : difficulty === 'hard' ? (
        <TypeMatch verses={verses} version={version} onComplete={handleComplete} onSkip={onSkip} />
      ) : (
        <DragMatch verses={verses} version={version} onComplete={handleComplete} onSkip={onSkip} />
      )}
    </div>
  );
}
