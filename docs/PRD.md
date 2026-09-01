# CIRO — Product Requirements Document (PRD)

**Version 3.0 — AI Auto-Triage release** · Status: Implemented (web portal) · Target: Alibaba Cloud hackathon

## 1. Vision

One safety grid for Pakistan: citizens, responders and command centers connected by an
AI-verified emergency pipeline that reacts in **seconds**, while **humans keep final authority**.

Tagline: *Secure. Connected. Human-led.*

## 2. Personas

| Persona | Needs |
|---------|-------|
| **Citizen (Ayesha, Lahore)** | Report an emergency in her own language (Urdu/Roman Urdu) by voice; get instant safety guidance and live ETA; see nearby incidents & safe places on a map. |
| **Responder (Bilal, Rescue 1122)** | Receive verified, de-duplicated assignments with location, severity and context — not raw noise. |
| **Dispatcher (Saqib, Command Center)** | See AI verdicts with confidence, spam/duplicate/satellite signals and a 2–3 line summary; approve or reject dispatch with one click; forecast hotspots to pre-position teams. |

## 3. Functional Requirements

### P0 — Core emergency loop
- **FR-01 Report**: category, description, GPS, photo evidence, contact phone; citizen sees own reports with live timeline.
- **FR-02 Voice-to-Report**: mic capture (`ur-PK`), interim transcription, AI autofill of category/location/people/priority; works with English & Roman Urdu text too.
- **FR-03 AI Auto-Triage**: on every report run the 10-agent pipeline (Sentinel, SpamGuard, GeoScout, SatelliteScout, DedupGuard, Corroborator, VerdictEngine, GeoImpact, SmartDispatch, Copilot) in < 5 s.
- **FR-04 Instant safety reply**: authority-approved template per category, shown to citizen immediately (never free-form AI text).
- **FR-05 Human approval gate**: dispatch only after dispatcher clicks *Approve & Dispatch*; audit-logged; citizen receives "Team dispatched + ETA" push.
- **FR-06 Live alerts**: public alerts for verified critical/high incidents; area citizens notified; alert ticker + notifications.
- **FR-07 Maps**: live incident pins with severity pulse; impact-zone polygons; forecast hotspot rings; shelters; responders; tactical dark tiles; locate-me with nearest safe place.

### P1 — Trust & quality
- **FR-08 Spam/fake detection**: score ≥ 40 blocks auto-actions; ≥ 60 forces human review; findings listed in trace.
- **FR-09 Duplicate detection**: same-area recent reports merged/flagged; corroborating reports *raise* confidence instead.
- **FR-10 Satellite fusion**: supporting/conflicting signal adjusts confidence (fire/flood/landslide useful; accident/medical not).
- **FR-11 Medical privacy**: medical impact zones are private — teams only, zero public exposure, affected count hidden.

### P2 — Command intelligence
- **FR-12 AI Decision Center**: queue of NEEDS_REVIEW / LOW_CONFIDENCE / DUPLICATE runs with confidence %, suggested team, impact-zone population estimate, copilot summary, approve/reject actions.
- **FR-13 Emergency forecasting**: hotspot grid (~2 km) from last 90 days; risk score = f(count, severity weights); shown as bars + map rings.
- **FR-14 Command Copilot**: 2–3 line summary per incident for dispatchers.

### P3 — Experience & design (prototype-faithful)
- **FR-15 Design system**: navy `#0A1E42` surfaces, periwinkle `#D7E3F8` canvas, aqua `#4CC9F0` accents; curved arch dividers; particle Pakistan map with city nodes; round blue arrow CTAs; bottom sheets with drag handles; tagline footer.
- **FR-16 Onboarding**: welcome → consent checklist (sheet summary) → location → notifications → microphone, with permission results.
- **FR-17 Navy sidebar** across citizen/responder/admin portals: gradient logo tile, active item solid blue, particle-network art, user card with sign-out.

## 4. AI Feature Matrix (as specified)

| AI Feature | Behavior |
|------------|----------|
| Smart Report Detection | Fire / Medical / Accident / Crime / Flood (+ more) from text, voice or photo |
| Auto Location Detection | GPS + description → named location (cities/landmarks vocab) |
| AI Risk Scoring | Critical / High / Medium / Low with confidence % |
| Voice-to-Report | Urdu, English, Roman Urdu → auto-filled form |
| Image Analysis | Smoke/fire/damaged vehicle/flood evidence (qwen-vl-plus, heuristic fallback) |
| Duplicate Detection | Merge multiple reports of one incident |
| Fake/Spam Detection | Mark suspicious reports for dispatcher review |
| Instant AI Response | Approved safety instructions immediately |
| Smart Dispatch | Nearest team by location/availability/traffic heuristic + ETA minutes |
| Automatic Updates | "Report received", "Team dispatched", ETA notifications (WebSocket) |
| Command Center Copilot | Long report → 2–3 line summary |
| Emergency Forecasting | Accident/flood/crime hotspot identification from history |

## 5. Verification Levels & Auto-Actions

| Status | Automatic action |
|--------|------------------|
| Verified | Teams + affected-area citizens auto-alerted |
| Partially verified | Teams pre-alerted; public message held |
| Unverified | Human dispatcher review |
| False/spam | Blocked + audit record |

Thresholds are configurable by the emergency authority (server constants today).

## 6. Impact-Zone Rules (Geo-Impact Engine)

| Category | Geometry | Notes |
|----------|----------|-------|
| Fire / Gas leak | Wind-direction sector (bearing ±55°) | Radius by severity |
| Road accident / Flood | Corridor along road/water | Route warnings |
| Medical | Private circle (150 m) | Teams only — privacy |
| Other | Circle | Radius ×1.25 for HIGH/CRITICAL |

Affected-population estimate = zone area × urban density constant; shown to dispatcher.

## 7. Satellite Usage Policy

| Emergency | Satellite useful? | Best data |
|-----------|-------------------|-----------|
| Flood | Yes | Water extent, affected villages (Sentinel-1) |
| Wildfire | Yes | Heat/fire hotspots (NASA FIRMS, ~3 h latency) |
| Landslide | Yes | Terrain change |
| Earthquake | Later | Infrastructure damage (Copernicus rapid mapping) |
| Road accident / Medical / Crime | No | Citizen GPS, cameras, reports |

Satellite is **strategic confirmation**, not instant detection — reflected in SatelliteScout weighting.

## 8. Non-Functional Requirements

- **Latency**: pipeline p95 < 5 s (measured ~5–20 ms offline fallback; < 3 s with Qwen).
- **Realtime**: WebSocket push < 1 s for pipeline verdicts, alerts, dispatch updates.
- **Availability**: single-node ECS today; stateless services + SQLite WAL for crash safety.
- **Security**: JWT access (15 m) + refresh (7 d) rotation, RBAC (PUBLIC/STAFF/ADMIN), rate limiting, helmet, CORS allowlist, input sanitization, password hashing.
- **Privacy**: medical zones private; consent captured in onboarding; audit log of every AI decision.
- **Languages**: UI English; report intake Urdu + Roman Urdu + English.

## 9. KPIs (hackathon demo)

- Auto-verified rate, avg pipeline ms, alerts issued, duplicates caught (live on dashboard).
- Time-to-first-response for citizen (target < 10 s to instant safety reply).
- Dispatcher decision time (approve/reject) from AI Decision Center.

## 10. Out of Scope (this build)

- Live integrations with Rescue 1122 / Police 15 / hospital networks (requires official partnerships).
- Real satellite API ingestion (heuristics model the signal today).
- Production push (FCM) & SMS fallback — designed, not wired.
