# CIRO — Application Flow (APP_FLOW)

**Version 3.0 — AI Auto-Triage release** · Matches `client/` (React 18 + Vite) and `server/` (Express + SQLite + WS).
Tagline: *Secure. Connected. Human-led.* · Built for the **Alibaba Cloud hackathon** (DashScope Qwen inference, OSS-ready media, ECS-deployable).

---

## 1. Portals & Navigation (prototype design)

All three portals share `PortalShell` — a navy (#0A1E42) sidebar with the CIRO siren logo,
particle-network backdrop (`PakistanParticleMap`), icon nav, and a bottom user card
(avatar initial, name, email, logout). Active item is a solid brand-blue rounded pill.

| Portal | Route prefix | Nav items |
|--------|--------------|-----------|
| **Citizen (PUBLIC)** | `/` | Dashboard, Report Emergency, Safety Map, My Reports, Ask CIRO AI, Alerts, Safe Places, Profile |
| **Responder (STAFF)** | `/staff` | Dashboard, My Assignments, Alerts, Profile |
| **Command Center (ADMIN)** | `/admin` | Command Center (AI Decision Center + ops map), plus admin management sections |

Public (unauthenticated) pages: `/` landing (navy hero + Pakistan particle map + REPORT EMERGENCY CTA),
`/map` public safety map (national coverage banner + Leaflet), `/login`, `/register`, `/onboarding`.

---

## 2. Auth Flow

```
Register/Login (rate-limited) → JWT access (short) + refresh token (hashed, DB)
→ axios interceptor attaches Bearer; on 401 → /auth/refresh → retry once
→ /auth/me hydrates zustand auth.store → role-based redirect:
   PUBLIC → /            STAFF → /staff            ADMIN → /admin

Google (citizen): "Continue with Google" → Firebase Auth popup (CIRO project) →
Firebase ID token → POST /auth/google → server verifies via Google tokeninfo
(aud = FIREBASE_PROJECT_ID & iss = securetoken.google.com/<projectId>, or
aud = GOOGLE_CLIENT_ID for the GIS button) → find-or-create PUBLIC user →
same JWT session. No keys/provider configured → dev-only demo Google login.

Email OTP (citizen, passwordless): enter email → POST /auth/otp/request
→ 6-digit code emailed (nodemailer SMTP); hashed in otp_codes, 10-min expiry,
5 attempts max, 30 s cooldown, single-use. Dev without SMTP echoes devCode on
screen. → POST /auth/otp/verify → find-or-create PUBLIC user → same JWT session.
```

- Passwords bcrypt-hashed; refresh tokens revocable (`refresh_tokens.revoked`).
- RBAC middleware: `requireAuth`, `requireRoles('PUBLIC'|'STAFF'|'ADMIN')`.
- Seed accounts: `citizen@ciro.demo / Ciro@1234`, `responder@ciro.demo / Ciro@1234`, admin account created at seed.

---

## 3. Citizen Report → AI Auto-Triage Flow (core)

```
[Citizen] ReportEmergency page
   text (English / Roman Urdu / Urdu) + optional voice (Web Speech → text) + optional photo
        │ POST /incidents  (multipart)
        ▼
[Server] incident.service.create
   1. persist incident (status REPORTED) + media (OSS-ready storage.service)
   2. aiPipeline.service.runPipeline(incident) — 10 agents, ~ms:
      Sentinel      → intake & normalization (language detect, category hints)
      SpamGuard     → spam_score + flags (keyword stuffing, nonsense, abuse)
      GeoScout      → location extraction (KNOWN_PLACES gazetteer, Urdu/Roman Urdu) → lat/lng
      SatelliteScout→ FIRMS/Sentinel-1 fusion signal (strategic corroboration, not instant)
      DedupGuard    → duplicate check vs nearby open incidents (radius + time window)
      Corroborator  → nearby-incident & broadcast corroboration count
      VerdictEngine → verdict VERIFIED | UNCERTAIN | SPAM + confidence + severity
      GeoImpact     → impact_shape JSON {kind, polygon} geofenced by category:
                        FIRE/GAS_LEAK → wind sector · ACCIDENT/FLOOD → corridor
                        MEDICAL → private zone (teams only) · default circle
      SmartDispatch → nearest active team (staff_profiles + departments) + ETA minutes
      Copilot       → 2–3 line dispatcher summary (Qwen qwen-plus, deterministic fallback)
   3. persist incident_verification row (stages[], duration_ms, impact_shape, …)
   4. instant AI safety instructions → notification to reporter (authority-approved templates)
   5. WS broadcast: new incident to STAFF/ADMIN
        │
        ▼
[Citizen] My Reports list (status pills, AI Verified / AI Analyzed badges, 4-step progress:
          Reported → AI Verified → Team Assigned → Responding) + ReportDetail with
          live "Response Update" banner (team + ETA) via WS `incident.update`
```

**Verification levels (AI Verified Auto-Alert):**

| Verdict | Behavior |
|---------|----------|
| **VERIFIED** (high confidence) | auto-alert teams + geofenced citizen alerts; still requires human dispatch approval |
| **UNCERTAIN** | queued for human review in AI Decision Center |
| **SPAM** | blocked, audit-logged, reporter not alerted to others |

**Safety rules enforced in code:** AI *recommends only* — `POST /admin/incidents/:id/approve-dispatch`
is the **only** path that sets status VERIFIED-dispatched + `dispatch_approved_by/at`;
alerts use authority-approved templates; every decision writes `audit_logs`.

---

## 4. Command Center (Admin) Flow

```
/admin/dashboard (Command Center)
 ├─ KPI strip            GET /admin/kpis
 ├─ AI Verification Feed GET /admin/verification-feed   (10-agent stages, confidence, spam,
 │                                                       satellite, impact_shape polygons)
 ├─ AI Decision Center   → cards for UNCERTAIN/high-risk incidents:
 │     risk score, confidence %, suggested team + ETA, duplicate warning, AI summary
 │     [Approve & Dispatch]  POST /admin/incidents/:id/approve-dispatch
 │     [Reject / Manual Review] → audit log + status change
 ├─ Live Ops Map         CiroMap + impact zones (Polygon) + forecast hotspots + AI layer toggle
 ├─ Critical Queue       GET /admin/incidents (severity-sorted)
 ├─ Forecast             GET /admin/forecast?days=N → forecast_hotspots (risk_score, radius_m)
 ├─ Dispatch board       GET /admin/dispatch/recommendations · POST /admin/dispatch/auto-assign
 ├─ Resolution approval  GET /admin/resolutions · PATCH approve/reject/reopen
 ├─ Staff & Department mgmt, Broadcasts, Audit log, Settings, Analytics
```

Approve dispatch → WS `incident.dispatched` (STAFF) + `incident.update` (reporter) →
citizen's ReportDetail shows green "Live Response Update" with team + ETA.

---

## 5. Responder (Staff) Flow

```
/staff dashboard (KPI: active assignments, on-duty toggle)
 PATCH /staff/duty-status (ON_DUTY / OFF_DUTY; location tracked for SmartDispatch nearest-team)
 GET  /staff/assignments → accept (PATCH .../accept) → WS-driven new assignment alerts
 PATCH /staff/assignments/:id/status (EN_ROUTE → ON_SCENE → RESOLVING)
 POST  /staff/assignments/:id/situation-log (notes + photos)
 POST  /staff/assignments/:id/resolve (resolution notes + proof) → admin approval queue
```

---

## 6. Realtime (WebSocket) Event Catalog

Handshake: `ws://host?token=JWT` → registry maps user→sockets; helpers
`sendToUser`, `broadcastToRole`, `broadcastToAll`.

| Event | Audience | Payload highlights |
|-------|----------|--------------------|
| `incident.new` | STAFF, ADMIN | incident + AI verdict |
| `incident.update` | reporter | `{incidentId, status, verdict, suggestedTeam, etaMinutes, message}` |
| `incident.dispatched` | STAFF | assignment + location + severity |
| `alert.broadcast` | ALL | emergency_broadcast (geofenced regions) |
| `notification.new` | target user | notification row |
| `staff.assignment` | STAFF | new assignment push |

Client hook `useRealtime(handlers)` subscribes per page (ReportDetail, dashboards, Alerts).

---

## 7. Public Safety Map & Safe Places Flow

- `GET /map/incidents` (open incidents, sanitized) + `GET /map/responders` → Leaflet `CiroMap`
  with layer toggles (incidents / responders / shelters / **AI zones & hotspots**) and legend.
- Impact zones render as Polygons (dashed for private/medical); hotspots as dashed risk-colored circles.
- Safe Places: `GET /shelters` list + detail (capacity, contact, type) — admin CRUD + toggle.
- Emergency contacts directory: helplines (Rescue 1122, Police 15, fire) seeded.

---

## 8. Ask CIRO AI (Assistant) Flow

`POST /assistant/chat` → assistant.service (Qwen qwen-plus with rule-based fallback) answers
safety guidance, nearest shelters, report status help; conversation stateless per request;
falls back to deterministic templates when `DASHSCOPE_API_KEY` absent (hackathon-safe offline mode).

---

## 9. Status & Severity Vocabulary

- **Statuses**: REPORTED → AI_ANALYZED → VERIFIED / DUPLICATE / FALSE_ALARM → ASSIGNED →
  RESPONDING → RESOLVED (admin approval) → CLOSED; REOPENED path via resolutions.
- **Severity**: CRITICAL / HIGH / MEDIUM / LOW (`ai_recommended_severity` → `verified_severity` after human).
- **Categories**: FIRE, FLOOD, ACCIDENT, MEDICAL, GAS_LEAK, EARTHQUAKE, SECURITY, OTHER.

---

## 10. Verification Scripts (regression)

| Script | Covers |
|--------|--------|
| `server/scripts/verify-pipeline.js` | 10-agent stages ×2 scenarios, verdicts, audit trail (22 checks) |
| `server/scripts/verify-ai-extras.js` | Roman-Urdu + Urdu extraction, forecast hotspots, approve-dispatch → VERIFIED + impact_shape (17 checks) |
| `server/scripts/smoke-test.js`, `smoke-incidents.js` | auth + incident CRUD smoke |
