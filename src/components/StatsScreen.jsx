import { useMemo, useState } from 'react';
import { loadStreak } from '../data/streak.js';
import OverlayHeader from './OverlayHeader.jsx';
import Icon from './Icon.jsx';

const SKILL_FILL = { easy: 1 / 3, moderate: 2 / 3, hard: 1 };

const OT_BOOKS = [
  { f: 'Genesis', a: 'Gen' }, { f: 'Exodus', a: 'Exo' }, { f: 'Leviticus', a: 'Lev' },
  { f: 'Numbers', a: 'Num' }, { f: 'Deuteronomy', a: 'Deu' }, { f: 'Joshua', a: 'Jos' },
  { f: 'Judges', a: 'Jdg' }, { f: 'Ruth', a: 'Rut' }, { f: '1 Samuel', a: '1Sa' },
  { f: '2 Samuel', a: '2Sa' }, { f: '1 Kings', a: '1Ki' }, { f: '2 Kings', a: '2Ki' },
  { f: '1 Chronicles', a: '1Ch' }, { f: '2 Chronicles', a: '2Ch' }, { f: 'Ezra', a: 'Ezr' },
  { f: 'Nehemiah', a: 'Neh' }, { f: 'Esther', a: 'Est' }, { f: 'Job', a: 'Job' },
  { f: 'Psalms', a: 'Psa' }, { f: 'Proverbs', a: 'Pro' }, { f: 'Ecclesiastes', a: 'Ecc' },
  { f: 'Song of Solomon', a: 'Sos' }, { f: 'Isaiah', a: 'Isa' }, { f: 'Jeremiah', a: 'Jer' },
  { f: 'Lamentations', a: 'Lam' }, { f: 'Ezekiel', a: 'Eze' }, { f: 'Daniel', a: 'Dan' },
  { f: 'Hosea', a: 'Hos' }, { f: 'Joel', a: 'Joe' }, { f: 'Amos', a: 'Amo' },
  { f: 'Obadiah', a: 'Oba' }, { f: 'Jonah', a: 'Jon' }, { f: 'Micah', a: 'Mic' },
  { f: 'Nahum', a: 'Nah' }, { f: 'Habakkuk', a: 'Hab' }, { f: 'Zephaniah', a: 'Zep' },
  { f: 'Haggai', a: 'Hag' }, { f: 'Zechariah', a: 'Zec' }, { f: 'Malachi', a: 'Mal' },
];

const NT_BOOKS = [
  { f: 'Matthew', a: 'Mat' }, { f: 'Mark', a: 'Mar' }, { f: 'Luke', a: 'Luk' },
  { f: 'John', a: 'Joh' }, { f: 'Acts', a: 'Act' }, { f: 'Romans', a: 'Rom' },
  { f: '1 Corinthians', a: '1Co' }, { f: '2 Corinthians', a: '2Co' }, { f: 'Galatians', a: 'Gal' },
  { f: 'Ephesians', a: 'Eph' }, { f: 'Philippians', a: 'Phi' }, { f: 'Colossians', a: 'Col' },
  { f: '1 Thessalonians', a: '1Th' }, { f: '2 Thessalonians', a: '2Th' }, { f: '1 Timothy', a: '1Ti' },
  { f: '2 Timothy', a: '2Ti' }, { f: 'Titus', a: 'Tit' }, { f: 'Philemon', a: 'Phm' },
  { f: 'Hebrews', a: 'Heb' }, { f: 'James', a: 'Jam' }, { f: '1 Peter', a: '1Pe' },
  { f: '2 Peter', a: '2Pe' }, { f: '1 John', a: '1Jo' }, { f: '2 John', a: '2Jo' },
  { f: '3 John', a: '3Jo' }, { f: 'Jude', a: 'Jud' }, { f: 'Revelation', a: 'Rev' },
];

const ALL_BOOKS = [...OT_BOOKS, ...NT_BOOKS];
const OT_SET = new Set(OT_BOOKS.map(b => b.f));

