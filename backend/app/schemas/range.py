"""Cyber-range and digital twin schemas."""

from pydantic import BaseModel
from datetime import datetime


class DigitalTwinResponse(BaseModel):
    twin_id: str
    nodes: int
    status: str


class DigitalTwinCreate(BaseModel):
    name: str
    node_profiles: list[dict] = []


class DigitalTwinCreateResponse(BaseModel):
    twin_id: str
    status: str


class TwinActionResponse(BaseModel):
    status: str
    sandbox_ip: str | None = None


class AttackReplayRequest(BaseModel):
    malware: str
    target: str


class AttackReplayResponse(BaseModel):
    status: str
    frames_injected: int


class ResilienceScoreResponse(BaseModel):
    mttfi_ms: float
    rollback_guard_ms: float
    score: float
