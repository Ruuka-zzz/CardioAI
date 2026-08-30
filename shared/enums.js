/**
 * Shared enums, question definitions and display labels.
 *
 * shared/README.md requires exactly one source of truth for anything both
 * sides use, so the frontend imports from here via the `@shared` alias rather
 * than keeping a copy. backend/models/enums.py mirrors the value sets — change
 * one, change the other in the same PR.
 *
 * TRANSLATION RULE
 * `value` is what goes in the database and into Prolog. `label` and `labelMy`
 * are display only. Never store the Burmese string: the moment you do, every
 * rule and every query has to handle two languages.
 */

export const ROLE = { PATIENT: "patient", DOCTOR: "doctor", ADMIN: "admin" };

export const RISK_LEVEL = { LOW: "low", MEDIUM: "medium", HIGH: "high" };

export const CONDITION_STATUS = { GOOD: "good", FAIR: "fair", BAD: "bad" };

export const URGENCY = {
  ROUTINE: "routine",
  ELEVATED: "elevated",
  EMERGENCY: "emergency",
};

export const APPOINTMENT_STATUS = {
  CONFIRMED: "confirmed",
  CANCELLED: "cancelled",
  COMPLETED: "completed",
};

export const CHECKIN_SLOT = { MORNING: "morning", NIGHT: "night" };

/**
 * Yes / No / Don't know.
 *
 * "Don't know" is a real answer and must not be coerced into "no". Someone who
 * doesn't know whether heart disease runs in their family is in a different
 * position from someone who knows it doesn't — the first needs the question
 * raised with a doctor.
 */
export const TRISTATE = [
  { value: "yes", label: "Yes", labelMy: "ဟုတ်ကဲ့" },
  { value: "no", label: "No", labelMy: "မဟုတ်ပါ" },
  { value: "unknown", label: "I don't know", labelMy: "မသိပါ" },
];

export const YES_NO = [
  { value: true, label: "Yes", labelMy: "ဟုတ်ကဲ့" },
  { value: false, label: "No", labelMy: "မဟုတ်ပါ" },
];

export const SEX = [
  { value: "female", label: "Female", labelMy: "အမျိုးသမီး" },
  { value: "male", label: "Male", labelMy: "အမျိုးသား" },
];

/* ============================================================
   BASELINE — category 1: personal
   ============================================================ */

export const PERSONAL_FIELDS = [
  {
    key: "height_cm",
    label: "Height (cm)",
    labelMy: "အရပ် (စင်တီမီတာ)",
    min: 120,
    max: 220,
  },
  {
    key: "weight_kg",
    label: "Weight (kg)",
    labelMy: "ကိုယ်အလေးချိန် (ကီလိုဂရမ်)",
    min: 30,
    max: 200,
  },
  {
    key: "systolic_bp",
    label: "Blood pressure — upper number",
    labelMy: "သွေးပေါင်ချိန် — အပေါ်ဂဏန်း",
    hint: "The larger of the two numbers, e.g. 130 in 130/85.",
    hintMy: "ဂဏန်းနှစ်လုံးထဲက ကြီးတဲ့ဟာ၊ ဥပမာ 130/85 မှာ 130။",
    min: 70,
    max: 250,
  },
  {
    key: "diastolic_bp",
    label: "Blood pressure — lower number",
    labelMy: "သွေးပေါင်ချိန် — အောက်ဂဏန်း",
    min: 40,
    max: 150,
  },
];

/* ============================================================
   BASELINE — category 2: medical history
   ============================================================ */

export const MEDICAL_CONDITIONS = [
  {
    key: "hypertension",
    label: "High blood pressure (hypertension)",
    labelMy: "သွေးတိုးရောဂါ",
  },
  { key: "diabetes", label: "Diabetes", labelMy: "ဆီးချိုရောဂါ" },
  {
    key: "ischemic_heart_disease",
    label: "Ischaemic heart disease / angina",
    labelMy: "နှလုံးသွေးကြောကျဉ်းရောဂါ",
  },
  { key: "heart_failure", label: "Heart failure", labelMy: "နှလုံးအားနည်းရောဂါ" },
  { key: "heart_attack", label: "A heart attack", labelMy: "နှလုံးဖောက်ဖူးခြင်း" },
  { key: "stroke", label: "A stroke", labelMy: "လေဖြတ်ဖူးခြင်း" },
  {
    key: "other_cardiovascular_disease",
    label: "Any other heart or blood vessel condition",
    labelMy: "အခြား နှလုံး/သွေးကြော ရောဂါ",
  },
];

