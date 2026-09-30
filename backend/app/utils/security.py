"""Password hashing (bcrypt) and JWT helpers (PyJWT)."""

from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

from app.config import settings

import uuid


def _truncate(password: str) -> bytes:
    """bcrypt caps passwords at 72 bytes — truncate to prevent ValueError on 5.x."""
    return password.encode("utf-8")[:72]


def hash_password(password: str) -> str:
    hashed = bcrypt.hashpw(_truncate(password), bcrypt.gensalt())
    return hashed.decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(_truncate(plain), hashed.encode("utf-8"))
    except (ValueError, TypeError):
        return False


def create_access_token(subject: str, expires_minutes: int | None = None) -> tuple[str, int]:
    expires_in = (expires_minutes or settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES) * 60
    expire = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
    token = jwt.encode(
        {"sub": subject, "exp": expire, "type": "access", "jti": uuid.uuid4().hex},
        settings.SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )
    return token, expires_in


def create_refresh_token(subject: str) -> tuple[str, datetime]:
    expires_at = datetime.now(timezone.utc) + timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS)
    token = jwt.encode(
        {"sub": subject, "exp": expires_at, "type": "refresh", "jti": uuid.uuid4().hex},
        settings.SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )
    return token, expires_at


def decode_token(token: str, expected_type: str = "access") -> str | None:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None
    if payload.get("type") != expected_type:
        return None
    sub = payload.get("sub")
    return sub if isinstance(sub, str) else None
