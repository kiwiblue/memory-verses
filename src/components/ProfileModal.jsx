import { useState } from 'react';
import { saveUsers, saveCurrentUserId } from '../data/users.js';
import AuthPanel from './AuthPanel.jsx';

const PRESETS = ['#3a8c5c','#2a6ab5','#9a3a3a','#7a5c9a','#9a6c10','#3a7a8c','#555555','#c0392b'];
const TRANSLATIONS = [
  { value: 'esv',  label: 'ESV' },
  { value: 'kjv',  label: 'KJV' },
  { value: 'bsb',  label: 'BSB' },
  { value: 'niv',  label: 'NIV' },
  { value: 'nkjv', label: 'NKJV' },
  { value: 'nasb', label: 'NASB' },
];

function Avatar({ user, size = 72 }) {
  return (
    <div
      className="profile-avatar"
      style={{ background: user.colour, width: size, height: size }}
    >
      {user.name.charAt(0).toUpperCase()}
    </div>
  );
}

export default function ProfileModal({ user, users, stats, auth, syncStatus, lastSynced, onSave, onDelete, onClose, onAuthChange, onUsersChange }) {
  const [name, setName]           = useState(user.name);
  const [bracket, setBracket]     = useState(user.bracket || 'adult');
  const [colour, setColour]       = useState(user.colour || PRESETS[0]);
  const [translation, setTranslation] = useState(user.translation || 'esv');
  const [deleteStep, setDeleteStep]   = useState(0);
  const [nameError, setNameError]     = useState('');

  const canDelete = users.length > 1;

  function handleSave() {
    if (!name.trim()) { setNameError('Name is required.'); return; }
    const updated = { ...user, name: name.trim(), bracket, colour, translation, bracket_updated: Date.now() };
    const updatedUsers = users.map(u => u.id === user.id ? updated : u);
    saveUsers(updatedUsers);
    onSave(updated, updatedUsers);
  }

  function handleDismiss() {
    if (name.trim()) handleSave();
    else onClose();
  }

  function handleDeleteConfirm() {
    const remaining = users.filter(u => u.id !== user.id);
    saveUsers(remaining);
    if (remaining.length > 0) saveCurrentUserId(remaining[0].id);
    onDelete(remaining);
  }

  return (
    <div className="profile-overlay" onClick={e => { if (e.target === e.currentTarget) handleDismiss(); }}>
      <div className="profile-modal">
        <div className="profile-modal-hdr">
          <button className="profile-back" onClick={handleDismiss}>← Back</button>
          <span className="profile-modal-title">Profile</span>
          <button className="profile-save-btn" onClick={handleSave}>Save</button>
        </div>

        {/* Avatar */}
        <div className="profile-avatar-row">
          <Avatar user={{ ...user, colour }} size={72} />
        </div>

        {/* Colour swatches */}
        <div className="profile-field">
          <label className="profile-label">Colour</label>
          <div className="swatches">
            {PRESETS.map(c => (
              <div
                key={c}
                className={`swatch${colour === c ? ' selected' : ''}`}
                style={{ background: c }}
                onClick={() => setColour(c)}
              />
            ))}
          </div>
        </div>

        {/* Name */}
        <div className="profile-field">
          <label className="profile-label">Name</label>
          <input
            type="text"
            value={name}
            onChange={e => { setName(e.target.value); setNameError(''); }}
            placeholder="First name"
          />
          {nameError && <div className="profile-field-error">{nameError}</div>}
        </div>

        {/* Age bracket */}
        <div className="profile-field">
          <label className="profile-label">Age group</label>
          <div className="tabs">
            {[
              { value: 'child', label: 'Child (under 10)' },
              { value: 'youth', label: 'Youth (10+)' },
              { value: 'adult', label: 'Adult' },
            ].map(opt => (
              <div
                key={opt.value}
                className={`tab${bracket === opt.value ? ' on' : ''}`}
                onClick={() => setBracket(opt.value)}
              >{opt.label}</div>
            ))}
          </div>
          <div className="profile-field-hint">Controls which verses appear in the deck.</div>
        </div>

        {/* Translation */}
        <div className="profile-field">
          <label className="profile-label">Preferred translation</label>
          <div className="tabs trans-tabs">
            {TRANSLATIONS.map(opt => (
              <div
                key={opt.value}
                className={`tab${translation === opt.value ? ' on' : ''}`}
                onClick={() => setTranslation(opt.value)}
              >{opt.label}</div>
            ))}
          </div>
          <div className="profile-field-hint">Used by default across the app. Individual verses can still use a different translation.</div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="profile-field">
            <label className="profile-label">Progress</label>
            <div className="profile-stats">
              <div className="profile-stat un">
                <span className="v">{stats.unseen}</span>
                <span className="k">Unseen</span>
              </div>
              <div className="profile-stat le">
                <span className="v">{stats.learning}</span>
                <span className="k">Learning</span>
              </div>
              <div className="profile-stat ma">
                <span className="v">{stats.mastered}</span>
                <span className="k">Mastered</span>
              </div>
            </div>
          </div>
        )}

        {/* Cloud backup */}
        <div className="profile-field">
          <label className="profile-label">Cloud backup</label>
          <AuthPanel
            auth={auth}
            users={users}
            syncStatus={syncStatus}
            lastSynced={lastSynced}
            onAuthChange={onAuthChange}
            onUsersChange={onUsersChange}
          />
        </div>

        {/* Delete */}
        {canDelete && (
          <div className="profile-delete-section">
            {deleteStep === 0 && (
              <button className="profile-delete-btn" onClick={() => setDeleteStep(1)}>
                Delete profile
              </button>
            )}
            {deleteStep === 1 && (
              <div className="profile-delete-confirm">
                <div className="profile-delete-warning">
                  This will permanently delete <strong>{user.name}</strong>'s profile and all their progress. This cannot be undone.
                </div>
                <div className="profile-delete-actions">
                  <button className="btn" onClick={() => setDeleteStep(0)}>Cancel</button>
                  <button className="btn profile-delete-final" onClick={handleDeleteConfirm}>
                    Yes, delete profile
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
