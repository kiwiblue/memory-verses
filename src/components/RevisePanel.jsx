import { useState, useEffect, useMemo } from 'react';
import FlipCard from './FlipCard.jsx';
import FillExercise from './exercises/FillExercise.jsx';
import TypeExercise from './exercises/TypeExercise.jsx';
import { buildReviseQueue, getSkillLevel } from '../data/spacedRepetition.js';

// ── Stats rings ───────────────────────────────────────────────────────────────
function Ring({ pct, color, size = 22, stroke = 3 }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e8e8e4" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color}
        strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={circ * (1 - Math.max(0, Math.min(1, pct)))} />
    </svg>
  );
}

function VerseStats({ entry }) {
  if (!entry || (entry.seen_count || 0) === 0) return null;
  const recent = (entry.scores || []).slice(-5);
  const accuracyPct = recent.length ? recent.filter(s => s === 1).length / 5 : 0;
  const practicePct = Math.min((entry.seen_count || 0) / 20, 1);
  const accuracyColor = accuracyPct >= 0.8 ? '#3a8c5c' : accuracyPct >= 0.5 ? '#e69c2f' : '#e05252';
  return (
    <div className="deck-stats">
      <Ring pct={accuracyPct} color={accuracyColor} />
      <Ring pct={practicePct} color="#4a90d9" />
    </div>
  );
}

// ── Exercise sub-flow ─────────────────────────────────────────────────────────
function stepsFor(skill) {
  if (skill === 'advanced') return ['type'];
  return ['fill', 'type'];
}
function diffFor(skill) {
  if (skill === 'advanced')     return 'hard';
  if (skill === 'intermediate') return 'moderate';
  return 'easy';
}
const SKILL_LABEL = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' };

