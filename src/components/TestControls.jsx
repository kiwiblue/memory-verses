import { useState, useEffect } from 'react';

const clean = s => s.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);

export default function TestControls({ verse, version, onReveal, onNext, onPrev, hasPrev }) {
  const [input, setInput]       = useState('');
  const [feedback, setFeedback] = useState({ text: '', color: '#aaa' });
  const [hintWord, setHintWord] = useState(null);

  const verseText = verse[version] || '';
  const targetWords = clean(verseText);

  useEffect(() => {
    setInput('');
    setFeedback({ text: '', color: '#aaa' });
    setHintWord(null);
  }, [verse.id, version]);

  const typedWords = clean(input);
  const correctCount = typedWords.filter((w, i) => w === targetWords[i]).length;
  const allDone = correctCount >= targetWords.length && targetWords.length > 0;
  const progress = targetWords.length > 0 ? Math.round((correctCount / targetWords.length) * 100) : 0;

  function handleChange(e) {
    const val = e.target.value;
    setInput(val);

    if (hintWord) {
      const typed = clean(val);
      const cnt = typed.filter((w, i) => w === targetWords[i]).length;
      const hintIndex = targetWords.indexOf(hintWord);
      if (cnt > hintIndex) setHintWord(null);
    }

    if (val.trim().length < 6) {
      setFeedback({ text: '', color: '#aaa' });
      return;
    }
    const tgt = clean(verseText);
    const given = clean(val);
    const hits = given.filter((w, j) => w === tgt[j]).length;
    const pct = Math.round((hits / Math.max(given.length, 1)) * 100);
    if (pct >= 85) {
      setFeedback({ text: `${pct}% — excellent!`, color: '#2d7a52' });
    } else if (pct >= 60) {
      setFeedback({ text: `${pct}% — keep going`, color: '#9a6c10' });
    } else {
      setFeedback({ text: `${pct}% — try again`, color: '#888' });
    }
  }

  function handleHint() {
    if (!verseText) return;
    const typed = clean(input);
    const cnt = typed.filter((w, i) => w === targetWords[i]).length;
    const nextIndex = Math.min(cnt, targetWords.length - 1);
    setHintWord(targetWords[nextIndex] || null);
  }

  // Word-by-word colour chips shown below the input
  const inputEndsWithSpace = /\s$/.test(input);
  const wordChips = typedWords.map((w, i) => {
    const isLast = i === typedWords.length - 1;
    const committed = !isLast || inputEndsWithSpace;
    const isCorrect = w === targetWords[i];
    const cls = !committed ? 'ti-word-partial' : isCorrect ? 'ti-word-ok' : 'ti-word-err';
    return <span key={i} className={cls}>{w}</span>;
  });

  return (
    <div className="ti">
      <textarea
        className="ti-textarea"
        placeholder="Type the verse from memory…"
        value={input}
        onChange={handleChange}
        rows={3}
      />

      {typedWords.length > 0 && (
        <div className="ti-words">{wordChips}</div>
      )}

      <div className="ti-progress-bar">
        <div className="ti-progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="fb" style={{ color: feedback.color }}>{feedback.text || (allDone ? '✓ Complete!' : '')}</div>

      <div className="hint-row">
        {hintWord
          ? <div className="hint-text">Next word: <strong>{hintWord}</strong></div>
          : !allDone && verseText && (
              <button className="hint-btn" onClick={handleHint}>Hint</button>
            )
        }
      </div>

      <div className="test-btns">
        <button className="btn btn-sk" onClick={onPrev} disabled={!hasPrev}>← Back</button>
        <button className="btn btn-learn" onClick={onReveal}>Reveal</button>
        <button className="btn btn-sk" onClick={onNext}>Next →</button>
      </div>
    </div>
  );
}
