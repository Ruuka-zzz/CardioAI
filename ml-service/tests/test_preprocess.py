"""Tests for preprocess.py.

No trained model needed — these cover the part that silently corrupts
predictions when it goes wrong.
"""

import pandas as pd
import pytest

from preprocess import FEATURE_ORDER, TARGET, clean, split_xy, to_feature_frame


def row(**overrides):
    base = {
        "age": 55, "sex": 1, "cp": 0, "trestbps": 130, "chol": 250,
        "fbs": 0, "restecg": 1, "thalach": 150, "exang": 0,
        "oldpeak": 1.2, "slope": 1, "ca": 0, "thal": 2, TARGET: 1,
    }
    base.update(overrides)
    return base


def test_feature_order_is_stable():
    """Training and inference share this list. Reordering it invalidates
    every previously trained model, so the change should be deliberate."""
    assert FEATURE_ORDER == [
        "age", "sex", "cp", "trestbps", "chol", "fbs", "restecg",
        "thalach", "exang", "oldpeak", "slope", "ca", "thal",
    ]


def test_clean_drops_sentinel_missing_values():
    df = pd.DataFrame([row(ca=0), row(ca=4), row(thal=0)])
    result = clean(df)

    assert len(result) == 1
    assert 4 not in result["ca"].values
    assert 0 not in result["thal"].values


def test_clean_removes_duplicates():
    df = pd.DataFrame([row(), row(), row(age=60)])
    assert len(clean(df)) == 2


def test_clean_binarises_multiclass_target():
    """Some copies of the dataset grade severity 0-4. The model predicts
    presence, so anything above zero is disease present."""
    df = pd.DataFrame([row(target=0), row(target=2, age=61), row(target=4, age=62)])
    result = clean(df)

    assert set(result[TARGET].unique()) <= {0, 1}
    assert result[TARGET].sum() == 2


def test_to_feature_frame_preserves_column_order():
    payload = {name: 1 for name in FEATURE_ORDER}
    frame = to_feature_frame(payload)

    assert list(frame.columns) == FEATURE_ORDER
    assert len(frame) == 1


def test_to_feature_frame_ignores_extra_keys():
    payload = {name: 1 for name in FEATURE_ORDER}
    payload["patient_id"] = "abc"

    assert list(to_feature_frame(payload).columns) == FEATURE_ORDER


def test_to_feature_frame_rejects_missing_features():
    payload = {name: 1 for name in FEATURE_ORDER}
    del payload["thal"]

    with pytest.raises(ValueError, match="thal"):
        to_feature_frame(payload)


def test_split_xy_separates_target():
    df = clean(pd.DataFrame([row(), row(age=60)]))
    X, y = split_xy(df)

    assert TARGET not in X.columns
    assert len(X) == len(y)