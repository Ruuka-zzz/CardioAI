"""Re-exported so callers write `from models import Patient` and Alembic's
autogenerate sees every table through one import."""

from .base import Base, new_id
from .clinical import DailyCheckIn, FamilyHistory, MedicalRecord
from .enums import (
    AppointmentStatus, CheckInSlot, ConditionStatus, RiskLevel, Role, Urgency,
)
from .records import Appointment, AuditLog, ConsentRecord, NotificationLog
from .user import AvailabilitySlot, Doctor, Patient, User

__all__ = [
    "Base", "new_id",
    "Role", "RiskLevel", "ConditionStatus", "Urgency", "AppointmentStatus",
    "CheckInSlot",
    "User", "Patient", "Doctor", "AvailabilitySlot",
    "MedicalRecord", "FamilyHistory", "DailyCheckIn",
    "Appointment", "ConsentRecord", "AuditLog", "NotificationLog",
]