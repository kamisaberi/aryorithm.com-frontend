"""Cloud Model Vault tests (isolated in-memory SQLite, fresh authority key)."""

import base64
import hashlib
import json

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app import models  # noqa: F401 (register tables)
from app.config import settings
from app.database import Base, get_db
from app.main import app
from app.models.user import UserRole
from tests.conftest import auth_headers, make_user

_auth = auth_headers

needs_db = pytest.mark.asyncio

OLD_PUB = settings.ARYORITHM_MASTER_PUBLIC_KEY_B64
OLD_VAULT_DIR = settings.MODEL_VAULT_DIR

TINY_ONNX = b"\x08\x07tiny-onnx-payload"


@pytest_asyncio.fixture
async def client(tmp_path, monkeypatch):
    from cryptography.hazmat.primitives import serialization
    from cryptography.hazmat.primitives.asymmetric import ed25519

    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    monkeypatch.setattr(settings, "MODEL_VAULT_DIR", str(tmp_path / "vault"))

    # Fresh authority key: tests sign with `priv`, API verifies via settings.
    priv = ed25519.Ed25519PrivateKey.generate()
    pub_raw = priv.public_key().public_bytes(
        encoding=serialization.Encoding.Raw,
        format=serialization.PublicFormat.Raw,
    )
    monkeypatch.setattr(settings, "ARYORITHM_MASTER_PUBLIC_KEY_B64", base64.b64encode(pub_raw).decode())

    async def override_get_db():
        async with factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac, factory, priv
    app.dependency_overrides.clear()
    settings.ARYORITHM_MASTER_PUBLIC_KEY_B64 = OLD_PUB
    settings.MODEL_VAULT_DIR = OLD_VAULT_DIR
    await engine.dispose()


async def _make_admin(factory):
    return await make_user(factory, email="admin@example.com")


def _upload_kwargs(priv, blob=TINY_ONNX, filename="custom_fp16.onnx", fmt="ONNX",
                   precision="FP16", hardware="UNIVERSAL"):
    files = {"file": (filename, blob)}
    data = {"format": fmt, "precision": precision, "target_hardware": hardware,
            "signature_ed25519": priv.sign(blob).hex()}
    return files, data


# --- catalog + detail --------------------------------------------------------
@needs_db
async def test_seed_and_catalog_filters(client):
    ac, factory, _ = client
    # Public: no auth needed.
    r = await ac.get("/api/v1/model-vault")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["total"] == 3
    by_slug = {m["slug"]: m for m in body["models"]}
    assert set(by_slug) == {"netflow-mae-v2", "scada-kinematic-v1", "ja4-c2-transformer-v1"}
    netflow = by_slug["netflow-mae-v2"]
    assert netflow["latest_version"] == "v2.1.0"
    assert set(netflow["available_formats"]) == {"ONNX", "SAFETENSORS"}
    assert netflow["p99_latency_ns"] == 75000
    assert netflow["golden_safety_verified"] is True

    r = await ac.get("/api/v1/model-vault", params={"domain": "SCADA_PHYSICAL"})
    assert [m["slug"] for m in r.json()["models"]] == ["scada-kinematic-v1"]
    r = await ac.get("/api/v1/model-vault", params={"format": "SAFETENSORS"})
    assert [m["slug"] for m in r.json()["models"]] == ["netflow-mae-v2"]
    r = await ac.get("/api/v1/model-vault", params={"tier": "FOUNDATION"})
    assert r.json()["total"] == 3
    r = await ac.get("/api/v1/model-vault", params={"stage": "FLEET_PRODUCTION"})
    assert r.json()["total"] == 3
    r = await ac.get("/api/v1/model-vault", params={"stage": "DEVELOPMENT"})
    assert r.json()["models"] == []
    r = await ac.get("/api/v1/model-vault", params={"tier": "NOPE"})
    assert r.status_code == 400


