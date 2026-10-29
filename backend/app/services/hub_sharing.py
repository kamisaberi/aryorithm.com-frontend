"""Direct share grants and signed expiring share links."""

from __future__ import annotations

import hashlib
import hmac
import uuid
from datetime import datetime, timezone

from sqlalchemy import select

from app.config import settings
from app.models.hub_shares import HubAssetShare, HubShareLink
from app.services import hub_access as access

GRANTEE_TYPES = ("user", "tenant", "email")


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _aware(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _permission(value: str) -> str:
    permission = (value or "").strip().upper()
    if permission not in access.PERMISSIONS:
        raise ValueError(
            f"permission must be one of: {', '.join(access.PERMISSIONS)}"
        )
    return permission


def _expiry(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    normalized = _aware(value)
    if normalized is not None and normalized <= now_utc():
        raise ValueError("expires_at must be in the future")
    return normalized


async def create_share(
    db,
    *,
    asset_type: str,
    slug: str,
    grantee_type: str,
    permission: str,
    grantee_id: str | None = None,
    grantee_email: str | None = None,
    expires_at: datetime | None = None,
    created_by: str | None = None,
) -> HubAssetShare:
    grantee_type = (grantee_type or "").strip().lower()
    if grantee_type not in GRANTEE_TYPES:
        raise ValueError(f"grantee_type must be one of: {', '.join(GRANTEE_TYPES)}")
    permission = _permission(permission)
    expires_at = _expiry(expires_at)
    if grantee_type in ("user", "tenant") and not grantee_id:
        raise ValueError("grantee_id is required for user/tenant shares")
    if grantee_type == "email":
        email = (grantee_email or "").strip().lower()
        if not email or "@" not in email:
            raise ValueError("a valid grantee_email is required")
        grantee_email = email
        grantee_id = email
    else:
        grantee_email = (grantee_email or "").strip().lower() or None

    existing = (
        await db.execute(
            select(HubAssetShare).where(
                HubAssetShare.asset_type == asset_type,
                HubAssetShare.slug == slug,
                HubAssetShare.grantee_type == grantee_type,
                HubAssetShare.grantee_id == grantee_id,
                HubAssetShare.grantee_email == grantee_email,
                HubAssetShare.permission == permission,
            )
        )
    ).scalar_one_or_none()
    if existing is not None:
        existing.expires_at = expires_at
        existing.created_by = created_by
        await db.flush()
        return existing

    row = HubAssetShare(
        id=str(uuid.uuid4()),
        asset_type=asset_type,
        slug=slug,
        grantee_type=grantee_type,
        grantee_id=grantee_id,
        grantee_email=grantee_email,
        permission=permission,
        created_by=created_by,
        expires_at=expires_at,
        created_at=now_utc(),
    )
    db.add(row)
    await db.flush()
    return row


async def list_shares(db, asset_type: str, slug: str) -> list[HubAssetShare]:
    return list(
        (
            await db.execute(
                select(HubAssetShare)
                .where(
                    HubAssetShare.asset_type == asset_type,
                    HubAssetShare.slug == slug,
                )
                .order_by(HubAssetShare.created_at.desc())
            )
        )
        .scalars()
        .all()
    )


async def delete_share(db, share_id: str, asset_type: str, slug: str) -> bool:
    row = await db.get(HubAssetShare, share_id)
    if row is None or row.asset_type != asset_type or row.slug != slug:
        return False
    await db.delete(row)
    await db.flush()
    return True


def public_share(row: HubAssetShare, user=None) -> dict:
    return {
        "id": row.id,
        "asset_type": row.asset_type,
        "slug": row.slug,
        "grantee_type": row.grantee_type,
        "grantee_id": row.grantee_id,
        "grantee_email": row.grantee_email,
        "permission": row.permission,
        "expires_at": (
            _aware(row.expires_at).isoformat().replace("+00:00", "Z")
            if row.expires_at
            else None
        ),
        "created_at": (
            _aware(row.created_at).isoformat().replace("+00:00", "Z")
            if row.created_at
            else None
        ),
    }


def _token_signature(link_id: str, expires_ts: int) -> str:
    payload = f"{link_id}.{expires_ts}".encode()
    return hmac.new(
        settings.SECRET_KEY.encode(), payload, hashlib.sha256
    ).hexdigest()[:40]


def _make_token(link_id: str, expires_at: datetime | None) -> str:
    expires_ts = int(expires_at.timestamp()) if expires_at else 0
    return f"{link_id}.{expires_ts}.{_token_signature(link_id, expires_ts)}"


def _parse_token(token: str) -> tuple[str, int] | None:
    parts = (token or "").strip().split(".")
    if len(parts) != 3:
        return None
    link_id, expires_raw, signature = parts
    try:
        expires_ts = int(expires_raw)
    except ValueError:
        return None
    expected = _token_signature(link_id, expires_ts)
    if not hmac.compare_digest(signature, expected):
        return None
    return link_id, expires_ts


async def create_link(
    db,
    *,
    asset_type: str,
    slug: str,
    permission: str = "VIEW",
    expires_at: datetime | None = None,
    max_uses: int | None = None,
    created_by: str | None = None,
) -> tuple[HubShareLink, str, str]:
    permission = _permission(permission)
    expires_at = _expiry(expires_at)
    if max_uses is not None and max_uses < 1:
        raise ValueError("max_uses must be at least 1")
    link_id = str(uuid.uuid4())
    token = _make_token(link_id, expires_at)
    row = HubShareLink(
        id=link_id,
        asset_type=asset_type,
        slug=slug,
        token_hash=hashlib.sha256(token.encode()).hexdigest(),
        token_prefix=token[:18],
        permission=permission,
        expires_at=expires_at,
        max_uses=max_uses,
        use_count=0,
        revoked=False,
        created_by=created_by,
        created_at=now_utc(),
    )
    db.add(row)
    await db.flush()
    return row, token, share_link_url(token)


def share_link_url(token: str) -> str:
    return f"{settings.WORKSPACE_PUBLIC_BASE.rstrip('/')}/share/{token}"


async def resolve_link(db, token: str) -> HubShareLink | None:
    parsed = _parse_token(token)
    if parsed is None:
        return None
    link_id, expires_ts = parsed
    row = await db.get(HubShareLink, link_id)
    if row is None or row.revoked:
        return None
    if hashlib.sha256((token or "").strip().encode()).hexdigest() != row.token_hash:
        return None
    if expires_ts and datetime.fromtimestamp(expires_ts, tz=timezone.utc) <= now_utc():
        return None
    if row.max_uses is not None and int(row.use_count or 0) >= int(row.max_uses):
        return None
    return row


async def consume_link(db, link: HubShareLink) -> None:
    link.use_count = int(link.use_count or 0) + 1
    link.last_used_at = now_utc()
    await db.flush()


def link_grants(link: HubShareLink, permission: str = "VIEW") -> bool:
    wanted = _permission(permission)
    return wanted in access._PERMISSION_IMPLIES.get(
        (link.permission or "").upper(), set()
    )


def public_link(row: HubShareLink, token: str | None = None) -> dict:
    payload = {
        "id": row.id,
        "asset_type": row.asset_type,
        "slug": row.slug,
        "permission": row.permission,
        "expires_at": (
            _aware(row.expires_at).isoformat().replace("+00:00", "Z")
            if row.expires_at
            else None
        ),
        "max_uses": row.max_uses,
        "use_count": row.use_count,
        "revoked": row.revoked,
        "created_at": (
            _aware(row.created_at).isoformat().replace("+00:00", "Z")
            if row.created_at
            else None
        ),
        "last_used_at": (
            _aware(row.last_used_at).isoformat().replace("+00:00", "Z")
            if row.last_used_at
            else None
        ),
    }
    if token:
        payload["token"] = token
        payload["url"] = share_link_url(token)
    return payload
