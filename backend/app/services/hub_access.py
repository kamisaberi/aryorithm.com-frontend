"""Visibility, scope and permission rules for unified Hub artifacts.

One authorization model is shared by the public catalog, workspace routes,
forking and sharing.  The authoritative visibility/tenant row is
``HubAssetMeta``; legacy rows without metadata remain public.
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import or_, select

from app.models.hub_shares import HubAssetShare

PERMISSIONS = ("VIEW", "FORK", "DEPLOY", "ADMIN")
SCOPES = ("all", "public", "private", "shared")
_PERMISSION_IMPLIES = {
    "VIEW": {"VIEW"},
    "FORK": {"VIEW", "FORK"},
    "DEPLOY": {"VIEW", "DEPLOY"},
    "ADMIN": {"VIEW", "FORK", "DEPLOY", "ADMIN"},
}


def role_value(user) -> str:
    role = getattr(user, "role", "")
    return str(getattr(role, "value", role))


def is_super_admin(user) -> bool:
    return bool(user) and role_value(user) == "super_admin"


def is_admin(user) -> bool:
    return bool(user) and role_value(user) in ("super_admin", "tenant_admin", "admin")


def is_tenant_admin(user) -> bool:
    return bool(user) and role_value(user) in ("tenant_admin", "super_admin", "admin")


def asset_key(view) -> tuple[str, str]:
    return (view.asset_type, view.slug)


def visibility_of(view) -> str:
    if view.meta is None:
        return "public"
    return (view.meta.visibility or "public").lower()


def owner_user_id(view) -> str | None:
    return view.meta.owner_user_id if view.meta is not None else None


def owner_tenant_id(view) -> str | None:
    return view.meta.tenant_id if view.meta is not None else None


def forked_from(view) -> dict | None:
    if view.meta is None or not view.meta.forked_from_type or not view.meta.forked_from_slug:
        return None
    return {
        "asset_type": view.meta.forked_from_type,
        "slug": view.meta.forked_from_slug,
    }


def _is_expired(expires_at: datetime | None) -> bool:
    if expires_at is None:
        return False
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    return expires_at < datetime.now(timezone.utc)


def share_matches(share: HubAssetShare, user) -> bool:
    if user is None or _is_expired(share.expires_at):
        return False
    grantee_type = (share.grantee_type or "").lower()
    if grantee_type == "user":
        return share.grantee_id == user.id
    if grantee_type == "tenant":
        return share.grantee_id == getattr(user, "tenant_id", None)
    if grantee_type == "email":
        return (share.grantee_email or "").lower() == (getattr(user, "email", "") or "").lower()
    return False


def _granted_permissions(shares: list[HubAssetShare]) -> set[str]:
    granted: set[str] = set()
    for share in shares:
        granted |= _PERMISSION_IMPLIES.get((share.permission or "").upper(), set())
    return granted


def permissions_for(view, user, shares: list[HubAssetShare] | None = None) -> list[str]:
    """Return the effective permissions for a caller on one asset."""
    if user is None:
        return [] if visibility_of(view) != "public" else ["VIEW"]

    if is_super_admin(user):
        return list(PERMISSIONS)

    is_owner = owner_user_id(view) == user.id
    same_tenant = bool(owner_tenant_id(view)) and owner_tenant_id(view) == getattr(
        user, "tenant_id", None
    )
    if is_owner:
        return list(PERMISSIONS)
    if is_tenant_admin(user) and same_tenant:
        return list(PERMISSIONS)

    granted: set[str] = set()
    if shares:
        granted |= _granted_permissions(shares)

    if visibility_of(view) == "public":
        # Public assets are readable by anyone and forkable/deployable by an
        # authenticated member; mutating the original still requires ADMIN.
        return list(dict.fromkeys(["VIEW", "FORK", "DEPLOY", *sorted(granted)]))
    if same_tenant:
        granted |= {"VIEW", "FORK", "DEPLOY"}
    return [permission for permission in PERMISSIONS if permission in granted]


def has_permission(view, user, permission: str, shares=None) -> bool:
    permission = permission.upper()
    if permission == "VIEW":
        return bool(permissions_for(view, user, shares))
    return permission in permissions_for(view, user, shares)


def share_query_for_user(user):
    values = [or_(
        HubAssetShare.grantee_type == "user",
        HubAssetShare.grantee_type == "tenant",
        HubAssetShare.grantee_type == "email",
    )]
    return values


async def share_map_for_user(db, user) -> dict[tuple[str, str], list[HubAssetShare]]:
    """Load all active direct/tenant/email shares granted to ``user``."""
    if user is None:
        return {}
    rows = (
        await db.execute(
            select(HubAssetShare).where(
                or_(
                    (HubAssetShare.grantee_type == "user")
                    & (HubAssetShare.grantee_id == user.id),
                    (HubAssetShare.grantee_type == "tenant")
                    & (HubAssetShare.grantee_id == user.tenant_id),
                    (HubAssetShare.grantee_type == "email")
                    & (HubAssetShare.grantee_email == (user.email or "").lower()),
                )
            )
        )
    ).scalars().all()
    result: dict[tuple[str, str], list[HubAssetShare]] = {}
    for share in rows:
        if _is_expired(share.expires_at):
            continue
        result.setdefault((share.asset_type, share.slug), []).append(share)
    return result


def shares_for_view(view, share_map: dict[tuple[str, str], list[HubAssetShare]]) -> list:
    return list(share_map.get(asset_key(view), []))


def decorate(view, user, shares: list | None = None) -> None:
    view.permissions = permissions_for(view, user, shares)


def decorate_views(views, user, share_map) -> None:
    for view in views:
        decorate(view, user, shares_for_view(view, share_map))


def visible_in_scope(view, user, scope: str, shares: list | None = None) -> bool:
    scope = (scope or "all").lower()
    if user is None:
        return visibility_of(view) == "public" and scope in ("all", "public")
    if is_super_admin(user):
        if scope == "shared":
            return bool(shares)
        if scope == "private":
            return visibility_of(view) == "private"
        if scope == "public":
            return visibility_of(view) == "public"
        return True

    visibility = visibility_of(view)
    same_tenant = bool(owner_tenant_id(view)) and owner_tenant_id(view) == user.tenant_id
    is_owner = owner_user_id(view) == user.id
    is_shared = bool(shares)
    if scope == "public":
        return visibility == "public"
    if scope == "private":
        return visibility == "private" and (same_tenant or is_owner)
    if scope == "shared":
        return is_shared
    return visibility == "public" or (visibility == "private" and (same_tenant or is_owner)) or is_shared


def scope_views(views, user, scope: str, share_map=None) -> list:
    share_map = share_map or {}
    return [
        view
        for view in views
        if visible_in_scope(view, user, scope, shares_for_view(view, share_map))
    ]
