"""Consent: the gate between a doctor's role and a patient's record.

Everything that reads a medical record goes through require_consent(). Nothing
else in the codebase should query ConsentRecord directly — one function means
one place to audit when someone asks "can a doctor see my history?"
"""

from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from models import AuditLog, ConsentRecord


def active_grant(db: Session, patient_id: str, doctor_id: str) -> ConsentRecord | None:
    return (
        db.query(ConsentRecord)
        .filter_by(patient_id=patient_id, doctor_id=doctor_id, revoked_at=None)
        .one_or_none()
    )


def list_grants(db: Session, patient_id: str) -> list[ConsentRecord]:
    return (
        db.query(ConsentRecord)
        .filter_by(patient_id=patient_id, revoked_at=None)
        .all()
    )


def grant(db: Session, patient_id: str, doctor_id: str) -> ConsentRecord:
    """Idempotent. Re-granting after a revoke reuses the row and clears
    revoked_at, so the unique (patient, doctor) constraint holds."""
    existing = (
        db.query(ConsentRecord)
        .filter_by(patient_id=patient_id, doctor_id=doctor_id)
        .one_or_none()
    )

    if existing:
        existing.revoked_at = None
        existing.granted_at = datetime.utcnow()
        record = existing
    else:
        record = ConsentRecord(patient_id=patient_id, doctor_id=doctor_id)
        db.add(record)

    db.commit()
    db.refresh(record)
    return record


def revoke(db: Session, patient_id: str, doctor_id: str) -> None:
    record = active_grant(db, patient_id, doctor_id)
    if record is None:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND, "Nothing is shared with this doctor."
        )
    record.revoked_at = datetime.utcnow()
    db.commit()


def require_consent(db: Session, patient_id: str, doctor_id: str) -> ConsentRecord:
    """403, not 404.

    404 would leak whether the patient exists at all, and the frontend relies
    on 403 specifically to show "not shared" rather than an error.
    """
    record = active_grant(db, patient_id, doctor_id)
    if record is None:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "This patient has not shared their record with you.",
        )
    return record


def log_access(
    db: Session,
    actor_user_id: str,
    patient_id: str,
    action: str,
    consent_record_id: str | None = None,
) -> None:
    db.add(
        AuditLog(
            actor_user_id=actor_user_id,
            patient_id=patient_id,
            action=action,
            consent_record_id=consent_record_id,
        )
    )
    db.commit()