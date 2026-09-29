"""Authentication and identity schemas."""

from pydantic import BaseModel, EmailStr
from datetime import datetime


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    totp: str | None = None


class WebAuthnChallengeRequest(BaseModel):
    email: EmailStr


class WebAuthnVerifyRequest(BaseModel):
    credential_id: str
    signature: str


class RefreshRequest(BaseModel):
    refresh_token: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str | None = None
    expires_in: int = 3600


class UserResponse(BaseModel):
    user_id: str
    email: EmailStr
    name: str
    role: str
    tenants: list[dict] = []


class TenantCreate(BaseModel):
    name: str
    tier: str = "STARTER"


class TenantResponse(BaseModel):
    tenant_id: str
    name: str
    tier: str
    created_at: datetime


class TenantListResponse(BaseModel):
    tenants: list[dict]
