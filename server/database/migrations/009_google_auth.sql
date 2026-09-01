-- ============================================
-- 009 — Google OAuth (citizen) login support
-- ============================================
-- provider: 'password' (default) | 'google'
-- provider_sub: Google subject id (stable account identifier)

ALTER TABLE users ADD COLUMN provider TEXT NOT NULL DEFAULT 'password';
ALTER TABLE users ADD COLUMN provider_sub TEXT;

CREATE INDEX IF NOT EXISTS idx_users_provider_sub ON users(provider_sub);
