# Shared

Code and definitions shared between frontend and backend (or across backend services) to avoid duplication and drift.

Examples of what belongs here:
- Condition status enum (`Good` / `Fair` / `Bad`)
- Risk level enum (`low` / `medium` / `high`)
- Urgency level enum (used by both prolog-engine output and notification-service routing)
- API request/response type definitions (if using TypeScript, shared interfaces; if Python, shared Pydantic schemas)
- Constants (e.g. MCQ option values used in both onboarding forms and backend validation)

## Guidelines
- Anything defined here should have exactly one source of truth — don't redefine the same enum separately in frontend and backend
- Keep this dependency-light so both frontend and backend can import it without pulling in unrelated packages
