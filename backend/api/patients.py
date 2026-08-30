"""Patient routes: baseline intake, daily check-in, history, reminders.

BASELINE IS FOUR CATEGORIES, ONE TRANSACTION
The intake form submits personal + medical, family, lifestyle and medication
together. They are written in a single transaction: a patient with a medical
record but no lifestyle row would produce a baseline the rules can't reason
about, and there is no sensible way to recover from that halfway state.

WHERE EACH ANSWER GOES
    ML model  <- age, sex, height, weight, blood pressure, smoking,
                 alcohol, activity          (these exist in the training data)
    Prolog    <- family history, prior diagnoses, medication
                 (no dataset has these, but they are established risk
                  factors, so the rules use them instead)

That split is why `risk_factors` exists on the response: it carries the
things the model never saw, so a patient never mistakes the model's number
for the whole picture.
"""

from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from api.deps import current_patient
from database.session import get_db
from models import (
    ActivityLevel, BreathlessnessTrigger, CheckInSlot, ConditionStatus,
    DailyCheckIn, FamilyHistory, LifestyleHistory, MedicalRecord,
    MedicationHistory, OccupationActivity, Patient, Tristate, Urgency,
)
from schemas import (
    BaselineRecordResponse, BaselineRiskResponse, CheckInRequest,
    ConditionReport, IntakeRequest, Reminder,
)
from services import clients

router = APIRouter(prefix="/api/patients", tags=["patients"])

DISCLAIMER = (
    "This is a self-monitoring aid, not a medical diagnosis. If you feel unwell, "
    "contact a doctor or your local emergency service."
)

# breathlessness_trigger -> NYHA functional class. Kept here rather than in
# the model so the mapping is visible next to the code that uses it.
NYHA_BY_TRIGGER = {
    BreathlessnessTrigger.none: None,
    BreathlessnessTrigger.stairs: 2,
    BreathlessnessTrigger.walking: 3,
    BreathlessnessTrigger.at_rest: 4,
}


# ---------------------------------------------------------------- helpers

def _age_of(patient: Patient) -> int | None:
    if patient.date_of_birth is None:
        return None
    today = date.today()
    dob = patient.date_of_birth
    return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))


def _to_report(row: DailyCheckIn) -> ConditionReport:
    return ConditionReport(
        checkin_id=row.id,
        created_at=row.created_at,
        nyha_class=NYHA_BY_TRIGGER.get(row.breathlessness_trigger),
        status=row.status.value,
        score=row.score,
        urgency=row.urgency.value,
        recommendation=row.recommendation,
        fired_rules=row.fired_rules or [],
        disclaimer=DISCLAIMER,
    )


# --------------------------------------------------- baseline: intake -> ML

