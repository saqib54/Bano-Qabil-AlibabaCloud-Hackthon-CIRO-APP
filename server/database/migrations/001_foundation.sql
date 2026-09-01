-- ============================================
-- CIRO — Sprint 1 Foundation Schema
-- Designed to be replaceable by PostgreSQL later
-- ============================================

CREATE TABLE IF NOT EXISTS schema_migrations (
  id          TEXT PRIMARY KEY,
  applied_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================
-- USERS & ROLES
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id             TEXT PRIMARY KEY,
  full_name      TEXT NOT NULL,
  email          TEXT NOT NULL UNIQUE COLLATE NOCASE,
  phone          TEXT,
  password_hash  TEXT NOT NULL,
  role           TEXT NOT NULL DEFAULT 'PUBLIC' CHECK (role IN ('PUBLIC', 'STAFF', 'ADMIN')),
  avatar_url     TEXT,
  is_active      INTEGER NOT NULL DEFAULT 1,
  last_login_at  TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ============================================
-- DEPARTMENTS (Rescue 1122, Fire, Police, ...)
-- ============================================
CREATE TABLE IF NOT EXISTS departments (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL UNIQUE,
  code         TEXT NOT NULL UNIQUE,
  description  TEXT,
  contact      TEXT,
  is_active    INTEGER NOT NULL DEFAULT 1,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================
-- STAFF PROFILES (one per STAFF user)
-- ============================================
CREATE TABLE IF NOT EXISTS staff_profiles (
  user_id         TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  department_id   TEXT REFERENCES departments(id) ON DELETE SET NULL,
  designation     TEXT,
  duty_status     TEXT NOT NULL DEFAULT 'OFF_DUTY' CHECK (duty_status IN ('ON_DUTY', 'OFF_DUTY', 'DEPLOYED')),
  current_lat     REAL,
  current_lng     REAL,
  location_updated_at TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_staff_department ON staff_profiles(department_id);

-- ============================================
-- REFRESH TOKENS (hashed; rotated on refresh)
-- ============================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL,
  expires_at  TEXT NOT NULL,
  revoked     INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_refresh_user ON refresh_tokens(user_id);

-- ============================================
-- AUDIT LOGS
-- ============================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id             TEXT PRIMARY KEY,
  actor_id       TEXT REFERENCES users(id) ON DELETE SET NULL,
  action         TEXT NOT NULL,
  entity         TEXT,
  entity_id      TEXT,
  previous_value TEXT,
  new_value      TEXT,
  meta           TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);

-- ============================================
-- EMERGENCY CONTACTS (region configuration, used by AI assistant)
-- ============================================
CREATE TABLE IF NOT EXISTS emergency_contacts (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  number       TEXT NOT NULL,
  category     TEXT,
  region       TEXT,
  is_active    INTEGER NOT NULL DEFAULT 1,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================
-- SYSTEM SETTINGS (key/value)
-- ============================================
CREATE TABLE IF NOT EXISTS system_settings (
  key         TEXT PRIMARY KEY,
  value       TEXT,
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
