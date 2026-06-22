const KEY = id => `mv-revise-log-${id}`;
const MAX_ENTRIES = 1000;

export function loadReviseLog(userId) {
  try { return JSON.parse(localStorage.getItem(KEY(userId))) || []; } catch { return []; }
}

export function appendReviseLog(userId, entry) {
  const log = loadReviseLog(userId);
  log.push(entry);
  if (log.length > MAX_ENTRIES) log.splice(0, log.length - MAX_ENTRIES);
  localStorage.setItem(KEY(userId), JSON.stringify(log));
  return log;
}
