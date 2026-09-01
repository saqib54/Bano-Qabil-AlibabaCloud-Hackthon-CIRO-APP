-- ============================================
-- CIRO — AI Emergency Auto-Triage (§71)
-- SpamGuard · SatelliteScout · Geo-Impact Engine ·
-- Smart Dispatch · Command Copilot · Forecasting
-- ============================================

-- ── Verification pipeline extensions ──────────────────────────
-- SpamGuard: fake/spam likelihood (0-100) + reasons
ALTER TABLE incident_verification ADD COLUMN spam_score INTEGER NOT NULL DEFAULT 0;
ALTER TABLE incident_verification ADD COLUMN spam_flags TEXT NOT NULL DEFAULT '[]';

-- SatelliteScout: simulated fusion of satellite/weather signals
-- (NASA FIRMS heat anomalies, Sentinel-1 flood extent heuristics)
ALTER TABLE incident_verification ADD COLUMN satellite_signal TEXT NOT NULL DEFAULT 'NONE'
  CHECK (satellite_signal IN ('NONE','SUPPORTING','INCONCLUSIVE','CONFLICTING'));
ALTER TABLE incident_verification ADD COLUMN satellite_detail TEXT NOT NULL DEFAULT '[]';

-- Geo-Impact Engine: category-aware affected zone (geofence, not a plain circle)
ALTER TABLE incident_verification ADD COLUMN impact_radius_m INTEGER NOT NULL DEFAULT 0;
ALTER TABLE incident_verification ADD COLUMN impact_shape TEXT;              -- JSON polygon/sector
ALTER TABLE incident_verification ADD COLUMN affected_estimate INTEGER NOT NULL DEFAULT 0;

-- Command Center Copilot: 2-3 line dispatcher summary
ALTER TABLE incident_verification ADD COLUMN copilot_summary TEXT;

-- ── Smart Dispatch on the incident itself ─────────────────────
ALTER TABLE incidents ADD COLUMN ai_suggested_team TEXT;         -- e.g. "Ambulance + Traffic Police"
ALTER TABLE incidents ADD COLUMN ai_eta_minutes INTEGER;         -- estimated arrival
ALTER TABLE incidents ADD COLUMN dispatch_approved_by TEXT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE incidents ADD COLUMN dispatch_approved_at TEXT;

-- ── Emergency Forecasting: historical hotspots ────────────────
CREATE TABLE IF NOT EXISTS forecast_hotspots (
  id             TEXT PRIMARY KEY,
  category       TEXT NOT NULL,
  latitude       REAL NOT NULL,
  longitude      REAL NOT NULL,
  radius_m       INTEGER NOT NULL DEFAULT 1500,
  incident_count INTEGER NOT NULL DEFAULT 0,
  risk_score     INTEGER NOT NULL DEFAULT 0,   -- 0-100
  window_days    INTEGER NOT NULL DEFAULT 90,
  computed_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_hotspots_category ON forecast_hotspots(category);
