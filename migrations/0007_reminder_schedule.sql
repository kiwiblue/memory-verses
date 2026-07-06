-- Per-subscription reminder time + delivery tracking, so the reminders cron
-- knows which hour (in the subscriber's own timezone) to fire, and doesn't
-- double-send if it ticks more than once within the matching hour.
ALTER TABLE push_subscriptions ADD COLUMN reminder_hour INTEGER NOT NULL DEFAULT 8;
ALTER TABLE push_subscriptions ADD COLUMN timezone TEXT NOT NULL DEFAULT 'UTC';
ALTER TABLE push_subscriptions ADD COLUMN last_sent_date TEXT;
