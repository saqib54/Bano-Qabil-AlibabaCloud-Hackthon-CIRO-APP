# CIRO — Final Product Documentation

**CIRO (Crisis Intelligence & Response Orchestrator)** is an AI-powered emergency
response platform that connects citizens, field responders and a city command
center in one real-time system. Citizens report emergencies (voice, text, photo,
live camera), AI triages and routes them, and command staff dispatch and track
response teams — all in English and Urdu, in light or dark mode, on any device.

---

## 1. Product Overview

| Aspect | Description |
|---|---|
| **Problem** | Emergency reporting in Pakistan is fragmented: phone hotlines are slow, reports lack location proof, and command centers have no unified real-time picture. |
| **Solution** | A single web platform (installable on Android/iOS) where citizens report emergencies with GPS + photo/live camera, AI (Qwen) extracts category, priority and safety guidance, and staff/admin portals manage dispatch end-to-end. |
| **Languages** | English + Urdu (اردو) with full RTL layout |
| **Themes** | Light (default) + Dark mode, user-selectable and persisted |
| **Devices** | Responsive web app / PWA — desktop, tablet, Android & iOS browsers, installable to home screen |

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (React SPA)                        │
│  Vite + React 18 + Tailwind CSS + Zustand + TanStack Query       │
│  Leaflet maps · Firebase Auth (Google) · PWA (manifest + SW)     │
│                                                                  │
│   Citizen Portal      Responder Portal      Command Center       │
│   /public/*           /staff/*              /admin/*             │
└───────────────────────────────┬─────────────────────────────────┘
                                │ REST (axios) + WebSocket (real-time)
┌───────────────────────────────▼─────────────────────────────────┐
│                     SERVER (Node.js + Express)                   │
│  routes → validators → services → repositories → SQLite          │
│  JWT access/refresh auth · RBAC · rate limiting · audit logs     │
│  AI (Qwen via DashScope): report extraction, weather, assistant  │
│  SMTP OTP · Google sign-in verification · file uploads (OSS/FS)  │
└──────────────────────────────────────────────────────────────────┘
```

### 2.1 Backend layers (`server/`)

| Layer | Folder | Responsibility |
|---|---|---|
| Entry | `server.js`, `src/app.js` | Express bootstrap, middleware chain |
| Routes | `src/routes/` | URL → controller mapping (auth, incidents, admin, weather…) |
| Middleware | `src/middleware/` | Auth (JWT), RBAC roles, error handler |
| Services | `src/services/` | Business logic, AI calls, email, weather, alerts |
| Repositories | `src/repositories/` | Raw SQL data access (better-sqlite3) |
| Database | `database/` | SQLite file + migrations + seeds |
| WebSocket | `src/websocket/` | Real-time incident/notification push |

**Response convention:** every API responds `{ success, data, message }`.

### 2.2 Frontend layers (`client/`)

| Layer | Folder | Responsibility |
|---|---|---|
| Pages | `src/pages/{public,staff,admin}/` | Feature screens per portal |
| Layouts | `src/layouts/` | Role portals → shared `PortalShell` |
| Components | `src/components/` | Shared UI (shell, maps, weather, camera) |
| API | `src/api/` | Typed axios wrappers per resource |
| Stores | `src/store/` | Zustand: auth session, UI settings (theme/lang) |
| i18n | `src/i18n/` | English/Urdu dictionary + `useTranslation()` |
| Hooks | `src/hooks/` | Realtime socket, security monitor |

---

## 3. User Roles & Portals

### 3.1 Citizen (`/public`)
- **Dashboard** — live city status, active alerts, quick actions
- **Report Emergency** — category, details, GPS capture, contact,
  **photo evidence via file upload OR live camera**, AI Smart Report
  (voice/text in Urdu, Roman Urdu or English → auto-fills the form)
- **My Reports / Report Detail** — track status timeline, cancel own report
- **Safety Map & Safe Places** — incidents and shelters on Leaflet maps
- **Ask CIRO AI** — safety assistant chat
- **Weather Intelligence** — AI meteorologist briefing: severe alerts, 3D
  current-conditions card, AQI + health guidance, 15-day forecast,
  lifestyle insights and live radar map with city search
- **Alerts & Notifications** — authority broadcasts, real-time bells

### 3.2 Responder (`/staff`)
- Dashboard (duty toggle), assignments queue, incident operations
  (status transitions, evidence upload), history, notifications

### 3.3 Command Center (`/admin`)
- Command Dashboard KPIs · Operations Map · Incident Queue & Detail
- Smart Dispatch · Emergency Broadcasts · Resolution review
- Staff, Departments, Resources, Shelters management
- **Weather Intelligence — identical to the citizen experience**
  (city search, alerts, 3D card, forecast, radar) plus an admin-only
  *Operational Recommendations* panel for dispatch readiness
- Analytics, Audit Logs, Settings

---

## 4. Feature Deep-Dives (latest release)

### 4.1 Live camera capture
Location: **Report Emergency → Photo evidence** (`components/common/CameraCapture.jsx`).
- Opens the device camera via `getUserMedia` (rear camera by default, switchable)
- Citizen frames the emergency and taps the red shutter button; the frame is
  snapshotted to a JPEG (`canvas.toBlob`) and attached exactly like an upload
- Works on desktop web, Android Chrome and iOS Safari; graceful fallback
  message if permission is denied (file upload remains available)
- The hidden file input also carries `capture="environment"` so native
  mobile pickers open the camera directly

### 4.2 Dark / Light theme
- `store/settings.store.js` persists the choice in `localStorage` (`ciro-settings`)
- Tailwind runs in `darkMode: 'class'`; `index.css` remaps the semantic
  design tokens (`surface`, `ink`, `line`, `card`, `input`, soft status
  tones) under `.dark`, so every page follows the theme automatically
- Toggle locations: sidebar & drawer (labelled rows), mobile header,
  bottom-nav chrome, and the login/register screens

### 4.3 Multi-language (English / Urdu)
- `i18n/translations.js` — English is the source of truth; Urdu dictionary
  translates navigation, report flow and common actions, falling back to
  English for any untranslated string
- Selecting **اردو** flips the whole document to RTL (`<html dir="rtl">`),
  mirrors the sidebar, and switches to an Urdu-friendly font stack
- Switcher appears next to the theme toggle everywhere

### 4.4 Responsive & installable (web / Android / iOS)
- Desktop: navy sidebar + content grid
- Mobile: sticky header, slide-out drawer, 5-tab bottom navigation with
  safe-area insets (notch-friendly), 44px touch targets
- PWA: `manifest.json` + service worker + install prompt component —
  "Add to Home Screen" produces an app-like experience on Android/iOS

---

## 5. Getting Started

### 5.1 Prerequisites
- Node.js 18+
- (Optional) keys in `server/.env` for full functionality — see 5.3

### 5.2 Run locally

```powershell
# Terminal 1 — backend (port 5000)
cd server
npm install
npm start

# Terminal 2 — frontend (port 5173)
cd client
npm install
npm run dev
```

Open http://localhost:5173

### 5.3 Environment variables (`server/.env`)

| Variable | Purpose | Behaviour when empty |
|---|---|---|
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | Token signing | Required — set long random strings |
| `GOOGLE_CLIENT_ID` / `FIREBASE_PROJECT_ID` | Real Google sign-in | Demo-mode Google login |
| `DASHSCOPE_API_KEY`, `QWEN_*` | AI: extraction, weather, assistant | Rule-based fallbacks |
| `SMTP_HOST/PORT/USER/PASS/FROM` | Email OTP delivery | OTP echoed in dev console/response |
| `OSS_*` | Alibaba Cloud object storage | Files stored in `server/uploads/` |
| `GOOGLE_MAPS_API_KEY` | Weather radar geocoding | Map uses raw coordinates |
| `FRONTEND_URL` | CORS allow-list | Must match client origin (`http://localhost:5173`) |

> Full annotated template: `server/.env.example`

### 5.4 Demo accounts

| Role | Email | Password |
|---|---|---|
| Citizen | `citizen@ciro.demo` | `Ciro@1234` |
| Responder | `operator@ciro.demo` | `Ciro@1234` |
| Admin | `admin@ciro.demo` | `Ciro@1234` |

---

## 6. Incident Lifecycle

```
REPORTED → TRIAGE → ASSIGNED → EN_ROUTE → ON_SCENE → CONTAINED → RESOLVED
                                                             └→ RESOLUTION_REVIEW → CLOSED
Any stage: DUPLICATE / FALSE_REPORT / CANCELLED (by reporter)
```

- Numbering: `INC-YYYYMMDD-####`
- Media: `incident_media` (photos from upload **or live camera**)
- Every transition is written to `incident_status_history` and audit logs
- Real-time: staff/admin see new reports instantly via WebSocket

---

## 7. Security

- JWT access (15 min) + rotating refresh tokens (7 d), httpOnly-style client storage
- Role-based access control middleware on every protected route
- Rate limiting on auth endpoints, session auto-lock, input validation (Joi-style validators)
- File uploads: type + size enforced (JPG/PNG/WEBP, ≤ 5 MB)
- Session revocation on logout; audit log of admin actions

---

## 8. Tech Stack Summary

| Area | Technology |
|---|---|
| Frontend | Vite, React 18, React Router, Tailwind CSS, Zustand, TanStack Query, Leaflet, lucide-react |
| Backend | Node.js, Express, better-sqlite3, WebSocket (`ws`), nodemailer |
| AI | Alibaba Cloud Model Studio — Qwen (`qwen-plus` text, `qwen-vl-plus` vision) via OpenAI-compatible API |
| Auth extras | Firebase Authentication (Google popup), SMTP OTP |
| Platform | PWA (manifest + service worker), responsive + RTL |

---

## 9. Useful Commands

```powershell
# Backend
cd server; npm start            # run API
cd server; node database/migrate.js   # apply migrations
cd server; node scripts/smoke-test.js # auth smoke test

# Frontend
cd client; npm run dev          # dev server (HMR)
cd client; npm run build        # production build → client/dist
cd client; npm run preview      # serve the production build
```

---

## 10. Roadmap Ideas

- Native apps: wrap the PWA with Capacitor (Android/iOS) for push notifications
- Postgres migration (schema is already Postgres-compatible)
- SMS reporting channel (Twilio) for feature-phone citizens
- More languages (Punjabi, Sindhi, Pashto) — add dictionaries to `src/i18n/`

---

*CIRO — built for the Alibaba Cloud Hackathon. Crisis intelligence for every citizen.*
