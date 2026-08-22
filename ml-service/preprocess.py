"""Data cleaning and feature ordering.

Imported by BOTH train.py and predict.py. That is the point of this file: if
training and inference build their feature vectors differently, the model
silently produces nonsense, and nothing errors. One module, one definition.
"""

from __future__ import annotations

import pandas as pd

# Column order the model is trained on. Inference must match exactly.
FEATURE_ORDER = [
    "age", "sex", "cp", "trestbps", "chol", "fbs", "restecg",
    "thalach", "exang", "oldpeak", "slope", "ca", "thal",
]

TARGET = "target"

# The UCI dataset encodes missing values in `ca` and `thal` as 4 and 0.
# Left in place they look like valid categories and skew the model.
SENTINELS = {"ca": [4], "thal": [0]}


def load_raw(path: str) -> pd.DataFrame:
    """Read the UCI CSV. See data/README.md for where to get it."""
    df = pd.read_csv(path)

    missing = set(FEATURE_ORDER + [TARGET]) - set(df.columns)
    if missing:
        raise ValueError(
            f"CSV is missing expected columns: {sorted(missing)}. "
            "Check you downloaded the processed Cleveland dataset with headers."
        )
    return df


def clean(df: pd.DataFrame) -> pd.DataFrame:
    """Drop sentinel-coded missing values and any duplicate rows.

    Rows are dropped rather than imputed. The Cleveland set has ~300 rows and
    only a handful of sentinels; imputing a categorical like `thal` invents
    clinical facts, which is worse than a slightly smaller training set.
    """
    df = df.copy()

    for column, bad_values in SENTINELS.items():
        if column in df.columns:
            df = df[~df[column].isin(bad_values)]

    df = df.drop_duplicates()

    # Some versions of the dataset use 0-4 severity; the model predicts
    # presence/absence, so anything above 0 counts as disease present.
    if df[TARGET].max() > 1:
        df[TARGET] = (df[TARGET] > 0).astype(int)

    return df.reset_index(drop=True)


def to_feature_frame(payload: dict) -> pd.DataFrame:
    """Turn one API request into a single-row frame in FEATURE_ORDER.

    A DataFrame rather than a bare array so scikit-learn sees the same column
    names it was fitted with — otherwise it warns, and in newer versions
    raises.
    """
    missing = set(FEATURE_ORDER) - set(payload)
    if missing:
        raise ValueError(f"Missing features: {sorted(missing)}")

    return pd.DataFrame([[payload[name] for name in FEATURE_ORDER]],
                        columns=FEATURE_ORDER)


def split_xy(df: pd.DataFrame):
    return df[FEATURE_ORDER], df[TARGET]