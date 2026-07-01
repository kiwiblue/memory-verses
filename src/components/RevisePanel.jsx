import { useState, useMemo, useEffect } from 'react';
import FlipCard from './FlipCard.jsx';
import FillExercise from './exercises/FillExercise.jsx';
import TypeExercise from './exercises/TypeExercise.jsx';
import MatchExercise from './exercises/MatchExercise.jsx';
import {
  buildReviseQueue,
  getSkillLevel,
  computeHintScore,
  computeNextSkillLevel,
  verseAgeDays,
} from '../data/spacedRepetition.js';
import Icon from './Icon.jsx';

const DAY_MS = 24 * 60 * 60 * 1000;

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

function verseRings(entry) {
  if (!entry || (entry.seen_count || 0) === 0) return null;
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;

  // Ring 1 — Freshness: proportion of review window remaining (drains linearly to 0 when due)
  const last   = entry.last_seen  || 0;
  const next   = entry.next_review || 0;
  const window = next - last;
  const freshnessPct = window > 0 ? Math.max(0, 1 - (now - last) / window) : 0;
  const freshnessColor = freshnessPct >= 0.6 ? 'var(--color-brand)' : freshnessPct >= 0.3 ? 'var(--color-warning)' : 'var(--color-danger)';

  const daysLeft = Math.max(0, (next - now) / DAY);
  const daysOver = Math.max(0, (now - next) / DAY);
  const freshnessLabel = freshnessPct === 0
    ? (daysOver >= 1 ? Math.round(daysOver) + "d overdue" : "Due now")
    : (daysLeft >= 1 ? "Due in " + Math.round(daysLeft) + "d" : "Due today");

  // Ring 2 — Mastery: skill level as a proportion (easy=1/3, moderate=2/3, hard=full)
  const skillMap = { easy: 0.33, moderate: 0.66, hard: 1.0 };
  const skill = entry.skill_level || "easy";
  const masteryPct   = skillMap[skill] ?? 0.33;
  const masteryColor = skill === "hard" ? "var(--color-skill-hard)" : skill === "moderate" ? "var(--color-skill-moderate)" : "var(--color-skill-easy)";
  const masteryLabel = skill === "hard" ? "Hard" : skill === "moderate" ? "Moderate" : "Easy";

  return { freshnessPct, freshnessColor, freshnessLabel, masteryPct, masteryColor, masteryLabel };
}

function VerseStats({ entry }) {
  const rings = verseRings(entry);
  if (!rings) return null;
  const { freshnessPct, freshnessColor, freshnessLabel, masteryPct, masteryColor, masteryLabel } = rings;
  return (
    <div className="deck-stats" title={"Freshness: " + freshnessLabel + " · Mastery: " + masteryLabel}>
      <Ring pct={freshnessPct} color={freshnessColor} />
      <Ring pct={masteryPct}   color={masteryColor} />
    </div>
  );
}

// ── Exercise sub-flow ─────────────────────────────────────────────────────────
const SKILL_LABEL = { easy: 'Easy', moderate: 'Moderate', hard: 'Hard' };

function stepsFor(skill) {
  if (skill === 'hard') return ['type'];
  return ['fill', 'type'];
}
function diffFor(skill) {
  if (skill === 'hard')     return 'hard';
  if (skill === 'moderate') return 'moderate';
  return 'easy';
}

