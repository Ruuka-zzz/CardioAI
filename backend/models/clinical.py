"""Clinical data: the four baseline categories, and the daily check-in.

BASELINE IS FOUR TABLES, NOT ONE
Personal + medical history, family history, lifestyle, and medication each
get their own table. They are separate because they change on different
timescales and are used by different parts of the system:

    MedicalRecord      updated when a diagnosis changes    -> ML + Prolog
    FamilyHistory      essentially never changes           -> Prolog only
    LifestyleHistory   changes when the patient changes    -> ML + Prolog
    MedicationHistory  changes with every prescription     -> Prolog only

Cramming them into one row would mean rewriting the whole baseline every time
a patient quits smoking, and would lose the record of when each part was last
confirmed.

WHY SOME FIELDS GO TO ML AND OTHERS DON'T
The risk model is trained on a dataset with age, sex, height, weight, blood
pressure, smoking, alcohol and activity — so those feed the model. Family
history and prior diagnoses are not in any dataset we have, but they are
well-established risk factors, so they feed the Prolog rules instead. That
split is deliberate; see docs and services/clients.py.
"""

from datetime import date

from sqlalchemy import (
    Boolean, Column, Date, Enum, Float, ForeignKey, Integer, JSON, String,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from .base import Base, IdMixin, TimestampMixin
from .enums import (
    ActivityLevel, BreathlessnessTrigger, CheckInSlot, ConditionStatus,
    OccupationActivity, Tristate, Urgency,
)


class MedicalRecord(Base, IdMixin, TimestampMixin):
    """Baseline: body measurements, vitals, and diagnosed conditions.

    Age and sex are NOT here — they live on Patient as demographics, so a
    doctor can see who is coming to an appointment without needing consent to
    read the clinical record.
    """

    __tablename__ = "medical_records"

    patient_id = Column(String, ForeignKey("patients.id"), unique=True, nullable=False)

    # --- body measurements (BMI is derived, never stored) ---
    height_cm = Column(Float, nullable=False)
    weight_kg = Column(Float, nullable=False)

    # --- baseline vitals ---
    # Asked at onboarding rather than taken from the first check-in: the
    # baseline risk has to exist before any check-in can be triaged against
    # it, so waiting for one would deadlock.
    systolic_bp = Column(Integer, nullable=False)
    diastolic_bp = Column(Integer, nullable=False)

    # --- diagnosed conditions (question 5-12) ---
    hypertension = Column(Boolean, nullable=False, default=False)
    diabetes = Column(Boolean, nullable=False, default=False)
    ischemic_heart_disease = Column(Boolean, nullable=False, default=False)
    heart_failure = Column(Boolean, nullable=False, default=False)
    heart_attack = Column(Boolean, nullable=False, default=False)
    stroke = Column(Boolean, nullable=False, default=False)
    # Tristate: many patients genuinely don't know whether they have valve
    # disease, and "don't know" must not be recorded as "no".
    valve_disease = Column(Enum(Tristate), nullable=False, default=Tristate.unknown)
    other_cardiovascular_disease = Column(Boolean, nullable=False, default=False)

    patient = relationship("Patient", back_populates="medical_record")

    @property
    def bmi(self) -> float | None:
        """Derived, not stored — storing it would let it drift out of step
        with the height and weight it came from."""
        if not self.height_cm or not self.weight_kg:
            return None
        metres = self.height_cm / 100
        return round(self.weight_kg / (metres * metres), 1)


class FamilyHistory(Base, IdMixin, TimestampMixin):
    """One row per patient, four flags — not one row per relative.

    The questionnaire asks "does ANYONE in your family have...", so the
    per-relative detail was never collected. Four tristate columns model
    exactly what is asked and nothing more.
    """

    __tablename__ = "family_history"

    patient_id = Column(String, ForeignKey("patients.id"), unique=True, nullable=False)

    heart_disease = Column(Enum(Tristate), nullable=False, default=Tristate.unknown)
    hypertension = Column(Enum(Tristate), nullable=False, default=Tristate.unknown)
    diabetes = Column(Enum(Tristate), nullable=False, default=Tristate.unknown)

    # Heart disease in a close relative at a young age carries far more weight
    # than heart disease in the family generally — it suggests something
    # inherited rather than accumulated. Kept as its own question for that
    # reason.
    premature_heart_disease = Column(
        Enum(Tristate), nullable=False, default=Tristate.unknown
    )

    patient = relationship("Patient", back_populates="family_history")


class LifestyleHistory(Base, IdMixin, TimestampMixin):
    """Smoking, activity, alcohol. Feeds both the ML model and the rules."""

    __tablename__ = "lifestyle_history"

    patient_id = Column(String, ForeignKey("patients.id"), unique=True, nullable=False)

    smokes_now = Column(Boolean, nullable=False, default=False)
    # Asked separately because former smokers keep elevated risk for years
    # after quitting — "no" to current smoking does not mean no risk.
    smoked_in_past = Column(Boolean, nullable=False, default=False)

    physical_activity = Column(
        Enum(ActivityLevel), nullable=False, default=ActivityLevel.low
    )
    # Distinct from exercise: a labourer who never exercises is not sedentary.
    occupation_activity = Column(
        Enum(OccupationActivity), nullable=False, default=OccupationActivity.light
    )

    drinks_alcohol = Column(Boolean, nullable=False, default=False)

    patient = relationship("Patient", back_populates="lifestyle")


class MedicationHistory(Base, IdMixin, TimestampMixin):
    """What the patient takes long term.

    The three condition-specific flags matter more than the free-text list:
    they tell the rules that a condition is being *treated*, which changes
    what today's symptoms mean. Someone on heart medication reporting chest
    pain is a different picture from someone who has never been treated.
    """

    __tablename__ = "medication_history"

    patient_id = Column(String, ForeignKey("patients.id"), unique=True, nullable=False)

    takes_long_term_medication = Column(Boolean, nullable=False, default=False)
    # Free text, as given. Not parsed into drug names — a wrong parse of a
    # medication list is worse than no parse.
    medication_list = Column(String, nullable=True)

    blood_pressure_medication = Column(Boolean, nullable=False, default=False)
    diabetes_medication = Column(Boolean, nullable=False, default=False)
    heart_medication = Column(Boolean, nullable=False, default=False)

    patient = relationship("Patient", back_populates="medications")


class DailyCheckIn(Base, IdMixin, TimestampMixin):
    """A symptom self-report plus the triage result it produced.

    Symptoms are yes/no rather than a 0-3 slider. Severity now comes from
    `breathlessness_trigger`, which is the NYHA class in plain language — a
    patient can answer "when I climb stairs" accurately, where "how severe,
    0 to 3?" invites a guess.

    The triage result lives on the same row: a check-in and its report are
    written together and always read together, so keeping them joined means a
    report can never be orphaned from the answers that produced it.
    """

    __tablename__ = "daily_checkins"
    __table_args__ = (
        UniqueConstraint("patient_id", "check_date", "slot", name="uq_checkin_slot"),
    )

    patient_id = Column(String, ForeignKey("patients.id"), nullable=False, index=True)
    check_date = Column(Date, default=date.today, nullable=False)
    slot = Column(Enum(CheckInSlot), nullable=False)

    # --- symptoms ---
    chest_pain = Column(Boolean, nullable=False, default=False)
    breathlessness = Column(Boolean, nullable=False, default=False)
    breathlessness_trigger = Column(
        Enum(BreathlessnessTrigger), nullable=False,
        default=BreathlessnessTrigger.none,
    )
    dizziness = Column(Boolean, nullable=False, default=False)
    fatigue = Column(Boolean, nullable=False, default=False)
    palpitations = Column(Boolean, nullable=False, default=False)
    swelling = Column(Boolean, nullable=False, default=False)

    # The single most useful question on the form. A stable patient with
    # ongoing symptoms is not the same as one whose symptoms changed today,
    # and only the patient can tell us which this is.
    worse_than_usual = Column(Boolean, nullable=False, default=False)

    # --- vitals (optional: not every patient owns a monitor) ---
    systolic_bp = Column(Integer, nullable=True)
    diastolic_bp = Column(Integer, nullable=True)
    heart_rate = Column(Integer, nullable=True)
    temperature_c = Column(Float, nullable=True)

    # --- medication ---
    medication_taken = Column(Boolean, nullable=False, default=True)
    medication_missed = Column(Boolean, nullable=False, default=False)
    extra_medication = Column(Boolean, nullable=False, default=False)

    diet_note = Column(String, nullable=True)

    # --- triage output from prolog-engine ---
    status = Column(Enum(ConditionStatus), nullable=True)
    score = Column(Float, nullable=True)
    urgency = Column(Enum(Urgency), nullable=True)
    recommendation = Column(String, nullable=True)
    fired_rules = Column(JSON, nullable=True)  # explainability trail

    patient = relationship("Patient", back_populates="checkins")

    @property
    def any_symptom(self) -> bool:
        return any([
            self.chest_pain, self.breathlessness, self.dizziness,
            self.fatigue, self.palpitations, self.swelling,
        ])