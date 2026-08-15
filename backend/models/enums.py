"""Enums. These must stay in step with shared/enums.js at the repo root.

shared/README.md requires one source of truth. Until a generator exists, treat
shared/enums.js as canonical and mirror any change here in the same PR.
"""

import enum


class Role(str, enum.Enum):
    patient = "patient"
    doctor = "doctor"
    admin = "admin"


class RiskLevel(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"


class ConditionStatus(str, enum.Enum):
    good = "good"
    fair = "fair"
    bad = "bad"


class Urgency(str, enum.Enum):
    routine = "routine"
    elevated = "elevated"
    emergency = "emergency"


class AppointmentStatus(str, enum.Enum):
    requested = "requested"
    confirmed = "confirmed"
    declined = "declined"
    cancelled = "cancelled"


class CheckInSlot(str, enum.Enum):
    morning = "morning"
    night = "night"