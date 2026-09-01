-- ============================================
-- CIRO — Rapid Intelligence Grid: AI verification pipeline
-- ============================================

-- One row per pipeline run — the full multi-agent verification trace
-- for every citizen report (runs automatically within seconds).
CREATE TABLE IF NOT EXISTS incident_verification (
  id                        TEXT PRIMARY KEY,
  incident_id               TEXT NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  verdict                   TEXT NOT NULL CHECK (verdict IN (
                              'AUTO_VERIFIED','NEEDS_REVIEW','SUSPECTED_DUPLICATE','LOW_CONFIDENCE'
                            )),
  confidence                INTEGER NOT NULL,            -- 0-100
  severity                  TEXT CHECK (severity IN ('CRITICAL','HIGH','MEDIUM','LOW')),
  duplicate_of_incident_id  TEXT,                        -- candidate duplicate
  nearby_incident_count     INTEGER NOT NULL DEFAULT 0,
  corroborating_count       INTEGER NOT NULL DEFAULT 0,
  stages                    TEXT NOT NULL,               -- JSON: per-agent trace + timings
  duration_ms               INTEGER NOT NULL DEFAULT 0,
  auto_alerted              INTEGER NOT NULL DEFAULT 0,  -- public alert auto-issued
  auto_routed_department_id TEXT,                        -- pre-dispatch routing
  model                     TEXT NOT NULL DEFAULT 'ciro-pipeline-v1',
  created_at                TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_verification_incident ON incident_verification(incident_id);
CREATE INDEX IF NOT EXISTS idx_verification_created ON incident_verification(created_at);

-- Broadcasts can now originate from the AI pipeline (auto-alerts), not only admins
ALTER TABLE emergency_broadcasts ADD COLUMN source TEXT NOT NULL DEFAULT 'ADMIN';
ALTER TABLE emergency_broadcasts ADD COLUMN related_incident_id TEXT;
