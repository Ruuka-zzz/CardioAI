"""Patient routes: onboarding intake, daily check-in, history, reminders."""

from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from api.deps import current_patient
from database.session import get_db
from models import (
    CheckInSlot, ConditionStatus, DailyCheckIn, FamilyHistory, MedicalRecord,
    Patient, Urgency,
)
from schemas import (
    BaselineRiskResponse, CheckInRequest, ConditionReport, IntakeRequest, Reminder,
)
from services import clients

router = APIRouter(prefix="/api/patients", tags=["patients"])

DISCLAIMER = (
    "This is a self-monitoring aid, not a medical diagnosis. If you feel unwell, "
    "contact a doctor or your local emergency service."
)


def _to_report(row: DailyCheckIn) -> ConditionReport:
    return ConditionReport(
        checkin_id=row.id,
        created_at=row.created_at,
        status=row.status.value,
        score=row.score,
        urgency=row.urgency.value,
        recommendation=row.recommendation,
        fired_rules=row.fired_rules or [],
        disclaimer=DISCLAIMER,
    )


# ------------------------------------------------- onboarding -> ML baseline

@router.post("/me/intake", response_model=BaselineRiskResponse, status_code=201)
def submit_intake(
    body: IntakeRequest,
    db: Session = Depends(get_db),
    patient: Patient = Depends(current_patient),
):
    if patient.onboarding_complete:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Your intake is already complete. New clinical results are added "
            "separately.",
        )

    data = body.model_dump(exclude={"family_history"})
    record = MedicalRecord(patient_id=patient.id, **data)
    db.add(record)

    for entry in body.family_history or []:
        db.add(FamilyHistory(patient_id=patient.id, **entry.model_dump()))

    db.flush()

    # Raises 503 if ml-service is down — a delayed baseline beats a wrong one.
    result = clients.assess_baseline_risk(record)

    patient.baseline_risk = result["risk_level"]
    patient.baseline_score = result["score"]
    patient.baseline_computed_at = datetime.utcnow()
    patient.onboarding_complete = True
    db.commit()

    return BaselineRiskResponse(
        baseline_risk=patient.baseline_risk.value,
        baseline_score=patient.baseline_score,
        computed_at=patient.baseline_computed_at,
        disclaimer=DISCLAIMER,
    )


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
            "Complete your intake form before your first check-in.",
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
        **body.model_dump(exclude={"slot"}),
        slot=slot,
    )
    db.add(checkin)
    db.flush()

    triage = clients.run_triage(checkin, patient.baseline_risk)

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
            status.HTTP_409_CONFLICT, "Complete your intake form first."
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
    """Outstanding nudges for today.

    Currently only the missed-check-in nudge, computed on read. When
    notification-service grows a schedule, this should read from it rather than
    recomputing here.
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