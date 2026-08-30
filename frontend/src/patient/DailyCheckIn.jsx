import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BREATHLESSNESS_TRIGGER,
  CHECKIN_SLOT,
  CHECKIN_SYMPTOMS,
  CHECKIN_VITALS,
  DISCLAIMER,
  NYHA_DESCRIPTION,
  TRIAGE_RULE_LABELS,
} from "@shared/enums";
import { api } from "../shared/api/client";
import Button from "../shared/components/Button";
import FormInput from "../shared/components/FormInput";
import StatusBand from "../shared/components/StatusBand";

/**
 * The daily loop. Symptoms in, Prolog triage out.
 *
 * SYMPTOMS ARE YES/NO
 * Severity comes from the breathlessness follow-up, which is the NYHA
 * functional class in plain language. "When does it happen" is something a
 * patient can answer accurately; "how severe, 0 to 3" is a guess, and two
 * patients' guesses are not comparable.
 *
 * THE FOLLOW-UP ONLY APPEARS WHEN IT APPLIES
 * Asking when breathlessness happens to someone who reported none is noise.
 * It appears the moment they tick the box, and clearing the box clears the
 * answer — the backend rejects a trigger without the symptom, and a form that
 * can produce a rejected payload is a form with a bug in it.
 *
 * VITALS ARE OPTIONAL AND STAY OPTIONAL
 * Not every patient owns a monitor. A blank field is sent as null, and the
 * rules never fire on a reading that wasn't taken.
 */

const emptyForm = () => ({
  slot: new Date().getHours() < 14 ? CHECKIN_SLOT.MORNING : CHECKIN_SLOT.NIGHT,
  ...Object.fromEntries(CHECKIN_SYMPTOMS.map((s) => [s.key, false])),
  breathlessness_trigger: "none",
  worse_than_usual: false,
  systolic_bp: "",
  diastolic_bp: "",
  heart_rate: "",
  temperature_c: "",
  medication_taken: true,
  medication_missed: false,
  extra_medication: false,
  diet_note: "",
});

