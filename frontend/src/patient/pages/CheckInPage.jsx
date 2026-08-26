import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DISCLAIMER, SEVERITY_LEVELS } from "@shared/enums";
import { api } from "../shared/api/client";
import Button from "../shared/components/Button";
import FormInput from "../shared/components/FormInput";

const SYMPTOMS = [
  { key: "chest_pain", label: "Chest pain or tightness" },
  { key: "breathlessness", label: "Breathlessness" },
  { key: "unusual_tiredness", label: "Unusual tiredness" },
  { key: "swelling", label: "Swelling in legs, ankles or feet" },
  { key: "dizziness", label: "Dizziness or light-headedness" },
];

const EMPTY_CHECK_IN = {
  chest_pain: "none",
  breathlessness: "none",
  unusual_tiredness: "none",
  swelling: "none",
  dizziness: "none",
  medication_taken: true,
};

export default function CheckInPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY_CHECK_IN);
  const [formError, setFormError] = useState("");
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const originalBg = document.body.style.backgroundColor;
    const originalColor = document.body.style.color;
    
    document.body.style.backgroundColor = "#0f172a";
    document.body.style.color = "#f8fafc";

    return () => {
      document.body.style.backgroundColor = originalBg;
      document.body.style.color = originalColor;
    };
  }, []);

  const handleSymptomChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFormError("");
  };

  const submitCheckIn = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      const response = await api.submitCheckIn(form);
      setResult(response);
    } catch (err) {
      setFormError(err.message || "Failed to submit check-in. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (result) {
    return (
      <div style={styles.pageWrapper}>
        <div style={styles.card}>
          <div style={styles.stepIndicator}>Check-in Complete</div>
          <h1 style={styles.title}>Thank you for checking in</h1>

          <div style={styles.resultCard}>
            <p style={styles.eyebrow}>Today's Status</p>
            <p
              style={{
                ...styles.bandValue,
                color: getRiskColour(result.status),
              }}
            >
              {result.status ?? "Recorded"}
            </p>
            <p style={styles.bandScore}>
              {result.message ?? "Your daily symptoms have been successfully saved."}
            </p>
          </div>

          <p style={styles.description}>
            Keeping track daily helps your care team monitor your progress effectively.
          </p>
          <p style={styles.disclaimer}>{result.disclaimer ?? DISCLAIMER}</p>

          <div style={{ marginTop: "24px" }}>
            <Button block onClick={() => navigate("/patient/dashboard")}>
              Go to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.pageWrapper}>
      <div style={styles.card}>
        <div style={styles.headerSection}>
          <div style={styles.topSubtitle}>NIGHT CHECK-IN</div>
          <h1 style={styles.title}>How are you feeling?</h1>
          <p style={styles.lede}>
            Answer for how you feel right now, not how you felt earlier today.
          </p>
        </div>

        <form onSubmit={submitCheckIn} noValidate style={styles.form}>
          <div style={styles.symptomsContainer}>
            {SYMPTOMS.map((symptom) => (
              <div key={symptom.key} style={styles.symptomGroup}>
                <label style={styles.symptomLabel}>{symptom.label}</label>
                <div style={styles.optionsRow}>
                  {(SEVERITY_LEVELS || [
                    { value: "none", label: "None" },
                    { value: "mild", label: "Mild" },
                    { value: "moderate", label: "Moderate" },
                    { value: "severe", label: "Severe" },
                  ]).map((lvl) => {
                    const val = typeof lvl === "object" ? lvl.value : lvl.toLowerCase();
                    const lbl = typeof lvl === "object" ? lvl.label : lvl;
                    const isSelected = form[symptom.key] === val;

                    return (
                      <button
                        type="button"
                        key={val}
                        style={{
                          ...styles.optionButton,
                          ...(isSelected ? styles.optionButtonSelected : {}),
                        }}
                        onClick={() => handleSymptomChange(symptom.key, val)}
                      >
                        {lbl}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div style={styles.medicationContainer}>
            <FormInput
              label="I took my medication today"
              type="checkbox"
              value={form.medication_taken}
              onChange={(val) => setForm((prev) => ({ ...prev, medication_taken: val }))}
            />
          </div>

          {formError && (
            <p className="alert" style={styles.alert} role="alert">
              {formError}
            </p>
          )}

          <div style={styles.row}>
            <Button type="submit" block busy={busy} busyLabel="Submitting check-in…">
              Submit check-in
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function getRiskColour(level) {
  const l = String(level).toLowerCase();
  if (l === "high" || l === "severe" || l === "bad") return "#f87171";
  if (l === "medium" || l === "moderate" || l === "fair") return "#fbbf24";
  return "#34d399";
}

const styles = {
  pageWrapper: {
    minHeight: "100vh",
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 16px",
    backgroundColor: "#0f172a",
    boxSizing: "border-box",
  },
  card: {
    width: "100%",
    maxWidth: "640px",
    background: "#1e293b",
    borderRadius: "20px",
    padding: "40px",
    boxShadow: "0 25px 50px rgba(0, 0, 0, 0.7)",
    border: "1px solid #334155",
    color: "#f8fafc",
  },
  headerSection: {
    marginBottom: "24px",
  },
  topSubtitle: {
    fontSize: "12px",
    fontWeight: "700",
    letterSpacing: "1px",
    color: "#94a3b8",
    marginBottom: "6px",
  },
  title: {
    fontSize: "28px",
    fontWeight: "800",
    color: "#ffffff",
    marginBottom: "8px",
    letterSpacing: "-0.5px",
  },
  lede: {
    fontSize: "15px",
    color: "#94a3b8",
    lineHeight: "1.5",
    margin: "0",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "24px",
  },
  symptomsContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  symptomGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  symptomLabel: {
    fontSize: "15px",
    fontWeight: "600",
    color: "#f8fafc",
  },
  optionsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "8px",
  },
  optionButton: {
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #334155",
    backgroundColor: "#0f172a",
    color: "#94a3b8",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s ease",
    textAlign: "center",
  },
  optionButtonSelected: {
    backgroundColor: "#0369a1",
    borderColor: "#38bdf8",
    color: "#ffffff",
    boxShadow: "0 0 12px rgba(56, 189, 248, 0.3)",
  },
  medicationContainer: {
    marginTop: "4px",
    padding: "12px 16px",
    backgroundColor: "#0f172a",
    borderRadius: "10px",
    border: "1px solid #334155",
  },
  alert: {
    padding: "12px 16px",
    borderRadius: "8px",
    backgroundColor: "rgba(127, 29, 29, 0.8)",
    color: "#fecaca",
    fontSize: "14px",
    margin: "0",
    border: "1px solid #991b1b",
  },
  row: {
    marginTop: "12px",
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
    fontSize: "15px",
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