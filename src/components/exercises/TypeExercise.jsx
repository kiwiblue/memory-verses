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
  return tokens.map((_, i) => i).filter(i => i % 2 === 1); // every 2nd word
}

const DIFFICULTY_LABEL = { easy: 'Easy', moderate: 'Moderate', hard: 'Hard' };

// ── Easy / Moderate mode: type first letter of each hidden word ─────────────

function FirstLetterMode({ tokens, blankIndices, difficulty, onComplete }) {
  const [activeBi, setActiveBi] = useState(0);
  const [revealed, setRevealed] = useState({});   // tokenIndex → true
  const [shake, setShake] = useState(false);
  const [errors, setErrors] = useState(0);
  const [done, setDone] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleKey = useCallback((e) => {
    if (done || activeBi >= blankIndices.length) return;
    const key = e.key;
    if (key.length !== 1) return; // ignore modifier keys
    e.preventDefault();

    const targetWord = tokens[blankIndices[activeBi]].word;
    if (key.toLowerCase() === targetWord[0].toLowerCase()) {
      const newRevealed = { ...revealed, [blankIndices[activeBi]]: true };
      setRevealed(newRevealed);
      const next = activeBi + 1;
      if (next >= blankIndices.length) {
        setDone(true);
        setTimeout(() => onComplete?.({ errors, total: blankIndices.length }), 700);
      } else {
        setActiveBi(next);
      }
    } else {
      setErrors(e => e + 1);
      setShake(true);
      setTimeout(() => setShake(false), 400);
    }
  }, [done, activeBi, blankIndices, tokens, revealed, errors, onComplete]);

  const activeTokenIndex = blankIndices[activeBi];

  return (
    <>
      <div className="type-ex-verse" onClick={() => inputRef.current?.focus()}>
        {tokens.map((token, i) => {
          const bi = blankIndices.indexOf(i);
          const isBlank = bi !== -1;
          const isRevealed = revealed[i];
          const isActive = bi === activeBi;

          if (!isBlank) {
            return <span key={i} className="fill-word">{token.raw} </span>;
          }
          if (isRevealed) {
            return <span key={i} className="type-word-revealed">{token.raw} </span>;
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

      <div className="type-ex-hint">
        {!done && (
          <span>Type the first letter: <strong className="type-hint-letter">
            {tokens[activeTokenIndex]?.word[0]?.toUpperCase() ?? ''}
          </strong></span>
        )}
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

// ── Hard mode: type every character ────────────────────────────────────────

function FullTypeMode({ tokens, onComplete }) {
  // Build the full target string with single spaces
  const target = useMemo(() => tokens.map(t => t.raw).join(' '), [tokens]);

  const [typed, setTyped] = useState('');
  const [shake, setShake] = useState(false);
  const [errors, setErrors] = useState(0);
  const [done, setDone] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleKey = useCallback((e) => {
    if (done) return;
    const key = e.key;

    if (key === 'Backspace') {
      e.preventDefault();
      setTyped(t => t.slice(0, -1));
      return;
    }
    if (key.length !== 1) return;
    e.preventDefault();

    const pos = typed.length;
    const expected = target[pos];

    if (key === expected) {
      const newTyped = typed + key;
      setTyped(newTyped);
      if (newTyped.length >= target.length) {
        setDone(true);
        setTimeout(() => onComplete?.({ errors, total: target.split(' ').length }), 700);
      }
    } else {
      setErrors(e => e + 1);
      setShake(true);
      setTimeout(() => setShake(false), 400);
    }
  }, [done, typed, target, errors, onComplete]);

  // Render target split into typed (revealed), current char (cursor), remaining (hidden)
  const typedPart   = target.slice(0, typed.length);
  const remaining   = target.slice(typed.length);

  return (
    <>
      <div className="type-ex-verse" onClick={() => inputRef.current?.focus()}>
        <span className="type-typed">{typedPart}</span>
        {!done && (
          <span className={`type-blank type-blank-active${shake ? ' type-shake' : ''}`} style={{ minWidth: 2 }}>
            <span className="fill-blank-cursor" />
          </span>
        )}
        <span className="type-remaining">{remaining.replace(/[^\s]/g, '_')}</span>
      </div>

      <div className="type-ex-hint">
        {!done && <span>Type every letter — backspace to correct</span>}
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

export default function TypeExercise({ verse, difficulty = 'easy', onComplete }) {
  const tokens = useMemo(() => parseTokens(verse.kjv || verse.text || ''), [verse]);
  const blankIndices = useMemo(() => blankIndicesFor(tokens, difficulty), [tokens, difficulty]);

  const [done, setDone] = useState(false);
  const [result, setResult] = useState(null);

  function handleComplete(r) {
    setResult(r);
    setDone(true);
    setTimeout(() => onComplete?.(r), 700);
  }

  const progress = result
    ? 1
    : 0; // individual modes track their own progress; parent can override

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
        {done ? 'Complete!' : difficulty === 'hard' ? 'Type the full verse' : 'Type the first letter of each hidden word'}
      </p>

      {difficulty === 'hard'
        ? <FullTypeMode tokens={tokens} onComplete={handleComplete} />
        : <FirstLetterMode tokens={tokens} blankIndices={blankIndices} difficulty={difficulty} onComplete={handleComplete} />
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
