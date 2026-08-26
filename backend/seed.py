"""Seed the database with an admin, doctors, and availability.

    cd backend
    python seed.py

Idempotent — run it as often as you like. Existing rows are left alone.

WHY THIS EXISTS
---------------
Doctors cannot self-register: an admin issues an activation code, and the
doctor exchanges it for an account. That is the right design, but it means a
fresh database has no doctors and no way to create one, because there is no
admin either. This script breaks that cycle.

DEMO CREDENTIALS ARE PRINTED, NOT HIDDEN. This file is for local development
and demos only. Never run it against a real deployment — the passwords below
are public knowledge the moment this file is in your repository.
"""

from datetime import time

from database.session import SessionLocal, init_db
from models import AvailabilitySlot, Doctor, Patient, Role, User
from services.security import hash_password

ADMIN_EMAIL = "admin@cardioai.local"
ADMIN_PASSWORD = "admin-demo-password"

DOCTORS = [
    {
        "full_name": "Dr Khin Myat",
        "specialty": "Cardiology",
        "bio": "Twelve years in general cardiology, with a focus on heart "
               "failure follow-up and medication review.",
        "code": "DEMO-CARD",
        "email": "khin@cardioai.local",
        "password": "doctor-demo-password",
        # Mon/Wed/Fri mornings
        "slots": [(0, time(9, 0), time(12, 0)),
                  (2, time(9, 0), time(12, 0)),
                  (4, time(9, 0), time(12, 0))],
    },
    {
        "full_name": "Dr Aung Thura",
        "specialty": "Internal medicine",
        "bio": "Sees patients managing hypertension and diabetes alongside "
               "heart conditions.",
        "code": "DEMO-INTM",
        "email": "aung@cardioai.local",
        "password": "doctor-demo-password",
        # Tue/Thu afternoons
        "slots": [(1, time(13, 0), time(17, 0)),
                  (3, time(13, 0), time(17, 0))],
    },
    {
        # Left unactivated on purpose, so you can demo the activation flow:
        # sign up at /signup?doctor=1 with the code below.
        "full_name": "Dr Su Mon",
        "specialty": "Cardiology",
        "bio": "Newly joined. Activation pending.",
        "code": "DEMO-NEW1",
        "email": None,
        "password": None,
        "slots": [(0, time(14, 0), time(17, 0))],
    },
]


def seed_admin(db) -> None:
    if db.query(User).filter_by(email=ADMIN_EMAIL).first():
        print(f"  admin already exists ({ADMIN_EMAIL})")
        return

    db.add(User(
        email=ADMIN_EMAIL,
        password_hash=hash_password(ADMIN_PASSWORD),
        role=Role.admin,
    ))
    db.commit()
    print(f"  created admin: {ADMIN_EMAIL} / {ADMIN_PASSWORD}")


def seed_doctor(db, spec: dict) -> None:
    existing = db.query(Doctor).filter_by(activation_code=spec["code"]).first()
    if existing:
        print(f"  {spec['full_name']} already exists")
        return

    doctor = Doctor(
        full_name=spec["full_name"],
        specialty=spec["specialty"],
        bio=spec["bio"],
        activation_code=spec["code"],
        activated=False,
    )
    db.add(doctor)
    db.flush()

    # An unactivated doctor has no user account and does not appear in the
    # patient-facing directory — list_doctors filters on activated=True.
    if spec["email"]:
        user = User(
            email=spec["email"],
            password_hash=hash_password(spec["password"]),
            role=Role.doctor,
        )
        db.add(user)
        db.flush()
        doctor.user_id = user.id
        doctor.activated = True

    for weekday, start, end in spec["slots"]:
        db.add(AvailabilitySlot(
            doctor_id=doctor.id, weekday=weekday, start_time=start, end_time=end
        ))

    db.commit()

    if spec["email"]:
        print(f"  created doctor: {spec['email']} / {spec['password']}")
    else:
        print(f"  created doctor (unactivated), code: {spec['code']}")


def main() -> None:
    init_db()  # no-op if migrations already created the tables
    db = SessionLocal()

    try:
        print("Seeding admin...")
        seed_admin(db)

        print("Seeding doctors...")
        for spec in DOCTORS:
            seed_doctor(db, spec)

        patients = db.query(Patient).count()
        print(f"\nDone. {db.query(Doctor).filter_by(activated=True).count()} "
              f"doctors are now bookable, {patients} patient(s) registered.")
        print("\nSign in as admin to issue more activation codes:")
        print(f"  {ADMIN_EMAIL} / {ADMIN_PASSWORD}")
        print("\nTo demo doctor activation, use code DEMO-NEW1 at "
              "/signup?doctor=1")
    finally:
        db.close()


if __name__ == "__main__":
    main()