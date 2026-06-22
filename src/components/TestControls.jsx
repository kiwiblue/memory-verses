import { useState, useEffect } from 'react';

const clean = s => s.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);

function calcAccuracy(input, target) {
  const tgtWords = clean(target);
  const givWords = clean(input);
  if (givWords.length === 0) return null;
  const hits = givWords.filter((w, j) => w === tgtWords[j]).length;
  return Math.round((hits / Math.max(givWords.length, 1)) * 100);
}

export default function TestControls({ verse, version, onReveal, onNext, onPrev, hasPrev }) {
  const [input, setInput]       = useState('');
  const [feedback, setFeedback] = useState({ text: '', color: '#aaa' });
  const [hintLevel, setHintLevel] = useState(0); // how many words revealed

  const verseText = verse[version] || '';
  const targetWords = clean(verseText);

  // Reset when verse/version changes
  useEffect(() => {
    setInput('');
    setFeedback({ text: '', color: '#aaa' });
    setHintLevel(0);
  }, [verse.id, version]);

  function handleChange(e) {
    const val = e.target.value;
    setInput(val);

    // Auto-advance hint to stay one word ahead of what user has typed correctly
    if (hintLevel > 0 && targetWords.length > 0) {
      const typed = clean(val);
      const correctCount = typed.filter((w, i) => w === targetWords[i]).length;
      const nextNeeded = Math.min(correctCount + 1, targetWords.length);
      if (nextNeeded > hintLevel) setHintLevel(nextNeeded);
    }

    if (val.trim().length < 6) {
      setFeedback({ text: '', color: '#aaa' });
      return;
    }
    const pct = calcAccuracy(val, verseText);
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
    // On first press, start from position after correctly-typed words
    if (hintLevel === 0) {
      const typed = clean(input);
      const correctCount = typed.filter((w, i) => w === targetWords[i]).length;
      setHintLevel(Math.max(1, correctCount + 1));
    } else {
      setHintLevel(h => Math.min(h + 1, targetWords.length));
    }
  }

  const hintWords = hintLevel > 0 ? targetWords.slice(0, hintLevel).join(' ') : null;
  const hintExhausted = hintLevel >= targetWords.length;

  return (
    <div className="ti">
      <input
        type="text"
        placeholder="Type the verse from memory…"
        value={input}
        onChange={handleChange}
      />
      <div className="fb" style={{ color: feedback.color }}>{feedback.text}</div>

      {/* Hint */}
      <div className="hint-row">
        {hintWords && (
          <div className="hint-text">{hintWords}…</div>
        )}
        {!hintExhausted && verseText && (
          <button className="hint-btn" onClick={handleHint}>
            {hintLevel === 0 ? 'Hint' : 'Next word'}
          </button>
        )}
      </div>

      <div className="test-btns">
        <button className="btn btn-sk" onClick={onPrev} disabled={!hasPrev}>← Back</button>
        <button className="btn btn-learn" onClick={onReveal}>Reveal</button>
        <button className="btn btn-sk" onClick={onNext}>Next →</button>
      </div>
    </div>
  );
}
