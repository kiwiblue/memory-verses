import { useState, useRef } from 'react';
import { saveUsers, saveCurrentUserId, loadUserPhoto, saveUserPhoto } from '../data/users.js';

const PRESETS = ['#3a8c5c','#2a6ab5','#9a3a3a','#7a5c9a','#9a6c10','#3a7a8c','#555555','#c0392b'];

function Avatar({ user, photo, size = 72, onClick }) {
  return (
    <div
      className="profile-avatar"
      style={{ background: photo ? 'transparent' : user.colour, width: size, height: size, cursor: onClick ? 'pointer' : 'default' }}
      onClick={onClick}
      title={onClick ? 'Change photo' : user.name}
    >
      {photo
        ? <img src={photo} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
        : user.name.charAt(0).toUpperCase()
      }
    </div>
  );
}

export default function ProfileModal({ user, users, stats, onSave, onDelete, onClose }) {
  const [name, setName]       = useState(user.name);
  const [bracket, setBracket] = useState(user.bracket || 'adult');
  const [colour, setColour]   = useState(user.colour || PRESETS[0]);
  const [photo, setPhoto]     = useState(() => loadUserPhoto(user.id));
  const [deleteStep, setDeleteStep] = useState(0); // 0=idle, 1=confirm
  const [nameError, setNameError]   = useState('');
  const fileRef = useRef();

  const canDelete = users.length > 1;

  function handlePhotoClick() { fileRef.current?.click(); }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setPhoto(ev.target.result);
    reader.readAsDataURL(file);
  }

  function handleRemovePhoto() { setPhoto(null); }

  function handleSave() {
    if (!name.trim()) { setNameError('Name is required.'); return; }
    const updated = { ...user, name: name.trim(), bracket, colour, bracket_updated: Date.now() };
    const updatedUsers = users.map(u => u.id === user.id ? updated : u);
    saveUsers(updatedUsers);
    saveUserPhoto(user.id, photo);
    onSave(updated, updatedUsers);
  }

  function handleDeleteConfirm() {
    const remaining = users.filter(u => u.id !== user.id);
    saveUsers(remaining);
    saveUserPhoto(user.id, null);
    if (remaining.length > 0) saveCurrentUserId(remaining[0].id);
    onDelete(remaining);
  }

  return (
    <div className="profile-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="profile-modal">
        <div className="profile-modal-hdr">
          <button className="profile-back" onClick={onClose}>← Back</button>
          <span className="profile-modal-title">Profile</span>
          <button className="profile-save-btn" onClick={handleSave}>Save</button>
        </div>

        {/* Avatar / photo */}
        <div className="profile-avatar-row">
          <Avatar user={{ ...user, colour }} photo={photo} size={72} onClick={handlePhotoClick} />
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
          <div className="profile-avatar-actions">
            <button className="profile-link-btn" onClick={handlePhotoClick}>
              {photo ? 'Change photo' : 'Upload photo'}
            </button>
            {photo && (
              <button className="profile-link-btn muted" onClick={handleRemovePhoto}>Remove photo</button>
            )}
          </div>
        </div>

        {/* Colour swatches (hidden when photo is set) */}
        {!photo && (
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
        )}

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
