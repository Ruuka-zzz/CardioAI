"""Train the baseline risk model.

    python train.py                       # uses data/cardio_train.csv
    python train.py --data path/to.csv

Writes a bundle to model/baseline_risk.joblib containing the fitted pipeline,
the feature order, and the risk thresholds. All three travel together on
purpose: a pipeline loaded next to the wrong feature order or the wrong
thresholds produces confident nonsense, and nothing errors.

WHY THIS MODEL
HistGradientBoostingClassifier. At 70,000 rows of mixed binary and continuous
features it beats a random forest on both accuracy and training time, and it
ships inside scikit-learn — no extra dependency for the team to install.

WHY THE THRESHOLDS ARE LEARNED, NOT FIXED
The source dataset is roughly balanced, so predicted probabilities cluster
near 0.5. Hard-coded cut points of 0.35 and 0.65 would put almost every
patient in "medium" and the band would tell them nothing. Instead the
tertiles of the training distribution become the cut points, so low, medium
and high each mean "compared with everyone else in the data".

That is a product decision about how to present risk, not a claim about
clinical severity — and it is why the bands are words rather than a
percentage. The dataset's target is "does this person have cardiovascular
disease", not "will they develop it", so a percentage here would read as a
diagnosis. It isn't one.
"""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.metrics import (
    accuracy_score, classification_report, confusion_matrix, roc_auc_score,
)
from sklearn.model_selection import cross_val_score, train_test_split

from preprocess import (
    FEATURE_ORDER, TARGET, clean, load_raw, normalise_columns, split_xy,
)

DEFAULT_DATA = Path("data/cardio_train.csv")
MODEL_PATH = Path("model/baseline_risk.joblib")
METRICS_PATH = Path("model/metrics.json")

MODEL_VERSION = "cardio_hgb_v1"


def build_model() -> HistGradientBoostingClassifier:
    return HistGradientBoostingClassifier(
        max_iter=300,
        learning_rate=0.08,
        max_depth=6,
        min_samples_leaf=40,      # 70k rows — keeps leaves meaningful
        l2_regularization=1.0,
        early_stopping=True,
        validation_fraction=0.1,
        random_state=42,
    )


def learn_thresholds(probabilities: np.ndarray) -> dict[str, float]:
    """Tertiles of the training distribution become the band boundaries.

    Rounded to two decimals so the saved numbers are readable in metrics.json
    — the rounding is cosmetic and shifts nobody's band in practice.
    """
    medium, high = np.percentile(probabilities, [33.3, 66.7])
    return {"medium": round(float(medium), 2), "high": round(float(high), 2)}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", default=str(DEFAULT_DATA))
    parser.add_argument("--test-size", type=float, default=0.2)
    args = parser.parse_args()

    data_path = Path(args.data)
    if not data_path.exists():
        raise SystemExit(
            f"No dataset at {data_path}. See ml-service/data/README.md for "
            "where to download it."
        )

    print(f"Reading {data_path}...")
    df = clean(normalise_columns(load_raw(str(data_path))))

    if TARGET not in df.columns:
        raise SystemExit(
            f"No '{TARGET}' column. Check you downloaded the right file — "
            "see data/README.md for the expected columns."
        )

    X, y = split_xy(df)
    positive = int(y.sum())
    print(f"Training on {len(df)} rows ({positive} positive, "
          f"{len(y) - positive} negative)")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=args.test_size, stratify=y, random_state=42
    )

    model = build_model()

    # Cross-validate before the final fit. A single split on 70k rows is less
    # noisy than on 300, but a fold-to-fold spread still tells you whether the
    # headline number is stable.
    cv_scores = cross_val_score(model, X_train, y_train, cv=5, scoring="roc_auc")
    print(f"5-fold CV ROC-AUC: {cv_scores.mean():.3f} "
          f"(+/- {cv_scores.std():.3f})")

    model.fit(X_train, y_train)

    predictions = model.predict(X_test)
    probabilities = model.predict_proba(X_test)[:, 1]

    # Thresholds come from the TRAINING split only. Deriving them from the
    # test set would leak information the model isn't supposed to have seen.
    train_probabilities = model.predict_proba(X_train)[:, 1]
    thresholds = learn_thresholds(train_probabilities)

    print("\n" + classification_report(
        y_test, predictions, target_names=["no disease", "disease"]
    ))
    print(f"Risk bands: low < {thresholds['medium']} "
          f"<= medium < {thresholds['high']} <= high")

    metrics = {
        "model_version": MODEL_VERSION,
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "rows_used": int(len(df)),
        "cv_roc_auc_mean": float(cv_scores.mean()),
        "cv_roc_auc_std": float(cv_scores.std()),
        "test_accuracy": float(accuracy_score(y_test, predictions)),
        "test_roc_auc": float(roc_auc_score(y_test, probabilities)),
        "confusion_matrix": confusion_matrix(y_test, predictions).tolist(),
        "feature_order": FEATURE_ORDER,
        "thresholds": thresholds,
    }

    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(
        {
            "pipeline": model,
            "feature_order": FEATURE_ORDER,
            "thresholds": thresholds,
            "model_version": MODEL_VERSION,
        },
        MODEL_PATH,
    )
    METRICS_PATH.write_text(json.dumps(metrics, indent=2))

    print(f"\nSaved model   -> {MODEL_PATH}")
    print(f"Saved metrics -> {METRICS_PATH}")
    print(
        "\nNote: this model estimates whether cardiovascular disease is "
        "PRESENT in the source cohort — it is not a forecast, and it is not a "
        "diagnosis. The cohort is not Myanmar, so its calibration here is "
        "unknown. Say so wherever the number is shown."
    )


if __name__ == "__main__":
    main()