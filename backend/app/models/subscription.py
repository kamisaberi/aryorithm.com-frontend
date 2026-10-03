"""Commercial subscription catalog (global, not per-tenant).

Source of truth for plan pricing + feature entitlement matrix shown on
aryorithm.com/pricing and the dashboard subscriptions page. Edit rows
(via PATCH /api/v1/plans/...) to change prices without redeploying.
All money is stored as integer cents; NULL price = custom quote.
"""

import uuid

from sqlalchemy import String, Boolean, Integer, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class SubscriptionPlan(Base):
    __tablename__ = "subscription_plans"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    slug: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    price_month_cents: Mapped[int | None] = mapped_column(Integer, nullable=True)
    price_display: Mapped[str] = mapped_column(String(64), nullable=False)
    per_node: Mapped[bool] = mapped_column(Boolean, default=True)
    target: Mapped[str] = mapped_column(String(255), default="")
    deployment: Mapped[str] = mapped_column(String(255), default="")
    node_capacity: Mapped[str] = mapped_column(String(128), default="")
    licensing: Mapped[str] = mapped_column(String(255), default="")
    support: Mapped[str] = mapped_column(String(255), default="")
    cta_label: Mapped[str] = mapped_column(String(128), default="")
    cta_href: Mapped[str] = mapped_column(String(255), default="")
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class PlanEntitlement(Base):
    """One matrix row: item + per-plan cell values.

    category: software_tier | security_subsystem | industrial_plugin | cloud_saas
    values: {plan_slug: cell text}, e.g. {"community": "✖", "enterprise": "✔ Included"}
    """

    __tablename__ = "plan_entitlements"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    category: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    item_key: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    item_label: Mapped[str] = mapped_column(String(255), nullable=False)
    item_sub: Mapped[str] = mapped_column(Text, default="")
    values: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
