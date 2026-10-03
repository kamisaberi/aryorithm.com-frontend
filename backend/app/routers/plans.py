"""Commercial subscription catalog — public read, admin write.

GET  /api/v1/plans         public matrix (plans + entitlements)
PATCH /api/v1/plans/{slug} admin: update price / copy (prices change here)
PATCH /api/v1/plans/items/{item_id} admin: update one entitlement row
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_admin
from app.models.subscription import PlanEntitlement, SubscriptionPlan
from app.models.user import User

router = APIRouter(prefix="/plans", tags=["Subscription Plans"])


class PlanOut(BaseModel):
    slug: str
    name: str
    price_month_cents: int | None
    price_display: str
    per_node: bool
    target: str
    deployment: str
    node_capacity: str
    licensing: str
    support: str
    cta_label: str
    cta_href: str
    sort_order: int


class EntitlementOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    category: str
    item_key: str
    item_label: str
    item_sub: str
    values: dict
    sort_order: int


class PlansMatrix(BaseModel):
    plans: list[PlanOut]
    items: list[EntitlementOut]


class PlanPatch(BaseModel):
    model_config = ConfigDict(extra="ignore")

    name: str | None = None
    price_month_cents: int | None = None
    price_display: str | None = None
    target: str | None = None
    deployment: str | None = None
    node_capacity: str | None = None
    licensing: str | None = None
    support: str | None = None
    cta_label: str | None = None
    cta_href: str | None = None
    is_active: bool | None = None


class EntitlementPatch(BaseModel):
    model_config = ConfigDict(extra="ignore")

    item_label: str | None = None
    item_sub: str | None = None
    values: dict | None = None


@router.get("", response_model=PlansMatrix)
@router.get("/", response_model=PlansMatrix, include_in_schema=False)
async def get_matrix(db: AsyncSession = Depends(get_db)):
    """Public subscription matrix (pricing page + dashboard)."""
    plans = (
        await db.execute(
            select(SubscriptionPlan)
            .where(SubscriptionPlan.is_active.is_(True))
            .order_by(SubscriptionPlan.sort_order)
        )
    ).scalars().all()
    items = (
        await db.execute(
            select(PlanEntitlement).order_by(
                PlanEntitlement.category, PlanEntitlement.sort_order
            )
        )
    ).scalars().all()
    if not plans:
        from app.services.plan_catalog import ITEMS, PLANS

        for i, p in enumerate(PLANS):
            db.add(SubscriptionPlan(**{**p, "sort_order": i}))
        for i, item in enumerate(ITEMS):
            db.add(PlanEntitlement(**{**item, "sort_order": i}))
        await db.flush()
        plans = (
            await db.execute(
                select(SubscriptionPlan).order_by(SubscriptionPlan.sort_order)
            )
        ).scalars().all()
        items = (
            await db.execute(
                select(PlanEntitlement).order_by(
                    PlanEntitlement.category, PlanEntitlement.sort_order
                )
            )
        ).scalars().all()
    return PlansMatrix(
        plans=[PlanOut(**{k: getattr(p, k) for k in PlanOut.model_fields}) for p in plans],
        items=[EntitlementOut.model_validate(i) for i in items],
    )


@router.patch("/{slug}", response_model=PlanOut)
async def patch_plan(
    slug: str,
    body: PlanPatch,
    user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update a plan (e.g. change price_month_cents / price_display)."""
    _ = user
    plan = (
        await db.execute(select(SubscriptionPlan).where(SubscriptionPlan.slug == slug))
    ).scalar_one_or_none()
    if plan is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        if hasattr(plan, field):
            setattr(plan, field, value)
    await db.flush()
    return PlanOut(**{k: getattr(plan, k) for k in PlanOut.model_fields})


@router.patch("/items/{item_id}", response_model=EntitlementOut)
async def patch_entitlement(
    item_id: str,
    body: EntitlementPatch,
    user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update one entitlement row (labels or per-plan cell values)."""
    _ = user
    row = (
        await db.execute(select(PlanEntitlement).where(PlanEntitlement.id == item_id))
    ).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entitlement not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        if hasattr(row, field):
            setattr(row, field, value)
    await db.flush()
    return EntitlementOut.model_validate(row)
