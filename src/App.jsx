import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import './App.css';

import { VERSES } from './data/verses.js';
import { loadUsers, saveUsers, loadCurrentUserId, saveCurrentUserId, loadVerseTranslations, saveVerseTranslations } from './data/users.js';
import { loadAuth, saveAuth, clearAuth } from './data/auth.js';
import { pushSync } from './data/syncService.js';
import { loadProgress, saveProgress, getEntry } from './data/progress.js';
import { recordAttempt, buildDailyQueue, progressStats } from './data/spacedRepetition.js';
import { loadCustomVerses, addCustomVerse, removeCustomVerse, saveCustomVerses } from './data/customVerses.js';
import { loadHiddenVerseIds, hideVerseId, saveHiddenVerseIds } from './data/hiddenVerses.js';
import { loadVerseCache, saveVerseCache, mergeVerseIntoCache } from './data/verseCache.js';
import { fetchVerse } from './api/bible.js';
import { appendReviseLog } from './data/reviseLog.js';
import { loadVerseOrder, saveVerseOrder } from './data/verseOrder.js';

import FlipCard from './components/FlipCard.jsx';
import ModeTabs from './components/ModeTabs.jsx';
import ProgressBar from './components/ProgressBar.jsx';
import StudyControls from './components/StudyControls.jsx';
import TestControls from './components/TestControls.jsx';
import StatPills from './components/StatPills.jsx';
import QueueComplete from './components/QueueComplete.jsx';
import VersionSelector from './components/VersionSelector.jsx';
import UserPanel from './components/UserPanel.jsx';
import ProfileModal from './components/ProfileModal.jsx';
import AddVersePanel from './components/AddVersePanel.jsx';
import VerseDeckPanel from './components/VerseDeckPanel.jsx';
import OnboardingFlow from './components/OnboardingFlow.jsx';
import { isOnboarded, markOnboarded } from './data/onboarding.js';
import { APP_VERSION } from './data/version.js';

const ATTRIBUTION = {
  esv:  'ESV® © 2001 Crossway. All rights reserved.',
  niv:  'NIV © 1973, 1978, 1984, 2011 Biblica, Inc. All rights reserved.',
  nkjv: 'NKJV © 1982 Thomas Nelson. All rights reserved.',
  nasb: 'NASB © 1960–1995 The Lockman Foundation. All rights reserved.',
  bsb:  'BSB © 2016, 2020 Bible Hub. All rights reserved.',
};

function ensureDefaultUser(users) {
  if (users.length > 0) return users;
  const guest = {
    id: crypto.randomUUID(),
    name: 'Guest',
    bracket: 'adult',
    bracket_updated: Date.now(),
    colour: '#3a8c5c',
    translation: 'kjv',
  };
  saveUsers([guest]);
  saveCurrentUserId(guest.id);
  return [guest];
}

function initUser() {
  const us = ensureDefaultUser(loadUsers());
  const id = loadCurrentUserId() || us[0].id;
  return us.find(u => u.id === id) || us[0];
}

