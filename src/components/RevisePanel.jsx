import { useState, useEffect, useMemo } from 'react';
import FillExercise from './exercises/FillExercise.jsx';
import TypeExercise from './exercises/TypeExercise.jsx';
import { buildReviseQueue, getSkillLevel } from '../data/spacedRepetition.js';

function stepsFor(skill) {
  if (skill === 'advanced')     return ['type'];
  return ['fill', 'type']; // beginner / intermediate
}

function diffFor(skill) {
  if (skill === 'advanced')     return 'hard';
  if (skill === 'intermediate') return 'moderate';
  return 'easy';
}

const SKILL_LABEL = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' };

export default function RevisePanel({ verses, progress, currentUser, onMark, onLearnNew }) {
  // sessionKey increments when the user hits "Practice again" — forces queue rebuild
  const [sessionKey, setSessionKey] = useState(0);

  const queue = useMemo(
    () => buildReviseQueue(verses, progress, currentUser.bracket || 'adult', 5),
    [sessionKey] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const [queueIdx, setQueueIdx] = useState(0);
  const [stepIdx, setStepIdx]   = useState(0);

  // Reset positions when a new session starts
  useEffect(() => { setQueueIdx(0); setStepIdx(0); }, [sessionKey]);

  const verse = queue[queueIdx] ?? null;
  // Read skill from progress at render time so it reflects the just-recorded attempt
  // (the recency bump in getSkillLevel will kick in if they just practiced this verse)
  const skill = verse ? getSkillLevel(progress[verse.id]) : 'beginner';
  const steps = stepsFor(skill);

  useEffect(() => { setStepIdx(0); }, [queueIdx]);

  function advanceStep() {
    if (stepIdx + 1 < steps.length) {
      setStepIdx(i => i + 1);
    } else {
      onMark(verse, 1);
      setQueueIdx(i => i + 1);
    }
  }

  // ── Empty state ───────────────────────────────────────────────────────────
  if (queue.length === 0) {
    return (
      <div className="revise-panel">
        <div className="revise-empty">
          <div className="revise-empty-icon">📖</div>
          <div className="revise-empty-title">Nothing to revise yet</div>
          <div className="revise-empty-sub">
            Complete a Learn session first — verses you've started will appear here.
          </div>
          <button className="ob-btn-primary" onClick={onLearnNew}>Learn a new verse →</button>
        </div>
      </div>
    );
  }

  // ── All done ──────────────────────────────────────────────────────────────
  if (queueIdx >= queue.length) {
    return (
      <div className="revise-panel">
        <div className="revise-done">
          <div className="revise-done-icon">🎉</div>
          <h2 className="revise-done-title">Revision complete!</h2>
          <p className="revise-done-sub">
            You've reviewed {queue.length} verse{queue.length !== 1 ? 's' : ''} today.
          </p>
          <div className="revise-done-actions">
            <button
              className="ob-btn-primary"
              onClick={onLearnNew}
            >
              Learn a new verse →
            </button>
            <button
              className="learn-repeat-btn"
              onClick={() => setSessionKey(k => k + 1)}
            >
              ↺ Practice more verses
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Exercise ──────────────────────────────────────────────────────────────
  const currentStep = steps[stepIdx];
  const difficulty  = diffFor(skill);

  return (
    <div className="revise-panel">
      <div className="revise-progress-row">
        <span className="revise-queue-pos">Verse {queueIdx + 1} of {queue.length}</span>
        <span className={`revise-skill-badge revise-skill-${skill}`}>{SKILL_LABEL[skill]}</span>
      </div>
      <div className="learn-step-label">
        Exercise {stepIdx + 1} of {steps.length}
      </div>

      {currentStep === 'fill' && (
        <FillExercise
          key={`${verse.id}-fill-${sessionKey}`}
          verse={verse}
          difficulty={difficulty}
          onComplete={advanceStep}
        />
      )}
      {currentStep === 'type' && (
        <TypeExercise
          key={`${verse.id}-type-${sessionKey}`}
          verse={verse}
          difficulty={difficulty}
          onDowngrade={() => {}}
          onComplete={advanceStep}
        />
      )}
    </div>
  );
}
