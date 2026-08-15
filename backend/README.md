# Backend

Core API, authentication, and business logic. Handles role-based access
(patient/doctor/admin), and orchestrates calls to `ml-service`,
`prolog-engine`, `rag-chatbot`, and `notification-service`.

**Stack:** FastAPI + SQLAlchemy + Postgres, Alembic for migrations.

## Run

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # macOS / Linux

pip install -r requirements.txt
cp ../.env.example .env         # then fill in SECRET_KEY

alembic revision --autogenerate -m "create core tables"
alembic upgrade head

uvicorn main:app --reload --port 8000
```

Interactive API docs at http://localhost:8000/docs.

`SECRET_KEY` has no default — the app refuses to start without it. That's
deliberate: a JWT signing key that falls back to a placeholder is how a dev
secret reaches production.

## Layout

```
backend/
├── main.py              app + router wiring
├── config.py            all env reading happens here, nowhere else
├── schemas.py           Pydantic request/response contracts
├── api/                 route handlers
│   ├── deps.py          auth + role dependencies
│   ├── auth.py          signup, login, doctor activation
│   ├── patients.py      intake, daily check-in, history, reminders
│   ├── doctors.py       directory, booking, consent, record access
│   ├── admin.py         activation codes, audit log
│   └── chatbot.py       thin proxy to rag-chatbot
├── models/              SQLAlchemy tables
├── services/            business logic
│   ├── security.py      hashing + JWT
│   ├── consent.py       the record access gate
│   ├── scheduling.py    rule-based slot matching
│   └── clients.py       HTTP calls to the four sibling services
├── database/
│   ├── session.py
│   └── migrations/      Alembic
└── tests/
```

## Two things worth understanding before changing anything

**Consent is one function.** Everything that reads a medical record goes
through `services/consent.py:require_consent()`. Nothing else queries
`ConsentRecord` directly — one function means one place to audit when someone
asks whether a doctor can see a patient's history. It raises **403, not 404**:
404 would leak whether the patient exists, and the frontend routes on 403 to
show "not shared" rather than an error.

Role alone never grants record access. `require_doctor` gets a caller to the
route; consent gets them past it.

**Service failures are handled differently on purpose** — see the docstring in
`services/clients.py`. ml-service and prolog-engine failures raise 503, because
a wrong baseline or an invented condition status is worse than an error
message. notification-service failures are swallowed, because the patient
already saw their result on screen and a failed push shouldn't lose a saved
check-in.

## Tests

```bash
pytest
```

Runs against in-memory SQLite, so no database is needed. The trade-off is that
SQLite won't catch Postgres-specific behaviour around JSON columns and
constraints — check those against the real database before a release.

`tests/services/test_consent.py` is the most important file here. Everything
else failing is a bug; that failing is a privacy breach.

## Not built yet

- **No lab-update endpoint.** `submit_intake` refuses a second submission and
  points at a separate route for new clinical results, but that route doesn't
  exist. `docs/PROJECT_OVERVIEW.md` never says who uploads lab data — patient,
  doctor, or admin. Decide that before building it.
- **No missed-check-in detection.** `/reminders` computes today's nudges on
  read. Nothing notices a patient who stopped logging entirely, which for a
  monitoring product is a signal worth acting on.
- **No rate limiting** on `/api/auth/login` or `/api/chat`.
- **No refresh tokens.** A 12-hour JWT expires and the user signs in again.
- **Encryption at rest** is assumed to be handled at the database layer.
  `docs/PROJECT_OVERVIEW.md` calls for it; nothing in application code
  implements column-level encryption.
- **`tests/api/`** is empty. The route-level tests (403 on unshared record,
  409 on duplicate check-in) still need writing.