-- ============================================
-- CIRO — Sprint 5 Staff Operations + Sprint 6 Resolution
-- ============================================

-- Situation logs: live field updates from responders (§38)
CREATE TABLE IF NOT EXISTS incident_situation_logs (
  id           TEXT PRIMARY KEY,
  incident_id  TEXT NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  staff_id     TEXT REFERENCES users(id) ON DELETE SET NULL,
  note         TEXT NOT NULL,
  image_url    TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_situation_logs_incident ON incident_situation_logs(incident_id);

-- Resolution fields on incidents (§39)
ALTER TABLE incidents ADD COLUMN resolution_notes TEXT;
ALTER TABLE incidents ADD COLUMN resolution_proof_url TEXT;
ALTER TABLE incidents ADD COLUMN resources_used TEXT;
ALTER TABLE incidents ADD COLUMN follow_up_required INTEGER NOT NULL DEFAULT 0;
ALTER TABLE incidents ADD COLUMN resolved_by TEXT REFERENCES users(id) ON DELETE SET NULL;
