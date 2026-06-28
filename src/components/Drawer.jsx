import { useEffect } from 'react';
import { APP_VERSION } from '../data/version.js';
import { avatarStyle } from '../data/avatarStyle.js';

const SECTIONS = [
  {
    heading: 'Settings',
    items: [
      { id: 'exercise-settings', label: 'Exercise Settings' },
      { id: 'deck',              label: 'My Deck' },
      { id: 'exercises',         label: "Today's Exercises" },
      { id: 'add-verse',         label: 'Add new verse' },
      { id: 'flip-reverse',      label: 'Flip Card Reverse' },
    ],
  },
  {
    heading: 'Account',
    items: [
      { id: 'auth',        label: null }, // dynamic: Log In / Log Out
      { id: 'add-member',  label: 'Add family member' },
      { id: 'profile',     label: 'Edit Profile' },
    ],
  },
  {
    heading: 'Ministry',
    items: [
      { id: 'about',       label: 'About' },
      { id: 'support',     label: 'Support' },
    ],
  },
  {
    heading: 'App Support',
    items: [
      { id: 'feedback',    label: 'App Feedback' },
      { id: 'documentation', label: 'Documentation' },
      { id: 'theme',       label: null }, // dynamic: Light / Dark mode
    ],
  },
];

export default function Drawer({ open, onClose, theme, onToggleTheme, auth, currentUser, onAction }) {
  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  function label(id) {
    if (id === 'auth')  return auth ? 'Log Out' : 'Log In';
    if (id === 'theme') return theme === 'light' ? '🌙  Dark mode' : '☀️  Light mode';
    return SECTIONS.flatMap(s => s.items).find(i => i.id === id)?.label ?? id;
  }

  return (
    <>
      {/* Overlay */}
      <div
        className={`drawer-overlay${open ? ' drawer-overlay-open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <nav className={`drawer${open ? ' drawer-open' : ''}`} aria-label="Main menu">
        <div className="drawer-header">
          <button className="drawer-back" onClick={onClose} aria-label="Close menu">‹</button>
          <span className="drawer-title">Settings</span>
          {currentUser && (
            <div
              className="avatar drawer-avatar"
              style={{ ...avatarStyle(currentUser.colour, currentUser.pattern), '--user-colour': currentUser.colour, width: 34, height: 34 }}
            >
              {currentUser.name?.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        <div className="drawer-body">
          {SECTIONS.map(section => (
            <div key={section.heading} className="drawer-section">
              <div className="drawer-section-heading">{section.heading}</div>
              {section.items.map(item => (
                <button
                  key={item.id}
                  className="drawer-link"
                  onClick={() => { onAction(item.id); onClose(); }}
                >
                  {label(item.id)}
                </button>
              ))}
            </div>
          ))}
        </div>

        <div className="drawer-footer">v{APP_VERSION}</div>
      </nav>
    </>
  );
}
