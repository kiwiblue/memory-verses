import { useState, useMemo } from 'react';
import Icon from '../Icon.jsx';
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
  if (difficulty === 'hard') return tokens.map((_, i) => i);

  // Sentence starters should never be blanked (position 0, or word after sentence-ending punct)
  const sentenceStarters = new Set([0]);
  tokens.forEach((token, i) => {
    if (/[.!?]$/.test(token.punct) && i + 1 < tokens.length) sentenceStarters.add(i + 1);
  });

  const eligible = tokens.map((_, i) => i).filter(i => !sentenceStarters.has(i));
  const ratio = difficulty === 'moderate' ? 0.5 : 0.34;
  const count = Math.max(1, Math.round(eligible.length * ratio));
  const picked = new Set(shuffle(eligible).slice(0, count));

  // Remove any index that would make a third consecutive blank
  const sorted = [...picked].sort((a, b) => a - b);
  for (let i = 2; i < sorted.length; i++) {
    if (sorted[i] === sorted[i - 1] + 1 && sorted[i - 1] === sorted[i - 2] + 1) {
      picked.delete(sorted[i]);
    }
  }
  return [...picked].sort((a, b) => a - b);
}

function buildOptions(tokens, blankIndices, activeBi, difficulty) {
  const correctWord = tokens[blankIndices[activeBi]].word;
  const optionCount = difficulty === 'easy' ? 2 : 4;

  const pool = [...new Set(
    blankIndices
      .filter(i => tokens[i].word.toLowerCase() !== correctWord.toLowerCase())
      .map(i => tokens[i].word)
  )];

  const distractors = shuffle(pool).slice(0, optionCount - 1);
  return shuffle([correctWord, ...distractors]);
}

const DIFFICULTY_LABEL = { easy: 'Easy', moderate: 'Moderate', hard: 'Hard' };

export default function FillExercise({ verse, version = 'kjv', difficulty = 'easy', onComplete }) {
  const tokens = useMemo(() => parseTokens(verse[version] || verse.kjv || ''), [verse, version]);
  // useState initializer so blanks are randomised once per mount, not on every render
  const [blankIndices] = useState(() => blankIndicesFor(tokens, difficulty));

  const [activeBi, setActiveBi] = useState(0);
  const [filled, setFilled]     = useState({});
  const [wrongWord, setWrongWord] = useState(null);
  const [errors, setErrors]     = useState(0);
  const [done, setDone]         = useState(false);

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
        logEvent('exercise_complete', { type: 'fill', difficulty, errors, total: blankIndices.length });
        setTimeout(() => onComplete?.({ errors, total: blankIndices.length, hints: 0 }), 700);
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
      <div className="fill-ex-header">
        <span className="fill-ex-ref">{verse.reference}</span>
        <span className={`fill-ex-badge fill-ex-badge-${difficulty}`}>{DIFFICULTY_LABEL[difficulty]}</span>
      </div>

      <div className="fill-ex-progress">
        <div
          className="fill-ex-progress-bar"
          style={{ width: `${(Object.keys(filled).length / blankIndices.length) * 100}%` }}
        />
      </div>
      <p className="fill-ex-progress-label">
        {done ? 'Complete!' : `Blank ${currentBlankNum} of ${blankIndices.length}`}
      </p>

      <div className="fill-ex-verse">
        {tokens.map((token, i) => {
          const bi = blankIndices.indexOf(i);
          const isBlank = bi !== -1;

          if (!isBlank) return <span key={i} className="fill-word">{token.raw} </span>;

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
              {token.punct}{' '}
            </span>
          );
        })}
      </div>

      {!done && (
        <div className="fill-options">
          {options.map((word, idx) => (
            <button
              key={word}
              className={`fill-option fill-option-intro${wrongWord === word ? ' fill-option-wrong' : ''}`}
              style={{ animationDelay: `${idx * 0.12}s` }}
              onClick={() => handleOption(word)}
            >
              {word}
            </button>
          ))}
        </div>
      )}

      {done && (
        <div className="fill-done">
          <span className="fill-done-icon"><Icon name="check" size={28} /></span>
          <span className="fill-done-msg">{errors === 0 ? 'Perfect!' : 'Well done!'}</span>
        </div>
      )}
    </div>
  );
}
