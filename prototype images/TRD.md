# CIRO — Technical Requirements Document (TRD)

**Version 3.0** · Matches implementation on `server/` (Express + SQLite) and `client/` (React 18 + Vite).

## 1. System Architecture

```
client (React 18, Vite, Tailwind, zustand, react-leaflet)
   │  HTTP (axios, /api/v1)            ▲ WebSocket (ws, JWT handshake)
   ▼                                   │
server (Express :5000)
   routes → middleware(auth/rbac/validators) → controllers
      → services (auth, incidents, aiPipeline, aiTriage, qwen, alerts, …)
      → repositories → better-sqlite3 (WAL)
   websocket/ (socket registry: sendToUser, broadcastToRole, broadcastToAll)
   AI: DashScope Qwen (qwen-plus / qwen-vl-plus) with deterministic fallback
```

Layer rules: controllers never touch SQL; repositories own queries; services own logic;
`apiRequest` on the client unwraps the `{success, message, data}` envelope.

## 2. Runtime & Ports

| Component | Port | Command |
|-----------|------|---------|
| API + WS | 5000 | `cd server && npm run dev` (`node --watch server.js`) |
| Web client | 5173 (auto-shift 5174) | `cd client && npm run dev` |

Env (see `server/.env.example`): `PORT`, `JWT_SECRET`, `JWT_REFRESH_SECRET`,
`DATABASE_PATH`, `FRONTEND_URL` (comma-separated CORS allowlist — must include every
Vite port in use), `GOOGLE_CLIENT_ID` (Google Identity Services; empty → Firebase Auth
popup flow, then demo Google login in dev), `FIREBASE_PROJECT_ID` (Firebase ID tokens
accepted for Google login; defaults to the CIRO project), `SMTP_HOST`, `SMTP_PORT`,
`SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` (nodemailer for real OTP emails; empty = dev
devCode echo), `GOOGLE_MAPS_API_KEY` (geocoding for the Weather radar map; optional),
`DASHSCOPE_API_KEY`, `DASHSCOPE_BASE_URL`, `QWEN_TEXT_MODEL`,
`QWEN_VISION_MODEL`, `OSS_*` (Alibaba OSS-ready). Client: `VITE_GOOGLE_CLIENT_ID`
(optional, official GIS button; otherwise Firebase popup).

## 3. Authentication & RBAC

- `POST /auth/register|login|google|refresh|logout`, `POST /auth/otp/request`,
  `POST /auth/otp/verify`, `GET /auth/me`.
- Google: Firebase Auth popup ID token (or GIS ID token) verified via Google tokeninfo →
  find-or-create PUBLIC user (`users.provider = 'google'`).
- Email OTP: 6-digit code bcrypt-hashed in `otp_codes`, 10-min expiry, 5 attempts,
  30 s request cooldown, single-use; emailed via nodemailer (dev echo when no SMTP).
- Access token 15 m / refresh 7 d (rotation, `refresh_tokens` table).
- Roles: `PUBLIC`, `STAFF`, `ADMIN`; route guards per role (client `ProtectedRoute`, server middleware).
- Citizens can read/cancel **only their own** reports; staff see assignments; admin sees everything.

## 4. AI Pipeline — Rapid Intelligence Grid (10 agents)

File: `server/src/services/aiPipeline.service.js`. Runs async on incident create;
each stage records `{agent, role, status, findings, durationMs}` in `incident_verification.stages`.

1. **Sentinel** — category/severity classification (Qwen JSON; offline rule-based fallback).
2. **SpamGuard** — heuristics: short desc +30, no phone +10, excess `!` +10, <50% letters +20, title==desc +15, ≥2 prior rejections +30. Score ≥ 60 ⇒ verdict forced `NEEDS_REVIEW` (confidence cap 45); ≥ 40 blocks auto-verify/auto-route.
3. **GeoScout** — coordinate sanity (Pakistan bounding box), area naming.
4. **SatelliteScout** — deterministic coord hash → `SUPPORTING|INCONCLUSIVE|CONFLICTING`; confidence +6 / −12; findings explain source (FIRMS/Sentinel-1 style).
5. **DedupGuard** — same category within ~1 km & 24 h ⇒ `SUSPECTED_DUPLICATE`.
6. **Corroborator** — independent nearby reports raise confidence (+ per report).
7. **VerdictEngine** — composite: `AUTO_VERIFIED | NEEDS_REVIEW | SUSPECTED_DUPLICATE | LOW_CONFIDENCE` + confidence % + severity.
8. **GeoImpact** — zone geometry: `sector` (FIRE/GAS_LEAK, bearing ±55°), `corridor` (ACCIDENT/FLOOD), else `circle`; radius from category table (FIRE 500 m, FLOOD 1200 m, ACCIDENT 600 m, MEDICAL 150 m private, GAS_LEAK 800 m…) ×1.25 for HIGH+; affected = area × 4000/km²; MEDICAL ⇒ `privateZone` (affected stored 0).
9. **SmartDispatch** — `TEAM_MATRIX` per category (e.g. ACCIDENT → "Ambulance + Traffic Police"); ETA = clamp(4 + dist/800 m [+2 if CRITICAL], 4, 15) min; persists `ai_suggested_team`, `ai_eta_minutes`.
10. **Copilot** — 3-line dispatcher summary stored in `copilot_summary`.

Auto-actions (safety-gated): verdict AUTO_VERIFIED **and** severity ≥ HIGH **and** spam < 40 ⇒
public alert issued + department pre-routed; otherwise held for human decision.