function ExerciseFlow({ queue, progress, version = 'kjv', verseTranslations = {}, sessionKey, bracket = 'adult', onAdvance, onDone }) {
  const [queueIdx, setQueueIdx] = useState(0);
  const [stepIdx, setStepIdx]   = useState(0);
  const [accHints, setAccHints] = useState(0);
  const [accErrors, setAccErrors] = useState(0);
  const [matchPhase, setMatchPhase] = useState(false);

  const verse = queue[queueIdx] ?? null;
  const skill = verse ? getSkillLevel(progress[verse.id]) : 'easy';
  const verseVersion = verseTranslations[verse?.id] || version;
  const steps = stepsFor(skill);
  const difficulty = diffFor(skill);

  // Match exercise appears as a final bonus step when the queue has 2+ verses.
  // Difficulty: moderate (4-verse drag) if enough verses, otherwise easy (2-verse drag).
  const matchDifficulty = queue.length >= 4 ? 'moderate' : 'easy';
  const showMatch = queue.length >= 2;

  function advanceStep(result = {}) {
    const newHints  = accHints  + (result.hints  || 0);
    const newErrors = accErrors + (result.errors || 0);
    setAccHints(newHints);
    setAccErrors(newErrors);

    const isLastStep  = stepIdx + 1 >= steps.length;
    const isLastVerse = queueIdx + 1 >= queue.length;

    if (!isLastStep) {
      setStepIdx(i => i + 1);
      return;
    }

    // All steps done for this verse — compute new skill level
    const entry = progress[verse.id];
    const hintScore  = computeHintScore(newHints, newErrors);
    const newLevel   = computeNextSkillLevel(getSkillLevel(entry), {
      hintScore,
      ageDays: verseAgeDays(entry),
      seenCount: entry?.seen_count || 0,
      recentAttempts: entry?.attempts || [],
      bracket,
    });

    onAdvance(verse, newLevel, hintScore);

    if (isLastVerse) {
      if (showMatch) {
        setMatchPhase(true);
      } else {
        onDone(queue.length);
      }
    } else {
      setQueueIdx(i => i + 1);
      setStepIdx(0);
      setAccHints(0);
      setAccErrors(0);
    }
  }

  if (matchPhase) {
    return (
      <div className="revise-panel">
        <div className="revise-progress-row">
          <span className="revise-queue-pos">Bonus: Reference Match</span>
          <span className={`revise-skill-badge revise-skill-${matchDifficulty}`}>
            {matchDifficulty === 'moderate' ? 'Moderate' : 'Easy'}
          </span>
        </div>
        <MatchExercise
          key={`match-${sessionKey}`}
          verses={queue}
          version={version}
          verseTranslations={verseTranslations}
          difficulty={matchDifficulty}
          onDowngrade={() => {}}
          onComplete={() => onDone(queue.length)}
        />
      </div>
    );
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
          key={`${verse.id}-fill-${sessionKey}-${queueIdx}`}
          verse={verse}
          version={verseVersion}
          difficulty={difficulty}
          onComplete={advanceStep}
        />
      )}
      {currentStep === 'type' && (
        <TypeExercise
          key={`${verse.id}-type-${sessionKey}-${queueIdx}`}
          verse={verse}
          version={verseVersion}
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
  onMark, onLearnNew, onLearnNewVerse, onViewStats,
  autoStart, onAutoStartConsumed, onEnsureTranslation,
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

  // Fetch the browse card's translation if not cached. The browse card has its
  // own navigation index, independent of the parent's active-verse fetch.
  const browseVerseForFetch = reviseVerses[Math.min(browseIdx, Math.max(0, reviseVerses.length - 1))];
  const browseVersion = browseVerseForFetch ? (verseTranslations[browseVerseForFetch.id] || version) : version;
  useEffect(() => {
    if (panelMode === 'browse' && browseVerseForFetch && browseVersion && !browseVerseForFetch[browseVersion]) {
      onEnsureTranslation?.(browseVerseForFetch.reference, browseVersion);
    }
  }, [panelMode, browseVerseForFetch, browseVersion, onEnsureTranslation]);

  const todayQueue = useMemo(
    () => buildReviseQueue(verses, progress, currentUser.bracket || 'adult', 5),
    [verses, progress, currentUser.bracket]
  );

  // "Practice anyway" — top 3 verses needing the most practice, regardless of due date
  const practiceQueue = useMemo(
    () => buildReviseQueue(verses, progress, currentUser.bracket || 'adult', 3),
    [verses, progress, currentUser.bracket]
  );

  function startExercises(queue) {
    setExerciseQueue(queue);
    setSessionKey(k => k + 1);
    setPanelMode('exercising');
    setIsFlipped(false);
  }

  // Entry points (main screen + drawer) can ask us to launch a queue straight away
  // instead of landing in browse. 'today' = due verses; 'practice' = top 3 anyway.
  // Runs once on mount.
  useEffect(() => {
    if (autoStart) {
      const queue = autoStart === 'practice' ? practiceQueue : todayQueue;
      if (queue.length > 0) startExercises(queue);
      onAutoStartConsumed?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (reviseVerses.length === 0) {
    return (
      <div className="revise-panel">
        <div className="revise-empty">
          <div className="revise-empty-icon"><Icon name="book" size={18} /></div>
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
          <div className="revise-done-icon"><Icon name="celebrate" size={28} /></div>
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
            {onViewStats && (
              <button className="revise-stats-btn" onClick={onViewStats}>
                View your Statistics →
              </button>
            )}
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
          version={version}
          verseTranslations={verseTranslations}
          sessionKey={sessionKey}
          bracket={currentUser?.bracket || 'adult'}
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
      <FlipCard
        verse={browseVerse}
        version={verseTranslations[browseVerse.id] || version}
        defaultVersion={defaultVersion}
        verseTranslations={verseTranslations}
        isFlipped={isFlipped}
        mode="revise"
        starred={!!progress[browseVerse.id]?.starred}
        onFlip={() => setIsFlipped(f => !f)}
        onVerseTranslationChange={onVerseTranslationChange}
      />

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
