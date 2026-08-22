"""Train the baseline risk model.

    python train.py                          # uses data/heart.csv
    python train.py --data path/to/heart.csv

Writes a fitted pipeline to model/uci_heart_rf.joblib plus a metrics JSON
alongside it. Both are gitignored — the artifact is reproducible from this
script, and a binary in git is a merge conflict waiting to happen.

Run this once before starting the service. predict.py refuses to start
without the artifact rather than serving a fallback, because a made-up
baseline risk is worse than a clear error.
"""

from __future__ import annotations

import argparse
import json
from datetime import datetime
from pathlib import Path

import joblib
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score, classification_report, confusion_matrix, roc_auc_score,
)
from sklearn.model_selection import cross_val_score, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from preprocess import FEATURE_ORDER, clean, load_raw, split_xy

# cp, restecg, slope, ca, thal are categories despite being stored as numbers.
# Left as integers the model would read "thal=3" as greater than "thal=1",
# which is meaningless for a test-result category.
CATEGORICAL = ["cp", "restecg", "slope", "ca", "thal"]
NUMERIC = [c for c in FEATURE_ORDER if c not in CATEGORICAL]

DEFAULT_DATA = Path("data/heart.csv")
MODEL_PATH = Path("model/uci_heart_rf.joblib")
METRICS_PATH = Path("model/metrics.json")


def build_pipeline() -> Pipeline:
    preprocessor = ColumnTransformer([
        ("num", StandardScaler(), NUMERIC),
        ("cat", OneHotEncoder(handle_unknown="ignore"), CATEGORICAL),
    ])

    classifier = RandomForestClassifier(
        n_estimators=300,
        max_depth=6,          # shallow: ~300 rows overfits fast
        min_samples_leaf=5,
        class_weight="balanced",
        random_state=42,
    )

    return Pipeline([("prep", preprocessor), ("clf", classifier)])


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", default=str(DEFAULT_DATA))
    parser.add_argument("--test-size", type=float, default=0.2)
    args = parser.parse_args()

    data_path = Path(args.data)
    if not data_path.exists():
        raise SystemExit(
            f"No dataset at {data_path}. See ml-service/data/README.md for "
            "where to download the UCI Heart Disease CSV."
        )

    df = clean(load_raw(str(data_path)))
    X, y = split_xy(df)
    print(f"Training on {len(df)} rows ({y.sum()} positive, {len(y) - y.sum()} negative)")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=args.test_size, stratify=y, random_state=42
    )

    pipeline = build_pipeline()

    # Cross-validate before the final fit. With a dataset this small, a single
    # train/test split is noisy enough to be misleading on its own.
    cv_scores = cross_val_score(pipeline, X_train, y_train, cv=5, scoring="roc_auc")
    print(f"5-fold CV ROC-AUC: {cv_scores.mean():.3f} (+/- {cv_scores.std():.3f})")

    pipeline.fit(X_train, y_train)

    predictions = pipeline.predict(X_test)
    probabilities = pipeline.predict_proba(X_test)[:, 1]

    metrics = {
        "trained_at": datetime.utcnow().isoformat(),
        "rows_used": int(len(df)),
        "cv_roc_auc_mean": float(cv_scores.mean()),
        "cv_roc_auc_std": float(cv_scores.std()),
        "test_accuracy": float(accuracy_score(y_test, predictions)),
        "test_roc_auc": float(roc_auc_score(y_test, probabilities)),
        "confusion_matrix": confusion_matrix(y_test, predictions).tolist(),
        "feature_order": FEATURE_ORDER,
    }

    print("\n" + classification_report(y_test, predictions,
                                       target_names=["no disease", "disease"]))

    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(pipeline, MODEL_PATH)
    METRICS_PATH.write_text(json.dumps(metrics, indent=2))

    print(f"Saved model  -> {MODEL_PATH}")
    print(f"Saved metrics -> {METRICS_PATH}")
    print(
        "\nNote: this model estimates the presence of heart disease in the "
        "UCI cohort. It is a screening aid for onboarding, not a diagnosis, "
        "and the cohort is small, old, and not representative of your users."
    )


if __name__ == "__main__":
    main()