CREATE TABLE IF NOT EXISTS feedback (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id TEXT    NOT NULL,
  type       TEXT    NOT NULL CHECK(type IN ('bug','feature','general')),
  message    TEXT    NOT NULL,
  ts         INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_feedback_ts         ON feedback(ts);
CREATE INDEX IF NOT EXISTS idx_feedback_account_id ON feedback(account_id);
