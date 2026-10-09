"""Aryorithm Hub tests (isolated in-memory SQLite, ephemeral signing keys)."""

import base64
import io
import tarfile

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app import models  # noqa: F401 (register tables)
from app.config import settings
from app.database import Base, get_db
from app.main import app
from app.models.user import Tenant, TenantTier, User, UserRole
from app.services import hub_service as hub
from app.utils.security import create_access_token, hash_password

needs_db = pytest.mark.asyncio


@pytest_asyncio.fixture
async def client(tmp_path, monkeypatch):
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    monkeypatch.setattr(settings, "HUB_PACKAGE_DIR", str(tmp_path / "packages"))

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
        yield ac, factory
    app.dependency_overrides.clear()
    await engine.dispose()


async def _make_user(factory, email="dev@example.com", role=UserRole.TENANT_ADMIN):
    async with factory() as db:
        tenant = Tenant(name="Acme Energy", tier=TenantTier.PRO)
        db.add(tenant)
        await db.flush()
        user = User(
            email=email,
            password_hash=hash_password("password123"),
            name="Dev",
            role=role,
            tenant_id=tenant.id,
        )
        db.add(user)
        await db.flush()
        token, _ = create_access_token(user.id)
        await db.commit()
        return token, user.id, tenant.id


def _auth(token):
    return {"Authorization": f"Bearer {token}"}


def _dev_keypair():
    from cryptography.hazmat.primitives import serialization
    from cryptography.hazmat.primitives.asymmetric import ed25519

    priv = ed25519.Ed25519PrivateKey.generate()
    pub_raw = priv.public_key().public_bytes(
        encoding=serialization.Encoding.Raw, format=serialization.PublicFormat.Raw
    )
    return priv, "0x" + pub_raw.hex()


MANIFEST = """schema_version: "1.0.0"
metadata:
  id: "acme/demo-rule"
  version: "1.0.0"
  title: "Demo Rule"
  description: "A test rule package."
runtime:
  type: NATIVE_CPP20
  abi_version: "1.0"
network:
  default_ports: [502]
silicon:
  supported: [UNIVERSAL]
capabilities: [CAP_NET_ADMIN]
security:
  max_memory_mb: 16
"""


def _publish_files(priv, package: bytes, manifest: str = MANIFEST, pubkey: str | None = None):
    sig = priv.sign(package).hex()
    files = {
        "package_file": ("demo.splugin", package, "application/octet-stream"),
        "manifest_file": ("splugin.yaml", manifest.encode(), "text/yaml"),
        "signature_file": ("signature.sig", sig.encode(), "text/plain"),
    }
    data = {"changelog": "Initial test release", "readme_markdown": "# Demo Rule\n\nTest.\n"}
    if pubkey is not None:
        data["author_public_key"] = pubkey
    return files, data


# --- service unit tests ------------------------------------------------------
def test_lint_valid_manifest():
    result = hub.lint_manifest(MANIFEST)
    assert result["valid"] is True
    assert result["parsed_metadata"] == {"id": "acme/demo-rule", "version": "1.0.0", "runtime": "NATIVE_CPP20"}
    assert any(w["code"] == "CAP_NET_ADMIN_REQUIRED" for w in result["warnings"])


def test_lint_missing_abi_and_bad_port():
    bad = MANIFEST.replace('  abi_version: "1.0"\n', "").replace("[502]", "[99999]")
    result = hub.lint_manifest(bad)
    assert result["valid"] is False
    fields = {e["field"] for e in result["errors"]}
    assert "runtime.abi_version" in fields
    assert "network.default_ports" in fields


def test_semver_ordering():
    assert hub.is_newer("2.4.0", "2.3.1")
    assert not hub.is_newer("2.3.1", "2.4.0")
    assert not hub.is_newer("1.0.0", "1.0.0")
    assert hub.semver_key("garbage") < hub.semver_key("0.0.1")


# --- catalog API -------------------------------------------------------------
@needs_db
async def test_catalog_search_filters_sort(client):
    ac, _ = client
    r = await ac.get("/api/v1/plugins")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["total"] == 6 and body["total_pages"] == 1
    assert set(body["items"][0]) >= {"id", "slug", "metrics", "active_version", "author"}

    r = await ac.get("/api/v1/plugins", params={"q": "siemens"})
    assert [i["slug"] for i in r.json()["items"]] == ["siemens-s7comm-pro"]

    r = await ac.get("/api/v1/plugins", params={"category": "industrial-ot"})
    assert r.json()["total"] == 2
    r = await ac.get("/api/v1/plugins", params={"runtime": "WASM_SANDBOX"})
    assert r.json()["total"] == 1
    r = await ac.get("/api/v1/plugins", params={"tier": "OFFICIAL_CORE"})
    assert r.json()["total"] == 2
    r = await ac.get("/api/v1/plugins", params={"silicon": "INTEL_OPENVINO"})
    assert r.json()["total"] == 2
    r = await ac.get("/api/v1/plugins", params={"category": "nope"})
    assert r.status_code == 400

    r = await ac.get("/api/v1/plugins", params={"sort": "alpha", "limit": 2, "page": 2})
    body = r.json()
    assert body["total_pages"] == 3 and len(body["items"]) == 2
    titles = [i["title"] for i in (await ac.get("/api/v1/plugins", params={"sort": "alpha", "limit": 100})).json()["items"]]
    assert titles == sorted(titles, key=str.lower)

    r = await ac.get("/api/v1/plugins", params={"sort": "latency", "limit": 100})
    lat = [i["metrics"]["fast_path_latency_us"] for i in r.json()["items"]]
    assert lat[-1] is None  # nulls last


