-- ============================================
-- CIRO — Sprint 3 Qwen AI Analysis
-- ============================================

CREATE TABLE IF NOT EXISTS incident_ai_analysis (
  id                     TEXT PRIMARY KEY,
  incident_id            TEXT NOT NULL UNIQUE REFERENCES incidents(id) ON DELETE CASCADE,
  ai_summary             TEXT,
  recommended_severity   TEXT CHECK (recommended_severity IN ('CRITICAL','HIGH','MEDIUM','LOW')),
  confidence             REAL,
  recommended_department TEXT,
  secondary_department   TEXT,
  risk_tags              TEXT,          -- JSON array
  recommended_actions    TEXT,          -- JSON array
  reasoning_summary      TEXT,
  vision_analysis        TEXT,          -- JSON object (Sprint 9)
  model_name             TEXT,
  status                 TEXT NOT NULL DEFAULT 'PENDING'
                         CHECK (status IN ('PENDING','COMPLETED','FAILED')),
  error_message          TEXT,
  created_at             TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at             TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ai_analysis_incident ON incident_ai_analysis(incident_id);
