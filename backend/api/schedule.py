"""Doctor's own schedule: working hours, and the calendar that results.

Separate from api/doctors.py because the audience is different. That module is
mostly patient-facing — browsing doctors, booking, consent. This one is a
doctor managing their own time, and mixing the two makes it easy to lose
track of which endpoints a patient can reach.

THE KEY IDEA
------------
Availability is stored as recurring weekly rules, not as individual bookable
slots. A doctor says "Mondays 9-12" once; scheduling.expand_slots turns that
into concrete times on demand, minus whatever is already booked.

Storing individual slots instead would mean generating rows forward forever,
regenerating them when hours change, and reconciling bookings against slots
that no longer exist. Rules plus expansion has none of those problems.
"""

from datetime import date, datetime, time, timedelta
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, model_validator
from sqlalchemy.orm import Session

from api.deps import current_doctor
from config import get_settings
from database.session import get_db
from models import Appointment, AppointmentStatus, AvailabilitySlot, Doctor, Patient
from services import consent as consent_service
from services import scheduling

router = APIRouter(prefix="/api/doctor", tags=["doctor-schedule"])
settings = get_settings()

WEEKDAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday",
                 "Saturday", "Sunday"]


def _slots_in(row) -> int:
    """How many appointments physically fit in a working-hours block."""
    minutes = (
        row.end_time.hour * 60 + row.end_time.minute
        - row.start_time.hour * 60 - row.start_time.minute
    )
    return minutes // settings.appointment_minutes


# ---------------------------------------------------------------- schemas

class WorkingHoursRequest(BaseModel):
    weekday: int = Field(ge=0, le=6, description="0 = Monday")
    start_time: time
    end_time: time
    # Max bookings in this block per day. Leave unset for "as many as fit".
    capacity: int | None = Field(default=None, ge=1, le=200)

    @model_validator(mode="after")
    def end_after_start(self):
        if self.end_time <= self.start_time:
            raise ValueError("End time must be after start time.")

        minutes = (
            self.end_time.hour * 60 + self.end_time.minute
            - self.start_time.hour * 60 - self.start_time.minute
        )
        if minutes < settings.appointment_minutes:
            raise ValueError(
                f"A working block must be at least "
                f"{settings.appointment_minutes} minutes long."
            )
        return self


class WorkingHoursResponse(BaseModel):
    id: str
    weekday: int
    weekday_name: str
    start_time: time
    end_time: time
    capacity: int | None = None
    # How many slots the block actually yields at the current consultation
    # length. Shown next to capacity so a doctor can see when the two
    # disagree — a capacity of 30 on a block holding 4 slots does nothing.
    slots_in_block: int = 0


class CalendarSlot(BaseModel):
    starts_at: datetime
    ends_at: datetime
    status: Literal["free", "confirmed"]
    appointment_id: str | None = None
    patient_id: str | None = None
    patient_name: str | None = None
    reason: str | None = None
    record_shared: bool = False


class CalendarDay(BaseModel):
    date: date
    weekday_name: str
    slots: list[CalendarSlot]
    free_count: int
    booked_count: int


# --------------------------------------------------------- working hours

@router.get("/availability", response_model=list[WorkingHoursResponse])
def my_working_hours(
    db: Session = Depends(get_db),
    doctor: Doctor = Depends(current_doctor),
):
    rows = (
        db.query(AvailabilitySlot)
        .filter_by(doctor_id=doctor.id)
        .order_by(AvailabilitySlot.weekday, AvailabilitySlot.start_time)
        .all()
    )
    return [
        WorkingHoursResponse(
            id=row.id,
            weekday=row.weekday,
            weekday_name=WEEKDAY_NAMES[row.weekday],
            start_time=row.start_time,
            end_time=row.end_time,
            capacity=row.capacity,
            slots_in_block=_slots_in(row),
        )
        for row in rows
    ]


