import { useState } from 'react';
import { getSkillLevel } from '../data/spacedRepetition.js';

const SKILL_FILL = { easy: 1 / 3, moderate: 2 / 3, hard: 1 };

function Ring({ fill, label, color }) {
  const r = 18;
  const circ = 2 * Math.PI * r;
  const dash = circ * Math.max(0, Math.min(1, fill));

  return (
    <div className="vs-ring-wrap">
      <svg width="44" height="44" viewBox="0 0 44 44">
        {/* track */}
        <circle cx="22" cy="22" r={r} fill="none"
          stroke="var(--color-surface-sunken)" strokeWidth="4" />
        {/* fill — rotated so it starts at top */}
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
  progress,
  version,
  verseTranslations,
  onVerseTranslationChange,
  onPractice,
  onLearnLater,
  onDelete,
  onClose,
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);

  if (!verse) return null;

  const entry = progress[verse.id];
  const status = entry?.status || 'unseen';
  const activeVersion = verseTranslations?.[verse.id] || version;
  const verseText = verse[activeVersion] || verse.kjv || '';
  const skill = getSkillLevel(entry);
  const freshness = computeFreshness(entry);
  const masteryFill = SKILL_FILL[skill] ?? 1 / 3;

  const statusLabel = {
    unseen: 'New verse',
    learning: 'Learning',
    mastered: 'Mastered',
  }[status] ?? 'New verse';

  function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    onDelete?.(verse);
  }

  return (
    <div className="vs-overlay">
      <div className="vs-panel">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="vs-header">
          <button className="vs-back" onClick={onClose} aria-label="Back">
            ‹
          </button>

          <div className="vs-rings">
            <Ring fill={freshness} label="Fresh" color="var(--color-brand)" />
            <Ring fill={masteryFill} label="Mastery" color="#f59e0b" />
          </div>

          <div className="vs-version-wrap">
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
        </div>

        {/* ── Status badge ────────────────────────────────────────────────── */}
        <div className={`vs-status-badge vs-status-${status}`}>{statusLabel}</div>

        {/* ── Verse card (tappable to flip) ────────────────────────────────── */}
        <button
          className={`vs-card${isFlipped ? ' vs-card-flipped' : ''}`}
          onClick={() => setIsFlipped(f => !f)}
        >
          <div className="vs-card-inner">
            <div className="vs-card-front">
              <div className="vs-card-ref-label">REFERENCE</div>
              <div className="vs-card-ref">{verse.reference}</div>
              <div className="vs-card-tap-hint">tap to reveal</div>
            </div>
            <div className="vs-card-back">
              <div className="vs-card-ref-small">{verse.reference}</div>
              <div className="vs-card-text">{verseText}</div>
            </div>
          </div>
        </button>

        {/* ── Practice button ──────────────────────────────────────────────── */}
        <button className="ob-btn-primary vs-practice-btn" onClick={onPractice}>
          Practice now →
        </button>

        {/* ── Secondary actions ────────────────────────────────────────────── */}
        <div className="vs-actions">
          <button
            className="vs-action-btn"
            onClick={() => onLearnLater?.(verse)}
          >
            ⏩ Learn later
          </button>

          <button
            className={`vs-action-btn vs-action-delete${confirmDelete ? ' vs-confirm' : ''}`}
            onClick={handleDelete}
            onBlur={() => setConfirmDelete(false)}
          >
            {confirmDelete ? 'Confirm remove' : '🗑 Remove'}
          </button>
        </div>

      </div>
    </div>
  );
}
