import { useEffect } from 'react';
import { APP_VERSION } from '../data/version.js';

const SECTIONS = [
  {
    heading: 'Practice',
    items: [
      { id: 'exercises',   label: "Today's Exercises" },
      { id: 'learn',       label: 'Learn next verse' },
      { id: 'deck',        label: 'My Deck' },
      { id: 'add-verse',   label: 'Add new verse' },
    ],
  },
  {
    heading: 'Account',
    items: [
      { id: 'profile',     label: 'Edit Profile' },
      { id: 'add-member',  label: 'Add family member' },
      { id: 'auth',        label: null }, // dynamic: Log In / Log Out
    ],
  },
  {
    heading: 'App',
    items: [
      { id: 'theme',       label: null }, // dynamic: Light / Dark mode
      { id: 'feedback',    label: 'Send Feedback' },
    ],
  },
  {
    heading: 'Ministry',
    items: [
      { id: 'about',       label: 'About' },
      { id: 'support',     label: 'Support' },
    ],
  },
];

export default function Drawer({ open, onClose, theme, onToggleTheme, auth, onAction }) {
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
          <div className="drawer-brand">
            <span className="ttl-memory">Memory</span><span className="ttl-dot-bible">.bible</span>
          </div>
          <button className="drawer-close" onClick={onClose} aria-label="Close menu">✕</button>
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
