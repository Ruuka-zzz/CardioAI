"""Tests for preprocess.py.

No trained model needed. These cover the part that silently corrupts
predictions when it goes wrong — the conversions in normalise_columns are
the kind of bug that produces a plausible-looking model that is entirely
wrong.
"""

import pandas as pd
import pytest

from preprocess import (
    FEATURE_ORDER, TARGET, build_features, clean, normalise_columns, split_xy,
)


def raw_row(**overrides):
    """A row in the SOURCE dataset's shape, before normalisation."""
    base = {
        "id": 1,
        "age": 19468,          # days — about 53 years
        "gender": 2,           # 2 = men in this dataset
        "height": 168,
        "weight": 72.0,
        "ap_hi": 128,
        "ap_lo": 82,
        "cholesterol": 1,
        "gluc": 1,
        "smoke": 0,
        "alco": 0,
        "active": 1,
        TARGET: 0,
    }
    base.update(overrides)
    return base


def api_payload(**overrides):
    """A payload in the API's shape, as the backend sends it."""
    base = {
        "age": 53, "gender": 1,
        "height_cm": 168, "weight_kg": 72.0,
        "systolic_bp": 128, "diastolic_bp": 82,
        "smokes": 0, "drinks_alcohol": 0, "physically_active": 1,
    }
    base.update(overrides)
    return base


# ---------------------------------------------------------- normalisation

def test_age_converts_from_days_to_years():
    """The bug that would break everything silently: 19,468 days is 53 years,
    but an unconverted model learns splits at 'age > 19000' and every API
    prediction lands in the same leaf."""
    df = normalise_columns(pd.DataFrame([raw_row(age=19468)]))
    assert df["age"].iloc[0] == 53


def test_age_already_in_years_is_left_alone():
    df = normalise_columns(pd.DataFrame([raw_row(age=53)]))
    assert df["age"].iloc[0] == 53


def test_gender_converts_from_one_two_to_zero_one():
    """1 = women, 2 = men in the source. The API sends 0/1."""
    df = normalise_columns(pd.DataFrame([raw_row(gender=2), raw_row(gender=1)]))
    assert list(df["gender"]) == [1, 0]


def test_columns_are_renamed_to_api_names():
    df = normalise_columns(pd.DataFrame([raw_row()]))
    for name in ("systolic_bp", "diastolic_bp", "height_cm", "weight_kg",
                 "smokes", "drinks_alcohol", "physically_active"):
        assert name in df.columns
    assert "ap_hi" not in df.columns
    assert "id" not in df.columns


# ---------------------------------------------------------------- cleaning

def test_impossible_blood_pressure_is_dropped():
    df = normalise_columns(pd.DataFrame([
        raw_row(), raw_row(ap_hi=16020), raw_row(ap_hi=-150),
    ]))
    assert len(clean(df)) == 1


def test_transposed_blood_pressure_is_dropped():
    """Diastolic above systolic means the pair was entered the wrong way
    round, and we cannot know which reading was which."""
    df = normalise_columns(pd.DataFrame([raw_row(ap_hi=80, ap_lo=120)]))
    assert len(clean(df)) == 0


def test_implausible_height_and_weight_are_dropped():
    df = normalise_columns(pd.DataFrame([
        raw_row(), raw_row(height=55), raw_row(weight=400),
    ]))
    assert len(clean(df)) == 1


def test_duplicates_are_removed():
    df = normalise_columns(pd.DataFrame([raw_row(), raw_row(), raw_row(height=170)]))
    assert len(clean(df)) == 2


# --------------------------------------------------------------- features

def test_feature_order_is_stable():
    """Training and inference share this list. Reordering it invalidates
    every previously trained model, so the change must be deliberate."""
    assert FEATURE_ORDER == [
        "age", "gender", "height_cm", "weight_kg",
        "systolic_bp", "diastolic_bp",
        "bmi", "pulse_pressure",
        "smokes", "drinks_alcohol", "physically_active",
    ]


def test_bmi_is_computed():
    frame = build_features(api_payload(height_cm=170, weight_kg=72.25))
    assert frame["bmi"].iloc[0] == pytest.approx(25.0, abs=0.1)


def test_pulse_pressure_is_computed():
    frame = build_features(api_payload(systolic_bp=140, diastolic_bp=85))
    assert frame["pulse_pressure"].iloc[0] == 55


def test_dict_and_frame_produce_identical_features():
    """The whole reason build_features accepts both: if the training path and
    the inference path built features differently, the model would be wrong
    and nothing would error."""
    from_dict = build_features(api_payload())
    from_frame = build_features(pd.DataFrame([api_payload()]))
    assert list(from_dict.columns) == list(from_frame.columns)
    assert from_dict.iloc[0].tolist() == from_frame.iloc[0].tolist()


def test_missing_field_is_rejected():
    payload = api_payload()
    del payload["weight_kg"]
    with pytest.raises(ValueError, match="weight_kg"):
        build_features(payload)


def test_cholesterol_and_glucose_are_not_features():
    """Deliberately excluded — see data/README.md. If they reappear here,
    someone added them without updating the questionnaire."""
    assert "cholesterol" not in FEATURE_ORDER
    assert "gluc" not in FEATURE_ORDER


def test_split_xy_separates_target():
    df = clean(normalise_columns(pd.DataFrame([raw_row(), raw_row(height=170)])))
    X, y = split_xy(df)
    assert TARGET not in X.columns
    assert list(X.columns) == FEATURE_ORDER
    assert len(X) == len(y)