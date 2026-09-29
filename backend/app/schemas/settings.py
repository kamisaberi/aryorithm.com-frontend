"""Administration and settings schemas."""

from pydantic import BaseModel
from datetime import datetime


class APIKeyResponse(BaseModel):
    key_id: str
    name: str
    created_at: datetime


class APIKeyCreate(BaseModel):
    name: str
    scopes: list[str] = []


class APIKeyCreateResponse(BaseModel):
    api_key: str


class APIKeyActionResponse(BaseModel):
    status: str
    key_id: str


class WebhookResponse(BaseModel):
    id: str
    url: str


class WebhookCreate(BaseModel):
    url: str
    events: list[str] = []


class WebhookCreateResponse(BaseModel):
    webhook_id: str
    status: str


class BillingResponse(BaseModel):
    active_nodes: int
    licensed_nodes: int
    renewal_date: datetime | None


class AuditLogResponse(BaseModel):
    action: str
    operator: str
    ts: datetime
