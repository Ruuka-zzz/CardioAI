import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CHEST_PAIN_TYPE,
  DISCLAIMER,
  RESTING_ECG,
  ST_SLOPE,
  THALASSEMIA,
} from "@shared/enums";
import { api } from "../shared/api/client";
import Button from "../shared/components/Button";
import FormInput from "../shared/components/FormInput";

/**
 * Onboarding intake. Runs once and feeds the ML service, which returns the
 * baseline risk that every later check-in is compared against.
 *
 * Split into three short steps rather than one long form. These are clinical
 * values a patient has to copy off a test result, and a single wall of
 * thirteen inputs is where people give up.
 */

const STEPS = ["About you", "From your tests", "Heart activity"];

const EMPTY = {
  age: "",
  sex: "female",
  chest_pain_type: "3",
  resting_bp: "",
  cholesterol: "",
  fasting_bs_high: false,
  resting_ecg: "0",
  max_heart_rate: "",
  exercise_angina: false,
  oldpeak: "",
  st_slope: "1",
  major_vessels: "0",
  thalassemia: "0",
};

const REQUIRED_BY_STEP = [
  ["age"],
  ["resting_bp", "cholesterol"],
  ["max_heart_rate", "oldpeak"],
];

const NUMERIC = [
  "age", "chest_pain_type", "resting_bp", "cholesterol", "resting_ecg",
  "max_heart_rate", "oldpeak", "st_slope", "major_vessels", "thalassemia",
];

export default function PatientOnboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  const set = (field) => (value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setFormError("");
  };

  const validateStep = () => {
    const missing = {};
    REQUIRED_BY_STEP[step].forEach((field) => {
      if (String(form[field]).trim() === "") {
        missing[field] = "This value is needed to calculate your baseline.";
      }
    });
    setErrors(missing);
    return Object.keys(missing).length === 0;
  };

  const next = () => {
    if (validateStep()) setStep((s) => s + 1);
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!validateStep()) return;

    setBusy(true);
    try {
      const payload = { ...form };
      NUMERIC.forEach((field) => {
        payload[field] = Number(payload[field]);
      });
      setResult(await api.submitIntake(payload));
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (result) {
    return (
      <section>
        <p className="eyebrow">Step 3 of 3 · Done</p>
        <h1>Your baseline is set</h1>

        <div className="card">
          <p className="eyebrow">Baseline risk</p>
          <p
            className="band__value"
            style={{ color: `var(--${riskColour(result.baseline_risk)})` }}
          >
            {result.baseline_risk}
          </p>
          <p className="readout band__score">
            {Math.round((result.baseline_score ?? 0) * 100)} / 100
          </p>
        </div>

        <p>
          This runs once. From now on your daily check-in compares each day's
          symptoms against this baseline — you won't be asked for test results
          again unless you get new ones.
        </p>
        <p className="disclaimer">{result.disclaimer ?? DISCLAIMER}</p>

        <Button block onClick={() => navigate("/patient/check-in")}>
          Start my first check-in
        </Button>
      </section>
    );
  }

  return (
    <section>
      <p className="eyebrow">
        Step {step + 1} of {STEPS.length} · {STEPS[step]}
      </p>
      <h1>Tell us about your heart health</h1>

      {step === 0 && (
        <p className="lede">
          A few basics first. Nothing here is shared with any doctor until you
          choose to share it.
        </p>
      )}
      {step === 1 && (
        <p className="lede">
          These come from your most recent blood test and blood pressure
          reading. If you don't have them, ask your doctor before continuing.
        </p>
      )}
      {step === 2 && (
        <p className="lede">
          These come from an ECG or stress test. Leave the defaults if you
          haven't had one.
        </p>
      )}

      <form onSubmit={submit} noValidate>
        {step === 0 && (
          <>
            <FormInput
              label="Age"
              type="number"
              inputMode="numeric"
              min="1"
              max="120"
              value={form.age}
              onChange={set("age")}
              error={errors.age}
            />
            <FormInput
              label="Sex"
              options={[
                { value: "female", label: "Female" },
                { value: "male", label: "Male" },
              ]}
              value={form.sex}
              onChange={set("sex")}
            />
            <FormInput
              label="Chest pain you usually get"
              options={CHEST_PAIN_TYPE}
              value={form.chest_pain_type}
              onChange={set("chest_pain_type")}
            />
          </>
        )}

        {step === 1 && (
          <>
            <FormInput
              label="Resting blood pressure"
              hint="The upper number, in mm Hg."
              type="number"
              inputMode="numeric"
              value={form.resting_bp}
              onChange={set("resting_bp")}
              error={errors.resting_bp}
            />
            <FormInput
              label="Cholesterol"
              hint="Total cholesterol in mg/dl."
              type="number"
              inputMode="numeric"
              value={form.cholesterol}
              onChange={set("cholesterol")}
              error={errors.cholesterol}
            />
            <FormInput
              label="My fasting blood sugar is above 120 mg/dl"
              type="checkbox"
              value={form.fasting_bs_high}
              onChange={set("fasting_bs_high")}
            />
            <FormInput
              label="Resting ECG result"
              options={RESTING_ECG}
              value={form.resting_ecg}
              onChange={set("resting_ecg")}
            />
          </>
        )}

        {step === 2 && (
          <>
            <FormInput
              label="Highest heart rate recorded"
              hint="From a stress test, in beats per minute."
              type="number"
              inputMode="numeric"
              value={form.max_heart_rate}
              onChange={set("max_heart_rate")}
              error={errors.max_heart_rate}
            />
            <FormInput
              label="ST depression"
              hint="Listed as 'oldpeak' on a stress test report (0–10)."
              type="number"
              step="0.1"
              min="0"
              max="10"
              inputMode="decimal"
              value={form.oldpeak}
              onChange={set("oldpeak")}
              error={errors.oldpeak}
            />
            <FormInput
              label="ST slope"
              options={ST_SLOPE}
              value={form.st_slope}
              onChange={set("st_slope")}
            />
            <FormInput
              label="Major vessels seen on scan"
              options={[0, 1, 2, 3].map((n) => ({ value: n, label: String(n) }))}
              value={form.major_vessels}
              onChange={set("major_vessels")}
            />
            <FormInput
              label="Thalassemia test result"
              options={THALASSEMIA}
              value={form.thalassemia}
              onChange={set("thalassemia")}
            />
            <FormInput
              label="Exercise brings on my chest pain"
              type="checkbox"
              value={form.exercise_angina}
              onChange={set("exercise_angina")}
            />
          </>
        )}

        {formError && (
          <p className="alert" role="alert">
            {formError}
          </p>
        )}

        <div className="row">
          {step > 0 && (
            <Button variant="secondary" onClick={() => setStep((s) => s - 1)}>
              Back
            </Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button onClick={next}>Continue</Button>
          ) : (
            <Button type="submit" busy={busy} busyLabel="Calculating…">
              Calculate my baseline
            </Button>
          )}
        </div>
      </form>
    </section>
  );
}

function riskColour(level) {
  if (level === "high") return "bad";
  if (level === "medium") return "fair";
  return "good";
}
