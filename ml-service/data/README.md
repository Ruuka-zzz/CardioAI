# Data

Source data for the baseline risk model. **Gitignored — do not commit.**

## What you need

`cardio_train.csv` — the **Cardiovascular Disease dataset**, 70,000 records.

    https://www.kaggle.com/datasets/sulianova/cardiovascular-disease-dataset

Download it, unzip it, and put `cardio_train.csv` in this folder.

A Kaggle account is required. Unlike the old UCI dataset there is no package
that fetches it for you — Kaggle needs a login, so this step is manual.

## Why this dataset and not UCI

The old UCI Heart Disease set needed an ECG, a stress test and a blood panel:
values a patient cannot self-report. Our baseline questionnaire asks what a
patient actually knows, so the training data has to be built from the same
kind of answers.

| | UCI (old) | Cardiovascular Disease (new) |
|---|---|---|
| Rows | 297 | **70,000** |
| Height / weight | — | ✓ |
| Blood pressure | systolic only | ✓ both |
| Smoking | — | ✓ |
| Alcohol | — | ✓ |
| Physical activity | — | ✓ |
| Needs an ECG | ✓ | — |
| Needs a stress test | ✓ | — |
| Needs a blood panel | ✓ | — |

## Expected columns

The file is **semicolon separated**. `preprocess.load_raw` will tell you if
it parsed as one column, which means the separator is wrong.

```
id;age;gender;height;weight;ap_hi;ap_lo;cholesterol;gluc;smoke;alco;active;cardio
```

`preprocess.normalise_columns` renames these to the names the API uses, so
nothing downstream has to remember that `ap_hi` means systolic.

### Three things about this file that will bite you

**Age is in days.** 19,468 means 53 years old. Left unconverted, the model
learns splits at "age > 19000" and every prediction from the API — which
sends years — lands in the same leaf. Handled in `normalise_columns`.

**Gender is 1 = women, 2 = men.** Not 0/1. Also handled there.

**Blood pressures include impossible values** — negatives, and readings in
the thousands. `clean()` drops rows outside plausible ranges and rows where
diastolic exceeds systolic. Expect to lose roughly 2% of the file.

## Columns we deliberately ignore

`cholesterol` and `gluc` are in the dataset as 1/2/3 bands. We do not use
them, and the questionnaire does not ask for them.

Most patients here have never had a lipid panel. A question whose common
answer is "don't know" adds noise rather than signal, and a self-reported
guess about cholesterol is worse than no value at all. Dropping them costs
some accuracy — `train.py` will show you how much — and buys a form people
can actually complete.

## What this dataset is and isn't

The target column, `cardio`, means **cardiovascular disease is present**, not
"will develop within N years". So the model detects; it does not forecast.

That is why the output is a band (low / medium / high) and not a percentage.
"You have a 62% chance" would read as a diagnosis, and this is not a
diagnostic tool. It is also why `train.py` derives the band boundaries from
the training distribution: low, medium and high mean "compared with everyone
else in the data", which is a claim the data supports.

The cohort is not Myanmar, and its calibration for a Myanmar population is
unknown. Say so wherever the number appears.

## Training

```bash
cd ml-service
python train.py
```

Writes `model/baseline_risk.joblib` and `model/metrics.json`. Both are
gitignored — the artifact is reproducible from this script, and a binary in
git is a merge conflict waiting to happen.

