const KEY = 'mv-onboarded';

export function isOnboarded() {
  return localStorage.getItem(KEY) === 'true';
}

export function markOnboarded() {
  localStorage.setItem(KEY, 'true');
}
