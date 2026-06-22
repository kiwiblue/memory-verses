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
  const [hintWord, setHintWord] = useState(null); // single word currently shown

  const verseText = verse[version] || '';
  const targetWords = clean(verseText);

  useEffect(() => {
    setInput('');
    setFeedback({ text: '', color: '#aaa' });
    setHintWord(null);
  }, [verse.id, version]);

  function handleChange(e) {
    const val = e.target.value;
    setInput(val);

    // Hide hint once the user has typed the hinted word correctly
    if (hintWord) {
      const typed = clean(val);
      const correctCount = typed.filter((w, i) => w === targetWords[i]).length;
      const hintIndex = targetWords.indexOf(hintWord);
      if (correctCount > hintIndex) setHintWord(null);
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
    const typed = clean(input);
    const correctCount = typed.filter((w, i) => w === targetWords[i]).length;
    const nextIndex = Math.min(correctCount, targetWords.length - 1);
    setHintWord(targetWords[nextIndex] || null);
  }

  const allDone = clean(input).filter((w, i) => w === targetWords[i]).length >= targetWords.length;

  return (
    <div className="ti">
      <input
        type="text"
        placeholder="Type the verse from memory…"
        value={input}
        onChange={handleChange}
      />
      <div className="fb" style={{ color: feedback.color }}>{feedback.text}</div>

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
