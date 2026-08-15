# Frontend

React 18 + Vite. Four role-scoped UIs against one backend API.

```bash
npm install
npm run dev        # http://localhost:3000
```

The dev server proxies `/api` to `http://localhost:8000` (override with
`VITE_API_TARGET`), so there is no CORS setup and no base URL hardcoded in the
app. Port 3000 matches `docker/docker-compose.yml`.

## Structure

```
src/
├── main.jsx                    entry — router + auth provider
├── App.jsx                     all routes, role-guarded
├── shared/
│   ├── api/client.js           every backend call lives here
│   ├── auth/AuthContext.jsx    session + role
│   ├── components/             Button, FormInput, Login, Signup,
│   │                           AppShell, ProtectedRoute, StatusBand
│   └── styles/glibal.css       design tokens + base styles
├── patient/                    PatientDashboard, PatientOnboarding,
│                               DailyCheckIn, DoctorDirectory
├── doctor/pages/               DoctorDashboard
├── admin/pages/                AdminDashboard
└── vistor/                     VisitorLanding + VisitorChatbot
```

Enums, MCQ options, and the triage rule labels live in `../shared/enums.js`,
imported via the `@shared` alias. `shared/README.md` requires one source of
truth for these, so the frontend does not keep its own copy — when the backend
is built it should read from the same file.

### Two spellings kept as-is

`glibal.css` and `vistor/` are both misspelt in the committed structure. I kept
the paths exactly as they are rather than renaming underneath you. Both are
trivial to fix — `glibal.css` is referenced once (`main.jsx`), `vistor/` is
referenced in `App.jsx` and `VisitorChatbot`'s import — but it should be your
call, ideally as a standalone `refactor:` commit so it doesn't muddy a feature
diff.

## Design direction

A patient's paper logbook crossed with a monitor readout. Warm-neutral ground,
ink text, one deep teal for anything actionable. Red / amber / green appear
**only** as condition status, never as decoration, so colour means one thing
throughout. Numbers are set in mono with tabular figures — they are readouts,
and they shouldn't jitter as they change.

Navigation sits at the bottom of the screen. This is a phone-first product
used twice a day, often one-handed, sometimes by people whose grip isn't
steady.

The signature element is `StatusBand`: a trace whose amplitude follows the
score, with a marker positioned along a Good → Fair → Bad scale. The shape
carries the reading, so it survives being seen without colour, at a glance, or
by someone who doesn't read English comfortably.

## Backend contract

`src/shared/api/client.js` is the full list of endpoints the UI expects.
Anything not yet built will 404 — the pages degrade rather than crash, but the
flows won't work end to end until the backend lands.

| Flow | Endpoints |
|---|---|
| Auth | `POST /api/auth/signup`, `/auth/login`, `/auth/doctors/activate` |
| Onboarding | `POST /api/patients/me/intake` → baseline risk |
| Daily check-in | `POST /api/patients/me/checkins` → status, score, urgency, `fired_rules` |
| History | `GET /api/patients/me/checkins`, `/reminders` |
| Booking | `GET /api/doctors`, `/doctors/:id/availability`, `POST /api/appointments` |
| Consent | `GET/POST /api/consents`, `DELETE /api/consents/:doctorId` |
| Doctor | `GET /api/doctor/patients`, `/doctor/patients/:id/record`, `PATCH /api/doctor/appointments/:id` |
| Admin | `GET/POST /api/admin/doctors`, `DELETE /api/admin/doctors/:id`, `GET /api/admin/audit-log` |
| Chatbot | `POST /api/chat` |

Two response shapes the UI depends on:

- **Check-in** must return `fired_rules` as an array of rule atoms. Every atom
  needs a label in `shared/enums.js` or the patient sees the raw atom.
- **Record access** must return **403** when consent is missing. The doctor
  dashboard treats 403 as "not shared" and shows an explanation, not an error.

`ProtectedRoute` is routing convenience only. Every real authorisation
decision belongs on the backend — never move one into the client.

## Not built yet

- No tests. `frontend/tests/` is in the root README's tree but wasn't in the
  committed structure; add Vitest + Testing Library and wire it into
  `.github/workflows/ci.yml`, which is still a placeholder job.
- No web push registration. The service worker and VAPID subscription flow
  need building before `notification-service` has anywhere to push to.
- No i18n. Copy is hardcoded English throughout.