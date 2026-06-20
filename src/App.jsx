import { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';

import { VERSES } from './data/verses.js';
import FlipCard from './components/FlipCard.jsx';
import ModeTabs from './components/ModeTabs.jsx';
import ProgressBar from './components/ProgressBar.jsx';
import StudyControls from './components/StudyControls.jsx';
import TestControls from './components/TestControls.jsx';
import BrowseControls from './components/BrowseControls.jsx';
import StatPills from './components/StatPills.jsx';
import VersionSelector from './components/VersionSelector.jsx';

const STORAGE_KEY = 'mv-progress';

function buildInitialProgress() {
  const init = {};
  VERSES.forEach(v => { init[v.id] = 'unseen'; });
  return init;
}

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Merge with initial so new verses always appear
      const init = buildInitialProgress();
      return { ...init, ...parsed };
    }
  } catch (_) {}
  return buildInitialProgress();
}

export default function App() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [mode, setMode] = useState('study');
  const [version, setVersion] = useState('esv');
  const [progress, setProgress] = useState(loadProgress);

  // Timer ref for browse auto-flip
  const browseTimerRef = useRef(null);

  const total = VERSES.length;
  const verse = VERSES[currentIndex];

  // Persist progress
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }, [progress]);

  // Browse auto-flip: trigger when mode is browse or index changes in browse
  useEffect(() => {
    if (mode !== 'browse') return;
    // Clear any pending timer
    if (browseTimerRef.current) clearTimeout(browseTimerRef.current);
    setIsFlipped(false);
    browseTimerRef.current = setTimeout(() => {
      setIsFlipped(true);
    }, 300);
    return () => clearTimeout(browseTimerRef.current);
  }, [mode, currentIndex]);

  // Reset flip when switching modes (except browse handles its own)
  const handleModeChange = useCallback((newMode) => {
    setMode(newMode);
    if (newMode !== 'browse') {
      setIsFlipped(false);
    }
  }, []);

  const goNext = useCallback(() => {
    setCurrentIndex(i => (i + 1) % total);
    if (mode !== 'browse') setIsFlipped(false);
  }, [total, mode]);

  const goPrev = useCallback(() => {
    setCurrentIndex(i => (i - 1 + total) % total);
    // browse handles flip via effect
  }, [total]);

  const handleMark = useCallback((status) => {
    setProgress(prev => ({ ...prev, [verse.id]: status }));
    goNext();
  }, [verse.id, goNext]);

  const handleFlip = useCallback(() => {
    if (mode === 'study') setIsFlipped(f => !f);
  }, [mode]);

  const handleReveal = useCallback(() => {
    setIsFlipped(true);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e) {
      if (e.target.tagName === 'INPUT') return;
      if (e.code === 'Space' && mode === 'study') {
        e.preventDefault();
        handleFlip();
      }
      if (e.code === 'ArrowRight') goNext();
      if (e.code === 'ArrowLeft' && mode === 'browse') goPrev();
      if (e.code === 'KeyK' && mode === 'study') handleMark('mastered');
      if (e.code === 'KeyL' && mode === 'study') handleMark('learning');
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode, handleFlip, goNext, goPrev, handleMark]);

  return (
    <div className="scene">
      <div className="hdr">
        <div className="ttl">Bible Memory Deck</div>
        <VersionSelector version={version} onChange={setVersion} />
      </div>

      <ProgressBar current={currentIndex + 1} total={total} />

      <ModeTabs mode={mode} onChange={handleModeChange} />

      <FlipCard
        verse={verse}
        version={version}
        isFlipped={isFlipped}
        mode={mode}
        onFlip={handleFlip}
      />

      {mode === 'study' && (
        <StudyControls onMark={handleMark} onNext={goNext} />
      )}

      {mode === 'test' && (
        <TestControls
          verse={verse}
          version={version}
          onReveal={handleReveal}
          onNext={goNext}
        />
      )}

      {mode === 'browse' && (
        <BrowseControls onPrev={goPrev} onNext={goNext} />
      )}

      <StatPills progress={progress} />
    </div>
  );
}
