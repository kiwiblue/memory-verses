import { useState, useEffect } from 'react';
import { saveUsers, saveCurrentUserId } from '../data/users.js';
import AuthPanel from './AuthPanel.jsx';
import { PATTERNS, avatarStyle, DEFAULT_PATTERN_OPACITY, PATTERN_OPACITY_MIN, PATTERN_OPACITY_MAX } from '../data/avatarStyle.js';
import {
  isPushSupported, getSubscriptionState, subscribePush, unsubscribePush,
  updateReminderHour, sendTestNotification, DEFAULT_REMINDER_HOUR,
  getReminderPrefs, setReminderChannel,
} from '../data/pushNotifications.js';
import OverlayHeader from './OverlayHeader.jsx';
import { APP_VERSION } from '../data/version.js';

function formatHour(h) {
  const period = h < 12 ? 'AM' : 'PM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:00 ${period}`;
}

// Curated avatar palette — harmonises with the neutral + indigo theme, spans
// warm/cool evenly, and every colour is deep enough for white initials to stay
// readable (all ≥3.9:1 contrast with white). Teal (index 0) is the default.
const PRESETS = ['#2f868d','#3d6fc0','#5b57c4','#9450a6','#bb4a68','#bc5f3a','#3f8f5f','#5a6675'];
const TRANSLATIONS = [
  { value: 'kjv',  label: 'KJV' },
  { value: 'bsb',  label: 'BSB' },
  { value: 'esv',  label: 'ESV' },
  { value: 'niv',  label: 'NIV' },
  { value: 'nkjv', label: 'NKJV' },
  { value: 'nasb', label: 'NASB' },
];
const BRACKETS = [
  { value: 'child', label: 'Child (under 10)' },
  { value: 'youth', label: 'Youth (10+)' },
  { value: 'adult', label: 'Adult' },
];

function BigAvatar({ user, colour, pattern, patternOpacity, size = 72 }) {
  return (
    <div
      className="profile-avatar"
      style={{ ...avatarStyle(colour, pattern, patternOpacity), width: size, height: size, '--user-colour': colour }}
    >
      {user.name.charAt(0).toUpperCase()}
    </div>
  );
}

// Fade slider for the pattern's opacity — only meaningful once a pattern
// (other than Solid) is chosen.
function PatternFadeSlider({ value, onChange, disabled }) {
  return (
    <div className={`pm-field pm-fade-field${disabled ? ' pm-fade-disabled' : ''}`}>
      <label className="pm-label">Pattern fade</label>
      <input
        type="range"
        className="pm-fade-slider"
        min={PATTERN_OPACITY_MIN} max={PATTERN_OPACITY_MAX} step={0.01}
        value={value}
        disabled={disabled}
        onChange={e => onChange(parseFloat(e.target.value))}
      />
    </div>
  );
}