@needs_db
async def test_featured_facets_detail(client):
    ac, _ = client
    r = await ac.get("/api/v1/plugins/featured")
    assert r.status_code == 200 and len(r.json()) == 4

    r = await ac.get("/api/v1/plugins/facets")
    facets = r.json()
    assert facets["categories"]["industrial-ot"] == 2
    assert facets["runtimes"]["NATIVE_CPP20"] == 4
    assert facets["verification_tiers"]["OFFICIAL_CORE"] == 2

    r = await ac.get("/api/v1/plugins/siemens-s7comm-pro")
    assert r.status_code == 200, r.text
    detail = r.json()
    assert detail["ports"] == [102]
    assert detail["install_commands"]["sentinel_cli"] == "sentinel plugin install aryorithm/siemens-s7comm-pro:2.4.0"
    assert detail["active_version"]["download_url"] == "/api/v1/plugins/siemens-s7comm-pro/versions/2.4.0/download"

    r = await ac.get("/api/v1/plugins/does-not-exist")
    assert r.status_code == 404


@needs_db
async def test_readme_manifest_versions_download_security(client):
    ac, _ = client
    r = await ac.get("/api/v1/plugins/siemens-s7comm-pro/readme")
    assert r.json()["version"] == "2.4.0" and "S7Comm" in r.json()["content_markdown"]
    r = await ac.get("/api/v1/plugins/siemens-s7comm-pro/readme", params={"version": "2.3.1"})
    assert r.json()["version"] == "2.3.1"

    r = await ac.get("/api/v1/plugins/siemens-s7comm-pro/manifest")
    assert r.json()["parsed_json"]["metadata"]["id"] == "aryorithm/siemens-s7comm-pro"

    r = await ac.get("/api/v1/plugins/siemens-s7comm-pro/versions")
    versions = [v["version"] for v in r.json()["versions"]]
    assert versions == ["2.4.0", "2.3.1"]

    r = await ac.get("/api/v1/plugins/siemens-s7comm-pro/versions/2.4.0")
    assert r.json()["download_url"].endswith("/download")

    r = await ac.get("/api/v1/plugins/siemens-s7comm-pro/versions/2.4.0/download")
    assert r.status_code == 200
    assert r.headers["content-type"] == "application/octet-stream"
    assert r.headers["content-disposition"] == 'attachment; filename="siemens-s7comm-pro-2.4.0.splugin"'
    assert r.headers["x-checksum-sha256"] == (await ac.get("/api/v1/plugins/siemens-s7comm-pro/versions/2.4.0")).json()["sha256"]
    assert r.headers["x-signature-ed25519"]
    assert r.content == hub.seed_artifact("siemens-s7comm-pro", "2.4.0", "NATIVE_CPP20")

    r = await ac.get("/api/v1/plugins/siemens-s7comm-pro/versions/2.4.0/security")
    sec = r.json()
    assert sec["provenance"]["signature_algorithm"] == "Ed25519"
    assert sec["runtime_privileges"]["linux_capabilities"][0]["name"] == "CAP_NET_ADMIN"
    assert sec["runtime_privileges"]["zero_cloud_egress_verified"] is True


# --- registry ----------------------------------------------------------------
@needs_db
async def test_validate_endpoint_shapes(client):
    ac, _ = client
    r = await ac.post("/api/v1/registry/validate", json={"manifest_yaml": MANIFEST})
    assert r.status_code == 200 and r.json()["valid"] is True

    r = await ac.post("/api/v1/registry/validate", json={"manifest_yaml": "metadata:\n  id: bad"})
    assert r.status_code == 422
    assert r.json()["valid"] is False
    assert r.json()["errors"]


@needs_db
async def test_publish_download_yank_flow(client):
    ac, factory = client
    token, _, _ = await _make_user(factory)
    priv, pubkey = _dev_keypair()
    package = b"\x7fELF" + b"\x00" * 64

    # first publish enrolls the author key; bad signature is rejected
    files, data = _publish_files(priv, package, pubkey=pubkey)
    bad = dict(files)
    bad["signature_file"] = ("signature.sig", b"00" * 64, "text/plain")
    r = await ac.post("/api/v1/registry/publish", files=bad, data={**data, "author_public_key": pubkey}, headers=_auth(token))
    assert r.status_code == 422 and r.json()["error_code"] == "PLUGIN_SIGNATURE_INVALID"

    r = await ac.post("/api/v1/registry/publish", files=files, data=data, headers=_auth(token))
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["status"] == "PUBLISHED" and body["id"] == "acme/demo-rule"
    assert body["install_command"] == "sentinel plugin install acme/demo-rule:1.0.0"

    r = await ac.post("/api/v1/registry/publish", files=files, data=data, headers=_auth(token))
    assert r.status_code == 409  # duplicate version

    r = await ac.get("/api/v1/plugins/demo-rule/versions/1.0.0/download", headers=_auth(token))
    assert r.status_code == 200 and r.content == package
    assert r.headers["x-checksum-sha256"] == body["sha256"]

    # unauthenticated publish is rejected
    r = await ac.post("/api/v1/registry/publish", files=files, data=data)
    assert r.status_code == 401


