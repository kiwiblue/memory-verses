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

async function apiFetch(path, body, token) {
  const res = await fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Something went wrong.');
  return data;
}

export default function AuthPanel({ auth, users, syncStatus, lastSynced, onAuthChange, onUsersChange }) {
  const [view, setView]         = useState('idle');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [code, setCode]         = useState('');
  const [newVal, setNewVal]     = useState('');
  const [newVal2, setNewVal2]   = useState('');
  const [busy, setBusy]         = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');

  function reset(nextView = 'idle') {
    setEmail(''); setPassword(''); setConfirm('');
    setCode(''); setNewVal(''); setNewVal2('');
    setError(''); setSuccess('');
    setView(nextView);
  }

  async function run(fn) {
    setBusy(true); setError(''); setSuccess('');
    try { await fn(); } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  // ── Register ────────────────────────────────────────────────────────────
  async function handleRegister() {
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    await run(async () => {
      const data = await registerAccount(email.trim(), password, users);
      saveAuth(data);
      // Report users too so onboarding's login screen (which waits for both
      // users + auth before completing) doesn't dead-end on register.
      onUsersChange?.(users);
      onAuthChange(data);
      reset();
    });
  }

  // ── Login ───────────────────────────────────────────────────────────────
  // Logging in always switches to the account's own (cloud) profiles. The
  // current local guest profile is discarded — to keep the current profile,
  // the user should "Create an account" (register) instead.
  async function handleLogin() {
    await run(async () => {
      const data = await loginAccount(email.trim(), password);
      const cloudUsers = (data.profiles || []).map(p => JSON.parse(p.profile_json));
      saveAuth(data);
      saveUsers(cloudUsers);
      saveCurrentUserId(cloudUsers[0]?.id);
      (data.profiles || []).forEach(p => {
        try { saveProgress(p.id, JSON.parse(p.progress_json)); } catch {}
        try { saveVerseTranslations(p.id, JSON.parse(p.trans_json)); } catch {}
      });
      onUsersChange(cloudUsers, cloudUsers[0]);
      onAuthChange(data);
      reset();
    });
  }

  // ── Logout ──────────────────────────────────────────────────────────────
  async function handleLogout() {
    if (auth.token) await logoutAccount(auth.token).catch(() => {});
    clearAuth();
    onAuthChange({ token: null, accountId: null, email: null });
    reset();
  }

  // ── Forgot password ─────────────────────────────────────────────────────
  async function handleForgot() {
    await run(async () => {
      await apiFetch('/api/auth/forgot', { email: email.trim() });
      setView('reset-code');
      setSuccess('If that email is registered, a 6-digit code has been sent.');
    });
  }

  // ── Reset password ──────────────────────────────────────────────────────
  async function handleReset() {
    if (newVal !== newVal2) { setError('Passwords do not match.'); return; }
    await run(async () => {
      await apiFetch('/api/auth/reset', { email: email.trim(), code: code.trim(), newPassword: newVal });
      setSuccess('Password updated. Please sign in.');
      reset('login');
    });
  }

  // ── Update email ────────────────────────────────────────────────────────
  async function handleUpdateEmail() {
    await run(async () => {
      const data = await apiFetch('/api/auth/update', { type: 'email', currentPassword: password, newEmail: newVal }, auth.token);
      onAuthChange({ ...auth, email: data.email });
      saveAuth({ ...auth, email: data.email });
      setSuccess('Email updated.');
      setPassword(''); setNewVal('');
    });
  }

  // ── Update password ─────────────────────────────────────────────────────
  async function handleUpdatePassword() {
    if (newVal !== newVal2) { setError('New passwords do not match.'); return; }
    await run(async () => {
      await apiFetch('/api/auth/update', { type: 'password', currentPassword: password, newPassword: newVal }, auth.token);
      setSuccess('Password updated.');
      setPassword(''); setNewVal(''); setNewVal2('');
    });
  }

  // ══════════════════════════════════════════════════════════════════════
  // Signed-in views
  // ══════════════════════════════════════════════════════════════════════
  if (auth.token) {
    if (view === 'update-email') return (
      <div className="auth-panel">
        <div className="auth-form-title">Change email</div>
        <input className="auth-input" type="password" placeholder="Current password"
          value={password} onChange={e => setPassword(e.target.value)} disabled={busy} />
        <input className="auth-input" type="email" placeholder="New email address"
          value={newVal} onChange={e => setNewVal(e.target.value)} disabled={busy} />
        {error && <div className="auth-error">{error}</div>}
        {success && <div className="auth-success">{success}</div>}
        <div className="auth-btns">
          <button className="btn" onClick={() => reset()}>Cancel</button>
          <button className="btn btn-ok" onClick={handleUpdateEmail} disabled={busy || !password || !newVal}>
            {busy ? 'Saving…' : 'Update email'}
          </button>
        </div>
      </div>
    );

    if (view === 'update-password') return (
      <div className="auth-panel">
        <div className="auth-form-title">Change password</div>
        <input className="auth-input" type="password" placeholder="Current password"
          value={password} onChange={e => setPassword(e.target.value)} disabled={busy} />
        <input className="auth-input" type="password" placeholder="New password (8+ characters)"
          value={newVal} onChange={e => setNewVal(e.target.value)} disabled={busy} />
        <input className="auth-input" type="password" placeholder="Confirm new password"
          value={newVal2} onChange={e => setNewVal2(e.target.value)} disabled={busy} />
        {error && <div className="auth-error">{error}</div>}
        {success && <div className="auth-success">{success}</div>}
        <div className="auth-btns">
          <button className="btn" onClick={() => reset()}>Cancel</button>
          <button className="btn btn-ok" onClick={handleUpdatePassword} disabled={busy || !password || !newVal || !newVal2}>
            {busy ? 'Saving…' : 'Update password'}
          </button>
        </div>
      </div>
    );

    return (
      <div className="auth-panel">
        <div className="auth-row">
          <span className="auth-indicator connected">●</span>
          <span className="auth-email">{auth.email}</span>
          <button className="profile-link-btn muted" onClick={handleLogout}>Sign out</button>
        </div>
        <div className="auth-sync-status">
          All profiles backed up.{' '}
          {syncStatus === 'syncing' && '· Syncing…'}
          {syncStatus === 'synced'  && `· Saved ${timeSince(lastSynced)}`}
          {syncStatus === 'error'   && '· Sync failed, will retry'}
          {!syncStatus && lastSynced && `· Last saved ${timeSince(lastSynced)}`}
        </div>
        <div className="auth-account-links">
          <span className="auth-link" onClick={() => reset('update-email')}>Change email</span>
          <span className="auth-sep">·</span>
          <span className="auth-link" onClick={() => reset('update-password')}>Change password</span>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════
  // Signed-out views
  // ══════════════════════════════════════════════════════════════════════
  if (view === 'register') return (
    <div className="auth-panel">
      <div className="auth-form-title">Create an account</div>
      <input className="auth-input" type="email" placeholder="Email address"
        value={email} onChange={e => setEmail(e.target.value)} disabled={busy} />
      <input className="auth-input" type="password" placeholder="Password (8+ characters)"
        value={password} onChange={e => setPassword(e.target.value)} disabled={busy} />
      <input className="auth-input" type="password" placeholder="Confirm password"
        value={confirm} onChange={e => setConfirm(e.target.value)} disabled={busy} />
      {error && <div className="auth-error">{error}</div>}
      <div className="auth-form-note">All profiles on this device will be linked to this account.</div>
      <div className="auth-btns">
        <button className="btn" onClick={() => reset()}>Cancel</button>
        <button className="btn btn-ok" onClick={handleRegister} disabled={busy || !email || !password || !confirm}>
          {busy ? 'Creating…' : 'Create account'}
        </button>
      </div>
      <div className="auth-switch">
        Already have an account?{' '}
        <span className="auth-link" onClick={() => reset('login')}>Sign in</span>
      </div>
    </div>
  );

  if (view === 'login') return (
    <div className="auth-panel">
      <div className="auth-form-title">Sign in</div>
      <input className="auth-input" type="email" placeholder="Email address"
        value={email} onChange={e => setEmail(e.target.value)} disabled={busy} />
      <input className="auth-input" type="password" placeholder="Password"
        value={password} onChange={e => setPassword(e.target.value)} disabled={busy} />
      {error && <div className="auth-error">{error}</div>}
      <div className="auth-btns">
        <button className="btn" onClick={() => reset()}>Cancel</button>
        <button className="btn btn-ok" onClick={handleLogin} disabled={busy || !email || !password}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </div>
      <div className="auth-switch">
        <span className="auth-link" onClick={() => reset('forgot')}>Forgot password?</span>
        <span className="auth-sep">·</span>
        New here?{' '}
        <span className="auth-link" onClick={() => reset('register')}>Create an account</span>
      </div>
    </div>
  );

  if (view === 'forgot') return (
    <div className="auth-panel">
      <div className="auth-form-title">Reset password</div>
      <div className="auth-form-note">Enter your email and we'll send a 6-digit reset code.</div>
      <input className="auth-input" type="email" placeholder="Email address"
        value={email} onChange={e => setEmail(e.target.value)} disabled={busy} />
      {error && <div className="auth-error">{error}</div>}
      {success && <div className="auth-success">{success}</div>}
      <div className="auth-btns">
        <button className="btn" onClick={() => reset('login')}>Back</button>
        <button className="btn btn-ok" onClick={handleForgot} disabled={busy || !email}>
          {busy ? 'Sending…' : 'Send code'}
        </button>
      </div>
    </div>
  );

  if (view === 'reset-code') return (
    <div className="auth-panel">
      <div className="auth-form-title">Enter reset code</div>
      {success && <div className="auth-success">{success}</div>}
      <input className="auth-input" type="email" placeholder="Email address"
        value={email} onChange={e => setEmail(e.target.value)} disabled={busy} />
      <input className="auth-input" type="text" placeholder="6-digit code from email"
        value={code} onChange={e => setCode(e.target.value)} maxLength={6} disabled={busy}
        style={{ letterSpacing: '0.2em', fontFamily: 'monospace' }} />
      <input className="auth-input" type="password" placeholder="New password (8+ characters)"
        value={newVal} onChange={e => setNewVal(e.target.value)} disabled={busy} />
      <input className="auth-input" type="password" placeholder="Confirm new password"
        value={newVal2} onChange={e => setNewVal2(e.target.value)} disabled={busy} />
      {error && <div className="auth-error">{error}</div>}
      <div className="auth-btns">
        <button className="btn" onClick={() => reset('login')}>Cancel</button>
        <button className="btn btn-ok" onClick={handleReset} disabled={busy || !email || !code || !newVal || !newVal2}>
          {busy ? 'Resetting…' : 'Set new password'}
        </button>
      </div>
      <div className="auth-switch">
        <span className="auth-link" onClick={() => reset('forgot')}>Resend code</span>
      </div>
    </div>
  );

  // Idle — not signed in
  return (
    <div className="auth-panel">
      <div className="auth-row">
        <span className="auth-indicator">●</span>
        <span className="auth-desc">Not backed up</span>
      </div>
      <div className="auth-cta">
        One account backs up all profiles — sign in once and everyone's progress is safe.
      </div>
      <div className="auth-btns">
        <button className="btn" onClick={() => reset('login')}>Sign in</button>
        <button className="btn btn-ok" onClick={() => reset('register')}>Create account</button>
      </div>
    </div>
  );
}
