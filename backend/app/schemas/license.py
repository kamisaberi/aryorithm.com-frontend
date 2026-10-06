"""Pydantic schemas for the Licensing API."""

from pydantic import BaseModel, ConfigDict, Field


class LicenseSubscribeRequest(BaseModel):
    """Self-service subscribe — any authenticated member (free or commercial)."""

    plan_slug: str = Field(default="community", description="community | enterprise | critical | sovereign (legacy tier names accepted)")
    hardware_token: str = Field(..., description='Appliance token, e.g. "ARY-HW-421a88fc-54b2-..."')
    hostname: str = Field(default="sentinel-node")
    customer_name: str | None = Field(default=None, description="Defaults to the caller's tenant name")
    days_valid: int | None = Field(default=None, description="Override lease length in days; 0 = never expires")
    max_nodes: int | None = Field(default=None)


class LicenseActivationRequest(BaseModel):
    hardware_token: str = Field(..., description='e.g. "ARY-HW-421a88fc-54b2-..."')
    hostname: str | None = Field(default="sentinel-node")


class LicenseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    license_id: str
    customer_name: str
    plan_slug: str
    license_kind: str
    hostname: str
    max_nodes: int
    issued_at: int
    expires_at: int
    status: str
    revoked: bool
    authorized_modules: list
    authorized_plugins: list
    created_at: str | None = None


class LicenseDetailOut(LicenseOut):
    hardware_token: str
    locked_hardware_uuid: str
    days_valid: int
    signature_algorithm: str
    signature: str
    envelope: dict
    signature_valid: bool


class LicenseEnvelopeResponse(BaseModel):
    status: str
    plan_slug: str
    license_id: str
    license_envelope: dict


class LicenseVerifyOut(BaseModel):
    license_id: str
    signature_valid: bool
    status: str
