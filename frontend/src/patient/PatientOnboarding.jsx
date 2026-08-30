import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ACTIVITY_LEVEL,
  BASELINE_NOTE,
  DISCLAIMER,
  FAMILY_HISTORY_QUESTIONS,
  LIFESTYLE_QUESTIONS,
  MEDICAL_CONDITIONS,
  MEDICATION_QUESTIONS,
  OCCUPATION_ACTIVITY,
  PERSONAL_FIELDS,
  TRISTATE,
  VALVE_DISEASE_QUESTION,
} from "@shared/enums";
import { api } from "../shared/api/client";
import Button from "../shared/components/Button";
import FormInput from "../shared/components/FormInput";

/**
 * Baseline questionnaire — five steps, four clinical categories.
 *
 *   1  Personal          height, weight, blood pressure
 *   2  Medical history   conditions a doctor has diagnosed
 *   3  Family history    four questions, yes/no/don't know
 *   4  Lifestyle         smoking, exercise, work, alcohol
 *   5  Medication        what treatment is already in place
 *
 * WHY FIVE STEPS AND NOT ONE FORM
 * Thirty questions on one screen is where people abandon. Each step is one
 * kind of thinking, so the patient is never switching between recalling a
 * diagnosis and reading a number off a monitor.
 *
 * WHY "DON'T KNOW" IS A BUTTON, NOT A BLANK
 * Family history and valve disease default to "I don't know" and the patient
 * must pick. Leaving it blank would be recorded as "no", and someone who
 * doesn't know whether heart disease runs in their family is in a different
 * position from someone who knows it doesn't — the first needs the question
 * raised with a doctor.
 */

const STEPS = [
  { key: "personal", title: "About you" },
  { key: "medical", title: "Your medical history" },
  { key: "family", title: "Your family" },
  { key: "lifestyle", title: "Daily life" },
  { key: "medication", title: "Medication" },
];

const EMPTY = {
  personal: { height_cm: "", weight_kg: "", systolic_bp: "", diastolic_bp: "" },
  medical_history: Object.fromEntries(
    MEDICAL_CONDITIONS.map((c) => [c.key, false]),
  ),
  family_history: Object.fromEntries(
    FAMILY_HISTORY_QUESTIONS.map((q) => [q.key, "unknown"]),
  ),
  lifestyle: {
    smokes_now: false,
    smoked_in_past: false,
    drinks_alcohol: false,
    physical_activity: "low",
    occupation_activity: "light",
  },
  medication: {
    takes_long_term_medication: false,
    medication_list: "",
    blood_pressure_medication: false,
    diabetes_medication: false,
    heart_medication: false,
  },
};

EMPTY.medical_history.valve_disease = "unknown";

