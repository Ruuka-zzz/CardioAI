"""Doctor discovery, booking, cancellation, consent, and record access.

Booking rules live in services/booking.py, not here. This module's job is
HTTP: take a request, hand it to the rules, turn a refusal into a 409 with the
rule's own wording. If you find yourself adding an `if` about times or
capacity to this file, it belongs in the rules module instead.

TWO THINGS A DOCTOR SEES WITHOUT CONSENT: who is coming (name, age, sex) and
why (the reason they typed). Both are things the patient supplied precisely so
the doctor would have them. The medical record is different and still gated —
see services/consent.py.
"""

from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from api.deps import current_doctor, current_patient
from config import get_settings
from database.session import get_db
from models import (
    Appointment, AppointmentStatus, AvailabilitySlot, ConsentRecord,
    DailyCheckIn, Doctor, FamilyHistory, Patient,
)
from schemas import (
    AppointmentRequest, AppointmentResponse, CancelRequest, CheckInSummary,
    ConsentRequest, ConsentResponse, DoctorPublic, FamilyHistoryEntry,
    PatientRecordResponse, PatientSummary, SlotOption,
)
from services import booking as booking_rules
from services import consent as consent_service
from services import scheduling

router = APIRouter(prefix="/api", tags=["appointments"])
settings = get_settings()

WEEKDAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]


# ---------------------------------------------------------------- helpers

def _age_from(dob: date | None) -> int | None:
    if dob is None:
        return None
    today = date.today()
    return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))


def _working_days(db: Session, doctor_id: str) -> list[str]:
    rules = (
        db.query(AvailabilitySlot)
        .filter_by(doctor_id=doctor_id)
        .order_by(AvailabilitySlot.weekday, AvailabilitySlot.start_time)
        .all()
    )
    return [
        f"{WEEKDAY_SHORT[r.weekday]} {r.start_time:%H:%M}-{r.end_time:%H:%M}"
        for r in rules
    ]


def _to_response(db: Session, a: Appointment, *, for_doctor: bool) -> AppointmentResponse:
    doctor = db.get(Doctor, a.doctor_id)
    patient = db.get(Patient, a.patient_id)

    return AppointmentResponse(
        id=a.id,
        doctor_id=a.doctor_id,
        doctor_name=doctor.full_name if doctor else None,
        hospital=doctor.hospital if doctor else None,
        # A doctor sees who is coming; a patient looking at their own list
        # doesn't need their own name echoed back.
        patient_name=patient.full_name if (for_doctor and patient) else None,
        patient_age=_age_from(patient.date_of_birth) if (for_doctor and patient) else None,
        patient_sex=patient.sex if (for_doctor and patient) else None,
        starts_at=a.starts_at,
        ends_at=a.ends_at,
        status=a.status.value,
        reason=a.reason,
        record_shared=consent_service.active_grant(db, a.patient_id, a.doctor_id)
        is not None,
        can_cancel=booking_rules.can_patient_cancel(a),
        cancelled_by=a.cancelled_by,
    )


def _refuse(err: booking_rules.BookingRefused):
    """Rule refusals are 409 Conflict — the request was well-formed, the
    world just isn't in a state that allows it."""
    raise HTTPException(status.HTTP_409_CONFLICT, err.message)


# -------------------------------------------------------------- discovery

@router.get("/doctors", response_model=list[DoctorPublic])
def list_doctors(specialty: str | None = None, db: Session = Depends(get_db)):
    """Public profiles. Never activation codes, never contact details."""
    query = db.query(Doctor).filter_by(activated=True)
    if specialty:
        query = query.filter(Doctor.specialty == specialty)

    out: list[DoctorPublic] = []
    for d in query.order_by(Doctor.full_name).all():
        slots = scheduling.open_slots(db, d.id)
        out.append(DoctorPublic(
            id=d.id,
            staff_id=d.staff_id,
            full_name=d.full_name,
            specialty=d.specialty,
            bio=d.bio,
            hospital=d.hospital,
            address=d.address,
            working_days=_working_days(db, d.id),
            next_available=slots[0][0] if slots else None,
        ))
    return out


