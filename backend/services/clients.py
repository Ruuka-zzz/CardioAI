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
from models import RiskLevel, Urgency

log = logging.getLogger(__name__)
settings = get_settings()

UNAVAILABLE = "That part of CardioAI is temporarily unavailable. Please try again shortly."


def _client() -> httpx.Client:
    return httpx.Client(timeout=settings.service_timeout_seconds)


# ---------------------------------------------------------------- ml-service

def assess_baseline_risk(age, sex, record, lifestyle) -> dict:
    """POST /predict -> {"risk_level", "score"}. Runs at onboarding only.

    The payload changed with the new questionnaire. The old UCI feature set
    needed an ECG, a stress test and a blood panel — values a patient cannot
    self-report — so the model is being retrained on a dataset built from
    things they can: age, sex, height, weight, blood pressure, smoking,
    alcohol and activity. See ml-service/README.md.

    Family history, prior diagnoses and medication are NOT sent. No dataset
    we have contains them, so inventing a column would mean feeding the model
    a feature it was never trained on. They go to the Prolog rules instead,
    and surface to the patient through `risk_factors`.
    """
    payload = {
        "age": age,
        "gender": 1 if sex == "male" else 0,
        "height_cm": record.height_cm,
        "weight_kg": record.weight_kg,
        "systolic_bp": record.systolic_bp,
        "diastolic_bp": record.diastolic_bp,
        "smokes": int(lifestyle.smokes_now),
        "drinks_alcohol": int(lifestyle.drinks_alcohol),
        "physically_active": int(lifestyle.physical_activity.value != "low"),
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

def _history_of(patient) -> dict:
    """Diagnosed conditions, as flags. Empty when the baseline is missing —
    the rules treat absence as "no diagnosis", which is the correct reading
    of a patient who hasn't told us otherwise."""
    record = patient.medical_record
    if record is None:
        return {}
    return {
        "hypertension": record.hypertension,
        "diabetes": record.diabetes,
        "ischemic_heart_disease": record.ischemic_heart_disease,
        "heart_failure": record.heart_failure,
        "heart_attack": record.heart_attack,
        "stroke": record.stroke,
        "valve_disease": record.valve_disease.value == "yes",
    }


def run_triage(checkin, patient) -> dict:
    """POST /triage -> status, urgency, recommendation, fired_rules, score.

    Symptoms are now booleans plus a breathlessness trigger, which is the NYHA
    class in plain language. Vitals are optional — not every patient owns a
    monitor — so the rulebase must cope with them being absent rather than
    assume a number.

    fired_rules is the reason triage is rule-based rather than a model: the
    patient is shown exactly which rules produced their result. An empty list
    is a bug in the rulebase, not a valid answer.
    """
    payload = {
        "symptoms": {
            "chest_pain": checkin.chest_pain,
            "breathlessness": checkin.breathlessness,
            "breathlessness_trigger": checkin.breathlessness_trigger.value,
            "dizziness": checkin.dizziness,
            "fatigue": checkin.fatigue,
            "palpitations": checkin.palpitations,
            "swelling": checkin.swelling,
        },
        "worse_than_usual": checkin.worse_than_usual,
        "vitals": {
            "systolic_bp": checkin.systolic_bp,
            "diastolic_bp": checkin.diastolic_bp,
            "heart_rate": checkin.heart_rate,
            "temperature_c": checkin.temperature_c,
        },
        "medication": {
            "taken": checkin.medication_taken,
            "missed": checkin.medication_missed,
            "extra": checkin.extra_medication,
        },
        "baseline_risk": patient.baseline_risk.value,
        # Diagnosed conditions change what a symptom means. Ankle swelling in
        # someone with heart failure is a different event from ankle swelling
        # in someone without, and the rules need to be able to tell.
        "history": _history_of(patient),
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