@needs_db
async def test_tokens_star_telemetry_sync(client):
    ac, factory = client
    token, _, _ = await _make_user(factory, email="cli@example.com")
    priv, pubkey = _dev_keypair()
    package = b"\x7fELF" + b"\x00" * 32

    # CLI token lifecycle
    r = await ac.post("/api/v1/registry/tokens", json={"name": "CI", "scopes": ["packages:publish"], "expires_in_days": 30}, headers=_auth(token))
    assert r.status_code == 201
    api_key, token_id = r.json()["api_key"], r.json()["token_id"]
    assert api_key.startswith("ary_hub_live_")
    r = await ac.get("/api/v1/registry/tokens", headers=_auth(token))
    assert len(r.json()) == 1 and "api_key" not in r.json()[0]

    # publish baseline 1.0.0 first (JWT), then the security fix via ApiKey
    files, data = _publish_files(priv, package, pubkey=pubkey)
    r = await ac.post("/api/v1/registry/publish", files=files, data=data, headers=_auth(token))
    assert r.status_code == 201, r.text

    # publish via ApiKey scheme (second version, security fix)
    manifest2 = MANIFEST.replace('version: "1.0.0"', 'version: "1.0.1"')
    files, data = _publish_files(priv, package, manifest=manifest2, pubkey=pubkey)
    data["security_update"] = "true"
    data["changelog"] = "Security fix"
    r = await ac.post(
        "/api/v1/registry/publish", files=files, data=data,
        headers={"Authorization": f"ApiKey {api_key}"},
    )
    assert r.status_code == 201, r.text

    # revoke kills the token
    r = await ac.delete(f"/api/v1/registry/tokens/{token_id}", headers=_auth(token))
    assert r.json()["revoked"] is True
    files, data = _publish_files(priv, package, manifest=manifest2, pubkey=pubkey)
    r = await ac.post("/api/v1/registry/publish", files=files, data=data, headers={"Authorization": f"ApiKey {api_key}"})
    assert r.status_code == 401

    # star toggle needs JWT
    r = await ac.post("/api/v1/plugins/demo-rule/star")
    assert r.status_code == 401
    r = await ac.post("/api/v1/plugins/demo-rule/star", headers=_auth(token))
    assert r.json() == {"starred": True, "total_stars": 1}
    r = await ac.post("/api/v1/plugins/demo-rule/star", headers=_auth(token))
    assert r.json() == {"starred": False, "total_stars": 0}

    # install telemetry is public + counted
    r = await ac.post("/api/v1/telemetry/install", json={"slug": "demo-rule", "version": "1.0.1", "silicon_target": "UNIVERSAL"})
    assert r.status_code == 202
    r = await ac.get("/api/v1/plugins/demo-rule")
    assert r.json()["metrics"]["install_count"] == 1

    # check-updates flags the security fix as critical
    r = await ac.post("/api/v1/sync/check-updates", json={
        "sentinel_version": "2.4.0",
        "installed_plugins": [{"slug": "demo-rule", "current_version": "1.0.0"}],
    })
    (upd,) = r.json()["updates_available"]
    assert upd["latest_version"] == "1.0.1" and upd["critical_security_update"] is True

    # yank hides it from fresh installs but keeps history downloadable
    r = await ac.request("DELETE", "/api/v1/registry/demo-rule/versions/1.0.1",
                         json={"reason": "CRITICAL_SECURITY_VULNERABILITY", "advisory_notes": "Upgrade now."},
                         headers=_auth(token))
    assert r.json()["yanked"] is True
    r = await ac.post("/api/v1/sync/check-updates", json={
        "sentinel_version": "2.4.0",
        "installed_plugins": [{"slug": "demo-rule", "current_version": "1.0.0"}],
    })
    assert r.json()["updates_available"] == []
    r = await ac.get("/api/v1/plugins/demo-rule/versions/1.0.1/download")
    assert r.status_code == 200

    # air-gapped bundle over a live version
    r = await ac.post("/api/v1/sync/airgap-bundle", json={
        "requested_plugins": [{"slug": "demo-rule", "version": "1.0.0"}],
        "target_silicon": "UNIVERSAL",
    })
    assert r.status_code == 200
    assert r.headers["content-type"] == "application/gzip"
    assert r.headers["content-disposition"].startswith('attachment; filename="aryorithm_airgap_bundle_')
    tar = tarfile.open(fileobj=io.BytesIO(r.content), mode="r:gz")
    names = tar.getnames()
    assert "demo-rule-1.0.0.splugin" in names and "VERIFY.sh" in names and "bundle.manifest.json" in names
