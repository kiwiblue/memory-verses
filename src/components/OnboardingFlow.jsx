import { useState, useEffect, useRef } from 'react';
import { VERSES } from '../data/verses.js';
import { PATTERNS, avatarStyle, DEFAULT_PATTERN_OPACITY, PATTERN_OPACITY_MIN, PATTERN_OPACITY_MAX } from '../data/avatarStyle.js';
import { saveAuth } from '../data/auth.js';
import { parseRef, toDisplayRef } from '../api/bibleRef.js';
import { fetchTranslation, fetchKJV } from '../api/bible.js';
import { APP_VERSION } from '../data/version.js';
import AuthPanel from './AuthPanel.jsx';
import Icon from './Icon.jsx';
import TranslationGuide from './TranslationGuide.jsx';
import { logEvent } from '../data/telemetry.js';

function ObFooter() {
  return <div className="ob-footer">v{APP_VERSION}</div>;
}

const TRANSLATIONS = [
  { value: 'kjv',  abbr: 'KJV',  name: 'King James Version' },
  { value: 'bsb',  abbr: 'BSB',  name: 'Berean Study Bible' },
  { value: 'esv',  abbr: 'ESV',  name: 'English Standard Version' },
  { value: 'niv',  abbr: 'NIV',  name: 'New International Version' },
  { value: 'nkjv', abbr: 'NKJV', name: 'New King James Version' },
  { value: 'nasb', abbr: 'NASB', name: 'New American Standard Bible' },
];

// Curated avatar palette — harmonises with the neutral + indigo theme, spans
// warm/cool evenly, and every colour is deep enough for white initials to stay
// readable (all ≥3.9:1 contrast with white). Teal (index 0) is the default.
const PRESETS = ['#2f868d','#3d6fc0','#5b57c4','#9450a6','#bb4a68','#bc5f3a','#3f8f5f','#5a6675'];

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

const WELCOME_FEATURES = [
  { icon: 'book',      tint: 'teal',   text: 'Curated verse collections' },
  { icon: 'add',       tint: 'indigo', text: 'Add your own verses' },
  { icon: 'streak',    tint: 'gold',   text: 'Daily reminders & streaks' },
  { icon: 'celebrate', tint: 'rose',   text: "Fun ways to learn God's Word" },
];

function WelcomeScreen({ onStart, onSkip, onLogin }) {
  return (
    <div className="ob-screen ob-screen-welcome">
      <div className="ob-content">
        <div className="ob-hero">
          <img className="ob-appicon" src="/icons/icon-192.png" alt="" width="96" height="96" />
          <Logo />
        </div>

        <h1 className="ob-headline">
          Treasure <em>His Word</em> in your heart.
        </h1>
        <p className="ob-subline">Memorise Scripture a few minutes a day — for the whole family, at every age.</p>

        <div className="ob-features">
          {WELCOME_FEATURES.map(f => (
            <div key={f.icon} className="ob-feature">
              <span className={`ob-feature-ico ob-tint-${f.tint}`}><Icon name={f.icon} size={18} /></span>
              <span className="ob-feature-text">{f.text}</span>
            </div>
          ))}
        </div>

        <button className="ob-btn-primary ob-btn-hero" onClick={onStart}>Get Started →</button>

        <div className="ob-links">
          <button className="ob-link" onClick={onSkip}>Skip setup</button>
          <button className="ob-link ob-link-login" onClick={onLogin}>Already have an account? Log in</button>
        </div>
        <ObFooter />
      </div>
    </div>
  );
}

// ── Screen 1: Translation ───────────────────────────────────────────────────

function TranslationScreen({ translation, onChange, onNext, onBack }) {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <div className="ob-screen">
      <div className="ob-content">
        <Logo />
        <button className="ob-link ob-back-link" onClick={onBack}>← Back</button>
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
        <ObFooter />

        {showHelp && <TranslationGuide onClose={() => setShowHelp(false)} />}
      </div>
    </div>
  );
}

// ── Screen 2: Pick first verse ──────────────────────────────────────────────

function verseText(v, translation, verseCache, fetched) {
  if (translation && translation !== 'kjv') {
    if (verseCache?.[v.reference]?.[translation]) return verseCache[v.reference][translation];
    if (fetched?.[v.reference]) return fetched[v.reference];
    return null; // still loading
  }
  return v.kjv || null;
}

