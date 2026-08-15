"""Doctor discovery, booking, consent, and the consent-gated record read.

Booking and consent are separate endpoints. A confirmed appointment gives a
doctor your time; only a consent grant gives them your history.
"""

from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from api.deps import current_doctor, current_patient
from config import get_settings
from database.session import get_db
from models import (
    Appointment, AppointmentStatus, AvailabilitySlot, ConsentRecord, DailyCheckIn,
    Doctor, FamilyHistory, Patient,
)
from schemas import (
    AppointmentDecision, AppointmentRequest, AppointmentResponse, CheckInSummary,
    ConsentRequest, ConsentResponse, DoctorPublic, FamilyHistoryEntry,
    PatientRecordResponse, PatientSummary, SlotOption,
)
from services import consent as consent_service
from services import scheduling

router = APIRouter(prefix="/api", tags=["doctors"])
settings = get_settings()


# ------------------------------------------------------------- discovery

@router.get("/doctors", response_model=list[DoctorPublic])
def list_doctors(specialty: str | None = None, db: Session = Depends(get_db)):
    """Public profiles only — never activation codes or contact details."""
    query = db.query(Doctor).filter_by(activated=True)
    if specialty:
        query = query.filter(Doctor.specialty == specialty)

    return [
        DoctorPublic(id=d.id, full_name=d.full_name, specialty=d.specialty, bio=d.bio)
        for d in query.all()
    ]


@router.get("/doctors/{doctor_id}/availability", response_model=list[SlotOption])
def availability(doctor_id: str, db: Session = Depends(get_db)):
    doctor = db.get(Doctor, doctor_id)
    if doctor is None or not doctor.activated:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Doctor not found")

    return [
        SlotOption(starts_at=start, ends_at=end)
        for start, end in scheduling.open_slots(db, doctor_id)
    ]


# --------------------------------------------------------------- booking

@router.get("/appointments", response_model=list[AppointmentResponse])
def my_appointments(
    db: Session = Depends(get_db),
    patient: Patient = Depends(current_patient),
):
    rows = (
        db.query(Appointment)
        .filter_by(patient_id=patient.id)
        .order_by(Appointment.starts_at)
        .all()
    )
    return [
        AppointmentResponse(
            id=a.id, doctor_id=a.doctor_id, starts_at=a.starts_at,
            ends_at=a.ends_at, status=a.status.value, reason=a.reason,
            record_shared=consent_service.active_grant(db, patient.id, a.doctor_id)
            is not None,
        )
        for a in rows
    ]


@router.post("/appointments", response_model=AppointmentResponse, status_code=201)
def request_appointment(
    body: AppointmentRequest,
    db: Session = Depends(get_db),
    patient: Patient = Depends(current_patient),
):
    doctor = db.get(Doctor, body.doctor_id)
    if doctor is None or not doctor.activated:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Doctor not found")

    ends_at = body.starts_at + timedelta(minutes=settings.appointment_minutes)
    rules = db.query(AvailabilitySlot).filter_by(doctor_id=doctor.id).all()

    if not scheduling.within_availability(rules, body.starts_at, ends_at):
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "That time is outside this doctor's available hours.",
        )

    if scheduling.has_clash(db, doctor.id, body.starts_at, ends_at):
        raise HTTPException(status.HTTP_409_CONFLICT, "That slot is already taken.")

    appointment = Appointment(
        patient_id=patient.id,
        doctor_id=doctor.id,
        starts_at=body.starts_at,
        ends_at=ends_at,
        reason=body.reason,
    )
    db.add(appointment)
    db.commit()
    db.refresh(appointment)

    return AppointmentResponse(
        id=appointment.id,
        doctor_id=doctor.id,
        starts_at=appointment.starts_at,
        ends_at=appointment.ends_at,
        status=appointment.status.value,
        reason=appointment.reason,
        # Booking alone shares nothing.
        record_shared=consent_service.active_grant(db, patient.id, doctor.id) is not None,
    )


# --------------------------------------------------------------- consent

@router.get("/consents", response_model=list[ConsentResponse])
def my_consents(
    db: Session = Depends(get_db),
    patient: Patient = Depends(current_patient),
):
    return [
        ConsentResponse(doctor_id=g.doctor_id, shared=True, granted_at=g.granted_at)
        for g in consent_service.list_grants(db, patient.id)
    ]