@router.post("/me/intake", response_model=BaselineRiskResponse, status_code=201)
def submit_intake(
    body: IntakeRequest,
    db: Session = Depends(get_db),
    patient: Patient = Depends(current_patient),
):
    if patient.onboarding_complete:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Your baseline is already complete. New clinical results are "
            "added separately.",
        )

    # Age and sex come from the account, not the form — they were collected at
    # signup and a doctor needs them without consent to read the record.
    age = _age_of(patient)
    if age is None or patient.sex is None:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Add your date of birth and sex to your account before completing "
            "the baseline.",
        )

    record = MedicalRecord(
        patient_id=patient.id,
        height_cm=body.personal.height_cm,
        weight_kg=body.personal.weight_kg,
        systolic_bp=body.personal.systolic_bp,
        diastolic_bp=body.personal.diastolic_bp,
        hypertension=body.medical_history.hypertension,
        diabetes=body.medical_history.diabetes,
        ischemic_heart_disease=body.medical_history.ischemic_heart_disease,
        heart_failure=body.medical_history.heart_failure,
        heart_attack=body.medical_history.heart_attack,
        stroke=body.medical_history.stroke,
        valve_disease=Tristate(body.medical_history.valve_disease),
        other_cardiovascular_disease=body.medical_history.other_cardiovascular_disease,
    )

    family = FamilyHistory(
        patient_id=patient.id,
        heart_disease=Tristate(body.family_history.heart_disease),
        hypertension=Tristate(body.family_history.hypertension),
        diabetes=Tristate(body.family_history.diabetes),
        premature_heart_disease=Tristate(
            body.family_history.premature_heart_disease
        ),
    )

    lifestyle = LifestyleHistory(
        patient_id=patient.id,
        smokes_now=body.lifestyle.smokes_now,
        smoked_in_past=body.lifestyle.smoked_in_past,
        physical_activity=ActivityLevel(body.lifestyle.physical_activity),
        occupation_activity=OccupationActivity(body.lifestyle.occupation_activity),
        drinks_alcohol=body.lifestyle.drinks_alcohol,
    )

    medication = MedicationHistory(
        patient_id=patient.id,
        takes_long_term_medication=body.medication.takes_long_term_medication,
        medication_list=body.medication.medication_list,
        blood_pressure_medication=body.medication.blood_pressure_medication,
        diabetes_medication=body.medication.diabetes_medication,
        heart_medication=body.medication.heart_medication,
    )

    # All four together, or none. A half-written baseline is worse than no
    # baseline: the rules would reason from an incomplete picture without any
    # way of knowing it was incomplete.
    db.add_all([record, family, lifestyle, medication])
    db.flush()

    # Raises 503 if ml-service is down — a delayed baseline beats a wrong one.
    result = clients.assess_baseline_risk(
        age=age, sex=patient.sex, record=record, lifestyle=lifestyle
    )

    factors = describe_risk_factors(record, family, lifestyle, medication, age)

    patient.baseline_risk = result["risk_level"]
    patient.baseline_score = result["score"]
    patient.baseline_computed_at = datetime.utcnow()
    patient.onboarding_complete = True
    db.commit()

    return BaselineRiskResponse(
        baseline_risk=patient.baseline_risk.value,
        baseline_score=patient.baseline_score,
        bmi=record.bmi,
        computed_at=patient.baseline_computed_at,
        risk_factors=factors,
        disclaimer=DISCLAIMER,
    )


def describe_risk_factors(
    record: MedicalRecord,
    family: FamilyHistory,
    lifestyle: LifestyleHistory,
    medication: MedicationHistory,
    age: int,
) -> list[str]:
    """Plain-language risk factors, split into what can and can't be changed.

    Deliberately NOT a score. A patient shown only "High" doesn't know what to
    do; a patient shown "smoking, low activity, BMI 29 — these you can change"
    does. This is also where the answers the ML model never saw earn their
    place: family history and prior diagnoses appear here.

    Moves to the Prolog engine in step 2, where the same facts already live.
    Kept in Python for now so intake works end to end without waiting.
    """
    modifiable: list[str] = []
    fixed: list[str] = []

    if lifestyle.smokes_now:
        modifiable.append("You currently smoke")
    elif lifestyle.smoked_in_past:
        fixed.append("You smoked in the past")

    if lifestyle.physical_activity is ActivityLevel.low:
        modifiable.append("Little regular physical activity")
    if lifestyle.drinks_alcohol:
        modifiable.append("You drink alcohol")

    bmi = record.bmi
    if bmi and bmi >= 30:
        modifiable.append(f"BMI {bmi} — in the obese range")
    elif bmi and bmi >= 25:
        modifiable.append(f"BMI {bmi} — above the healthy range")

    if record.systolic_bp >= 140 or record.diastolic_bp >= 90:
        modifiable.append(
            f"Blood pressure {record.systolic_bp}/{record.diastolic_bp} — raised"
        )

    if age >= 55:
        fixed.append(f"Age {age}")
    if record.heart_attack:
        fixed.append("Previous heart attack")
    if record.stroke:
        fixed.append("Previous stroke")
    if record.heart_failure:
        fixed.append("Diagnosed heart failure")
    if record.ischemic_heart_disease:
        fixed.append("Diagnosed ischaemic heart disease")
    if record.valve_disease is Tristate.yes:
        fixed.append("Heart valve disease")

    if family.premature_heart_disease is Tristate.yes:
        fixed.append("Heart disease in a close relative at a young age")
    elif family.heart_disease is Tristate.yes:
        fixed.append("Heart disease in the family")

    # Treatment is protective, and saying so matters: a patient who reads a
    # list of only bad news is more likely to stop reading than to act.
    if medication.blood_pressure_medication and record.hypertension:
        fixed.append("Your blood pressure is being treated")
    if medication.heart_medication:
        fixed.append("You are on heart medication")

    out = [f"Can change: {f}" for f in modifiable]
    out += [f"Cannot change: {f}" for f in fixed]
    return out


