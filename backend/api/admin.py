"""Admin: issue doctor activation codes, manage accounts, read the audit log.

No AI anywhere in this module by design — it is account administration.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from api.deps import require_admin
from database.session import get_db
from models import Appointment, AuditLog, Doctor, Patient, User
from schemas import (
    AdminAppointmentView, AuditEntry, DoctorAdminView, IssueDoctorRequest,
)
from services.security import generate_activation_code, generate_staff_id

router = APIRouter(
    prefix="/api/admin", tags=["admin"], dependencies=[Depends(require_admin)]
)


def _to_view(doctor: Doctor) -> DoctorAdminView:
    return DoctorAdminView(
        id=doctor.id,
        staff_id=doctor.staff_id,
        full_name=doctor.full_name,
        specialty=doctor.specialty,
        qualifications=doctor.qualifications,
        hospital=doctor.hospital,
        bio=doctor.bio,
        activated=doctor.activated,
        # Unused codes are shown so an admin can resend one. Used codes are
        # withheld: once activated the code is spent, and showing it is pure
        # risk with no remaining purpose.
        activation_code=None if doctor.activated else doctor.activation_code,
    )


@router.get("/doctors", response_model=list[DoctorAdminView])
def list_doctors(db: Session = Depends(get_db)):
    return [
        _to_view(d)
        for d in db.query(Doctor).order_by(Doctor.staff_id, Doctor.full_name).all()
    ]


@router.post("/doctors", response_model=DoctorAdminView, status_code=201)
def issue_doctor_code(body: IssueDoctorRequest, db: Session = Depends(get_db)):
    """Creates an unactivated doctor profile with a roll number and a one-time
    activation code.

    BOTH ARE ISSUED HERE, AND THEY ARE NOT THE SAME THING.
      - staff_id (CA-DOC-0001) is a permanent, public identifier. The doctor
        signs in with it, it appears on their dashboard, and it can be read
        out over the phone.
      - activation_code is a one-time secret that claims the account, then is
        spent.

    A doctor created without a staff_id cannot sign in at all, because the
    login form asks for a roll number — so the two must be issued together.
    """
    for _ in range(5):
        code = generate_activation_code()
        if not db.query(Doctor).filter_by(activation_code=code).first():
            break
    else:
        raise HTTPException(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            "Couldn't generate a unique activation code. Try again.",
        )

    # Sequential doctor number. Counting rows is fine at this scale; if two
    # admins issue at the same instant the unique constraint rejects the
    # loser, and they retry.
    staff_id = generate_staff_id(db.query(Doctor).count() + 1)

    doctor = Doctor(
        full_name=body.full_name,
        specialty=body.specialty,
        qualifications=body.qualifications,
        hospital=body.hospital,
        address=body.address,
        bio=body.bio,
        staff_id=staff_id,
        activation_code=code,
    )
    db.add(doctor)
    db.commit()
    db.refresh(doctor)

    return _to_view(doctor)


@router.delete("/doctors/{doctor_id}", status_code=200)
def remove_doctor(doctor_id: str, db: Session = Depends(get_db)):
    """Deactivates rather than deletes.

    Appointments, consent records and audit entries all reference this
    doctor. Deleting the row would either cascade away medical history or
    orphan the audit trail — both unacceptable in a clinical system.
    """
    doctor = db.get(Doctor, doctor_id)
    if doctor is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Doctor not found")

    doctor.activated = False
    if doctor.user_id:
        user = db.get(User, doctor.user_id)
        if user:
            user.is_active = False

    db.commit()
    return {"id": doctor_id, "activated": False}


@router.get("/appointments", response_model=list[AdminAppointmentView])
def list_appointments(limit: int = 100, db: Session = Depends(get_db)):
    """Operational appointment list for the administration dashboard.

    Names, time and status only. The reason a patient gave and anything from
    their record stay out — an administrator needs to see that the clinic is
    running, not why someone is attending.
    """
    rows = (
        db.query(Appointment)
        .order_by(Appointment.starts_at.desc())
        .limit(min(limit, 500))
        .all()
    )

    # Names are looked up once per row rather than twice. The original did
    # db.get twice per appointment for each of patient and doctor — four
    # queries a row, and at 500 rows that is 2,000 round trips.
    out: list[AdminAppointmentView] = []
    for row in rows:
        patient = db.get(Patient, row.patient_id)
        doctor = db.get(Doctor, row.doctor_id)
        out.append(AdminAppointmentView(
            id=row.id,
            patient_name=patient.full_name if patient else None,
            doctor_name=doctor.full_name if doctor else None,
            starts_at=row.starts_at,
            ends_at=row.ends_at,
            status=row.status.value,
        ))
    return out


@router.get("/audit-log", response_model=list[AuditEntry])
def audit_log(limit: int = 100, db: Session = Depends(get_db)):
    rows = (
        db.query(AuditLog)
        .order_by(AuditLog.occurred_at.desc())
        .limit(min(limit, 500))
        .all()
    )

    out: list[AuditEntry] = []
    for row in rows:
        actor = db.get(User, row.actor_user_id)
        name = None
        if actor and actor.doctor:
            name = actor.doctor.full_name
        elif actor:
            name = actor.email

        out.append(AuditEntry(
            id=row.id,
            actor_user_id=row.actor_user_id,
            actor_name=name,
            patient_id=row.patient_id,
            action=row.action,
            occurred_at=row.occurred_at,
        ))
    return out