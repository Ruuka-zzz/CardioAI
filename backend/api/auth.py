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

# Hashed once at import. Compared against when no account matches, so a failed
# lookup costs the same wall-clock time as a wrong password.
_DUMMY_HASH = hash_password("cardioai-timing-equaliser")


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
    db.add(Patient(
        user_id=user.id,
        full_name=body.full_name,
        date_of_birth=body.date_of_birth,
        sex=body.sex,
    ))
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
    """Accepts an email, a doctor roll number, or both together.

    When both are given they must belong to the same account. A mismatch is
    treated exactly like a wrong password — same message, same status code —
    so the pairing can't be probed: "roll number wrong" versus "email wrong"
    would tell an attacker which half they had already guessed correctly.

    ONE FAILURE MESSAGE, ALWAYS. Whether the identifier doesn't exist, the
    doctor never activated, or the password is simply wrong, the caller gets
    the same sentence. Distinguishing them would let anyone confirm which roll
    numbers are real by watching the wording change — and roll numbers are
    sequential, so they are trivial to enumerate.

    The password is verified even on a miss (see the dummy hash below) so the
    response takes the same time either way. Without that, a fast rejection
    means "no such account" and a slow one means "account exists, wrong
    password", which is the same leak measured with a stopwatch.
    """
    user: User | None = None

    if body.staff_id:
        doctor = (
            db.query(Doctor)
            .filter_by(staff_id=body.staff_id.strip().upper())
            .one_or_none()
        )
        if doctor and doctor.activated and doctor.user_id:
            candidate = db.get(User, doctor.user_id)

            # If an email was supplied alongside the roll number, it has to
            # belong to the same account. Case-insensitive: nobody should be
            # locked out for capitalising their own address.
            if candidate and body.email:
                if candidate.email.lower() != str(body.email).lower():
                    candidate = None

            user = candidate
    else:
        user = db.query(User).filter_by(email=body.email).one_or_none()

    password_ok = (
        verify_password(body.password, user.password_hash)
        if user
        else verify_password(body.password, _DUMMY_HASH) and False
    )

    if user is None or not password_ok:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            "Those sign-in details are incorrect.",
        )
    if not user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "This account is disabled")

    return TokenResponse(access_token=create_token(user.id, user.role.value),
                         role=user.role.value)


@router.get("/me", response_model=MeResponse)
def me(user: User = Depends(current_user), db: Session = Depends(get_db)):
    full_name = None
    onboarding_complete = None
    staff_id = None

    if user.role is Role.patient:
        patient = db.query(Patient).filter_by(user_id=user.id).one_or_none()
        if patient:
            full_name = patient.full_name
            onboarding_complete = patient.onboarding_complete
    elif user.role is Role.doctor:
        doctor = db.query(Doctor).filter_by(user_id=user.id).one_or_none()
        if doctor:
            full_name = doctor.full_name
            staff_id = doctor.staff_id

    return MeResponse(
        id=user.id,
        email=user.email,
        role=user.role.value,
        staff_id=staff_id,
        full_name=full_name,
        onboarding_complete=onboarding_complete,
    )