-- Add streak data to cloud_profiles so it syncs across devices.
ALTER TABLE cloud_profiles ADD COLUMN streak_json TEXT NOT NULL DEFAULT '{}';
