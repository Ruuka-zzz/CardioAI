# ML Service — Baseline Cardiovascular Risk

Trains and serves a model on the **UCI Heart Disease Dataset** to produce a baseline risk category (low/medium/high) from clinical intake data (age, cholesterol, blood pressure, resting ECG, max heart rate, fasting blood sugar, thalassemia, etc.).

Runs **once at onboarding** (and when new clinical data is available) — not on every daily check-in, since daily symptom answers don't contain the clinical values this model needs.

- `data/` — raw/processed UCI dataset (gitignored — do not commit raw data)
- `model/` — training scripts and serialized model artifacts (gitignored)

## Planned files
- `train.py` — model training script
- `preprocess.py` — data cleaning/feature engineering
- `predict.py` — inference endpoint logic
- `requirements.txt`