@router.get("/doctors/{doctor_id}/availability", response_model=list[SlotOption])
def availability(doctor_id: str, db: Session = Depends(get_db)):
    doctor = db.get(Doctor, doctor_id)
    if doctor is None or not doctor.activated:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Doctor not found")

    return [
        SlotOption(starts_at=start, ends_at=end)
        for start, end in scheduling.open_slots(db, doctor_id)
    ]


# ---------------------------------------------------------------- booking

@router.get("/appointments", response_model=list[AppointmentResponse])
def my_appointments(
    include_past: bool = False,
    db: Session = Depends(get_db),
    patient: Patient = Depends(current_patient),
):
    query = db.query(Appointment).filter_by(patient_id=patient.id)
    if not include_past:
        query = query.filter(Appointment.starts_at >= datetime.utcnow())

    rows = query.order_by(Appointment.starts_at).all()
    return [_to_response(db, a, for_doctor=False) for a in rows]


@router.post("/appointments", response_model=AppointmentResponse, status_code=201)
def book_appointment(
    body: AppointmentRequest,
    db: Session = Depends(get_db),
    patient: Patient = Depends(current_patient),
):
    """Confirmed on the spot if every rule passes — there is no approval step.

    The full chain is in services/booking.py: doctor active, time in the
    future, inside published hours, slot free, block not at capacity, patient
    not already booked elsewhere at that time.
    """
    try:
        appointment = booking_rules.create_appointment(
            db,
            patient=patient,
            doctor_id=body.doctor_id,
            starts_at=body.starts_at,
            reason=body.reason,
        )
    except booking_rules.BookingRefused as err:
        _refuse(err)

    return _to_response(db, appointment, for_doctor=False)


@router.post("/appointments/{appointment_id}/cancel",
             response_model=AppointmentResponse)
def cancel_as_patient(
    appointment_id: str,
    body: CancelRequest | None = None,
    db: Session = Depends(get_db),
    patient: Patient = Depends(current_patient),
):
    appointment = db.get(Appointment, appointment_id)
    if appointment is None or appointment.patient_id != patient.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Appointment not found")

    try:
        booking_rules.cancel_appointment(db, appointment, by_role="patient")
    except booking_rules.BookingRefused as err:
        _refuse(err)

    return _to_response(db, appointment, for_doctor=False)


# ---------------------------------------------------------------- consent

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
    """Patients who have booked, or who have shared their record.

    Appearing here says nothing about whether the record is readable —
    `record_shared` does.
    """
    ids = {
        row.patient_id
        for row in db.query(Appointment).filter_by(doctor_id=doctor.id).all()
    }
    ids |= {
        g.patient_id
        for g in db.query(ConsentRecord)
        .filter_by(doctor_id=doctor.id, revoked_at=None)
        .all()
    }

    out: list[PatientSummary] = []
    for pid in ids:
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


@router.get("/doctor/appointments", response_model=list[AppointmentResponse])
def doctor_appointments(
    include_past: bool = False,
    db: Session = Depends(get_db),
    doctor: Doctor = Depends(current_doctor),
):
    query = db.query(Appointment).filter_by(doctor_id=doctor.id)
    if not include_past:
        query = query.filter(Appointment.starts_at >= datetime.utcnow())

    rows = query.order_by(Appointment.starts_at).all()
    return [_to_response(db, a, for_doctor=True) for a in rows]


@router.post("/doctor/appointments/{appointment_id}/cancel",
             response_model=AppointmentResponse)
def cancel_as_doctor(
    appointment_id: str,
    body: CancelRequest | None = None,
    db: Session = Depends(get_db),
    doctor: Doctor = Depends(current_doctor),
):
    """Doctors are not held to the notice period.

    Someone called into surgery an hour before clinic has to be able to
    cancel — a patient arriving to an empty room is worse than a late
    notification.
    """
    appointment = db.get(Appointment, appointment_id)
    if appointment is None or appointment.doctor_id != doctor.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Appointment not found")

    try:
        booking_rules.cancel_appointment(db, appointment, by_role="doctor")
    except booking_rules.BookingRefused as err:
        _refuse(err)

    return _to_response(db, appointment, for_doctor=True)


@router.get("/doctor/patients/{patient_id}/record",
            response_model=PatientRecordResponse)
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

    consent_service.log_access(db, doctor.user_id, patient_id, "read_record", grant.id)

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