import { useState, useEffect, useRef } from 'react';
import { VERSES } from '../data/verses.js';
import { PATTERNS, avatarStyle, DEFAULT_PATTERN_OPACITY, PATTERN_OPACITY_MIN, PATTERN_OPACITY_MAX } from '../data/avatarStyle.js';
import { saveAuth } from '../data/auth.js';
import { parseRef, toDisplayRef } from '../api/bibleRef.js';
import { fetchTranslation, fetchKJV } from '../api/bible.js';
import { APP_VERSION } from '../data/version.js';
import AuthPanel from './AuthPanel.jsx';
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
        <ObFooter />
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
        <ObFooter />

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

function verseText(v, translation, verseCache, fetched) {
  if (translation && translation !== 'kjv') {
    if (verseCache?.[v.reference]?.[translation]) return verseCache[v.reference][translation];
    if (fetched?.[v.reference]) return fetched[v.reference];
    return null; // still loading
  }
  return v.kjv || null;
}

function VerseScreen({ selectedId, onSelect, onNext, translation, verseCache }) {
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(10);
  // apiResult: null | 'loading' | { reference, kjv } | 'not-found'
  const [apiResult, setApiResult] = useState(null);
  // Per-verse text fetched for the chosen translation during this session
  const [fetched, setFetched] = useState({});
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
    needed.forEach(async v => {
      const text = await fetchTranslation(v.reference, translation);
      fetchedRef.current[v.reference] = text || v.kjv;
      setFetched(prev => ({ ...prev, [v.reference]: text || v.kjv }));
    });
  }, [visible.map(v => v.reference).join(','), translation]);

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

function PersonaliseScreen({ user, name, setName, bracket, setBracket, colour, setColour, pattern, setPattern, patternOpacity, setPatternOpacity, reminders, setReminders, onComplete }) {
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

        {/* Reminders */}
        <label className="ob-field-label">Reminders</label>
        <div className="ob-reminder-row">
          <span className="ob-reminder-label">Daily Memory Reminder</span>
          <button
            className={`ob-toggle${reminders ? ' ob-toggle-on' : ''}`}
            onClick={() => setReminders(r => !r)}
            aria-label={reminders ? 'Turn off reminders' : 'Turn on reminders'}
          />
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
              <input className="ob-input" type="email" placeholder="Email address"
                value={email} onChange={e => setEmail(e.target.value)} autoCapitalize="none" />
              <input className="ob-input" type="password" placeholder="Password"
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
  const [reminders, setReminders] = useState(() => {
    try { return localStorage.getItem(`mv-reminders-${currentUser.id}`) === 'true'; } catch { return false; }
  });

  function finish({ auth }) {
    try { localStorage.setItem(`mv-reminders-${currentUser.id}`, reminders ? 'true' : 'false'); } catch {}
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
      reminders={reminders} setReminders={setReminders}
      onComplete={(arg) => { logEvent('onboarding_step_complete', { step: 3 }); finish(arg); }}
    />
  );
}
