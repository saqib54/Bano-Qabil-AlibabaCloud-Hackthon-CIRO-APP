# CIRO — Backend Schema & API Reference

**Version 3.0** · Source of truth: `server/database/migrations/001–008` + live SQLite (`better-sqlite3`, WAL).
Storage engine: SQLite file `server/database/ciro.sqlite`; IDs are TEXT (uuid); timestamps ISO TEXT.

---

## 1. Migrations

| File | Adds |
|------|------|
| `001_foundation.sql` | users, refresh_tokens, departments, staff_profiles, audit_logs, system_settings, emergency_contacts |
| `002_incidents.sql` | incidents, incident_media, incident_status_history, incident_situation_logs |
| `003_ai_analysis.sql` | incident_ai_analysis (legacy single-model analysis, retained) |
| `004_staff_operations.sql` | staff assignment & resolution workflow columns |
| `005_notifications.sql` | notifications, emergency_broadcasts |
| `006_safe_places.sql` | shelters |
| `007_ai_pipeline.sql` | incident_verification (10-agent pipeline runs), forecast_hotspots |
| `008_ai_triage.sql` | AI triage columns on incidents (ai_suggested_team, ai_eta_minutes, dispatch_approved_by/at), impact_shape, spam/satellite fields |
| `009_google_auth.sql` | users.provider / users.provider_sub (Google OAuth login) |
| `010_email_otp.sql` | otp_codes (passwordless email OTP login) |

---

## 2. Tables

### users
`id, full_name, email, phone, password_hash, role (PUBLIC|STAFF|ADMIN), avatar_url, is_active, last_login_at, created_at, updated_at, provider (password|google|otp), provider_sub`

### otp_codes
`id, email, code_hash, expires_at, attempts, verified, created_at` (+ idx on email)

### refresh_tokens
`id, user_id, token_hash, expires_at, revoked, created_at`

### departments
`id, name, code, description, contact, is_active, created_at, updated_at`
Seed: Fire, Rescue 1122, Police, Medical/PDMA-style units used by SmartDispatch.

### staff_profiles
`user_id (PK→users), department_id, designation, duty_status (ON_DUTY|OFF_DUTY), current_lat, current_lng, location_updated_at, created_at, updated_at`
SmartDispatch picks nearest ON_DUTY staff's department for ETA suggestion.

### incidents
`id, incident_number (INC-YYYYMMDD-XXXX), reported_by→users, title, description, category, status,
ai_recommended_severity, verified_severity, latitude, longitude, location_name,
assigned_department_id, current_assignment_id, people_affected, contact_phone, extra_details,
created_at, updated_at, resolved_at, resolution_notes, resolution_proof_url, resources_used,
follow_up_required, resolved_by,
ai_suggested_team, ai_eta_minutes, dispatch_approved_by, dispatch_approved_at`

- `dispatch_approved_by/at` set **only** by `POST /admin/incidents/:id/approve-dispatch` (human-in-the-loop).
- Statuses: REPORTED, AI_ANALYZED, VERIFIED, DUPLICATE, FALSE_ALARM, ASSIGNED, RESPONDING, RESOLVED, CLOSED, REOPENED.

### incident_media
`id, incident_id, file_url, mime_type, size_bytes, kind (image|audio|doc), created_at`
Uploads via multer → `storage.service` (local disk now, Alibaba OSS adapter-ready).

### incident_status_history
`id, incident_id, previous_status, new_status, changed_by, notes, created_at`

### incident_situation_logs
`id, incident_id, staff_id, note, image_url, created_at`

### incident_ai_analysis (legacy)
`id, incident_id, ai_summary, recommended_severity, confidence, recommended_department, secondary_department, risk_tags, recommended_actions, reasoning_summary, vision_analysis, model_name, status, error_message, created_at, updated_at`
Retained for the pre-pipeline single-model analysis; the 10-agent pipeline writes to `incident_verification`.

### incident_verification (10-agent pipeline)
`id, incident_id, verdict (VERIFIED|UNCERTAIN|SPAM), confidence, severity,
duplicate_of_incident_id, nearby_incident_count, corroborating_count,
stages (JSON array of 10 agent results), duration_ms, auto_alerted, auto_routed_department_id,
model, created_at, spam_score, spam_flags (JSON), satellite_signal, satellite_detail,
impact_radius_m, impact_shape (JSON {kind, polygon:[[lat,lng]…]}), affected_estimate, copilot_summary`

- `impact_shape.kind`: `sector` (FIRE/GAS_LEAK wind sector) · `corridor` (ACCIDENT/FLOOD) · `circle` (default) · `private` (MEDICAL — teams only, rendered dashed).
- `stages` order: Sentinel → SpamGuard → GeoScout → SatelliteScout → DedupGuard → Corroborator → VerdictEngine → GeoImpact → SmartDispatch → Copilot.

### forecast_hotspots
`id, category, latitude, longitude, radius_m, incident_count, risk_score, window_days, computed_at`
Computed by `GET /admin/forecast?days=N` (historical clustering); rendered as dashed risk circles.

### notifications
`id, user_id, type, title, message, severity, is_read, related_entity, related_id, created_at`