@needs_db
async def test_detail_tree_and_metadata_file(client, tmp_path):
    ac, factory, _ = client
    r = await ac.get("/api/v1/model-vault/netflow-mae-v2")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["architecture"] == "Tabular-MAE-32D"
    assert len(body["versions"]) == 1
    v = body["versions"][0]
    assert v["version"] == "v2.1.0" and v["rollout_stage"] == "FLEET_PRODUCTION"
    assert {a["format"] for a in v["artifacts"]} == {"ONNX", "SAFETENSORS"}
    onnx = next(a for a in v["artifacts"] if a["format"] == "ONNX")
    assert onnx["download_url"].endswith("/download?format=ONNX&precision=INT8&hardware=UNIVERSAL")

    r = await ac.get("/api/v1/model-vault/does-not-exist")
    assert r.status_code == 404

    meta = tmp_path / "vault" / "models" / "netflow-mae-v2" / "v2.1.0" / "metadata.json"
    assert meta.is_file()
    manifest = json.loads(meta.read_text())
    assert manifest["model_id"] == "aryo-netflow-mae-v2"
    assert len(manifest["artifacts"]) == 2


# --- download ----------------------------------------------------------------
@needs_db
async def test_download_headers_bytes_and_count(client):
    ac, factory, _ = client
    url = "/api/v1/model-vault/netflow-mae-v2/versions/v2.1.0/download"
    params = {"format": "ONNX", "precision": "INT8", "hardware": "UNIVERSAL"}

    r = await ac.get(url, params=params)
    assert r.status_code == 200, r.text
    assert r.headers["content-type"] == "application/octet-stream"
    assert r.headers["content-disposition"] == 'attachment; filename="netflow_mae_v2_int8.onnx"'
    assert r.headers["x-aryorithm-sha256"] == hashlib.sha256(r.content).hexdigest()
    assert r.headers["x-aryorithm-signature-ed25519"]
    assert r.headers["x-airgap-hash"] == f"sha256:{hashlib.sha256(r.content).hexdigest()}"
    assert len(r.content) == 142540

    r = await ac.get("/api/v1/model-vault/netflow-mae-v2")
    arts = r.json()["versions"][0]["artifacts"]
    assert [a for a in arts if a["format"] == "ONNX"][0]["download_count"] == 1

    r = await ac.get("/api/v1/model-vault/netflow-mae-v2/versions/v9.9.9/download")
    assert r.status_code == 404
    r = await ac.get("/api/v1/model-vault/netflow-mae-v2/versions/v2.1.0/download",
                     params={"format": "RKNN"})
    assert r.status_code == 404


@needs_db
async def test_download_gated_on_safety(client):
    ac, factory, priv = client
    admin_token, _, _ = await _make_admin(factory)
    h = _auth(admin_token)
    # Stage an unverified DEVELOPMENT version, then prove download refuses it.
    files, data = _upload_kwargs(priv)
    r = await ac.post("/api/v1/model-vault/netflow-mae-v2/versions/v9.9.0/upload-artifact",
                      files=files, data=data, headers=h)
    assert r.status_code == 201, r.text
    r = await ac.get("/api/v1/model-vault/netflow-mae-v2/versions/v9.9.0/download",
                     params={"format": "ONNX"})
    assert r.status_code == 403


# --- upload ------------------------------------------------------------------
@needs_db
async def test_upload_happy_path_and_worm(client, tmp_path):
    ac, factory, priv = client
    admin_token, _, _ = await _make_admin(factory)
    h = _auth(admin_token)
    files, data = _upload_kwargs(priv)
    r = await ac.post("/api/v1/model-vault/netflow-mae-v2/versions/v9.9.0/upload-artifact",
                      files=files, data=data, headers=h)
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["status"] == "STAGED" and body["version"] == "v9.9.0"
    assert body["sha256"] == hashlib.sha256(TINY_ONNX).hexdigest()

    # Sidecar + metadata refresh land next to the artifact.
    vdir = tmp_path / "vault" / "models" / "netflow-mae-v2" / "v9.9.0" / "onnx"
    assert (vdir / "custom_fp16.onnx.sig").is_file()

    # WORM: same coordinates cannot be replaced.
    files, data = _upload_kwargs(priv)
    r = await ac.post("/api/v1/model-vault/netflow-mae-v2/versions/v9.9.0/upload-artifact",
                      files=files, data=data, headers=h)
    assert r.status_code == 409

    # New version appears in DEVELOPMENT in the detail tree.
    r = await ac.get("/api/v1/model-vault/netflow-mae-v2")
    by_ver = {v["version"]: v for v in r.json()["versions"]}
    assert by_ver["v9.9.0"]["rollout_stage"] == "DEVELOPMENT"


