const enc = new TextEncoder();

export async function hashPassword(password, salt) {
  const keyMat = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations: 100_000, hash: 'SHA-256' },
    keyMat, 256
  );
  return [...new Uint8Array(bits)].map(b => b.toString(16).padStart(2, '0')).join('');
}

// Session tokens are stored hashed at rest so a leaked/backed-up sessions
// table can't be replayed as live logins (the raw token, held only by the
// client, is never persisted). SHA-256 is fine here: the token is a 122-bit
// random UUID, so it isn't brute-forceable from its hash the way a password
// would be. Must match hashToken in reminders-worker/src/index.js.
export async function hashToken(token) {
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(token));
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function requireAuth(request, env) {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : null;
  if (!token) return null;
  const now = Math.floor(Date.now() / 1000);
  const hashed = await hashToken(token);

  const row = await env.DB.prepare(
    'SELECT account_id FROM sessions WHERE token = ? AND expires_at > ?'
  ).bind(hashed, now).first();
  if (row) return row.account_id;

  // Transition: a session created before hashing rolled out still stores the
  // raw token. Accept it once, then upgrade the row to the hash in place so no
  // one is logged out by the change.
  const legacy = await env.DB.prepare(
    'SELECT account_id FROM sessions WHERE token = ? AND expires_at > ?'
  ).bind(token, now).first();
  if (legacy) {
    try {
      await env.DB.prepare('UPDATE sessions SET token = ? WHERE token = ?').bind(hashed, token).run();
    } catch {}
    return legacy.account_id;
  }
  return null;
}

export function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Simple fixed-window rate limiter backed by D1. Returns true if the request
// is allowed (and records it), false if the caller should be rejected with
// 429. `key` should already include the route name and identifying value
// (e.g. IP) so different endpoints/limits don't collide.
//
// Tradeoff: if the D1 call itself throws (outage/hiccup), we fail OPEN
// (allow the request) rather than locking every user out of auth for a
// hobby app. The deliberate `row.count >= limit` rejection is a normal
// return value, not an exception, so it is never caught/bypassed by this.
export async function checkRateLimit(env, key, limit, windowSeconds) {
  const now = Math.floor(Date.now() / 1000);
  try {
    const row = await env.DB.prepare(
      'SELECT count, window_start FROM rate_limits WHERE rl_key = ?'
    ).bind(key).first();

    if (!row || now - row.window_start >= windowSeconds) {
      // New window (first request, or previous window expired)
      await env.DB.prepare(
        'INSERT INTO rate_limits (rl_key, count, window_start) VALUES (?, 1, ?) ' +
        'ON CONFLICT(rl_key) DO UPDATE SET count = 1, window_start = excluded.window_start'
      ).bind(key, now).run();
      return true;
    }

    if (row.count >= limit) return false;

    await env.DB.prepare('UPDATE rate_limits SET count = count + 1 WHERE rl_key = ?').bind(key).run();
    return true;
  } catch {
    // D1 hiccup: fail open rather than locking everyone out of auth.
    return true;
  }
}

// Extracts the caller's IP the way Cloudflare provides it.
export function clientIp(request) {
  return request.headers.get('CF-Connecting-IP') || 'unknown';
}
