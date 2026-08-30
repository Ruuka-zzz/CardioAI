"""Feature building and data cleaning.

Imported by BOTH train.py and predict.py. That is the point of this file: if
training and inference build their feature vectors differently, the model
silently produces nonsense and nothing errors.

WHY THE FEATURE SET CHANGED
The old UCI set needed an ECG, a stress test and a blood panel — values a
patient cannot self-report. The new baseline questionnaire collects things
they can: height, weight, blood pressure, smoking, alcohol, activity. So the
model is retrained on a dataset built from the same kind of answers.

WHAT IS DELIBERATELY NOT HERE
  - cholesterol and glucose. The source dataset has them as 1/2/3 bands, but
    a patient in Myanmar has usually never had a lipid panel, so most answers
    would be "don't know". A question most people can't answer adds noise,
    not signal.
  - family history, prior diagnoses, medication. No dataset we have contains
    them. They are established risk factors, so they go to the Prolog rules
    and reach the patient through `risk_factors` instead.
"""

from __future__ import annotations

import pandas as pd

# Column order the model is trained on. Inference must match exactly.
# The last two are engineered — see build_features.
FEATURE_ORDER = [
    "age", "gender", "height_cm", "weight_kg",
    "systolic_bp", "diastolic_bp",
    "bmi", "pulse_pressure",
    "smokes", "drinks_alcohol", "physically_active",
]

TARGET = "cardio"

# Plausible human ranges. The source dataset contains blood pressures like
# -150 and 16020 — data entry errors that would otherwise dominate the
# splits a tree model learns.
LIMITS = {
    "age": (18, 100),
    "height_cm": (120, 220),
    "weight_kg": (30, 200),
    "systolic_bp": (70, 250),
    "diastolic_bp": (40, 150),
}


def load_raw(path: str) -> pd.DataFrame:
    """Read the source CSV.

    The Kaggle file is SEMICOLON separated, which pandas will happily read as
    one giant column if you don't say so — a mistake that shows up much later
    as an unexplainable training failure.
    """
    df = pd.read_csv(path, sep=";")

    if len(df.columns) == 1:
        raise ValueError(
            "The CSV parsed as a single column. It is probably comma "
            "separated — change sep=';' in load_raw, or check you downloaded "
            "the right file."
        )
    return df


def normalise_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Rename the dataset's columns to the names the API uses.

    Doing this once, here, means nothing downstream has to remember that
    `ap_hi` means systolic — including whoever reads this in six months.
    """
    df = df.rename(columns={
        "ap_hi": "systolic_bp",
        "ap_lo": "diastolic_bp",
        "height": "height_cm",
        "weight": "weight_kg",
        "smoke": "smokes",
        "alco": "drinks_alcohol",
        "active": "physically_active",
    })

    # Age arrives in DAYS. Left unconverted the model would learn splits at
    # "age > 19000" and every prediction from the API — which sends years —
    # would land in the same leaf.
    if "age" in df and df["age"].max() > 200:
        df["age"] = (df["age"] / 365.25).round().astype(int)

    # gender is 1 = women, 2 = men in this dataset. The API sends 0/1.
    if "gender" in df and set(df["gender"].dropna().unique()) <= {1, 2}:
        df["gender"] = (df["gender"] == 2).astype(int)

    return df.drop(columns=[c for c in ("id",) if c in df.columns])


def clean(df: pd.DataFrame) -> pd.DataFrame:
    """Drop impossible rows and duplicates.

    Rows are dropped rather than clipped. Clipping a blood pressure of 16020
    to 250 invents a reading that was never taken; the row is simply bad data
    and there are 70,000 others.
    """
    before = len(df)

    for column, (low, high) in LIMITS.items():
        if column in df:
            df = df[df[column].between(low, high)]

    # Systolic must exceed diastolic. Thousands of rows in this dataset have
    # them transposed, and a swapped pair is not recoverable — we cannot know
    # which reading was which.
    if "systolic_bp" in df and "diastolic_bp" in df:
        df = df[df["systolic_bp"] > df["diastolic_bp"]]

    df = df.drop_duplicates()

    dropped = before - len(df)
    if dropped:
        print(f"Dropped {dropped} implausible or duplicate rows "
              f"({dropped / before:.1%} of the data)")

    return df.reset_index(drop=True)


def build_features(source) -> pd.DataFrame:
    """Turn raw values into the model's feature frame.

    Accepts a DataFrame (training) or a dict (one API request), so the two
    paths cannot diverge.

    A DataFrame is returned rather than a bare array so scikit-learn sees the
    same column names it was fitted with.
    """
    df = pd.DataFrame([source]) if isinstance(source, dict) else source.copy()

    required = {"height_cm", "weight_kg", "systolic_bp", "diastolic_bp"}
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f"Missing fields: {sorted(missing)}")

    # BMI. Tree models can in principle discover weight/height² on their own,
    # but only by spending splits on it. Handing it over directly is free.
    metres = df["height_cm"] / 100
    df["bmi"] = (df["weight_kg"] / (metres * metres)).round(1)

    # Pulse pressure. A widening gap between systolic and diastolic reflects
    # arterial stiffening and carries information neither number holds alone.
    df["pulse_pressure"] = df["systolic_bp"] - df["diastolic_bp"]

    absent = set(FEATURE_ORDER) - set(df.columns)
    if absent:
        raise ValueError(f"Missing features after engineering: {sorted(absent)}")

    return df[FEATURE_ORDER].astype(float)


def split_xy(df: pd.DataFrame):
    return build_features(df), df[TARGET]