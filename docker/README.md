# Docker

Container definitions for running CardioAI's services together locally.

## Planned files
- `docker-compose.yml` — orchestrates backend, ml-service, prolog-engine, rag-chatbot, notification-service, and database together for local development
- `backend.Dockerfile`
- `ml-service.Dockerfile`
- `rag-chatbot.Dockerfile`
- `frontend.Dockerfile`

## Guidelines
- Each service should have its own Dockerfile living either here or alongside its source (`<service>/Dockerfile`) — pick one convention and stay consistent
- `docker-compose.yml` should reference `.env` files per service (never commit actual `.env` files — see root `.gitignore`)
- Add a `docker-compose.override.yml.example` for local-only overrides (e.g. exposing extra ports for debugging)
