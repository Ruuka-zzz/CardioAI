"""Identity: User, and the Patient / Doctor profiles hanging off it."""

from sqlalchemy import (
    Boolean, Column, Date, DateTime, Enum, Float, ForeignKey, Integer, JSON,
    String, Time,
)
from sqlalchemy.orm import relationship

from .base import Base, IdMixin, TimestampMixin
from .enums import RiskLevel, Role


class User(Base, IdMixin, TimestampMixin):
    """Base identity. Role decides which profile row exists alongside it."""

    __tablename__ = "users"

    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    role = Column(Enum(Role), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    patient = relationship("Patient", back_populates="user", uselist=False)
    doctor = relationship("Doctor", back_populates="user", uselist=False)


class Patient(Base, IdMixin, TimestampMixin):
    __tablename__ = "patients"

    user_id = Column(String, ForeignKey("users.id"), unique=True, nullable=False)
    full_name = Column(String, nullable=False)

    # Demographics, NOT clinical findings — which is why they live here and
    # not in MedicalRecord. A doctor seeing an appointment needs to know who
    # is coming; reading their history still requires consent.
    # Date of birth rather than age, so it never goes stale.
    date_of_birth = Column(Date, nullable=True)
    sex = Column(String, nullable=True)

    # Daily triage compares against this, so check-ins are blocked until the
    # intake form is submitted and the baseline is set.
    onboarding_complete = Column(Boolean, default=False, nullable=False)
    baseline_risk = Column(Enum(RiskLevel), nullable=True)
    baseline_score = Column(Float, nullable=True)
    baseline_computed_at = Column(DateTime, nullable=True)

    phone = Column(String, nullable=True)              # SMS channel
    push_subscription = Column(JSON, nullable=True)    # Web Push endpoint + keys

    user = relationship("User", back_populates="patient")
    medical_record = relationship("MedicalRecord", back_populates="patient", uselist=False)
    family_history = relationship("FamilyHistory", back_populates="patient")
    checkins = relationship("DailyCheckIn", back_populates="patient")


class Doctor(Base, IdMixin, TimestampMixin):
    """No open signup. An admin issues an activation code; the doctor
    exchanges it for an account exactly once."""

    __tablename__ = "doctors"

    user_id = Column(String, ForeignKey("users.id"), unique=True, nullable=True)

    # Permanent, public-facing doctor number (CA-DOC-0001). Shown on the
    # dashboard and quotable over the phone. NOT a credential.
    staff_id = Column(String, unique=True, nullable=True, index=True)

    # One-time secret used to claim the account, then spent. Never displayed
    # once `activated` is True.
    activation_code = Column(String, unique=True, nullable=False, index=True)
    activated = Column(Boolean, default=False, nullable=False)

    full_name = Column(String, nullable=False)
    specialty = Column(String, nullable=False)
    bio = Column(String, nullable=True)

    # Where the patient physically goes. Shown in the directory — a patient
    # choosing a doctor needs the place at least as much as the credentials.
    hospital = Column(String, nullable=True)
    address = Column(String, nullable=True)

    user = relationship("User", back_populates="doctor")
    slots = relationship("AvailabilitySlot", back_populates="doctor")


class AvailabilitySlot(Base, IdMixin):
    """Recurring weekly availability. services/scheduling.py expands these
    into concrete bookable times."""

    __tablename__ = "availability_slots"

    doctor_id = Column(String, ForeignKey("doctors.id"), nullable=False, index=True)
    weekday = Column(Integer, nullable=False)  # 0 = Monday
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)

    # Ceiling on bookings in this block per day. NULL = as many as fit.
    # A second, lower limit on top of slot exclusivity, for clinics that run
    # a queue inside a window rather than fixed appointment times.
    capacity = Column(Integer, nullable=True)

    doctor = relationship("Doctor", back_populates="slots")