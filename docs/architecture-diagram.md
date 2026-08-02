# Architecture Diagram

Replace this with an actual diagram export (`.png`/`.svg`) once finalized. Use tools like [Excalidraw](https://excalidraw.com), draw.io, or Mermaid.

## Current text version (from project overview)

```
                         ┌─────────────────────┐
                         │      Frontend        │
                         │ (Patient / Doctor /   │
                         │  Admin / Visitor UI)  │
                         └──────────┬───────────┘
                                    │
                         ┌──────────▼───────────┐
                         │     Backend API       │
                         │  (Auth, Roles, Core    │
                         │   Business Logic)      │
                         └──────────┬───────────┘
              ┌─────────────────────┼─────────────────────┐
              │                     │                     │
   ┌──────────▼─────────┐ ┌─────────▼─────────┐ ┌─────────▼─────────┐
   │   ML Service         │ │  Prolog Engine     │ │  RAG Chatbot       │
   │ (UCI-trained model,  │ │ (daily triage,      │ │ (visitor FAQ +     │
   │  onboarding risk)    │ │  urgency routing)   │ │  heart education)  │
   └───────────────────────┘ └─────────────────────┘ └─────────────────────┘
              │                     │
   ┌──────────▼─────────────────────▼───────────┐
   │     Notification Service                      │
   │  (Web Push / SMS / Email — chosen by urgency)  │
   └─────────────────────────────────────────────┘
              │
   ┌──────────▼───────────┐
   │   Database             │
   │ (Patients, Doctors,     │
   │  Records, Appointments, │
   │  encrypted at rest)     │
   └─────────────────────────┘
```
