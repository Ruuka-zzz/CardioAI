"""Admin: issue doctor activation codes, manage accounts, read the audit log.

No AI anywhere in this module by design — it is account administration.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from api.deps import require_admin
from database.session import get_db
from models import Appointment, AuditLog, Doctor, Patient, User
from schemas import AdminAppointmentView, AuditEntry, DoctorAdminView, IssueDoctorRequest
from services.security import generate_activation_code

router = APIRouter(
    prefix="/api/admin", tags=["admin"], dependencies=[Depends(require_admin)]
)


@router.get("/doctors", response_model=list[DoctorAdminView])
def list_doctors(db: Session = Depends(get_db)):
    """Unused codes are shown so an admin can resend one. Used codes are
    withheld — once activated the code is spent and showing it is pure risk."""
    return [
        DoctorAdminView(
            id=d.id,
            full_name=d.full_name,
            specialty=d.specialty,
            bio=d.bio,
            activated=d.activated,
            activation_code=None if d.activated else d.activation_code,
        )
        for d in db.query(Doctor).order_by(Doctor.full_name).all()
    ]


@router.post("/doctors", response_model=DoctorAdminView, status_code=201)
def issue_doctor_code(body: IssueDoctorRequest, db: Session = Depends(get_db)):
    """Creates an unactivated doctor profile and returns its one-time code.

    Retries on the (astronomically unlikely) code collision rather than
    failing the request.
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

    doctor = Doctor(
        full_name=body.full_name,
        specialty=body.specialty,
        bio=body.bio,
        activation_code=code,
    )
    db.add(doctor)
    db.commit()
    db.refresh(doctor)

    return DoctorAdminView(
        id=doctor.id,
        full_name=doctor.full_name,
        specialty=doctor.specialty,
        bio=doctor.bio,
        activated=False,
        activation_code=doctor.activation_code,
    )


@router.delete("/doctors/{doctor_id}", status_code=200)
def remove_doctor(doctor_id: str, db: Session = Depends(get_db)):
    """Deactivates rather than deletes.

    Appointments, consent records, and audit entries all reference this
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

    It exposes names, time and status only; clinical reason and patient record
    data remain confined to the patient/clinician workflows.
    """
    rows = (
        db.query(Appointment)
        .order_by(Appointment.starts_at.desc())
        .limit(min(limit, 500))
        .all()
    )
    return [
        AdminAppointmentView(
            id=row.id,
            patient_name=(db.get(Patient, row.patient_id).full_name if db.get(Patient, row.patient_id) else None),
            doctor_name=(db.get(Doctor, row.doctor_id).full_name if db.get(Doctor, row.doctor_id) else None),
            starts_at=row.starts_at,
            ends_at=row.ends_at,
            status=row.status.value,
        )
        for row in rows
    ]


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