function VerseScreen({ selectedId, onSelect, onNext, onBack, translation, verseCache }) {
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(10);
  // apiResult: null | 'loading' | { reference, kjv } | 'not-found'
  const [apiResult, setApiResult] = useState(null);
  // Per-verse text fetched for the chosen translation during this session
  const [fetched, setFetched] = useState({});
  // Per-verse fetch failure flag, so a genuine network error shows a retry
  // instead of an eternal "Loading…"
  const [failed, setFailed] = useState({});
  const fetchedRef = useRef({});
  const debounceRef = useRef(null);

  // Normalise the search term so "Roman" matches "Romans", "1john" matches "1 John", etc.
  const normSearch = (() => {
    if (!search.trim()) return '';
    try {
      const p = parseRef(search.trim());
      return p ? toDisplayRef(p).toLowerCase() : search.toLowerCase();
    } catch { return search.toLowerCase(); }
  })();

  const filtered = VERSES.filter(v => {
    const matchesSearch = v.reference.toLowerCase().includes(normSearch || search.toLowerCase());
    // Without a search, hide youth-only verses (mature themes); searching reveals all brackets
    const matchesBracket = search.trim() ? true : v.bracket !== 'youth';
    return matchesSearch && matchesBracket;
  });
  const visible = search ? filtered : filtered.slice(0, limit);

  // Fetch the chosen translation for any visible verses not yet in verseCache or fetched state
  useEffect(() => {
    if (!translation || translation === 'kjv') return; // KJV already embedded
    const needed = visible.filter(v => {
      if (verseCache?.[v.reference]?.[translation]) return false;
      if (fetchedRef.current[v.reference] !== undefined) return false;
      return true;
    });
    if (!needed.length) return;
    // Mark as in-progress immediately to avoid duplicate fetches
    needed.forEach(v => { fetchedRef.current[v.reference] = null; });
    needed.forEach(v => fetchOne(v));
  }, [visible.map(v => v.reference).join(','), translation]);

  async function fetchOne(v) {
    setFailed(prev => {
      if (!prev[v.reference]) return prev;
      const next = { ...prev }; delete next[v.reference]; return next;
    });
    try {
      const text = await fetchTranslation(v.reference, translation);
      fetchedRef.current[v.reference] = text || v.kjv;
      setFetched(prev => ({ ...prev, [v.reference]: text || v.kjv }));
    } catch {
      // Genuine network failure — surface a retry instead of looping forever
      delete fetchedRef.current[v.reference];
      setFailed(prev => ({ ...prev, [v.reference]: true }));
    }
  }

  function retryFetch(v) {
    fetchedRef.current[v.reference] = null;
    fetchOne(v);
  }

  // When search changes, debounce an API lookup if the exact reference isn't in the curated list
  useEffect(() => {
    clearTimeout(debounceRef.current);
    setApiResult(null);
    if (!search.trim()) return;

    const parsed = parseRef(search.trim());
    if (!parsed) return; // not a recognisable reference format

    const reference = toDisplayRef(parsed);
    const exactInCurated = VERSES.some(v => v.reference.toLowerCase() === reference.toLowerCase());
    if (exactInCurated) return; // already in curated list, no need to fetch

    setApiResult('loading');
    debounceRef.current = setTimeout(async () => {
      try {
        const text = await fetchKJV(reference);
        setApiResult(text ? { reference, kjv: text } : 'not-found');
      } catch {
        setApiResult('not-found');
      }
    }, 500);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  function clearSearch() {
    setSearch('');
    setApiResult(null);
  }

  // A custom verse from the API — give it a synthetic id (negative) so selection works
  const API_VERSE_ID = -1;

  return (
    <div className="ob-screen ob-screen-verse">
      <div className="ob-verse-screen-top">
        <Logo />
        <button className="ob-link ob-back-link" onClick={onBack}>← Back</button>
        <StepDots step={2} />
        <h2 className="ob-title">Pick your first verse</h2>
        <p className="ob-note">Choose a verse to start memorising. You can add more later.</p>

        <div className="ob-verse-search-wrap">
          <input
            className="ob-verse-search"
            placeholder="Search references…"
            value={search}
            onChange={e => { setSearch(e.target.value); setLimit(10); }}
          />
          {search && (
            <button className="ob-verse-search-clear" onClick={clearSearch} aria-label="Clear search">✕</button>
          )}
        </div>

        <div className="ob-verse-list">
          {visible.map(v => {
            const selected = selectedId === v.id;
            const text = verseText(v, translation, verseCache, fetched);
            const hasFailed = !text && failed[v.reference];
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
                {text ? (
                  <p className="ob-verse-text">{text}</p>
                ) : hasFailed ? (
                  <p
                    className="ob-verse-text ob-verse-text-error"
                    onClick={e => { e.stopPropagation(); retryFetch(v); }}
                  >
                    Couldn't load — <span className="ob-verse-retry">Tap to retry</span>
                  </p>
                ) : (
                  <p className="ob-verse-text ob-verse-text-empty">Loading…</p>
                )}
              </button>
            );
          })}

          {/* API result for exact reference not in curated list */}
          {search && apiResult === 'loading' && (
            <p className="ob-verse-text ob-verse-text-empty" style={{ textAlign: 'center', padding: '12px 0' }}>Searching…</p>
          )}
          {search && apiResult === 'not-found' && filtered.length === 0 && (
            <p className="ob-verse-text ob-verse-text-empty" style={{ textAlign: 'center', padding: '12px 0' }}>Verse not found. Try a format like "John 3:16".</p>
          )}
          {search && apiResult && apiResult !== 'loading' && apiResult !== 'not-found' && (
            <button
              className={`ob-verse-card${selectedId === API_VERSE_ID ? ' ob-verse-selected' : ''}`}
              onClick={() => {
                if (selectedId === API_VERSE_ID) {
                  onSelect(null);
                } else {
                  // Pass the api result as a special selection
                  onSelect(API_VERSE_ID, apiResult);
                }
              }}
            >
              <div className="ob-verse-card-hdr">
                <span className="ob-verse-ref">{apiResult.reference}</span>
                {selectedId === API_VERSE_ID && <span className="ob-check">✓</span>}
              </div>
              <p className="ob-verse-text">{apiResult.kjv}</p>
            </button>
          )}

          {!search && limit < filtered.length && (
            <button className="ob-verse-more" onClick={() => setLimit(l => l + 10)}>
              Show more ({filtered.length - limit} remaining) ↓
            </button>
          )}
        </div>
      </div>

      <div className="ob-verse-screen-footer">
        <button className="ob-btn-primary" onClick={onNext}>
          {selectedId ? 'Next →' : 'Skip for now →'}
        </button>
        <ObFooter />
      </div>
    </div>
  );
}

// ── Screen 3: Personalise ───────────────────────────────────────────────────

function PersonaliseScreen({ user, name, setName, bracket, setBracket, colour, setColour, pattern, setPattern, patternOpacity, setPatternOpacity, onComplete, onBack }) {
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

  return (
    <div className="ob-screen">
      <div className="ob-content">
        <Logo />
        <button className="ob-link ob-back-link" onClick={onBack}>← Back</button>
        <StepDots step={3} />
        <h2 className="ob-title">Personalise</h2>

        {/* Avatar + pickers row */}
        <div className="ob-personalise-top">
          <div className="ob-personalise-left">
            <label className="ob-field-label" style={{ marginTop: 0 }}>Colour</label>
            <div className="swatches ob-swatches">
              {PRESETS.map(c => (
                <div key={c} className={`swatch${colour === c ? ' selected' : ''}`}
                  style={{ backgroundColor: c }} onClick={() => setColour(c)} />
              ))}
            </div>
            <label className="ob-field-label">Pattern</label>
            <div className="swatches ob-swatches">
              {PATTERNS.map(p => (
                <div key={p.id} className={`swatch${pattern === p.id ? ' selected' : ''}`}
                  style={avatarStyle(colour, p.id, patternOpacity)} onClick={() => setPattern(p.id)} title={p.label} />
              ))}
            </div>
            <div className={`pm-field pm-fade-field${pattern === 'none' ? ' pm-fade-disabled' : ''}`}>
              <label className="pm-label">Pattern fade</label>
              <input
                type="range"
                className="pm-fade-slider"
                min={PATTERN_OPACITY_MIN} max={PATTERN_OPACITY_MAX} step={0.01}
                value={patternOpacity}
                disabled={pattern === 'none'}
                onChange={e => setPatternOpacity(parseFloat(e.target.value))}
              />
            </div>
          </div>
          <div className="ob-avatar-preview ob-avatar-side" style={{ ...avatarStyle(colour, pattern, patternOpacity) }}>
            {(name || 'Y').charAt(0).toUpperCase()}
          </div>
        </div>

        {/* Name */}
        <label className="ob-field-label">Name</label>
        <input className="ob-input" type="text" placeholder="Your name"
          value={name} onChange={e => setName(e.target.value)} />

        {/* Age group */}
        <label className="ob-field-label">Age Group</label>
        <div className="ob-age-group">
          {AGE_GROUPS.map(g => (
            <button key={g.value}
              className={`ob-age-btn${bracket === g.value ? ' ob-age-selected' : ''}`}
              onClick={() => setBracket(g.value)}>
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
              <input className="ob-input" type="email" placeholder="Email address" autoComplete="email"
                value={email} onChange={e => setEmail(e.target.value)} autoCapitalize="none" />
              <input className="ob-input" type="password" placeholder="Password" autoComplete="new-password"
                value={password} onChange={e => setPassword(e.target.value)} />
              {accountError && <div className="ob-account-error">{accountError}</div>}
            </div>
          )}
        </div>

        <button className="ob-btn-primary" onClick={handleComplete} disabled={accountBusy}>
          {accountBusy ? 'Setting up…' : 'Complete →'}
        </button>
        <ObFooter />
      </div>
    </div>
  );
}

// ── Login screen (onboarding path) ─────────────────────────────────────────
function OnboardingLoginScreen({ currentUser, onBack, onLoginComplete }) {
  // AuthPanel calls onUsersChange then onAuthChange when login succeeds.
  // Track both and fire onLoginComplete once we have auth + users.
  const pendingRef = useRef({});

  function handleAuthChange(auth) {
    pendingRef.current.auth = auth;
    if (auth?.token && pendingRef.current.users) {
      onLoginComplete(auth, pendingRef.current.users, pendingRef.current.switchTo);
    }
  }

  function handleUsersChange(users, switchTo) {
    pendingRef.current.users = users;
    pendingRef.current.switchTo = switchTo;
    if (pendingRef.current.auth?.token) {
      onLoginComplete(pendingRef.current.auth, users, switchTo);
    }
  }

  return (
    <div className="ob-screen">
      <div className="ob-content">
        <Logo />
        <h2 className="ob-title" style={{ marginBottom: 4 }}>Welcome back</h2>
        <p className="ob-note" style={{ marginBottom: 20 }}>Sign in to restore your progress.</p>
        <AuthPanel
          auth={{ token: null, accountId: null, email: null }}
          users={[currentUser]}
          syncStatus={null}
          lastSynced={null}
          onAuthChange={handleAuthChange}
          onUsersChange={handleUsersChange}
        />
        <button className="ob-link" style={{ marginTop: 20 }} onClick={onBack}>← Back</button>
        <ObFooter />
      </div>
    </div>
  );
}

// ── Main flow ───────────────────────────────────────────────────────────────

export default function OnboardingFlow({ currentUser, verseCache, onComplete, onLogin }) {
  const [step, setStep] = useState(0); // 0=welcome 1=translation 2=verse 3=personalise
  const [showLogin, setShowLogin] = useState(false);
  const [translation, setTranslation] = useState(currentUser.translation || 'kjv');
  const [selectedVerseId, setSelectedVerseId] = useState(null);
  const [customVerse, setCustomVerse] = useState(null); // { reference, kjv } for API-fetched verses
  const [name, setName] = useState(currentUser.name === 'Guest' ? '' : currentUser.name);
  const [bracket, setBracket] = useState(currentUser.bracket || 'adult');
  const [colour, setColour] = useState(currentUser.colour || PRESETS[0]);
  const [pattern, setPattern] = useState(currentUser.pattern || 'none');
  const [patternOpacity, setPatternOpacity] = useState(currentUser.patternOpacity ?? DEFAULT_PATTERN_OPACITY);

  function finish({ auth }) {
    const updatedUser = {
      ...currentUser,
      name: name.trim() || 'Guest',
      translation,
      bracket,
      colour,
      pattern,
      patternOpacity,
      bracket_updated: Date.now(),
    };
    onComplete(updatedUser, selectedVerseId, auth || null, customVerse);
  }

  if (showLogin) return (
    <OnboardingLoginScreen
      currentUser={currentUser}
      onBack={() => setShowLogin(false)}
      onLoginComplete={(auth, users, switchTo) => onLogin(auth, users, switchTo)}
    />
  );

  if (step === 0) return (
    <WelcomeScreen
      onStart={() => { logEvent('onboarding_step_complete', { step: 0 }); setStep(1); }}
      onSkip={() => finish({})}
      onLogin={() => setShowLogin(true)}
    />
  );

  if (step === 1) return (
    <TranslationScreen
      translation={translation}
      onChange={setTranslation}
      onNext={() => { logEvent('onboarding_step_complete', { step: 1, translation }); setStep(2); }}
      onBack={() => setStep(0)}
    />
  );

  if (step === 2) return (
    <VerseScreen
      selectedId={selectedVerseId}
      onSelect={(id, apiVerse) => {
        setSelectedVerseId(id);
        setCustomVerse(apiVerse || null);
      }}
      onNext={() => { logEvent('onboarding_step_complete', { step: 2, verse_id: selectedVerseId }); setStep(3); }}
      onBack={() => setStep(1)}
      translation={translation}
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
      patternOpacity={patternOpacity} setPatternOpacity={setPatternOpacity}
      onComplete={(arg) => { logEvent('onboarding_step_complete', { step: 3 }); finish(arg); }}
      onBack={() => setStep(2)}
    />
  );
}
