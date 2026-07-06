import { APP_VERSION } from '../data/version.js';
import Icon from './Icon.jsx';

// Simple informational modal for the drawer's "About" and "Support" items.
// NOTE: copy below is placeholder starter content — replace with the ministry's
// real wording / links before shipping.
const CONTENT = {
  about: {
    title: 'About Memory.bible',
    body: (
      <>
        <p>Memory.bible helps you hide God's Word in your heart through daily,
          bite-sized practice — a digital companion to the physical verse-memory
          card deck.</p>
        <p>Built to make Scripture memory simple for the whole family, at every age.</p>
        <p>Purchase physical memory cards from Living Waters Down Under.{' '}
          <a href="https://www.livingwaters.com.au/p/bible-verse-memory-cards/" target="_blank" rel="noopener noreferrer">
            Click here
          </a>.
        </p>
        <p>To support the up-keep and development of this app, consider donating to the developer.{' '}
          <a href="https://buymeacoffee.com/chrissandford" target="_blank" rel="noopener noreferrer">
            Donate here
          </a>.
        </p>
        <p className="info-modal-meta">Version {APP_VERSION}</p>
      </>
    ),
  },
  support: {
    title: 'Support',
    body: (
      <>
        <p>Need a hand or found something not working? We'd love to help.</p>
        <p>Email us at <a href="mailto:help@memory.bible">help@memory.bible</a> and
          we'll get back to you.</p>
        <p>You can also send us feedback directly from the menu.</p>
      </>
    ),
  },
  'exercise-settings': {
    title: 'Exercise Settings',
    body: <p className="info-modal-soon">Coming soon — you'll be able to choose which exercise types appear and tune their difficulty here.</p>,
  },
  'flip-reverse': {
    title: 'Flip Card Reverse',
    body: <p className="info-modal-soon">Coming soon — practice in reverse: see the verse text and recall the reference.</p>,
  },
  documentation: {
    title: 'Documentation',
    body: <p className="info-modal-soon">Coming soon — guides and tips for getting the most out of Memory.bible.</p>,
  },
};

export default function InfoModal({ kind, onClose }) {
  const content = CONTENT[kind];
  if (!content) return null;

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box info-modal">
        <button className="modal-close-btn" onClick={onClose} aria-label="Close"><Icon name="close" size={16} /></button>
        <h2 className="info-modal-title">{content.title}</h2>
        <div className="info-modal-body">{content.body}</div>
        <button className="ob-btn-primary" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
