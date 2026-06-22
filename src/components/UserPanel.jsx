import { useState, useEffect, useRef } from 'react';
import { saveUsers, saveCurrentUserId } from '../data/users.js';
import { avatarStyle } from '../data/avatarStyle.js';

const PRESETS = ['#3a8c5c','#2a6ab5','#9a3a3a','#7a5c9a','#9a6c10','#3a7a8c','#555555','#c0392b'];

function Avatar({ user, onClick, size = 32 }) {
  return (
    <div
      className="avatar"
      style={{ ...avatarStyle(user.colour, user.pattern), width: size, height: size, '--user-colour': user.colour }}
      onClick={onClick}
      title={user.name}
    >
      {user.name.charAt(0).toUpperCase()}
    </div>
  );
}

export default function UserPanel({ users, currentUser, onUserChange, onUsersChange, onOpenProfile }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('touchstart', handleClick);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('touchstart', handleClick);
    };
  }, [open]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', bracket: 'adult', translation: 'kjv', colour: PRESETS[0] });
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
    setForm({ name: '', bracket: 'adult', translation: 'kjv', colour: PRESETS[0] });
    setError('');
  }

  function handleCancel() {
    setShowForm(false);
    setError('');
    setForm({ name: '', bracket: 'adult', translation: 'kjv', colour: PRESETS[0] });
  }

  return (
    <div className="user-panel-wrap" ref={wrapRef}>
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
              <button
                className="user-edit-btn"
                title="Edit profile"
                onClick={e => { e.stopPropagation(); setOpen(false); onOpenProfile(u); }}
              >✏</button>
            </div>
          ))}

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
                <div className="tabs" style={{ marginTop: 2 }}>
                  {[
                    { value: 'child', label: 'Child (under 10)' },
                    { value: 'youth', label: 'Youth (10+)' },
                    { value: 'adult', label: 'Adult' },
                  ].map(opt => (
                    <div
                      key={opt.value}
                      className={`tab${form.bracket === opt.value ? ' on' : ''}`}
                      onClick={() => setForm(f => ({ ...f, bracket: opt.value }))}
                    >{opt.label}</div>
                  ))}
                </div>
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
