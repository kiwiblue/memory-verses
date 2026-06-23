import { useState, useMemo, useRef, useEffect, useCallback } from 'react';

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

function FirstLetterMode({ tokens, blankIndices, difficulty, onComplete }) {
  const [activeBi, setActiveBi]               = useState(0);
  const [revealed, setRevealed]               = useState({});  // tokenIndex → 'correct'|'auto'|'hint'
  const [consecutiveErrors, setConsecutiveErrors] = useState(0);
  const [shake, setShake]                     = useState(false);
  const [errors, setErrors]                   = useState(0);
  const [done, setDone]                       = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  function advance(newRevealed, bi, errCount) {
    const next = bi + 1;
    if (next >= blankIndices.length) {
      setDone(true);
      setTimeout(() => onComplete?.({ errors: errCount, total: blankIndices.length }), 700);
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
      advance(nr, activeBi, errors);
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
        setTimeout(() => advance(nr, activeBi, newErrors), 600);
      }
    }
  }, [done, activeBi, blankIndices, tokens, revealed, consecutiveErrors, errors, onComplete]);

  function handleHint() {
    if (done || activeBi >= blankIndices.length) return;
    const newErrors = errors + 1;
    setErrors(newErrors);
    const nr = { ...revealed, [blankIndices[activeBi]]: 'hint' };
    setRevealed(nr);
    setConsecutiveErrors(0);
    advance(nr, activeBi, newErrors);
  }

  const activeTokenIndex = blankIndices[activeBi];
  const targetWord = tokens[activeTokenIndex]?.word ?? '';
  // Show letter prompt on first blank always; after that only when 2 consecutive errors
  const showLetterHint = activeBi === 0 || consecutiveErrors >= 2;

  return (
    <>
      <div className="type-ex-verse" onClick={() => inputRef.current?.focus()}>
        {tokens.map((token, i) => {
          const bi = blankIndices.indexOf(i);
          const isBlank = bi !== -1;
          const revealState = revealed[i];
          const isActive = bi === activeBi;

          if (!isBlank) return <span key={i} className="fill-word">{token.raw} </span>;
          if (revealState === 'correct') return <span key={i} className="type-word-revealed">{token.raw} </span>;
          if (revealState === 'auto')    return <span key={i} className="type-word-auto">{token.raw} </span>;
          if (revealState === 'hint')    return <span key={i} className="type-word-hint">{token.raw} </span>;
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

      <input ref={inputRef} className="type-hidden-input" onKeyDown={handleKey} readOnly aria-hidden="true" />
    </>
  );
}

// ── Hard: type every letter; spaces ignored; two-level hint ────────────────

function FullTypeMode({ tokens, onComplete }) {
  const target = useMemo(() => tokens.map(t => t.raw).join(' '), [tokens]);

  // Find word boundaries so hint can reveal a whole word
  const wordBoundaries = useMemo(() => {
    const bounds = [];
    let i = 0;
    for (const token of tokens) {
      bounds.push({ start: i, end: i + token.word.length });
      i += token.raw.length + 1; // +1 for space
    }
    return bounds;
  }, [tokens, target]);

  function skipToLetterAt(startPos) {
    let p = startPos;
    while (p < target.length && !/[a-zA-Z0-9]/.test(target[p])) p++;
    return p;
  }

  const firstPos = useMemo(() => skipToLetterAt(0), [target]);

  const [pos, setPos]           = useState(firstPos);
  const [shake, setShake]       = useState(false);
  const [errors, setErrors]     = useState(0);
  const [done, setDone]         = useState(false);
  const [hintLevel, setHintLevel] = useState(0); // 0=none, 1=show letter, 2=reveal word
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => { setPos(firstPos); }, [firstPos]);

  const handleKey = useCallback((e) => {
    if (done) return;
    const key = e.key;

    if (key === ' ') { e.preventDefault(); return; } // silently ignore spaces
    if (key === 'Backspace') {
      e.preventDefault();
      let p = pos - 1;
      while (p > firstPos && !/[a-zA-Z0-9]/.test(target[p])) p--;
      setPos(Math.max(firstPos, p));
      setHintLevel(0);
      return;
    }
    if (key.length !== 1) return;
    e.preventDefault();

    const expected = target[pos];
    if (key.toLowerCase() === expected.toLowerCase()) {
      const next = skipToLetterAt(pos + 1);
      setPos(next);
      setHintLevel(0);
      if (next >= target.length) {
        setDone(true);
        setTimeout(() => onComplete?.({ errors, total: tokens.length }), 700);
      }
    } else {
      setErrors(e => e + 1);
      setShake(true);
      setTimeout(() => setShake(false), 400);
    }
  }, [done, pos, target, firstPos, errors, tokens.length, onComplete]);

  function handleHint() {
    if (done) return;
    if (hintLevel === 0) {
      // Level 1: show the current expected letter
      setHintLevel(1);
      setErrors(e => e + 1);
    } else {
      // Level 2: skip to end of current word
      const wb = wordBoundaries.find(b => b.start <= pos && pos < b.end);
      const skipTo = wb ? skipToLetterAt(wb.end) : skipToLetterAt(pos + 1);
      setPos(skipTo >= target.length ? target.length : skipTo);
      setHintLevel(0);
      setErrors(e => e + 1);
      if (skipTo >= target.length) {
        setDone(true);
        setTimeout(() => onComplete?.({ errors: errors + 1, total: tokens.length }), 700);
      }
    }
  }

  const currentExpected = target[pos] ?? '';
  const typedPart = target.slice(0, pos);
  const remaining = target.slice(pos);

  return (
    <>
      <div className="type-ex-verse" onClick={() => inputRef.current?.focus()}>
        <span className="type-typed">{typedPart}</span>
        {!done && (
          <span className={`type-blank type-blank-active${shake ? ' type-shake' : ''}`} style={{ minWidth: 2 }}>
            {hintLevel >= 1
              ? <span className="type-hint-inline">{currentExpected.toUpperCase()}</span>
              : <span className="fill-blank-cursor" />
            }
          </span>
        )}
        <span className="type-remaining">{remaining.replace(/[a-zA-Z0-9]/g, '_')}</span>
      </div>

      {!done && (
        <div className="type-ex-controls">
          <div className="type-ex-hint">
            Type every word — spaces are automatic
          </div>
          <button className="type-hint-btn" onClick={handleHint}>
            {hintLevel === 1 ? 'Skip word' : 'Hint'}
          </button>
        </div>
      )}

      <input ref={inputRef} className="type-hidden-input" onKeyDown={handleKey} readOnly aria-hidden="true" />
    </>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

export default function TypeExercise({ verse, difficulty = 'easy', onComplete }) {
  const tokens = useMemo(() => parseTokens(verse.kjv || verse.text || ''), [verse]);
  const blankIndices = useMemo(() => blankIndicesFor(tokens, difficulty), [tokens, difficulty]);

  const [done, setDone]     = useState(false);
  const [result, setResult] = useState(null);

  function handleComplete(r) {
    setResult(r);
    setDone(true);
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
        {done
          ? 'Complete!'
          : difficulty === 'hard'
            ? 'Type the full verse'
            : 'Type the first letter of each hidden word'}
      </p>

      {difficulty === 'hard'
        ? <FullTypeMode tokens={tokens} onComplete={handleComplete} />
        : <FirstLetterMode tokens={tokens} blankIndices={blankIndices} difficulty={difficulty} onComplete={handleComplete} />
      }

      {done && (
        <div className="fill-done" style={{ marginTop: 20 }}>
          <span className="fill-done-icon">✓</span>
          <span className="fill-done-msg">
            {result?.errors === 0 ? 'Perfect!' : 'Well done!'}
          </span>
        </div>
      )}
    </div>
  );
}
