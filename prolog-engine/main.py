"""prolog-engine HTTP interface.

    uvicorn main:app --reload --port 8002

Contract is fixed by backend/services/clients.py:run_triage —
POST /triage takes {symptoms, medication_taken, baseline_risk} and returns
{status, urgency, recommendation, fired_rules, score}.
"""

import logging

from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel, Field
from typing import Literal

import engine

logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

app = FastAPI(title="CardioAI Prolog Engine", version="0.1.0")

_ready = False


class Symptoms(BaseModel):
    """All five are required, including zeros — see facts_template.pl."""

    chest_pain: int = Field(ge=0, le=3)
    breathlessness: int = Field(ge=0, le=3)
    fatigue: int = Field(ge=0, le=3)
    swelling: int = Field(ge=0, le=3)
    dizziness: int = Field(ge=0, le=3)


class TriageRequest(BaseModel):
    symptoms: Symptoms
    medication_taken: bool
    baseline_risk: Literal["low", "medium", "high"]


class TriageResponse(BaseModel):
    status: Literal["good", "fair", "bad"]
    urgency: Literal["routine", "elevated", "emergency"]
    recommendation: str
    fired_rules: list[str]
    score: float


@app.on_event("startup")
def verify_prolog() -> None:
    global _ready
    try:
        engine.check_available()
        _ready = True
        log.info("SWI-Prolog loaded, rulebase consulted")
    except engine.PrologUnavailable as err:
        log.error("%s", err)
        log.error("Service will start but /triage will return 503.")


@app.get("/health")
def health():
    return {"status": "ok" if _ready else "degraded", "prolog_loaded": _ready}


@app.post("/triage", response_model=TriageResponse)
def triage(body: TriageRequest):
    if not _ready:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "Prolog engine is not available. Check SWI-Prolog is installed.",
        )

    try:
        result = engine.run_triage(
            symptoms=body.symptoms.model_dump(),
            medication_taken=body.medication_taken,
            baseline=body.baseline_risk,
        )
    except engine.PrologUnavailable as err:
        log.exception("Triage failed")
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, str(err))

    return TriageResponse(
        status=result.status,
        urgency=result.urgency,
        recommendation=result.recommendation,
        fired_rules=result.fired_rules,
        score=result.score,
    )