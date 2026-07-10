// Full-screen "Choosing a translation" guide, opened from onboarding step 1's
// "Not sure which to choose?" link. Purely informational — no state beyond
// scroll position. Spectrum positions follow the Bible Editions translation-
// philosophy spectrum (NASB → ESV → NKJV → NIV → CSB → NLT → MSG), with
// KJV/BSB placed per Bible Gateway's versions-guide classification.

import { useModalA11y } from '../hooks/useModalA11y.js';

// The app's six translations, staggered across two chip rows so the labels
// never collide at phone widths.
const SPECTRUM_ROW_A = [
  { abbr: 'NASB', pos: 4 },
  { abbr: 'KJV',  pos: 24 },
  { abbr: 'BSB',  pos: 44 },
];
const SPECTRUM_ROW_B = [
  { abbr: 'ESV',  pos: 13 },
  { abbr: 'NKJV', pos: 33 },
  { abbr: 'NIV',  pos: 60 },
];
const DOT_POSITIONS = [4, 13, 24, 33, 44, 60];

// Familiar versions we don't offer — orientation only.
const CONTEXT_MARKS = [
  { abbr: 'CSB', pos: 52 },
  { abbr: 'NLT', pos: 78 },
  { abbr: 'MSG', pos: 94 },
];

const DEFINITIONS = [
  {
    key: 'w', letter: 'W',
    title: 'Word-for-word', sub: 'formal equivalence',
    body: 'Translates each Hebrew or Greek word as directly as possible, keeping the original structure. The most precise wording — sometimes a little formal to read.',
    whoLabel: 'In the app:', who: 'NASB · ESV · KJV · NKJV',
  },
  {
    key: 'b', letter: 'B',
    title: 'Balanced', sub: 'blend of both',
    body: 'Accurate to the original and natural to read. A great all-rounder for daily reading and for families.',
    whoLabel: 'In the app:', who: 'BSB · NIV',
  },
  {
    key: 't', letter: 'T',
    title: 'Thought-for-thought', sub: 'dynamic equivalence',
    body: 'Translates the meaning of whole phrases into everyday English. Clearest for brand-new readers, but the wording is less literal.',
    whoLabel: 'Examples:', who: 'NLT · GNT', whoNote: '(not offered here)',
  },
];

const COMPARISONS = [
  { key: 'w', tag: 'Word-for-word',      text: '“And be not conformed to this world: but be ye transformed by the renewing of your mind…”', version: 'KJV' },
  { key: 'b', tag: 'Balanced',           text: '“Do not conform to the pattern of this world, but be transformed by the renewing of your mind…”', version: 'NIV' },
  { key: 't', tag: 'Thought-for-thought', text: '“Don\'t copy the behavior and customs of this world, but let God transform you into a new person by changing the way you think…”', version: 'NLT' },
];

export default function TranslationGuide({ onClose }) {
  const modalRef = useModalA11y(onClose);
  return (
    <div className="tg-screen" ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="tg-title">
      <div className="tg-content">
        <div className="tg-header">
          <button className="tg-back" onClick={onClose} aria-label="Back">‹</button>
          <span className="tg-title" id="tg-title">Choosing a translation</span>
        </div>

        <p className="tg-intro">
          Every Bible translation balances two goals: staying close to the original Hebrew &amp; Greek
          words, and reading naturally in English. There's no wrong choice — just different strengths.
        </p>

        {/* ── Spectrum infographic ── */}
        <div className="tg-card">
          <p className="tg-card-title">Where each translation sits</p>
          <div className="tg-spec">
            <div className="tg-spec-row tg-spec-row-a">
              {SPECTRUM_ROW_A.map(t => (
                <span key={t.abbr} className="tg-chip" style={{ left: `${t.pos}%` }}>{t.abbr}</span>
              ))}
            </div>
            <div className="tg-spec-row tg-spec-row-b">
              {SPECTRUM_ROW_B.map(t => (
                <span key={t.abbr} className="tg-chip" style={{ left: `${t.pos}%` }}>{t.abbr}</span>
              ))}
            </div>
            <div className="tg-bar">
              {DOT_POSITIONS.map(p => <span key={p} className="tg-dot" style={{ left: `${p}%` }} />)}
            </div>
            <div className="tg-ctx">
              {CONTEXT_MARKS.map(t => (
                <span key={t.abbr} style={{ left: `${t.pos}%` }}>{t.abbr}</span>
              ))}
            </div>
            <div className="tg-ends">
              <span className="tg-end tg-end-w">Word-for-word</span>
              <span className="tg-end tg-end-b">Balanced</span>
              <span className="tg-end tg-end-t">Thought-for-thought</span>
            </div>
            <p className="tg-note">
              Grey = not offered in Memory.bible, shown for comparison. The Message (MSG) is a
              paraphrase — a retelling rather than a translation.
            </p>
          </div>
        </div>

        {/* ── Definitions ── */}
        {DEFINITIONS.map(d => (
          <div key={d.key} className={`tg-def tg-def-${d.key}`}>
            <span className="tg-def-ico">{d.letter}</span>
            <div>
              <h3 className="tg-def-title">{d.title} <small>· {d.sub}</small></h3>
              <p className="tg-def-body">{d.body}</p>
              <span className="tg-def-who">{d.whoLabel} <b>{d.who}</b>{d.whoNote && <> <small>{d.whoNote}</small></>}</span>
            </div>
          </div>
        ))}

        {/* ── Same verse, three ways ── */}
        <div className="tg-card">
          <p className="tg-card-title tg-card-title-left">The same verse, three ways</p>
          <p className="tg-ref">Romans 12:2</p>
          {COMPARISONS.map(c => (
            <div key={c.key} className={`tg-cmp tg-cmp-${c.key}`}>
              <span className="tg-cmp-tag">{c.tag}</span>
              <p className="tg-cmp-txt">{c.text} <span className="tg-cmp-ver">— {c.version}</span></p>
            </div>
          ))}
        </div>

        {/* ── Memorising tip ── */}
        <div className="tg-tip">
          <h3>Tip for memorising</h3>
          <p>Pick the translation your church or family already uses — hearing it often does half the work for you.</p>
          <p><b>Word-for-word</b> versions keep wording precise and stable. <b>Balanced</b> versions are usually easiest for children. And you can change the translation for any verse, at any time.</p>
        </div>

        <button className="ob-btn-primary" onClick={onClose}>Got it — back to setup</button>
      </div>
    </div>
  );
}
