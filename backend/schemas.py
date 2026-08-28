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

class FamilyHistoryEntry(BaseModel):
    relation: str
    condition: str
    age_at_diagnosis: int | None = None


class IntakeRequest(BaseModel):
    age: int = Field(ge=1, le=120)
    sex: Literal["male", "female"]
    chest_pain_type: int = Field(ge=0, le=3)
    resting_bp: int = Field(ge=60, le=260)
    cholesterol: int = Field(ge=50, le=700)
    fasting_bs_high: bool
    resting_ecg: int = Field(ge=0, le=2)
    max_heart_rate: int = Field(ge=50, le=250)
    exercise_angina: bool
    oldpeak: float = Field(ge=0, le=10)
    st_slope: int = Field(ge=0, le=2)
    major_vessels: int = Field(ge=0, le=3)
    thalassemia: int = Field(ge=0, le=3)
    medications: list[str] | None = None
    family_history: list[FamilyHistoryEntry] | None = None


class BaselineRiskResponse(BaseModel):
    baseline_risk: Literal["low", "medium", "high"]
    baseline_score: float
    computed_at: datetime
    disclaimer: str


# ---------- daily check-in ----------

class CheckInRequest(BaseModel):
    slot: Literal["morning", "night"]
    chest_pain: int = Field(ge=0, le=3)
    breathlessness: int = Field(ge=0, le=3)
    fatigue: int = Field(ge=0, le=3)
    swelling: int = Field(ge=0, le=3)
    dizziness: int = Field(ge=0, le=3)
    medication_taken: bool


class ConditionReport(BaseModel):
    checkin_id: str
    created_at: datetime
    status: Literal["good", "fair", "bad"]
    score: float
    urgency: Literal["routine", "elevated", "emergency"]
    recommendation: str
    fired_rules: list[str]
    disclaimer: str


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
    baseline_risk: str | None = None
    medical_record: dict[str, Any] | None = None
    family_history: list[FamilyHistoryEntry] = []
    recent_checkins: list[CheckInSummary] = []


# ---------- admin ----------

class IssueDoctorRequest(BaseModel):
    full_name: str = Field(min_length=1)
    specialty: str = Field(min_length=1)
    bio: str | None = None


class DoctorAdminView(BaseModel):
    id: str
    staff_id: str | None = None
    full_name: str
    specialty: str
    bio: str | None = None
    activated: bool
    activation_code: str | None = None


class AuditEntry(BaseModel):
    id: str
    actor_user_id: str
    actor_name: str | None = None
    patient_id: str
    action: str
    occurred_at: datetime


class AdminAppointmentView(BaseModel):
    """Appointment metadata available to administrators.

    This deliberately excludes medical notes and the patient's clinical
    record. Admins need operational visibility, not clinical-record access.
    """
    id: str
    patient_name: str | None = None
    doctor_name: str | None = None
    starts_at: datetime
    ends_at: datetime
    status: str


# ---------- chatbot ----------

class ChatRequest(BaseModel):
    question: str = Field(min_length=1, max_length=1000)


class ChatResponse(BaseModel):
    answer: str
    sources: list[str] = []
    redirected: bool = False
    intent: Literal["education", "faq", "diagnosis_request", "emergency"]
