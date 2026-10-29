"""Request/response schemas for artifact workspaces, forks and sharing."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ForkRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    new_slug: str | None = Field(default=None, max_length=128)


class VisibilityUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    visibility: str = Field(pattern="^(public|private)$")


class ShareCreate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    grantee_type: str = Field(pattern="^(user|tenant|email)$")
    grantee_id: str | None = Field(default=None, max_length=128)
    grantee_email: str | None = Field(default=None, max_length=255)
    permission: str = Field(default="VIEW", pattern="^(VIEW|FORK|DEPLOY|ADMIN)$")
    expires_at: datetime | None = None


class ShareLinkCreate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    permission: str = Field(default="VIEW", pattern="^(VIEW|FORK|DEPLOY)$")
    expires_at: datetime | None = None
    expires_in_hours: int | None = Field(default=24, ge=1, le=24 * 365)
    max_uses: int | None = Field(default=None, ge=1)


class WorkspacePatch(BaseModel):
    model_config = ConfigDict(extra="ignore")

    name: str | None = Field(default=None, max_length=255)
    description: str | None = Field(default=None, max_length=20000)
    readme_markdown: str | None = Field(default=None, max_length=200000)
    manifest: dict | None = None
    visibility: str | None = Field(default=None, pattern="^(public|private)$")
