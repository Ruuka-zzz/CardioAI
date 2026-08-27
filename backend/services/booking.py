"""Appointment booking rules — every check, in one auditable place.

WHY THIS IS ITS OWN MODULE
The rules were previously scattered through the router, which made it
impossible to answer "what exactly do we check before creating a booking?"
without reading an endpoint end to end. They are now a named, ordered chain.
Adding a rule means adding a function here and one line to `validate_booking`.

THE CHAIN (order matters — cheapest and most-likely-to-fail first)

    1. doctor exists and is active
    2. the requested time is in the future
    3. the time falls inside the doctor's published hours
    4. that exact slot is not already taken
    5. the doctor's daily capacity for that window is not full
    6. the patient has no other appointment overlapping that time

Each check raises BookingRefused with a sentence a patient can act on.
Unlike sign-in, being specific here is correct: the person is authenticated,
it is their own booking, and "that slot was just taken" is genuinely more
useful than "booking failed".

NO APPROVAL STEP
A booking that passes all six is CONFIRMED immediately. Doctors do not accept
or reject — publishing hours is the consent. This is a deliberate product
decision: a patient who books and then waits to hear back is a patient who
doesn't know whether they have care, and for symptom-driven visits that
uncertainty is the thing the product exists to remove.
"""

from __future__ import annotations

from datetime import date, datetime, timedelta

from sqlalchemy.orm import Session

from config import get_settings
from models import (
    Appointment, AppointmentStatus, AvailabilitySlot, Doctor, Patient,
)

settings = get_settings()

# Bookings must be at least this far ahead. Without it, a patient can book a
# slot starting in 30 seconds, which no clinic can actually honour.
MIN_LEAD_MINUTES = 30

LIVE_STATUSES = (AppointmentStatus.confirmed,)


class BookingRefused(Exception):
    """A rule said no. `rule` names which one, for logging and for tests."""

    def __init__(self, rule: str, message: str):
        super().__init__(message)
        self.rule = rule
        self.message = message


# ------------------------------------------------------------------ checks

def _check_doctor(db: Session, doctor_id: str) -> Doctor:
    doctor = db.get(Doctor, doctor_id)
    if doctor is None or not doctor.activated:
        raise BookingRefused(
            "doctor_unavailable",
            "That doctor isn't taking appointments.",
        )
    return doctor


def _check_not_past(starts_at: datetime) -> None:
    now = datetime.utcnow()

    if starts_at <= now:
        raise BookingRefused(
            "time_in_past",
            "That time has already passed. Choose a later one.",
        )

    if starts_at < now + timedelta(minutes=MIN_LEAD_MINUTES):
        raise BookingRefused(
            "too_soon",
            f"Appointments need at least {MIN_LEAD_MINUTES} minutes' notice. "
            "Choose a later time.",
        )


def _check_within_hours(
    db: Session, doctor: Doctor, starts_at: datetime, ends_at: datetime
) -> AvailabilitySlot:
    """Returns the working-hours block the appointment sits inside.

    The block is needed by the capacity check, so this returns it rather than
    just passing or failing — otherwise the next check would have to look it
    up all over again.
    """
    rules = (
        db.query(AvailabilitySlot)
        .filter_by(doctor_id=doctor.id, weekday=starts_at.weekday())
        .all()
    )

    for rule in rules:
        if rule.start_time <= starts_at.time() and ends_at.time() <= rule.end_time:
            return rule

    raise BookingRefused(
        "outside_hours",
        f"{doctor.full_name} isn't seeing patients at that time. "
        "Pick one of the times shown.",
    )


def _check_slot_free(
    db: Session, doctor_id: str, starts_at: datetime, ends_at: datetime
) -> None:
    """Overlap, not equality — a booking starting mid-slot still collides."""
    clash = (
        db.query(Appointment)
        .filter(
            Appointment.doctor_id == doctor_id,
            Appointment.starts_at < ends_at,
            Appointment.ends_at > starts_at,
            Appointment.status.in_(LIVE_STATUSES),
        )
        .first()
    )

    if clash:
        raise BookingRefused(
            "slot_taken",
            "Someone booked that time just before you. Choose another.",
        )