### emergency_broadcasts
`id, title, message, severity, target_audience, regions (JSON), created_by, is_active, created_at, expires_at, source, related_incident_id`
Auto-created on VERIFIED auto-alert (geofenced) and manually by admin; WS `alert.broadcast`.

### shelters (Safe Places)
`id, name, type, address, latitude, longitude, capacity, contact, is_active, created_at, updated_at`

### emergency_contacts
`id, name, number, category, region, is_active, created_at`
Seeded helplines: Rescue 1122, Police 15, Fire 16, etc.

### audit_logs
`id, actor_id, action, entity, entity_id, previous_value, new_value, meta (JSON), created_at`
Every AI verdict, dispatch approval/rejection, resolution decision, settings change.

### system_settings
`key (PK), value, updated_at` — e.g. AI thresholds, template toggles.

### schema_migrations
Migration bookkeeping (applied file names).

---

## 3. API Surface (`/api/v1`, envelope `{success, message, data}`)

### auth
`POST /auth/register · POST /auth/login · POST /auth/google (Firebase Auth popup ID token — aud = FIREBASE_PROJECT_ID & iss = securetoken — or GIS ID token; find-or-create PUBLIC user; demo flag dev-only) · POST /auth/otp/request (6-digit code emailed, bcrypt-hashed, 30 s cooldown, dedicated limiter 10/15 min; devCode echo when no SMTP) · POST /auth/otp/verify (10-min expiry, 5 attempts, single-use → find-or-create PUBLIC user) · POST /auth/refresh · POST /auth/logout · GET /auth/me`
(register/login/google/otp rate-limited; JWT + hashed refresh tokens)

### incidents
`POST / (PUBLIC, multipart) · GET /mine (PUBLIC) · GET / (STAFF/ADMIN) · GET /:id · GET /:id/verification · PATCH /:id/status`

### ai
`POST /ai/extract` — stateless extraction demo (category, location, people, severity, suggested teams, safety response) for Roman Urdu/Urdu/English.

### weather
`GET /weather?city=<name>` (auth) — AI meteorologist briefing: current conditions, 15-day outlook, hourly, 3-day history, AQI, alerts, lifestyle insights, radar lat/lon. Qwen strict-JSON with deterministic seasonal fallback; Google Maps geocoding for non-builtin cities (`GOOGLE_MAPS_API_KEY`).

### assistant
`POST /assistant/chat` — CIRO AI copilot chat (Qwen with deterministic fallback).

### admin (ADMIN)
`GET /kpis · GET /verification-feed · GET /forecast · POST /incidents/:id/approve-dispatch ·
GET /incidents · GET /incidents/:id · PATCH /incidents/:id/verify · PATCH /incidents/:id/assign ·
POST /incidents/:id/reanalyze · GET /resolutions · GET /resolutions/:id ·
PATCH /resolutions/:id/approve|reject|reopen · POST /staff · GET /staff(/detailed) · PATCH /staff/:id ·
GET/POST /departments · PATCH /departments/:id · PATCH /departments/:id/toggle ·
GET/POST /broadcasts · PATCH /broadcasts/:id/deactivate ·
GET /dispatch/recommendations · POST /dispatch/auto-assign ·
GET /analytics · GET /resources · GET /weather · GET /audit · GET/PATCH /settings`

### staff (STAFF)
`GET /kpi · PATCH /duty-status · GET /assignments · GET /assignments/:id ·
PATCH /assignments/:id/accept · PATCH /assignments/:id/status ·
POST /assignments/:id/situation-log · POST /assignments/:id/resolve · GET /history`

### map & shelters
`GET /map/incidents · GET /map/responders · GET /shelters · GET /shelters/:id ·
POST|PATCH /shelters(ADMIN) · PATCH /shelters/:id/toggle · DELETE /shelters/:id`

### notifications
`GET / · PATCH /mark-all-read · PATCH /:id/read · GET /alerts`

### users / profile
`GET /users (ADMIN) · GET|PATCH /profile`

### system
`GET /health`

---

## 4. WebSocket Events (JWT handshake `?token=`)

Registry helpers: `sendToUser`, `broadcastToRole`, `broadcastToAll`.
Events: `incident.new`, `incident.update` (reporter; status/verdict/suggestedTeam/etaMinutes),
`incident.dispatched` (STAFF), `alert.broadcast`, `notification.new`, `staff.assignment`.

---

## 5. Environment (server/.env)

`PORT=5000 · JWT_SECRET · JWT_EXPIRES_IN · REFRESH_EXPIRES_IN · DATABASE_PATH ·
FRONTEND_URL (comma-separated CORS origins — must include every Vite port, e.g. 5173,5174) ·
DASHSCOPE_API_KEY (optional; deterministic fallback when absent) · QWEN_MODEL=qwen-plus · QWEN_VL_MODEL=qwen-vl-plus ·
UPLOAD_DIR · (OSS_* keys optional for Alibaba Object Storage adapter)`

Client: `VITE_API_URL` (default `http://localhost:5000/api/v1`).

---

## 6. Service Layer Map

`auth · incident · aiPipeline (10 agents) · aiTriage (extract) · qwen (DashScope client) ·
dispatch (nearest-team + ETA) · notification · analytics · assistant · profile · settings · shelter · storage`
Layer rules: controllers → services → repositories → SQL; controllers never write SQL.
