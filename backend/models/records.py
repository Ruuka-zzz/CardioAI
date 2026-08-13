"""Scheduling, consent, and the audit trail.

ConsentRecord is a separate table from Appointment on purpose. Booking a
consultation and opening a medical record are different decisions, and the
schema has to keep them separable or the API can't enforce the difference.
"""

from datetime import datetime

from sqlalchemy import (
    Boolean, Column, DateTime, Enum, ForeignKey, String, UniqueConstraint,
)

from .base import Base, IdMixin, TimestampMixin
from .enums import AppointmentStatus, Urgency


class Appointment(Base, IdMixin, TimestampMixin):
    __tablename__ = "appointments"

    patient_id = Column(String, ForeignKey("patients.id"), nullable=False, index=True)
    doctor_id = Column(String, ForeignKey("doctors.id"), nullable=False, index=True)
    starts_at = Column(DateTime, nullable=False)
    ends_at = Column(DateTime, nullable=False)
    status = Column(
        Enum(AppointmentStatus), default=AppointmentStatus.requested, nullable=False
    )
    reason = Column(String, nullable=True)


class ConsentRecord(Base, IdMixin):
    """Explicit, revocable permission for one doctor to read one record.

    Revoking sets revoked_at rather than deleting the row, so the audit trail
    can still show that access existed during a past window.
    """

    __tablename__ = "consent_records"
    __table_args__ = (
        UniqueConstraint("patient_id", "doctor_id", name="uq_consent_pair"),
    )

    patient_id = Column(String, ForeignKey("patients.id"), nullable=False, index=True)
    doctor_id = Column(String, ForeignKey("doctors.id"), nullable=False, index=True)
    granted_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    revoked_at = Column(DateTime, nullable=True)

    @property
    def is_active(self) -> bool:
        return self.revoked_at is None


class AuditLog(Base, IdMixin):
    """Who read which record, when, and under which consent grant."""

    __tablename__ = "audit_logs"

    actor_user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    patient_id = Column(String, ForeignKey("patients.id"), nullable=False, index=True)
    action = Column(String, nullable=False)
    consent_record_id = Column(String, ForeignKey("consent_records.id"), nullable=True)
    occurred_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class NotificationLog(Base, IdMixin):
    """Written before dispatch, so a failed send is still visible."""

    __tablename__ = "notification_logs"

    patient_id = Column(String, ForeignKey("patients.id"), nullable=False, index=True)
    channel = Column(String, nullable=False)  # push | sms | email
    urgency = Column(Enum(Urgency), nullable=False)
    body = Column(String, nullable=False)
    delivered = Column(Boolean, default=False, nullable=False)
    sent_at = Column(DateTime, default=datetime.utcnow, nullable=False)