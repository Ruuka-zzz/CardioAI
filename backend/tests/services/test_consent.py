"""Tests for services/consent.py — the record access gate.

These are the most important tests in the backend. Everything else failing is
a bug; this failing is a privacy breach.
"""

import pytest
from fastapi import HTTPException

from services import consent as consent_service


def test_no_grant_means_no_access(db, patient, doctor):
    assert consent_service.active_grant(db, patient.id, doctor.id) is None


def test_require_consent_raises_403_not_404(db, patient, doctor):
    """403 specifically. 404 would leak whether the patient exists, and the
    frontend routes on 403 to show 'not shared' rather than an error."""
    with pytest.raises(HTTPException) as exc:
        consent_service.require_consent(db, patient.id, doctor.id)

    assert exc.value.status_code == 403


def test_grant_then_read(db, patient, doctor):
    consent_service.grant(db, patient.id, doctor.id)
    record = consent_service.require_consent(db, patient.id, doctor.id)

    assert record.is_active


def test_revoke_closes_access(db, patient, doctor):
    consent_service.grant(db, patient.id, doctor.id)
    consent_service.revoke(db, patient.id, doctor.id)

    with pytest.raises(HTTPException) as exc:
        consent_service.require_consent(db, patient.id, doctor.id)

    assert exc.value.status_code == 403


def test_regrant_reuses_the_row(db, patient, doctor):
    """The unique (patient, doctor) constraint means re-granting must clear
    revoked_at rather than insert a second row."""
    first = consent_service.grant(db, patient.id, doctor.id)
    consent_service.revoke(db, patient.id, doctor.id)
    second = consent_service.grant(db, patient.id, doctor.id)

    assert first.id == second.id
    assert second.revoked_at is None


def test_revoke_preserves_the_row_for_audit(db, patient, doctor):
    from models import ConsentRecord

    consent_service.grant(db, patient.id, doctor.id)
    consent_service.revoke(db, patient.id, doctor.id)

    row = db.query(ConsentRecord).filter_by(
        patient_id=patient.id, doctor_id=doctor.id
    ).one()
    assert row.revoked_at is not None  # deleted would erase the access window


def test_access_is_logged(db, patient, doctor):
    from models import AuditLog

    grant = consent_service.grant(db, patient.id, doctor.id)
    consent_service.log_access(db, doctor.user_id, patient.id, "read_record", grant.id)

    entries = db.query(AuditLog).filter_by(patient_id=patient.id).all()
    assert len(entries) == 1
    assert entries[0].action == "read_record"


def test_booking_does_not_grant_access(db, patient, doctor, client, patient_auth):
    """Booking gives a doctor your time, not your history."""
    from datetime import datetime, timedelta

    from models import Appointment

    start = datetime.utcnow() + timedelta(days=1)
    db.add(Appointment(
        patient_id=patient.id, doctor_id=doctor.id,
        starts_at=start, ends_at=start + timedelta(minutes=30),
    ))
    db.commit()

    assert consent_service.active_grant(db, patient.id, doctor.id) is None