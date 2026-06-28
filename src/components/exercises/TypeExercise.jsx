import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import Icon from '../Icon.jsx';
import { logEvent } from '../../data/telemetry.js';

function parseTokens(text) {
  return text.split(/\s+/).filter(Boolean).map(raw => {
    const m = raw.match(/^(.*?)([,;:.!?'"]+)?$/);
    return { raw, word: m?.[1] || raw, punct: m?.[2] || '' };
  });
}

function blankIndicesFor(tokens, difficulty) {
  if (difficulty === 'hard') return tokens.map((_, i) => i);
  if (difficulty === 'moderate') return tokens.map((_, i) => i);
  return tokens.map((_, i) => i).filter(i => i % 2 === 1);
}

const DIFFICULTY_LABEL = { easy: 'Easy', moderate: 'Moderate', hard: 'Hard' };

// ── Easy / Moderate: type first letter of each hidden word ──────────────────

function FirstLetterMode({ tokens, blankIndices, difficulty, onDowngrade, onComplete }) {
  const [activeBi, setActiveBi]           = useState(0);
  const [revealed, setRevealed]           = useState({});
  const [consecutiveErrors, setConsecutiveErrors] = useState(0);
  const [totalHints, setTotalHints]       = useState(0);
  const [shake, setShake]                 = useState(false);
  const [errors, setErrors]               = useState(0);
  const [done, setDone]                   = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  function advance(nr, bi, errCount, hintsCount) {
    const next = bi + 1;
    if (next >= blankIndices.length) {
      setDone(true);
      setTimeout(() => onComplete?.({ errors: errCount, total: blankIndices.length, hints: hintsCount ?? totalHints }), 700);
    } else {
      setActiveBi(next);
      setConsecutiveErrors(0);
    }
  }

  const handleKey = useCallback((e) => {
    if (done || activeBi >= blankIndices.length) return;
    const key = e.key;
    if (key.length !== 1) return;
    e.preventDefault();

    const targetWord = tokens[blankIndices[activeBi]].word;
    if (key.toLowerCase() === targetWord[0].toLowerCase()) {
      const nr = { ...revealed, [blankIndices[activeBi]]: 'correct' };
      setRevealed(nr);
      setConsecutiveErrors(0);
      advance(nr, activeBi, errors, totalHints);
    } else {
      const newErrors = errors + 1;
      const newConsec = consecutiveErrors + 1;
      setErrors(newErrors);
      setConsecutiveErrors(newConsec);
      setShake(true);
      setTimeout(() => setShake(false), 400);
      if (newConsec >= 2) {
        const nr = { ...revealed, [blankIndices[activeBi]]: 'auto' };
        setRevealed(nr);
        setConsecutiveErrors(0);
        setTimeout(() => advance(nr, activeBi, newErrors, totalHints), 600);
      }
    }
  }, [done, activeBi, blankIndices, tokens, revealed, consecutiveErrors, errors, onComplete]);

  function handleHint() {
    if (done || activeBi >= blankIndices.length) return;
    const newErrors = errors + 1;
    const newHints  = totalHints + 1;
    setErrors(newErrors);
    setTotalHints(newHints);
    const nr = { ...revealed, [blankIndices[activeBi]]: 'hint' };
    setRevealed(nr);
    setConsecutiveErrors(0);
    if (newHints > 4) onDowngrade?.();
    advance(nr, activeBi, newErrors, newHints);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  const activeTokenIndex = blankIndices[activeBi];
  const targetWord = tokens[activeTokenIndex]?.word ?? '';
  const showLetterHint = activeBi === 0 || consecutiveErrors >= 2;

  return (
    <>
      <div className="type-ex-verse" onClick={() => inputRef.current?.focus()}>
        {tokens.map((token, i) => {
          const bi = blankIndices.indexOf(i);
          const isBlank   = bi !== -1;
          const revState  = revealed[i];
          const isActive  = bi === activeBi;

          if (!isBlank)           return <span key={i} className="fill-word">{token.raw} </span>;
          if (revState === 'correct') return <span key={i} className="type-word-revealed">{token.raw} </span>;
          if (revState === 'auto')    return <span key={i} className="type-word-auto">{token.raw} </span>;
          if (revState === 'hint')    return <span key={i} className="type-word-hint">{token.raw} </span>;
          if (isActive) {
            return (
              <span key={i} className={`type-blank type-blank-active${shake ? ' type-shake' : ''}`}>
                <span className="fill-blank-cursor" />{token.punct}{' '}
              </span>
            );
          }
          return (
            <span key={i} className="type-blank">
              {'_'.repeat(Math.max(2, token.word.length))}{token.punct}{' '}
            </span>
          );
        })}
      </div>

      {!done && (
        <div className="type-ex-controls">
          <div className="type-ex-hint">
            {showLetterHint && targetWord
              ? <>Type: <strong className="type-hint-letter">{targetWord[0].toUpperCase()}</strong></>
              : <span>Type the first letter of each hidden word</span>
            }
          </div>
          <button className="type-hint-btn" onClick={handleHint}>Hint</button>
        </div>
      )}

      <input
        ref={inputRef} className="type-hidden-input"
        onKeyDown={handleKey}
        onChange={e => {
          const ch = e.target.value.slice(-1);
          e.target.value = '';
          if (ch) handleKey({ key: ch, preventDefault: () => {} });
        }}
        inputMode="text" autoComplete="off" autoCorrect="off"
        autoCapitalize="off" spellCheck="false" aria-hidden="true"
      />
    </>
  );
}

// ── Hard: type every letter; spaces ignored; two-level hint ─────────────────

function FullTypeMode({ tokens, onDowngrade, onComplete }) {
  const target = useMemo(() => tokens.map(t => t.raw).join(' '), [tokens]);

  const wordBoundaries = useMemo(() => {
    let i = 0;
    return tokens.map(token => {
      const b = { start: i, end: i + token.raw.length };
      i += token.raw.length + 1;
      return b;
    });
  }, [tokens]);

  function skipToLetter(p) {
    let q = p;
    while (q < target.length && !/[a-zA-Z0-9]/.test(target[q])) q++;
    return q;
  }

  const firstPos = useMemo(() => skipToLetter(0), [target]);

  const [pos, setPos]                     = useState(firstPos);
  // hintedRanges: [{start, end}] — character ranges auto-filled by hint
  const [hintedRanges, setHintedRanges]   = useState([]);
  const [consecutiveHints, setConsecutiveHints] = useState(0);
  const [totalHints, setTotalHints]       = useState(0);
  const [shake, setShake]                 = useState(false);
  const [errors, setErrors]               = useState(0);
  const [done, setDone]                   = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { setPos(firstPos); }, [firstPos]);
  useEffect(() => { inputRef.current?.focus(); }, []);

  function finishAt(newPos, errCount, hintsCount) {
    if (newPos >= target.length) {
      setDone(true);
      setTimeout(() => onComplete?.({ errors: errCount, total: tokens.length, hints: hintsCount ?? totalHints }), 700);
    }
  }

  const handleKey = useCallback((e) => {
    if (done) return;
    const key = e.key;

    if (key === ' ') { e.preventDefault(); return; }

    if (key === 'Backspace') {
      e.preventDefault();
      if (pos <= firstPos) return;
      // Find previous required char position
      let newPos = pos - 1;
      while (newPos > firstPos && !/[a-zA-Z0-9]/.test(target[newPos])) newPos--;
      // If inside a hinted range, rewind to start of that range
      const hr = hintedRanges.find(r => newPos >= r.start && newPos < r.end);
      if (hr) {
        newPos = hr.start;
        setHintedRanges(prev => prev.filter(r => r !== hr));
      }
      setPos(Math.max(firstPos, newPos));
      setConsecutiveHints(0);
      return;
    }

    if (key.length !== 1) return;
    e.preventDefault();

    const expected = target[pos];
    if (key.toLowerCase() === expected.toLowerCase()) {
      const nextPos = skipToLetter(pos + 1);
      setPos(nextPos);
      setConsecutiveHints(0);
      finishAt(nextPos, errors, totalHints);
    } else {
      setErrors(e => e + 1);
      setShake(true);
      setTimeout(() => setShake(false), 400);
    }
  }, [done, pos, target, firstPos, errors, hintedRanges, tokens.length, onComplete]);

  function handleHint() {
    if (done) return;
    const newConsec = consecutiveHints + 1;
    const newHints  = totalHints + 1;
    const newErrors = errors + 1;
    setErrors(newErrors);
    setTotalHints(newHints);
    setConsecutiveHints(newConsec);
    if (newHints > 4) onDowngrade?.();

    if (newConsec >= 2) {
      // Reveal rest of current word
      const wb = wordBoundaries.find(b => b.start <= pos && pos <= b.end);
      const revealEnd = wb ? skipToLetter(wb.end) : skipToLetter(pos + 1);
      const newPos = Math.min(revealEnd, target.length);
      setHintedRanges(prev => [...prev, { start: pos, end: newPos }]);
      setPos(newPos);
      setConsecutiveHints(0);
      finishAt(newPos, newErrors, newHints);
    } else {
      // Reveal just the current letter (+ trailing non-letters)
      const nextPos = skipToLetter(pos + 1);
      setHintedRanges(prev => [...prev, { start: pos, end: nextPos }]);
      setPos(nextPos);
      finishAt(nextPos, newErrors, newHints);
    }

    setTimeout(() => inputRef.current?.focus(), 0);
  }

  // Build display segments from target up to pos
  const segments = useMemo(() => {
    const segs = [];
    let i = 0;
    while (i < pos) {
      const hinted = hintedRanges.some(r => i >= r.start && i < r.end);
      let j = i + 1;
      while (j < pos && hintedRanges.some(r => j >= r.start && j < r.end) === hinted) j++;
      segs.push({ text: target.slice(i, j), hinted });
      i = j;
    }
    return segs;
  }, [pos, hintedRanges, target]);

  const remaining = target.slice(pos);

  return (
    <>
      <div className="type-ex-verse" onClick={() => inputRef.current?.focus()}>
        {segments.map((seg, idx) => (
          <span key={idx} className={seg.hinted ? 'type-word-hint' : 'type-typed'}>{seg.text}</span>
        ))}
        {!done && (
          <span className={`type-blank type-blank-active${shake ? ' type-shake' : ''}`} style={{ minWidth: 2 }}>
            <span className="fill-blank-cursor" />
          </span>
        )}
        <span className="type-remaining">{remaining.replace(/[a-zA-Z0-9]/g, '_')}</span>
      </div>

      {!done && (
        <div className="type-ex-controls">
          <div className="type-ex-hint">Type every word — spaces are automatic</div>
          <button className="type-hint-btn" onClick={handleHint}>
            {consecutiveHints >= 1 ? 'Skip word' : 'Hint'}
          </button>
        </div>
      )}

      <input
        ref={inputRef} className="type-hidden-input"
        onKeyDown={handleKey}
        onChange={e => {
          const ch = e.target.value.slice(-1);
          e.target.value = '';
          if (ch) handleKey({ key: ch, preventDefault: () => {} });
        }}
        inputMode="text" autoComplete="off" autoCorrect="off"
        autoCapitalize="off" spellCheck="false" aria-hidden="true"
      />
    </>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

export default function TypeExercise({ verse, version = 'kjv', difficulty = 'easy', onDowngrade, onComplete, onSkip }) {
  const tokens      = useMemo(() => parseTokens(verse[version] || verse.kjv || ''), [verse, version]);
  const blankIndices = useMemo(() => blankIndicesFor(tokens, difficulty), [tokens, difficulty]);
  const [done, setDone]     = useState(false);
  const [result, setResult] = useState(null);

  function handleComplete(r) {
    setResult(r); setDone(true);
    logEvent('exercise_complete', { type: 'type', difficulty, errors: r.errors, total: r.total });
    setTimeout(() => onComplete?.(r), 700);
  }

  return (
    <div className="fill-ex type-ex">
      <div className="fill-ex-header">
        <span className="fill-ex-ref">{verse.reference}</span>
        <span className={`fill-ex-badge fill-ex-badge-${difficulty}`}>{DIFFICULTY_LABEL[difficulty]}</span>
      </div>
      <div className="fill-ex-progress">
        <div className="fill-ex-progress-bar" style={{ width: done ? '100%' : undefined }} />
      </div>
      <p className="fill-ex-progress-label">
        {done ? 'Complete!'
          : difficulty === 'hard' ? 'Type the full verse'
          : 'Type the first letter of each hidden word'}
      </p>

      {difficulty === 'hard'
        ? <FullTypeMode tokens={tokens} onDowngrade={onDowngrade} onComplete={handleComplete} />
        : <FirstLetterMode tokens={tokens} blankIndices={blankIndices} difficulty={difficulty} onDowngrade={onDowngrade} onComplete={handleComplete} />
      }

      {done && (
        <div className="fill-done" style={{ marginTop: 20 }}>
          <span className="fill-done-icon"><Icon name="check" size={28} /></span>
          <span className="fill-done-msg">{result?.errors === 0 ? 'Perfect!' : 'Well done!'}</span>
        </div>
      )}

      {onSkip && !done && (
        <button className="ex-skip-btn" onClick={onSkip}>Skip <Icon name="forward" size={18} /></button>
      )}
    </div>
  );
}
