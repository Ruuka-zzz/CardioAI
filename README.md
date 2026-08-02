# CardioAI

CardioAI is an AI-powered personal assistant for patients with heart-related conditions. It combines daily self-monitoring, AI-driven risk assessment, and direct doctor connection in a single platform. The project starts with a single heart condition and is designed to expand to more heart-related (and eventually other) diseases over time.

---

## User Roles

- **Patient** — onboarding (medical/family history), daily symptom check-ins, condition reports, medication/appointment reminders, doctor discovery & booking
- **Doctor** — collaborator-only accounts activated via identification code, views patient records only after patient consent
- **Admin** — manages doctor accounts and platform oversight
- **Visitor** — explores the platform and chats with a general heart-health education chatbot (no login required)

See [`docs/PROJECT_OVERVIEW.md`](docs/PROJECT_OVERVIEW.md) for the full breakdown of features, architecture, and reasoning behind each design decision.

---

## Tech & AI Components

| Component | Purpose |
|---|---|
| **ML Model** (UCI Heart Disease Dataset) | Baseline cardiovascular risk score at onboarding |
| **Prolog Rule Engine** | Daily symptom triage, condition status, urgency routing |
| **RAG Chatbot** | Visitor-facing general heart-health education, grounded in trusted sources (CDC, AHA, WHO, MedlinePlus) |
| **Web Push / SMS / Email** | Medication & appointment reminders, urgency-based channel selection |
| **Rule-based Scheduling** | Doctor–patient appointment matching |

---

## Folder Structure

```
CardioAI/
├── frontend/                  # UI for each role
│   ├── patient/
│   ├── doctor/
│   ├── admin/
│   ├── visitor/
│   └── tests/
├── backend/                   # Core API, auth, business logic
│   ├── api/
│   ├── models/
│   ├── services/
│   ├── database/
│   │   └── migrations/
│   └── tests/
├── ml-service/                 # UCI-trained risk model
│   ├── data/
│   ├── model/
│   └── tests/
├── prolog-engine/              # Daily triage rule base
│   └── tests/
├── rag-chatbot/                # Visitor chatbot + knowledge base
│   ├── knowledge_base/
│   └── tests/
├── notification-service/       # Web Push / SMS / Email dispatch
│   └── tests/
├── shared/                     # Shared enums/types/constants (frontend + backend)
├── scripts/                    # Setup, seeding, ingestion, deployment scripts
├── docker/                     # docker-compose.yml + service Dockerfiles
├── docs/                       # Architecture, API spec, DB schema, overview
├── .env.example                # Template for required environment variables
├── LICENSE
└── .github/
    ├── workflows/               # CI/CD pipelines
    └── PULL_REQUEST_TEMPLATE.md
```

---

## Getting Started

> Setup instructions will be filled in as each service is scaffolded (frontend, backend, ml-service, etc.). Update this section once the first working version of each module is in place.

```bash
git clone https://github.com/<your-org>/CardioAI.git
cd CardioAI
```

---

## Branching & Workflow

We use a **feature-branch + pull request** workflow. `main` is always kept stable — no direct pushes.

```
main
└── feature/<module>-<short-description>
```

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for full contribution guidelines, branch naming, and commit conventions.

---

## Disclaimer

CardioAI provides general health monitoring support and educational information. It is **not a diagnostic tool** and does not replace professional medical advice. Users experiencing a medical emergency should contact emergency services immediately.
