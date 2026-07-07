CREATE TABLE IF NOT EXISTS rate_limits (
  rl_key      TEXT PRIMARY KEY,   -- e.g. "login:203.0.113.5" or "register:203.0.113.5"
  count       INTEGER NOT NULL DEFAULT 0,
  window_start INTEGER NOT NULL  -- unix seconds
);
