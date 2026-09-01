-- ============================================
-- CIRO — Sprint 8: Safe Places / Shelters
-- ============================================

CREATE TABLE IF NOT EXISTS shelters (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  type          TEXT NOT NULL DEFAULT 'SHELTER'
                CHECK (type IN ('SHELTER','HOSPITAL','FIRE_STATION','POLICE_STATION','EVACUATION_POINT','MEDICAL_CAMP')),
  address       TEXT,
  latitude      REAL NOT NULL,
  longitude     REAL NOT NULL,
  capacity      INTEGER,
  contact       TEXT,
  is_active     INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_shelters_active ON shelters(is_active);
CREATE INDEX IF NOT EXISTS idx_shelters_location ON shelters(latitude, longitude);
