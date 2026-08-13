"""Clients for the four sibling services.

ml-service (8001), prolog-engine (8002), rag-chatbot (8003), and
notification-service (8004) are separate containers. This module is the only
place that knows their URLs or payload shapes.

Failure policy differs per service, and the difference is deliberate:

  - ml-service down at onboarding  -> raise. A wrong baseline is worse than a
    delayed one, and the patient can retry the form.
  - prolog-engine down at check-in -> raise. Showing a made-up condition
    status would be actively dangerous.
  - notification-service down      -> log and continue. The patient already
    saw the result on screen; a failed push shouldn't lose their check-in.
  - rag-chatbot down               -> return a graceful message. It's a
    visitor asking a general question, not a patient in a clinical flow.
"""

from __future__ import annotations

import logging

import httpx
from fastapi import HTTPException, status

from config import get_settings
from models import DailyCheckIn, MedicalRecord, RiskLevel, Urgency

log = logging.getLogger(__name__)
settings = get_settings()

UNAVAILABLE = "That part of CardioAI is temporarily unavailable. Please try again shortly."


def _client() -> httpx.Client:
    return httpx.Client(timeout=settings.service_timeout_seconds)


# ---------------------------------------------------------------- ml-service

def assess_baseline_risk(record: MedicalRecord) -> dict:
    """POST /predict -> {"risk_level", "score"}. Runs at onboarding only."""
    payload = {
        "age": record.age,
        "sex": 1 if record.sex == "male" else 0,
        "cp": record.chest_pain_type,
        "trestbps": record.resting_bp,
        "chol": record.cholesterol,
        "fbs": int(record.fasting_bs_high),
        "restecg": record.resting_ecg,
        "thalach": record.max_heart_rate,
        "exang": int(record.exercise_angina),
        "oldpeak": record.oldpeak,
        "slope": record.st_slope,
        "ca": record.major_vessels,
        "thal": record.thalassemia,
    }

    try:
        with _client() as client:
            res = client.post(f"{settings.ml_service_url}/predict", json=payload)
            res.raise_for_status()
            data = res.json()
    except httpx.HTTPError:
        log.exception("ml-service unreachable")
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, UNAVAILABLE)

    return {
        "risk_level": RiskLevel(data["risk_level"]),
        "score": float(data["score"]),
    }


# ------------------------------------------------------------- prolog-engine

def run_triage(checkin: DailyCheckIn, baseline: RiskLevel) -> dict:
    """POST /triage -> status, urgency, recommendation, fired_rules, score.

    fired_rules is the reason triage is rule-based rather than a model: the
    patient is shown exactly which rules produced their result. If it comes
    back empty, that's a bug in the rulebase, not a valid answer.
    """
    payload = {
        "symptoms": {
            "chest_pain": checkin.chest_pain,
            "breathlessness": checkin.breathlessness,
            "fatigue": checkin.fatigue,
            "swelling": checkin.swelling,
            "dizziness": checkin.dizziness,
        },
        "medication_taken": checkin.medication_taken,
        "baseline_risk": baseline.value,
    }

    try:
        with _client() as client:
            res = client.post(f"{settings.prolog_engine_url}/triage", json=payload)
            res.raise_for_status()
            data = res.json()
    except httpx.HTTPError:
        log.exception("prolog-engine unreachable")
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, UNAVAILABLE)

    if not data.get("fired_rules"):
        log.error("prolog-engine returned no fired rules for payload %s", payload)

    return data


# --------------------------------------------------------------- rag-chatbot

def ask_chatbot(question: str) -> dict:
    """POST /ask. The intent gate runs inside rag-chatbot, before retrieval,
    so emergency questions never reach the LLM."""
    try:
        with _client() as client:
            res = client.post(
                f"{settings.rag_chatbot_url}/ask", json={"question": question}
            )
            res.raise_for_status()
            return res.json()
    except httpx.HTTPError:
        log.exception("rag-chatbot unreachable")
        return {
            "answer": (
                "The assistant is temporarily unavailable. If this is urgent, "
                "please contact a doctor or your local emergency service."
            ),
            "sources": [],
            "redirected": False,
            "intent": "faq",
        }


# ------------------------------------------------- notification-service

def notify(patient_id: str, urgency: Urgency, body: str) -> None:
    """POST /dispatch. Channel selection lives in notification-service —
    the backend sends urgency and lets that service decide push vs SMS."""
    try:
        with _client() as client:
            res = client.post(
                f"{settings.notification_service_url}/dispatch",
                json={
                    "patient_id": patient_id,
                    "urgency": urgency.value,
                    "body": body,
                },
            )
            res.raise_for_status()
    except httpx.HTTPError:
        # Swallowed on purpose — see the failure policy in the module docstring.
        log.exception("notification-service unreachable for patient %s", patient_id)