"""Seed real-world cybersecurity ONNX models into the models table.

- Downloads mirrored binaries from Hugging Face into storage/models/
  (skips files already present with matching sha256).
- Verifies sha256 + size_bytes against WEB_MODELS constants.
- Upserts one row per model for EVERY tenant; download_url is a working
  download link (relative local path for mirrored files, absolute HF URL
  for the 499MB CodeBERT artifact served via 302 redirect).

Idempotent: safe to re-run. Usage: PYTHONPATH=. .venv/bin/python seed_web_models.py
"""

import asyncio
import hashlib
import sys
import urllib.request
from pathlib import Path

sys.path.insert(0, ".")

from sqlalchemy import select

from app.database import AsyncSessionLocal, engine, Base
import app.models  # noqa: F401 (register tables for create_all)
from app.models.ai import Model
from app.models.user import Tenant
from app.services.model_inventory import (
    MODEL_STORAGE_DIR,
    SOURCE_URLS,
    WEB_MODELS,
    ensure_filename_column,
)


def sha256_of(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(8 * 1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def fetch(url: str, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(url, headers={"User-Agent": "aryorithm-seed/1.0"})
    with urllib.request.urlopen(req, timeout=600) as resp, open(dest, "wb") as out:
        while True:
            chunk = resp.read(8 * 1024 * 1024)
            if not chunk:
                break
            out.write(chunk)


async def main() -> None:
    # WEB_MODELS entries with a relative download_url are mirrored locally.
    mirrored = [m for m in WEB_MODELS if not m["download_url"].startswith("http")]
    for meta in mirrored:
        dest = MODEL_STORAGE_DIR / meta["filename"]
        expected = meta["sha256"]
        if dest.is_file() and sha256_of(dest) == expected:
            print(f"OK   {meta['filename']} already cached ({meta['size_bytes']} bytes)")
            continue
        url = SOURCE_URLS[meta["filename"]]
        print(f"FETCH {meta['filename']} <- {url}")
        fetch(url, dest)
        actual_hash = sha256_of(dest)
        actual_size = dest.stat().st_size
        if actual_hash != expected or actual_size != meta["size_bytes"]:
            raise SystemExit(
                f"HASH/SIZE MISMATCH for {meta['filename']}: "
                f"got {actual_hash}/{actual_size}, want {expected}/{meta['size_bytes']}"
            )
        print(f"OK   {meta['filename']} verified ({actual_size} bytes)")

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await ensure_filename_column()

    async with AsyncSessionLocal() as db:
        tenants = (await db.execute(select(Tenant))).scalars().all()
        if not tenants:
            raise SystemExit("No tenants found — run seed_demo.py first.")
        for tenant in tenants:
            existing = {
                m.filename
                for m in (
                    await db.execute(select(Model).where(Model.tenant_id == tenant.id))
                ).scalars()
            }
            for meta in WEB_MODELS:
                if meta["filename"] in existing or "REPLACE_" in meta["sha256"]:
                    continue
                db.add(Model(tenant_id=tenant.id, **meta))
                print(f"SEED {meta['filename']} -> tenant {tenant.name}")
        await db.commit()
    print("Done.")


if __name__ == "__main__":
    asyncio.run(main())
