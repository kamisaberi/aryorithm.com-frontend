"""Authentication, Identity & Multi-Tenancy routes."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, get_current_admin
from app.models.user import RefreshToken, Tenant, TenantTier, User, UserRole
from app.schemas.auth import (
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    TenantCreate,
    TenantListResponse,
    TenantResponse,
    TokenResponse,
    UserResponse,
    WebAuthnChallengeRequest,
    WebAuthnVerifyRequest,
)
from app.utils.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


def _user_to_response(user: User, tenant: Tenant | None) -> UserResponse:
    tenants = []
    if tenant is not None:
        tenants = [{"id": tenant.id, "name": tenant.name}]
    return UserResponse(
        user_id=user.id,
        email=user.email,
        name=user.name,
        role=user.role.value if isinstance(user.role, UserRole) else str(user.role),
        tenants=tenants,
    )


async def _issue_tokens(db: AsyncSession, user: User) -> TokenResponse:
    access_token, expires_in = create_access_token(user.id)
    refresh_token, refresh_expires = create_refresh_token(user.id)
    db.add(
        RefreshToken(
            token=refresh_token,
            user_id=user.id,
            expires_at=refresh_expires.replace(tzinfo=None),
        )
    )
    await db.flush()
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=expires_in,
    )


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Self-service registration: creates a personal tenant + admin user."""
    if len(body.password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters",
        )

    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        )

    tenant = Tenant(name=f"{body.name}'s Organization", tier=TenantTier.STARTER)
    db.add(tenant)
    await db.flush()

    user = User(
        email=body.email,
        password_hash=hash_password(body.password),
        name=body.name,
        role=UserRole.TENANT_ADMIN,
        tenant_id=tenant.id,
    )
    db.add(user)
    await db.flush()

    return await _issue_tokens(db, user)


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Email/Password authentication."""
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()
    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated",
        )

    user.last_login = datetime.now(timezone.utc).replace(tzinfo=None)
    return await _issue_tokens(db, user)


@router.post("/webauthn/challenge")
async def webauthn_challenge(body: WebAuthnChallengeRequest):
    """Generate FIDO2 / YubiKey challenge."""
    # TODO: Implement WebAuthn challenge generation
    return {"challenge": "base64-encoded-challenge", "timeout": 60000}


@router.post("/webauthn/verify", response_model=TokenResponse)
async def webauthn_verify(body: WebAuthnVerifyRequest):
    """Verify hardware security key signature."""
    # TODO: Implement WebAuthn verification
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="WebAuthn verification is not implemented yet",
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(body: RefreshRequest, db: AsyncSession = Depends(get_db)):
    """Exchange refresh token for new access JWT."""
    user_id = decode_token(body.refresh_token, expected_type="refresh")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.token == body.refresh_token,
            RefreshToken.revoked == False,  # noqa: E712
        )
    )
    stored = result.scalar_one_or_none()
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    if stored is None or stored.expires_at < now:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    access_token, expires_in = create_access_token(user_id)
    return TokenResponse(access_token=access_token, expires_in=expires_in)


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Current authenticated user profile & permissions."""
    tenant = await db.get(Tenant, user.tenant_id)
    return _user_to_response(user, tenant)


@router.get("/tenants", response_model=TenantListResponse)
async def list_tenants(
    user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """List tenants visible to the caller."""
    if isinstance(user.role, UserRole) and user.role == UserRole.SUPER_ADMIN:
        result = await db.execute(select(Tenant))
        tenants = result.scalars().all()
    else:
        tenant = await db.get(Tenant, user.tenant_id)
        tenants = [tenant] if tenant else []
    return TenantListResponse(
        tenants=[{"id": t.id, "name": t.name, "tier": t.tier.value if isinstance(t.tier, TenantTier) else str(t.tier)} for t in tenants]
    )


@router.post("/tenants", response_model=TenantResponse, status_code=status.HTTP_201_CREATED)
async def create_tenant(
    body: TenantCreate,
    user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Onboard a new enterprise tenant."""
    try:
        tier = TenantTier(body.tier)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid tier '{body.tier}'. Use STARTER, PRO, or ENTERPRISE.",
        )
    tenant = Tenant(name=body.name, tier=tier)
    db.add(tenant)
    await db.flush()
    return TenantResponse(
        tenant_id=tenant.id,
        name=tenant.name,
        tier=tenant.tier.value if isinstance(tenant.tier, TenantTier) else str(tenant.tier),
        created_at=tenant.created_at,
    )
