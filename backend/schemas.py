"""Request and response contracts.

These match the endpoint table in frontend/README.md. Two shapes the UI
depends on and that must not drift:

  - a check-in response carries `fired_rules` as a list of rule atoms
  - a record read returns 403 (not 404) when consent is missing
"""

from datetime import date, datetime
from typing import Any, Literal

from pydantic import BaseModel, EmailStr, Field, model_validator


# ---------- auth ----------

class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str = Field(min_length=1)
    # Demographics, not clinical findings. A doctor seeing tomorrow's list
    # needs to know who is coming; reading their history still needs consent.
    date_of_birth: date | None = None
    sex: Literal["male", "female"] | None = None


class DoctorActivateRequest(BaseModel):
    activation_code: str
    email: EmailStr
    password: str = Field(min_length=8)


class LoginRequest(BaseModel):
    """Sign in by email, by doctor roll number, or by both together.

    Doctors are issued a roll number (CA-DOC-0001) and sign in with roll
    number + email + password, the way a student uses a matriculation number
    on an LMS. Patients and admins use email + password.

    WHAT THE SECOND IDENTIFIER IS AND ISN'T
    Neither the roll number nor the email is a secret; the password is. So
    requiring both does NOT add a security factor, and it should not be
    described as one. What it does add is an integrity check: if an admin
    mis-issues a number, or two doctors' numbers get transposed, the mismatch
    surfaces at sign-in instead of after someone has been looking at the wrong
    schedule for a week.

    That benefit is only worth having if the failure stays silent about which
    field was wrong — see the login handler.
    """

    email: EmailStr | None = None
    staff_id: str | None = None
    password: str

    @model_validator(mode="after")
    def needs_an_identifier(self):
        if not self.email and not self.staff_id:
            raise ValueError("Provide an email address or a roll number.")
        return self


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str


class MeResponse(BaseModel):
    id: str
    email: EmailStr
    role: str
    staff_id: str | None = None
    full_name: str | None = None
    onboarding_complete: bool | None = None


# ---------- onboarding ----------

class PersonalSection(BaseModel):
    """Category 1. Age and sex are already on the account, so the intake form
    only collects what signup didn't."""

    height_cm: float = Field(ge=50, le=250)
    weight_kg: float = Field(ge=20, le=300)

    # Asked here, not taken from the first check-in: baseline risk has to
    # exist before any check-in can be triaged against it, so waiting for one
    # would deadlock. Blood pressure is also the strongest single predictor
    # the model has.
    systolic_bp: int = Field(ge=60, le=260)
    diastolic_bp: int = Field(ge=30, le=180)

    @model_validator(mode="after")
    def systolic_above_diastolic(self):
        if self.systolic_bp <= self.diastolic_bp:
            raise ValueError(
                "The upper blood pressure number must be higher than the lower one."
            )
        return self


class MedicalHistorySection(BaseModel):
    """Category 2. Conditions a doctor has diagnosed."""

    hypertension: bool = False
    diabetes: bool = False
    ischemic_heart_disease: bool = False
    heart_failure: bool = False
    heart_attack: bool = False
    stroke: bool = False
    # Tristate: plenty of patients genuinely don't know, and recording that
    # as "no" would make the rules quietly wrong.
    valve_disease: Literal["yes", "no", "unknown"] = "unknown"
    other_cardiovascular_disease: bool = False


class FamilyHistorySection(BaseModel):
    """Category 3. Four flags — the form asks "does anyone in your family",
    so per-relative detail was never collected."""

    heart_disease: Literal["yes", "no", "unknown"] = "unknown"
    hypertension: Literal["yes", "no", "unknown"] = "unknown"
    diabetes: Literal["yes", "no", "unknown"] = "unknown"
    premature_heart_disease: Literal["yes", "no", "unknown"] = "unknown"


class LifestyleSection(BaseModel):
    """Category 4a. Smoking, exercise, work, alcohol."""

    smokes_now: bool = False
    # Former smokers keep elevated risk for years, so "not now" is not the
    # same as "never".
    smoked_in_past: bool = False
    physical_activity: Literal["low", "moderate", "high"] = "low"
    occupation_activity: Literal["sedentary", "light", "moderate", "high"] = "light"
    drinks_alcohol: bool = False


class MedicationSection(BaseModel):
    """Category 4b. What treatment is already in place.

    The three flags matter more than the free-text list: they tell the rules
    a condition is being treated, which changes what today's symptoms mean.
    """

    takes_long_term_medication: bool = False
    medication_list: str | None = Field(default=None, max_length=1000)
    blood_pressure_medication: bool = False
    diabetes_medication: bool = False
    heart_medication: bool = False


class IntakeRequest(BaseModel):
    """The whole baseline, in the four categories the form is built around.

    Nested rather than flat so the frontend can submit one section at a time
    and so a reader can see at a glance which questions belong together.
    """

    personal: PersonalSection
    medical_history: MedicalHistorySection
    family_history: FamilyHistorySection
    lifestyle: LifestyleSection
    medication: MedicationSection


class BaselineRiskResponse(BaseModel):
    baseline_risk: Literal["low", "medium", "high"]
    baseline_score: float
    bmi: float | None = None
    computed_at: datetime
    # Risk factors the MODEL did not see — family history, prior diagnoses,
    # medication — surfaced by the rules instead. Shown to the patient so the
    # number never looks like the whole picture.
    risk_factors: list[str] = []
    disclaimer: str


# ---------- daily check-in ----------

class CheckInRequest(BaseModel):
    """Symptoms are yes/no; severity comes from breathlessness_trigger.

    "When does it happen" is the NYHA classification in plain language, and a
    patient can answer it accurately. "How severe, 0 to 3?" invites a guess,
    and two patients' guesses are not comparable.
    """

    slot: Literal["morning", "night"]

    # --- symptoms ---
    chest_pain: bool = False
    breathlessness: bool = False
    breathlessness_trigger: Literal["none", "stairs", "walking", "at_rest"] = "none"
    dizziness: bool = False
    fatigue: bool = False
    palpitations: bool = False
    swelling: bool = False

    # The most informative question on the form: a stable patient with
    # ongoing symptoms is not the same as one whose symptoms changed today.
    worse_than_usual: bool = False

    # --- vitals, optional (not every patient owns a monitor) ---
    systolic_bp: int | None = Field(default=None, ge=60, le=260)
    diastolic_bp: int | None = Field(default=None, ge=30, le=180)
    heart_rate: int | None = Field(default=None, ge=30, le=220)
    temperature_c: float | None = Field(default=None, ge=30, le=45)

    # --- medication ---
    medication_taken: bool = True
    medication_missed: bool = False
    extra_medication: bool = False

    diet_note: str | None = Field(default=None, max_length=500)

    @model_validator(mode="after")
    def trigger_matches_symptom(self):
        """A trigger without the symptom, or the symptom without a trigger,
        means the form was filled in inconsistently — and the Prolog rules
        read both, so letting it through would produce a wrong grade."""
        if self.breathlessness and self.breathlessness_trigger == "none":
            raise ValueError(
                "Tell us when the breathlessness happens: on stairs, when "
                "walking, or at rest."
            )
        if not self.breathlessness and self.breathlessness_trigger != "none":
            raise ValueError(
                "You selected when breathlessness happens but not that you "
                "have it."
            )
        return self


class ConditionReport(BaseModel):
    checkin_id: str
    created_at: datetime
    # NYHA functional class, derived from breathlessness_trigger. Null when
    # the patient reported no breathlessness.
    nyha_class: int | None = None
    status: Literal["good", "fair", "bad"]
    score: float
    urgency: Literal["routine", "elevated", "emergency"]
    recommendation: str
    fired_rules: list[str]
    disclaimer: str


class BaselineRecordResponse(BaseModel):
    """The patient's own baseline, read back.

    Grouped by the four categories the form was built around rather than
    returned flat, so the page can show it the way it was asked. A patient
    re-reading their answers should recognise the shape of the form they
    filled in.
    """

    completed_at: datetime | None = None
    risk_level: str | None = None
    bmi: float | None = None

    personal: dict[str, Any] | None = None
    medical_history: dict[str, Any] | None = None
    family_history: dict[str, Any] | None = None
    lifestyle: dict[str, Any] | None = None
    medication: dict[str, Any] | None = None

    risk_factors: list[str] = []
    disclaimer: str


