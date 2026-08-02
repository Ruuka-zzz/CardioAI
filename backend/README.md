# Backend

Core API, authentication, and business logic. Handles role-based access (patient/doctor/admin), and orchestrates calls to `ml-service`, `prolog-engine`, `rag-chatbot`, and `notification-service`.

- `api/` — route handlers / controllers
- `models/` — database models (patients, doctors, appointments, medical records, check-ins)
- `services/` — business logic (consent handling, scheduling logic, service orchestration)

_Add setup/run instructions here once the backend framework is chosen (e.g. Node/Express, Django, FastAPI)._
