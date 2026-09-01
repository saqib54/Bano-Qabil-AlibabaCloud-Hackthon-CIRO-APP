# CIRO — User Flows Document

> End-to-end journeys for every persona, with diagrams and step tables.

---

## Flow Map Overview

```mermaid
graph LR
    C[Citizen] -->|Reports emergency| A[AI Triage Pipeline]
    A -->|Verified verdict| D[Dispatcher / Admin]
    D -->|Approve & Dispatch| S[Responder / Staff]
    S -->|Field updates| D
    D -->|Alerts & broadcasts| C
    A -->|Spam / duplicate| B[Blocked / Merged]
```

---

## 1. Citizen: Report an Emergency (Happy Path)

```mermaid
sequenceDiagram
    participant U as Citizen
    participant W as Web/App
    participant API as CIRO API
    participant AI as 10-Agent Pipeline
    participant D as Dispatcher

    U->>W: Opens Report Emergency
    U->>W: Speaks / types (Urdu, Roman Urdu, English)
    W->>W: Voice-to-Report autofill (category, location, people)
    U->>W: Adds photo (live camera) + GPS
    U->>API: POST /incidents
    API->>AI: Run pipeline (< 5 s)
    AI-->>API: Verdict + confidence %
    API-->>U: Instant safety guidance (approved template)
    AI-->>D: Queued in AI Decision Center
    D->>API: Approve & Dispatch
    API-->>U: WebSocket push: "Team dispatched + ETA"
```

| Step | User Action | System Response |
|------|-------------|-----------------|
| 1 | Open Report Emergency | Form with 10 categories, voice & camera buttons |
| 2 | Speak in Urdu/Roman Urdu | Live transcription + AI autofill |
| 3 | Tap photo | Camera stream → capture → upload |
| 4 | Confirm location | GPS auto-fetch, editable |
| 5 | Submit | Incident `INC-YYYYMMDD-####` created, safety reply shown |
| 6 | Wait | Live timeline in My Reports; push on status change |

---

## 2. Citizen: Email OTP Sign-In

```mermaid
flowchart TD
    A[Enter email] --> B[POST /auth/otp/request]
    B --> C{SMTP configured?}
    C -->|Yes| D[Email with 6-digit code]
    C -->|No| E[Code shown on screen - demo mode]
    D --> F[Enter code]
    E --> F
    F --> G{Valid & fresh?}
    G -->|Yes| H[Session issued - JWT access + refresh]
    G -->|No| I[Error + retry limit]
```

---

## 3. Dispatcher: Triage & Approve

```mermaid
flowchart TD
    A[AI Decision Center Queue] --> B{Confidence check}
    B -->|High & clean| C[One-click Approve & Dispatch]
    B -->|Low / Duplicate / Spam flags| D[Open trace view]
    D --> E[Read 10-agent findings + copilot summary]
    E --> F{Decision}
    F -->|Real| C
    F -->|Fake| G[Reject + audit log]
    C --> H[SmartDispatch assigns team by dept + proximity]
    H --> I[Responder notified - WebSocket]
    H --> J[Citizen notified - ETA push]
```

| Queue | Meaning | Action |
|-------|---------|--------|
| NEEDS_REVIEW | SpamGuard ≥ 60 or conflicting signals | Manual verdict required |
| LOW_CONFIDENCE | VerdictEngine below threshold | Corroborate or reject |
| DUPLICATE | DedupGuard match | Merge into master incident |

---

## 4. Responder: Receive & Act

```mermaid
sequenceDiagram
    participant D as Dispatch
    participant S as Responder App
    participant F as Field

    D->>S: Assignment pushed (WebSocket)
    S->>S: Dashboard shows task: location, severity, context
    S->>F: Navigate to incident
    S->>D: Field status updates (en-route, on-scene, resolved)
    D->>D: Status history + timeline updated
    D-->>D: Citizen sees live progress
```

---

## 5. Admin: Emergency Broadcast

```mermaid
flowchart LR
    A[Admin composes broadcast] --> B[Target: area + audience]
    B --> C[Fan-out: DB notifications]
    C --> D[WebSocket alert.new to all connected]
    D --> E[Citizen dashboards + tickers update instantly]
```

---

## 6. Role-Based Access Matrix

| Journey | PUBLIC | STAFF | ADMIN |
|---------|:------:|:-----:|:-----:|
| Report emergency | ✅ | ✅ | ✅ |
| View own reports | ✅ | ✅ | ✅ |
| Cancel own report | ✅ | ✅ | ✅ |
| Safety map / alerts / weather | ✅ | ✅ | ✅ |
| Assignments queue | ❌ | ✅ | ✅ |
| Field status updates | ❌ | ✅ | ✅ |
| Approve & dispatch | ❌ | ❌ | ✅ |
| Broadcasts / shelters | ❌ | ❌ | ✅ |
| User & staff management | ❌ | ❌ | ✅ |
| Audit logs | ❌ | ❌ | ✅ |

---

## 7. Incident Status Lifecycle

```mermaid
stateDiagram-v2
    [*] --> REPORTED
    REPORTED --> TRIAGING : AI pipeline
    TRIAGING --> VERIFIED : confidence ok
    TRIAGING --> NEEDS_REVIEW : flagged
    TRIAGING --> REJECTED : spam/fake
    NEEDS_REVIEW --> VERIFIED : dispatcher approves
    NEEDS_REVIEW --> REJECTED : dispatcher rejects
    VERIFIED --> DISPATCHED : team assigned
    DISPATCHED --> EN_ROUTE : responder moving
    EN_ROUTE --> ON_SCENE : arrived
    ON_SCENE --> RESOLVED : closed with evidence
    REPORTED --> CANCELLED : citizen cancels
    RESOLVED --> [*]
    REJECTED --> [*]
    CANCELLED --> [*]
```

*(Full 14-state model with transition rules lives in `docs/BACKEND_SCHEMA.md`)*
