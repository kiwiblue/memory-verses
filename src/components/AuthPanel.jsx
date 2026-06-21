import { useState } from 'react';
import { registerAccount, loginAccount, logoutAccount } from '../data/syncService.js';
import { saveAuth, clearAuth } from '../data/auth.js';
import { saveUsers, saveCurrentUserId } from '../data/users.js';
import { saveProgress } from '../data/progress.js';
import { saveVerseTranslations } from '../data/users.js';

function timeSince(ts) {
  if (!ts) return null;
  const secs = Math.floor((Date.now() - ts) / 1000);
  if (secs < 10) return 'just now';
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  return `${Math.floor(secs / 3600)}h ago`;
}

export default function AuthPanel({ auth, users, syncStatus, lastSynced, onAuthChange, onUsersChange }) {
  const [view, setView]       = useState('idle'); // idle | register | login
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy]       = useState(false);
  const [error, setError]     = useState('');

  function reset() { setEmail(''); setPassword(''); setConfirm(''); setError(''); }

  async function handleRegister() {
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setBusy(true); setError('');
    try {
      const data = await registerAccount(email.trim(), password, users);
      saveAuth(data);
      onAuthChange(data);
      setView('idle'); reset();
    } catch (e) {
      setError(e.message);
    } finally { setBusy(false); }
  }

  async function handleLogin() {
    setBusy(true); setError('');
    try {
      const data = await loginAccount(email.trim(), password);
      saveAuth(data);

      // Merge cloud profiles into local storage (cloud wins for existing IDs)
      if (data.profiles?.length) {
        const cloudUsers = data.profiles.map(p => JSON.parse(p.profile_json));

        // Merge: keep local profiles not on cloud, add/replace cloud profiles
        const cloudIds = new Set(cloudUsers.map(u => u.id));
        const localOnly = users.filter(u => !cloudIds.has(u.id));
        const merged = [...cloudUsers, ...localOnly];

        saveUsers(merged);
        saveCurrentUserId(cloudUsers[0].id);

        // Restore progress + translations from cloud
        data.profiles.forEach(p => {
          try { saveProgress(p.id, JSON.parse(p.progress_json)); } catch {}
          try { saveVerseTranslations(p.id, JSON.parse(p.trans_json)); } catch {}
        });

        onUsersChange(merged, cloudUsers[0]);
      }

      onAuthChange(data);
      setView('idle'); reset();
    } catch (e) {
      setError(e.message);
    } finally { setBusy(false); }
  }

  async function handleLogout() {
    if (auth.token) await logoutAccount(auth.token).catch(() => {});
    clearAuth();
    onAuthChange({ token: null, accountId: null, email: null });
  }

  // ── Signed in ───────────────────────────────────────────────────────────
  if (auth.token) {
    return (
      <div className="auth-panel">
        <div className="auth-row">
          <span className="auth-indicator connected">●</span>
          <span className="auth-email">{auth.email}</span>
          <button className="profile-link-btn muted" onClick={handleLogout}>Sign out</button>
        </div>
        <div className="auth-sync-status">
          {syncStatus === 'syncing' && 'Syncing…'}
          {syncStatus === 'synced'  && `Saved · ${timeSince(lastSynced)}`}
          {syncStatus === 'error'   && 'Sync failed — will retry'}
          {!syncStatus              && lastSynced && `Last saved · ${timeSince(lastSynced)}`}
        </div>
      </div>
    );
  }

  // ── Register form ────────────────────────────────────────────────────────
  if (view === 'register') {
    return (
      <div className="auth-panel">
        <div className="auth-form-title">Create an account</div>
        <input className="auth-input" type="email" placeholder="Email address"
          value={email} onChange={e => setEmail(e.target.value)} disabled={busy} />
        <input className="auth-input" type="password" placeholder="Password (8+ characters)"
          value={password} onChange={e => setPassword(e.target.value)} disabled={busy} />
        <input className="auth-input" type="password" placeholder="Confirm password"
          value={confirm} onChange={e => setConfirm(e.target.value)} disabled={busy} />
        {error && <div className="auth-error">{error}</div>}
        <div className="auth-form-note">
          Your existing profiles and all progress will be saved to your account.
        </div>
        <div className="auth-btns">
          <button className="btn" onClick={() => { setView('idle'); reset(); }}>Cancel</button>
          <button className="btn btn-ok" onClick={handleRegister} disabled={busy || !email || !password || !confirm}>
            {busy ? 'Creating…' : 'Create account'}
          </button>
        </div>
        <div className="auth-switch">
          Already have an account?{' '}
          <span className="auth-link" onClick={() => { setView('login'); reset(); }}>Sign in</span>
        </div>
      </div>
    );
  }

  // ── Login form ───────────────────────────────────────────────────────────
  if (view === 'login') {
    return (
      <div className="auth-panel">
        <div className="auth-form-title">Sign in</div>
        <input className="auth-input" type="email" placeholder="Email address"
          value={email} onChange={e => setEmail(e.target.value)} disabled={busy} />
        <input className="auth-input" type="password" placeholder="Password"
          value={password} onChange={e => setPassword(e.target.value)} disabled={busy} />
        {error && <div className="auth-error">{error}</div>}
        <div className="auth-btns">
          <button className="btn" onClick={() => { setView('idle'); reset(); }}>Cancel</button>
          <button className="btn btn-ok" onClick={handleLogin} disabled={busy || !email || !password}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </div>
        <div className="auth-switch">
          New here?{' '}
          <span className="auth-link" onClick={() => { setView('register'); reset(); }}>Create an account</span>
        </div>
      </div>
    );
  }

  // ── Idle (not signed in) ─────────────────────────────────────────────────
  return (
    <div className="auth-panel">
      <div className="auth-row">
        <span className="auth-indicator">●</span>
        <span className="auth-desc">Not backed up</span>
      </div>
      <div className="auth-cta">
        Create an account to keep your progress safe and sync across devices.
      </div>
      <div className="auth-btns">
        <button className="btn" onClick={() => setView('login')}>Sign in</button>
        <button className="btn btn-ok" onClick={() => setView('register')}>Create account</button>
      </div>
    </div>
  );
}