@router.get("/me/baseline", response_model=BaselineRecordResponse)
def my_baseline(
    db: Session = Depends(get_db),
    patient: Patient = Depends(current_patient),
):
    """The patient's own baseline, read back in the shape they filled it in.

    Risk factors are recomputed on read rather than stored. They are derived
    entirely from the four baseline tables, so storing them would create a
    second copy that goes stale the moment a diagnosis or a habit changes.
    """
    if not patient.onboarding_complete or patient.medical_record is None:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "You haven't completed your baseline questions yet.",
        )

    record = patient.medical_record
    family = patient.family_history
    lifestyle = patient.lifestyle
    medication = patient.medications
    age = _age_of(patient)

    factors = []
    if family and lifestyle and medication and age is not None:
        factors = describe_risk_factors(record, family, lifestyle, medication, age)

    return BaselineRecordResponse(
        completed_at=patient.baseline_computed_at,
        risk_level=patient.baseline_risk.value if patient.baseline_risk else None,
        bmi=record.bmi,
        personal={
            "age": age,
            "sex": patient.sex,
            "height_cm": record.height_cm,
            "weight_kg": record.weight_kg,
            "systolic_bp": record.systolic_bp,
            "diastolic_bp": record.diastolic_bp,
        },
        medical_history=_fields_of(record, skip={
            "height_cm", "weight_kg", "systolic_bp", "diastolic_bp",
        }),
        family_history=_fields_of(family),
        lifestyle=_fields_of(lifestyle),
        medication=_fields_of(medication),
        risk_factors=factors,
        disclaimer=DISCLAIMER,
    )


def _fields_of(row, skip: set[str] | None = None) -> dict | None:
    """Every column except the plumbing, as plain JSON.

    Enum values are unwrapped so the frontend gets "yes" rather than a Python
    object it can't render.
    """
    if row is None:
        return None
    hidden = {"id", "patient_id", "created_at"} | (skip or set())
    out = {}
    for column in row.__table__.columns:
        if column.name in hidden:
            continue
        value = getattr(row, column.name)
        out[column.name] = value.value if hasattr(value, "value") else value
    return out


# ------------------------------------- daily check-in -> Prolog -> notify

