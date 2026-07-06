-- Add custom verse ordering to cloud_profiles so it syncs across devices
-- (previously localStorage-only, so reordering was lost on login/new device).
ALTER TABLE cloud_profiles ADD COLUMN order_json TEXT NOT NULL DEFAULT '[]';
