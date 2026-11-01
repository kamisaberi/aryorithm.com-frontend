"""Enrolled Hub author-key lookup shared by auth and registry routes.

The authoritative enrollment row is ``hub_authors`` (one row per user).
Keys may have been stored historically as hex with a ``0x`` prefix or as
base64, so responses normalize them to the CLI-facing 64-character hex form.
"""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.hub import HubAuthor
from app.services import hub_service as hub


def normalize_author_public_key(raw: str | None) -> str | None:
    """Return the enrolled key as 64-char hex, or ``None`` when unenrolled."""
    if not raw or not raw.strip():
        return None
    try:
        return hub.decode_key_material(raw, 32, "author public key").hex()
    except ValueError:
        return None


async def author_public_key_for_user(
    db: AsyncSession, user_id: str
) -> str | None:
    """Fetch and normalize the caller's enrolled author public key."""
    raw = (
        await db.execute(
            select(HubAuthor.public_key).where(HubAuthor.user_id == user_id)
        )
    ).scalar_one_or_none()
    return normalize_author_public_key(raw)