@router.post("/consents", response_model=ConsentResponse, status_code=201)
def grant_consent(
    body: ConsentRequest,
    db: Session = Depends(get_db),
    patient: Patient = Depends(current_patient),
):
    """Only the patient can open their record. There is no admin override."""
    if db.get(Doctor, body.doctor_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Doctor not found")

    record = consent_service.grant(db, patient.id, body.doctor_id)
    return ConsentResponse(
        doctor_id=record.doctor_id, shared=True, granted_at=record.granted_at
    )


@router.delete("/consents/{doctor_id}", response_model=ConsentResponse)
def revoke_consent(
    doctor_id: str,
    db: Session = Depends(get_db),
    patient: Patient = Depends(current_patient),
):
    consent_service.revoke(db, patient.id, doctor_id)
    return ConsentResponse(doctor_id=doctor_id, shared=False)


# ----------------------------------------------------------- doctor views

@router.get("/doctor/patients", response_model=list[PatientSummary])
def connected_patients(
    db: Session = Depends(get_db),
    doctor: Doctor = Depends(current_doctor),
):
    """Patients who have booked with this doctor. Appearing here says nothing
    about whether their record is readable — record_shared does."""
    patient_ids = {
        row.patient_id
        for row in db.query(Appointment).filter_by(doctor_id=doctor.id).all()
    }
    patient_ids |= {
        g.patient_id
        for g in db.query(ConsentRecord)
        .filter_by(doctor_id=doctor.id, revoked_at=None)
        .all()
    }

    out: list[PatientSummary] = []
    for pid in patient_ids:
        patient = db.get(Patient, pid)
        if patient is None:
            continue
        out.append(PatientSummary(
            id=patient.id,
            full_name=patient.full_name,
            record_shared=consent_service.active_grant(db, patient.id, doctor.id)
            is not None,
        ))
    return sorted(out, key=lambda p: p.full_name)


@router.get("/doctor/patients/{patient_id}/record", response_model=PatientRecordResponse)
def read_patient_record(
    patient_id: str,
    db: Session = Depends(get_db),
    doctor: Doctor = Depends(current_doctor),
):
    """The gate. Role gets you to this line; consent gets you past it."""
    grant = consent_service.require_consent(db, patient_id, doctor.id)  # 403 if absent

    patient = db.get(Patient, patient_id)
    if patient is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Patient not found")

    consent_service.log_access(
        db, doctor.user_id, patient_id, "read_record", grant.id
    )

    checkins = (
        db.query(DailyCheckIn)
        .filter_by(patient_id=patient_id)
        .filter(DailyCheckIn.status.isnot(None))
        .order_by(DailyCheckIn.created_at.desc())
        .limit(14)
        .all()
    )

    record = patient.medical_record
    history = db.query(FamilyHistory).filter_by(patient_id=patient_id).all()

    return PatientRecordResponse(
        patient_id=patient.id,
        full_name=patient.full_name,
        baseline_risk=patient.baseline_risk.value if patient.baseline_risk else None,
        medical_record={
            c.name: getattr(record, c.name)
            for c in record.__table__.columns
            if c.name not in {"id", "patient_id"}
        } if record else None,
        family_history=[
            FamilyHistoryEntry(
                relation=h.relation,
                condition=h.condition,
                age_at_diagnosis=h.age_at_diagnosis,
            )
            for h in history
        ],
        recent_checkins=[
            CheckInSummary(
                date=c.check_date.isoformat(),
                slot=c.slot.value,
                status=c.status.value if c.status else None,
                score=c.score,
                fired_rules=c.fired_rules or [],
            )
            for c in checkins
        ],
    )


@router.get("/doctor/appointments", response_model=list[AppointmentResponse])
def doctor_appointments(
    db: Session = Depends(get_db),
    doctor: Doctor = Depends(current_doctor),
):
    rows = (
        db.query(Appointment)
        .filter_by(doctor_id=doctor.id)
        .order_by(Appointment.starts_at)
        .all()
    )

    out: list[AppointmentResponse] = []
    for a in rows:
        patient = db.get(Patient, a.patient_id)
        out.append(AppointmentResponse(
            id=a.id,
            doctor_id=a.doctor_id,
            patient_name=patient.full_name if patient else None,
            starts_at=a.starts_at,
            ends_at=a.ends_at,
            status=a.status.value,
            reason=a.reason,
            record_shared=consent_service.active_grant(db, a.patient_id, doctor.id)
            is not None,
        ))
    return out


@router.patch("/doctor/appointments/{appointment_id}", response_model=AppointmentResponse)
def respond_to_appointment(
    appointment_id: str,
    body: AppointmentDecision,
    db: Session = Depends(get_db),
    doctor: Doctor = Depends(current_doctor),
):
    appointment = db.get(Appointment, appointment_id)
    if appointment is None or appointment.doctor_id != doctor.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Appointment not found")

    appointment.status = AppointmentStatus(body.status)
    db.commit()
    db.refresh(appointment)

    patient = db.get(Patient, appointment.patient_id)
    return AppointmentResponse(
        id=appointment.id,
        doctor_id=appointment.doctor_id,
        patient_name=patient.full_name if patient else None,
        starts_at=appointment.starts_at,
        ends_at=appointment.ends_at,
        status=appointment.status.value,
        reason=appointment.reason,
        record_shared=consent_service.active_grant(db, appointment.patient_id, doctor.id)
        is not None,
    )