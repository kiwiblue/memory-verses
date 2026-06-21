import { useState, useEffect, useCallback, useMemo } from 'react';
import './App.css';

import { VERSES } from './data/verses.js';
import { loadUsers, saveUsers, loadCurrentUserId, saveCurrentUserId, loadVerseTranslations, saveVerseTranslations } from './data/users.js';
import { loadProgress, saveProgress, getEntry } from './data/progress.js';
import { recordAttempt, buildDailyQueue, progressStats } from './data/spacedRepetition.js';
import { loadCustomVerses, addCustomVerse, removeCustomVerse } from './data/customVerses.js';
import { loadHiddenVerseIds, hideVerseId } from './data/hiddenVerses.js';
import { loadVerseCache, saveVerseCache, mergeVerseIntoCache } from './data/verseCache.js';
import { fetchVerse } from './api/bible.js';

import FlipCard from './components/FlipCard.jsx';
import ModeTabs from './components/ModeTabs.jsx';
import ProgressBar from './components/ProgressBar.jsx';
import StudyControls from './components/StudyControls.jsx';
import TestControls from './components/TestControls.jsx';
import StatPills from './components/StatPills.jsx';
import QueueComplete from './components/QueueComplete.jsx';
import VersionSelector from './components/VersionSelector.jsx';
import UserPanel from './components/UserPanel.jsx';
import AddVersePanel from './components/AddVersePanel.jsx';

const APP_VERSION = '0.4.0';

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
    translation: 'esv',
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
  const [version, setVersion]         = useState(() => initUser().translation || 'esv');

  const [progress, setProgress]             = useState(() => loadProgress(initUser().id));
  const [verseTranslations, setVerseTranslations] = useState(() => loadVerseTranslations(initUser().id));
  const [customVerses, setCustomVerses]     = useState(() => loadCustomVerses(initUser().id));
  const [hiddenIds, setHiddenIds]           = useState(() => loadHiddenVerseIds(initUser().id));
  const [verseCache, setVerseCache]         = useState(() => loadVerseCache());

  const [showBracketReminder, setShowBracketReminder] = useState(() => {
    const u = initUser();
    if (!u.bracket || u.bracket === 'adult') return false;
    return u.bracket_updated && (Date.now() - u.bracket_updated) > 365 * 24 * 60 * 60 * 1000;
  });

  // All eligible verses merged with cached text, hidden ones removed
  const allVerses = useMemo(() =>
    [...VERSES, ...customVerses]
      .filter(v => !hiddenIds.has(v.id))
      .map(v => ({ ...v, ...(verseCache[v.reference] || {}) })),
    [customVerses, hiddenIds, verseCache]
  );

  // Daily queue (learn mode) — recomputed when progress or verses change
  const dailyQueue = useMemo(() =>
    buildDailyQueue(allVerses, progress, currentUser.bracket || 'adult'),
    [allVerses, progress, currentUser.bracket]
  );

  const queueDone  = mode === 'learn' && queueIndex >= dailyQueue.length;
  const verse      = mode === 'learn'
    ? (dailyQueue[queueIndex] ?? null)
    : (allVerses[browseIndex] || allVerses[0]);

  const stats = useMemo(() =>
    progressStats(allVerses, progress, currentUser.bracket || 'adult'),
    [allVerses, progress, currentUser.bracket]
  );

  // Persist progress whenever it changes
  useEffect(() => {
    if (currentUser) saveProgress(currentUser.id, progress);
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
      setBrowseIndex(i => (i + 1) % allVerses.length);
    }
    setIsFlipped(false);
  }, [mode, allVerses.length]);

  const handleFlip   = useCallback(() => { setIsFlipped(f => !f); }, []);
  const handleReveal = useCallback(() => { setIsFlipped(true); }, []);

  const handleUserChange = useCallback((user) => {
    setCurrentUser(user);
    saveCurrentUserId(user.id);
    setProgress(loadProgress(user.id));
    setVerseTranslations(loadVerseTranslations(user.id));
    setCustomVerses(loadCustomVerses(user.id));
    setHiddenIds(loadHiddenVerseIds(user.id));
    setVersion(user.translation || 'esv');
    setQueueIndex(0);
    setBrowseIndex(0);
    setIsFlipped(false);
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

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e) {
      if (e.target.tagName === 'INPUT') return;
      if (e.code === 'Space') { e.preventDefault(); handleFlip(); }
      if (e.code === 'ArrowRight') goNext();
      if (e.code === 'KeyK') handleMark(1);
      if (e.code === 'KeyL') handleMark(0);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleFlip, goNext, handleMark]);

  const activeVersion = verse ? (verseTranslations[verse.id] || version) : version;

  return (
    <div className="scene">
      <div className="hdr">
        <UserPanel users={users} currentUser={currentUser}
          onUserChange={handleUserChange} onUsersChange={handleUsersChange} />
        <div className="ttl">Bible Memory Deck</div>
        <VersionSelector version={version} onChange={setVersion} />
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
        : <ProgressBar current={browseIndex + 1} total={allVerses.length} />
      }

      <ModeTabs mode={mode} onChange={handleModeChange} />

      {queueDone ? (
        <QueueComplete stats={stats} onBrowse={() => handleModeChange('revise')} />
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
            <TestControls verse={verse} version={version} onReveal={handleReveal} onNext={goNext} />
          )}

          <div className="remove-row">
            <button className="remove-verse-btn" onClick={handleRemoveVerse}>
              Remove from my deck
            </button>
          </div>
        </>
      )}

      <StatPills stats={stats} />

      <AddVersePanel allVerses={allVerses} customVerses={customVerses}
        currentUser={currentUser} onAddVerse={handleAddVerse} />

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
  );
}
