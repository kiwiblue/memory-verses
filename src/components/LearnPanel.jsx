import { useState, useEffect } from 'react';
import FlipCard from './FlipCard.jsx';
import FillExercise from './exercises/FillExercise.jsx';
import TypeExercise from './exercises/TypeExercise.jsx';

// step: 'card' | 'fill' | 'type' | 'checkup'

export default function LearnPanel({
  verse,
  version,
  defaultVersion,
  verseTranslations,
  onVerseTranslationChange,
  onGotItForNow,
  onNext,
  onDowngrade,
  onRemove,
  onLearnNewVerse,
}) {
  const [step, setStep]       = useState('card');
  const [isFlipped, setIsFlipped] = useState(false);
  const [wobble, setWobble]   = useState(false);
  const [removeArmed, setRemoveArmed] = useState(false);

  // Reset flow when the verse changes
  useEffect(() => {
    setStep('card');
    setIsFlipped(false);
    setWobble(false);
    setRemoveArmed(false);
  }, [verse?.id]);

  // Nudge the card after 4 s if user hasn't flipped yet
  useEffect(() => {
    if (step !== 'card' || isFlipped) return;
    const t = setTimeout(() => { setWobble(true); setTimeout(() => setWobble(false), 800); }, 4000);
    return () => clearTimeout(t);
  }, [step, isFlipped, verse?.id]);

  if (!verse) return null;

  // ── Card view ─────────────────────────────────────────────────────────────
  if (step === 'card') {
    return (
      <div className="learn-panel">
        <div className={wobble ? 'card-wobble-wrap' : ''}>
          <FlipCard
            verse={verse}
            version={version}
            defaultVersion={defaultVersion}
            verseTranslations={verseTranslations}
            isFlipped={isFlipped}
            mode="learn"
            onFlip={() => setIsFlipped(f => !f)}
            onVerseTranslationChange={onVerseTranslationChange}
          />
        </div>

        <p className="learn-hint">
          {isFlipped
            ? 'Read it aloud a few times before starting the exercises.'
            : 'Tap the card to see the verse, then read it aloud a few times.'}
        </p>

        <div className="learn-card-actions">
          <button
            className="ob-btn-primary learn-exercise-btn"
            onClick={() => setStep('fill')}
          >
            Begin Memory Exercise →
          </button>
          <div className="learn-knowit-row">
            <button className="btn btn-ok learn-knowit-btn" onClick={onGotItForNow}>
              I've got it for now →
            </button>
            {onRemove && (
              <button
                className={`learn-remove-btn${removeArmed ? ' learn-remove-armed' : ''}`}
                onClick={() => {
                  if (removeArmed) { onRemove(); setRemoveArmed(false); }
                  else { setRemoveArmed(true); }
                }}
                onBlur={() => setRemoveArmed(false)}
              >
                {removeArmed ? 'Delete' : '✕'}
              </button>
            )}
          </div>
        </div>

        <div className="learn-intro">
          <p className="learn-intro-item">📖 Read the verse aloud to yourself</p>
          <p className="learn-intro-item">✏️ Complete two short exercises</p>
          <p className="learn-intro-item">🔄 Return daily until it sticks</p>
        </div>
      </div>
    );
  }

  // ── FILL exercise ─────────────────────────────────────────────────────────
  if (step === 'fill') {
    return (
      <div className="learn-panel">
        <div className="learn-step-label">Exercise 1 of 2</div>
        <FillExercise
          verse={verse}
          version={version}
          difficulty="easy"
          onComplete={() => setStep('type')}
        />
      </div>
    );
  }

  // ── TYPE exercise ─────────────────────────────────────────────────────────
  if (step === 'type') {
    return (
      <div className="learn-panel">
        <div className="learn-step-label">Exercise 2 of 2</div>
        <TypeExercise
          verse={verse}
          version={version}
          difficulty="easy"
          onDowngrade={onDowngrade}
          onComplete={() => setStep('checkup')}
        />
      </div>
    );
  }

  // ── Check-up ──────────────────────────────────────────────────────────────
  return (
    <div className="learn-panel learn-checkup">
      <div className="learn-checkup-icon">🎉</div>
      <h2 className="learn-checkup-title">How did you go?</h2>
      <p className="learn-checkup-sub">
        If it felt shaky, run through the exercises again.<br />
        If it's sticking, move it to Revise and it will come up regularly.
      </p>

      <div className="learn-checkup-actions">
        <button className="ob-btn-primary" onClick={onGotItForNow}>
          I've got it for now →
        </button>
        {onLearnNewVerse && (
          <button className="ob-btn-primary learn-new-verse-btn" onClick={onLearnNewVerse}>
            Learn a new verse →
          </button>
        )}
        <button className="learn-repeat-btn" onClick={() => setStep('fill')}>
          ↺ Repeat exercises
        </button>
      </div>
    </div>
  );
}