@router.post("/availability", response_model=WorkingHoursResponse, status_code=201)
def add_working_hours(
    body: WorkingHoursRequest,
    db: Session = Depends(get_db),
    doctor: Doctor = Depends(current_doctor),
):
    """Overlapping blocks on the same day are rejected.

    Two overlapping rules would make expand_slots emit the same time twice,
    and the patient would see duplicate options that collide on booking.
    """
    same_day = (
        db.query(AvailabilitySlot)
        .filter_by(doctor_id=doctor.id, weekday=body.weekday)
        .all()
    )

    for existing in same_day:
        if body.start_time < existing.end_time and existing.start_time < body.end_time:
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                f"That overlaps hours you already have on "
                f"{WEEKDAY_NAMES[body.weekday]} "
                f"({existing.start_time:%H:%M}–{existing.end_time:%H:%M}).",
            )

    row = AvailabilitySlot(
        doctor_id=doctor.id,
        weekday=body.weekday,
        start_time=body.start_time,
        end_time=body.end_time,
        capacity=body.capacity or settings.default_block_capacity,
    )
    db.add(row)
    db.commit()
    db.refresh(row)

    return WorkingHoursResponse(
        id=row.id,
        weekday=row.weekday,
        weekday_name=WEEKDAY_NAMES[row.weekday],
        start_time=row.start_time,
        end_time=row.end_time,
        capacity=row.capacity,
        slots_in_block=_slots_in(row),
    )


@router.delete("/availability/{slot_id}", status_code=200)
def remove_working_hours(
    slot_id: str,
    db: Session = Depends(get_db),
    doctor: Doctor = Depends(current_doctor),
):
    """Removing hours does NOT cancel appointments already booked in them.

    A patient who has a confirmed time should not lose it because the doctor
    edited their schedule — the doctor must decline it explicitly, so the
    patient is told. The response reports any such appointments so the UI can
    say so.
    """
    row = db.get(AvailabilitySlot, slot_id)
    if row is None or row.doctor_id != doctor.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Those hours don't exist.")

    horizon = datetime.utcnow() + timedelta(days=settings.availability_horizon_days)
    affected = [
        appointment
        for appointment in db.query(Appointment).filter(
            Appointment.doctor_id == doctor.id,
            Appointment.starts_at >= datetime.utcnow(),
            Appointment.starts_at <= horizon,
            Appointment.status == AppointmentStatus.confirmed,
        )
        if appointment.starts_at.weekday() == row.weekday
        and row.start_time <= appointment.starts_at.time() < row.end_time
    ]

    db.delete(row)
    db.commit()

    return {
        "removed": slot_id,
        "appointments_still_booked": len(affected),
        "note": (
            "Existing appointments in these hours were kept. Decline them "
            "individually if you can no longer attend."
        ) if affected else None,
    }


# -------------------------------------------------------------- calendar

@router.get("/calendar", response_model=list[CalendarDay])
def my_calendar(
    days: int | None = None,
    db: Session = Depends(get_db),
    doctor: Doctor = Depends(current_doctor),
):
    """Free slots and booked appointments, merged, day by day.

    One request rather than two so the doctor's calendar can never show a slot
    as both free and booked — which is exactly what happens when a UI fetches
    availability and appointments separately and one of them is stale.
    """
    horizon_days = days or settings.availability_horizon_days
    now = datetime.utcnow()
    horizon = now + timedelta(days=horizon_days)

    rules = db.query(AvailabilitySlot).filter_by(doctor_id=doctor.id).all()

    appointments = (
        db.query(Appointment)
        .filter(
            Appointment.doctor_id == doctor.id,
            Appointment.starts_at >= now,
            Appointment.starts_at <= horizon,
            Appointment.status == AppointmentStatus.confirmed,
        )
        .all()
    )
    booked_by_start = {a.starts_at: a for a in appointments}

    free = scheduling.expand_slots(
        rules,
        busy=set(booked_by_start),
        now=now,
        days=horizon_days,
        minutes=settings.appointment_minutes,
    )

    by_day: dict[date, list[CalendarSlot]] = {}

    for starts_at, ends_at in free:
        by_day.setdefault(starts_at.date(), []).append(
            CalendarSlot(starts_at=starts_at, ends_at=ends_at, status="free")
        )

    for appointment in appointments:
        patient = db.get(Patient, appointment.patient_id)
        shared = consent_service.active_grant(
            db, appointment.patient_id, doctor.id
        ) is not None

        by_day.setdefault(appointment.starts_at.date(), []).append(
            CalendarSlot(
                starts_at=appointment.starts_at,
                ends_at=appointment.ends_at,
                status=appointment.status.value,
                appointment_id=appointment.id,
                patient_id=appointment.patient_id,
                patient_name=patient.full_name if patient else None,
                reason=appointment.reason,
                record_shared=shared,
            )
        )

    out: list[CalendarDay] = []
    for day in sorted(by_day):
        slots = sorted(by_day[day], key=lambda s: s.starts_at)
        out.append(CalendarDay(
            date=day,
            weekday_name=WEEKDAY_NAMES[day.weekday()],
            slots=slots,
            free_count=sum(1 for s in slots if s.status == "free"),
            booked_count=sum(1 for s in slots if s.status != "free"),
        ))

    return out