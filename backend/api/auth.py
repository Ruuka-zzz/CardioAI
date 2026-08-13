"""Signup, login, doctor activation, and the current-user lookup."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from api.deps import current_user
from database.session import get_db
from models import Doctor, Patient, Role, User
from schemas import (
    DoctorActivateRequest, LoginRequest, MeResponse, SignupRequest, TokenResponse,
)
from services.security import create_token, hash_password, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/signup", response_model=TokenResponse, status_code=201)
def signup(body: SignupRequest, db: Session = Depends(get_db)):
    """Patients only. Doctors go through /doctors/activate."""
    if db.query(User).filter_by(email=body.email).first():
        raise HTTPException(status.HTTP_409_CONFLICT, "That email is already registered")

    user = User(
        email=body.email,
        password_hash=hash_password(body.password),
        role=Role.patient,
    )
    db.add(user)
    db.flush()
    db.add(Patient(user_id=user.id, full_name=body.full_name))
    db.commit()

    return TokenResponse(access_token=create_token(user.id, user.role.value),
                         role=user.role.value)


@router.post("/doctors/activate", response_model=TokenResponse, status_code=201)
def activate_doctor(body: DoctorActivateRequest, db: Session = Depends(get_db)):
    doctor = (
        db.query(Doctor)
        .filter_by(activation_code=body.activation_code.strip().upper())
        .one_or_none()
    )

    # One message for both cases — distinguishing "no such code" from "already
    # used" would let someone probe which codes exist.
    if doctor is None or doctor.activated:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "That activation code is not valid or has already been used.",
        )

    if db.query(User).filter_by(email=body.email).first():
        raise HTTPException(status.HTTP_409_CONFLICT, "That email is already registered")

    user = User(
        email=body.email,
        password_hash=hash_password(body.password),
        role=Role.doctor,
    )
    db.add(user)
    db.flush()

    doctor.user_id = user.id
    doctor.activated = True
    db.commit()

    return TokenResponse(access_token=create_token(user.id, user.role.value),
                         role=user.role.value)


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter_by(email=body.email).one_or_none()

    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Email or password is incorrect")
    if not user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "This account is disabled")

    return TokenResponse(access_token=create_token(user.id, user.role.value),
                         role=user.role.value)


@router.get("/me", response_model=MeResponse)
def me(user: User = Depends(current_user), db: Session = Depends(get_db)):
    full_name = None
    onboarding_complete = None

    if user.role is Role.patient:
        patient = db.query(Patient).filter_by(user_id=user.id).one_or_none()
        if patient:
            full_name = patient.full_name
            onboarding_complete = patient.onboarding_complete
    elif user.role is Role.doctor:
        doctor = db.query(Doctor).filter_by(user_id=user.id).one_or_none()
        if doctor:
            full_name = doctor.full_name

    return MeResponse(
        id=user.id,
        email=user.email,
        role=user.role.value,
        full_name=full_name,
        onboarding_complete=onboarding_complete,
    )