import { useState, useEffect, useRef } from 'react';
import { VERSES } from '../data/verses.js';
import { PATTERNS, avatarStyle } from '../data/avatarStyle.js';
import { saveAuth } from '../data/auth.js';
import { fetchKJV, fetchBSB } from '../api/bible.js';

const TRANSLATIONS = [
  { value: 'kjv',  abbr: 'KJV',  name: 'King James Version' },
  { value: 'bsb',  abbr: 'BSB',  name: 'Berean Study Bible' },
  { value: 'esv',  abbr: 'ESV',  name: 'English Standard Version' },
  { value: 'niv',  abbr: 'NIV',  name: 'New International Version' },
  { value: 'nkjv', abbr: 'NKJV', name: 'New King James Version' },
  { value: 'nasb', abbr: 'NASB', name: 'New American Standard Bible' },
];

const PRESETS = ['#3a8c5c','#2a6ab5','#9a3a3a','#7a5c9a','#9a6c10','#3a7a8c','#555555','#c0392b'];

const AGE_GROUPS = [
  { value: 'child', label: 'Child', sub: 'under 10' },
  { value: 'youth', label: 'Youth', sub: '10–17' },
  { value: 'adult', label: 'Adult', sub: '18+' },
];

function Logo() {
  return (
    <div className="ob-logo">
      <span className="ttl-memory">Memory</span><span className="ttl-dot-bible ob-logo-bible">.bible</span>
    </div>
  );
}

function StepDots({ step }) {
  return (
    <div className="ob-dots">
      {[1, 2, 3].map(n => (
        <div key={n} className={`ob-dot${step === n ? ' ob-dot-active' : step > n ? ' ob-dot-done' : ''}`} />
      ))}
    </div>
  );
}

// ── Screen 0: Welcome ───────────────────────────────────────────────────────

function WelcomeScreen({ onStart, onSkip, onLogin }) {
  return (
    <div className="ob-screen">
      <div className="ob-content">
        <Logo />
        <p className="ob-tagline">Treasure His Word in your heart.</p>

        <ul className="ob-bullets">
          <li>Choose from curated verse sets</li>
          <li>Add your own selected verses</li>
          <li>Schedule a daily reminder</li>
          <li>Have fun while learning God's Word</li>
        </ul>

        <button className="ob-btn-primary" onClick={onStart}>Get Started →</button>

        <div className="ob-links">
          <button className="ob-link" onClick={onSkip}>Skip setup</button>
          <button className="ob-link ob-link-login" onClick={onLogin}>Already have an account? Log in</button>
        </div>
      </div>
    </div>
  );
}

// ── Screen 1: Translation ───────────────────────────────────────────────────