export default function DailyCheckIn() {
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (key) => (value) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      // Clearing breathlessness clears its follow-up. Leaving a stale trigger
      // behind would produce a payload the backend rejects.
      if (key === "breathlessness" && value === false) {
        next.breathlessness_trigger = "none";
      }
      return next;
    });
    setError("");
  };

  const submit = async (event) => {
    event.preventDefault();

    if (form.breathlessness && form.breathlessness_trigger === "none") {
      setError("Tell us when the breathlessness happens.");
      return;
    }

    setBusy(true);
    try {
      setReport(
        await api.submitCheckIn({
          slot: form.slot,
          chest_pain: form.chest_pain,
          breathlessness: form.breathlessness,
          breathlessness_trigger: form.breathlessness_trigger,
          dizziness: form.dizziness,
          fatigue: form.fatigue,
          palpitations: form.palpitations,
          swelling: form.swelling,
          worse_than_usual: form.worse_than_usual,
          systolic_bp: numberOrNull(form.systolic_bp),
          diastolic_bp: numberOrNull(form.diastolic_bp),
          heart_rate: numberOrNull(form.heart_rate),
          temperature_c: numberOrNull(form.temperature_c),
          medication_taken: form.medication_taken,
          medication_missed: form.medication_missed,
          extra_medication: form.extra_medication,
          diet_note: form.diet_note.trim() || null,
        }),
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  // ============================================================== RESULT

  if (report) {
    const nyha = report.nyha_class ? NYHA_DESCRIPTION[report.nyha_class] : null;

    return (
      <section>
        <h1>Today's result</h1>

        <div className="card">
          <StatusBand status={report.status} score={report.score} />
          <p style={{ marginBottom: 0 }}>{report.recommendation}</p>
        </div>

       {report.urgency === "emergency" && (
  <p className="alert alert--urgent" role="alert">
    Contact your local emergency service now. Don't wait for this app.
  </p>
)}
        {nyha && (
          <div className="card card--sunk">
            <p className="eyebrow">Breathlessness grade</p>
            <p style={{ marginBottom: 0 }}>{nyha.label}</p>
          </div>
        )}

        {/* The reasoning trail is the product, not a debug view — it is the
            whole reason triage is rule-based rather than a model. */}
        <div className="card">
          <h2>Why you got this result</h2>
          <ol className="trail">
            {(report.fired_rules ?? []).map((rule) => (
              <li key={rule}>{TRIAGE_RULE_LABELS[rule] ?? rule}</li>
            ))}
          </ol>
        </div>

        <p className="disclaimer">{report.disclaimer ?? DISCLAIMER}</p>

        <div className="row">
          <Button onClick={() => navigate("/patient")}>Back to today</Button>
          <Button variant="secondary" onClick={() => navigate("/patient/doctors")}>
            Book a doctor
          </Button>
        </div>
      </section>
    );
  }

  // =============================================================== FORM

  return (
    <section>
      <p className="eyebrow">{form.slot} check-in</p>
      <h1>How are you feeling?</h1>
      <p className="lede">
        Answer for how you feel right now, not how you felt earlier today.
      </p>

      <form onSubmit={submit} noValidate>
        <h2>Symptoms</h2>
        {CHECKIN_SYMPTOMS.map((symptom) => (
          <div key={symptom.key}>
            <FormInput
              type="checkbox"
              label={symptom.label}
              value={form[symptom.key]}
              onChange={set(symptom.key)}
            />

            {/* NYHA follow-up, shown only when it applies. */}
            {symptom.key === "breathlessness" && form.breathlessness && (
              <fieldset className="scale" style={{ marginLeft: "1rem" }}>
                <legend>When does it happen?</legend>
                <div
                  className="scale__options"
                  style={{ gridTemplateColumns: "1fr" }}
                >
                  {BREATHLESSNESS_TRIGGER.map((option) => (
                    <label className="scale__option" key={option.value}>
                      <input
                        type="radio"
                        name="breathlessness_trigger"
                        checked={form.breathlessness_trigger === option.value}
                        onChange={() => set("breathlessness_trigger")(option.value)}
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
          </div>
        ))}

        {/* The single most informative question on the form. A stable patient
            with ongoing symptoms is not the same as one whose symptoms
            changed today, and only they can tell us which. */}
        <FormInput
          type="checkbox"
          label="This is worse than usual for me"
          hint="Compared with how you normally feel, not with a healthy person."
          value={form.worse_than_usual}
          onChange={set("worse_than_usual")}
        />

        <h2>Readings</h2>
        <p className="lede">
          Only if you've measured them today. Leave blank if you haven't —
          we'd rather have nothing than a guess.
        </p>
        {CHECKIN_VITALS.map((vital) => (
          <FormInput
            key={vital.key}
            label={vital.label}
            type="number"
            inputMode="decimal"
            step={vital.step ?? "1"}
            min={vital.min}
            max={vital.max}
            value={form[vital.key]}
            onChange={set(vital.key)}
          />
        ))}

        <h2>Medication</h2>
        <FormInput
          type="checkbox"
          label="I took my medication today"
          value={form.medication_taken}
          onChange={set("medication_taken")}
        />
        <FormInput
          type="checkbox"
          label="I missed a dose"
          value={form.medication_missed}
          onChange={set("medication_missed")}
        />
        <FormInput
          type="checkbox"
          label="I took extra medication"
          value={form.extra_medication}
          onChange={set("extra_medication")}
        />

        <div className="field">
          <label className="field__label" htmlFor="diet">
            Anything unusual you ate or drank? (optional)
          </label>
          <textarea
            id="diet"
            className="field__control"
            rows={2}
            maxLength={500}
            value={form.diet_note}
            onChange={(e) => set("diet_note")(e.target.value)}
            style={{ resize: "vertical" }}
          />
        </div>

        {error && (
          <p className="alert" role="alert">
            {error}
          </p>
        )}

        <Button type="submit" block busy={busy} busyLabel="Checking…">
          Submit check-in
        </Button>
      </form>
    </section>
  );
}

/** Blank stays blank. An empty vitals field must reach the backend as null,
 *  never as 0 — a rule firing on an invented reading is worse than silence. */
function numberOrNull(value) {
  const trimmed = String(value).trim();
  return trimmed === "" ? null : Number(trimmed);
}