export default function App() {
  const [mode, setMode]           = useState('learn');
  const [isFlipped, setIsFlipped] = useState(false);
  const [browseIndex, setBrowseIndex] = useState(0);  // used in revise mode
  const [queueIndex, setQueueIndex]   = useState(0);  // used in learn mode

  const [users, setUsers]             = useState(() => ensureDefaultUser(loadUsers()));
  const [currentUser, setCurrentUser] = useState(initUser);
  const [version, setVersion]         = useState(() => initUser().translation || 'kjv');

  const [progress, setProgress]             = useState(() => loadProgress(initUser().id));
  const [verseTranslations, setVerseTranslations] = useState(() => loadVerseTranslations(initUser().id));
  const [customVerses, setCustomVerses]     = useState(() => loadCustomVerses(initUser().id));
  const [hiddenIds, setHiddenIds]           = useState(() => loadHiddenVerseIds(initUser().id));
  const [verseCache, setVerseCache]         = useState(() => loadVerseCache());

  const [verseOrder, setVerseOrder]   = useState(() => loadVerseOrder(initUser().id));
  const [showDeckPanel, setShowDeckPanel] = useState(false);
  const [removeConfirm, setRemoveConfirm] = useState(false);

  const [onboarded, setOnboarded]     = useState(isOnboarded);
  const [profileUser, setProfileUser] = useState(null);
  const [auth, setAuth]               = useState(loadAuth);
  const [syncStatus, setSyncStatus]   = useState(null); // null | 'syncing' | 'synced' | 'error'
  const [lastSynced, setLastSynced]   = useState(null);
  const syncTimer = useRef(null);

  const [showBracketReminder, setShowBracketReminder] = useState(() => {
    const u = initUser();
    if (!u.bracket || u.bracket === 'adult') return false;
    return u.bracket_updated && (Date.now() - u.bracket_updated) > 365 * 24 * 60 * 60 * 1000;
  });

  // All eligible verses merged with cached text, hidden ones removed, custom order applied
  const allVerses = useMemo(() => {
    const base = [...VERSES, ...customVerses]
      .filter(v => !hiddenIds.has(v.id))
      .map(v => ({ ...v, ...(verseCache[v.reference] || {}) }));

    if (verseOrder.length > 0) {
      // User has set a custom order via drag/drop — respect it exactly
      const orderMap = new Map(verseOrder.map((id, i) => [String(id), i]));
      return [...base].sort((a, b) => {
        const ai = orderMap.has(String(a.id)) ? orderMap.get(String(a.id)) : Infinity;
        const bi = orderMap.has(String(b.id)) ? orderMap.get(String(b.id)) : Infinity;
        return ai - bi;
      });
    }

    // Default sort: learning → unseen (custom-added first) → mastered
    const STATUS_PRI = { learning: 0, unseen: 1, mastered: 2 };
    return [...base].sort((a, b) => {
      const as = progress[a.id]?.status || 'unseen';
      const bs = progress[b.id]?.status || 'unseen';
      if (STATUS_PRI[as] !== STATUS_PRI[bs]) return STATUS_PRI[as] - STATUS_PRI[bs];
      // Within unseen: custom (user-added) verses rise to the top
      if (as === 'unseen') {
        if (a.custom && !b.custom) return -1;
        if (!a.custom && b.custom) return 1;
      }
      return 0;
    });
  }, [customVerses, hiddenIds, verseCache, verseOrder, progress]);

  // Daily queue (learn mode) — recomputed when progress or verses change
  const dailyQueue = useMemo(() =>
    buildDailyQueue(allVerses, progress, currentUser.bracket || 'adult'),
    [allVerses, progress, currentUser.bracket]
  );

  // Capture the queue at session start so it can be replayed after completion
  const sessionQueueRef = useRef([]);
  useEffect(() => {
    if (dailyQueue.length > 0) sessionQueueRef.current = dailyQueue;
  }, [dailyQueue]);

  // Revise mode only shows verses the user has started (learning or mastered)
  const reviseVerses = useMemo(() =>
    allVerses.filter(v => {
      const s = progress[v.id]?.status;
      return s === 'learning' || s === 'mastered';
    }),
    [allVerses, progress]
  );

  const queueDone  = mode === 'learn' && queueIndex >= dailyQueue.length;
  const verse      = mode === 'learn'
    ? (dailyQueue[queueIndex] ?? null)
    : (reviseVerses[browseIndex] || reviseVerses[0] || null);

  const stats = useMemo(() =>
    progressStats(allVerses, progress, currentUser.bracket || 'adult'),
    [allVerses, progress, currentUser.bracket]
  );

  // Persist progress whenever it changes, then schedule a cloud sync
  useEffect(() => {
    if (currentUser) {
      saveProgress(currentUser.id, progress);
      scheduleSync(auth, users);
    }
  }, [progress, currentUser]);

  // Fetch translation text for the active verse when not yet cached
  useEffect(() => {
    if (!verse) return;
    const activeVersion = verseTranslations[verse.id] || version;
    if (verse[activeVersion]) return;
    fetchVerse(verse.reference).then(data => {
      setVerseCache(prev => {
        const updated = mergeVerseIntoCache(prev, data);
        saveVerseCache(updated);
        return updated;
      });
    }).catch(() => {});
  }, [verse?.reference, verse ? (verseTranslations[verse.id] || version) : null]);

  // Debounced cloud sync — fires 10s after any progress change, if signed in
  const scheduleSync = useCallback((currentAuth, currentUsers) => {
    if (!currentAuth?.token) return;
    clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(async () => {
      setSyncStatus('syncing');
      try {
        await pushSync(currentAuth.token, currentUsers);
        setSyncStatus('synced');
        setLastSynced(Date.now());
      } catch {
        setSyncStatus('error');
      }
    }, 10_000);
  }, []);

  const handleAuthChange = useCallback((newAuth) => {
    setAuth(newAuth);
    if (newAuth.token) saveAuth(newAuth);
    else clearAuth();
  }, []);

  const handleModeChange = useCallback((newMode) => {
    setMode(newMode);
    setIsFlipped(false);
  }, []);

  // Learn mode: record score (1=know it, 0=still learning) then advance queue
  const handleMark = useCallback((score) => {
    if (!verse) return;
    setProgress(prev => ({
      ...prev,
      [verse.id]: recordAttempt(getEntry(prev, verse.id), score),
    }));
    setQueueIndex(i => i + 1);
    setIsFlipped(false);
  }, [verse]);

  // Revise mode / skip: advance without scoring
  const goNext = useCallback(() => {
    if (mode === 'learn') {
      setQueueIndex(i => i + 1);
    } else {
      setBrowseIndex(i => (i + 1) % Math.max(reviseVerses.length, 1));
    }
    setIsFlipped(false);
  }, [mode, reviseVerses.length]);

  const goPrev = useCallback(() => {
    setBrowseIndex(i => Math.max(0, i - 1));
    setIsFlipped(false);
  }, []);

  const handleFlip   = useCallback(() => { setIsFlipped(f => !f); }, []);
  const handleReveal = useCallback(() => { setIsFlipped(true); }, []);

  // Reset remove confirm whenever the active verse changes
  useEffect(() => { setRemoveConfirm(false); }, [verse?.id]);

  const handleUserChange = useCallback((user) => {
    setCurrentUser(user);
    saveCurrentUserId(user.id);
    setProgress(loadProgress(user.id));
    setVerseTranslations(loadVerseTranslations(user.id));
    setCustomVerses(loadCustomVerses(user.id));
    setHiddenIds(loadHiddenVerseIds(user.id));
    setVersion(user.translation || 'kjv');
    setVerseOrder(loadVerseOrder(user.id));
    setQueueIndex(0);
    setBrowseIndex(0);
    setIsFlipped(false);
    setRemoveConfirm(false);
    if (user.bracket && user.bracket !== 'adult') {
      const msPerYear = 365 * 24 * 60 * 60 * 1000;
      setShowBracketReminder(user.bracket_updated && (Date.now() - user.bracket_updated) > msPerYear);
    } else {
      setShowBracketReminder(false);
    }
  }, []);

  const handleAddVerse = useCallback((v) => {
    setCustomVerses(addCustomVerse(currentUser.id, v));
  }, [currentUser.id]);

  const handleRemoveVerse = useCallback(() => {
    if (!verse) return;
    if (verse.custom) {
      setCustomVerses(removeCustomVerse(currentUser.id, verse.id));
    } else {
      setHiddenIds(new Set(hideVerseId(currentUser.id, verse.id)));
    }
    setIsFlipped(false);
  }, [verse, currentUser.id]);

  const handleVerseTranslationChange = useCallback((verseId, translation) => {
    setVerseTranslations(prev => {
      const updated = { ...prev };
      if (!translation || translation === version) delete updated[verseId];
      else updated[verseId] = translation;
      saveVerseTranslations(currentUser.id, updated);
      return updated;
    });
  }, [currentUser.id, version]);

  const handleUsersChange = useCallback((updated) => {
    setUsers(updated);
    saveUsers(updated);
  }, []);

  const handleReorderDeck = useCallback((orderedIds) => {
    setVerseOrder(orderedIds);
    saveVerseOrder(currentUser.id, orderedIds);
  }, [currentUser.id]);

  const handleRemoveVerseById = useCallback((verse) => {
    if (verse.custom) {
      setCustomVerses(removeCustomVerse(currentUser.id, verse.id));
    } else {
      setHiddenIds(new Set(hideVerseId(currentUser.id, verse.id)));
    }
  }, [currentUser.id]);

  const handleOnboardingComplete = useCallback((updatedUser, selectedVerseId, auth, customVerse) => {
    // Save updated user profile
    const updatedUsers = users.map(u => u.id === updatedUser.id ? updatedUser : u);
    saveUsers(updatedUsers);
    setUsers(updatedUsers);
    setCurrentUser(updatedUser);
    setVersion(updatedUser.translation || 'kjv');

    // If user picked a custom (API-fetched) verse, add it to their deck
    let resolvedVerseId = selectedVerseId;
    if (selectedVerseId === -1 && customVerse) {
      const newVerse = addCustomVerse(updatedUser.id, {
        reference: customVerse.reference,
        kjv: customVerse.kjv,
      });
      setCustomVerses(prev => [...prev, newVerse]);
      resolvedVerseId = newVerse.id;
    }

    // Move selected verse to front of queue
    if (resolvedVerseId && resolvedVerseId !== -1) {
      const allIds = [...VERSES.map(v => String(v.id))];
      const ordered = [String(resolvedVerseId), ...allIds.filter(id => id !== String(resolvedVerseId))];
      saveVerseOrder(updatedUser.id, ordered);
      setVerseOrder(ordered);
    }

    // Save auth if account was created during onboarding
    if (auth?.token) {
      saveAuth(auth);
      setAuth(auth);
    }

    markOnboarded();
    setOnboarded(true);
  }, [users]);

  const handleLearnNow = useCallback((verse) => {
    setProgress(p => ({
      ...p,
      [verse.id]: {
        ...(p[verse.id] || {}),
        status: 'learning',
        next_review: Date.now() - 1,
      },
    }));
  }, []);

  const handleRestartQueue = useCallback(() => {
    const now = Date.now() - 1;
    setProgress(p => {
      const updates = {};
      for (const v of sessionQueueRef.current) {
        if (p[v.id]) updates[v.id] = { ...p[v.id], next_review: now };
      }
      return { ...p, ...updates };
    });
    setQueueIndex(0);
  }, []);

  const handleMirrorDeck = useCallback((targetUserIds) => {
    targetUserIds.forEach(uid => {
      saveCustomVerses(uid, customVerses);
      saveHiddenVerseIds(uid, hiddenIds);
      saveVerseOrder(uid, verseOrder);
    });
  }, [customVerses, hiddenIds, verseOrder]);

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.code === 'Space' && mode === 'learn') { e.preventDefault(); handleFlip(); }
      if (e.code === 'ArrowRight') goNext();
      if (e.code === 'KeyK') handleMark(1);
      if (e.code === 'KeyL') handleMark(0);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleFlip, goNext, handleMark]);

  // Use the preferred version, but fall back to first available translation
  // if the preferred one has no data (e.g. API key not configured)
  const FALLBACK_ORDER = ['kjv', 'bsb', 'esv', 'niv', 'nkjv', 'nasb'];
  const activeVersion = (() => {
    const preferred = verse ? (verseTranslations[verse.id] || version) : version;
    if (!verse || verse[preferred]) return preferred;
    return FALLBACK_ORDER.find(t => verse[t]) || preferred;
  })();

  if (!onboarded) return (
    <OnboardingFlow
      currentUser={currentUser}
      verseCache={verseCache}
      onComplete={handleOnboardingComplete}
      onLogin={() => { markOnboarded(); setOnboarded(true); setProfileUser(currentUser); }}
    />
  );

  return (
    <>
      {showDeckPanel && (
        <VerseDeckPanel
          verses={allVerses}
          progress={progress}
          dailyQueue={dailyQueue}
          currentUser={currentUser}
          users={users}
          onReorder={handleReorderDeck}
          onRemoveVerse={handleRemoveVerseById}
          onLearnNow={handleLearnNow}
          onMirror={handleMirrorDeck}
          onClose={() => setShowDeckPanel(false)}
        />
      )}

      {profileUser && (
        <ProfileModal
          user={profileUser}
          users={users}
          stats={profileUser.id === currentUser.id ? stats : null}
          auth={auth}
          syncStatus={syncStatus}
          lastSynced={lastSynced}
          onAuthChange={handleAuthChange}
          onUsersChange={(merged, switchTo) => {
            setUsers(merged);
            if (switchTo) handleUserChange(switchTo);
          }}
          onSave={(updated, updatedUsers) => {
            setUsers(updatedUsers);
            if (updated.id === currentUser.id) handleUserChange(updated);
            setProfileUser(null);
            scheduleSync(auth, updatedUsers);
          }}
          onDelete={(remaining) => {
            setUsers(remaining);
            if (profileUser.id === currentUser.id && remaining.length > 0) handleUserChange(remaining[0]);
            setProfileUser(null);
          }}
          onClose={() => setProfileUser(null)}
        />
      )}

      <div className="scene">
      <div className="hdr">
        <UserPanel users={users} currentUser={currentUser}
          onUserChange={handleUserChange} onUsersChange={handleUsersChange}
          onOpenProfile={(u) => setProfileUser(u)} />
        <div className="ttl">
          <span className="ttl-memory">Memory</span><span className="ttl-dot-bible" style={{ color: currentUser?.colour || '#3a8c5c' }}>.bible</span>
        </div>
      </div>

      {showBracketReminder && (
        <div className="bracket-reminder">
          Is <strong>{currentUser.name}</strong>'s age group still correct?{' '}
          <span className="bracket-reminder-link" onClick={() => setShowBracketReminder(false)}>
            Update in profile
          </span>
          <button className="bracket-reminder-close" onClick={() => setShowBracketReminder(false)}>✕</button>
        </div>
      )}

      {mode === 'learn'
        ? <ProgressBar current={Math.min(queueIndex + 1, dailyQueue.length)} total={dailyQueue.length} label="today" />
        : <ProgressBar current={reviseVerses.length ? browseIndex + 1 : 0} total={reviseVerses.length} />
      }

      <ModeTabs mode={mode} onChange={handleModeChange} />

      {queueDone ? (
        <QueueComplete stats={stats} onBrowse={() => handleModeChange('revise')} onRestart={handleRestartQueue} />
      ) : mode === 'revise' && reviseVerses.length === 0 ? (
        <div className="revise-empty">
          <div className="revise-empty-icon">📖</div>
          <div className="revise-empty-title">Nothing to revise yet</div>
          <div className="revise-empty-sub">Complete a Learn session first — verses you've started will appear here.</div>
          <button className="btn" onClick={() => handleModeChange('learn')}>Start Learning →</button>
        </div>
      ) : (
        <>
          <FlipCard
            verse={verse}
            version={activeVersion}
            defaultVersion={version}
            verseTranslations={verseTranslations}
            isFlipped={isFlipped}
            mode={mode}
            onFlip={handleFlip}
            onVerseTranslationChange={handleVerseTranslationChange}
          />

          {mode === 'learn' && (
            <StudyControls onMark={handleMark} onNext={goNext} />
          )}
          {mode === 'revise' && (
            <TestControls
              verse={verse} version={version}
              isFlipped={isFlipped} onFlip={handleFlip} onReveal={handleReveal} onNext={goNext}
              onPrev={goPrev} hasPrev={browseIndex > 0}
              onAttemptEnd={entry => appendReviseLog(currentUser.id, entry)}
            />
          )}

          <div className="remove-row">
            {removeConfirm ? (
              <>
                <span className="remove-confirm-label">Remove this verse?</span>
                <button className="remove-confirm-no" onClick={() => setRemoveConfirm(false)}>Cancel</button>
                <button className="remove-confirm-yes" onClick={() => { handleRemoveVerse(); setRemoveConfirm(false); }}>Yes, remove</button>
              </>
            ) : (
              <button className="remove-verse-btn" onClick={() => setRemoveConfirm(true)}>
                Remove from my deck
              </button>
            )}
          </div>
        </>
      )}

      <StatPills stats={stats} />

      <div className="deck-manage-row">
        <button className="deck-manage-btn" onClick={() => setShowDeckPanel(true)}>
          Manage my deck ({allVerses.length})
        </button>
      </div>

      <AddVersePanel allVerses={allVerses} customVerses={customVerses}
        currentUser={currentUser} preferredVersion={version} onAddVerse={handleAddVerse} />

      <footer className="app-footer">
        {ATTRIBUTION[activeVersion] && (
          <div className="footer-attribution">
            {ATTRIBUTION[activeVersion]}
            {['niv','nkjv','nasb'].includes(activeVersion) && (
              <>{' '}<a href="https://api.bible" target="_blank" rel="noopener noreferrer" className="footer-link">api.bible</a></>
            )}
          </div>
        )}
        <div className="footer-credit">
          © {new Date().getFullYear()} Chris Sandford · v{APP_VERSION}
        </div>
      </footer>
      </div>
    </>
  );
}
