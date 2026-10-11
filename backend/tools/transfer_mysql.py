"""SQLite -> MySQL transfer tool for the Aryorithm backend.

Two modes (same data path, so both stay correct):

1. Dump mode (for cPanel shared hosting — import via phpMyAdmin):
     .venv/bin/python tools/transfer_mysql.py --dump aryorithm_mysql.sql

   Reads every table from the SQLite file, emits MySQL-8/MariaDB-compatible
   SQL: CREATE TABLEs rendered with SQLAlchemy's MySQL dialect from the real
   model metadata, then batched multi-row INSERTs in FK-safe order with
   FOREIGN_KEY_CHECKS disabled during load.

2. Direct mode (VPS / local MySQL server available):
     .venv/bin/python tools/transfer_mysql.py \\
         --target "mysql+aiomysql://USER:PASS@HOST:3306/DBNAME?charset=utf8mb4"

   Creates the schema with create_all() on the target and copies all rows.

Conversion rules (SQLite -> MySQL):
  - Python enums      -> their .value strings (stored in VARCHAR/ENUM cols)
  - Aware datetimes   -> naive UTC (MySQL DATETIME holds no timezone)
  - JSON values       -> json.dumps(ensure_ascii=False), validated on insert
  - Booleans          -> 1/0
  - Strings           -> backslash + quote escaped (mysqldump style)
  - Non-finite floats / bytes / Decimal -> hard failure (no silent corruption)

Usage notes:
  - Run from the backend/ directory: .venv/bin/python tools/transfer_mysql.py ...
  - Source DB: --source PATH (default ./aryorithm.db).
  - The dump contains tables + data only (no CREATE DATABASE): create the
    empty database in cPanel first with collation utf8mb4_unicode_ci, then
    import the .sql file via phpMyAdmin.
"""

from __future__ import annotations

import argparse
import datetime as dt
import enum
import json
import math
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

TABLE_EXCLUDE: set[str] = set()  # e.g. {"audit_logs"} to skip a table


# --------------------------------------------------------------------------
# value normalization (shared by both modes)
# --------------------------------------------------------------------------
def normalize_value(value):
    """Convert one SQLite-read cell into a MySQL-safe Python value."""
    if isinstance(value, enum.Enum):
        value = value.value
    if isinstance(value, dt.datetime):
        if value.tzinfo is not None:
            value = value.astimezone(dt.timezone.utc).replace(tzinfo=None)
        return value
    if isinstance(value, dt.date):
        return value
    if isinstance(value, bool):
        return int(value)
    if isinstance(value, float):
        if not math.isfinite(value):
            raise ValueError(f"non-finite float cannot be stored in MySQL: {value!r}")
        return value
    if isinstance(value, (bytes, bytearray)):
        raise ValueError(f"raw bytes column cannot be dumped as text: {len(value)} bytes")
    return value


def iter_table_rows_sync(sync_conn, table):
    """Yield normalized row dicts for one table (sync connection)."""
    from sqlalchemy import String, select

    # Fail loudly (with table.column) instead of hitting MySQL's
    # "Data too long" mid-import: SQLite ignores VARCHAR limits.
    limits = {
        c.name: c.type.length
        for c in table.columns
        if isinstance(c.type, String) and c.type.length
    }
    result = sync_conn.execute(select(table))
    columns = result.keys()
    for raw in result.fetchall():
        row = {}
        for col, val in zip(columns, raw):
            val = normalize_value(val)
            if isinstance(val, str) and col in limits and len(val) > limits[col]:
                raise ValueError(
                    f"{table.name}.{col}: value {len(val)} chars exceeds "
                    f"VARCHAR({limits[col]}): {val[:80]!r}…"
                )
            row[col] = val
        yield row


# --------------------------------------------------------------------------
# SQL literal rendering (dump mode)
# --------------------------------------------------------------------------
def sql_literal(value) -> str:
    if value is None:
        return "NULL"
    if isinstance(value, bool):  # must precede int (bool subclasses int)
        return "1" if value else "0"
    if isinstance(value, int):
        return str(value)
    if isinstance(value, float):
        return repr(value)
    if isinstance(value, dt.datetime):
        text = value.strftime("%Y-%m-%d %H:%M:%S.%f") if value.microsecond else value.strftime("%Y-%m-%d %H:%M:%S")
        return f"'{text}'"
    if isinstance(value, dt.date):
        return f"'{value.isoformat()}'"
    if isinstance(value, (dict, list)):
        return sql_literal(json.dumps(value, ensure_ascii=False))
    if isinstance(value, str):
        return "'" + value.replace("\\", "\\\\").replace("'", "\\'") + "'"
    raise ValueError(f"unsupported value type for dump: {type(value).__name__}={value!r}")


def qualified_name(table) -> str:
    return f"`{table.name}`"


def column_list(table) -> str:
    return ", ".join(f"`{c.name}`" for c in table.columns)


def dump_table_inserts(table, rows: list[dict], batch: int = 500) -> list[str]:
    """Render batched multi-row INSERT statements for already-read rows."""
    statements = []
    cols = column_list(table)
    name = qualified_name(table)
    for i in range(0, len(rows), batch):
        chunk = rows[i:i + batch]
        values = "(" + "), (".join(
            ", ".join(sql_literal(row[c.name]) for c in table.columns) for row in chunk
        ) + ")"
        statements.append(f"INSERT INTO {name} ({cols}) VALUES {values};")
    return statements


