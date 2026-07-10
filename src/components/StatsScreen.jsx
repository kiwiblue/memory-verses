import { useMemo, useState } from 'react';
import { loadStreak, logicalDateStr } from '../data/streak.js';
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
  let count = 0;
  for (let i = 0; i < 10; i++) {
    if (history.includes(logicalDateStr(Date.now() - i * DAY_MS))) count++;
  }
  return count;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function StreakCalendar({ history, freezeHistory }) {
  const now = new Date();
  const [viewYear,  setViewYear]  = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth()); // 0-indexed

  const todayStr = logicalDateStr();
  const curYear  = now.getFullYear();
  const curMonth = now.getMonth();
  const minDate  = logicalDateStr(Date.now() - 365 * DAY_MS);

  const historySet = new Set(history || []);
  const freezeSet  = new Set(freezeHistory || []);
  const earliest   = history?.length ? [...history].sort()[0] : todayStr;

  const daysInMonth    = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0=Sun
  const isCurrentMonth = viewYear === curYear && viewMonth === curMonth;

  const monthLabel = new Date(viewYear, viewMonth, 1)
    .toLocaleString('default', { month: 'long', year: 'numeric' });

  function goBack() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }
  function goForward() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }

  const canGoBack = new Date(viewYear, viewMonth - 1, 1).toISOString().slice(0, 10) >= minDate.slice(0, 7);

  const cells = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isPracticed  = historySet.has(ds);
    const isFrozen     = freezeSet.has(ds);
    const isToday      = ds === todayStr;
    const isFuture     = ds > todayStr;
    const isUntracked  = ds < earliest;
    cells.push({ d, ds, isPracticed, isFrozen, isToday, isFuture, isUntracked });
  }

  return (
    <div className="streak-cal">
      <div className="streak-cal-header">
        <button className="streak-cal-nav" onClick={goBack} disabled={!canGoBack}>‹</button>
        <span className="streak-cal-month">{monthLabel}</span>
        <button className="streak-cal-nav" onClick={goForward} disabled={isCurrentMonth}>›</button>
      </div>
      <div className="streak-cal-grid">
        {DAY_LABELS.map((l, i) => <div key={i} className="streak-cal-label">{l}</div>)}
        {cells.map((cell, i) => {
          if (!cell) return <div key={`e${i}`} className="streak-cal-empty" />;
          const { d, isPracticed, isFrozen, isToday, isFuture, isUntracked } = cell;
          let cls = 'streak-cal-cell';
          if      (isPracticed)              cls += ' scc-practiced';
          else if (isFrozen)                 cls += ' scc-frozen';
          else if (isFuture || isUntracked)  cls += ' scc-neutral';
          else                               cls += ' scc-missed';
          if (isToday) cls += ' scc-today';
          return (
            <div key={i} className={cls}>
              <span className="scc-day">{d}</span>
              {isPracticed && <span className="scc-icon">✓</span>}
              {isFrozen    && <span className="scc-icon">❄</span>}
            </div>
          );
        })}
      </div>
      <div className="streak-cal-legend">
        <span className="scl-item"><span className="scl-dot scc-practiced" />Practiced</span>
        <span className="scl-item"><span className="scl-dot scc-frozen" />Freeze used</span>
        <span className="scl-item"><span className="scl-dot scc-missed" />Missed</span>
      </div>
    </div>
  );
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
  const today = logicalDateStr();
  const yesterday = logicalDateStr(Date.now() - 86400000);
  const practicedToday = streakData.history?.includes(today);
  const isNewUser = !streakData.history?.length;
  const streakAtRisk = !practicedToday && streakData.lastDate === yesterday && streak > 0;
  const streakBroken = !practicedToday && streakData.lastDate !== yesterday && streak > 0;
  const recentFreezeUsed = streakData.freezeHistory?.includes(yesterday);
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
            <span className={`stats-row-icon${streakAtRisk ? ' streak-icon-risk' : streakBroken ? ' streak-icon-broken' : ''}`}>
              <Icon name="streak" size={18} />
            </span>
            <span className="stats-row-label">Streak</span>
            <span className="stats-row-value">{streak} day{streak !== 1 ? 's' : ''}</span>
            {streakData.freezes > 0 && (
              <span className="streak-freeze-count">❄ {streakData.freezes}</span>
            )}
            {(streakAtRisk || streakBroken) && (
              <span className={`streak-badge${streakBroken ? ' streak-badge-broken' : ''}`}>!</span>
            )}
            <Icon name={expandedRow === 'streak' ? 'up' : 'down'} size={14} />
          </div>
          {expandedRow === 'streak' && (
            <div className="stats-row-detail">
              {isNewUser && <p className="streak-detail-encourage">You're just getting started — great work!</p>}
              {!isNewUser && streakAtRisk && <p className="streak-detail-warn">Practice today to keep your {streak}-day streak!</p>}
              {!isNewUser && recentFreezeUsed && <p className="streak-detail-freeze">Freeze activated. Your streak continues.</p>}
              {!isNewUser && streakBroken && <p className="streak-detail-neutral">No freeze available. New day, fresh start.</p>}

              <div className="streak-freeze-info">
                <span className="streak-freeze-label">
                  {streakData.freezes === 0
                    ? 'No freezes — earn one every 6 consecutive days'
                    : `${streakData.freezes} freeze${streakData.freezes !== 1 ? 's' : ''} available`}
                </span>
                {streak > 0 && (
                  <span className="streak-freeze-next">
                    {streakData.nextFreezeAt - streak === 0
                      ? 'Freeze earned — practice today to collect it!'
                      : `${streakData.nextFreezeAt - streak} day${(streakData.nextFreezeAt - streak) !== 1 ? 's' : ''} to next freeze`}
                  </span>
                )}
              </div>

              <StreakCalendar
                history={streakData.history}
                freezeHistory={streakData.freezeHistory}
              />
            </div>
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
            const scores = (entry.scores || []).filter(x => Number.isFinite(x));
            const accuracyPct = scores.length
              ? scores.reduce((s, x) => s + x, 0) / scores.length
              : 0;
            // Match computeFreshness in VerseScreen exactly so rings are consistent
            let sessionPct = 0;
            if (entry.status !== 'unseen') {
              if (!entry.next_review || !entry.last_seen) {
                sessionPct = 1;
              } else {
                const window = entry.next_review - entry.last_seen;
                if (window > 0) sessionPct = Math.max(0, Math.min(1, (entry.next_review - now) / window));
              }
            }
            const skill = entry.skill_level || 'easy';
            const masteryFill = SKILL_FILL[skill] ?? 1 / 3;
            const msUntilDue = entry.next_review ? entry.next_review - now : null;
            const daysUntilDue = msUntilDue !== null ? Math.ceil(msUntilDue / 86400000) : null;
            const dueLabel = !entry.last_seen ? 'Not yet practiced'
              : msUntilDue === null || msUntilDue <= 0 ? 'Practice overdue'
              : daysUntilDue <= 1 ? 'Due today'
              : `Due in ${daysUntilDue} days`;
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
                  Accuracy {Math.round(accuracyPct * 100)}% · {dueLabel} · Mastery {Math.round(masteryFill * 100)}%
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
