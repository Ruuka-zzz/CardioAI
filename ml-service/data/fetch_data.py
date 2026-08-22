"""Download the UCI Heart Disease (Cleveland) dataset and normalise it.

    python fetch_data.py

Writes data/heart.csv ready for train.py. Run once; the file is gitignored.

WHY THIS SCRIPT EXISTS
----------------------
The raw UCI data does NOT use the same encoding as CardioAI. Three columns
differ, and using the raw values would train a model on a different meaning of
each feature than the one the app sends at inference time. Nothing would
error — the predictions would just be quietly wrong, which is worse.

    column   UCI raw            CardioAI (shared/enums.js)
    ------   ---------------    --------------------------
    cp       1,2,3,4            0,1,2,3
    slope    1,2,3              0,1,2
    thal     3,6,7              1,2,3   (0 = not tested)
    num      0-4 severity       target: 0/1

If you instead download a Kaggle mirror that is already 0-indexed, skip this
script — but verify the encoding matches the table above before training.
"""

from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd

OUTPUT = Path(__file__).parent / "heart.csv"

COLUMNS = [
    "age", "sex", "cp", "trestbps", "chol", "fbs", "restecg",
    "thalach", "exang", "oldpeak", "slope", "ca", "thal", "num",
]

RAW_URL = (
    "https://archive.ics.uci.edu/ml/machine-learning-databases/"
    "heart-disease/processed.cleveland.data"
)

# UCI value -> CardioAI value. See shared/enums.js for the labels these map to.
CP_MAP = {1: 0, 2: 1, 3: 2, 4: 3}
SLOPE_MAP = {1: 0, 2: 1, 3: 2}
THAL_MAP = {3: 1, 6: 2, 7: 3}  # normal, fixed defect, reversible defect


def fetch() -> pd.DataFrame:
    """Prefer the official package; fall back to the raw URL."""
    try:
        from ucimlrepo import fetch_ucirepo
    except ImportError:
        print("ucimlrepo not installed, downloading the raw file instead.")
        print("For the maintained path: pip install ucimlrepo\n")
        return pd.read_csv(RAW_URL, names=COLUMNS, na_values=["?"])

    print("Fetching dataset 45 (Heart Disease) from the UCI repository...")
    dataset = fetch_ucirepo(id=45)
    df = pd.concat([dataset.data.features, dataset.data.targets], axis=1)
    df.columns = COLUMNS[: len(df.columns)]
    return df


def normalise(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    before = len(df)
    df = df.dropna(subset=COLUMNS)
    if before != len(df):
        print(f"Dropped {before - len(df)} rows with missing values.")

    df["cp"] = df["cp"].astype(int).map(CP_MAP)
    df["slope"] = df["slope"].astype(int).map(SLOPE_MAP)
    df["thal"] = df["thal"].astype(int).map(THAL_MAP)

    # Any value outside the maps above is unrecognised — better to lose the
    # row than to silently train on a category the app can never send.
    unmapped = df[["cp", "slope", "thal"]].isna().any(axis=1)
    if unmapped.any():
        print(f"Dropped {unmapped.sum()} rows with unrecognised category codes.")
        df = df[~unmapped]

    df["target"] = (df["num"].astype(int) > 0).astype(int)
    df = df.drop(columns=["num"])

    integer_columns = [c for c in df.columns if c != "oldpeak"]
    df[integer_columns] = df[integer_columns].astype(int)

    return df.reset_index(drop=True)


def verify(df: pd.DataFrame) -> None:
    """Fail loudly if anything is outside the range schemas.py accepts."""
    expected = {
        "sex": (0, 1), "cp": (0, 3), "fbs": (0, 1), "restecg": (0, 2),
        "exang": (0, 1), "slope": (0, 2), "ca": (0, 3), "thal": (0, 3),
        "target": (0, 1),
    }

    for column, (low, high) in expected.items():
        actual_low, actual_high = df[column].min(), df[column].max()
        if actual_low < low or actual_high > high:
            raise SystemExit(
                f"Column '{column}' has values {actual_low}-{actual_high}, "
                f"expected {low}-{high}. The source encoding has changed — "
                "check the mapping table in this file before training."
            )


def main() -> None:
    df = normalise(fetch())
    verify(df)

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(OUTPUT, index=False)

    positive = int(df["target"].sum())
    print(f"\nSaved {len(df)} rows to {OUTPUT}")
    print(f"  disease present: {positive}")
    print(f"  disease absent : {len(df) - positive}")
    print("\nNext: cd .. && python train.py")


if __name__ == "__main__":
    try:
        main()
    except Exception as err:  # noqa: BLE001
        print(f"\nFailed: {err}", file=sys.stderr)
        print(
            "\nIf the download failed, you can get the file manually from "
            "https://archive.ics.uci.edu/dataset/45/heart+disease and follow "
            "the mapping table at the top of this script.",
            file=sys.stderr,
        )
        raise SystemExit(1)