"""Password hashing and token issuing.

Nothing else in the codebase touches passlib or jwt directly, so swapping the
algorithm later is a one-file change.
"""

from datetime import datetime, timedelta

import jwt
from passlib.context import CryptContext

from config import get_settings

settings = get_settings()
ALGORITHM = "HS256"

_pwd = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")


def hash_password(raw: str) -> str:
    return _pwd.hash(raw)


def verify_password(raw: str, hashed: str) -> bool:
    return _pwd.verify(raw, hashed)


def create_token(user_id: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "role": role,
        "exp": datetime.utcnow() + timedelta(hours=settings.token_ttl_hours),
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, settings.secret_key, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    """Raises jwt.PyJWTError on anything invalid or expired."""
    return jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])


def generate_activation_code() -> str:
    """Human-transcribable doctor activation code.

    No 0/O or 1/I — an admin reads this over the phone, and those are where
    transcription goes wrong.
    """
    import secrets

    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    blocks = ["".join(secrets.choice(alphabet) for _ in range(4)) for _ in range(2)]
    return "-".join(blocks)