// Asked separately from the checkbox list because "I don't know" is a common
// and legitimate answer here — many people have never been told either way.
export const VALVE_DISEASE_QUESTION = {
  key: "valve_disease",
  label: "Has a doctor told you that you have a heart valve problem?",
  labelMy: "နှလုံးအဆို့ရှင် ပြဿနာ ရှိတယ်လို့ ဆရာဝန်က ပြောဖူးပါသလား?",
};

/* ============================================================
   BASELINE — category 3: family history
   ============================================================ */

export const FAMILY_HISTORY_QUESTIONS = [
  {
    key: "heart_disease",
    label: "Heart disease in your family",
    labelMy: "မိသားစုထဲမှာ နှလုံးရောဂါ",
  },
  {
    key: "hypertension",
    label: "High blood pressure in your family",
    labelMy: "မိသားစုထဲမှာ သွေးတိုးရောဂါ",
  },
  {
    key: "diabetes",
    label: "Diabetes in your family",
    labelMy: "မိသားစုထဲမှာ ဆီးချိုရောဂါ",
  },
  {
    // Heart disease in a close relative at a young age suggests something
    // inherited rather than accumulated, so it carries far more weight than
    // heart disease in the family generally. Its own question for that reason.
    key: "premature_heart_disease",
    label: "Heart disease in a parent or sibling before age 55",
    labelMy: "မိဘ သို့မဟုတ် မွေးချင်းတစ်ယောက် အသက် ၅၅ မတိုင်ခင် နှလုံးရောဂါ",
  },
];

/* ============================================================
   BASELINE — category 4: lifestyle and medication
   ============================================================ */

export const ACTIVITY_LEVEL = [
  {
    value: "low",
    label: "Rarely or never",
    labelMy: "ရံဖန်ရံခါ သို့မဟုတ် လုံးဝမလုပ်ပါ",
  },
  {
    value: "moderate",
    label: "A few times a week",
    labelMy: "တစ်ပတ်လျှင် အကြိမ်အနည်းငယ်",
  },
  { value: "high", label: "Most days", labelMy: "နေ့တိုင်းနီးပါး" },
];

export const OCCUPATION_ACTIVITY = [
  {
    value: "sedentary",
    label: "Mostly sitting",
    labelMy: "အများအားဖြင့် ထိုင်နေရသည်",
  },
  {
    value: "light",
    label: "Some walking around",
    labelMy: "အနည်းငယ် လမ်းလျှောက်ရသည်",
  },
  {
    value: "moderate",
    label: "On my feet most of the day",
    labelMy: "တစ်နေ့လုံးနီးပါး ရပ်နေရသည်",
  },
  {
    value: "high",
    label: "Heavy physical work",
    labelMy: "ပင်ပန်းသော ကာယလုပ်ငန်း",
  },
];

export const LIFESTYLE_QUESTIONS = [
  { key: "smokes_now", label: "Do you smoke now?", labelMy: "လက်ရှိ ဆေးလိပ်သောက်ပါသလား?" },
  {
    // Former smokers keep elevated risk for years after quitting, so "not
    // now" is not the same as "never".
    key: "smoked_in_past",
    label: "Did you smoke in the past?",
    labelMy: "အရင်က ဆေးလိပ်သောက်ဖူးပါသလား?",
  },
  {
    key: "drinks_alcohol",
    label: "Do you drink alcohol?",
    labelMy: "အရက်သောက်ပါသလား?",
  },
];

