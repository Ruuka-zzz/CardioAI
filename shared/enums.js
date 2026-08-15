/**
 * Shared enums and MCQ option values.
 *
 * shared/README.md is explicit that these must have exactly one source of
 * truth, so the frontend imports from here via the `@shared` alias in
 * frontend/vite.config.js rather than keeping its own copy.
 *
 * When the backend is built, it should read from this file too (or, if the
 * backend is Python, generate its enums from it in scripts/).
 */

export const ROLE = {
  PATIENT: "patient",
  DOCTOR: "doctor",
  ADMIN: "admin",
};

export const RISK_LEVEL = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
};

export const CONDITION_STATUS = {
  GOOD: "good",
  FAIR: "fair",
  BAD: "bad",
};

export const URGENCY = {
  ROUTINE: "routine",
  ELEVATED: "elevated",
  EMERGENCY: "emergency",
};

export const APPOINTMENT_STATUS = {
  REQUESTED: "requested",
  CONFIRMED: "confirmed",
  DECLINED: "declined",
  CANCELLED: "cancelled",
};

export const CHECKIN_SLOT = {
  MORNING: "morning",
  NIGHT: "night",
};

/** Symptom severity scale used by the daily MCQ and the Prolog rulebase. */
export const SEVERITY = [
  { value: 0, label: "None" },
  { value: 1, label: "Mild" },
  { value: 2, label: "Moderate" },
  { value: 3, label: "Severe" },
];

/** The five symptoms tracked daily. Order is the display order. */
export const SYMPTOMS = [
  { key: "chest_pain", label: "Chest pain or tightness" },
  { key: "breathlessness", label: "Breathlessness" },
  { key: "fatigue", label: "Unusual tiredness" },
  { key: "swelling", label: "Swelling in legs, ankles or feet" },
  { key: "dizziness", label: "Dizziness or light-headedness" },
];

/** UCI-derived intake fields. Values must match the ML service encoding. */
export const CHEST_PAIN_TYPE = [
  { value: 0, label: "Typical angina" },
  { value: 1, label: "Atypical angina" },
  { value: 2, label: "Non-anginal pain" },
  { value: 3, label: "No chest pain" },
];

export const RESTING_ECG = [
  { value: 0, label: "Normal" },
  { value: 1, label: "ST-T wave abnormality" },
  { value: 2, label: "Probable left ventricular hypertrophy" },
];

export const ST_SLOPE = [
  { value: 0, label: "Upsloping" },
  { value: 1, label: "Flat" },
  { value: 2, label: "Downsloping" },
];

export const THALASSEMIA = [
  { value: 0, label: "Not tested" },
  { value: 1, label: "Normal" },
  { value: 2, label: "Fixed defect" },
  { value: 3, label: "Reversible defect" },
];

/**
 * Rule atoms emitted by the Prolog engine, mapped to patient-readable text.
 * Adding a rule to prolog-engine means adding its label here, or the patient
 * sees the raw atom.
 */
export const TRIAGE_RULE_LABELS = {
  severe_chest_pain: "You reported severe chest pain",
  chest_pain_high_baseline: "Chest pain combined with your high baseline risk",
  breathless_with_dizziness: "Breathlessness together with dizziness",
  multiple_moderate_symptoms: "Three or more symptoms at moderate level or above",
  swelling_present: "Swelling that can indicate fluid retention",
  missed_medication_high_baseline: "Missed medication with high baseline risk",
  moderate_chest_pain: "Chest pain at moderate level",
  mild_symptoms: "Some mild symptoms reported",
  missed_medication: "Medication not taken today",
  all_clear: "No symptoms reported and medication taken",
};

export const DISCLAIMER =
  "This is a self-monitoring aid, not a medical diagnosis. If you feel unwell, " +
  "contact a doctor or your local emergency service.";