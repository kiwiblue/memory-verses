import { useState } from 'react';
import { loadAuth } from '../data/auth.js';

const TYPES = [
  { value: 'bug',     label: 'Bug report' },
  { value: 'feature', label: 'Feature request' },
  { value: 'general', label: 'General feedback' },
];

export default function FeedbackModal({ onClose }) {
  const [type, setType]       = useState('general');
  const [message, setMessage] = useState('');
  const [status, setStatus]   = useState('idle'); // idle | sending | done | error

  async function handleSubmit(e) {
    e.preventDefault();
    if (message.trim().length < 5) return;
    setStatus('sending');
    try {
      const auth = loadAuth();
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id: auth?.accountId, type, message: message.trim() }),
      });
      setStatus(res.ok ? 'done' : 'error');
    } catch {
      setStatus('error');
    }
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box feedback-modal">
        <button className="modal-close-btn" onClick={onClose} aria-label="Close">✕</button>

        {status === 'done' ? (
          <div className="feedback-done">
            <div className="feedback-done-icon">✓</div>
            <div className="feedback-done-title">Thanks for your feedback!</div>
            <p className="feedback-done-sub">We read every submission and use it to improve Memory.bible.</p>
            <button className="ob-btn-primary" onClick={onClose}>Close</button>
          </div>
        ) : (
          <>
            <h2 className="feedback-title">Send feedback</h2>
            <form onSubmit={handleSubmit} className="feedback-form">
              <div className="feedback-type-row">
                {TYPES.map(t => (
                  <button
                    key={t.value}
                    type="button"
                    className={`feedback-type-btn${type === t.value ? ' feedback-type-active' : ''}`}
                    onClick={() => setType(t.value)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <textarea
                className="feedback-textarea"
                placeholder="Tell us what's on your mind…"
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={5}
                maxLength={2000}
                autoFocus
              />
              <div className="feedback-footer-row">
                <span className="feedback-char-count">{message.length}/2000</span>
                {status === 'error' && (
                  <span className="feedback-error">Something went wrong — please try again.</span>
                )}
                <button
                  className="ob-btn-primary feedback-submit-btn"
                  disabled={message.trim().length < 5 || status === 'sending'}
                >
                  {status === 'sending' ? 'Sending…' : 'Send'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
