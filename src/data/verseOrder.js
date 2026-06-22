const KEY = id => `mv-verse-order-${id}`;

export function loadVerseOrder(userId) {
  try { return JSON.parse(localStorage.getItem(KEY(userId))) || []; } catch { return []; }
}

export function saveVerseOrder(userId, order) {
  localStorage.setItem(KEY(userId), JSON.stringify(order));
}
