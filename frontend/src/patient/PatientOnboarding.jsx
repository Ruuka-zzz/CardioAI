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
      if (err.message && err.message.includes("already complete")) {
        navigate("/patient/check-in");
      } else {
        setFormError(err.message);
      }
    } finally {
      setBusy(false);
    }
  };

  if (result) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.stepIndicator}>Step 3 of 3 · Done</div>
          <h1 style={styles.title}>Your baseline is set</h1>

          <div style={styles.resultCard}>
            <p style={styles.eyebrow}>Baseline risk</p>
            <p
              style={{
                ...styles.bandValue,
                color: `var(--${riskColour(result.baseline_risk)})`,
              }}
            >
              {result.baseline_risk}
            </p>
            <p style={styles.bandScore}>
              {Math.round((result.baseline_score ?? 0) * 100)} / 100
            </p>
          </div>

          <p style={styles.description}>
            This runs once. From now on your daily check-in compares each day's
            symptoms against this baseline — you won't be asked for test results
            again unless you get new ones.
          </p>
          <p style={styles.disclaimer}>{result.disclaimer ?? DISCLAIMER}</p>

          <div style={{ marginTop: "24px" }}>
            <Button block onClick={() => navigate("/patient/check-in")}>
              Start my first check-in
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Global override style injection to force inputs to be readable in dark mode */}
      {/* Global override style injection to force inputs to be readable */}
      <style>{`
        input, select, textarea {
          background-color: #ffffff !important;
          color: #0f172a !important;
          border-color: #334155 !important;
        }
        /* Checkbox နဲ့ Form အတွင်းရှိ စာသားများ အမြဲမြင်ရစေရန် */
        label, span, div {
          color: #f8fafc;
        }
        /* Checkbox label သီးသန့် အမည်းရောင်လိုချင်ရင် ဒါမှမဟုတ် container ပေါ်မူတည်ပြီး ပြင်လို့ရပါတယ် */
        input[type="checkbox"] + span, 
        input[type="checkbox"] ~ label {
          color: #f8fafc !important;
        }
        ::selection {
          background-color: #38bdf8 !important;
          color: #0f172a !important;
        }
        input::placeholder, select::placeholder, textarea::placeholder {
          color: #64748b !important;
        }
        input:-webkit-autofill,
        input:-webkit-autofill:hover, 
        input:-webkit-autofill:focus {
          -webkit-text-fill-color: #0f172a !important;
          -webkit-box-shadow: 0 0 0px 1000px #ffffff inset !important;
        }
      `}</style>
      
      <div style={styles.card}>
        <div style={styles.progressWrapper}>
          <div style={styles.stepIndicator}>
            Step {step + 1} of {STEPS.length} · {STEPS[step]}
          </div>
          <div style={styles.progressBarContainer}>
            <div
              style={{
                ...styles.progressBarFill,
                width: `${((step + 1) / STEPS.length) * 100}%`,
              }}
            />
          </div>
        </div>

        <h1 style={styles.title}>Tell us about your heart health</h1>

        {step === 0 && (
          <p style={styles.lede}>
            A few basics first. Nothing here is shared with any doctor until you
            choose to share it.
          </p>
        )}
        {step === 1 && (
          <p style={styles.lede}>
            These come from your most recent blood test and blood pressure
            reading. If you don't have them, ask your doctor before continuing.
          </p>
        )}
        {step === 2 && (
          <p style={styles.lede}>
            These come from an ECG or stress test. Leave the defaults if you
            haven't had one.
          </p>
        )}

        <form onSubmit={submit} noValidate style={styles.form}>
          <div style={styles.fieldsContainer}>
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
          </div>

          {formError && (
            <p className="alert" style={styles.alert} role="alert">
              {formError}
            </p>
          )}

          <div style={styles.row}>
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
      </div>
    </div>
  );
}

function riskColour(level) {
  if (level === "high") return "bad";
  if (level === "medium") return "fair";
  return "good";
}

const styles = {
  container: {
    minHeight: "85vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px 16px",
    backgroundColor: "#0f172a",
  },
  card: {
    width: "100%",
    maxWidth: "560px",
    background: "#1e293b",
    borderRadius: "20px",
    padding: "40px",
    boxShadow: "0 10px 30px rgba(0, 0, 0, 0.4)",
    border: "1px solid #334155",
    color: "#f8fafc",
  },
  progressWrapper: {
    marginBottom: "20px",
  },
  stepIndicator: {
    fontSize: "13px",
    fontWeight: "700",
    letterSpacing: "0.8px",
    textTransform: "uppercase",
    color: "#94a3b8",
    marginBottom: "8px",
  },
  progressBarContainer: {
    width: "100%",
    height: "6px",
    backgroundColor: "#334155",
    borderRadius: "3px",
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#38bdf8",
    transition: "width 0.3s ease",
  },
  title: {
    fontSize: "26px",
    fontWeight: "800",
    color: "#ffffff",
    marginBottom: "10px",
    letterSpacing: "-0.5px",
  },
  lede: {
    fontSize: "15px",
    color: "#94a3b8",
    lineHeight: "1.5",
    marginBottom: "24px",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
    color: "#f8fafc",
  },
  fieldsContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    color: "#f8fafc",
  },
  alert: {
    padding: "12px 16px",
    borderRadius: "8px",
    backgroundColor: "#7f1d1d",
    color: "#fecaca",
    fontSize: "14px",
    margin: "0",
    border: "1px solid #991b1b",
  },
  row: {
    display: "flex",
    gap: "12px",
    marginTop: "8px",
  },
  resultCard: {
    background: "#0f172a",
    padding: "24px",
    borderRadius: "14px",
    textAlign: "center",
    margin: "20px 0",
    border: "1px solid #334155",
  },
  eyebrow: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#94a3b8",
    textTransform: "uppercase",
    margin: "0 0 6px 0",
  },
  bandValue: {
    fontSize: "32px",
    fontWeight: "800",
    textTransform: "capitalize",
    margin: "0 0 4px 0",
  },
  bandScore: {
    fontSize: "16px",
    color: "#cbd5e1",
    margin: "0",
    fontWeight: "500",
  },
  description: {
    fontSize: "14px",
    color: "#94a3b8",
    lineHeight: "1.6",
    margin: "16px 0",
  },
  disclaimer: {
    fontSize: "12px",
    color: "#64748b",
    lineHeight: "1.5",
    fontStyle: "italic",
  },
};