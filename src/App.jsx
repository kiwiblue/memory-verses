import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import './App.css';

import { VERSES } from './data/verses.js';
import { loadUsers, saveUsers, loadCurrentUserId, saveCurrentUserId, loadVerseTranslations, saveVerseTranslations } from './data/users.js';
import { loadAuth, saveAuth, clearAuth } from './data/auth.js';
import { pushSync, pullSync, deleteCloudProfile } from './data/syncService.js';
import { loadProgress, saveProgress, getEntry } from './data/progress.js';
import { recordAttempt, startRevising, recordReviseAttempt, buildDailyQueue, progressStats, computeHintScore, computeNextSkillLevel, getSkillLevel, verseAgeDays } from './data/spacedRepetition.js';
import { loadCustomVerses, addCustomVerse, removeCustomVerse, saveCustomVerses } from './data/customVerses.js';
import { loadHiddenVerseIds, hideVerseId, restoreVerseId, restoreAllVerseIds, saveHiddenVerseIds, loadHiddenMeta, saveHiddenMeta } from './data/hiddenVerses.js';
import { loadVerseCache, saveVerseCache, mergeVerseIntoCache } from './data/verseCache.js';
import { fetchTranslation } from './api/bible.js';
import { appendReviseLog } from './data/reviseLog.js';
import { loadVerseOrder, saveVerseOrder } from './data/verseOrder.js';
import { markSyncPending, isSyncPending, clearSyncPending } from './data/syncMeta.js';
import { mergeProgress, mergeCustomVerses, mergeHiddenMeta, mergeTranslations } from './data/syncMerge.js';

