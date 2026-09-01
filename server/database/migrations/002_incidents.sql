-- ============================================
-- CIRO — Sprint 2 Incident System Schema
-- ============================================

CREATE TABLE IF NOT EXISTS incidents (
  id                      TEXT PRIMARY KEY,
  incident_number         TEXT NOT NULL UNIQUE,
  reported_by             TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title                   TEXT NOT NULL,
  description             TEXT NOT NULL,
  category                TEXT NOT NULL CHECK (category IN (
                            'FLOOD','FIRE','ACCIDENT','MEDICAL','POWER_OUTAGE',
                            'BUILDING_COLLAPSE','GAS_LEAK','SECURITY','EXTREME_WEATHER','OTHER'
                          )),
  status                  TEXT NOT NULL DEFAULT 'REPORTED' CHECK (status IN (
                            'REPORTED','AI_ANALYZED','UNDER_REVIEW','VERIFIED','ASSIGNED',
                            'ACCEPTED','EN_ROUTE','ON_SCENE','RESOLUTION_SUBMITTED','RESOLVED',
                            'REJECTED','DUPLICATE','CANCELLED','REOPENED'
                          )),
  ai_recommended_severity TEXT CHECK (ai_recommended_severity IN ('CRITICAL','HIGH','MEDIUM','LOW')),
  verified_severity       TEXT CHECK (verified_severity IN ('CRITICAL','HIGH','MEDIUM','LOW')),
  latitude                REAL NOT NULL,
  longitude               REAL NOT NULL,
  location_name           TEXT,
  assigned_department_id  TEXT REFERENCES departments(id) ON DELETE SET NULL,
  current_assignment_id   TEXT,
  people_affected         INTEGER,
  contact_phone           TEXT,
  extra_details           TEXT,
  created_at              TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at              TEXT NOT NULL DEFAULT (datetime('now')),
  resolved_at             TEXT
);

CREATE INDEX IF NOT EXISTS idx_incidents_reporter ON incidents(reported_by);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_category ON incidents(category);
CREATE INDEX IF NOT EXISTS idx_incidents_created ON incidents(created_at);
CREATE INDEX IF NOT EXISTS idx_incidents_location ON incidents(latitude, longitude);

-- ============================================
-- INCIDENT MEDIA (URLs/keys only — binaries live in storage)
-- ============================================
CREATE TABLE IF NOT EXISTS incident_media (
  id           TEXT PRIMARY KEY,
  incident_id  TEXT NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  file_url     TEXT NOT NULL,
  mime_type    TEXT,
  size_bytes   INTEGER,
  kind         TEXT NOT NULL DEFAULT 'REPORT' CHECK (kind IN ('REPORT','RESOLUTION','SITUATION')),
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_media_incident ON incident_media(incident_id);

-- ============================================
-- STATUS HISTORY (one row per status change — powers the timeline UI)
-- ============================================
CREATE TABLE IF NOT EXISTS incident_status_history (
  id               TEXT PRIMARY KEY,
  incident_id      TEXT NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  previous_status  TEXT,
  new_status       TEXT NOT NULL,
  changed_by       TEXT REFERENCES users(id) ON DELETE SET NULL,
  notes            TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_history_incident ON incident_status_history(incident_id);
