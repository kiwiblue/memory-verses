-- Account-level reminder preference (push device vs. daily email), so the
-- reminders-worker cron can decide how to notify each account regardless of
-- which/how-many devices have push subscriptions. Per-device push_subscriptions
-- rows still store the actual push endpoint/keys; hour/timezone/last-sent are
-- now authoritative on accounts, not per-subscription.
ALTER TABLE accounts ADD COLUMN reminder_channel TEXT NOT NULL DEFAULT 'push';
ALTER TABLE accounts ADD COLUMN reminder_hour INTEGER NOT NULL DEFAULT 8;
ALTER TABLE accounts ADD COLUMN reminder_timezone TEXT NOT NULL DEFAULT 'UTC';
ALTER TABLE accounts ADD COLUMN reminder_last_sent_date TEXT;
