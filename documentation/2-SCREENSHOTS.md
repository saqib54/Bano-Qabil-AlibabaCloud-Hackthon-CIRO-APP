# CIRO — Screenshots Gallery

> Live captures from the running application (web portal).
> All screens below are from the **production build** running against the live API.

---

## 🔐 Authentication

### Login Screen
Three ways in: email + password, Google, or email OTP — in Urdu, English or Roman Urdu.

![Login](screenshots/01-login.png)

---

## 👤 Citizen Portal

### Dashboard
Live alert ticker, nearby stats and quick actions.

![Citizen Dashboard](screenshots/02-citizen-dashboard.png)

### Report Emergency
The 60-second flow: category → voice/photo → GPS → submit into the AI pipeline.

![Report Emergency](screenshots/03-report-emergency.png)

### Safety Map
Severity-pulsed incident pins, shelters and locate-me.

![Safety Map](screenshots/04-safety-map.png)

### My Reports
Every report with its live status timeline.

![My Reports](screenshots/05-my-reports.png)

---

## 🎛️ Command Center (Admin)

### Admin Dashboard
City-wide KPIs for the command center.

![Admin Dashboard](screenshots/06-admin-dashboard.png)

### Incident Queue — AI Decision Center
Confidence-scored queue with one-click Approve & Dispatch.

![Incident Queue](screenshots/07-incident-queue.png)

---

## 🚑 Responder Portal (Staff)

### Staff Dashboard
Today's verified assignments with severity and context.

![Staff Dashboard](screenshots/08-staff-dashboard.png)

---

## 📱 Mobile App (Android APK)

The APK is a Capacitor 8 build of the same codebase — identical UI with native camera,
location, microphone permissions and **native Google sign-in**.

> APK: `client/android/app/build/outputs/apk/debug/app-debug.apk` (10.5 MB)

---

*To recapture: run `node server/server.js` + `cd client && npm run dev`, open http://localhost:5173*

| Demo account | Email | Password |
|--------------|-------|----------|
| Citizen | citizen@ciro.demo | Ciro@1234 |
| Responder | responder@ciro.demo | Ciro@1234 |
| Admin | msaqibali433@gmail.com | saqib@23 |
