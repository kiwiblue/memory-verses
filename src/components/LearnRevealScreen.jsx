import { useState, useMemo } from 'react';
import OverlayHeader from './OverlayHeader.jsx';

function splitChunks(text) {
  if (!text) return [];
  const chunks = [];
  // Split after comma, period, colon, semicolon, exclamation, question mark, or newline
  const re = /[^,.:;!?\n]+[,.:;!?\n]?/g;
  let match;
  while ((match = re.exec(text)) !== null) {
    const chunk = match[0].trim();
    if (chunk) chunks.push(chunk);
  }
  return chunks;
}

export default function LearnRevealScreen({
  verse,
  version,
  user,
  onComplete,   // () => void — called when done (moves verse to learning)
  onClose,      // () => void — back without completing
}) {
  const [revealCount, setRevealCount] = useState(0);
  const [testMode, setTestMode] = useState(false);

  const verseText = verse?.[version] || verse?.kjv || '';
  const chunks = useMemo(() => splitChunks(verseText), [verseText]);
  const allRevealed = revealCount >= chunks.length;

  function handleRevealNext() {
    if (!allRevealed) setRevealCount(c => c + 1);
  }

  function handleRestart() {
    setRevealCount(0);
    setTestMode(false);
  }

  function handleTest() {
    setTestMode(true);
  }

  function handleTestTap() {
    // Tap in test mode → restart from beginning
    handleRestart();
  }

  if (!verse) return null;

  const header = (
    <div className="lr-panel">
      <OverlayHeader onBack={onClose} user={user} />
    </div>
  );

  // ── TEST mode ────────────────────────────────────────────────────────────
  if (testMode) {
    return (
      <div className="lr-overlay">
        {header}
        <div className="lr-sheet">
          <div className="lr-sheet-inner">
            <button className="lr-test-area" onClick={handleTestTap}>
              <div className="lr-test-instruction">Recite the full verse</div>
              <div className="lr-test-ref">{verse.reference}</div>
              <div className="lr-test-hint">tap to restart</div>
            </button>
            <div className="lr-actions lr-actions-sticky">
              <button className="ob-btn-primary lr-done-btn" onClick={onComplete}>
                Done — I know it ✓
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── REVEAL mode ──────────────────────────────────────────────────────────
  return (
    <div className="lr-overlay">
      {header}
      <div className="lr-sheet">
        <div className="lr-sheet-inner">

          <div className="lr-instructions">
            <p className="lr-instr-title">Reveal</p>
            <p className="lr-instr-main">
              Learn each section of the verse until you can recite the whole verse without looking.
            </p>
            <p className="lr-instr-sub">
              <strong>Read out loud</strong> — for best retention, try to say it aloud.
            </p>
          </div>

          <div className="lr-verse-area">
            <span className="lr-verse-ref">{verse.reference} </span>
            {revealCount === 0 && (
              <span className="lr-verse-prompt">tap "Reveal Next" to begin</span>
            )}
            {chunks.slice(0, revealCount).map((chunk, i) => (
              <span
                key={i}
                className={`lr-chunk${i === revealCount - 1 ? ' lr-chunk-new' : ''}`}
              >
                {chunk}{' '}
              </span>
            ))}
          </div>

          <div className="lr-actions lr-actions-sticky">
            {!allRevealed ? (
              <button className="ob-btn-primary lr-reveal-btn" onClick={handleRevealNext}>
                Reveal Next →
              </button>
            ) : (
              <>
                <button className="lr-test-btn" onClick={handleTest}>TEST</button>
                <button className="lr-restart-btn" onClick={handleRestart}>Restart</button>
              </>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