export const MEDICATION_QUESTIONS = [
  {
    key: "takes_long_term_medication",
    label: "Do you take any medication regularly?",
    labelMy: "ပုံမှန်သောက်နေရတဲ့ ဆေး ရှိပါသလား?",
  },
  {
    key: "blood_pressure_medication",
    label: "Medication for blood pressure",
    labelMy: "သွေးပေါင်ချိန် ဆေး",
  },
  {
    key: "diabetes_medication",
    label: "Medication for diabetes",
    labelMy: "ဆီးချို ဆေး",
  },
  {
    key: "heart_medication",
    label: "Medication for your heart",
    labelMy: "နှလုံး ဆေး",
  },
];

/* ============================================================
   DAILY CHECK-IN
   ============================================================ */

/**
 * Symptoms are yes/no. Severity comes from BREATHLESSNESS_TRIGGER below.
 *
 * A patient can answer "do you have chest pain" accurately. "How severe,
 * 0 to 3?" invites a guess, and two patients' guesses are not comparable.
 */
export const CHECKIN_SYMPTOMS = [
  {
    key: "chest_pain",
    label: "Chest pain or tightness",
    labelMy: "ရင်ဘတ်အောင့်ခြင်း သို့မဟုတ် ကျပ်ခြင်း",
  },
  {
    key: "breathlessness",
    label: "Shortness of breath",
    labelMy: "အသက်ရှူမဝခြင်း",
  },
  {
    key: "dizziness",
    label: "Dizziness or light-headedness",
    labelMy: "မူးဝေခြင်း",
  },
  { key: "fatigue", label: "Unusual tiredness", labelMy: "ပုံမှန်မဟုတ်သော ပင်ပန်းခြင်း" },
  {
    key: "palpitations",
    label: "Racing or irregular heartbeat",
    labelMy: "နှလုံးခုန်မြန်ခြင်း သို့မဟုတ် မမှန်ခြင်း",
  },
  {
    key: "swelling",
    label: "Swelling in legs, ankles or feet",
    labelMy: "ခြေထောက်၊ ခြေချင်းဝတ် ရောင်ခြင်း",
  },
];

/**
 * WHEN breathlessness happens — this is the NYHA functional class in plain
 * language, and it is where symptom severity now comes from.
 *
 * The mapping is standard and citable, which a 0-3 slider never was.
 */
export const BREATHLESSNESS_TRIGGER = [
  {
    value: "stairs",
    label: "Only when climbing stairs or hurrying",
    labelMy: "လှေကားတက်တဲ့အခါ သို့မဟုတ် အလျင်လိုတဲ့အခါမှသာ",
    nyha: 2,
  },
  {
    value: "walking",
    label: "When walking on flat ground",
    labelMy: "မြေပြန့်မှာ လမ်းလျှောက်တဲ့အခါ",
    nyha: 3,
  },
  {
    value: "at_rest",
    label: "Even when resting",
    labelMy: "နားနေချိန်မှာပင်",
    nyha: 4,
  },
];

export const NYHA_DESCRIPTION = {
  2: {
    label: "NYHA Class II — ordinary activity brings on symptoms",
    labelMy: "NYHA အဆင့် ၂ — ပုံမှန်လှုပ်ရှားမှုမှာ ခံစားရသည်",
  },
  3: {
    label: "NYHA Class III — less than ordinary activity brings on symptoms",
    labelMy: "NYHA အဆင့် ၃ — အနည်းငယ် လှုပ်ရှားရုံနှင့် ခံစားရသည်",
  },
  4: {
    label: "NYHA Class IV — symptoms while resting",
    labelMy: "NYHA အဆင့် ၄ — နားနေချိန်မှာပင် ခံစားရသည်",
  },
};

// All optional. Not every patient owns a monitor, and a blank field must stay
// blank — the rules never assume a reading that wasn't taken.
export const CHECKIN_VITALS = [
  {
    key: "systolic_bp",
    label: "Blood pressure — upper",
    labelMy: "သွေးပေါင်ချိန် — အပေါ်",
    min: 70,
    max: 250,
  },
  {
    key: "diastolic_bp",
    label: "Blood pressure — lower",
    labelMy: "သွေးပေါင်ချိန် — အောက်",
    min: 40,
    max: 150,
  },
  {
    key: "heart_rate",
    label: "Heart rate (beats per minute)",
    labelMy: "နှလုံးခုန်နှုန်း (တစ်မိနစ်လျှင်)",
    min: 30,
    max: 220,
  },
  {
    key: "temperature_c",
    label: "Temperature (°C)",
    labelMy: "ကိုယ်အပူချိန် (°C)",
    min: 34,
    max: 43,
    step: 0.1,
  },
];

