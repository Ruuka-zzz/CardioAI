"""Request and response contracts.

These match the endpoint table in frontend/README.md. Two shapes the UI
depends on and that must not drift:

  - a check-in response carries `fired_rules` as a list of rule atoms
  - a record read returns 403 (not 404) when consent is missing
"""

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, EmailStr, Field


# ---------- auth ----------

class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str = Field(min_length=1)


class DoctorActivateRequest(BaseModel):
    activation_code: str
    email: EmailStr
    password: str = Field(min_length=8)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str


class MeResponse(BaseModel):
    id: str
    email: EmailStr
    role: str
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
    full_name: str
    specialty: str
    bio: str | None = None


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
    patient_name: str | None = None
    starts_at: datetime
    ends_at: datetime
    status: str
    reason: str | None = None
    record_shared: bool = False


class AppointmentDecision(BaseModel):
    status: Literal["confirmed", "declined", "cancelled"]


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


# ---------- chatbot ----------

class ChatRequest(BaseModel):
    question: str = Field(min_length=1, max_length=1000)


class ChatResponse(BaseModel):
    answer: str
    sources: list[str] = []
    redirected: bool = False
    intent: Literal["education", "faq", "diagnosis_request", "emergency"]