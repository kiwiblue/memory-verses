import { useState, useEffect, useMemo } from 'react';
import FillExercise from './exercises/FillExercise.jsx';
import TypeExercise from './exercises/TypeExercise.jsx';
import { buildReviseQueue, getSkillLevel } from '../data/spacedRepetition.js';

// Derive exercise steps for a given skill level
// beginner:     fill:easy  → type:easy
// intermediate: fill:moderate → type:moderate
// advanced:     type:hard  (skip fill)
function stepsFor(skill) {
  if (skill === 'advanced')     return ['type'];
  if (skill === 'intermediate') return ['fill', 'type'];
  return ['fill', 'type']; // beginner
}

function diffFor(skill, exercise) {
  if (skill === 'advanced')     return 'hard';
  if (skill === 'intermediate') return exercise === 'fill' ? 'moderate' : 'moderate';
  return 'easy';
}

const SKILL_LABEL = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' };

export default function RevisePanel({ verses, progress, currentUser, onMark }) {
  // Build the queue once on mount — don't rebuild mid-session as progress updates
  const queue = useMemo(
    () => buildReviseQueue(verses, progress, currentUser.bracket || 'adult', 5),
    [] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const [queueIdx, setQueueIdx] = useState(0);
  const [stepIdx, setStepIdx]   = useState(0);

  const verse = queue[queueIdx] ?? null;
  const skill = verse ? getSkillLevel(progress[verse.id]) : 'beginner';
  const steps = verse ? stepsFor(skill) : [];

  // Reset step when verse changes
  useEffect(() => { setStepIdx(0); }, [queueIdx]);

  function advanceStep() {
    if (stepIdx + 1 < steps.length) {
      setStepIdx(i => i + 1);
    } else {
      // All exercises for this verse done — mark as known, move on
      onMark(verse, 1);
      setQueueIdx(i => i + 1);
    }
  }

  // ── Empty state ───────────────────────────────────────────────────────────
  if (queue.length === 0) {
    return (
      <div className="revise-panel revise-empty">
        <div className="revise-empty-icon">📖</div>
        <div className="revise-empty-title">Nothing to revise yet</div>
        <div className="revise-empty-sub">
          Complete a Learn session first — verses you've started will appear here.
        </div>
      </div>
    );
  }

  // ── All done ──────────────────────────────────────────────────────────────
  if (queueIdx >= queue.length) {
    return (
      <div className="revise-panel revise-done">
        <div className="revise-done-icon">🎉</div>
        <h2 className="revise-done-title">Revision complete!</h2>
        <p className="revise-done-sub">
          You've reviewed {queue.length} verse{queue.length !== 1 ? 's' : ''} today. Well done!
        </p>
      </div>
    );
  }

  // ── Exercise ──────────────────────────────────────────────────────────────
  const currentStep = steps[stepIdx];
  const difficulty  = diffFor(skill, currentStep);
  const exerciseNum = stepIdx + 1;
  const exerciseTotal = steps.length;

  return (
    <div className="revise-panel">
      <div className="revise-progress-row">
        <span className="revise-queue-pos">Verse {queueIdx + 1} of {queue.length}</span>
        <span className={`revise-skill-badge revise-skill-${skill}`}>{SKILL_LABEL[skill]}</span>
      </div>
      <div className="learn-step-label">Exercise {exerciseNum} of {exerciseTotal}</div>

      {currentStep === 'fill' && (
        <FillExercise
          key={`${verse.id}-fill`}
          verse={verse}
          difficulty={difficulty}
          onComplete={advanceStep}
        />
      )}
      {currentStep === 'type' && (
        <TypeExercise
          key={`${verse.id}-type`}
          verse={verse}
          difficulty={difficulty}
          onDowngrade={() => {}}
          onComplete={advanceStep}
        />
      )}
    </div>
  );
}
