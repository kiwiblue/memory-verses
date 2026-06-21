import { useState } from 'react';
import { saveUsers, saveCurrentUserId, loadUserPhoto } from '../data/users.js';

const PRESETS = ['#3a8c5c','#2a6ab5','#9a3a3a','#7a5c9a','#9a6c10','#3a7a8c','#555555','#c0392b'];

function Avatar({ user, onClick, size = 32 }) {
  const photo = loadUserPhoto(user.id);
  return (
    <div
      className="avatar"
      style={{ background: photo ? 'transparent' : user.colour, width: size, height: size }}
      onClick={onClick}
      title={user.name}
    >
      {photo
        ? <img src={photo} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
        : user.name.charAt(0).toUpperCase()
      }
    </div>
  );
}

export default function UserPanel({ users, currentUser, onUserChange, onUsersChange, onOpenProfile }) {
  const [open, setOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', bracket: 'adult', translation: 'esv', colour: PRESETS[0] });
  const [error, setError] = useState('');

  function handleToggle() {
    setOpen(o => !o);
    setShowForm(false);
    setError('');
  }

  function handleSelectUser(user) {
    saveCurrentUserId(user.id);
    onUserChange(user);
    setOpen(false);
  }

  function handleSave() {
    if (!form.name.trim()) {
      setError('Name is required.');
      return;
    }
    const newUser = {
      id: crypto.randomUUID(),
      name: form.name.trim(),
      bracket: form.bracket,
      bracket_updated: Date.now(),
      colour: form.colour,
      translation: form.translation,
    };
    const updated = [...users, newUser];
    saveUsers(updated);
    saveCurrentUserId(newUser.id);
    onUsersChange(updated);
    onUserChange(newUser);
    setShowForm(false);
    setOpen(false);
    setForm({ name: '', bracket: 'adult', translation: 'esv', colour: PRESETS[0] });
    setError('');
  }

  function handleCancel() {
    setShowForm(false);
    setError('');
    setForm({ name: '', bracket: 'adult', translation: 'esv', colour: PRESETS[0] });
  }

  return (
    <div className="user-panel-wrap">
      {currentUser && <Avatar user={currentUser} onClick={handleToggle} />}

      {open && (
        <div className="user-panel">
          {users.map(u => (
            <div
              key={u.id}
              className={`user-row${u.id === currentUser?.id ? ' active' : ''}`}
              onClick={() => handleSelectUser(u)}
            >
              <Avatar user={u} size={26} />
              <span className="uname">{u.name}</span>
            </div>
          ))}

          <button
            className="profile-link-row"
            onClick={() => { setOpen(false); onOpenProfile(); }}
          >
            Edit profile
          </button>

          <div className="panel-divider" />

          {!showForm && (
            <button
              className="add-btn"
              disabled={users.length >= 5}
              onClick={() => setShowForm(true)}
            >
              + Add profile
            </button>
          )}

          {showForm && (
            <div className="user-form">
              <div>
                <label>First name</label>
                <input
                  type="text"
                  placeholder="Name"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div>
                <label>Age group</label>
                <select
                  value={form.bracket}
                  onChange={e => setForm(f => ({ ...f, bracket: e.target.value }))}
                >
                  <option value="child">Child (under 10)</option>
                  <option value="youth">Youth (10–17)</option>
                  <option value="adult">Adult (18+)</option>
                </select>
              </div>
              <div>
                <label>Translation</label>
                <select
                  value={form.translation}
                  onChange={e => setForm(f => ({ ...f, translation: e.target.value }))}
                >
                  <option value="esv">ESV</option>
                  <option value="kjv">KJV</option>
                  <option value="niv">NIV</option>
                  <option value="nlt">NLT</option>
                  <option value="nkjv">NKJV</option>
                  <option value="nasb">NASB</option>
                  <option value="bsb">BSB</option>
                </select>
              </div>
              <div>
                <label>Colour</label>
                <div className="swatches">
                  {PRESETS.map(c => (
                    <div
                      key={c}
                      className={`swatch${form.colour === c ? ' selected' : ''}`}
                      style={{ background: c }}
                      onClick={() => setForm(f => ({ ...f, colour: c }))}
                    />
                  ))}
                </div>
              </div>
              {error && <div style={{ fontSize: 11, color: '#c0392b' }}>{error}</div>}
              <div className="form-btns">
                <button className="btn btn-ok" style={{ flex: 1 }} onClick={handleSave}>Save</button>
                <button className="btn" style={{ flex: 1 }} onClick={handleCancel}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
