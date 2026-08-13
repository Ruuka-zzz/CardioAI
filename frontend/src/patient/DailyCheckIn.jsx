import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CHECKIN_SLOT,
  DISCLAIMER,
  SEVERITY,
  SYMPTOMS,
  TRIAGE_RULE_LABELS,
} from "@shared/enums";
import { api } from "../shared/api/client";
import Button from "../shared/components/Button";
import StatusBand from "../shared/components/StatusBand";

/**
 * The daily loop. Symptom MCQ in, Prolog triage result out.
 *
 * The rule trail is not optional garnish — the whole reason triage is
 * rule-based rather than a model is that the patient can be told why. If the
 * backend sends a rule atom with no label in shared/enums.js, we show the raw
 * atom rather than hiding it, so the gap is visible in testing.
 */

const emptyForm = () => ({
  slot: new Date().getHours() < 14 ? CHECKIN_SLOT.MORNING : CHECKIN_SLOT.NIGHT,
  chest_pain: 0,
  breathlessness: 0,
  fatigue: 0,
  swelling: 0,
  dizziness: 0,
  medication_taken: true,
});

export default function DailyCheckIn() {
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError("");
  };

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      setReport(await api.submitCheckIn(form));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (report) {
    return (
      <section>
        <h1>Today's result</h1>

        <div className="card">
          <StatusBand status={report.status} score={report.score} />
          <p style={{ marginBottom: 0 }}>{report.recommendation}</p>
        </div>

        {report.urgency === "emergency" && (
          <p className="alert" role="alert">
            We've also sent this to your phone by text message.
          </p>
        )}

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

  return (
    <section>
      <p className="eyebrow">{form.slot} check-in</p>
      <h1>How are you feeling?</h1>
      <p className="lede">
        Answer for how you feel right now, not how you felt earlier today.
      </p>

      <form onSubmit={submit} noValidate>
        {SYMPTOMS.map(({ key, label }) => (
          <fieldset className="scale" key={key}>
            <legend>{label}</legend>
            <div className="scale__options">
              {SEVERITY.map((level) => (
                <label className="scale__option" key={level.value}>
                  <input
                    type="radio"
                    name={key}
                    value={level.value}
                    checked={form[key] === level.value}
                    onChange={() => set(key, level.value)}
                  />
                  <span>{level.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}

        <label className="checkbox">
          <input
            type="checkbox"
            checked={form.medication_taken}
            onChange={(e) => set("medication_taken", e.target.checked)}
          />
          <span>I took my medication today</span>
        </label>

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