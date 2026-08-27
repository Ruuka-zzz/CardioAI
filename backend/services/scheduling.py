"""Rule-based appointment matching.

Deliberately not ML. "Is this doctor free at 3pm on Tuesday" has an exact
answer, and a model that got it right 97% of the time would be strictly worse
than a loop that gets it right every time.

Pure functions where possible so tests don't need a database.
"""

from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from config import get_settings
from models import Appointment, AppointmentStatus, AvailabilitySlot

settings = get_settings()


def _busy_starts(db: Session, doctor_id: str, since: datetime) -> set[datetime]:
    rows = (
        db.query(Appointment)
        .filter(
            Appointment.doctor_id == doctor_id,
            Appointment.starts_at >= since,
            Appointment.status == AppointmentStatus.confirmed,
        )
        .all()
    )
    return {row.starts_at for row in rows}


def expand_slots(
    rules: list[AvailabilitySlot],
    busy: set[datetime],
    now: datetime,
    days: int,
    minutes: int,
) -> list[tuple[datetime, datetime]]:
    """Turn recurring weekly availability into concrete open times.

    Split out from the database call so it can be tested directly — see
    tests/services/test_scheduling.py.
    """
    options: list[tuple[datetime, datetime]] = []
    step = timedelta(minutes=minutes)
    by_weekday: dict[int, list[AvailabilitySlot]] = {}

    for rule in rules:
        by_weekday.setdefault(rule.weekday, []).append(rule)

    day = now.replace(hour=0, minute=0, second=0, microsecond=0)

    for offset in range(days):
        current = day + timedelta(days=offset)
        for rule in by_weekday.get(current.weekday(), []):
            cursor = current.replace(
                hour=rule.start_time.hour, minute=rule.start_time.minute
            )
            window_end = current.replace(
                hour=rule.end_time.hour, minute=rule.end_time.minute
            )
            while cursor + step <= window_end:
                if cursor > now and cursor not in busy:
                    options.append((cursor, cursor + step))
                cursor += step

    return sorted(options, key=lambda pair: pair[0])


def open_slots(db: Session, doctor_id: str) -> list[tuple[datetime, datetime]]:
    now = datetime.utcnow()
    rules = db.query(AvailabilitySlot).filter_by(doctor_id=doctor_id).all()
    busy = _busy_starts(db, doctor_id, now)
    return expand_slots(
        rules,
        busy,
        now,
        settings.availability_horizon_days,
        settings.appointment_minutes,
    )


def within_availability(
    rules: list[AvailabilitySlot], starts_at: datetime, ends_at: datetime
) -> bool:
    return any(
        rule.weekday == starts_at.weekday()
        and rule.start_time <= starts_at.time()
        and ends_at.time() <= rule.end_time
        for rule in rules
    )


def has_clash(db: Session, doctor_id: str, starts_at: datetime, ends_at: datetime) -> bool:
    """Overlap, not equality — a booking that starts mid-slot still collides."""
    return (
        db.query(Appointment)
        .filter(
            Appointment.doctor_id == doctor_id,
            Appointment.starts_at < ends_at,
            Appointment.ends_at > starts_at,
            Appointment.status == AppointmentStatus.confirmed,
        )
        .first()
        is not None
    )