function ExerciseFlow({ queue, progress, sessionKey, onAdvance, onDone }) {
  const [queueIdx, setQueueIdx] = useState(0);
  const [stepIdx, setStepIdx]   = useState(0);

  useEffect(() => { setQueueIdx(0); setStepIdx(0); }, [sessionKey]);
  useEffect(() => { setStepIdx(0); }, [queueIdx]);

  const verse = queue[queueIdx] ?? null;
  const skill = verse ? getSkillLevel(progress[verse.id]) : 'beginner';
  const steps = stepsFor(skill);
  const difficulty = diffFor(skill);

  function advanceStep() {
    const isLastStep = stepIdx + 1 >= steps.length;
    const isLastVerse = queueIdx + 1 >= queue.length;
    if (!isLastStep) {
      setStepIdx(i => i + 1);
    } else {
      onAdvance(verse, 1);
      if (isLastVerse) {
        onDone(queue.length);
      } else {
        setQueueIdx(i => i + 1);
      }
    }
  }

  if (!verse) return null;

  const currentStep = steps[stepIdx];

  return (
    <div className="revise-panel">
      <div className="revise-progress-row">
        <span className="revise-queue-pos">Verse {queueIdx + 1} of {queue.length}</span>
        <span className={`revise-skill-badge revise-skill-${skill}`}>{SKILL_LABEL[skill]}</span>
      </div>
      <div className="learn-step-label">Exercise {stepIdx + 1} of {steps.length}</div>

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

// ── Main panel ────────────────────────────────────────────────────────────────
export default function RevisePanel({
  verses, progress, currentUser,
  version, defaultVersion, verseTranslations, onVerseTranslationChange,
  onMark, onLearnNew, onLearnNewVerse,
}) {
  const [panelMode, setPanelMode] = useState('browse'); // 'browse' | 'exercising' | 'done'
  const [browseIdx, setBrowseIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [exerciseQueue, setExerciseQueue] = useState([]);
  const [sessionKey, setSessionKey] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);

  const reviseVerses = useMemo(() =>
    verses.filter(v => {
      const s = progress[v.id]?.status;
      return s === 'learning' || s === 'mastered';
    }),
    [verses, progress]
  );

  const todayQueue = useMemo(
    () => buildReviseQueue(verses, progress, currentUser.bracket || 'adult', 5),
    [verses, progress, currentUser.bracket]
  );

  function startExercises(queue) {
    setExerciseQueue(queue);
    setSessionKey(k => k + 1);
    setPanelMode('exercising');
    setIsFlipped(false);
  }

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (reviseVerses.length === 0) {
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

  // ── Done state ──────────────────────────────────────────────────────────────
  if (panelMode === 'done') {
    return (
      <div className="revise-panel">
        <div className="revise-done">
          <div className="revise-done-icon">🎉</div>
          <h2 className="revise-done-title">Revision complete!</h2>
          <p className="revise-done-sub">You reviewed {completedCount} verse{completedCount !== 1 ? 's' : ''}.</p>
          <div className="revise-done-actions">
            <button className="ob-btn-primary" onClick={() => setPanelMode('browse')}>
              ← Back to Revise
            </button>
            {onLearnNewVerse && (
              <button className="ob-btn-primary learn-new-verse-btn" onClick={onLearnNewVerse}>
                Learn a new verse →
              </button>
            )}
            <button className="learn-repeat-btn" onClick={() => startExercises(todayQueue)}>
              ↺ Practice more verses
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Exercise mode ───────────────────────────────────────────────────────────
  if (panelMode === 'exercising') {
    return (
      <>
        <button className="revise-back-btn" onClick={() => setPanelMode('browse')}>← Back</button>
        <ExerciseFlow
          queue={exerciseQueue}
          progress={progress}
          sessionKey={sessionKey}
          onAdvance={onMark}
          onDone={(count) => { setCompletedCount(count); setPanelMode('done'); }}
        />
      </>
    );
  }

  // ── Browse mode ─────────────────────────────────────────────────────────────
  const browseVerse = reviseVerses[Math.min(browseIdx, reviseVerses.length - 1)];

  return (
    <div className="revise-panel">
      {/* Flip card */}
      <FlipCard
        verse={browseVerse}
        version={version}
        defaultVersion={defaultVersion}
        verseTranslations={verseTranslations}
        isFlipped={isFlipped}
        mode="revise"
        onFlip={() => setIsFlipped(f => !f)}
        onVerseTranslationChange={onVerseTranslationChange}
      />

      {/* Card navigation */}
      <div className="revise-browse-nav">
        <button
          className="revise-nav-btn"
          onClick={() => { setBrowseIdx(i => Math.max(0, i - 1)); setIsFlipped(false); }}
          disabled={browseIdx === 0}
        >←</button>
        <span className="revise-nav-pos">{Math.min(browseIdx, reviseVerses.length - 1) + 1} / {reviseVerses.length}</span>
        <button
          className="revise-nav-btn"
          onClick={() => { setBrowseIdx(i => Math.min(reviseVerses.length - 1, i + 1)); setIsFlipped(false); }}
          disabled={browseIdx >= reviseVerses.length - 1}
        >→</button>
      </div>

      {/* Today's exercises */}
      <div className="revise-actions">
        <button
          className="ob-btn-primary revise-today-btn"
          onClick={() => startExercises(todayQueue)}
          disabled={todayQueue.length === 0}
        >
          {todayQueue.length > 0
            ? `Today's Exercises (${todayQueue.length} verse${todayQueue.length !== 1 ? 's' : ''})`
            : 'No exercises due today'}
        </button>
      </div>

      {/* Verse list */}
      <div className="revise-verse-list">
        <div className="revise-verse-list-hdr">Your verses</div>
        {reviseVerses.map(v => {
          const entry = progress[v.id];
          const skill = getSkillLevel(entry);
          return (
            <div key={v.id} className="revise-verse-row">
              <div className="revise-verse-info">
                <span className="deck-ref">{v.reference}</span>
                <span className={`revise-skill-badge revise-skill-${skill}`}>{SKILL_LABEL[skill]}</span>
              </div>
              <VerseStats entry={entry} />
              <button className="deck-learn-btn" onClick={() => startExercises([v])}>
                Revise Now
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
