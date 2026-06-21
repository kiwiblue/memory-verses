import { loadProgress } from './progress.js';
import { loadVerseTranslations } from './users.js';
import { loadCustomVerses } from './customVerses.js';
import { loadHiddenVerseIds } from './hiddenVerses.js';

function authHeaders(token) {
  return { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
}

export async function pushSync(token, users) {
  const profiles = users.map(u => ({
    id:           u.id,
    profile_json: JSON.stringify(u),
    progress_json: JSON.stringify(loadProgress(u.id)),
    trans_json:   JSON.stringify(loadVerseTranslations(u.id)),
    custom_json:  JSON.stringify(loadCustomVerses(u.id)),
    hidden_json:  JSON.stringify([...loadHiddenVerseIds(u.id)]),
  }));

  const res = await fetch('/api/sync', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ profiles }),
  });
  if (!res.ok) throw new Error('Sync failed');
  return res.json();
}

export async function pullSync(token) {
  const res = await fetch('/api/sync', { headers: authHeaders(token) });
  if (!res.ok) throw new Error('Pull failed');
  return res.json(); // { profiles: [...] }
}

export async function registerAccount(email, password, users) {
  const profiles = users.map(u => ({
    id:           u.id,
    profile_json: JSON.stringify(u),
    progress_json: JSON.stringify(loadProgress(u.id)),
    trans_json:   JSON.stringify(loadVerseTranslations(u.id)),
    custom_json:  JSON.stringify(loadCustomVerses(u.id)),
    hidden_json:  JSON.stringify([...loadHiddenVerseIds(u.id)]),
  }));
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, profiles }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Registration failed');
  return data; // { token, accountId, email }
}

export async function loginAccount(email, password) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Login failed');
  return data; // { token, accountId, email, profiles }
}

export async function logoutAccount(token) {
  await fetch('/api/auth/logout', {
    method: 'POST',
    headers: authHeaders(token),
  });
}
