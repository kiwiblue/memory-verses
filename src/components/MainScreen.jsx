import { useState, useMemo } from 'react';
import FlipCard from './FlipCard.jsx';
import Icon from './Icon.jsx';

// Sort active verses by next_review ascending (most overdue first)
function sortedActiveVerses(verses, progress) {
  return verses
    .filter(v => {
      const s = progress[v.id]?.status;
      return s === 'learning' || s === 'mastered';
    })
    .sort((a, b) => {
      const na = progress[a.id]?.next_review ?? 0;
      const nb = progress[b.id]?.next_review ?? 0;
      return na - nb;
    });
}

export default function MainScreen({
  verses,
  progress,
  currentUser,
  version,
  defaultVersion,
  verseTranslations,
  onVerseTranslationChange,
  todayCount,
  nextUnseen,
  streak,
  onTodayExercises,
  onPracticeAnyway,
  onLearnNext,
  onVerseDetails,
  onAddVerse,
}) {
  const [browseIdx, setBrowseIdx] = useState(0);
  const [isFlipped, setIsFlipped]  = useState(false);

  const activeVerses = useMemo(
    () => sortedActiveVerses(verses, progress),
    [verses, progress]
  );

  // Display list: active verses, or next unseen as a preview if deck is empty
  const displayVerses = activeVerses.length > 0
    ? activeVerses
    : nextUnseen ? [nextUnseen] : [];

  const clampedIdx   = Math.min(browseIdx, Math.max(0, displayVerses.length - 1));
  const currentVerse = displayVerses[clampedIdx] ?? null;
  const isEmpty      = displayVerses.length === 0;
  const isPreview    = activeVerses.length === 0 && !!nextUnseen;

  function navigate(dir) {
    setIsFlipped(false);
    setBrowseIdx(i => Math.min(Math.max(0, i + dir), displayVerses.length - 1));
  }

  return (
    <div className="main-screen">

      {/* ── Flip card + nav ─────────────────────────────────────────────── */}
      {isEmpty ? (
        <div className="main-empty-card">
          <div className="main-empty-icon"><Icon name="book" size={18} /></div>
          <div className="main-empty-text">Add a verse to get started</div>
        </div>
      ) : (
        <>
          <div className={`main-card-wrap${isPreview ? ' main-card-preview' : ''}`}>
            {isPreview && (
              <div className="main-preview-label">Next verse to learn</div>
            )}
            <FlipCard
              verse={currentVerse}
              version={version}
              defaultVersion={defaultVersion}
              verseTranslations={verseTranslations}
              isFlipped={isFlipped}
              mode="browse"
              starred={!!progress[currentVerse.id]?.starred}
              onFlip={() => setIsFlipped(f => !f)}
              onVerseTranslationChange={onVerseTranslationChange}
            />
          </div>

          {/* Verse details + nav row */}
          <div className="main-card-nav">
            <button
              className="main-verse-details"
              onClick={() => onVerseDetails?.(currentVerse)}
            >
              verse details
            </button>
            {displayVerses.length > 1 && (
              <div className="main-nav-controls">
                <button
                  className="main-nav-arrow"
                  onClick={() => navigate(-1)}
                  disabled={clampedIdx === 0}
                ><Icon name="back" size={22} /></button>
                <span className="main-nav-pos">
                  {clampedIdx + 1}/{displayVerses.length}
                </span>
                <button
                  className="main-nav-arrow"
                  onClick={() => navigate(1)}
                  disabled={clampedIdx >= displayVerses.length - 1}
                ><Icon name="forward" size={22} /></button>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Primary actions ──────────────────────────────────────────────── */}
      <div className="main-actions">
        <button
          className="ob-btn-primary main-btn-exercises"
          onClick={onTodayExercises}
          disabled={todayCount === 0}
        >
          {todayCount > 0
            ? `Today's Exercises  (${todayCount} verse${todayCount !== 1 ? 's' : ''})`
            : 'No exercises due today'}
        </button>

        {todayCount === 0 && activeVerses.length > 0 && (
          <button
            className="main-btn-practice-anyway"
            onClick={onPracticeAnyway}
          >
            Practice exercises anyway
          </button>
        )}

        <button
          className="main-btn-learn"
          onClick={onLearnNext}
          disabled={!nextUnseen}
        >
          {nextUnseen ? 'Learn next verse' : 'All verses in progress'}
        </button>
      </div>

      {/* ── Bottom row: streak + FAB ─────────────────────────────────────── */}
      <div className="main-bottom-row">
        <div className="main-streak">
          <span className="main-streak-icon"><Icon name="streak" size={18} /></span>
          <span className="main-streak-text">
            Streak: <strong>{streak}</strong> {streak === 1 ? 'day' : 'days'}
          </span>
        </div>

        <button className="main-fab" onClick={onAddVerse} aria-label="Add verse">
          <Icon name="add" size={26} weight="bold" />
        </button>
      </div>
    </div>
  );
}