# --------------------------------------------------------------------------
# dump mode
# --------------------------------------------------------------------------
def build_dump(source_path: str) -> tuple[str, dict[str, int]]:
    """Read the SQLite file, return (sql_text, per-table row counts)."""
    from sqlalchemy import create_engine
    from sqlalchemy.dialects import mysql
    from sqlalchemy.schema import CreateIndex, CreateTable

    import app.models  # noqa: F401  (register all tables)

    from app.database import Base

    dialect = mysql.dialect()
    src = create_engine(f"sqlite:///{source_path}")
    counts: dict[str, int] = {}
    chunks: list[str] = [
        "-- Aryorithm backend MySQL import dump",
        "-- Generated from SQLite; import into an EMPTY database",
        "-- created with utf8mb4_unicode_ci collation (cPanel: MySQL Databases + phpMyAdmin).",
        "-- Tables + indexes + data. Foreign keys are enforced after load.",
        "/*!40101 SET NAMES utf8mb4 */;",
        "SET FOREIGN_KEY_CHECKS=0;",
        "",
    ]
    with src.connect() as conn:
        for table in Base.metadata.sorted_tables:
            if table.name in TABLE_EXCLUDE:
                continue
            ddl = str(CreateTable(table).compile(dialect=dialect)).rstrip()
            if not ddl.endswith(";"):
                ddl += ";"
            chunks.append(f"-- Table: {table.name}")
            chunks.append(f"DROP TABLE IF EXISTS `{table.name}`;")
            chunks.append(ddl)
            # Secondary indexes inline per table (right after CREATE TABLE):
            # plain INDEX objects are not part of CREATE TABLE output, and
            # child-table FOREIGN KEYs require the parent index to exist.
            # Tables are already topologically ordered, so parents come first.
            for index in sorted(table.indexes, key=lambda ix: ix.name or ""):
                idx_ddl = str(CreateIndex(index).compile(dialect=dialect)).rstrip()
                if not idx_ddl.endswith(";"):
                    idx_ddl += ";"
                chunks.append(idx_ddl)
            rows = list(iter_table_rows_sync(conn, table))
            counts[table.name] = len(rows)
            for stmt in dump_table_inserts(table, rows):
                chunks.append(stmt)
            chunks.append("")
    chunks.append("SET FOREIGN_KEY_CHECKS=1;")
    chunks.append("")
    return "\n".join(chunks), counts


# --------------------------------------------------------------------------
# direct mode
# --------------------------------------------------------------------------
async def direct_copy(source_path: str, target_url: str) -> dict[str, int]:
    """Copy all tables straight into a live MySQL database."""
    from sqlalchemy import create_engine, insert, text
    from sqlalchemy.ext.asyncio import create_async_engine

    import app.models  # noqa: F401

    from app.database import Base

    counts: dict[str, int] = {}
    src = create_engine(f"sqlite:///{source_path}")
    dst = create_async_engine(target_url)
    async with dst.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with dst.connect() as conn:
        await conn.execute(text("SET FOREIGN_KEY_CHECKS=0"))
        with src.connect() as sconn:
            for table in Base.metadata.sorted_tables:
                if table.name in TABLE_EXCLUDE:
                    continue
                rows = list(iter_table_rows_sync(sconn, table))
                counts[table.name] = len(rows)
                for i in range(0, len(rows), 500):
                    chunk = rows[i:i + 500]
                    if chunk:
                        await conn.execute(insert(table), chunk)
        await conn.execute(text("SET FOREIGN_KEY_CHECKS=1"))
        await conn.commit()
    await dst.dispose()
    return counts


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--source", default="./aryorithm.db", help="SQLite file to read (default ./aryorithm.db)")
    parser.add_argument("--dump", default=None, metavar="FILE.sql",
                        help="Write a phpMyAdmin-importable dump (cPanel mode)")
    parser.add_argument("--target", default=None, metavar="URL",
                        help="Live MySQL URL for direct copy (VPS mode)")
    parser.add_argument("--exclude", default="", help="Comma-separated table names to skip")
    args = parser.parse_args(argv)

    if args.exclude:
        TABLE_EXCLUDE.update(t.strip() for t in args.exclude.split(",") if t.strip())
    if not Path(args.source).is_file():
        print(f"error: source DB not found: {args.source}", file=sys.stderr)
        return 2
    if not args.dump and not args.target:
        args.dump = "aryorithm_mysql.sql"

    if args.dump:
        sql_text, counts = build_dump(args.source)
        Path(args.dump).write_text(sql_text, encoding="utf-8")
        total = sum(counts.values())
        print(f"wrote {args.dump} ({len(sql_text) / 1024:.0f} KiB): "
              f"{len(counts)} tables, {total} rows")
        for name in sorted(counts):
            print(f"  {name:28s} {counts[name]:6d} rows")
        return 0

    import asyncio

    counts = asyncio.run(direct_copy(args.source, args.target))
    total = sum(counts.values())
    print(f"copied {len(counts)} tables, {total} rows -> {args.target.split('@')[-1]}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