def _check_capacity(
    db: Session, doctor: Doctor, block: AvailabilitySlot, on_date: date
) -> None:
    """Daily cap for one working-hours block.

    Slot exclusivity already limits how many appointments physically fit in a
    window. This is a second, lower ceiling a doctor can set — "I'll see 30
    people between 3 and 5" — for clinics that run a queue rather than fixed
    appointments.

    NOTE: with APPOINTMENT_MINUTES at 30, a two-hour block holds four slots,
    so a capacity above four never binds. Set the slot length to your real
    consultation time or this rule does nothing.
    """
    if not block.capacity:
        return  # unset means "as many as fit"

    window_start = datetime.combine(on_date, block.start_time)
    window_end = datetime.combine(on_date, block.end_time)

    booked = (
        db.query(Appointment)
        .filter(
            Appointment.doctor_id == doctor.id,
            Appointment.starts_at >= window_start,
            Appointment.starts_at < window_end,
            Appointment.status.in_(LIVE_STATUSES),
        )
        .count()
    )

    if booked >= block.capacity:
        raise BookingRefused(
            "capacity_full",
            f"{doctor.full_name} is fully booked between "
            f"{block.start_time:%H:%M} and {block.end_time:%H:%M} that day. "
            "Try another time or another day.",
        )


def _check_patient_free(
    db: Session, patient_id: str, starts_at: datetime, ends_at: datetime
) -> None:
    """A patient can't be in two consulting rooms at once.

    Checked across ALL doctors, not just this one — the point is to stop
    someone holding two overlapping slots with different doctors, which wastes
    a slot another patient needed.
    """
    clash = (
        db.query(Appointment)
        .filter(
            Appointment.patient_id == patient_id,
            Appointment.starts_at < ends_at,
            Appointment.ends_at > starts_at,
            Appointment.status.in_(LIVE_STATUSES),
        )
        .first()
    )

    if clash:
        other = db.get(Doctor, clash.doctor_id)
        raise BookingRefused(
            "patient_double_booked",
            f"You already have an appointment at that time"
            + (f" with {other.full_name}." if other else ".")
            + " Cancel it first if you'd like to move.",
        )


# ------------------------------------------------------------- entry points

def validate_booking(
    db: Session, patient: Patient, doctor_id: str, starts_at: datetime
) -> tuple[Doctor, datetime]:
    """Run the whole chain. Returns (doctor, ends_at) if every rule passes."""
    ends_at = starts_at + timedelta(minutes=settings.appointment_minutes)

    doctor = _check_doctor(db, doctor_id)
    _check_not_past(starts_at)
    block = _check_within_hours(db, doctor, starts_at, ends_at)
    _check_slot_free(db, doctor.id, starts_at, ends_at)
    _check_capacity(db, doctor, block, starts_at.date())
    _check_patient_free(db, patient.id, starts_at, ends_at)

    return doctor, ends_at


def create_appointment(
    db: Session, patient: Patient, doctor_id: str, starts_at: datetime,
    reason: str | None,
) -> Appointment:
    """Validate, then create — CONFIRMED, with no approval step."""
    doctor, ends_at = validate_booking(db, patient, doctor_id, starts_at)

    appointment = Appointment(
        patient_id=patient.id,
        doctor_id=doctor.id,
        starts_at=starts_at,
        ends_at=ends_at,
        reason=reason,
        status=AppointmentStatus.confirmed,
    )
    db.add(appointment)
    db.commit()
    db.refresh(appointment)
    return appointment


# ------------------------------------------------------------ cancellation

def cancel_appointment(
    db: Session, appointment: Appointment, by_role: str
) -> Appointment:
    """Cancel, subject to the notice period.

    The cutoff applies to PATIENTS only. A doctor who is called into surgery
    an hour before clinic has to be able to cancel, and the alternative — a
    patient turning up to an empty room — is worse than a late notification.
    Both cancellations are recorded with who did it.
    """
    if appointment.status is AppointmentStatus.cancelled:
        raise BookingRefused(
            "already_cancelled",
            "That appointment is already cancelled.",
        )

    now = datetime.utcnow()

    if appointment.starts_at <= now:
        raise BookingRefused(
            "already_started",
            "That appointment has already started and can't be cancelled here.",
        )

    if by_role == "patient":
        cutoff = appointment.starts_at - timedelta(
            hours=settings.cancellation_notice_hours
        )
        if now > cutoff:
            raise BookingRefused(
                "too_late_to_cancel",
                f"Appointments can only be cancelled at least "
                f"{settings.cancellation_notice_hours} hours ahead. "
                "Please contact the clinic directly.",
            )

    appointment.status = AppointmentStatus.cancelled
    appointment.cancelled_at = now
    appointment.cancelled_by = by_role
    db.commit()
    db.refresh(appointment)
    return appointment


def can_patient_cancel(appointment: Appointment) -> bool:
    """For the UI — hide or disable the button rather than let someone press
    it and be told no."""
    if appointment.status is not AppointmentStatus.confirmed:
        return False
    cutoff = appointment.starts_at - timedelta(
        hours=settings.cancellation_notice_hours
    )
    return datetime.utcnow() <= cutoff