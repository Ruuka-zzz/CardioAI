"""prolog-engine HTTP interface.

    uvicorn main:app --reload --port 8002

Contract is fixed by backend/services/clients.py:run_triage — POST /triage
takes symptoms, trigger, vitals, medication, baseline and history, and
returns status, urgency, recommendation, fired_rules, score, nyha_class.
"""

import logging
from typing import Literal

from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel, Field

import engine

logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

app = FastAPI(title="CardioAI Prolog Engine", version="0.2.0")

_ready = False


class Symptoms(BaseModel):
    """All six always sent, including the false ones — the rules use \\+ and
    findall over symptom/2, so a missing key changes the meaning of a query."""

    chest_pain: bool = False
    breathlessness: bool = False
    breathlessness_trigger: Literal["none", "stairs", "walking", "at_rest"] = "none"
    dizziness: bool = False
    fatigue: bool = False
    palpitations: bool = False
    swelling: bool = False


class Vitals(BaseModel):
    """All optional. Not every patient owns a monitor, and a missing reading
    must never be filled in with a default — a rule firing on an invented
    number is worse than a rule that doesn't fire."""

    systolic_bp: int | None = Field(default=None, ge=40, le=300)
    diastolic_bp: int | None = Field(default=None, ge=20, le=200)
    heart_rate: int | None = Field(default=None, ge=20, le=250)
    temperature_c: float | None = Field(default=None, ge=25, le=45)


class Medication(BaseModel):
    taken: bool = True
    missed: bool = False
    extra: bool = False


class History(BaseModel):
    """Diagnosed conditions from the baseline. Only the true ones become
    Prolog facts — absence means no diagnosis."""

    hypertension: bool = False
    diabetes: bool = False
    ischemic_heart_disease: bool = False
    heart_failure: bool = False
    heart_attack: bool = False
    stroke: bool = False
    valve_disease: bool = False


class TriageRequest(BaseModel):
    symptoms: Symptoms
    worse_than_usual: bool = False
    vitals: Vitals = Vitals()
    medication: Medication = Medication()
    baseline_risk: Literal["low", "medium", "high"]
    history: History = History()


class TriageResponse(BaseModel):
    status: Literal["good", "fair", "bad"]
    urgency: Literal["routine", "elevated", "emergency"]
    recommendation: str
    fired_rules: list[str]
    score: float
    # NYHA functional class, or null when no breathlessness was reported.
    nyha_class: int | None = None


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

    symptoms = body.symptoms.model_dump()
    trigger = symptoms.pop("breathlessness_trigger")

    try:
        result = engine.run_triage(
            symptoms=symptoms,
            breathlessness_trigger=trigger,
            worse_than_usual=body.worse_than_usual,
            vitals=body.vitals.model_dump(),
            medication=body.medication.model_dump(),
            baseline=body.baseline_risk,
            history=body.history.model_dump(),
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
        nyha_class=result.nyha_class,
    )