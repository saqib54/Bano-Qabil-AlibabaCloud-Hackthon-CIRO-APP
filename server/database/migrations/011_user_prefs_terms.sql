-- ============================================
-- 011 — Per-account preferences & terms consent
-- ============================================
-- prefs: JSON blob of user preferences (theme, language, …) so that a
-- citizen's choices follow their account across devices/browsers.
-- terms_accepted_at: when the user accepted the terms/consent flow
-- (once accepted it is never shown again for that account).

ALTER TABLE users ADD COLUMN prefs TEXT NOT NULL DEFAULT '{}';
ALTER TABLE users ADD COLUMN terms_accepted_at TEXT;
