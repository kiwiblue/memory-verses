CREATE TABLE IF NOT EXISTS accounts (
  id          TEXT PRIMARY KEY,
  email       TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  salt        TEXT NOT NULL,
  created_at  INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS sessions (
  token       TEXT PRIMARY KEY,
  account_id  TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  expires_at  INTEGER NOT NULL,
  created_at  INTEGER NOT NULL DEFAULT (unixepoch())
);

-- One row per local profile. Stores profile metadata + all progress data.
CREATE TABLE IF NOT EXISTS cloud_profiles (
  id           TEXT PRIMARY KEY,   -- matches local user UUID
  account_id   TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  profile_json TEXT NOT NULL,      -- { name, bracket, colour, translation }
  progress_json TEXT NOT NULL,     -- full progress object
  trans_json   TEXT NOT NULL,      -- per-verse translation overrides
  custom_json  TEXT NOT NULL,      -- custom verses array
  hidden_json  TEXT NOT NULL,      -- hidden verse ID array
  updated_at   INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_sessions_account ON sessions(account_id);
CREATE INDEX IF NOT EXISTS idx_profiles_account ON cloud_profiles(account_id);
