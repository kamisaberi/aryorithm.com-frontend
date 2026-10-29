"""Shared FastAPI dependencies."""

from fastapi import Depends, Header, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.user import User
from app.utils.cookies import get_cookie_tokens
from app.utils.security import decode_token

security = HTTPBearer(auto_error=False)


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Load the current user from a validated JWT access token.

    Prefers the ``Authorization: Bearer`` header (existing clients); falls
    back to the ``ary_access`` SSO cookie so dashboard/hub/main frontends
    share one login via ``fetch(..., {credentials: "include"})``.
    """
    token: str | None = None
    if credentials:
        token = credentials.credentials
    if not token and request is not None:
        token, _ = get_cookie_tokens(request)
    user_id = decode_token(token, expected_type="access") if token else None
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


async def get_optional_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User | None:
    """Return the caller when credentials are valid, otherwise ``None``.

    Public catalog/detail endpoints use this to show private assets to their
    owner/tenant without turning anonymous access into a 401.
    """
    token: str | None = None
    if credentials:
        token = credentials.credentials
    if not token and request is not None:
        token, _ = get_cookie_tokens(request)
    user_id = decode_token(token, expected_type="access") if token else None
    if not user_id:
        return None
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None or not user.is_active:
        return None
    return user


async def get_current_admin(user: User = Depends(get_current_user)) -> User:
    """Ensure the current user has an admin-capable role."""
    if user.role not in ("super_admin", "tenant_admin", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return user


async def get_nexus_caller(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    x_api_key: str | None = Header(default=None, alias="X-API-Key"),
    db: AsyncSession = Depends(get_db),
) -> User | None:
    """Auth for sentinel-nexus polling.

    Sender uses `Authorization: Bearer <JWT>` + `X-Tenant-ID`.
    Dashboard simulator may use `X-API-Key` instead. Accept either
    so neither path 401s when the other credential is used.
    Returns the JWT user when present, else None (API-key path).
    """
    if credentials:
        user_id = decode_token(credentials.credentials, expected_type="access")
        if user_id:
            result = await db.execute(select(User).where(User.id == user_id))
            user = result.scalar_one_or_none()
            if user is not None and user.is_active:
                return user
        # Bearer present but invalid -> fall through to API-key check
        # so a clear 401 is raised below instead of a misleading JWT error.
    if x_api_key and x_api_key == settings.NEXUS_API_KEY:
        return None
    if credentials or x_api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )
