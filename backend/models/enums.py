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
    """No `requested` or `declined`.

    Publishing working hours IS the doctor's consent, so a booking that
    passes the rules in services/booking.py is confirmed on the spot. A
    patient who books and then waits to hear back doesn't know whether they
    have care — which is the uncertainty this product exists to remove.
    """

    confirmed = "confirmed"
    cancelled = "cancelled"
    completed = "completed"


class CheckInSlot(str, enum.Enum):
    morning = "morning"
    night = "night"