// ── Add family member sub-screen ──────────────────────────────────────────────
function AddMemberForm({ users, onSave, onCancel }) {
  const [name, setName] = useState('');
  const [bracket, setBracket] = useState('youth');
  const [translation, setTranslation] = useState('kjv');
  const [colour, setColour] = useState(PRESETS[1]);
  const [pattern, setPattern] = useState('none');
  const [patternOpacity, setPatternOpacity] = useState(DEFAULT_PATTERN_OPACITY);
  const [error, setError] = useState('');

  function handleSave() {
    if (!name.trim()) { setError('Name is required.'); return; }
    const newUser = {
      id: crypto.randomUUID(),
      name: name.trim(),
      bracket,
      bracket_updated: Date.now(),
      colour,
      pattern,
      patternOpacity,
      translation,
    };
    const updated = [...users, newUser];
    saveUsers(updated);
    saveCurrentUserId(newUser.id);
    onSave(newUser, updated);
  }

  return (
    <div className="pm-add-form">
      <div className="pm-section-title">Add Family Member</div>

      <div className="pm-field">
        <label className="pm-label">Name</label>
        <input
          className="pm-input"
          type="text"
          placeholder="First name"
          value={name}
          onChange={e => { setName(e.target.value); setError(''); }}
          autoFocus
        />
        {error && <div className="pm-field-error">{error}</div>}
      </div>

      <div className="pm-field">
        <label className="pm-label">Age group</label>
        <div className="tabs">
          {BRACKETS.map(opt => (
            <div key={opt.value} className={`tab${bracket === opt.value ? ' on' : ''}`}
              onClick={() => setBracket(opt.value)}>{opt.label}</div>
          ))}
        </div>
      </div>

      <div className="pm-field">
        <label className="pm-label">Translation</label>
        <select className="pm-select" value={translation} onChange={e => setTranslation(e.target.value)}>
          {TRANSLATIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      <div className="pm-edit-appearance">
        <div className="pm-appearance-controls">
          <div className="pm-field">
            <label className="pm-label">Colour</label>
            <div className="swatches">
              {PRESETS.map(c => (
                <div key={c} className={`swatch${colour === c ? ' selected' : ''}`}
                  style={{ background: c }} onClick={() => setColour(c)} />
              ))}
            </div>
          </div>
          <div className="pm-field">
            <label className="pm-label">Pattern</label>
            <div className="swatches">
              {PATTERNS.map(p => (
                <div key={p.id} className={`swatch${pattern === p.id ? ' selected' : ''}`}
                  style={avatarStyle(colour, p.id, patternOpacity)} onClick={() => setPattern(p.id)} title={p.label} />
              ))}
            </div>
            <PatternFadeSlider value={patternOpacity} onChange={setPatternOpacity} disabled={pattern === 'none'} />
          </div>
        </div>
        <BigAvatar user={{ name: name || '?' }} colour={colour} pattern={pattern} patternOpacity={patternOpacity} size={84} />
      </div>

      <div className="pm-form-btns">
        <button className="btn btn-ok" onClick={handleSave}>Create profile</button>
        <button className="btn" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

// ── Edit sub-screen [9] ───────────────────────────────────────────────────────
function EditForm({ user, onSave, onCancel }) {
  const [name, setName] = useState(user.name);
  const [bracket, setBracket] = useState(user.bracket || 'adult');
  const [translation, setTranslation] = useState(user.translation || 'kjv');
  const [colour, setColour] = useState(user.colour || PRESETS[0]);
  const [pattern, setPattern] = useState(user.pattern || 'none');
  const [patternOpacity, setPatternOpacity] = useState(user.patternOpacity ?? DEFAULT_PATTERN_OPACITY);
  const [nameError, setNameError] = useState('');

  function handleSave() {
    if (!name.trim()) { setNameError('Name is required.'); return; }
    onSave({ name: name.trim(), bracket, translation, colour, pattern, patternOpacity });
  }

  return (
    <div className="pm-add-form">
      <div className="pm-edit-title-row">
        <div className="pm-section-title">Edit Profile</div>
        <button className="pm-save-btn" onClick={handleSave}>SAVE</button>
      </div>

      <div className="pm-edit-appearance">
        <div className="pm-appearance-controls">
          <div className="pm-field">
            <label className="pm-label">Colour</label>
            <div className="swatches">
              {PRESETS.map(c => (
                <div key={c} className={`swatch${colour === c ? ' selected' : ''}`}
                  style={{ background: c }} onClick={() => setColour(c)} />
              ))}
            </div>
          </div>
          <div className="pm-field">
            <label className="pm-label">Pattern</label>
            <div className="swatches">
              {PATTERNS.map(p => (
                <div key={p.id} className={`swatch${pattern === p.id ? ' selected' : ''}`}
                  style={avatarStyle(colour, p.id, patternOpacity)} onClick={() => setPattern(p.id)} title={p.label} />
              ))}
            </div>
            <PatternFadeSlider value={patternOpacity} onChange={setPatternOpacity} disabled={pattern === 'none'} />
          </div>
        </div>
        <BigAvatar user={{ ...user, name }} colour={colour} pattern={pattern} patternOpacity={patternOpacity} size={84} />
      </div>

      <div className="pm-field">
        <label className="pm-label">Name</label>
        <input className="pm-input" type="text" value={name}
          onChange={e => { setName(e.target.value); setNameError(''); }} />
        {nameError && <div className="pm-field-error">{nameError}</div>}
      </div>

      <div className="pm-field">
        <label className="pm-label">Age group</label>
        <div className="tabs">
          {BRACKETS.map(opt => (
            <div key={opt.value} className={`tab${bracket === opt.value ? ' on' : ''}`}
              onClick={() => setBracket(opt.value)}>{opt.label}</div>
          ))}
        </div>
      </div>

      <div className="pm-field">
        <label className="pm-label">Preferred translation</label>
        <select className="pm-select" value={translation} onChange={e => setTranslation(e.target.value)}>
          {TRANSLATIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      <div className="pm-form-btns">
        <button className="btn" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

// ── Main User Profile screen [8] ──────────────────────────────────────────────
export default function ProfileModal({
  user, users, stats, ranking, rankingCount, auth, syncStatus, lastSynced,
  updateAvailable, onRefreshApp,
  initialSubscreen = null,
  onSave, onDelete, onClose, onHome, onOpenDeck, onOpenStats, onAuthChange, onUsersChange, onAddUser,
}) {
  const [colour, setColour]     = useState(user.colour || PRESETS[0]);
  const [pattern, setPattern]   = useState(user.pattern || 'none');
  const [subscreen, setSubscreen] = useState(initialSubscreen); // null | 'edit' | 'add'
  const [deleteStep, setDeleteStep] = useState(0);

  const canDelete = users.length > 1;
  const bracketLabel = BRACKETS.find(b => b.value === (user.bracket || 'adult'))?.label ?? 'Adult';
  const translationLabel = TRANSLATIONS.find(t => t.value === (user.translation || 'kjv'))?.label ?? 'KJV';

  function saveAppearance(newColour, newPattern) {
    const updated = { ...user, colour: newColour, pattern: newPattern };
    const updatedUsers = users.map(u => u.id === user.id ? updated : u);
    saveUsers(updatedUsers);
    onSave(updated, updatedUsers);
  }

  function handleColour(c) {
    setColour(c);
    saveAppearance(c, pattern);
  }

  function handlePattern(p) {
    setPattern(p);
    saveAppearance(colour, p);
  }

  function handleEditSave({ name, bracket, translation, colour: newColour, pattern: newPattern, patternOpacity: newPatternOpacity }) {
    const updated = { ...user, name, bracket, translation, colour: newColour, pattern: newPattern, patternOpacity: newPatternOpacity, bracket_updated: Date.now() };
    const updatedUsers = users.map(u => u.id === user.id ? updated : u);
    saveUsers(updatedUsers);
    onSave(updated, updatedUsers);
    setSubscreen(null);
  }

  // Reminders require a signed-in account — both push subscriptions and the
  // channel/hour/timezone preference are stored server-side against the
  // account, not the local profile.
  const reminderHour = user.reminderHour ?? DEFAULT_REMINDER_HOUR;
  const [pushState, setPushState] = useState('loading'); // loading | unsupported | unsubscribed | subscribed | denied
  const [pushBusy, setPushBusy]   = useState(false);
  const [testState, setTestState] = useState('idle'); // idle | sending | sent | error
  const [channel, setChannel]     = useState(null); // null (loading) | 'push' | 'email'
  const [channelBusy, setChannelBusy] = useState(false);

  useEffect(() => { getSubscriptionState().then(setPushState); }, []);
  useEffect(() => {
    if (!auth?.token) return;
    getReminderPrefs(auth.token).then(prefs => {
      if (prefs) setChannel(prefs.channel);
    });
  }, [auth?.token]);

  async function handleTogglePush() {
    setPushBusy(true);
    try {
      if (pushState === 'subscribed') {
        await unsubscribePush(auth.token);
        setPushState('unsubscribed');
      } else {
        await subscribePush(auth.token, reminderHour);
        setPushState('subscribed');
        setChannel('push');
      }
    } catch {
      setPushState(await getSubscriptionState());
    }
    setPushBusy(false);
  }

  async function handleHourChange(hour) {
    const updated = { ...user, reminderHour: hour };
    const updatedUsers = users.map(u => u.id === user.id ? updated : u);
    saveUsers(updatedUsers);
    onSave(updated, updatedUsers);
    if (channel === 'email') await setReminderChannel(auth.token, 'email', hour);
    else if (pushState === 'subscribed') await updateReminderHour(auth.token, hour);
  }

  async function handleChannelChange(newChannel) {
    if (newChannel === channel) return;
    setChannelBusy(true);
    try {
      if (newChannel === 'email') {
        await setReminderChannel(auth.token, 'email', reminderHour);
        setChannel('email');
      } else {
        // Switching to push always (re-)runs the subscribe flow — it also
        // marks the account's channel as 'push' server-side, and a fresh
        // permission grant may be needed if this device was never subscribed.
        await subscribePush(auth.token, reminderHour);
        setPushState('subscribed');
        setChannel('push');
      }
    } catch {
      // Permission denied or subscribe failed — leave channel as it was.
    }
    setChannelBusy(false);
  }

  async function handleTestSend() {
    setTestState('sending');
    try {
      await sendTestNotification(auth.token);
      setTestState('sent');
    } catch {
      setTestState('error');
    }
    setTimeout(() => setTestState('idle'), 3000);
  }

  function handleDeleteConfirm() {
    const remaining = users.filter(u => u.id !== user.id);
    saveUsers(remaining);
    if (remaining.length > 0) saveCurrentUserId(remaining[0].id);
    onDelete(remaining);
  }

  return (
    <div className="pm-overlay">
      <div className="pm-panel">
        <OverlayHeader onBack={subscreen ? () => setSubscreen(null) : onClose} user={user} onHome={onHome} />
      </div>

      <div className="pm-sheet">
        <div className="pm-sheet-inner">

        {subscreen === 'add' && (
          <AddMemberForm
            users={users}
            onSave={(newUser, updatedUsers) => { onAddUser(newUser, updatedUsers); setSubscreen(null); }}
            onCancel={() => setSubscreen(null)}
          />
        )}

        {subscreen === 'edit' && (
          <EditForm user={user} onSave={handleEditSave} onCancel={() => setSubscreen(null)} />
        )}

        {!subscreen && (<>

          {/* ── Your Profile card ──────────────────────────────────────── */}
          <div className="pm-card">
            <div className="pm-card-title-row">
              <span className="pm-card-title">Your Profile</span>
              <button className="pm-edit-link" onClick={() => setSubscreen('edit')}>Edit</button>
            </div>
            <div className="pm-info-row"><span className="pm-info-key">Name:</span><span className="pm-info-val">{user.name}</span></div>
            <div className="pm-info-row"><span className="pm-info-key">Age Group:</span><span className="pm-info-val">{bracketLabel}</span></div>
            <div className="pm-info-row"><span className="pm-info-key">Preferred Bible:</span><span className="pm-info-val">{translationLabel}</span></div>
            {auth?.email && (
              <div className="pm-info-row"><span className="pm-info-key">Account:</span><span className="pm-info-val pm-info-email">{auth.email}</span></div>
            )}
            <div className={`pm-update-row${updateAvailable ? ' pm-update-available' : ''}`}>
              <span className="pm-update-text">
                {updateAvailable ? 'Update available — refresh to get the latest version.' : `Version ${APP_VERSION}`}
              </span>
              <button className="pm-link-btn" onClick={onRefreshApp}>Refresh</button>
            </div>
          </div>

          {/* ── Add family members ─────────────────────────────────────── */}
          {users.length < 5 && (
            <button className="pm-action-btn" onClick={() => setSubscreen('add')}>
              + Add family members
            </button>
          )}

          {/* ── My deck ────────────────────────────────────────────────── */}
          <button className="pm-action-btn" onClick={onOpenDeck}>
            My deck
          </button>

          {/* ── Statistics ─────────────────────────────────────────────── */}
          {stats && (
            <div className="pm-card pm-stats-card">
              <div className="pm-card-title-row">
                <span className="pm-card-title">Statistics</span>
                <span className="pm-stats-total">{(stats.learning ?? 0) + (stats.mastered ?? 0)}</span>
              </div>
              {ranking != null && (
                <div className="pm-info-row"><span className="pm-info-key">Ranking:</span><span className="pm-info-val">#{ranking}{rankingCount > 1 ? ` of ${rankingCount}` : ''}</span></div>
              )}
              <div className="pm-info-row"><span className="pm-info-key">Total Verses:</span><span className="pm-info-val">{(stats.learning ?? 0) + (stats.mastered ?? 0)}</span></div>
              <div className="pm-info-row"><span className="pm-info-key">Learning:</span><span className="pm-info-val">{stats.learning ?? 0}</span></div>
              <div className="pm-info-row"><span className="pm-info-key">Mastered:</span><span className="pm-info-val">{stats.mastered ?? 0}</span></div>
              <div className="pm-stats-link" onClick={onOpenStats}>view all stats ›</div>
            </div>
          )}

          {/* ── Reminders ──────────────────────────────────────────────── */}
          <div className="pm-card">
            <div className="pm-card-title">Reminders</div>
            {!auth?.token ? (
              <p className="pm-hint">Sign in to enable daily reminders.</p>
            ) : channel === null ? (
              <p className="pm-hint">Loading…</p>
            ) : (
              <>
                <div className="push-toggle-row">
                  <span className="push-toggle-label">Remind me via</span>
                  <div className="pm-segmented">
                    <button
                      className={`pm-segmented-btn${channel === 'push' ? ' active' : ''}`}
                      disabled={channelBusy}
                      onClick={() => handleChannelChange('push')}
                    >Mobile</button>
                    <button
                      className={`pm-segmented-btn${channel === 'email' ? ' active' : ''}`}
                      disabled={channelBusy}
                      onClick={() => handleChannelChange('email')}
                    >Email</button>
                  </div>
                </div>

                {channel === 'push' && (
                  pushState === 'unsupported' ? (
                    <p className="pm-hint">Push notifications aren't supported on this browser/device — try Email instead, or add this app to your home screen first.</p>
                  ) : pushState === 'denied' ? (
                    <p className="pm-hint">Notifications are blocked for this site. Enable them in your browser/system settings to turn reminders on.</p>
                  ) : (
                    <>
                      <div className="push-toggle-row">
                        <span className="push-toggle-label">Daily Memory Reminder</span>
                        <button
                          className={`push-toggle-btn${pushState === 'subscribed' ? ' on' : ''}`}
                          disabled={pushBusy || pushState === 'loading'}
                          onClick={handleTogglePush}
                        >{pushState === 'subscribed' ? 'On' : 'Off'}</button>
                      </div>
                      {pushState === 'subscribed' && (
                        <>
                          <div className="push-toggle-row">
                            <span className="push-toggle-label">Reminder time</span>
                            <select
                              className="pm-fade-field"
                              value={reminderHour}
                              onChange={(e) => handleHourChange(Number(e.target.value))}
                            >
                              {Array.from({ length: 24 }, (_, h) => (
                                <option key={h} value={h}>{formatHour(h)}</option>
                              ))}
                            </select>
                          </div>
                          <div className="push-toggle-row">
                            <button className="pm-link-btn" disabled={testState === 'sending'} onClick={handleTestSend}>
                              {testState === 'sending' ? 'Sending…' : testState === 'sent' ? 'Sent!' : testState === 'error' ? 'Failed — try again' : 'Send test notification'}
                            </button>
                          </div>
                        </>
                      )}
                    </>
                  )
                )}

                {channel === 'email' && (
                  <>
                    <p className="pm-hint">Daily reminder emails will be sent to {auth.email}.</p>
                    <div className="push-toggle-row">
                      <span className="push-toggle-label">Reminder time</span>
                      <select
                        className="pm-fade-field"
                        value={reminderHour}
                        onChange={(e) => handleHourChange(Number(e.target.value))}
                      >
                        {Array.from({ length: 24 }, (_, h) => (
                          <option key={h} value={h}>{formatHour(h)}</option>
                        ))}
                      </select>
                    </div>
                    <div className="push-toggle-row">
                      <button className="pm-link-btn" disabled={testState === 'sending'} onClick={handleTestSend}>
                        {testState === 'sending' ? 'Sending…' : testState === 'sent' ? 'Sent!' : testState === 'error' ? 'Failed — try again' : 'Send test email'}
                      </button>
                    </div>
                  </>
                )}

                <div className="push-toggle-row">
                  <span className="push-toggle-label">Danger of losing streak (coming soon)</span>
                  <button className="push-toggle-btn" disabled>Off</button>
                </div>
              </>
            )}
          </div>

          {/* ── Cloud backup ───────────────────────────────────────────── */}
          <div className="pm-card">
            <div className="pm-card-title">Cloud backup</div>
            <AuthPanel
              auth={auth}
              users={users}
              syncStatus={syncStatus}
              lastSynced={lastSynced}
              onAuthChange={onAuthChange}
              onUsersChange={onUsersChange}
            />
          </div>

          {/* ── Delete profile ─────────────────────────────────────────── */}
          {canDelete && (
            <div className="pm-delete-section">
              {deleteStep === 0 && (
                <button className="pm-delete-btn" onClick={() => setDeleteStep(1)}>Delete profile</button>
              )}
              {deleteStep === 1 && (
                <div className="pm-delete-confirm">
                  <div className="pm-delete-warning">
                    This will permanently delete <strong>{user.name}</strong>'s profile and all their progress.
                  </div>
                  <div className="pm-delete-actions">
                    <button className="btn" onClick={() => setDeleteStep(0)}>Cancel</button>
                    <button className="btn pm-delete-final" onClick={handleDeleteConfirm}>Yes, delete</button>
                  </div>
                </div>
              )}
            </div>
          )}

        </>)}

        </div>
      </div>
    </div>
  );
}
