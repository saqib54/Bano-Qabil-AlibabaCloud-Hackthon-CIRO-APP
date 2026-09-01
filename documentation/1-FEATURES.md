# CIRO — Features Document

> **Crisis Intelligence & Response Orchestrator**
> *Secure. Connected. Human-led.*
> Version 3.0 — AI Auto-Triage Release • Alibaba Cloud × Bano Qabil Hackathon

---

## 1. Feature Overview at a Glance

| # | Feature Area | Modules | Status |
|---|--------------|---------|--------|
| F-01 | Authentication & Identity | Email/Password, Google Sign-In, Email OTP, JWT sessions | ✅ Live |
| F-02 | Emergency Reporting | 10 categories, GPS, camera capture, voice-to-report | ✅ Live |
| F-03 | AI Auto-Triage Pipeline | 10-agent verification chain (< 5 s) | ✅ Live |
| F-04 | Command Center (Admin) | AI Decision Center, dispatch, analytics, broadcasts | ✅ Live |
| F-05 | Responder Portal (Staff) | Assignments, field ops, history | ✅ Live |
| F-06 | Citizen Experience | Dashboard, alerts, safety map, safe places, weather | ✅ Live |
| F-07 | Realtime Engine | WebSocket push for alerts & status changes | ✅ Live |
| F-08 | Localization & Accessibility | Urdu / English / Roman Urdu, dark mode | ✅ Live |
| F-09 | Personalization | Avatars, preferences sync, terms consent | ✅ Live |
| F-10 | Mobile Apps | Android APK + iOS project (Capacitor) | ✅ Built |

---

## 2. F-01 — Authentication & Identity

| Capability | Detail |
|------------|--------|
| Email + Password | bcrypt-hashed credentials, validation on both sides |
| Google Sign-In (Web) | Firebase Auth popup → Firebase ID token → server verifies via Google **x509 securetoken certs** |
| Google Sign-In (APK) | Native account picker (`cordova-plugin-googleplus`) → credential exchange → same backend path |
| Email OTP | 6-digit code, 10-min expiry, bcrypt-hashed at rest, attempt limiting; delivered by SMTP when configured, on-screen demo code otherwise |
| Sessions | JWT access token (15 min) + rotating refresh token (7 d), revocable server-side |
| Roles | `PUBLIC` (citizen) • `STAFF` (responder) • `ADMIN` (command center) |

**Security posture:** RBAC middleware on every route, refresh-token reuse detection, audit log on every auth event.

---

## 3. F-02 — Emergency Reporting

| Capability | Detail |
|------------|--------|
| Categories | 10 predefined (Fire, Accident, Medical, Flood, Crime, Gas Leak, Building Collapse, Power, Protest, Other) |
| Incident numbering | `INC-YYYYMMDD-####` — globally traceable |
| Status lifecycle | 14 states with enforced transition rules (reported → triaged → dispatched → resolved…) |
| GPS | Browser Geolocation with one tap; manual address fallback |
| Live camera | `getUserMedia` photo capture → multipart upload → stored evidence |
| Voice-to-Report | `ur-PK` speech recognition → AI autofill of category/location/people/priority; auto-falls back to `en-US` |
| My Reports | Timeline per report, citizen can cancel their own report |

---

## 4. F-03 — AI Auto-Triage Pipeline (10 Agents)

Every report runs a **deterministic 10-agent chain** in under 5 seconds:

| # | Agent | Responsibility |
|---|-------|----------------|
| 1 | **Sentinel** | Ingestion, normalization, severity pre-score |
| 2 | **SpamGuard** | Spam/fake scoring (≥ 40 blocks auto-action, ≥ 60 forces human review) |
| 3 | **GeoScout** | Location sanity, region tagging, reverse-geocode enrichment |
| 4 | **SatelliteScout** | Satellite/weather signal fusion (fire/flood/landslide) |
| 5 | **DedupGuard** | Same-area recent report merge/flag |
| 6 | **Corroborator** | Multiple citizen reports **raise** confidence |
| 7 | **VerdictEngine** | Final verdict + confidence % |
| 8 | **GeoImpact** | Impact-zone polygon + population estimate |
| 9 | **SmartDispatch** | Suggested team & department routing |
| 10 | **Copilot** | 2–3 line human summary for dispatchers |

**Human approval gate:** dispatch happens **only** after a dispatcher clicks *Approve & Dispatch* — every decision is audit-logged.

---

## 5. F-04 — Command Center (Admin Portal)

| Screen | Purpose |
|--------|---------|
| Admin Dashboard | KPIs: active incidents, response times, department load |
| Incident Queue / AI Decision Center | NEEDS_REVIEW, LOW_CONFIDIDENCE, DUPLICATE queues with confidence %, approve/reject |
| Smart Dispatch | One-click team assignment with suggestions |
| Operations Map | Live pins, impact zones, forecast hotspot rings, shelters, responders |
| Analytics | Trend charts, category/region breakdowns |
| Emergency Broadcasts | Area-targeted alerts with fan-out + WebSocket push |
| Shelters & Safe Places | Manageable registry for citizens |
| Weather Center | Point-Forecast integration for risk awareness |
| Staff / User / Department Management | Full CRUD + activation control |
| Audit Logs | Tamper-evident trail of every privileged action |
| Resolution Review | Before/after evidence review to close incidents |

---

## 6. F-05 — Responder Portal (Staff)

| Screen | Purpose |
|--------|---------|
| Staff Dashboard | Today's assignments, severity overview |
| Assignments | Verified, de-duplicated tasks with location + context |
| Incident Ops | Field status updates back into the pipeline |
| History | Completed responses per responder |
| Notifications | Dispatch push + alert fan-out |

Departments seeded: **Rescue 1122, Fire, Traffic Police, Police, WAPDA**.

---

## 7. F-06 — Citizen Experience

| Screen | Purpose |
|--------|---------|
| Public Dashboard | Live alert ticker, nearby stats, quick actions |
| Report Emergency | The 60-second reporting flow (see F-02) |
| Safety Map | Severity-pulsed incident pins, shelters, locate-me + nearest safe place |
| Safe Places | Directory of shelters with directions |
| Alerts | Emergency broadcast feed |
| Weather | Hyperlocal forecast + advisories |
| AI Assistant | Safety Q&A with approved guidance templates |
| Notifications | Personal alert center |
| Profile | Avatar upload, language, theme, terms consent |

**Medical privacy:** medical impact zones are team-only — zero public exposure, affected counts hidden.

---

## 8. F-07..F-10 — Cross-Cutting

| Area | Implementation |
|------|----------------|
| Realtime | WebSocket hub: `alert.new`, incident status changes, dispatch events |
| Localization | Full i18n: **Urdu**, **English**, **Roman Urdu** — runtime switch, persisted per user |
| Dark mode | System-aware + manual toggle, persisted & synced |
| Preferences sync | Language/theme/consent stored server-side per account |
| Android APK | Capacitor 8 build — camera, location & mic permissions; native Google login |
| iOS | Capacitor project ready (`client/ios`) with usage-description plist entries |

---

## 9. Scale & Capacity (Current Demo Profile)

| Metric | Value |
|--------|-------|
| REST endpoints | **82** across 11 route modules |
| Pages/screens | **34** across 3 portals |
| DB tables | incidents, media, status history, users, tokens, OTP, notifications, broadcasts, shelters, audit… |
| AI pipeline latency | < 5 s end-to-end |
| Auth modes | 3 (password, Google, OTP) |
| Languages | 3 |
