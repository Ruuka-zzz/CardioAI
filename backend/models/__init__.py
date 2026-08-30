"""Re-exported so callers write `from models import Patient` and Alembic's
autogenerate sees every table through one import."""

from .base import Base, new_id
from .clinical import (
    DailyCheckIn, FamilyHistory, LifestyleHistory, MedicalRecord,
    MedicationHistory,
)
from .enums import (
    ActivityLevel, AppointmentStatus, BreathlessnessTrigger, CheckInSlot,
    ConditionStatus, OccupationActivity, RiskLevel, Role, Tristate, Urgency,
)
from .records import Appointment, AuditLog, ConsentRecord, NotificationLog
from .user import AvailabilitySlot, Doctor, Patient, User

__all__ = [
    "Base", "new_id",
    "Role", "RiskLevel", "ConditionStatus", "Urgency", "AppointmentStatus",
    "CheckInSlot", "Tristate", "ActivityLevel", "OccupationActivity",
    "BreathlessnessTrigger",
    "User", "Patient", "Doctor", "AvailabilitySlot",
    "MedicalRecord", "FamilyHistory", "LifestyleHistory", "MedicationHistory",
    "DailyCheckIn",
    "Appointment", "ConsentRecord", "AuditLog", "NotificationLog",
]