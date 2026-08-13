React 18 + Vite. Four role-scoped UIs against one backend API.
npm install
npm run dev        # http://localhost:3000
The dev server proxies /api to http://localhost:8000 (override with VITE_API_TARGET), so there is no CORS setup and no base URL hardcoded in the app. Port 3000 matches docker/docker-compose.yml.
Structure
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
Enums, MCQ options, and the triage rule labels live in ../shared/enums.js, imported via the @shared alias. shared/README.md requires one source of truth for these, so the frontend does not keep its own copy — when the backend is built it should read from the same file.