function TranslationScreen({ translation, onChange, onNext }) {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <div className="ob-screen">
      <div className="ob-content">
        <Logo />
        <StepDots step={1} />
        <h2 className="ob-title">Choose your preferred translation</h2>
        <p className="ob-note">You can change this at any time, or set individual verses to a different translation.</p>

        <button className="ob-help-link" onClick={() => setShowHelp(true)}>
          Not sure which to choose?
        </button>

        <div className="ob-translation-list">
          {TRANSLATIONS.map(t => (
            <button
              key={t.value}
              className={`ob-translation-row${translation === t.value ? ' ob-translation-selected' : ''}`}
              onClick={() => onChange(t.value)}
            >
              <span className="ob-translation-abbr">{t.abbr}</span>
              <span className="ob-translation-name">{t.name}</span>
              {translation === t.value && <span className="ob-check">✓</span>}
            </button>
          ))}
        </div>

        <button className="ob-btn-primary" onClick={onNext} disabled={!translation}>Next →</button>

        {showHelp && (
          <div className="ob-overlay ob-overlay-center" onClick={() => setShowHelp(false)}>
            <div className="ob-popup ob-popup-center" onClick={e => e.stopPropagation()}>
              <div className="ob-popup-hdr">
                <span className="ob-popup-title">About Bible Translations</span>
                <button className="ob-popup-close" onClick={() => setShowHelp(false)}>✕</button>
              </div>
              <div className="ob-popup-body">
                <p>More translation guidance coming soon.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Screen 2: Pick first verse ──────────────────────────────────────────────

const PREF_VERSION_ORDER = ['kjv', 'bsb', 'esv', 'niv', 'nkjv', 'nasb'];

function verseText(v, verseCache) {
  const cached = verseCache?.[v.reference] || {};
  for (const t of PREF_VERSION_ORDER) {
    if (cached[t]) return cached[t];
  }
  return null;
}

function VerseScreen({ selectedId, onSelect, onNext, verseCache }) {
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(10);
  const [localCache, setLocalCache] = useState({});
  const fetchingRef = useRef(new Set());

  const merged = { ...verseCache, ...localCache };

  const filtered = VERSES.filter(v =>
    v.reference.toLowerCase().includes(search.toLowerCase())
  );
  const visible = search ? filtered : filtered.slice(0, limit);

  useEffect(() => {
    const toFetch = visible.filter(v => !merged[v.reference]);
    toFetch.forEach(v => {
      if (fetchingRef.current.has(v.reference)) return;
      fetchingRef.current.add(v.reference);
      fetchKJV(v.reference)
        .then(kjv => kjv
          ? setLocalCache(prev => ({ ...prev, [v.reference]: { ...prev[v.reference], kjv } }))
          : fetchBSB(v.reference).then(bsb => bsb &&
              setLocalCache(prev => ({ ...prev, [v.reference]: { ...prev[v.reference], bsb } }))
          )
        )
        .catch(() => {});
    });
  }, [limit, search]);

  return (
    <div className="ob-screen">
      <div className="ob-content ob-content-full">
        <div className="ob-content-inner">
          <Logo />
          <StepDots step={2} />
          <h2 className="ob-title">Pick your first verse</h2>
          <p className="ob-note">Choose a verse to start memorising. You can add more later.</p>
        </div>

        <div className="ob-verse-search-row">
          <input
            className="ob-verse-search"
            placeholder="Search references…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="ob-verse-list">
          {visible.map(v => {
            const selected = selectedId === v.id;
            return (
              <button
                key={v.id}
                className={`ob-verse-card${selected ? ' ob-verse-selected' : ''}`}
                onClick={() => onSelect(selected ? null : v.id)}
              >
                <div className="ob-verse-card-hdr">
                  <span className="ob-verse-ref">{v.reference}</span>
                  {selected && <span className="ob-check">✓</span>}
                </div>
                {text
                  ? <p className="ob-verse-text">{text}</p>
                  : <p className="ob-verse-text ob-verse-text-empty">Loading…</p>
                }
              </button>
            );
          })}
          {!search && limit < filtered.length && (
            <button className="ob-verse-more" onClick={() => setLimit(l => l + 10)}>
              Show more ({filtered.length - limit} remaining) ↓
            </button>
          )}
        </div>

        <div className="ob-verse-footer">
          <button className="ob-btn-primary" onClick={onNext}>
            {selectedId ? 'Next →' : 'Skip for now →'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Screen 3: Personalise ───────────────────────────────────────────────────

function PersonaliseScreen({ user, name, setName, bracket, setBracket, colour, setColour, pattern, setPattern, onComplete }) {
  const [showAccount, setShowAccount] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accountError, setAccountError] = useState('');
  const [accountBusy, setAccountBusy] = useState(false);

  async function handleComplete() {
    if (showAccount && email.trim()) {
      setAccountBusy(true);
      setAccountError('');
      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim(), password }),
        });
        const data = await res.json();
        if (!res.ok) {
          setAccountError(data.error || 'Registration failed.');
          setAccountBusy(false);
          return;
        }
        saveAuth({ token: data.token, accountId: data.account_id, email: email.trim() });
        onComplete({ auth: { token: data.token, accountId: data.account_id, email: email.trim() } });
        return;
      } catch {
        setAccountError('Could not connect. You can create an account later in your profile.');
        setAccountBusy(false);
        return;
      }
    }
    onComplete({});
  }

  const previewUser = { ...user, colour, pattern, name: name || 'You' };

  return (
    <div className="ob-screen">
      <div className="ob-content">
        <Logo />
        <StepDots step={3} />
        <h2 className="ob-title">Personalise your experience</h2>

        {/* Avatar preview */}
        <div className="ob-avatar-preview" style={{ ...avatarStyle(colour, pattern) }}>
          {(name || 'Y').charAt(0).toUpperCase()}
        </div>

        {/* Colour */}
        <label className="ob-field-label">Colour</label>
        <div className="swatches ob-swatches">
          {PRESETS.map(c => (
            <div
              key={c}
              className={`swatch${colour === c ? ' selected' : ''}`}
              style={{ backgroundColor: c }}
              onClick={() => setColour(c)}
            />
          ))}
        </div>

        {/* Pattern */}
        <label className="ob-field-label">Pattern</label>
        <div className="swatches ob-swatches">
          {PATTERNS.map(p => (
            <div
              key={p.id}
              className={`swatch${pattern === p.id ? ' selected' : ''}`}
              style={avatarStyle(colour, p.id)}
              onClick={() => setPattern(p.id)}
              title={p.label}
            />
          ))}
        </div>

        {/* Name */}
        <label className="ob-field-label">First name</label>
        <input
          className="ob-input"
          type="text"
          placeholder="Your name"
          value={name}
          onChange={e => setName(e.target.value)}
        />

        {/* Age group */}
        <label className="ob-field-label">Age group</label>
        <div className="ob-age-group">
          {AGE_GROUPS.map(g => (
            <button
              key={g.value}
              className={`ob-age-btn${bracket === g.value ? ' ob-age-selected' : ''}`}
              onClick={() => setBracket(g.value)}
            >
              <span className="ob-age-label">{g.label}</span>
              <span className="ob-age-sub">{g.sub}</span>
            </button>
          ))}
        </div>

        {/* Optional account */}
        <div className="ob-account-section">
          {!showAccount ? (
            <button className="ob-link ob-account-toggle" onClick={() => setShowAccount(true)}>
              + Back up my progress with a free account
            </button>
          ) : (
            <div className="ob-account-form">
              <div className="ob-account-hdr">
                <span className="ob-account-title">Create a free account</span>
                <button className="ob-link ob-account-skip" onClick={() => setShowAccount(false)}>Maybe later</button>
              </div>
              <input
                className="ob-input"
                type="email"
                placeholder="Email address"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoCapitalize="none"
              />
              <input
                className="ob-input"
                type="password"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              {accountError && <div className="ob-account-error">{accountError}</div>}
            </div>
          )}
        </div>

        <button className="ob-btn-primary" onClick={handleComplete} disabled={accountBusy}>
          {accountBusy ? 'Setting up…' : 'Complete →'}
        </button>
      </div>
    </div>
  );
}

