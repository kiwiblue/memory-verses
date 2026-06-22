import { useState, useEffect, useRef } from 'react';

const clean = s => s.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);

// Treat trailing punctuation (. , ! ?) as a word terminator
const endsCommitted = s => /[\s.,!?]$/.test(s);

function freshMetrics() {
  return { hintsStart: 0, hintsMid: 0, wrongCommits: 0, startedAt: null, completed: false };
}

export default function TestControls({ verse, version, onReveal, onNext, onPrev, hasPrev, onAttemptEnd }) {
  const [input, setInput]       = useState('');
  const [hintWord, setHintWord] = useState(null);

  const verseText    = verse[version] || '';
  const targetWords  = clean(verseText);
  const typedWords   = clean(input);
  const correctCount = typedWords.filter((w, i) => w === targetWords[i]).length;
  const allDone      = correctCount >= targetWords.length && targetWords.length > 0;
  const progress     = targetWords.length > 0 ? Math.round((correctCount / targetWords.length) * 100) : 0;

  // All tracking state lives in refs so cleanup closures always see fresh values
  const metrics       = useRef(freshMetrics());
  const prevWrongRef  = useRef(0); // tracks last committed-wrong count to detect increases

  // Count currently committed wrong words
  const committed = endsCommitted(input);
  const wrongNow = typedWords.filter((w, i) => {
    const isLast = i === typedWords.length - 1;
    return (!isLast || committed) && w !== targetWords[i];
  }).length;

  // Accumulate wrong commits (don't subtract when user backspaces and fixes)
  if (wrongNow > prevWrongRef.current) {
    metrics.current.wrongCommits += wrongNow - prevWrongRef.current;
  }
  prevWrongRef.current = wrongNow;

  // Reset when verse or translation changes; record abandoned attempt first
  useEffect(() => {
    return () => {
      const m = metrics.current;
      if (m.startedAt && !m.completed && onAttemptEnd) {
        onAttemptEnd({
          ts: m.startedAt, verseId: verse.id, ref: verse.reference, version,
          hintsStart: m.hintsStart, hintsMid: m.hintsMid,
          wrongCommits: m.wrongCommits, completed: false, durationSecs: null,
        });
      }
      metrics.current  = freshMetrics();
      prevWrongRef.current = 0;
    };
  }, [verse.id, version]);

  useEffect(() => {
    setInput('');
    setHintWord(null);
  }, [verse.id, version]);

  // Auto-flip and record completed attempt
  useEffect(() => {
    if (!allDone) return;
    const m = metrics.current;
    if (!m.completed) {
      m.completed = true;
      const durationSecs = m.startedAt ? Math.round((Date.now() - m.startedAt) / 1000) : null;
      onReveal();
      if (onAttemptEnd) onAttemptEnd({
        ts: m.startedAt || Date.now(), verseId: verse.id, ref: verse.reference, version,
        hintsStart: m.hintsStart, hintsMid: m.hintsMid,
        wrongCommits: m.wrongCommits, completed: true, durationSecs,
      });
    }
  }, [allDone]);

  function handleChange(e) {
    const val = e.target.value;
    // Start timer on first character
    if (!metrics.current.startedAt && val.trim()) metrics.current.startedAt = Date.now();
    setInput(val);

    if (hintWord) {
      const typed = clean(val);
      const cnt = typed.filter((w, i) => w === targetWords[i]).length;
      const hintIndex = targetWords.indexOf(hintWord);
      if (cnt > hintIndex) setHintWord(null);
    }
  }

  function handleHint() {
    if (!verseText) return;
    const cnt = clean(input).filter((w, i) => w === targetWords[i]).length;
    // Record whether hint is at the very start or partway through
    if (cnt === 0) metrics.current.hintsStart++;
    else           metrics.current.hintsMid++;
    const nextIndex = Math.min(cnt, targetWords.length - 1);
    setHintWord(targetWords[nextIndex] || null);
  }

  // Word-by-word colour chips shown below the input
  const committed = endsCommitted(input);
  const wordChips = typedWords.map((w, i) => {
    const isLast = i === typedWords.length - 1;
    const isCommitted = !isLast || committed;
    const isCorrect = w === targetWords[i];
    // Green as soon as exact match, red only when committed+wrong, grey otherwise
    const cls = isCorrect ? 'ti-word-ok' : isCommitted ? 'ti-word-err' : 'ti-word-partial';
    return <span key={i} className={cls}>{w}</span>;
  });

  const fbText = allDone ? 'Congratulations!' : progress > 0 ? `${progress}% complete` : '';
  const fbColor = allDone ? '#2d7a52' : '#bbb';

  return (
    <div className="ti">
      <div className="ti-textarea-wrap">
        <textarea
          className="ti-textarea"
          placeholder="Type the verse from memory…"
          value={input}
          onChange={handleChange}
          rows={3}
        />
        {!allDone && verseText && (
          hintWord
            ? <span className="ti-hint-word">{hintWord}</span>
            : <button className="ti-hint-btn" onClick={handleHint}>Hint</button>
        )}
      </div>

      {typedWords.length > 0 && (
        <div className="ti-words">{wordChips}</div>
      )}

      <div className="ti-progress-bar">
        <div className="ti-progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="fb" style={{ color: fbColor }}>{fbText}</div>

      <div className="test-btns">
        <button className="btn btn-sk" onClick={onPrev} disabled={!hasPrev}>← Back</button>
        {allDone
          ? <button className="btn btn-ok" onClick={onNext}>Continue →</button>
          : <button className="btn btn-learn" onClick={onReveal}>Reveal</button>
        }
        <button className="btn btn-sk" onClick={onNext}>Next →</button>
      </div>
    </div>
  );
}
