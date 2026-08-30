"""Inference: load the trained bundle once, serve probabilities, band them.

The bundle carries the pipeline, the feature order and the thresholds
together. Loading any one of them from somewhere else would let them drift
apart — a pipeline scored against the wrong thresholds still returns a
confident answer, and nothing errors.
"""

from __future__ import annotations

import logging
import os
from dataclasses import dataclass
from pathlib import Path

import joblib

from preprocess import build_features

log = logging.getLogger(__name__)

MODEL_PATH = Path(os.environ.get("MODEL_PATH", "model/baseline_risk.joblib"))


@dataclass(frozen=True)
class Prediction:
    risk_level: str
    score: float
    model_version: str


class ModelStore:
    """Loads the artifact once at startup and keeps it warm.

    Loading lazily per request would add latency to every onboarding, and
    hiding a missing artifact until the first patient submits their baseline
    is exactly the wrong moment to discover it.
    """

    _bundle = None

    @classmethod
    def load(cls) -> None:
        if not MODEL_PATH.exists():
            raise FileNotFoundError(
                f"No model at {MODEL_PATH}. Run `python train.py` first — see "
                "ml-service/README.md."
            )
        cls._bundle = joblib.load(MODEL_PATH)
        log.info(
            "Loaded %s from %s (bands: medium>=%.2f, high>=%.2f)",
            cls._bundle.get("model_version", "model"),
            MODEL_PATH,
            cls._bundle["thresholds"]["medium"],
            cls._bundle["thresholds"]["high"],
        )

    @classmethod
    def get(cls):
        if cls._bundle is None:
            cls.load()
        return cls._bundle

    @classmethod
    def is_ready(cls) -> bool:
        return cls._bundle is not None

    @classmethod
    def info(cls) -> dict:
        if cls._bundle is None:
            return {}
        return {
            "model_version": cls._bundle.get("model_version"),
            "thresholds": cls._bundle["thresholds"],
            "features": len(cls._bundle["feature_order"]),
        }


def band(score: float, thresholds: dict) -> str:
    if score >= thresholds["high"]:
        return "high"
    if score >= thresholds["medium"]:
        return "medium"
    return "low"


def predict(payload: dict) -> Prediction:
    """One baseline -> one risk band. Called once per patient, at onboarding."""
    bundle = ModelStore.get()

    features = build_features(payload)

    # Guard against a bundle whose feature order no longer matches the code.
    # Silent misalignment here is the worst failure mode in the service: every
    # prediction would be wrong and every one would look fine.
    if list(features.columns) != bundle["feature_order"]:
        raise RuntimeError(
            "Feature order does not match the trained model. Retrain with "
            "`python train.py` after changing preprocess.FEATURE_ORDER."
        )

    score = float(bundle["pipeline"].predict_proba(features)[0][1])

    return Prediction(
        risk_level=band(score, bundle["thresholds"]),
        score=round(score, 4),
        model_version=bundle.get("model_version", "unknown"),
    )