class MyDoctorResponse(BaseModel):
    """A doctor the patient has an actual relationship with.

    `record_shared` and `appointment_count` are the two things that make this
    different from browsing the public directory: it answers "who can see my
    history" and "who am I actually seeing".
    """

    id: str
    staff_id: str | None = None
    full_name: str
    specialty: str
    qualifications: str | None = None
    hospital: str | None = None
    address: str | None = None
    bio: str | None = None
    working_days: list[str] = []

    record_shared: bool = False
    appointment_count: int = 0
    next_appointment: datetime | None = None


class Reminder(BaseModel):
    id: str
    body: str
    due_at: datetime | None = None


# ---------- doctors, booking, consent ----------

class DoctorPublic(BaseModel):
    id: str
    staff_id: str | None = None
    full_name: str
    specialty: str
    qualifications: str | None = None
    bio: str | None = None
    hospital: str | None = None
    address: str | None = None
    # Human-readable summary of the doctor's week, e.g.
    # ["Mon 09:00-12:00", "Wed 09:00-12:00"]. Saves the directory a second
    # request per doctor just to show when they work.
    working_days: list[str] = []
    next_available: datetime | None = None


class SlotOption(BaseModel):
    starts_at: datetime
    ends_at: datetime


class AppointmentRequest(BaseModel):
    doctor_id: str
    starts_at: datetime
    reason: str | None = None


class AppointmentResponse(BaseModel):
    id: str
    doctor_id: str
    doctor_name: str | None = None
    hospital: str | None = None
    patient_name: str | None = None
    patient_age: int | None = None
    patient_sex: str | None = None
    starts_at: datetime
    ends_at: datetime
    status: str
    reason: str | None = None
    record_shared: bool = False
    # Whether the patient may still cancel — so the UI can disable the button
    # rather than let someone press it and be refused.
    can_cancel: bool = False
    cancelled_by: str | None = None


class CancelRequest(BaseModel):
    """Cancelling needs no fields — the appointment id is in the path — but a
    body keeps the door open for a reason string later."""

    reason: str | None = None


class ConsentRequest(BaseModel):
    doctor_id: str


class ConsentResponse(BaseModel):
    doctor_id: str
    shared: bool
    granted_at: datetime | None = None


# ---------- doctor views ----------

class PatientSummary(BaseModel):
    id: str
    full_name: str
    age: int | None = None
    sex: str | None = None
    record_shared: bool


class CheckInSummary(BaseModel):
    date: str
    slot: str
    status: str | None = None
    score: float | None = None
    fired_rules: list[str] = []


class PatientRecordResponse(BaseModel):
    patient_id: str
    full_name: str
    # Demographics live on the patient account, not in the clinical record —
    # a doctor needs to know who is in front of them. Repeated here so the
    # record view is self-contained rather than needing a second lookup.
    age: int | None = None
    sex: str | None = None
    baseline_risk: str | None = None
    bmi: float | None = None
    medical_record: dict[str, Any] | None = None
    family_history: dict[str, Any] | None = None
    lifestyle: dict[str, Any] | None = None
    medication: dict[str, Any] | None = None
    recent_checkins: list[CheckInSummary] = []


# ---------- admin ----------

class IssueDoctorRequest(BaseModel):
    full_name: str = Field(min_length=1)
    specialty: str = Field(min_length=1)
    qualifications: str | None = None
    hospital: str | None = None
    address: str | None = None
    bio: str | None = None


class DoctorAdminView(BaseModel):
    id: str
    staff_id: str | None = None
    full_name: str
    specialty: str
    qualifications: str | None = None
    hospital: str | None = None
    bio: str | None = None
    activated: bool
    activation_code: str | None = None


class AdminAppointmentView(BaseModel):
    """Operational appointment list for the admin dashboard.

    Names, time and status ONLY. The reason a patient gave and anything from
    their record stay out: an administrator needs to see that the clinic is
    running, not why someone is attending. Widening this later should take a
    deliberate decision, not a convenient one.
    """

    id: str
    patient_name: str | None = None
    doctor_name: str | None = None
    starts_at: datetime
    ends_at: datetime
    status: str


class AuditEntry(BaseModel):
    id: str
    actor_user_id: str
    actor_name: str | None = None
    patient_id: str
    action: str
    occurred_at: datetime


# ---------- chatbot ----------

class ChatRequest(BaseModel):
    question: str = Field(min_length=1, max_length=1000)


class ChatResponse(BaseModel):
    answer: str
    sources: list[str] = []
    redirected: bool = False
    intent: Literal["education", "faq", "diagnosis_request", "emergency"]