export default function PatientOnboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  const setField = (section, key) => (value) => {
    setForm((prev) => ({ ...prev, [section]: { ...prev[section], [key]: value } }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
    setFormError("");
  };

  const validatePersonal = () => {
    const found = {};
    for (const field of PERSONAL_FIELDS) {
      const raw = form.personal[field.key];
      if (String(raw).trim() === "") {
        found[field.key] = "This is needed to work out your baseline.";
        continue;
      }
      const value = Number(raw);
      if (Number.isNaN(value) || value < field.min || value > field.max) {
        found[field.key] = `Enter a value between ${field.min} and ${field.max}.`;
      }
    }

    const upper = Number(form.personal.systolic_bp);
    const lower = Number(form.personal.diastolic_bp);
    if (!found.systolic_bp && !found.diastolic_bp && upper <= lower) {
      found.systolic_bp = "The upper number must be higher than the lower one.";
    }

    setErrors(found);
    return Object.keys(found).length === 0;
  };

  const next = () => {
    if (step === 0 && !validatePersonal()) return;
    setStep((s) => s + 1);
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!validatePersonal()) {
      setStep(0);
      return;
    }

    setBusy(true);
    try {
      const { valve_disease, ...conditions } = form.medical_history;

      setResult(
        await api.submitIntake({
          personal: {
            height_cm: Number(form.personal.height_cm),
            weight_kg: Number(form.personal.weight_kg),
            systolic_bp: Number(form.personal.systolic_bp),
            diastolic_bp: Number(form.personal.diastolic_bp),
          },
          medical_history: { ...conditions, valve_disease },
          family_history: form.family_history,
          lifestyle: form.lifestyle,
          medication: {
            ...form.medication,
            medication_list: form.medication.medication_list.trim() || null,
          },
        }),
      );
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  };

  // ============================================================== RESULT

  if (result) {
    const canChange = result.risk_factors.filter((f) => f.startsWith("Can change:"));
    const cannot = result.risk_factors.filter((f) => f.startsWith("Cannot change:"));

    return (
      <section>
        <p className="eyebrow">Done</p>
        <h1>Your baseline is set</h1>

        <div className="card">
          <p className="eyebrow">Baseline risk</p>
          <p className={`band__value band--${bandClass(result.baseline_risk)}`}
             style={{ color: `var(--${bandClass(result.baseline_risk)})` }}>
            {result.baseline_risk}
          </p>
          {result.bmi && (
            <p className="band__score">BMI {result.bmi}</p>
          )}
        </div>

        {/* The factors matter more than the band. A patient shown only
            "High" doesn't know what to do; a patient shown what they can
            change does. */}
        {canChange.length > 0 && (
          <div className="card">
            <p className="eyebrow">Things you can change</p>
            <ul className="trail">
              {canChange.map((f) => (
                <li key={f}>{f.replace("Can change: ", "")}</li>
              ))}
            </ul>
          </div>
        )}

        {cannot.length > 0 && (
          <div className="card card--sunk">
            <p className="eyebrow">Things you can't change</p>
            <ul className="trail">
              {cannot.map((f) => (
                <li key={f}>{f.replace("Cannot change: ", "")}</li>
              ))}
            </ul>
          </div>
        )}

        <p className="disclaimer">{BASELINE_NOTE}</p>
        <p className="disclaimer">{result.disclaimer ?? DISCLAIMER}</p>

        <Button block onClick={() => navigate("/patient/check-in")}>
          Start my first check-in
        </Button>
      </section>
    );
  }

  // =============================================================== FORM

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <section>
      <p className="eyebrow">
        Step {step + 1} of {STEPS.length} · {current.title}
      </p>
      <h1>Your baseline</h1>

      <form onSubmit={submit} noValidate>
        {current.key === "personal" && (
          <>
            <p className="lede">
              These are measured, not remembered. If you don't have a blood
              pressure reading from the last few weeks, take one before
              continuing — it's the single most important number here.
            </p>
            {PERSONAL_FIELDS.map((field) => (
              <FormInput
                key={field.key}
                label={field.label}
                hint={field.hint}
                type="number"
                inputMode="decimal"
                step={field.key === "weight_kg" ? "0.1" : "1"}
                min={field.min}
                max={field.max}
                value={form.personal[field.key]}
                onChange={setField("personal", field.key)}
                error={errors[field.key]}
              />
            ))}
          </>
        )}

        {current.key === "medical" && (
          <>
            <p className="lede">
              Tick anything a doctor has told you that you have. Leave the rest
              alone.
            </p>
            {MEDICAL_CONDITIONS.map((condition) => (
              <FormInput
                key={condition.key}
                type="checkbox"
                label={condition.label}
                value={form.medical_history[condition.key]}
                onChange={setField("medical_history", condition.key)}
              />
            ))}

            <Choice
              legend={VALVE_DISEASE_QUESTION.label}
              options={TRISTATE}
              value={form.medical_history.valve_disease}
              onChange={setField("medical_history", "valve_disease")}
            />
          </>
        )}

        {current.key === "family" && (
          <>
            <p className="lede">
              "I don't know" is a real answer — please use it rather than
              guessing. Guessing "no" hides something your doctor may want to
              ask about.
            </p>
            {FAMILY_HISTORY_QUESTIONS.map((question) => (
              <Choice
                key={question.key}
                legend={question.label}
                options={TRISTATE}
                value={form.family_history[question.key]}
                onChange={setField("family_history", question.key)}
              />
            ))}
          </>
        )}

        {current.key === "lifestyle" && (
          <>
            {LIFESTYLE_QUESTIONS.map((question) => (
              <FormInput
                key={question.key}
                type="checkbox"
                label={question.label}
                value={form.lifestyle[question.key]}
                onChange={setField("lifestyle", question.key)}
              />
            ))}

            <Choice
              legend="How often do you exercise?"
              options={ACTIVITY_LEVEL}
              value={form.lifestyle.physical_activity}
              onChange={setField("lifestyle", "physical_activity")}
            />

            {/* Separate from exercise on purpose: a labourer who never
                exercises is not sedentary. */}
            <Choice
              legend="How physical is your daily work?"
              options={OCCUPATION_ACTIVITY}
              value={form.lifestyle.occupation_activity}
              onChange={setField("lifestyle", "occupation_activity")}
            />
          </>
        )}

        {current.key === "medication" && (
          <>
            <p className="lede">
              Knowing what you already take changes how we read your daily
              symptoms.
            </p>
            {MEDICATION_QUESTIONS.map((question) => (
              <FormInput
                key={question.key}
                type="checkbox"
                label={question.label}
                value={form.medication[question.key]}
                onChange={setField("medication", question.key)}
              />
            ))}

            <div className="field">
              <label className="field__label" htmlFor="med-list">
                Which medications? (optional)
              </label>
              <span className="field__hint">
                Names are enough. Your doctor sees this once you share your
                record.
              </span>
              <textarea
                id="med-list"
                className="field__control"
                rows={3}
                maxLength={1000}
                value={form.medication.medication_list}
                onChange={(e) =>
                  setField("medication", "medication_list")(e.target.value)
                }
                style={{ resize: "vertical", minHeight: "5rem" }}
              />
            </div>
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
          {isLast ? (
            <Button type="submit" busy={busy} busyLabel="Working it out…">
              Finish and see my baseline
            </Button>
          ) : (
            <Button onClick={next}>Continue</Button>
          )}
        </div>
      </form>
    </section>
  );
}

/** A labelled group of mutually exclusive options, reusing the scale styles. */
function Choice({ legend, options, value, onChange }) {
  return (
    <fieldset className="scale">
      <legend>{legend}</legend>
      <div
        className="scale__options"
        style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}
      >
        {options.map((option) => (
          <label className="scale__option" key={String(option.value)}>
            <input
              type="radio"
              name={legend}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function bandClass(level) {
  if (level === "high") return "bad";
  if (level === "medium") return "fair";
  return "good";
}