export const CHECKIN_MEDICATION = [
  {
    key: "medication_taken",
    label: "I took my medication today",
    labelMy: "ဒီနေ့ ဆေးသောက်ပြီးပါပြီ",
    defaultValue: true,
  },
  {
    key: "medication_missed",
    label: "I missed a dose",
    labelMy: "ဆေးတစ်ကြိမ် လွတ်သွားပါတယ်",
    defaultValue: false,
  },
  {
    key: "extra_medication",
    label: "I took extra medication",
    labelMy: "ဆေး ပိုသောက်လိုက်ပါတယ်",
    defaultValue: false,
  },
];

/* ============================================================
   RULE LABELS
   ============================================================ */

/**
 * Rule atoms from prolog-engine/rules.pl, mapped to readable text.
 *
 * Adding a rule there means adding its label here, or the patient sees the
 * raw atom. DailyCheckIn.jsx shows the atom rather than hiding it, so a
 * missing label is visible in testing instead of silently swallowed.
 */
export const TRIAGE_RULE_LABELS = {
  // emergency
  chest_pain_worsening: "Chest pain that is new or worse than usual",
  chest_pain_high_baseline: "Chest pain combined with your high baseline risk",
  chest_pain_prior_mi: "Chest pain when you have had a heart attack before",
  breathless_at_rest: "Breathlessness while resting (NYHA Class IV)",
  breathless_with_dizziness: "Breathlessness together with dizziness",
  chest_pain_palpitations_dizziness:
    "Chest pain with a racing heartbeat and dizziness",
  bp_crisis: "Blood pressure in the dangerous range",
  bp_very_low: "Blood pressure unusually low",
  heart_rate_very_high: "Heart rate dangerously fast",
  heart_rate_very_low: "Heart rate dangerously slow",

  // elevated
  breathless_when_walking:
    "Breathlessness when walking on the flat (NYHA Class III)",
  congestion_pattern: "Swelling and breathlessness together — possible fluid build-up",
  swelling_with_heart_failure: "Swelling with your diagnosed heart failure",
  multiple_symptoms: "Three or more symptoms present together",
  worse_than_baseline: "Your symptoms are worse than usual today",
  chest_pain_present: "Chest pain reported",
  missed_medication_high_baseline: "Missed medication with high baseline risk",
  missed_medication_heart_failure: "Missed medication with diagnosed heart failure",
  bp_high: "Blood pressure high",
  palpitations_high_baseline: "Racing heartbeat with high baseline risk",
  extra_medication_taken: "Extra medication taken without advice",
  fever_with_symptoms: "A fever alongside heart symptoms",

  // routine
  breathless_on_stairs: "Breathlessness on stairs (NYHA Class II)",
  swelling_only: "Some swelling reported",
  palpitations_only: "Racing or irregular heartbeat reported",
  mild_symptoms: "Some symptoms reported today",
  missed_medication: "Medication not taken today",
  bp_slightly_high: "Blood pressure above the usual target",
  all_clear: "No symptoms reported and medication taken",
};

export const DISCLAIMER =
  "This is a self-monitoring aid, not a medical diagnosis. If you feel " +
  "unwell, contact a doctor or your local emergency service.";

export const DISCLAIMER_MY =
  "ဤသည်မှာ ကိုယ်တိုင်စောင့်ကြည့်ရန် အထောက်အကူသာဖြစ်ပြီး ရောဂါရှာဖွေခြင်း " +
  "မဟုတ်ပါ။ မကျန်းမမာဖြစ်ပါက ဆရာဝန် သို့မဟုတ် အရေးပေါ်ဌာနကို ဆက်သွယ်ပါ။";

export const BASELINE_NOTE =
  "Your risk band compares you with everyone in the training data. It is " +
  "not a percentage chance and not a diagnosis — the factors listed beside " +
  "it matter more than the band itself.";