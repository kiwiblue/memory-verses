import { useState } from 'react';
import Icon from './Icon.jsx';
import { detectPlatform } from '../data/platform.js';
import { useModalA11y } from '../hooks/useModalA11y.js';

// "Add to Home Screen" — instructions are OS/browser-specific since the
// actual steps (and whether a real one-tap install exists at all) differ:
// Android/desktop Chrome & Edge can trigger the native install prompt
// directly; iOS only supports it from Safari's Share sheet; other browsers
// just get manual steps.
export default function InstallAppModal({ onClose, deferredPrompt, onInstalled }) {
  const { os, browser } = detectPlatform();
  const [installing, setInstalling] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const modalRef = useModalA11y(onClose);

  async function handleInstallClick() {
    if (!deferredPrompt) { onClose(); return; }
    setInstalling(true);
    deferredPrompt.prompt();
    try {
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') { onInstalled?.(); onClose(); return; }
    } catch { /* prompt can only be used once; fall through */ }
    setInstalling(false);
    setDismissed(true);
  }

  let steps = [];
  let note = null;

  if (os === 'ios') {
    if (browser !== 'safari') {
      note = 'Open this page in Safari to add it to your Home Screen — other iOS browsers can\'t install apps.';
    }
    steps = [
      <>Tap the <strong>Share</strong> icon <Icon name="ios-share" size={14} /> in Safari's toolbar.</>,
      <>Scroll down and tap <strong>Add to Home Screen</strong>.</>,
      <>Tap <strong>Add</strong> in the top right.</>,
    ];
  } else if (os === 'android') {
    steps = [
      <>Tap the <strong>⋮</strong> menu in your browser.</>,
      <>Tap <strong>Add to Home screen</strong> (or <strong>Install app</strong>).</>,
      <>Confirm by tapping <strong>Add</strong> / <strong>Install</strong>.</>,
    ];
  } else {
    steps = [
      <>Look for an install icon in your browser's address bar (often a small monitor or <strong>⊕</strong>).</>,
      <>Click it, then confirm <strong>Install</strong>.</>,
      <>If you don't see it, open the browser menu and look for <strong>Install Memory.bible…</strong></>,
    ];
  }

  const canOneTapInstall = !!deferredPrompt && !dismissed;

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box info-modal" ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="install-app-modal-title">
        <button className="modal-close-btn" onClick={onClose} aria-label="Close"><Icon name="close" size={16} /></button>
        <h2 className="info-modal-title" id="install-app-modal-title">Add to Home Screen</h2>
        <div className="info-modal-body">
          {canOneTapInstall ? (
            <p>Install Memory.bible for quick access, right from your home screen — no App Store needed.</p>
          ) : (
            <>
              {note && <p className="info-modal-note">{note}</p>}
              <ol className="info-modal-steps">
                {steps.map((s, i) => <li key={i}>{s}</li>)}
              </ol>
            </>
          )}
        </div>
        <button className="ob-btn-primary" onClick={canOneTapInstall ? handleInstallClick : onClose} disabled={installing}>
          {canOneTapInstall ? (installing ? 'Opening…' : 'Install now') : 'Got it'}
        </button>
      </div>
    </div>
  );
}
