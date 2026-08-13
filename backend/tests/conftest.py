"""Shared test fixtures.

Runs against in-memory SQLite with create_all rather than Postgres and
migrations. Fast, and no test can leave state behind. The trade-off: SQLite
won't catch Postgres-specific issues, so anything touching JSON columns or
constraint behaviour deserves a check against the real thing before release.
"""

import os

os.environ.setdefault("CARDIOAI_SECRET_KEY", "test-secret")
os.environ.setdefault("SECRET_KEY", "test-secret")
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

from database.session import get_db  # noqa: E402
from main import app  # noqa: E402
from models import Base, Doctor, Patient, Role, User  # noqa: E402
from services.security import create_token, hash_password  # noqa: E402


@pytest.fixture
def db():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,  # one shared connection, or :memory: resets
    )
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    session = Session()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client(db):
    app.dependency_overrides[get_db] = lambda: db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def patient(db):
    user = User(email="pat@example.com", password_hash=hash_password("password123"),
                role=Role.patient)
    db.add(user)
    db.flush()
    profile = Patient(user_id=user.id, full_name="Test Patient")
    db.add(profile)
    db.commit()
    return profile


@pytest.fixture
def doctor(db):
    user = User(email="doc@example.com", password_hash=hash_password("password123"),
                role=Role.doctor)
    db.add(user)
    db.flush()
    profile = Doctor(user_id=user.id, activation_code="TEST-CODE", activated=True,
                     full_name="Dr Test", specialty="Cardiology")
    db.add(profile)
    db.commit()
    return profile


@pytest.fixture
def patient_auth(db, patient):
    user = db.get(User, patient.user_id)
    return {"Authorization": f"Bearer {create_token(user.id, user.role.value)}"}


@pytest.fixture
def doctor_auth(db, doctor):
    user = db.get(User, doctor.user_id)
    return {"Authorization": f"Bearer {create_token(user.id, user.role.value)}"}