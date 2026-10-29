"""Additive schema bootstrap for artifact workspace columns.

``Base.metadata.create_all`` creates missing tables but never adds columns to
an existing table.  Production MySQL is covered by the SQL migration; this
helper keeps local SQLite and already-provisioned MySQL databases compatible
without requiring a manual step.
"""

from __future__ import annotations

from app.database import run_schema_ddl

_COLUMNS = {
    "tenant_id": "VARCHAR(36)",
    "visibility": "VARCHAR(16) NOT NULL DEFAULT 'private'",
    "forked_from_type": "VARCHAR(16)",
    "forked_from_slug": "VARCHAR(128)",
    "fork_count": "INTEGER NOT NULL DEFAULT 0",
    "orphaned_root": "BOOLEAN NOT NULL DEFAULT 0",
    "deleted_at": "DATETIME",
}


def ensure_artifact_columns_sync(sync_conn) -> None:
    from sqlalchemy import inspect, text

    inspector = inspect(sync_conn)
    if "hub_asset_meta" not in inspector.get_table_names():
        return
    existing = {column["name"] for column in inspector.get_columns("hub_asset_meta")}
    for name, ddl in _COLUMNS.items():
        if name in existing:
            continue
        sync_conn.execute(text(f"ALTER TABLE hub_asset_meta ADD COLUMN {name} {ddl}"))
        if name == "visibility":
            # Legacy rows predate visibility and must remain public.
            sync_conn.execute(text("UPDATE hub_asset_meta SET visibility = 'public'"))


async def ensure_artifact_columns(bind=None) -> None:
    await run_schema_ddl(ensure_artifact_columns_sync, bind=bind)
