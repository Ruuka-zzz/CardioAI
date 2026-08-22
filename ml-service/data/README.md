# Data

Raw and processed UCI Heart Disease data. **Gitignored — do not commit.**

## Getting the dataset

Download the processed Cleveland dataset and save it here as `heart.csv`.

Two common sources:

- **UCI ML Repository** — https://archive.ics.uci.edu/dataset/45/heart+disease
  Use `processed.cleveland.data`. It ships **without a header row**, so add
  one (see the column list below) before training.
- **Kaggle mirrors** — usually already have headers and a binary `target`
  column, which is less work.

## Expected columns

`train.py` will refuse to run if any are missing:

```
age, sex, cp, trestbps, chol, fbs, restecg,
thalach, exang, oldpeak, slope, ca, thal, target
```

| Column | Meaning |
|---|---|
| `age` | Years |
| `sex` | 1 = male, 0 = female |
| `cp` | Chest pain type, 0–3 |
| `trestbps` | Resting blood pressure (mm Hg) |
| `chol` | Serum cholesterol (mg/dl) |
| `fbs` | Fasting blood sugar > 120 mg/dl (1/0) |
| `restecg` | Resting ECG result, 0–2 |
| `thalach` | Maximum heart rate achieved |
| `exang` | Exercise-induced angina (1/0) |
| `oldpeak` | ST depression induced by exercise |
| `slope` | Slope of peak exercise ST segment, 0–2 |
| `ca` | Major vessels coloured by fluoroscopy, 0–3 |
| `thal` | Thalassemia test result, 0–3 |
| `target` | Disease present (1/0, or 0–4 severity) |

`preprocess.clean()` handles the 0–4 severity variant by treating anything
above 0 as disease present, and drops the sentinel values (`ca = 4`,
`thal = 0`) that encode "missing" in the original data.

## What this dataset is and isn't

303 patients, collected in Cleveland in 1988. Predominantly one hospital, one
region, one era. It is fine for a baseline screening signal at onboarding, and
it is the dataset the project brief specifies — but a model trained on it
should not be presented to patients as a clinical assessment, and its accuracy
on a Myanmar patient population in 2026 is genuinely unknown.

That framing matters for the product too: `predict.py` returns a
low/medium/high band rather than a precise percentage, because the underlying
data doesn't support more precision than that.