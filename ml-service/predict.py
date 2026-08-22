"""Inference: load the trained pipeline once, serve probabilities, bucket them.

The thresholds below are a product decision, not a model output. They live
here so they can be tuned without retraining — and so it is obvious that
"high risk" is a label we chose, not something the model said.
"""

from __future__ import annotations

import logging
import os
from dataclasses import dataclass
from pathlib import Path

import joblib

from preprocess import to_feature_frame

log = logging.getLogger(__name__)

MODEL_PATH = Path(os.environ.get("MODEL_PATH", "model/uci_heart_rf.joblib"))

# Probability cut points. Deliberately asymmetric: the cost of telling a
# patient their baseline is low when it isn't is higher than the reverse, so
# the low band is kept narrow.
MEDIUM_THRESHOLD = 0.35
HIGH_THRESHOLD = 0.65


@dataclass(frozen=True)
class Prediction:
    risk_level: str
    score: float


class ModelStore:
    """Loads the artifact once at startup and keeps it warm.

    Loading lazily per-request would add ~200ms to every onboarding, and
    hiding a missing artifact until the first patient submits their intake is
    exactly the wrong time to find out.
    """

    _pipeline = None

    @classmethod
    def load(cls) -> None:
        if not MODEL_PATH.exists():
            raise FileNotFoundError(
                f"No model at {MODEL_PATH}. Run `python train.py` first — see "
                "ml-service/README.md."
            )
        cls._pipeline = joblib.load(MODEL_PATH)
        log.info("Loaded risk model from %s", MODEL_PATH)

    @classmethod
    def get(cls):
        if cls._pipeline is None:
            cls.load()
        return cls._pipeline

    @classmethod
    def is_ready(cls) -> bool:
        return cls._pipeline is not None


def bucket(score: float) -> str:
    if score >= HIGH_THRESHOLD:
        return "high"
    if score >= MEDIUM_THRESHOLD:
        return "medium"
    return "low"


def predict(payload: dict) -> Prediction:
    """One intake -> one baseline risk. Called once per patient, at onboarding."""
    pipeline = ModelStore.get()
    features = to_feature_frame(payload)
    score = float(pipeline.predict_proba(features)[0][1])
    return Prediction(risk_level=bucket(score), score=round(score, 4))