### Smart report extraction (`/ai/extract`)
`server/src/services/aiTriage.service.js` — rule-based NLU for English/Roman Urdu/Urdu:
category vocab, word numbers (do=2, teen=3…), known places (Pakistani cities/landmarks),
priority mapping, `TEAM_MATRIX` suggestion, and **authority-approved** instant safety templates
(`INSTANT_RESPONSE`), e.g. accident → *"Aapki report receive ho gayi hai. Safe distance par rahen…"*.

## 5. Human Approval & Realtime

- `POST /admin/incidents/:id/approve-dispatch` — sets `verified_severity`,
  `dispatch_approved_by/at`, REPORTED/AI_ANALYZED/UNDER_REVIEW ⇒ `VERIFIED`; audit
  `DISPATCH_APPROVED`; WS `incident.update` to reporter (team + ETA message) and
  `incident.dispatched` to STAFF.
- WS events: `incident.pipeline`, `alert.new`, `incident.update`, `incident.dispatched`,
  `notification.new`; registry exports `sendToUser`, `broadcastToRole`, `broadcastToAll`.

## 6. Forecasting

`computeForecastHotspots({days})` — grid `lat.toFixed(2)/lng.toFixed(2)` (~2 km), count ≥ 2,
`risk = min(100, count*14 + weight*6)` (weight 3/2/1 by severity) → `forecast_hotspots`,
served by `GET /admin/forecast?days=`.

## 7. API Surface (v1, prefix `/api/v1`)

| Group | Endpoints (selection) |
|-------|----------------------|
| auth | register, login, google (Firebase/GIS ID token), otp/request, otp/verify, refresh, logout, me |
| incidents | POST /incidents (multipart media), GET /incidents/mine, /incidents/:id, cancel, staff/admin lists & transitions |
| ai | POST /ai/extract |
| weather | GET /weather?city= (Qwen meteorologist JSON — current, 15-day, AQI, alerts, insights, radar coords; seasonal fallback + Google geocoding) |
| verification | GET /incidents/:id/verification (owner or staff/admin), GET /admin/verification-feed |
| admin | /admin/kpis, /admin/incidents, /admin/forecast, /admin/incidents/:id/approve-dispatch, broadcasts, staff, departments, shelters, analytics, audit |
| map | /map/incidents, /map/shelters, /map/responders |
| alerts | /alerts (public active), admin broadcast create |
| assistant | /assistant/ask (safety guidance) |
| weather | /weather (open-meteo fallback) |

All responses: `{success, message, data}`; errors via `ApiError` with status codes.

## 8. Database (SQLite, migrations 001–008)

Tables: `users, departments, staff_profiles, incidents, incident_media,
incident_status_history, incident_ai_analysis, incident_verification,
incident_situation_logs, emergency_broadcasts, notifications, shelters,
emergency_contacts, forecast_hotspots, audit_logs, refresh_tokens,
system_settings, schema_migrations`.

Key AI columns (007/008): `incident_verification(spam_score, spam_flags,
satellite_signal, satellite_detail, impact_radius_m, impact_shape JSON{kind,polygon},
affected_estimate, copilot_summary)`; `incidents(ai_suggested_team, ai_eta_minutes,
dispatch_approved_by, dispatch_approved_at)`.

## 9. Frontend Architecture

- `client/src`: `features/auth` (login/register/control), `pages/{public,staff,admin}`,
  `layouts` (PortalShell shared navy sidebar), `components/common` (CiroMap,
  PakistanParticleMap, AlertTicker, KpiCard…), `api` (axios wrappers), `store` (zustand auth),
  `hooks` (useRealtime WS).
- Design tokens (`tailwind.config.js`): `navy #0A1E42`, `peri #D7E3F8`, `aqua #4CC9F0`,
  brand/danger/warn/safe; CSS utilities `arch-b/arch-t`, `sheet`, `proto-check`, `proto-toggle`, `input-icon`.
- CiroMap props: `incidents, shelters, responders, impactZones[{polygon,kind,color,affected}], hotspots[{latitude,longitude,radius_m,risk_score}]`, tiles streets/tactical, layers panel, legend.

## 10. Security & Safety Controls

- helmet + custom security headers; global rate limiter; CORS allowlist; 1 mb JSON cap; multer media validation.
- Password hashing; refresh rotation; WebSocket auth with 4401 on expiry.
- OTP hardening: hashed codes, expiry/attempt caps, 30 s cooldown, dedicated rate limiter (10 req / 15 min), devCode/demo login never available in production.
- AI governance: human approval for dispatch; approved templates only; audit log per decision; medical privacy zones; spam gating.

## 11. Testing

- `server/scripts/verify-pipeline.js` — 22 e2e assertions (report → 10 stages → verdict → auto-alert → feed).
- `server/scripts/verify-ai-extras.js` — 17 assertions (Roman-Urdu/Urdu extract, forecast, approve-dispatch, feed shape).
- `server/scripts/smoke-test.js`, `smoke-incidents.js` — baseline CRUD.

## 12. Deployment (Alibaba Cloud)

- **ECS / Simple Application Server**: `npm run dev` → replace with `pm2 start server.js`; nginx reverse proxy (sample in `ciro-mobile/nginx.conf`).
- **DashScope**: set `DASHSCOPE_API_KEY` for live Qwen inference (intl endpoint configured).
- **OSS**: wire `OSS_*` for `uploads/` media at scale.
- **SMS fallback**: Alibaba Cloud SMS provider for no-internet citizens (roadmap).

## 13. Performance Targets

| Metric | Target | Measured (fallback) |
|--------|--------|--------------------|
| Pipeline p95 | < 5 s | 2–20 ms |
| WS push latency | < 1 s | < 300 ms |
| Extract API | < 500 ms | ~5 ms |
| Client TTI (Vite dev) | < 2 s | ~1.2 s |
