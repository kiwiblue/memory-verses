import { VERSES } from './verses.js';

function buildInitialProgress() {
  const init = {};
  VERSES.forEach(v => { init[v.id] = 'unseen'; });
  return init;
}

export function loadUsers() {
  try {
    const raw = localStorage.getItem('mv-users');
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return [];
}

export function saveUsers(users) {
  localStorage.setItem('mv-users', JSON.stringify(users));
}

export function loadCurrentUserId() {
  return localStorage.getItem('mv-current-user') || null;
}

export function saveCurrentUserId(id) {
  localStorage.setItem('mv-current-user', id);
}

export function loadUserProgress(userId) {
  try {
    const raw = localStorage.getItem(`mv-progress-${userId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      const init = buildInitialProgress();
      return { ...init, ...parsed };
    }
  } catch (_) {}
  return buildInitialProgress();
}

export function saveUserProgress(userId, progress) {
  localStorage.setItem(`mv-progress-${userId}`, JSON.stringify(progress));
}

export function loadUserPhoto(userId) {
  return localStorage.getItem(`mv-photo-${userId}`) || null;
}

export function saveUserPhoto(userId, dataUrl) {
  if (dataUrl) localStorage.setItem(`mv-photo-${userId}`, dataUrl);
  else localStorage.removeItem(`mv-photo-${userId}`);
}

export function loadVerseTranslations(userId) {
  try {
    const raw = localStorage.getItem(`mv-trans-${userId}`);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return {};
}

export function saveVerseTranslations(userId, overrides) {
  localStorage.setItem(`mv-trans-${userId}`, JSON.stringify(overrides));
}