// ── Main flow ───────────────────────────────────────────────────────────────

export default function OnboardingFlow({ currentUser, verseCache, onComplete, onLogin }) {
  const [step, setStep] = useState(0); // 0=welcome 1=translation 2=verse 3=personalise
  const [translation, setTranslation] = useState(currentUser.translation || 'kjv');
  const [selectedVerseId, setSelectedVerseId] = useState(null);
  const [name, setName] = useState(currentUser.name === 'Guest' ? '' : currentUser.name);
  const [bracket, setBracket] = useState(currentUser.bracket || 'adult');
  const [colour, setColour] = useState(currentUser.colour || PRESETS[0]);
  const [pattern, setPattern] = useState(currentUser.pattern || 'none');

  function finish({ auth }) {
    const updatedUser = {
      ...currentUser,
      name: name.trim() || 'Guest',
      translation,
      bracket,
      colour,
      pattern,
      bracket_updated: Date.now(),
    };
    onComplete(updatedUser, selectedVerseId, auth || null);
  }

  if (step === 0) return (
    <WelcomeScreen
      onStart={() => setStep(1)}
      onSkip={() => finish({})}
      onLogin={onLogin}
    />
  );

  if (step === 1) return (
    <TranslationScreen
      translation={translation}
      onChange={setTranslation}
      onNext={() => setStep(2)}
    />
  );

  if (step === 2) return (
    <VerseScreen
      selectedId={selectedVerseId}
      onSelect={setSelectedVerseId}
      onNext={() => setStep(3)}
      verseCache={verseCache}
    />
  );

  return (
    <PersonaliseScreen
      user={currentUser}
      name={name} setName={setName}
      bracket={bracket} setBracket={setBracket}
      colour={colour} setColour={setColour}
      pattern={pattern} setPattern={setPattern}
      onComplete={finish}
    />
  );
}
