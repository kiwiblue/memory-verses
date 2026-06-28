import { useEffect } from 'react';
import { APP_VERSION } from '../data/version.js';
import { avatarStyle } from '../data/avatarStyle.js';
import Icon from './Icon.jsx';

const SECTIONS = [
  {
    heading: 'Settings',
    items: [
      { id: 'exercises',         label: "Today's Exercises" },
      { id: 'deck',              label: 'My Deck' },
      { id: 'exercise-settings', label: 'Exercise Settings', soon: true },
      { id: 'flip-reverse',      label: 'Flip Card Reverse', soon: true },
      { id: 'add-verse',         label: 'Add new verse' },
    ],
  },
  {
    heading: 'Account',
    items: [
      { id: 'view-profile', label: 'View Profile' },
      { id: 'profile',      label: 'Edit Profile' },
      { id: 'add-member',   label: 'Add family member' },
      { id: 'auth',         label: null }, // dynamic: Log In / Log Out
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
    if (id === 'theme') return theme === 'light'
      ? <><Icon name="moon" size={18} /> Dark mode</>
      : <><Icon name="sun" size={18} /> Light mode</>;
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
          <button className="drawer-back" onClick={onClose} aria-label="Close menu"><Icon name="back" size={26} /></button>
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
                  className={`drawer-link${item.soon ? ' soon' : ''}`}
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
