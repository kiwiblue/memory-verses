export function loadAuth() {
  return {
    token:     localStorage.getItem('mv-token')      || null,
    accountId: localStorage.getItem('mv-account-id') || null,
    email:     localStorage.getItem('mv-email')      || null,
  };
}

export function saveAuth({ token, accountId, email }) {
  localStorage.setItem('mv-token',      token);
  localStorage.setItem('mv-account-id', accountId);
  localStorage.setItem('mv-email',      email);
}

export function clearAuth() {
  localStorage.removeItem('mv-token');
  localStorage.removeItem('mv-account-id');
  localStorage.removeItem('mv-email');
}
