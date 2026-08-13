"""Dependencies every protected route uses.

Role gets a caller to a route. It does not get them past the consent check —
see services/consent.py.
"""

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from database.session import get_db
from models import Doctor, Patient, Role, User
from services.security import decode_token

bearer = HTTPBearer(auto_error=True)


def current_user(
    creds: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    try:
        payload = decode_token(creds.credentials)
    except jwt.PyJWTError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token")

    user = db.get(User, payload.get("sub"))
    if user is None or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Account is not active")
    return user


def require_role(*allowed: Role):
    def dependency(user: User = Depends(current_user)) -> User:
        if user.role not in allowed:
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                "You don't have permission to do that.",
            )
        return user

    return dependency


require_patient = require_role(Role.patient)
require_doctor = require_role(Role.doctor)
require_admin = require_role(Role.admin)


def current_patient(
    user: User = Depends(require_patient),
    db: Session = Depends(get_db),
) -> Patient:
    patient = db.query(Patient).filter_by(user_id=user.id).one_or_none()
    if patient is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No patient profile found")
    return patient


def current_doctor(
    user: User = Depends(require_doctor),
    db: Session = Depends(get_db),
) -> Doctor:
    doctor = db.query(Doctor).filter_by(user_id=user.id).one_or_none()
    if doctor is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No doctor profile found")
    return doctor