@needs_db
async def test_upload_rejections(client):
    ac, factory, priv = client
    admin_token, _, _ = await _make_admin(factory)
    analyst_token, _, _ = await make_user(factory, email="b@example.com", role=UserRole.SECOPS_ANALYST)
    h, ha = _auth(admin_token), _auth(analyst_token)
    base = "/api/v1/model-vault/netflow-mae-v2/versions/v9.9.1/upload-artifact"

    # Bad signature.
    files, data = _upload_kwargs(priv)
    data["signature_ed25519"] = "00" * 64
    r = await ac.post(base, files=files, data=data, headers=h)
    assert r.status_code == 422

    # Pickle rejected even with a valid signature over the bytes.
    blob = b"pickle-payload"
    files = {"file": ("evil.pt", blob)}
    data = {"format": "SAFETENSORS", "precision": "FP32", "target_hardware": "UNIVERSAL",
            "signature_ed25519": priv.sign(blob).hex()}
    r = await ac.post(base, files=files, data=data, headers=h)
    assert r.status_code == 422

    # Extension/format mismatch.
    files, data = _upload_kwargs(priv, filename="model.xml")
    r = await ac.post(base, files=files, data=data, headers=h)
    assert r.status_code == 422

    # Unknown format.
    files, data = _upload_kwargs(priv)
    data["format"] = "NOPE"
    r = await ac.post(base, files=files, data=data, headers=h)
    assert r.status_code == 400

    # Auth matrix.
    files, data = _upload_kwargs(priv)
    r = await ac.post(base, files=files, data=data, headers=ha)
    assert r.status_code == 403
    files, data = _upload_kwargs(priv)
    r = await ac.post(base, files=files, data=data)
    assert r.status_code == 401


# --- safety gate + promote ---------------------------------------------------
@needs_db
async def test_verify_safety_and_promote(client):
    ac, factory, priv = client
    admin_token, _, _ = await _make_admin(factory)
    analyst_token, _, _ = await make_user(factory, email="b@example.com", role=UserRole.SECOPS_ANALYST)
    h, ha = _auth(admin_token), _auth(analyst_token)

    files, data = _upload_kwargs(priv)
    await ac.post("/api/v1/model-vault/netflow-mae-v2/versions/v9.9.2/upload-artifact",
                  files=files, data=data, headers=h)

    base = "/api/v1/model-vault/netflow-mae-v2/versions/v9.9.2"
    good = {"safety_gate_run_id": "forge-run-1", "golden_recall": 1.0,
            "tested_attacks_count": 48, "false_positive_rate": 0.0002, "verifier_signature": "ab"}
    bad = {**good, "golden_recall": 0.99}

    r = await ac.post(f"{base}/verify-safety", json=bad, headers=h)
    assert r.status_code == 400
    assert "100%" in r.json()["detail"]
    r = await ac.post(f"{base}/verify-safety", json=good, headers=ha)
    assert r.status_code == 403
    r = await ac.post(f"{base}/verify-safety", json=good, headers=h)
    assert r.status_code == 200 and r.json()["golden_safety_verified"] is True
    r = await ac.post("/api/v1/model-vault/netflow-mae-v2/versions/v0.0.0/verify-safety",
                      json=good, headers=h)
    assert r.status_code == 404

    # Promote: canary free, fleet gated on the gate.
    files, data = _upload_kwargs(priv)
    await ac.post("/api/v1/model-vault/netflow-mae-v2/versions/v9.9.3/upload-artifact",
                  files=files, data=data, headers=h)
    v3 = "/api/v1/model-vault/netflow-mae-v2/versions/v9.9.3"
    r = await ac.post(f"{v3}/promote", json={"target_stage": "CANARY_5_PERCENT"}, headers=h)
    assert r.status_code == 200 and r.json()["rollout_stage"] == "CANARY_5_PERCENT"
    r = await ac.post(f"{v3}/promote", json={"target_stage": "FLEET_PRODUCTION"}, headers=h)
    assert r.status_code == 400
    r = await ac.post(f"{base}/promote", json={"target_stage": "FLEET_PRODUCTION"}, headers=h)
    assert r.status_code == 200
    r = await ac.post(f"{base}/promote", json={"target_stage": "NOPE"}, headers=h)
    assert r.status_code == 422
