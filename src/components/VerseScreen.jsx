import { useState, useEffect } from 'react';
import { getSkillLevel } from '../data/spacedRepetition.js';
import OverlayHeader from './OverlayHeader.jsx';
import FlipCard from './FlipCard.jsx';
import Icon from './Icon.jsx';

const SKILL_FILL = { easy: 1 / 3, moderate: 2 / 3, hard: 1 };

function Ring({ fill, label, color }) {
  const r = 18;
  const circ = 2 * Math.PI * r;
  const dash = circ * Math.max(0, Math.min(1, fill));
  return (
    <div className="vs-ring-wrap">
      <svg width="44" height="44" viewBox="0 0 44 44">
        <circle cx="22" cy="22" r={r} fill="none"
          stroke="var(--color-surface-sunken)" strokeWidth="4" />
        <circle cx="22" cy="22" r={r} fill="none"
          stroke={color} strokeWidth="4"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 22 22)"
        />
      </svg>
      <span className="vs-ring-label">{label}</span>
    </div>
  );
}

function computeFreshness(entry) {
  if (!entry || entry.status === 'unseen') return 0;
  const now = Date.now();
  const { next_review, last_seen } = entry;
  if (!next_review || !last_seen) return 1;
  const window = next_review - last_seen;
  if (window <= 0) return 0;
  return Math.max(0, Math.min(1, (next_review - now) / window));
}

export default function VerseScreen({
  verse,
  user,
  progress,
  version,
  verseTranslations,
  onVerseTranslationChange,
  // exercise launchers
  onTypeVerse,
  onSelectWord,
  onMatchRef,
  // frequency
  onLessFrequency,
  onMoreFrequency,
  // actions
  starred,
  onToggleStar,
  onReset,
  onDelete,
  onClose,
  onHome,
}) {
  const [confirmAction, setConfirmAction] = useState(null); // 'reset' | 'delete'
  const [view, setView] = useState('menu'); // 'menu' | 'card' (Flip Card [18])
  const [flipped, setFlipped] = useState(false);

  // Reset to the menu whenever a different verse is opened
  useEffect(() => { setView('menu'); setFlipped(false); setConfirmAction(null); }, [verse?.id]);

  if (!verse) return null;

  const entry = progress[verse.id];
  const status = entry?.status || 'unseen';
  const activeVersion = verseTranslations?.[verse.id] || version;
  const skill = getSkillLevel(entry);
  const freshness = computeFreshness(entry);
  const masteryFill = SKILL_FILL[skill] ?? 1 / 3;

  const statusLabel = { unseen: 'New verse', learning: 'Learning', mastered: 'Mastered' }[status] ?? 'New verse';
  const isActive = status === 'learning' || status === 'mastered';

  function handleAction(action) {
    if (confirmAction === action) {
      if (action === 'reset') onReset?.(verse);
      if (action === 'delete') onDelete?.(verse);
      setConfirmAction(null);
    } else {
      setConfirmAction(action);
    }
  }

  return (
    <div className="vs-overlay">
      <div className="vs-panel">
        <OverlayHeader onBack={view === 'card' ? () => setView('menu') : onClose} user={user} onHome={onHome} />
      </div>

      <div className="vs-sheet">
        <div className="vs-sheet-inner">

          <div className="vs-meta-row">
            <div className="vs-rings">
              <Ring fill={freshness} label="Fresh" color="var(--color-brand)" />
              <Ring fill={masteryFill} label="Mastery" color="var(--color-mastery)" />
            </div>
            <select
              className="vs-version-select"
              value={activeVersion}
              onChange={e => onVerseTranslationChange?.(verse.id, e.target.value)}
            >
              {['kjv', 'bsb', 'esv', 'niv', 'nkjv', 'nasb'].map(t => (
                <option key={t} value={t}>{t.toUpperCase()}</option>
              ))}
            </select>
          </div>

          {view === 'card' ? (
            <FlipCard
              verse={verse}
              version={activeVersion}
              defaultVersion={version}
              verseTranslations={verseTranslations}
              isFlipped={flipped}
              mode="learn"
              onFlip={() => setFlipped(f => !f)}
              onVerseTranslationChange={onVerseTranslationChange}
            />
          ) : (
            <>
              <div className="vs-ref-row">
                <div className="vs-ref-text">{verse.reference}</div>
              </div>

              <div className="vs-exercises">
                <button className="vs-ex-btn" onClick={() => { setFlipped(false); setView('card'); }}>Flip Card</button>
                <button className="vs-ex-btn" onClick={onTypeVerse} disabled={!isActive}>Type the verse</button>
                <button className="vs-ex-btn" onClick={onSelectWord} disabled={!isActive}>Select the word</button>
                <button className="vs-ex-btn" onClick={onMatchRef} disabled={!isActive}>Match the reference</button>
              </div>
            </>
          )}

          <div className="vs-flex-grow" />

          {isActive && (
            <div className="vs-frequency">
              <span className="vs-frequency-label">Practice Frequency?</span>
              <div className="vs-frequency-btns">
                <button className="vs-freq-btn vs-freq-less" onClick={onLessFrequency}>less</button>
                <button className="vs-freq-btn vs-freq-more" onClick={onMoreFrequency}>more</button>
              </div>
            </div>
          )}

          <div className="vs-bottom-actions">
            <button
              className={`vs-action-btn vs-action-star${starred ? ' vs-starred' : ''}`}
              onClick={() => onToggleStar?.(verse)}
              aria-label={starred ? 'Remove star' : 'Add star'}
            >
              <><Icon name="star" size={16} weight={starred ? 'fill' : 'regular'} /> {starred ? 'Starred' : 'Star'}</>
            </button>
            <button
              className={`vs-action-btn${confirmAction === 'reset' ? ' vs-confirm' : ''}`}
              onClick={() => handleAction('reset')}
              onBlur={() => setConfirmAction(null)}
              disabled={!isActive}
            >
              {confirmAction === 'reset' ? 'Confirm reset' : 'Reset'}
            </button>
            <button
              className={`vs-action-btn vs-action-delete${confirmAction === 'delete' ? ' vs-confirm' : ''}`}
              onClick={() => handleAction('delete')}
              onBlur={() => setConfirmAction(null)}
            >
              {confirmAction === 'delete' ? 'Confirm remove' : 'Remove'}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
