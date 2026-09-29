"""Digital Forensics and Incident Response models."""

import uuid
from datetime import datetime

from sqlalchemy import String, Boolean, DateTime, ForeignKey, Integer, Float, Text, JSON, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column


from app.database import Base
import enum


class PCAP(Base):
    __tablename__ = "pcaps"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    pcap_id: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    sha256: Mapped[str] = mapped_column(String(128), nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, default=0)
    storage_path: Mapped[str] = mapped_column(String(512), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=False)


class FirmwareReport(Base):
    __tablename__ = "firmware_reports"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    task_id: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(32), default="ANALYZING")
    vulnerabilities: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id"), nullable=False)