function bookOf(reference) {
  for (const book of ALL_BOOKS) {
    if (reference.startsWith(book.f + ' ') || reference === book.f) return book.f;
  }
  return null;
}

function practiceRate(history) {
  if (!history?.length) return 0;
  const now = new Date();
  let count = 0;
  for (let i = 0; i < 10; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const ds = d.toISOString().slice(0, 10);
    if (history.includes(ds)) count++;
  }
  return count;
}

function MiniRing({ pct, color, size = 26 }) {
  const r = (size - 5) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  const dash = Math.max(0, Math.min(1, pct)) * circ;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--color-surface-sunken)" strokeWidth={3.5} />
      {dash > 0 && (
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={3.5}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      )}
    </svg>
  );
}

export default function StatsScreen({ verses, progress, currentUser, users, streak, ranking, rankingCount, onClose, onHome }) {
  const streakData = loadStreak(currentUser.id);
  const rate = practiceRate(streakData.history);
  const [expandedRow, setExpandedRow] = useState(null);

  function toggleRow(id) { setExpandedRow(r => r === id ? null : id); }

  const activeVerses = useMemo(
    () => verses.filter(v => { const s = progress[v.id]?.status; return s === 'learning' || s === 'mastered'; }),
    [verses, progress]
  );

  const { otCount, ntCount, activeBooks } = useMemo(() => {
    let ot = 0, nt = 0;
    const books = new Set();
    for (const v of activeVerses) {
      const b = bookOf(v.reference);
      if (!b) continue;
      books.add(b);
      if (OT_SET.has(b)) ot++; else nt++;
    }
    return { otCount: ot, ntCount: nt, activeBooks: books };
  }, [activeVerses]);

  const total = otCount + ntCount;
  const otPct = total ? otCount / total : 0;
  const now = Date.now();

  return (
    <div className="stats-overlay">
      <div className="stats-hdr-panel">
        <OverlayHeader onBack={onClose} user={currentUser} onHome={onHome} />
      </div>
      <div className="stats-sheet">
      <div className="stats-panel">

        <div className="stats-hdr">
          <span className="stats-title">My Statistics</span>
        </div>

        {ranking != null && (
          <div className={`stats-row-group${expandedRow === 'ranking' ? ' stats-row-group-open' : ''}`}>
            <div className="stats-row stats-row-expandable" onClick={() => toggleRow('ranking')}>
              <span className="stats-row-icon"><Icon name="ranking" size={18} /></span>
              <span className="stats-row-label">Ranking</span>
              <span className="stats-row-value">#{ranking}{rankingCount > 1 ? ` of ${rankingCount}` : ''}</span>
              <Icon name={expandedRow === 'ranking' ? 'up' : 'down'} size={14} />
            </div>
            {expandedRow === 'ranking' && (
              <div className="stats-row-detail">Based on the number of mastered verses</div>
            )}
          </div>
        )}

        <div className={`stats-row-group${expandedRow === 'streak' ? ' stats-row-group-open' : ''}`}>
          <div className="stats-row stats-row-expandable" onClick={() => toggleRow('streak')}>
            <span className="stats-row-icon"><Icon name="streak" size={18} /></span>
            <span className="stats-row-label">Streak</span>
            <span className="stats-row-value">{streak} day{streak !== 1 ? 's' : ''}</span>
            <Icon name={expandedRow === 'streak' ? 'up' : 'down'} size={14} />
          </div>
          {expandedRow === 'streak' && (
            <div className="stats-row-detail">Complete your exercises at least 7 out of the past 10 days to keep your streak.</div>
          )}
        </div>

        <div className={`stats-row-group${expandedRow === 'rate' ? ' stats-row-group-open' : ''}`}>
          <div className="stats-row stats-row-expandable" onClick={() => toggleRow('rate')}>
            <span className="stats-row-icon"><Icon name="calendar" size={18} /></span>
            <span className="stats-row-label">Practice Rate</span>
            <span className="stats-row-value">{rate}/10 days</span>
            <Icon name={expandedRow === 'rate' ? 'up' : 'down'} size={14} />
          </div>
          {expandedRow === 'rate' && (
            <div className="stats-row-detail">This is how many days you've practiced these past 10 days.</div>
          )}
        </div>

        <div className="stats-row">
          <span className="stats-row-icon"><Icon name="book" size={18} /></span>
          <span className="stats-row-label">Total Verses</span>
          <span className="stats-row-value">{activeVerses.length}</span>
        </div>

        {total > 0 && (
          <div className="stats-otnt">
            <div className="stats-otnt-bar">
              {otCount > 0 && <div className="stats-otnt-ot" style={{ flex: otPct }} />}
              {ntCount > 0 && <div className="stats-otnt-nt" style={{ flex: 1 - otPct }} />}
            </div>
            <div className="stats-otnt-labels">
              <span className="stats-otnt-lbl stats-otnt-lbl-ot">OT · {Math.round(otPct * 100)}%</span>
              <span className="stats-otnt-lbl stats-otnt-lbl-nt">NT · {Math.round((1 - otPct) * 100)}%</span>
            </div>
          </div>
        )}

        <div className="stats-meta">Cards in deck: {verses.length}</div>

        <div className="stats-section-hdr">
          <span className="stats-section-title">Books</span>
          <span className="stats-section-count">{activeBooks.size} book{activeBooks.size !== 1 ? 's' : ''}</span>
        </div>
        <div className="stats-books-grid">
          {ALL_BOOKS.map(book => (
            <div
              key={book.f}
              className={`stats-book-cell${activeBooks.has(book.f) ? ' stats-book-active' : ''}`}
              title={book.f}
            >
              {book.a}
            </div>
          ))}
        </div>

        <div className="stats-section-hdr">
          <span className="stats-section-title">Verses</span>
          <span className="stats-section-count">{activeVerses.length} verse{activeVerses.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="stats-verses">
          {activeVerses.length === 0 && (
            <p className="stats-empty">Start learning verses to see your stats.</p>
          )}
          {activeVerses.map(v => {
            const entry = progress[v.id] || {};
            const scores = entry.scores || [];
            const accuracyPct = scores.length
              ? scores.reduce((s, x) => s + x, 0) / scores.length
              : 0;
            const intervalMs = Math.max(1, (entry.next_review || now) - (entry.last_seen || now));
            const elapsedMs = now - (entry.last_seen || now);
            const sessionPct = Math.max(0, 1 - elapsedMs / intervalMs);
            const skill = entry.skill_level || 'easy';
            const masteryFill = SKILL_FILL[skill] ?? 1 / 3;
            const daysSince = entry.last_seen ? Math.floor((now - entry.last_seen) / 86400000) : null;
            const lastLabel = daysSince === null ? 'Never practiced'
              : daysSince === 0 ? 'Last practiced today'
              : `Last practiced ${daysSince} day${daysSince !== 1 ? 's' : ''} ago`;
            return (
              <div key={v.id} className="stats-verse-row">
                <div className="stats-verse-row-top">
                  <span className="stats-verse-ref">{v.reference}</span>
                  <span className={`stats-verse-badge stats-badge-${skill}`}>{skill}</span>
                  <div className="stats-verse-rings">
                    <MiniRing pct={accuracyPct} color="var(--color-info)" />
                    <MiniRing pct={sessionPct} color="var(--color-brand)" />
                    <MiniRing pct={masteryFill} color="var(--color-mastery)" />
                  </div>
                </div>
                <div className="stats-verse-detail">
                  Accuracy {Math.round(accuracyPct * 100)}% · {lastLabel} · Mastery {Math.round(masteryFill * 100)}%
                </div>
              </div>
            );
          })}
        </div>

      </div>
      </div>
      </div>
  );
}
