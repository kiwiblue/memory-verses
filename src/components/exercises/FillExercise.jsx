import { useState, useMemo } from 'react';

// Split verse text into tokens preserving punctuation
function parseTokens(text) {
  return text.split(/\s+/).filter(Boolean).map(raw => {
    const m = raw.match(/^(.*?)([,;:.!?'"]+)?$/);
    return { raw, word: m?.[1] || raw, punct: m?.[2] || '' };
  });
}

function blankIndicesFor(tokens, difficulty) {
  const indices = tokens.map((_, i) => i);
  if (difficulty === 'hard')     return indices;
  if (difficulty === 'moderate') return indices.filter(i => i % 2 === 1);
  return indices.filter(i => (i + 1) % 3 === 0); // every 3rd (positions 2,5,8…)
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildOptions(tokens, blankIndices, activeBi, difficulty) {
  const correctWord = tokens[blankIndices[activeBi]].word;
  const optionCount = difficulty === 'easy' ? 2 : 4;

  // Distractors: other blanked words, deduplicated, excluding the correct word
  const pool = [...new Set(
    blankIndices
      .filter(i => tokens[i].word.toLowerCase() !== correctWord.toLowerCase())
      .map(i => tokens[i].word)
  )];

  const distractors = shuffle(pool).slice(0, optionCount - 1);
  return shuffle([correctWord, ...distractors]);
}

const DIFFICULTY_LABEL = { easy: 'Easy', moderate: 'Moderate', hard: 'Hard' };

export default function FillExercise({ verse, difficulty = 'easy', onComplete }) {
  const tokens = useMemo(() => parseTokens(verse.kjv || verse.text || ''), [verse]);
  const blankIndices = useMemo(() => blankIndicesFor(tokens, difficulty), [tokens, difficulty]);

  const [activeBi, setActiveBi] = useState(0);       // position in blankIndices
  const [filled, setFilled] = useState({});           // tokenIndex → filled word
  const [wrongWord, setWrongWord] = useState(null);   // word that just flashed red
  const [errors, setErrors] = useState(0);
  const [done, setDone] = useState(false);

  const options = useMemo(() => {
    if (done || activeBi >= blankIndices.length) return [];
    return buildOptions(tokens, blankIndices, activeBi, difficulty);
  }, [tokens, blankIndices, activeBi, difficulty, done]);

  function handleOption(word) {
    const correct = tokens[blankIndices[activeBi]].word;
    if (word.toLowerCase() === correct.toLowerCase()) {
      const newFilled = { ...filled, [blankIndices[activeBi]]: word };
      setFilled(newFilled);
      const next = activeBi + 1;
      if (next >= blankIndices.length) {
        setDone(true);
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

  const currentBlankNum = Math.min(activeBi + 1, blankIndices.length);

  return (
    <div className="fill-ex">
      {/* Header */}
      <div className="fill-ex-header">
        <span className="fill-ex-ref">{verse.reference}</span>
        <span className={`fill-ex-badge fill-ex-badge-${difficulty}`}>{DIFFICULTY_LABEL[difficulty]}</span>
      </div>

      {/* Progress */}
      <div className="fill-ex-progress">
        <div
          className="fill-ex-progress-bar"
          style={{ width: `${(Object.keys(filled).length / blankIndices.length) * 100}%` }}
        />
      </div>
      <p className="fill-ex-progress-label">
        {done ? 'Complete!' : `Blank ${currentBlankNum} of ${blankIndices.length}`}
      </p>

      {/* Verse with blanks */}
      <div className="fill-ex-verse">
        {tokens.map((token, i) => {
          const bi = blankIndices.indexOf(i);
          const isBlank = bi !== -1;

          if (!isBlank) {
            return <span key={i} className="fill-word">{token.raw} </span>;
          }

          if (filled[i] !== undefined) {
            return (
              <span key={i} className="fill-blank fill-blank-done">
                {filled[i]}{token.punct}{' '}
              </span>
            );
          }

          const isActive = bi === activeBi;
          return (
            <span
              key={i}
              className={`fill-blank${isActive ? ' fill-blank-active' : ''}`}
              style={{ minWidth: `${Math.max(3, token.word.length) * 0.6}em` }}
            >
              {isActive ? <span className="fill-blank-cursor" /> : null}
              {token.punct}{' '}
            </span>
          );
        })}
      </div>

      {/* Word options */}
      {!done && (
        <div className="fill-options">
          {options.map(word => (
            <button
              key={word}
              className={`fill-option${wrongWord === word ? ' fill-option-wrong' : ''}`}
              onClick={() => handleOption(word)}
            >
              {word}
            </button>
          ))}
        </div>
      )}

      {done && (
        <div className="fill-done">
          <span className="fill-done-icon">✓</span>
          <span className="fill-done-msg">
            {errors === 0 ? 'Perfect!' : `Done — ${errors} mistake${errors !== 1 ? 's' : ''}`}
          </span>
        </div>
      )}
    </div>
  );
}
