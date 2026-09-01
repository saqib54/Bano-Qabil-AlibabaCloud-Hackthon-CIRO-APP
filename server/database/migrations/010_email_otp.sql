-- ============================================
-- 010 — Email OTP (one-time code) sign-in
-- ============================================
CREATE TABLE IF NOT EXISTS otp_codes (
  id         TEXT PRIMARY KEY,
  email      TEXT NOT NULL,
  code_hash  TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  attempts   INTEGER NOT NULL DEFAULT 0,
  verified   INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_otp_codes_email ON otp_codes(email);
