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

function FirstLetterMode({ tokens, blankIndices, difficulty, verseCount = 1, onComplete }) {
  const [activeBi, setActiveBi]         = useState(0);
  const [revealed, setRevealed]         = useState({});  // tokenIndex → 'correct'|'auto'|'hint'
  const [consecutiveErrors, setConsecutiveErrors] = useState(0);
  const [shake, setShake]               = useState(false);
  const [errors, setErrors]             = useState(0);
  const [done, setDone]                 = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  function advance(newRevealed, bi) {
    const next = bi + 1;
    if (next >= blankIndices.length) {
      setDone(true);
      setTimeout(() => onComplete?.({ errors, total: blankIndices.length }), 700);
    } else {
      setActiveBi(next);
      setConsecutiveErrors(0);
    }
    return newRevealed;
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
      advance(nr, activeBi);
    } else {
      const newConsec = consecutiveErrors + 1;
      setErrors(e => e + 1);
      setConsecutiveErrors(newConsec);
      setShake(true);
      setTimeout(() => setShake(false), 400);

      // Auto-reveal after 2 consecutive wrong answers
      if (newConsec >= 2) {
        const nr = { ...revealed, [blankIndices[activeBi]]: 'auto' };
        setRevealed(nr);
        setConsecutiveErrors(0);
        setTimeout(() => advance(nr, activeBi), 600);
      }
    }
  }, [done, activeBi, blankIndices, tokens, revealed, consecutiveErrors, errors, onComplete]);

  function handleHint() {
    if (done || activeBi >= blankIndices.length) return;
    const nr = { ...revealed, [blankIndices[activeBi]]: 'hint' };
    setRevealed(nr);
    setErrors(e => e + 1);
    setConsecutiveErrors(0);
    advance(nr, activeBi);
  }

  const activeTokenIndex = blankIndices[activeBi];
  const targetWord = tokens[activeTokenIndex]?.word ?? '';
  // Show letter prompt: always on easy, on moderate show for first blank or if only 1 verse
  const showLetterHint = difficulty === 'easy' || verseCount <= 1 || activeBi === 0;

  return (
    <>
      <div className="type-ex-verse" onClick={() => inputRef.current?.focus()}>
        {tokens.map((token, i) => {
          const bi = blankIndices.indexOf(i);
          const isBlank = bi !== -1;
          const revealState = revealed[i];
          const isActive = bi === activeBi;

          if (!isBlank) {
            return <span key={i} className="fill-word">{token.raw} </span>;
          }
          if (revealState === 'correct') {
            return <span key={i} className="type-word-revealed">{token.raw} </span>;
          }
          if (revealState === 'auto') {
            return <span key={i} className="type-word-auto">{token.raw} </span>;
          }
          if (revealState === 'hint') {
            return <span key={i} className="type-word-hint">{token.raw} </span>;
          }
          if (isActive) {
            return (
              <span key={i} className={`type-blank type-blank-active${shake ? ' type-shake' : ''}`}>
                <span className="fill-blank-cursor" />
                {token.punct}{' '}
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
            {showLetterHint && targetWord ? (
              <>Type: <strong className="type-hint-letter">{targetWord[0].toUpperCase()}</strong>
              {difficulty === 'moderate' && <span className="type-hint-word">… ({targetWord.length} letters)</span>}</>
            ) : (
              <span>Type the first letter of each hidden word</span>
            )}
          </div>
          <button className="type-hint-btn" onClick={handleHint}>Hint</button>
        </div>
      )}

      <input
        ref={inputRef}
        className="type-hidden-input"
        onKeyDown={handleKey}
        readOnly
        aria-hidden="true"
      />
    </>
  );
}

// ── Hard: type every letter (spaces and punctuation auto-advance) ───────────

function FullTypeMode({ tokens, onComplete }) {
  const target = useMemo(() => tokens.map(t => t.raw).join(' '), [tokens]);

  // Pre-compute which positions require a keypress (letters/digits only)
  const requiredPositions = useMemo(() =>
    [...target].map((ch, i) => ({ ch, i, required: /[a-zA-Z0-9]/.test(ch) })),
  [target]);

  const [pos, setPos]       = useState(0);  // position in target string
  const [shake, setShake]   = useState(false);
  const [errors, setErrors] = useState(0);
  const [done, setDone]     = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  // Auto-advance past spaces and punctuation
  function advancePast(startPos) {
    let p = startPos;
    while (p < target.length && !/[a-zA-Z0-9]/.test(target[p])) p++;
    return p;
  }

  // Start at first required character
  const firstPos = useMemo(() => advancePast(0), [target]);
  useEffect(() => { setPos(firstPos); }, [firstPos]);

  const handleKey = useCallback((e) => {
    if (done) return;
    const key = e.key;
    if (key === 'Backspace') {
      e.preventDefault();
      // Go back to previous required position
      let p = pos - 1;
      while (p > firstPos && !/[a-zA-Z0-9]/.test(target[p])) p--;
      setPos(Math.max(firstPos, p));
      return;
    }
    if (key.length !== 1) return;
    e.preventDefault();

    const expected = target[pos];
    if (key.toLowerCase() === expected.toLowerCase()) {
      const nextPos = advancePast(pos + 1);
      setPos(nextPos);
      if (nextPos >= target.length) {
        setDone(true);
        setTimeout(() => onComplete?.({ errors, total: tokens.length }), 700);
      }
    } else {
      setErrors(e => e + 1);
      setShake(true);
      setTimeout(() => setShake(false), 400);
    }
  }, [done, pos, target, firstPos, errors, tokens.length, onComplete]);

  const typedPart   = target.slice(0, pos);
  const remaining   = target.slice(pos);

  return (
    <>
      <div className="type-ex-verse" onClick={() => inputRef.current?.focus()}>
        <span className="type-typed">{typedPart}</span>
        {!done && (
          <span className={`type-blank type-blank-active${shake ? ' type-shake' : ''}`} style={{ minWidth: 2 }}>
            <span className="fill-blank-cursor" />
          </span>
        )}
        <span className="type-remaining">{remaining.replace(/[a-zA-Z0-9]/g, '_')}</span>
      </div>

      <div className="type-ex-hint">
        {!done && <span>Type every word — spaces and punctuation are added automatically</span>}
      </div>

      <input
        ref={inputRef}
        className="type-hidden-input"
        onKeyDown={handleKey}
        readOnly
        aria-hidden="true"
      />
    </>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

export default function TypeExercise({ verse, difficulty = 'easy', verseCount = 1, onComplete }) {
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
        : <FirstLetterMode tokens={tokens} blankIndices={blankIndices} difficulty={difficulty} verseCount={verseCount} onComplete={handleComplete} />
      }

      {done && (
        <div className="fill-done" style={{ marginTop: 20 }}>
          <span className="fill-done-icon">✓</span>
          <span className="fill-done-msg">
            {result?.errors === 0 ? 'Perfect!' : `Done — ${result?.errors} mistake${result?.errors !== 1 ? 's' : ''}`}
          </span>
        </div>
      )}
    </div>
  );
}
