import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import './App.css';

import { VERSES } from './data/verses.js';
import { loadUsers, saveUsers, loadCurrentUserId, saveCurrentUserId, loadVerseTranslations, saveVerseTranslations } from './data/users.js';
import { loadAuth, saveAuth, clearAuth } from './data/auth.js';
import { pushSync } from './data/syncService.js';
import { loadProgress, saveProgress, getEntry } from './data/progress.js';
import { recordAttempt, startRevising, recordReviseAttempt, buildDailyQueue, progressStats } from './data/spacedRepetition.js';
import { loadCustomVerses, addCustomVerse, removeCustomVerse, saveCustomVerses } from './data/customVerses.js';
import { loadHiddenVerseIds, hideVerseId, restoreVerseId, restoreAllVerseIds, saveHiddenVerseIds } from './data/hiddenVerses.js';
import { loadVerseCache, saveVerseCache, mergeVerseIntoCache } from './data/verseCache.js';
import { fetchVerse } from './api/bible.js';
import { appendReviseLog } from './data/reviseLog.js';
import { loadVerseOrder, saveVerseOrder } from './data/verseOrder.js';

import FlipCard from './components/FlipCard.jsx';
import Drawer from './components/Drawer.jsx';
import MainScreen from './components/MainScreen.jsx';
import VerseScreen from './components/VerseScreen.jsx';
import LearnRevealScreen from './components/LearnRevealScreen.jsx';
import SelectExercise from './components/exercises/SelectExercise.jsx';
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
import LearnPanel from './components/LearnPanel.jsx';
import RevisePanel from './components/RevisePanel.jsx';
import FillExercise from './components/exercises/FillExercise.jsx';
import TypeExercise from './components/exercises/TypeExercise.jsx';
import MatchExercise from './components/exercises/MatchExercise.jsx';
import { isOnboarded, markOnboarded } from './data/onboarding.js';
import { loadStreak, touchStreak } from './data/streak.js';
import { APP_VERSION } from './data/version.js';
import { logEvent } from './data/telemetry.js';
import StatsScreen from './components/StatsScreen.jsx';
import AdminPanel from './components/AdminPanel.jsx';
import FeedbackModal from './components/FeedbackModal.jsx';

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
  const [mode, setMode]           = useState('home');
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
  const [verseScreenVerse, setVerseScreenVerse] = useState(null);
  const [learnRevealVerse, setLearnRevealVerse] = useState(null);
  const [selectExVerse, setSelectExVerse] = useState(null);
  const [removeConfirm, setRemoveConfirm] = useState(false);

  const [onboarded, setOnboarded]     = useState(isOnboarded);
  const [profileUser, setProfileUser] = useState(null);
  const [auth, setAuth]               = useState(loadAuth);
  const [showFeedback, setShowFeedback] = useState(false);
  const [syncStatus, setSyncStatus]   = useState(null); // null | 'syncing' | 'synced' | 'error'
  const [lastSynced, setLastSynced]   = useState(null);
  const syncTimer = useRef(null);

  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [streak, setStreak] = useState(() => loadStreak(initUser().id).days);
  const [showStats, setShowStats] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

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

  const todayCount = useMemo(
    () => reviseVerses.filter(v => (progress[v.id]?.next_review ?? 0) <= Date.now()).length,
    [reviseVerses, progress]
  );

  const nextUnseen = useMemo(
    () => allVerses.find(v => !progress[v.id] || progress[v.id].status === 'unseen') ?? null,
    [allVerses, progress]
  );

  // Log session start once per session when the app is ready
  useEffect(() => {
    if (!onboarded) return;
    logEvent('session_start', { bracket: currentUser.bracket || 'adult', registered: !!auth?.token });
  }, [onboarded]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const handleDrawerAction = useCallback((id) => {
    if (id === 'exercises')    { handleModeChange('revise'); }
    else if (id === 'learn')   { handleModeChange('learn'); }
    else if (id === 'deck')    { setShowDeckPanel(true); }
    else if (id === 'profile') { setProfileUser(currentUser); }
    else if (id === 'theme')   { setTheme(t => t === 'light' ? 'dark' : 'light'); }
    else if (id === 'add-verse') { handleModeChange('add-verse'); }
    else if (id === 'stats')    { setShowStats(true); }
    // 'auth', 'add-member', 'about', 'support', 'feedback' — later phases
  }, [currentUser, handleModeChange]);

  const handleTouchStreak = useCallback(() => {
    const updated = touchStreak(currentUser.id);
    setStreak(updated.days);
  }, [currentUser.id]);

  // Learn mode: record score (1=know it, 0=still learning) then advance queue
  const handleMark = useCallback((score) => {
    if (!verse) return;
    setProgress(prev => ({
      ...prev,
      [verse.id]: recordAttempt(getEntry(prev, verse.id), score),
    }));
    setQueueIndex(i => i + 1);
    setIsFlipped(false);
    handleTouchStreak();
  }, [verse, handleTouchStreak]);

  // "I've got it for now" — move verse to Revise at easy, advance Learn queue
  const handleGotItForNow = useCallback(() => {
    if (!verse) return;
    setProgress(prev => ({
      ...prev,
      [verse.id]: startRevising(getEntry(prev, verse.id)),
    }));
    setQueueIndex(i => i + 1);
    setIsFlipped(false);
    handleTouchStreak();
  }, [verse, handleTouchStreak]);

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
    logEvent('verse_added', { source: 'search' });
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

  const handleResetVerse = useCallback((v) => {
    setProgress(prev => {
      const updated = { ...prev };
      delete updated[v.id];
      return updated;
    });
  }, []);

  const handleRestoreVerse = useCallback((verseId) => {
    setHiddenIds(new Set(restoreVerseId(currentUser.id, verseId)));
  }, [currentUser.id]);

  const handleRestoreAll = useCallback(() => {
    setHiddenIds(new Set(restoreAllVerseIds(currentUser.id)));
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

  // Defer a verse that's in today's queue by pushing its next_review 7 days out
  const handleLearnLater = useCallback((verse) => {
    setProgress(p => ({
      ...p,
      [verse.id]: {
        ...(p[verse.id] || {}),
        next_review: Date.now() + 7 * 24 * 60 * 60 * 1000,
      },
    }));
  }, []);

  // Unlock the next unseen verse so it enters the learn queue
  const handleLearnNewVerse = useCallback(() => {
    const hasUnseen = allVerses.some(v => {
      const e = progress[v.id];
      return !e || e.status === 'unseen';
    });
    if (!hasUnseen) return;
    setMode('learn');
    setQueueIndex(0);
    setIsFlipped(false);
  }, [allVerses, progress]);

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
      if (e.code === 'KeyK') handleGotItForNow();
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

  // Admin route
  if (new URLSearchParams(window.location.search).has('admin')) return <AdminPanel />;

  // DEV: test exercises via ?fill=easy|moderate|hard or ?type=easy|moderate|hard
  if (import.meta.env.DEV) {
    const params = new URLSearchParams(window.location.search);
    if (params.has('fill') || params.has('type') || params.has('match')) {
      const exType = params.has('fill') ? 'fill' : params.has('type') ? 'type' : 'match';
      const diff = params.get(exType) || 'easy';
      const testVerse = allVerses[0];
      if (exType === 'match') {
        return (
          <div style={{ minHeight: '100vh', background: '#f5f5f3', display: 'flex', alignItems: 'center', padding: '24px 16px' }}>
            <MatchExercise verses={allVerses.slice(0, 4)} difficulty={diff} onComplete={r => alert(`Done! Errors: ${r.errors}`)} />
          </div>
        );
      }
      const Ex = exType === 'fill' ? FillExercise : TypeExercise;
      return (
        <div style={{ minHeight: '100vh', background: '#f5f5f3', display: 'flex', alignItems: 'center', padding: '24px 16px' }}>
          <Ex verse={testVerse} difficulty={diff} onComplete={r => alert(`Done! Errors: ${r.errors}`)} />
        </div>
      );
    }
  }

  if (!onboarded) return (
    <OnboardingFlow
      currentUser={currentUser}
      verseCache={verseCache}
      onComplete={handleOnboardingComplete}
      onLogin={(auth, mergedUsers, switchTo) => {
        if (auth?.token && mergedUsers) {
          saveAuth(auth);
          setAuth(auth);
          setUsers(mergedUsers);
          if (switchTo) handleUserChange(switchTo);
        }
        markOnboarded();
        setOnboarded(true);
      }}
    />
  );

  return (
    <>
      {showDeckPanel && (
        <VerseDeckPanel
          verses={allVerses}
          curatedVerses={VERSES}
          hiddenIds={hiddenIds}
          progress={progress}
          dailyQueue={dailyQueue}
          currentUser={currentUser}
          users={users}
          preferredVersion={version}
          onReorder={handleReorderDeck}
          onRemoveVerse={handleRemoveVerseById}
          onRestoreVerse={handleRestoreVerse}
          onRestoreAll={handleRestoreAll}
          onAddVerse={handleAddVerse}
          onLearnNow={handleLearnNow}
          onLearnLater={handleLearnLater}
          onMirror={handleMirrorDeck}
          onVerseDetails={v => { setVerseScreenVerse(v); setShowDeckPanel(false); }}
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

      {learnRevealVerse && (
        <LearnRevealScreen
          verse={learnRevealVerse}
          version={verseTranslations[learnRevealVerse.id] || version}
          onComplete={() => {
            setProgress(prev => ({
              ...prev,
              [learnRevealVerse.id]: startRevising(getEntry(prev, learnRevealVerse.id)),
            }));
            handleTouchStreak();
            setLearnRevealVerse(null);
          }}
          onClose={() => setLearnRevealVerse(null)}
        />
      )}

      {selectExVerse && (
        <div className="vs-overlay" style={{ zIndex: 500 }}>
          <div className="vs-panel">
            <div className="vs-header">
              <button className="vs-back" onClick={() => setSelectExVerse(null)}>‹</button>
              <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                {selectExVerse.reference}
              </span>
            </div>
            <SelectExercise
              verse={selectExVerse}
              version={verseTranslations[selectExVerse.id] || version}
              difficulty={progress[selectExVerse.id]?.skill_level || 'easy'}
              onComplete={({ errors }) => {
                setProgress(prev => ({
                  ...prev,
                  [selectExVerse.id]: recordReviseAttempt(
                    getEntry(prev, selectExVerse.id),
                    errors === 0 ? 1 : errors <= 2 ? 0.5 : 0
                  ),
                }));
                handleTouchStreak();
                setSelectExVerse(null);
              }}
              onSkip={() => setSelectExVerse(null)}
            />
          </div>
        </div>
      )}

      {verseScreenVerse && (
        <VerseScreen
          verse={verseScreenVerse}
          progress={progress}
          version={version}
          verseTranslations={verseTranslations}
          onVerseTranslationChange={handleVerseTranslationChange}
          onFlipCard={() => {
            const status = progress[verseScreenVerse.id]?.status || 'unseen';
            if (status === 'unseen') {
              setLearnRevealVerse(verseScreenVerse);
              setVerseScreenVerse(null);
            } else {
              setVerseScreenVerse(null);
              handleModeChange('revise');
            }
          }}
          onSelectWord={() => {
            setSelectExVerse(verseScreenVerse);
            setVerseScreenVerse(null);
          }}
          onTypeVerse={() => {
            setVerseScreenVerse(null);
            handleModeChange('revise');
          }}
          onMatchRef={() => {
            setVerseScreenVerse(null);
            handleModeChange('revise');
          }}
          onLessFrequency={() => handleLearnLater(verseScreenVerse)}
          onMoreFrequency={() => {
            setProgress(prev => ({
              ...prev,
              [verseScreenVerse.id]: {
                ...(prev[verseScreenVerse.id] || {}),
                next_review: Date.now() - 1,
              },
            }));
          }}
          onReset={(v) => {
            handleResetVerse(v);
            setVerseScreenVerse(null);
          }}
          onDelete={(v) => {
            handleRemoveVerseById(v);
            setVerseScreenVerse(null);
          }}
          onClose={() => setVerseScreenVerse(null)}
        />
      )}

      {showStats && (
        <StatsScreen
          verses={allVerses}
          progress={progress}
          currentUser={currentUser}
          users={users}
          streak={streak}
          onClose={() => setShowStats(false)}
        />
      )}

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        theme={theme}
        onToggleTheme={() => setTheme(t => t === 'light' ? 'dark' : 'light')}
        auth={auth}
        onAction={handleDrawerAction}
      />

      <div className="scene">
      <div className="hdr">
        <button className="hamburger-btn" onClick={() => setDrawerOpen(true)} aria-label="Open menu">
          <span /><span /><span />
        </button>
        <div className="ttl" onClick={() => handleModeChange('home')} style={{ cursor: 'pointer' }}>
          <span className="ttl-memory">Memory</span><span className="ttl-dot-bible" style={{ color: currentUser?.colour || '#3a8c5c' }}>.bible</span>
        </div>
        <UserPanel users={users} currentUser={currentUser}
          onUserChange={handleUserChange} onUsersChange={handleUsersChange}
          onOpenProfile={(u) => setProfileUser(u)} />
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

      {mode !== 'home' && (mode === 'learn'
        ? <ProgressBar current={Math.min(queueIndex + 1, dailyQueue.length)} total={dailyQueue.length} label="today" />
        : <ProgressBar current={reviseVerses.length ? browseIndex + 1 : 0} total={reviseVerses.length} />
      )}

      {mode === 'home' ? (
        <MainScreen
          verses={allVerses}
          progress={progress}
          currentUser={currentUser}
          version={version}
          defaultVersion={version}
          verseTranslations={verseTranslations}
          onVerseTranslationChange={handleVerseTranslationChange}
          todayCount={todayCount}
          nextUnseen={nextUnseen}
          streak={streak}
          onTodayExercises={() => handleModeChange('revise')}
          onLearnNext={() => nextUnseen && setVerseScreenVerse(nextUnseen)}
          onVerseDetails={v => setVerseScreenVerse(v)}
          onAddVerse={() => handleModeChange('add-verse')}
        />
      ) : queueDone ? (
        <QueueComplete
            stats={stats}
            onBrowse={() => handleModeChange('revise')}
            onRestart={handleRestartQueue}
            onLearnNewVerse={stats.unseen > 0 ? handleLearnNewVerse : null}
          />
      ) : mode === 'revise' ? (
        <RevisePanel
          verses={allVerses}
          progress={progress}
          currentUser={currentUser}
          version={version}
          defaultVersion={version}
          verseTranslations={verseTranslations}
          onVerseTranslationChange={handleVerseTranslationChange}
          onMark={(v, score) => {
            setProgress(prev => ({
              ...prev,
              [v.id]: recordAttempt(getEntry(prev, v.id), score),
            }));
            handleTouchStreak();
          }}
          onLearnNew={() => handleModeChange('learn')}
          onLearnNewVerse={handleLearnNewVerse}
        />
      ) : (
        <>
          <LearnPanel
            verse={verse}
            version={activeVersion}
            defaultVersion={version}
            verseTranslations={verseTranslations}
            onVerseTranslationChange={handleVerseTranslationChange}
            onGotItForNow={handleGotItForNow}
            onNext={goNext}
            onRemove={handleRemoveVerse}
            onLearnNewVerse={handleLearnNewVerse}
          />
        </>
      )}

      {mode !== 'home' && <StatPills stats={stats} />}

      {mode !== 'home' && (
        <div className="deck-manage-row">
          <button className="deck-manage-btn" onClick={() => setShowDeckPanel(true)}>
            Manage my deck ({allVerses.length})
          </button>
        </div>
      )}

      {mode !== 'home' && (
        <AddVersePanel allVerses={allVerses} customVerses={customVerses}
          currentUser={currentUser} preferredVersion={version} onAddVerse={handleAddVerse} />
      )}

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
          {auth?.accountId && (
            <> · <button className="footer-feedback-btn" onClick={() => setShowFeedback(true)}>Feedback</button></>
          )}
        </div>
      </footer>
      {showFeedback && <FeedbackModal onClose={() => setShowFeedback(false)} />}
      </div>
    </>
  );
}
