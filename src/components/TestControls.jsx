import { useState, useEffect } from 'react';

function calcAccuracy(input, target) {
  const clean = s => s.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);
  const tgtWords = clean(target);
  const givWords = clean(input);
  if (givWords.length === 0) return null;
  const hits = givWords.filter((w, j) => w === tgtWords[j]).length;
  return Math.round((hits / Math.max(givWords.length, 1)) * 100);
}

export default function TestControls({ verse, version, onReveal, onNext, onPrev, hasPrev }) {
  const [input, setInput] = useState('');
  const [feedback, setFeedback] = useState({ text: '', color: '#aaa' });

  // Reset when verse/version changes
  useEffect(() => {
    setInput('');
    setFeedback({ text: '', color: '#aaa' });
  }, [verse.id, version]);

  function handleChange(e) {
    const val = e.target.value;
    setInput(val);
    if (val.trim().length < 6) {
      setFeedback({ text: '', color: '#aaa' });
      return;
    }
    const pct = calcAccuracy(val, verse[version]);
    if (pct >= 85) {
      setFeedback({ text: `${pct}% — excellent!`, color: '#2d7a52' });
    } else if (pct >= 60) {
      setFeedback({ text: `${pct}% — keep going`, color: '#9a6c10' });
    } else {
      setFeedback({ text: `${pct}% — try again`, color: '#888' });
    }
  }

  return (
    <div className="ti">
      <input
        type="text"
        placeholder="Type the verse from memory…"
        value={input}
        onChange={handleChange}
      />
      <div className="fb" style={{ color: feedback.color }}>{feedback.text}</div>
      <div className="test-btns">
        <button className="btn btn-sk" onClick={onPrev} disabled={!hasPrev}>← Back</button>
        <button className="btn btn-learn" onClick={onReveal}>Reveal</button>
        <button className="btn btn-sk" onClick={onNext}>Next →</button>
      </div>
    </div>
  );
}
