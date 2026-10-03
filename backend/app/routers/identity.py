"""Identity & behavioral protection: ITDR, bot kinematics, ZTNA (Services 17, 18, 20)."""

import math
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_admin, get_current_user, get_nexus_caller
from app.models.dfir import ITDREvent, ZTNASession
from app.models.user import User
from app.schemas.cps import (
    BotEvaluateRequest,
    BotEvaluateResponse,
    ITDREventResponse,
    RevokeSessionRequest,
    RevokeSessionResponse,
    ZTNASessionResponse,
)

router = APIRouter(tags=["Identity & Behavior"])


def _aware(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


async def _ensure_identity_schema() -> None:
    from app.database import engine as _engine
    from app.database import Base as _Base

    async with _engine.begin() as _conn:
        await _conn.run_sync(_Base.metadata.create_all)


@router.get("/threats/itdr/events", response_model=list[ITDREventResponse])
async def list_itdr_events(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Identity compromise table (Service 17)."""
    await _ensure_identity_schema()
    rows = list(
        (await db.execute(
            select(ITDREvent)
            .where(ITDREvent.tenant_id == user.tenant_id)
            .order_by(ITDREvent.timestamp.desc())
        )).scalars().all()
    )
    return [
        ITDREventResponse(
            incident_id=r.incident_id,
            timestamp=int(_aware(r.timestamp).timestamp()),
            targeted_user=r.targeted_user,
            attacker_ip=r.attacker_ip,
            attack_technique=r.attack_technique,
            mitre_id=r.mitre_id,
            encryption_type_requested=r.encryption,
            status=r.status,
            recommended_action=r.recommended_action,
        )
        for r in rows
    ]


@router.post("/threats/itdr/revoke-session", response_model=RevokeSessionResponse)
async def revoke_itdr_session(
    body: RevokeSessionRequest,
    user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """1-click Entra ID / AD session revocation (marks incident REVOKED)."""
    await _ensure_identity_schema()
    result = await db.execute(
        select(ITDREvent).where(
            ITDREvent.tenant_id == user.tenant_id,
            ITDREvent.targeted_user == body.user_principal_name,
        )
    )
    row = result.scalars().first()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No incident for that user principal",
        )
    row.status = "REVOKED"
    await db.flush()
    return RevokeSessionResponse(
        status="SESSION_REVOKED",
        user_principal_name=body.user_principal_name,
        revoked_at=int(datetime.now(timezone.utc).timestamp()),
    )


@router.post("/bot/evaluate", response_model=BotEvaluateResponse)
async def evaluate_bot(
    body: BotEvaluateRequest,
    caller: User | None = Depends(get_nexus_caller),
    db: AsyncSession = Depends(get_db),
):
    """Kinematic bot verdict (Service 18, Module 10 port).

    Auth: JWT Bearer or X-API-Key. Stateless — no persistence.
    """
    _ = (caller, db)
    vecs = body.kinematic_vectors
    factors: list[str] = []
    n_signals = 0

    def _mean(xs: list[float]) -> float:
        return sum(xs) / len(xs) if xs else 0.0

    def _var(xs: list[float]) -> float:
        if not xs:
            return 0.0
        m = _mean(xs)
        return sum((x - m) ** 2 for x in xs) / len(xs)

    if len(vecs) >= 3:
        # 1. acceleration-magnitude stability ("linear" synthetic motion)
        accels = []
        for a, b, c in zip(vecs, vecs[1:], vecs[2:]):
            dt1 = max(b.dt_ms, 0.001)
            dt2 = max(c.dt_ms, 0.001)
            v1x, v1y = (b.x - a.x) / dt1, (b.y - a.y) / dt1
            v2x, v2y = (c.x - b.x) / dt2, (c.y - b.y) / dt2
            accels.append(math.hypot(v2x - v1x, v2y - v1y))
        linearity = 1.0 / (1.0 + _var(accels))
        if linearity > 0.95:
            n_signals += 1
            factors.append("Linear acceleration variance < 0.01 (Synthetic mouse trajectory)")
        # 2. heading stability (humans hesitate and turn; scripts hold course)
        vels = []
        for a, b in zip(vecs, vecs[1:]):
            dt = max(b.dt_ms, 0.001)
            vels.append(((b.x - a.x) / dt, (b.y - a.y) / dt))
        if len(vels) >= 2:
            angs = [math.atan2(v[1], v[0]) for v in vels]
            turns = []
            for x, y in zip(angs, angs[1:]):
                d = abs(x - y)
                turns.append(min(d, 2 * math.pi - d))
            if _mean(turns) < 0.3:
                n_signals += 1
                factors.append("Near-constant heading (scripted path, no micro-hesitations)")
    jitter = body.keystroke_jitter_ms
    if jitter is not None and jitter < 0.1:
        n_signals += 1
        factors.append("Keystroke inter-arrival jitter < 0.1ms (Automated input injection)")
    dts = [v.dt_ms for v in vecs]
    if len(dts) >= 2 and _mean(dts) > 0 and (math.sqrt(_var(dts)) / _mean(dts)) < 0.2:
        n_signals += 1
        factors.append("Metronomic sampling cadence (non-human timer regularity)")

    bot_prob = round(min(0.02 + 0.45 * n_signals, 0.999), 3)
    is_bot = n_signals >= 2
    return BotEvaluateResponse(
        session_id=body.session_id,
        verdict="AUTOMATED_BOT" if is_bot else "HUMAN_VERIFIED",
        bot_probability=bot_prob,
        confidence="HIGH" if (is_bot or bot_prob < 0.2) else "MEDIUM",
        attribution_factors=factors,
        action_recommended="BLOCK_OR_CHALLENGE" if is_bot else "ALLOW",
    )


def _risk_tier(score: float) -> str:
    if score >= 0.8:
        return "CRITICAL"
    if score >= 0.5:
        return "ELEVATED"
    if score >= 0.2:
        return "WATCH"
    return "LOW"


@router.get("/ztna/sessions", response_model=list[ZTNASessionResponse])
async def list_ztna_sessions(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Continuous identity risk table (Service 20)."""
    await _ensure_identity_schema()
    rows = list(
        (await db.execute(
            select(ZTNASession)
            .where(ZTNASession.tenant_id == user.tenant_id)
            .order_by(ZTNASession.risk_score.desc())
        )).scalars().all()
    )
    return [
        ZTNASessionResponse(
            user_email=r.user_email,
            current_risk_score=r.risk_score,
            risk_tier=_risk_tier(r.risk_score),
            risk_factors=r.factors or [],
            active_enclaves_accessed=r.enclaves or [],
            automated_action=(
                "ENCLAVE_ACCESS_QUARANTINED" if r.quarantined or r.risk_score >= 0.8
                else "STEP_UP_MFA" if r.risk_score >= 0.5
                else "ALLOW"
            ),
            timestamp=int(_aware(r.timestamp).timestamp()),
        )
        for r in rows
    ]
