"""CardioAI backend entry point.

    uvicorn main:app --reload --port 8000

Route prefixes are all /api/*, matching the Vite dev proxy in
frontend/vite.config.js, so the frontend needs no base URL configuration.
"""

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api import admin, auth, chatbot, doctors, patients
from config import get_settings
from api import admin, auth, chatbot, doctors, patients, schedule
...

logging.basicConfig(level=logging.INFO)

settings = get_settings()

app = FastAPI(
    title="CardioAI API",
    version="0.1.0",
    description=(
        "Core API for CardioAI. Orchestrates ml-service, prolog-engine, "
        "rag-chatbot, and notification-service."
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(patients.router)
app.include_router(doctors.router)
app.include_router(admin.router)
app.include_router(chatbot.router)
app.include_router(schedule.router)


@app.get("/health", tags=["ops"])
def health():
    """Liveness only. Deliberately does not check the sibling services —
    docker-compose restarts on this, and a down chatbot shouldn't take the
    whole API with it."""
    return {"status": "ok"}