@router.post("/me/checkins", response_model=ConditionReport, status_code=201)
def submit_checkin(
    body: CheckInRequest,
    db: Session = Depends(get_db),
    patient: Patient = Depends(current_patient),
):
    # Triage reasons against the baseline, so it cannot run before onboarding.
    if not patient.onboarding_complete or patient.baseline_risk is None:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Complete your baseline questions before your first check-in.",
        )

    today = date.today()
    slot = CheckInSlot(body.slot)

    if db.query(DailyCheckIn).filter_by(
        patient_id=patient.id, check_date=today, slot=slot
    ).one_or_none():
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"You already logged your {body.slot} check-in today.",
        )

    checkin = DailyCheckIn(
        patient_id=patient.id,
        check_date=today,
        slot=slot,
        chest_pain=body.chest_pain,
        breathlessness=body.breathlessness,
        breathlessness_trigger=BreathlessnessTrigger(body.breathlessness_trigger),
        dizziness=body.dizziness,
        fatigue=body.fatigue,
        palpitations=body.palpitations,
        swelling=body.swelling,
        worse_than_usual=body.worse_than_usual,
        systolic_bp=body.systolic_bp,
        diastolic_bp=body.diastolic_bp,
        heart_rate=body.heart_rate,
        temperature_c=body.temperature_c,
        medication_taken=body.medication_taken,
        medication_missed=body.medication_missed,
        extra_medication=body.extra_medication,
        diet_note=body.diet_note,
    )
    db.add(checkin)
    db.flush()

    triage = clients.run_triage(checkin, patient)

    checkin.status = ConditionStatus(triage["status"])
    checkin.urgency = Urgency(triage["urgency"])
    checkin.score = float(triage["score"])
    checkin.recommendation = triage["recommendation"]
    checkin.fired_rules = triage.get("fired_rules", [])
    db.commit()
    db.refresh(checkin)

    # Fire-and-forget: a failed push must not lose a saved check-in.
    clients.notify(patient.id, checkin.urgency, checkin.recommendation)

    return _to_report(checkin)


@router.get("/me/checkins", response_model=list[ConditionReport])
def checkin_history(
    limit: int = 30,
    db: Session = Depends(get_db),
    patient: Patient = Depends(current_patient),
):
    """409 when onboarding is incomplete — the frontend routes on this."""
    if not patient.onboarding_complete:
        raise HTTPException(
            status.HTTP_409_CONFLICT, "Complete your baseline questions first."
        )

    rows = (
        db.query(DailyCheckIn)
        .filter_by(patient_id=patient.id)
        .filter(DailyCheckIn.status.isnot(None))
        .order_by(DailyCheckIn.created_at.desc())
        .limit(min(limit, 100))
        .all()
    )
    return [_to_report(row) for row in rows]


@router.get("/me/checkins/latest", response_model=ConditionReport)
def latest_checkin(
    db: Session = Depends(get_db),
    patient: Patient = Depends(current_patient),
):
    row = (
        db.query(DailyCheckIn)
        .filter_by(patient_id=patient.id)
        .filter(DailyCheckIn.status.isnot(None))
        .order_by(DailyCheckIn.created_at.desc())
        .first()
    )
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No check-ins yet")
    return _to_report(row)


@router.get("/me/reminders", response_model=list[Reminder])
def reminders(
    db: Session = Depends(get_db),
    patient: Patient = Depends(current_patient),
):
    """Outstanding nudges for today, computed on read.

    Moves to notification-service once that exists — recomputing on every
    request is fine at this size but is not where scheduling belongs.
    """
    today = date.today()
    done = {
        row.slot
        for row in db.query(DailyCheckIn)
        .filter_by(patient_id=patient.id, check_date=today)
        .all()
    }

    out: list[Reminder] = []
    hour = datetime.utcnow().hour

    if CheckInSlot.morning not in done and hour >= 8:
        out.append(Reminder(id="checkin-morning",
                            body="You haven't logged your morning check-in yet."))
    if CheckInSlot.night not in done and hour >= 19:
        out.append(Reminder(id="checkin-night",
                            body="You haven't logged your evening check-in yet."))

    return out


# ------------------------------------------------------------- web push

@router.post("/me/push-subscription", status_code=200)
def save_push_subscription(
    subscription: dict,
    db: Session = Depends(get_db),
    patient: Patient = Depends(current_patient),
):
    patient.push_subscription = subscription
    db.commit()
    return {"subscribed": True}


@router.delete("/me/push-subscription", status_code=200)
def delete_push_subscription(
    db: Session = Depends(get_db),
    patient: Patient = Depends(current_patient),
):
    patient.push_subscription = None
    db.commit()
    return {"subscribed": False}