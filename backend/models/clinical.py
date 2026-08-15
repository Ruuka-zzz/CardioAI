"""Clinical data: onboarding record, family history, and daily check-ins."""

from datetime import date

from sqlalchemy import (
    Boolean, Column, Date, Enum, Float, ForeignKey, Integer, JSON, String,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from .base import Base, IdMixin, TimestampMixin
from .enums import CheckInSlot, ConditionStatus, Urgency


class MedicalRecord(Base, IdMixin, TimestampMixin):
    """Onboarding clinical intake. Column names track the UCI dataset fields
    so ml-service can map them without a translation layer."""

    __tablename__ = "medical_records"

    patient_id = Column(String, ForeignKey("patients.id"), unique=True, nullable=False)

    age = Column(Integer, nullable=False)
    sex = Column(String, nullable=False)
    chest_pain_type = Column(Integer, nullable=False)     # cp 0-3
    resting_bp = Column(Integer, nullable=False)          # trestbps
    cholesterol = Column(Integer, nullable=False)         # chol
    fasting_bs_high = Column(Boolean, nullable=False)     # fbs > 120
    resting_ecg = Column(Integer, nullable=False)         # restecg 0-2
    max_heart_rate = Column(Integer, nullable=False)      # thalach
    exercise_angina = Column(Boolean, nullable=False)     # exang
    oldpeak = Column(Float, nullable=False)
    st_slope = Column(Integer, nullable=False)            # slope
    major_vessels = Column(Integer, nullable=False)       # ca 0-3
    thalassemia = Column(Integer, nullable=False)         # thal

    medications = Column(JSON, nullable=True)

    patient = relationship("Patient", back_populates="medical_record")


class FamilyHistory(Base, IdMixin, TimestampMixin):
    """One row per relative with a relevant condition. Separate table because
    a patient can list several."""

    __tablename__ = "family_history"

    patient_id = Column(String, ForeignKey("patients.id"), nullable=False, index=True)
    relation = Column(String, nullable=False)     # e.g. "father", "sibling"
    condition = Column(String, nullable=False)
    age_at_diagnosis = Column(Integer, nullable=True)

    patient = relationship("Patient", back_populates="family_history")


class DailyCheckIn(Base, IdMixin, TimestampMixin):
    """A symptom self-report plus the triage result it produced.

    The result is stored on the same row rather than in a separate table: a
    check-in and its report are written together and always read together, and
    keeping them joined means a report can never be orphaned from the answers
    that produced it.
    """

    __tablename__ = "daily_checkins"
    __table_args__ = (
        UniqueConstraint("patient_id", "check_date", "slot", name="uq_checkin_slot"),
    )

    patient_id = Column(String, ForeignKey("patients.id"), nullable=False, index=True)
    check_date = Column(Date, default=date.today, nullable=False)
    slot = Column(Enum(CheckInSlot), nullable=False)

    chest_pain = Column(Integer, nullable=False)      # 0-3 severity
    breathlessness = Column(Integer, nullable=False)
    fatigue = Column(Integer, nullable=False)
    swelling = Column(Integer, nullable=False)
    dizziness = Column(Integer, nullable=False)
    medication_taken = Column(Boolean, nullable=False)

    # --- triage output from prolog-engine ---
    status = Column(Enum(ConditionStatus), nullable=True)
    score = Column(Float, nullable=True)
    urgency = Column(Enum(Urgency), nullable=True)
    recommendation = Column(String, nullable=True)
    fired_rules = Column(JSON, nullable=True)  # explainability trail

    patient = relationship("Patient", back_populates="checkins")