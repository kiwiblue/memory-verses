import { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';

import { VERSES } from './data/verses.js';
import { loadUsers, saveUsers, loadCurrentUserId, saveCurrentUserId, loadUserProgress, saveUserProgress, loadVerseTranslations, saveVerseTranslations } from './data/users.js';
import { loadCustomVerses, addCustomVerse } from './data/customVerses.js';
import FlipCard from './components/FlipCard.jsx';
import ModeTabs from './components/ModeTabs.jsx';
import ProgressBar from './components/ProgressBar.jsx';
import StudyControls from './components/StudyControls.jsx';
import TestControls from './components/TestControls.jsx';
import StatPills from './components/StatPills.jsx';
import VersionSelector from './components/VersionSelector.jsx';
import UserPanel from './components/UserPanel.jsx';
import AddVersePanel from './components/AddVersePanel.jsx';

const APP_VERSION = '0.1.0';

const ATTRIBUTION = {
  niv:  'NIV © 1973, 1978, 1984, 2011 Biblica, Inc. All rights reserved.',
  nkjv: 'NKJV © 1982 Thomas Nelson. All rights reserved.',
  nasb: 'NASB © 1960–1995 The Lockman Foundation. All rights reserved.',
};

function ensureDefaultUser(users) {
  if (users.length > 0) return users;
  const guest = {
    id: crypto.randomUUID(),
    name: 'Guest',
    age: 0,
    colour: '#3a8c5c',
    translation: 'esv',
  };
  saveUsers([guest]);
  saveCurrentUserId(guest.id);
  return [guest];
}

export default function App() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [mode, setMode] = useState('learn');
  const [version, setVersion] = useState('esv');
  const [progress, setProgress] = useState(() => {
    const users = ensureDefaultUser(loadUsers());
    const id = loadCurrentUserId() || users[0].id;
    return loadUserProgress(id);
  });
  const [users, setUsers] = useState(() => ensureDefaultUser(loadUsers()));
  const [currentUser, setCurrentUser] = useState(() => {
    const us = ensureDefaultUser(loadUsers());
    const id = loadCurrentUserId() || us[0].id;
    return us.find(u => u.id === id) || us[0];
  });
  const [verseTranslations, setVerseTranslations] = useState(() => {
    const us = ensureDefaultUser(loadUsers());
    const id = loadCurrentUserId() || us[0].id;
    return loadVerseTranslations(id);
  });
  const [customVerses, setCustomVerses] = useState(() => {
    const us = ensureDefaultUser(loadUsers());
    const id = loadCurrentUserId() || us[0].id;
    return loadCustomVerses(id);
  });

  const allVerses = [...VERSES, ...customVerses];
  const total = allVerses.length;
  const verse = allVerses[currentIndex] || allVerses[0];

  // Persist progress for current user
  useEffect(() => {
    if (currentUser) saveUserProgress(currentUser.id, progress);
  }, [progress, currentUser]);

  const handleModeChange = useCallback((newMode) => {
    setMode(newMode);
    setIsFlipped(false);
  }, []);

  const goNext = useCallback(() => {
    setCurrentIndex(i => (i + 1) % total);
    setIsFlipped(false);
  }, [total]);

  const handleMark = useCallback((status) => {
    setProgress(prev => ({ ...prev, [verse.id]: status }));
    goNext();
  }, [verse.id, goNext]);

  const handleFlip = useCallback(() => {
    if (mode === 'learn') setIsFlipped(f => !f);
  }, [mode]);

  const handleReveal = useCallback(() => {
    setIsFlipped(true);
  }, []);

  const handleUserChange = useCallback((user) => {
    setCurrentUser(user);
    saveCurrentUserId(user.id);
    setProgress(loadUserProgress(user.id));
    setVerseTranslations(loadVerseTranslations(user.id));
    setCustomVerses(loadCustomVerses(user.id));
    setVersion(user.translation);
    setCurrentIndex(0);
    setIsFlipped(false);
  }, []);

  const handleAddVerse = useCallback((verse) => {
    const updated = addCustomVerse(currentUser.id, verse);
    setCustomVerses(updated);
  }, [currentUser.id]);

  const handleVerseTranslationChange = useCallback((verseId, translation) => {
    setVerseTranslations(prev => {
      const updated = { ...prev };
      if (!translation || translation === version) {
        delete updated[verseId];
      } else {
        updated[verseId] = translation;
      }
      saveVerseTranslations(currentUser.id, updated);
      return updated;
    });
  }, [currentUser.id, version]);

  const handleUsersChange = useCallback((updatedUsers) => {
    setUsers(updatedUsers);
    saveUsers(updatedUsers);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e) {
      if (e.target.tagName === 'INPUT') return;
      if (e.code === 'Space' && mode === 'learn') {
        e.preventDefault();
        handleFlip();
      }
      if (e.code === 'ArrowRight') goNext();
      if (e.code === 'KeyK' && mode === 'learn') handleMark('mastered');
      if (e.code === 'KeyL' && mode === 'learn') handleMark('learning');
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode, handleFlip, goNext, handleMark]);

  return (
    <div className="scene">
      <div className="hdr">
        <UserPanel
          users={users}
          currentUser={currentUser}
          onUserChange={handleUserChange}
          onUsersChange={handleUsersChange}
        />
        <div className="ttl">Bible Memory Deck</div>
        <VersionSelector version={version} onChange={setVersion} />
      </div>

      <ProgressBar current={currentIndex + 1} total={total} />

      <ModeTabs mode={mode} onChange={handleModeChange} />

      <FlipCard
        verse={verse}
        version={verseTranslations[verse.id] || version}
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
          verse={verse}
          version={version}
          onReveal={handleReveal}
          onNext={goNext}
        />
      )}

      <StatPills progress={progress} />

      <AddVersePanel
        allVerses={allVerses}
        customVerses={customVerses}
        currentUser={currentUser}
        onAddVerse={handleAddVerse}
      />

      <footer className="app-footer">
        {ATTRIBUTION[verseTranslations[verse.id] || version] && (
          <div className="footer-attribution">
            {ATTRIBUTION[verseTranslations[verse.id] || version]}{' '}
            <a href="https://api.bible" target="_blank" rel="noopener noreferrer" className="footer-link">api.bible</a>
          </div>
        )}
        <div className="footer-credit">
          © {new Date().getFullYear()} Chris Sandford · v{APP_VERSION}
        </div>
      </footer>
    </div>
  );
}
