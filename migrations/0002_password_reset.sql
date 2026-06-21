CREATE TABLE IF NOT EXISTS password_resets (
  token      TEXT PRIMARY KEY,        -- 6-digit code stored as text
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,        -- unix seconds
  used       INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_resets_account ON password_resets(account_id);
