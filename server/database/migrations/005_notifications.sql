-- ============================================
-- CIRO — Sprint 7: Notifications & Alerts
-- ============================================

CREATE TABLE IF NOT EXISTS notifications (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type            TEXT NOT NULL DEFAULT 'SYSTEM'
                  CHECK (type IN ('SYSTEM','BROADCAST','STATUS_CHANGE','ALERT','INCIDENT')),
  title           TEXT NOT NULL,
  message         TEXT NOT NULL,
  severity        TEXT DEFAULT 'INFO'
                  CHECK (severity IN ('INFO','LOW','MEDIUM','HIGH','CRITICAL')),
  is_read         INTEGER NOT NULL DEFAULT 0,
  related_entity  TEXT,
  related_id      TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notif_created ON notifications(created_at);

-- ============================================
-- EMERGENCY BROADCASTS (admin-initiated alerts)
-- ============================================
CREATE TABLE IF NOT EXISTS emergency_broadcasts (
  id               TEXT PRIMARY KEY,
  title            TEXT NOT NULL,
  message          TEXT NOT NULL,
  severity         TEXT NOT NULL DEFAULT 'HIGH'
                   CHECK (severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  target_audience  TEXT NOT NULL DEFAULT 'ALL'
                   CHECK (target_audience IN ('ALL','PUBLIC','STAFF')),
  regions          TEXT,
  created_by       TEXT REFERENCES users(id) ON DELETE SET NULL,
  is_active        INTEGER NOT NULL DEFAULT 1,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at       TEXT
);

CREATE INDEX IF NOT EXISTS idx_broadcast_active ON emergency_broadcasts(is_active);
CREATE INDEX IF NOT EXISTS idx_broadcast_created ON emergency_broadcasts(created_at);
