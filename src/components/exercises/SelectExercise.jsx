import { useState, useMemo } from 'react';
import { logEvent } from '../../data/telemetry.js';

function parseTokens(text) {
  return text.split(/\s+/).filter(Boolean).map(raw => {
    const m = raw.match(/^(.*?)([,;:.!?'"]+)?$/);
    return { raw, word: m?.[1] || raw, punct: m?.[2] || '' };
  });
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function blankIndicesFor(tokens, difficulty) {
  const sentenceStarters = new Set([0]);
  tokens.forEach((token, i) => {
    if (/[.!?]$/.test(token.punct) && i + 1 < tokens.length) sentenceStarters.add(i + 1);
  });
  const eligible = tokens.map((_, i) => i).filter(i => !sentenceStarters.has(i));
  const ratio = difficulty === 'hard' ? 0.65 : difficulty === 'moderate' ? 0.45 : 0.3;
  const count = Math.max(1, Math.round(eligible.length * ratio));
  const picked = new Set(shuffle(eligible).slice(0, count));
  const sorted = [...picked].sort((a, b) => a - b);
  for (let i = 2; i < sorted.length; i++) {
    if (sorted[i] === sorted[i - 1] + 1 && sorted[i - 1] === sorted[i - 2] + 1) {
      picked.delete(sorted[i]);
    }
  }
  return [...picked].sort((a, b) => a - b);
}

function buildOptions(tokens, blankIndices, activeBi) {
  const correctWord = tokens[blankIndices[activeBi]].word;
  const pool = [...new Set(
    tokens
      .map(t => t.word)
      .filter(w => w.toLowerCase() !== correctWord.toLowerCase() && w.length > 1)
  )];
  const distractors = shuffle(pool).slice(0, 2);
  return shuffle([correctWord, ...distractors]);
}

export default function SelectExercise({ verse, version = 'kjv', difficulty = 'easy', onComplete, onSkip }) {
  const verseText = verse[version] || verse.kjv || '';
  const tokens = useMemo(() => parseTokens(verseText), [verseText]);
  const [blankIndices] = useState(() => blankIndicesFor(tokens, difficulty));

  const [activeBi, setActiveBi] = useState(0);
  const [filled, setFilled]     = useState({});
  const [errors, setErrors]     = useState(0);
  const [wrongWord, setWrongWord] = useState(null);
  const [hintWord, setHintWord]   = useState(null);
  const [done, setDone]           = useState(false);

  const options = useMemo(() => {
    if (done || activeBi >= blankIndices.length) return [];
    return buildOptions(tokens, blankIndices, activeBi);
  }, [tokens, blankIndices, activeBi, done]);

  const currentCorrect = !done && blankIndices[activeBi] != null
    ? tokens[blankIndices[activeBi]].word : null;
  const firstLetter = currentCorrect ? currentCorrect[0].toUpperCase() : null;

  function handleOption(word) {
    if (done) return;
    const correct = tokens[blankIndices[activeBi]].word;
    if (word.toLowerCase() === correct.toLowerCase()) {
      const newFilled = { ...filled, [blankIndices[activeBi]]: word };
      setFilled(newFilled);
      setHintWord(null);
      const next = activeBi + 1;
      if (next >= blankIndices.length) {
        setDone(true);
        logEvent('exercise_complete', { type: 'select', difficulty, errors });
        setTimeout(() => onComplete?.({ errors, total: blankIndices.length }), 700);
      } else {
        setActiveBi(next);
      }
    } else {
      setErrors(e => e + 1);
      setWrongWord(word);
      setTimeout(() => setWrongWord(null), 380);
    }
  }

  function handleHint() {
    setHintWord(currentCorrect);
    setErrors(e => e + 1);
  }

  return (
    <div className="se-wrap">
      {/* Instruction */}
      <p className="se-instruction">Select the correct word below</p>

      {/* Verse text with blanks */}
      <div className="se-verse">
        {tokens.map((token, i) => {
          const bi = blankIndices.indexOf(i);
          const isBlank = bi !== -1;
          if (!isBlank) return <span key={i} className="se-word">{token.raw} </span>;
          if (filled[i] !== undefined) {
            return (
              <span key={i} className="se-blank se-blank-done">
                {filled[i]}{token.punct}{' '}
              </span>
            );
          }
          const isActive = bi === activeBi;
          return (
            <span
              key={i}
              className={`se-blank${isActive ? ' se-blank-active' : ''}`}
              style={{ minWidth: `${Math.max(3, token.word.length) * 0.62}em` }}
            >
              {isActive && hintWord ? hintWord : ''}
              {token.punct}{' '}
            </span>
          );
        })}
      </div>

      {/* Type hint + controls */}
      {!done && (
        <div className="se-controls">
          <span className="se-type-hint">
            Type: <strong>{firstLetter}</strong>
          </span>
          <div className="se-ctrl-btns">
            <button className="se-ctrl-btn" onClick={handleHint} disabled={!!hintWord}>
              Hint
            </button>
            <button className="se-ctrl-btn" onClick={onSkip}>
              Skip &gt;
            </button>
          </div>
        </div>
      )}

      {/* Word bank */}
      {!done && (
        <div className="se-options">
          {options.map((word, idx) => (
            <button
              key={word + idx}
              className={`se-option${wrongWord === word ? ' se-option-wrong' : ''}`}
              onClick={() => handleOption(word)}
            >
              {word}
            </button>
          ))}
        </div>
      )}

      {done && (
        <div className="se-done">
          <span className="se-done-icon">✓</span>
          <span className="se-done-msg">{errors === 0 ? 'Perfect!' : `Done! ${errors} error${errors !== 1 ? 's' : ''}`}</span>
        </div>
      )}
    </div>
  );
}