import FlipCard from './components/FlipCard.jsx';
import Drawer from './components/Drawer.jsx';
import MainScreen from './components/MainScreen.jsx';
import VerseScreen from './components/VerseScreen.jsx';
import LearnRevealScreen from './components/LearnRevealScreen.jsx';
import SelectExercise from './components/exercises/SelectExercise.jsx';
import ProgressBar from './components/ProgressBar.jsx';
import StatPills from './components/StatPills.jsx';
import QueueComplete from './components/QueueComplete.jsx';
import UserPanel from './components/UserPanel.jsx';
import { UserSwitcherContext } from './components/UserSwitcherContext.js';
import ProfileModal from './components/ProfileModal.jsx';
import VerseDeckPanel from './components/VerseDeckPanel.jsx';
import OnboardingFlow from './components/OnboardingFlow.jsx';
import LearnPanel from './components/LearnPanel.jsx';
import RevisePanel from './components/RevisePanel.jsx';
import FillExercise from './components/exercises/FillExercise.jsx';
import TypeExercise from './components/exercises/TypeExercise.jsx';
import MatchExercise from './components/exercises/MatchExercise.jsx';
import { isOnboarded, markOnboarded } from './data/onboarding.js';
import { loadStreak, saveStreak, touchStreak, mergeStreaks } from './data/streak.js';
import { APP_VERSION } from './data/version.js';
import { isUpdateAvailable, hardReload } from './data/updateCheck.js';
import { logEvent } from './data/telemetry.js';
import StatsScreen from './components/StatsScreen.jsx';
import AddVerseFlow from './components/AddVerseFlow.jsx';
import AdminPanel from './components/AdminPanel.jsx';
import FeedbackModal from './components/FeedbackModal.jsx';
import InfoModal from './components/InfoModal.jsx';
import InstallAppModal from './components/InstallAppModal.jsx';
import { detectPlatform, isStandalone } from './data/platform.js';
import OverlayHeader from './components/OverlayHeader.jsx';
import Icon from './components/Icon.jsx';
import StyleGuide from './components/StyleGuide.jsx';

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
    colour: '#2f868d',
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
  const [exercise, setExercise] = useState(null); // { verse, kind: 'type'|'select'|'match' }
  const [removeConfirm, setRemoveConfirm] = useState(false);

  const [onboarded, setOnboarded]     = useState(isOnboarded);
  const [profileUser, setProfileUser] = useState(null);
  const [profileInitSubscreen, setProfileInitSubscreen] = useState(null);
  const [userPanelOpen, setUserPanelOpen] = useState(false);
  const [auth, setAuth]               = useState(loadAuth);
  const [showFeedback, setShowFeedback] = useState(false);
  const [infoModal, setInfoModal] = useState(null); // 'about' | 'support' | 'install-app'
  const [installPrompt, setInstallPrompt] = useState(null); // captured beforeinstallprompt event
  const [appInstalled, setAppInstalled] = useState(isStandalone);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [syncStatus, setSyncStatus]   = useState(null); // null | 'syncing' | 'synced' | 'error'
  const [lastSynced, setLastSynced]   = useState(null);
  const syncTimer = useRef(null);

  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [streak, setStreak] = useState(() => loadStreak(initUser().id).days);
  const [streakData, setStreakData] = useState(() => loadStreak(initUser().id));
  const [showStats, setShowStats] = useState(false);
  const [showAddVerse, setShowAddVerse] = useState(false);
  const [reviseAutoStart, setReviseAutoStart] = useState(false); // false | 'today' | 'practice' — auto-launch a queue on entering Revise

  // ── History API: push a state entry each time a panel opens so ‹ and
  //    browser-back both work. popstate closes the topmost open panel.
  const prevPanels = useRef({});
  useEffect(() => {
    const panels = {
      profileUser: !!profileUser,
      showDeckPanel,
      showStats,
      showAddVerse,
      verseScreenVerse: !!verseScreenVerse,
      learnRevealVerse: !!learnRevealVerse,
      exercise: !!exercise,
    };
    const prev = prevPanels.current;
    // Push whenever any panel transitions false→true
    const opened = Object.keys(panels).some(k => panels[k] && !prev[k]);
    if (opened) window.history.pushState({ mv_panel: true }, '');
    prevPanels.current = panels;
  }, [profileUser, showDeckPanel, showStats, showAddVerse, verseScreenVerse, learnRevealVerse, exercise]);

  useEffect(() => {
    function handlePop() {
      // Close highest-z-index open panel first
      if (showAddVerse)       { setShowAddVerse(false);       return; }
      if (exercise)           { setExercise(null);            return; }
      if (learnRevealVerse)   { setLearnRevealVerse(null);    return; }
      if (verseScreenVerse)   { setVerseScreenVerse(null);    return; }
      if (showStats)          { setShowStats(false);          return; }
      if (showDeckPanel)      { setShowDeckPanel(false);      return; }
      if (profileUser)        { setProfileUser(null); setProfileInitSubscreen(null); return; }
    }
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, [showAddVerse, exercise, learnRevealVerse, verseScreenVerse, showStats, showDeckPanel, profileUser]);

  function navBack() { window.history.back(); }

  // Logo is a permanent link to the main screen — close every overlay and reset.
  function goHome() {
    setProfileUser(null); setProfileInitSubscreen(null);
    setShowDeckPanel(false); setShowStats(false); setShowAddVerse(false);
    setVerseScreenVerse(null); setLearnRevealVerse(null); setExercise(null);
    setDrawerOpen(false);
    setMode('home'); setIsFlipped(false);
  }

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    // Keep the browser chrome (status bar / address bar) a fixed colour so it
    // doesn't get stuck dark after an overlay (e.g. the drawer) dims the page.
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#111110' : '#dddbd6');
  }, [theme]);

  // Capture the native "install this app" prompt (Chrome/Edge, desktop & Android)
  // so the drawer's "Add to Home Screen" can trigger it directly on tap instead
  // of just showing instructions. Must preventDefault immediately or the event
  // is lost. iOS/Safari never fires this — those get manual steps instead.
  useEffect(() => {
    function onBeforeInstallPrompt(e) {
      e.preventDefault();
      setInstallPrompt(e);
    }
    function onAppInstalled() {
      setAppInstalled(true);
      setInstallPrompt(null);
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

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

  // Overlays (verse detail, learn-reveal, exercise) store a snapshot of the verse
  // they opened with. Re-resolve it against allVerses each render so freshly
  // fetched translation text shows up instead of being stuck on a stale object.
  const liveVerse = useCallback((snap) =>
    snap ? (allVerses.find(v => String(v.id) === String(snap.id)) || snap) : null,
    [allVerses]);
  const verseScreenVerseLive = useMemo(() => liveVerse(verseScreenVerse), [liveVerse, verseScreenVerse]);
  const learnRevealVerseLive = useMemo(() => liveVerse(learnRevealVerse), [liveVerse, learnRevealVerse]);
  const exerciseVerseLive    = useMemo(() => liveVerse(exercise?.verse),  [liveVerse, exercise]);

  // "Add to Home Screen" drawer link — mobile only, hidden once installed.
  const showInstall = useMemo(() => detectPlatform().mobile && !appInstalled, [appInstalled]);

  const stats = useMemo(() =>
    progressStats(allVerses, progress, currentUser.bracket || 'adult'),
    [allVerses, progress, currentUser.bracket]
  );

  // Local-only ranking: position of each profile by verses learned (among this
  // device's profiles). No global leaderboard backend yet.
  const userRankings = useMemo(() => {
    const totals = users.map(u => {
      const prog = u.id === currentUser.id ? progress : loadProgress(u.id);
      const total = Object.values(prog).filter(e => e?.status === 'learning' || e?.status === 'mastered').length;
      return { id: u.id, total };
    });
    totals.sort((a, b) => b.total - a.total);
    const map = {};
    totals.forEach((t, i) => { map[t.id] = i + 1; });
    return map;
  }, [users, progress, currentUser.id]);

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

  // Check for a newer deployed build — installed PWAs have no browser chrome
  // to hard-refresh from, so a stale install can otherwise sit indefinitely.
  // Checks on load, whenever the app is brought back to the foreground
  // (the realistic "reopened the home-screen icon" moment), and periodically
  // while left open.
  useEffect(() => {
    const check = () => isUpdateAvailable().then(setUpdateAvailable);
    check();
    const onVisible = () => { if (document.visibilityState === 'visible') check(); };
    document.addEventListener('visibilitychange', onVisible);
    const interval = setInterval(check, 15 * 60 * 1000);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      clearInterval(interval);
    };
  }, []);

  // Pull cloud profiles on startup so devices stay in sync
  useEffect(() => {
    if (!auth?.token) return;
    pullSync(auth.token).then(data => {
      const cloudUsers = (data.profiles || []).map(p => JSON.parse(p.profile_json));
      if (cloudUsers.length === 0) return;

      // Both branches below now merge per-field instead of one side winning
      // wholesale — see syncMerge.js for the strategy per field. Streak has
      // its own merge in streak.js. After merging and saving locally, the
      // reconciled result is pushed back to the cloud so both devices
      // converge on the same data instead of just avoiding local data loss.
      //
      // If this device has edits that never got pushed (e.g. the app was
      // closed before the debounced sync fired), the cloud copy may be
      // stale for fields where a blind overwrite would lose that work —
      // hence merging (not overwriting) rather than trusting either side
      // outright. verseOrder is the one exception: there's no reliable way
      // to merge an ordered list, so local wins here and cloud wins in the
      // clean branch below (safe either way since the pending flag already
      // protects any local-only unsynced order changes from being clobbered).
      if (isSyncPending()) {
        data.profiles.forEach(p => {
          try {
            const cloud = JSON.parse(p.streak_json || '{}');
            const local = loadStreak(p.id);
            saveStreak(p.id, mergeStreaks(local, cloud));
          } catch {}
          try {
            const localProgress = loadProgress(p.id);
            const cloudProgress = JSON.parse(p.progress_json || '{}');
            saveProgress(p.id, mergeProgress(localProgress, cloudProgress));
          } catch {}
          try {
            const localCustom = loadCustomVerses(p.id);
            const cloudCustom = JSON.parse(p.custom_json || '[]');
            saveCustomVerses(p.id, mergeCustomVerses(localCustom, cloudCustom));
          } catch {}
          try {
            const localHidden = loadHiddenMeta(p.id);
            const cloudHidden = JSON.parse(p.hidden_json || '{}');
            saveHiddenMeta(p.id, mergeHiddenMeta(localHidden, cloudHidden));
          } catch {}
          try {
            const localTrans = loadVerseTranslations(p.id);
            const cloudTrans = JSON.parse(p.trans_json || '{}');
            saveVerseTranslations(p.id, mergeTranslations(localTrans, cloudTrans, true));
          } catch {}
        });
        // Reload the current profile's in-memory React state from the freshly
        // merged localStorage — otherwise the next setProgress/etc. would build
        // on the pre-merge snapshot and overwrite the merged data on save.
        const pendingUser = users.find(u => u.id === currentUser.id) || currentUser;
        handleUserChange(pendingUser);
        // Local has unsynced edits (incl. possibly profile edits), so local is
        // authoritative here — push the current local profiles, read fresh (not
        // the stale mount-time closure).
        pushSync(auth.token, loadUsers()).then(() => clearSyncPending()).catch(() => {});
        return;
      }

      saveUsers(cloudUsers);
      saveCurrentUserId(cloudUsers[0].id);
      data.profiles.forEach(p => {
        try {
          const localProgress = loadProgress(p.id);
          const cloudProgress = JSON.parse(p.progress_json || '{}');
          saveProgress(p.id, mergeProgress(localProgress, cloudProgress));
        } catch {}
        try {
          const localTrans = loadVerseTranslations(p.id);
          const cloudTrans = JSON.parse(p.trans_json || '{}');
          saveVerseTranslations(p.id, mergeTranslations(localTrans, cloudTrans, false));
        } catch {}
        try {
          const localCustom = loadCustomVerses(p.id);
          const cloudCustom = JSON.parse(p.custom_json || '[]');
          saveCustomVerses(p.id, mergeCustomVerses(localCustom, cloudCustom));
        } catch {}
        try {
          const localHidden = loadHiddenMeta(p.id);
          const cloudHidden = JSON.parse(p.hidden_json || '{}');
          saveHiddenMeta(p.id, mergeHiddenMeta(localHidden, cloudHidden));
        } catch {}
        try { saveVerseOrder(p.id, JSON.parse(p.order_json || '[]')); } catch {}
        try {
          const cloud = JSON.parse(p.streak_json || '{}');
          const local = loadStreak(p.id);
          const merged = mergeStreaks(local, cloud);
          saveStreak(p.id, merged);
        } catch {}
      });
      setUsers(cloudUsers);
      const restoredUser = cloudUsers.find(u => u.id === currentUser.id) || cloudUsers[0];
      handleUserChange(restoredUser);
      // Push the reconciled state back so both devices converge. Use cloudUsers
      // (the profiles we just adopted), NOT the stale mount-time `users` closure
      // — pushing that would overwrite a profile edit made on another device
      // with this device's pre-pull copy.
      pushSync(auth.token, cloudUsers).then(() => clearSyncPending()).catch(() => {});
    }).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist progress whenever it changes, then schedule a cloud sync
  useEffect(() => {
    if (currentUser) {
      saveProgress(currentUser.id, progress);
      scheduleSync(auth, users);
    }
  }, [progress, currentUser]);

  // Fetch a single translation for a verse and merge it into the cache.
  // Only the translation actually being shown is fetched (never all six), so
  // external API usage stays minimal and we don't exhaust the api.bible quota.
  const ensureTranslation = useCallback((reference, ver) => {
    fetchTranslation(reference, ver).then(text => {
      if (!text) return;
      setVerseCache(prev => {
        const updated = mergeVerseIntoCache(prev, { reference, [ver]: text });
        saveVerseCache(updated);
        return updated;
      });
    }).catch(() => {});
  }, []);

  // Fetch the active translation for every verse currently on screen (the main
  // card AND any open overlay — verse detail, learn-reveal, exercise) when its
  // text isn't cached yet. Without this, overlays show "Loading…" forever.
  useEffect(() => {
    const displayed = [verse, verseScreenVerseLive, learnRevealVerseLive, exerciseVerseLive];
    const seen = new Set();
    for (const v of displayed) {
      if (!v) continue;
      const ver = verseTranslations[v.id] || version;
      if (v[ver]) continue;
      const key = `${v.reference}|${ver}`;
      if (seen.has(key)) continue;
      seen.add(key);
      ensureTranslation(v.reference, ver);
    }
  }, [verse, verseScreenVerseLive, learnRevealVerseLive, exerciseVerseLive, verseTranslations, version, ensureTranslation]);

  // Debounced cloud sync — fires 10s after any progress change, if signed in
  const scheduleSync = useCallback((currentAuth, currentUsers) => {
    if (!currentAuth?.token) return;
    // Mark that local has edits not yet confirmed in the cloud, so a startup
    // pull before this push lands won't overwrite them (see the pull effect).
    markSyncPending();
    clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(async () => {
      setSyncStatus('syncing');
      try {
        await pushSync(currentAuth.token, currentUsers);
        clearSyncPending();
        setSyncStatus('synced');
        setLastSynced(Date.now());
      } catch {
        setSyncStatus('error');
      }
    }, 10_000);
  }, []);

  // Safety-net sync: most actions already schedule a sync via the progress-
  // change effect, but not every local mutation does (streak touches on an
  // already-learning verse are one example, fixed separately — this covers
  // any other gap the same way). Re-push periodically and whenever the app
  // returns to the foreground, so nothing sits unsynced for long even if a
  // future change misses the scheduleSync call it should have made.
  useEffect(() => {
    if (!auth?.token) return;
    const sync = () => scheduleSync(auth, users);
    const onVisible = () => { if (document.visibilityState === 'visible') sync(); };
    document.addEventListener('visibilitychange', onVisible);
    const interval = setInterval(sync, 10 * 60 * 1000);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      clearInterval(interval);
    };
  }, [auth, users, scheduleSync]);

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
    if (id === 'exercises')    { setReviseAutoStart('today'); handleModeChange('revise'); }
    else if (id === 'learn')   { handleModeChange('learn'); }
    else if (id === 'deck')    { setShowDeckPanel(true); }
    else if (id === 'view-profile') { setProfileUser(currentUser); setProfileInitSubscreen(null); }
    else if (id === 'profile') { setProfileUser(currentUser); setProfileInitSubscreen('edit'); }
    else if (id === 'theme')   { setTheme(t => t === 'light' ? 'dark' : 'light'); }
    else if (id === 'add-verse') { setShowAddVerse(true); }
    else if (id === 'stats')    { setShowStats(true); }
    else if (id === 'add-member') { setProfileUser(currentUser); setProfileInitSubscreen('add'); }
    else if (id === 'auth') {
      if (auth?.token) { handleAuthChange({}); }       // logged in → log out
      else { setProfileUser(currentUser); setProfileInitSubscreen(null); } // logged out → profile (Cloud backup → Sign in)
    }
    else if (id === 'feedback') { setShowFeedback(true); }
    else if (id === 'about')    { setInfoModal('about'); }
    else if (id === 'support')  { setInfoModal('support'); }
    else if (id === 'exercise-settings') { setInfoModal('exercise-settings'); }
    else if (id === 'flip-reverse')      { setInfoModal('flip-reverse'); }
    else if (id === 'documentation')     { setInfoModal('documentation'); }
    else if (id === 'install-app')       { setInfoModal('install-app'); }
  }, [currentUser, handleModeChange, auth, handleAuthChange]);

  const handleTouchStreak = useCallback(() => {
    const updated = touchStreak(currentUser.id);
    setStreak(updated.days);
    setStreakData(updated);
    // Streak-only changes (e.g. re-revealing an already-learning verse) don't
    // always also change `progress`, so they can't rely on the progress-change
    // effect to schedule a sync — without this, a streak could tick up locally
    // for days without ever reaching the cloud.
    scheduleSync(auth, users);
  }, [currentUser.id, auth, users, scheduleSync]);

  // Centralized exercise completion — records a revise attempt with the correct
  // next skill level + hint score, then closes the exercise overlay.
  const completeExercise = useCallback((exVerse, result = {}) => {
    setProgress(prev => {
      const entry = getEntry(prev, exVerse.id);
      const hintScore = computeHintScore(result.hints || 0, result.errors || 0);
      const newLevel = computeNextSkillLevel(getSkillLevel(entry), {
        hintScore,
        ageDays: verseAgeDays(entry),
        seenCount: entry?.seen_count || 0,
        recentAttempts: entry?.attempts || [],
        bracket: currentUser.bracket || 'adult',
        manualOverride: !!entry?.manual_override,
      });
      return { ...prev, [exVerse.id]: recordReviseAttempt(entry, newLevel, hintScore) };
    });
    handleTouchStreak();
    setExercise(null);
  }, [handleTouchStreak, currentUser.bracket]);

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
    const sd = loadStreak(user.id);
    setStreak(sd.days);
    setStreakData(sd);
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
    scheduleSync(auth, users);
  }, [currentUser.id, auth, users, scheduleSync]);

  const handleRemoveVerse = useCallback(() => {
    if (!verse) return;
    if (verse.custom) {
      setCustomVerses(removeCustomVerse(currentUser.id, verse.id));
    } else {
      setHiddenIds(new Set(hideVerseId(currentUser.id, verse.id)));
    }
    setIsFlipped(false);
    scheduleSync(auth, users);
  }, [verse, currentUser.id, auth, users, scheduleSync]);

  const handleVerseTranslationChange = useCallback((verseId, translation) => {
    setVerseTranslations(prev => {
      const updated = { ...prev };
      if (!translation || translation === version) delete updated[verseId];
      else updated[verseId] = translation;
      saveVerseTranslations(currentUser.id, updated);
      return updated;
    });
    scheduleSync(auth, users);
  }, [currentUser.id, version, auth, users, scheduleSync]);

  const handleUsersChange = useCallback((updated) => {
    setUsers(updated);
    saveUsers(updated);
  }, []);

  const handleReorderDeck = useCallback((orderedIds) => {
    setVerseOrder(orderedIds);
    saveVerseOrder(currentUser.id, orderedIds);
    scheduleSync(auth, users);
  }, [currentUser.id, auth, users, scheduleSync]);

  const handleRemoveVerseById = useCallback((verse) => {
    if (verse.custom) {
      setCustomVerses(removeCustomVerse(currentUser.id, verse.id));
    } else {
      setHiddenIds(new Set(hideVerseId(currentUser.id, verse.id)));
    }
    scheduleSync(auth, users);
  }, [currentUser.id, auth, users, scheduleSync]);

  const handleResetVerse = useCallback((v) => {
    setProgress(prev => {
      const updated = { ...prev };
      delete updated[v.id];
      return updated;
    });
  }, []);

  const handleRestoreVerse = useCallback((verseId) => {
    setHiddenIds(new Set(restoreVerseId(currentUser.id, verseId)));
    scheduleSync(auth, users);
  }, [currentUser.id, auth, users, scheduleSync]);

  // Add Verse Flow callbacks — distinguishes curated (numeric id) from external search results
  const handleAddDeckFromFlow = useCallback((verse) => {
    if (!verse.id) {
      // External search result → add as custom verse
      setCustomVerses(addCustomVerse(currentUser.id, verse));
      logEvent('verse_added', { source: 'search' });
    } else if (hiddenIds.has(verse.id) || hiddenIds.has(String(verse.id))) {
      // Hidden curated verse → restore it
      setHiddenIds(new Set(restoreVerseId(currentUser.id, verse.id)));
    }
    // Already-visible curated verse → no-op (UI shows "In deck")
    scheduleSync(auth, users);
  }, [currentUser.id, hiddenIds, auth, users, scheduleSync]);

  const handleLearnFromFlow = useCallback((verse) => {
    let targetVerse = verse;
    if (!verse.id) {
      // External search result → add as custom first
      const newVerses = addCustomVerse(currentUser.id, verse);
      setCustomVerses(newVerses);
      logEvent('verse_added', { source: 'search' });
      targetVerse = newVerses[newVerses.length - 1];
    } else if (hiddenIds.has(verse.id) || hiddenIds.has(String(verse.id))) {
      setHiddenIds(new Set(restoreVerseId(currentUser.id, verse.id)));
    }
    setShowAddVerse(false);
    setVerseScreenVerse(targetVerse);
    scheduleSync(auth, users);
  }, [currentUser.id, hiddenIds, auth, users, scheduleSync]);

  const handleRestoreAll = useCallback(() => {
    setHiddenIds(new Set(restoreAllVerseIds(currentUser.id)));
    scheduleSync(auth, users);
  }, [currentUser.id, auth, users, scheduleSync]);

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

    // Start the deck with ONLY the chosen verse — hide the rest of the curated
    // set so the user adds them from the Collection at their own pace, rather
    // than being handed all 104 verses up front. (A custom first verse lives in
    // customVerses and isn't curated, so in that case hide the whole set.)
    const keepId = (resolvedVerseId && resolvedVerseId !== -1) ? Number(resolvedVerseId) : null;
    const toHide = new Set(VERSES.map(v => v.id).filter(id => id !== keepId));
    saveHiddenVerseIds(updatedUser.id, toHide);
    setHiddenIds(toHide);

    // The chosen verse is deliberately left UNSEEN (not auto-started): as the
    // only visible verse and first in verseOrder it becomes `nextUnseen`, so
    // the home screen shows it as a "Next verse to learn" preview with a
    // "Learn your first verse" primary button. That routes brand-new users
    // through the guided LearnRevealScreen first; completing it starts the
    // verse (startRevising) and only then do exercises come due. Previously
    // it was auto-marked learning/due, which dropped users straight into
    // "Today's Exercises" cold, skipping the learn step entirely.

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
    scheduleSync(auth, users);
  }, [customVerses, hiddenIds, verseOrder, auth, users, scheduleSync]);

  // Keyboard shortcuts — only active in learn mode on the home screen with no
  // overlay open, so they never mutate the hidden learn queue from another screen.
  useEffect(() => {
    const overlayOpen = profileUser || showDeckPanel || showStats || showAddVerse ||
      verseScreenVerse || learnRevealVerse || exercise || infoModal || showFeedback || drawerOpen;
    function onKey(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (overlayOpen || mode !== 'learn') return;
      if (e.code === 'Space')      { e.preventDefault(); handleFlip(); }
      if (e.code === 'ArrowRight') goNext();
      if (e.code === 'KeyK')       handleGotItForNow();
      if (e.code === 'KeyL')       handleMark(0);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleFlip, goNext, handleMark, handleGotItForNow, mode,
      profileUser, showDeckPanel, showStats, showAddVerse, verseScreenVerse,
      learnRevealVerse, exercise, infoModal, showFeedback, drawerOpen]);

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

  // Style guide route (hidden) — ?styleguide
  if (new URLSearchParams(window.location.search).has('styleguide')) return <StyleGuide />;

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
    <UserSwitcherContext.Provider value={{
      users,
      currentUser,
      onUserChange: handleUserChange,
      onOpenProfile: (u) => { setProfileUser(u); setProfileInitSubscreen(null); },
    }}>
      {showDeckPanel && (
        <VerseDeckPanel
          verses={allVerses}
          progress={progress}
          dailyQueue={dailyQueue}
          currentUser={currentUser}
          users={users}
          onReorder={handleReorderDeck}
          onRemoveVerse={handleRemoveVerseById}
          onOpenAddVerse={() => setShowAddVerse(true)}
          onLearnNow={handleLearnNow}
          onLearnLater={handleLearnLater}
          onStartLearn={v => setLearnRevealVerse(v)}
          onMirror={handleMirrorDeck}
          onVerseDetails={v => { setVerseScreenVerse(v); }}
          onClose={navBack}
          onHome={goHome}
        />
      )}

      {profileUser && (
        <ProfileModal
          key={profileUser.id + (profileInitSubscreen || '')}
          user={profileUser}
          users={users}
          stats={profileUser.id === currentUser.id ? stats : null}
          ranking={users.length > 1 ? userRankings[profileUser.id] : null}
          rankingCount={users.length}
          auth={auth}
          syncStatus={syncStatus}
          lastSynced={lastSynced}
          updateAvailable={updateAvailable}
          onRefreshApp={hardReload}
          initialSubscreen={profileInitSubscreen}
          onAuthChange={handleAuthChange}
          onAddUser={(newUser, updatedUsers) => {
            setUsers(updatedUsers);
            handleUserChange(newUser);
            navBack();
          }}
          onUsersChange={(merged, switchTo) => {
            setUsers(merged);
            if (switchTo) handleUserChange(switchTo);
          }}
          onSave={(updated, updatedUsers) => {
            setUsers(updatedUsers);
            if (updated.id === profileUser.id) setProfileUser(updated);
            if (updated.id === currentUser.id) handleUserChange(updated);
            scheduleSync(auth, updatedUsers);
          }}
          onDelete={(remaining) => {
            setUsers(remaining);
            if (profileUser.id === currentUser.id && remaining.length > 0) handleUserChange(remaining[0]);
            if (auth?.token) {
              deleteCloudProfile(auth.token, profileUser.id).catch(() => {});
            }
            navBack();
          }}
          initialSubscreen={profileInitSubscreen}
          onOpenDeck={() => { setProfileUser(null); setProfileInitSubscreen(null); setShowDeckPanel(true); }}
          onOpenStats={() => { setProfileUser(null); setProfileInitSubscreen(null); setShowStats(true); }}
          onClose={navBack}
          onHome={goHome}
        />
      )}

      {learnRevealVerse && (
        <LearnRevealScreen
          verse={learnRevealVerseLive}
          version={verseTranslations[learnRevealVerse.id] || version}
          user={currentUser}
          onComplete={() => {
            // Only an unseen verse graduates to "learning"; a verse already being
            // practiced is just being flipped for review — don't reset its progress.
            const status = progress[learnRevealVerse.id]?.status || 'unseen';
            if (status === 'unseen') {
              setProgress(prev => ({
                ...prev,
                [learnRevealVerse.id]: startRevising(getEntry(prev, learnRevealVerse.id)),
              }));
            }
            handleTouchStreak();
            setLearnRevealVerse(null);
          }}
          onClose={navBack}
          onHome={goHome}
        />
      )}

      {exercise && (() => {
        const exVerse = exerciseVerseLive;
        const exVersion = verseTranslations[exVerse.id] || version;
        const exDifficulty = progress[exVerse.id]?.skill_level || 'easy';
        return (
          <div className="vs-overlay" style={{ zIndex: 600 }}>
            <div className="vs-panel">
              <OverlayHeader onBack={() => setExercise(null)} user={currentUser} onHome={goHome} />
            </div>
            <div className="vs-sheet">
              <div className="vs-sheet-inner">
              <div className="vs-ex-subhdr">
                <div className="vs-ex-ref">{exercise.kind === 'match' ? 'Match the reference' : exVerse.reference}</div>
                <select
                  className="vs-version-select"
                  value={exVersion}
                  onChange={e => handleVerseTranslationChange(exVerse.id, e.target.value)}
                >
                  {['kjv','bsb','esv','niv','nkjv','nasb'].map(t => (
                    <option key={t} value={t}>{t.toUpperCase()}</option>
                  ))}
                </select>
              </div>

              {exercise.kind === 'type' && (
                <TypeExercise
                  verse={exVerse}
                  version={exVersion}
                  difficulty={exDifficulty}
                  onComplete={(r) => completeExercise(exVerse, r)}
                  onSkip={() => setExercise(null)}
                />
              )}
              {exercise.kind === 'select' && (
                <SelectExercise
                  verse={exVerse}
                  version={exVersion}
                  difficulty={exDifficulty}
                  onComplete={(r) => completeExercise(exVerse, r)}
                  onSkip={() => setExercise(null)}
                />
              )}
              {exercise.kind === 'match' && (
                <MatchExercise
                  verses={[exVerse, ...allVerses.filter(v => String(v.id) !== String(exVerse.id))]}
                  version={exVersion}
                  verseTranslations={verseTranslations}
                  difficulty={exDifficulty}
                  onComplete={(r) => completeExercise(exVerse, r)}
                  onSkip={() => setExercise(null)}
                />
              )}
              </div>
            </div>
          </div>
        );
      })()}

      {verseScreenVerse && (
        <VerseScreen
          verse={verseScreenVerseLive}
          user={currentUser}
          progress={progress}
          version={version}
          verseTranslations={verseTranslations}
          onVerseTranslationChange={handleVerseTranslationChange}
          onLearnVerse={() => setLearnRevealVerse(verseScreenVerse)}
          onSelectWord={() => setExercise({ verse: verseScreenVerse, kind: 'select' })}
          onTypeVerse={() => setExercise({ verse: verseScreenVerse, kind: 'type' })}
          onMatchRef={() => setExercise({ verse: verseScreenVerse, kind: 'match' })}
          onSetSkill={(v, level) => {
            setProgress(prev => ({
              ...prev,
              // manual_override protects this level from being immediately auto-
              // decayed by the maturity ceiling on the very next attempt.
              [v.id]: { ...(prev[v.id] || {}), status: 'learning', skill_level: level, manual_override: true },
            }));
          }}
          starred={!!progress[verseScreenVerse.id]?.starred}
          onToggleStar={(v) => {
            setProgress(prev => ({
              ...prev,
              [v.id]: { ...(prev[v.id] || {}), starred: !prev[v.id]?.starred },
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
          onClose={navBack}
          onHome={goHome}
        />
      )}

      {showAddVerse && (
        <AddVerseFlow
          allVerses={allVerses}
          preferredVersion={version}
          user={currentUser}
          onAddDeck={handleAddDeckFromFlow}
          onLearnNow={handleLearnFromFlow}
          onClose={navBack}
          onHome={goHome}
        />
      )}

      {showStats && (
        <StatsScreen
          verses={allVerses}
          progress={progress}
          currentUser={currentUser}
          users={users}
          streak={streak}
          ranking={users.length > 1 ? userRankings[currentUser.id] : null}
          rankingCount={users.length}
          onClose={navBack}
          onHome={goHome}
        />
      )}

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        theme={theme}
        onToggleTheme={() => setTheme(t => t === 'light' ? 'dark' : 'light')}
        auth={auth}
        currentUser={currentUser}
        showInstall={showInstall}
        onAction={handleDrawerAction}
      />

      <div className="scene">
      <div className="hdr">
        <button className="hamburger-btn" onClick={() => setDrawerOpen(true)} aria-label="Open menu">
          <span /><span /><span />
        </button>
        <div className="ttl" onClick={goHome} style={{ cursor: 'pointer' }}>
          <span className="ttl-memory">Memory</span><span className="ttl-dot-bible" style={{ color: currentUser?.colour || 'var(--color-brand)' }}>.bible</span>
        </div>
        <UserPanel
          users={users}
          currentUser={currentUser}
          open={userPanelOpen}
          onToggle={setUserPanelOpen}
          onUserChange={handleUserChange}
          onOpenProfile={(u) => { setUserPanelOpen(false); setProfileUser(u); setProfileInitSubscreen(null); }}
        />
      </div>

      <div className="content-sheet">

      {showBracketReminder && (
        <div className="bracket-reminder">
          Is <strong>{currentUser.name}</strong>'s age group still correct?{' '}
          <span className="bracket-reminder-link" onClick={() => setShowBracketReminder(false)}>
            Update in profile
          </span>
          <button className="bracket-reminder-close" onClick={() => setShowBracketReminder(false)}><Icon name="close" size={14} /></button>
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
          streakData={streakData}
          onTodayExercises={() => { setReviseAutoStart('today'); handleModeChange('revise'); }}
          onPracticeAnyway={() => { setReviseAutoStart('practice'); handleModeChange('revise'); }}
          onLearnNext={() => nextUnseen && setLearnRevealVerse(nextUnseen)}
          onVerseDetails={v => setVerseScreenVerse(v)}
          onAddVerse={() => setShowAddVerse(true)}
          onEnsureTranslation={ensureTranslation}
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
          autoStart={reviseAutoStart}
          onAutoStartConsumed={() => setReviseAutoStart(false)}
          onVerseTranslationChange={handleVerseTranslationChange}
          onMark={(v, newLevel, hintScore) => {
            // ExerciseFlow passes the computed skill level + hint score, so use
            // recordReviseAttempt (not the legacy numeric recordAttempt) to keep
            // skill_level and next_review correct.
            setProgress(prev => ({
              ...prev,
              [v.id]: recordReviseAttempt(getEntry(prev, v.id), newLevel, hintScore),
            }));
            handleTouchStreak();
          }}
          onLearnNew={() => handleModeChange('learn')}
          onLearnNewVerse={handleLearnNewVerse}
          onViewStats={() => setShowStats(true)}
          onEnsureTranslation={ensureTranslation}
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
      {infoModal === 'install-app' ? (
        <InstallAppModal
          deferredPrompt={installPrompt}
          onClose={() => setInfoModal(null)}
          onInstalled={() => setAppInstalled(true)}
        />
      ) : infoModal && <InfoModal kind={infoModal} onClose={() => setInfoModal(null)} />}
      </div>{/* end content-sheet */}
      </div>{/* end scene */}
    </UserSwitcherContext.Provider>
  );
}
