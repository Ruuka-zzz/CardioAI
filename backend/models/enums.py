"""Enums. These must stay in step with shared/enums.js at the repo root.

shared/README.md requires one source of truth. Until a generator exists,
treat shared/enums.js as canonical and mirror any change here in the same PR.
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
    passes the rules in services/booking.py is confirmed on the spot.
    """

    confirmed = "confirmed"
    cancelled = "cancelled"
    completed = "completed"


class CheckInSlot(str, enum.Enum):
    morning = "morning"
    night = "night"


class Tristate(str, enum.Enum):
    """Yes / No / Don't know.

    "Don't know" is a real answer and must not be coerced into "no". A patient
    who doesn't know whether anyone in their family had heart disease is in a
    different position from one who knows nobody did — the first needs the
    question raised with a doctor, the second doesn't. Collapsing them would
    make the Prolog rules quietly wrong.
    """

    yes = "yes"
    no = "no"
    unknown = "unknown"


class ActivityLevel(str, enum.Enum):
    """Self-reported exercise level."""

    low = "low"
    moderate = "moderate"
    high = "high"


class OccupationActivity(str, enum.Enum):
    """How physical the patient's daily work is. Separate from exercise —
    someone can do no exercise and still be on their feet nine hours a day."""

    sedentary = "sedentary"
    light = "light"
    moderate = "moderate"
    high = "high"


class BreathlessnessTrigger(str, enum.Enum):
    """WHEN breathlessness happens, which is what grades its severity.

    This maps directly onto the NYHA functional classification, the standard
    scale for heart failure symptoms:

        none     -> no limitation
        stairs   -> NYHA II   (ordinary activity brings it on)
        walking  -> NYHA III  (less than ordinary activity)
        at_rest  -> NYHA IV   (symptoms at rest)

    Far more useful than a 0-3 severity slider: it is clinically recognised,
    citable, and a patient can answer it accurately without judging how
    "severe" something feels.
    """

    none = "none"
    stairs = "stairs"
    walking = "walking"
    at_rest = "at_rest"