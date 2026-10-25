"""Tests for the unified Hub asset surface (/hub/catalog, /hub/search, ...)."""

import hashlib
import json
import shutil

import pytest

needs_db = pytest.mark.asyncio


def _keypair():
    from cryptography.hazmat.primitives.asymmetric import ed25519

    priv = ed25519.Ed25519PrivateKey.generate()
    return priv, priv.public_key().public_bytes_raw().hex()


async def _mint_token(factory, user_id, scopes=("packages:publish",)):
    from app.models.hub import HubApiToken
    from app.services import hub_service as hub

    raw = hub.new_api_key()
    async with factory() as db:
        db.add(
            HubApiToken(
                token_id=hub.new_token_id(),
                name="asset-test",
                key_prefix=raw[:16],
                key_hash=hashlib.sha256(raw.encode()).hexdigest(),
                scopes=list(scopes),
                user_id=user_id,
            )
        )
        await db.commit()
    return raw


@needs_db
async def test_catalog_search_and_categories(client):
    ac, _factory = client

    r = await ac.get("/api/v1/hub/catalog", params={"limit": 100})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["total"] >= 22
    assert body["page"] == 1
    assert body["limit"] == 100
    kinds = {item["asset_type"] for item in body["results"]}
    assert kinds == {"package", "model", "dataset", "pcap", "scenario"}
    sample = body["results"][0]
    for field in (
        "id",
        "slug",
        "name",
        "asset_type",
        "tier",
        "version",
        "author",
        "author_public_key",
        "target_protocol",
        "latency_sla_ns",
        "downloads",
        "size_bytes",
        "verified_signature",
        "compliance",
        "published_at",
    ):
        assert field in sample

    r = await ac.get("/api/v1/hub/search", params={"q": "modbus", "type": "package"})
    assert r.status_code == 200, r.text
    results = r.json()["results"]
    assert results
    assert all(item["asset_type"] == "package" for item in results)
    assert any("modbus" in (item["slug"] + item["name"]).lower() for item in results)

    r = await ac.get("/api/v1/hub/search", params={"q": "water"})
    assert r.status_code == 200

    r = await ac.get("/api/v1/hub/search", params={"type": "bogus"})
    assert r.status_code == 400

    r = await ac.get("/api/v1/hub/search", params={"sort": "bogus"})
    assert r.status_code == 400

    r = await ac.get("/api/v1/hub/categories")
    assert r.status_code == 200, r.text
    categories = r.json()
    assert categories["total"] >= 22
    counts = {row["asset_type"]: row["count"] for row in categories["asset_types"]}
    assert counts["package"] >= 8
    assert counts["model"] >= 3
    assert counts["pcap"] >= 5
    assert counts["dataset"] >= 3
    assert counts["scenario"] >= 3


@needs_db
async def test_asset_detail_sla_readme_signature_and_download(client):
    from cryptography.hazmat.primitives.asymmetric import ed25519

    ac, _factory = client

    r = await ac.get("/api/v1/hub/assets/package/modbus-actuator-guard")
    assert r.status_code == 200, r.text
    detail = r.json()
    assert detail["asset_type"] == "package"
    assert detail["signature_status"] == "Ed25519_VALID"
    assert detail["manifest"]["asset_type"] == "package"
    assert detail["download_url"].endswith("/download")
    assert len(detail["merkle_sha256"]) == 64
    public_key = bytes.fromhex(detail["author_public_key"])

    r = await ac.get("/api/v1/hub/assets/package/modbus-actuator-guard/sla")
    assert r.status_code == 200, r.text
    sla = r.json()
    assert sla["verified"] is True
    assert sla["latency_sla_ns"] == 120
    assert sla["benchmark"]["mitigation_action"]

    r = await ac.get("/api/v1/hub/assets/package/modbus-actuator-guard/readme")
    assert r.status_code == 200
    assert "Installation" in r.json()["content_markdown"]

    r = await ac.get(
        "/api/v1/hub/assets/package/modbus-actuator-guard/readme", params={"raw": "true"}
    )
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("text/markdown")
    assert r.text.startswith("# ")

    r = await ac.get("/api/v1/hub/assets/package/modbus-actuator-guard/signature")
    assert r.status_code == 200
    assert len(r.content) == 64
    signature = r.content
    assert r.headers["x-ed25519-public-key"] == detail["author_public_key"]

    r = await ac.get("/api/v1/hub/assets/package/modbus-actuator-guard/download")
    assert r.status_code == 200
    blob = r.content
    assert r.headers["etag"] == f'"{hashlib.sha256(blob).hexdigest()}"'
    assert r.headers["x-checksum-sha256"] == hashlib.sha256(blob).hexdigest()
    assert r.headers["x-ed25519-signature"] == signature.hex()
    ed25519.Ed25519PublicKey.from_public_bytes(public_key).verify(signature, blob)

    # All five types must be inspectable through the same route.
    for asset_type, slug in (
        ("model", "netflow-mae-v2"),
        ("dataset", "cicids2017-portscan"),
        ("pcap", "stuxnet-s7comm"),
        ("scenario", "power-grid-blackout"),
    ):
        r = await ac.get(f"/api/v1/hub/assets/{asset_type}/{slug}")
        assert r.status_code == 200, (asset_type, r.text)
        assert r.json()["asset_type"] == asset_type
        r = await ac.get(f"/api/v1/hub/assets/{asset_type}/{slug}/download")
        assert r.status_code == 200, (asset_type, r.text)

    r = await ac.get("/api/v1/hub/assets/bogus/x")
    assert r.status_code == 400
    r = await ac.get("/api/v1/hub/assets/package/does-not-exist")
    assert r.status_code == 404


@needs_db
async def test_publish_persists_signature_and_owner_can_revoke(client, tmp_path):
    from cryptography.hazmat.primitives.asymmetric import ed25519

    from app.config import settings
    from tests.conftest import make_user

    ac, factory = client
    _, user_id, _ = await make_user(factory, email="asset-owner@example.com")
    token = await _mint_token(factory, user_id)
    priv, pub = _keypair()
    slug = "unified-asset-test"
    blob = b"SPKG1:unified-test\n" + b"\x00" * 64
    signature = priv.sign(blob).hex()
    manifest = {
        "slug": slug,
        "name": "Unified Asset Test",
        "tier": "lua",
        "version": "1.0.0",
        "author_public_key": pub,
        "sector": "Water",
        "compliance_tags": ["IEC-62443"],
        "short_description": "test package",
        "technical_details": "test body",
    }
    original_dir = settings.HUB_PACKAGE_DIR
    settings.HUB_PACKAGE_DIR = str(tmp_path / "packages")
    try:
        r = await ac.post(
            "/api/v1/hub/publish",
            headers={"Authorization": f"Bearer {token}"},
            files={"file": (f"{slug}.spkg", blob, "application/octet-stream")},
            data={"asset_type": "package", "manifest": json.dumps(manifest), "signature": signature},
        )
        assert r.status_code == 201, r.text
        published = r.json()
        assert published["status"] == "success"  # legacy field preserved
        assert published["asset_id"] == f"org.aryorithm.package.{slug}"
        assert published["download_url"].endswith(f"/api/v1/hub/packages/{slug}/download")
        assert published["slug"] == slug
        assert published["asset_type"] == "package"
        assert published["version"] == "1.0.0"
        assert published["url"].endswith(f"/packages/{slug}")
        assert published["download_endpoint"] == f"/api/v1/hub/assets/package/{slug}/download"
        assert published["verification"] == {
            "sha256": hashlib.sha256(blob).hexdigest(),
            "signature_verified": True,
            "signer_public_key": pub,
        }

        r = await ac.get(f"/api/v1/hub/assets/package/{slug}")
        assert r.status_code == 200, r.text
        detail = r.json()
        assert detail["author_public_key"] == pub
        assert detail["signature_status"] == "Ed25519_VALID"
        assert detail["manifest"]["slug"] == slug

        r = await ac.get(f"/api/v1/hub/assets/package/{slug}/signature")
        assert r.status_code == 200
        assert r.content == bytes.fromhex(signature)

        r = await ac.get(f"/api/v1/hub/assets/package/{slug}/download")
        assert r.status_code == 200, r.text
        assert r.content == blob
        ed25519.Ed25519PublicKey.from_public_bytes(bytes.fromhex(pub)).verify(
            bytes.fromhex(signature), r.content
        )

        # A different logged-in non-admin user cannot revoke it.
        from app.models.user import UserRole

        other_token, _other_id, _ = await make_user(
            factory, email="other@example.com", role=UserRole.SECOPS_ANALYST
        )
        r = await ac.delete(
            f"/api/v1/hub/assets/package/{slug}",
            headers={"Authorization": f"Bearer {other_token}"},
        )
        assert r.status_code == 403

        r = await ac.delete(
            f"/api/v1/hub/assets/package/{slug}",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r.status_code == 200, r.text
        assert r.json()["status"] == "revoked"
        r = await ac.get(f"/api/v1/hub/assets/package/{slug}")
        assert r.status_code == 404
        assert not (tmp_path / "packages" / "sentinel" / slug / f"{slug}.spkg").exists()
    finally:
        settings.HUB_PACKAGE_DIR = original_dir
        shutil.rmtree(tmp_path / "packages" / "sentinel" / slug, ignore_errors=True)


@needs_db
async def test_publish_scenario_and_download_through_unified_routes(client, tmp_path):
    from app.config import settings
    from tests.conftest import make_user

    ac, factory = client
    _, user_id, _ = await make_user(factory, email="scenario-owner@example.com")
    token = await _mint_token(factory, user_id)
    priv, pub = _keypair()
    slug = "water-treatment-test"
    blob = b"SCEN1:water-test\n" + b"\x00" * 128
    signature = priv.sign(blob).hex()
    manifest = {
        "slug": slug,
        "name": "Water Treatment Test Scenario",
        "complexity": "ADVANCED_RED_TEAM",
        "target_sector": "Water & Wastewater",
        "network_subnet": "10.240.0.0/24",
        "node_topology": {"substation_edge": {"ip": "10.240.0.101", "role": "PLC"}},
        "replayed_attacks": ["Modbus coil override"],
        "expected_mitigation_sla": "0.84 us",
        "short_description": "test scenario",
        "technical_walkthrough": "test walkthrough",
        "author_public_key": pub,
    }
    original_dir = settings.HUB_PACKAGE_DIR
    settings.HUB_PACKAGE_DIR = str(tmp_path / "packages")
    try:
        r = await ac.post(
            "/api/v1/hub/publish",
            headers={"Authorization": f"Bearer {token}"},
            files={"file": (f"{slug}.tar.gz", blob, "application/gzip")},
            data={
                "asset_type": "scenario",
                "manifest": json.dumps(manifest),
                "signature": signature,
            },
        )
        assert r.status_code == 201, r.text
        published = r.json()
        assert published["status"] == "success"
        assert published["asset_id"] == f"scenario-{slug}"
        assert published["slug"] == slug
        assert published["asset_type"] == "scenario"
        assert published["version"] == "1.0.0"
        assert published["url"].endswith(f"/scenarios/{slug}")
        assert published["download_endpoint"] == f"/api/v1/hub/assets/scenario/{slug}/download"
        assert published["verification"]["sha256"] == hashlib.sha256(blob).hexdigest()
        assert published["verification"]["signer_public_key"] == pub

        r = await ac.get(f"/api/v1/hub/assets/scenario/{slug}")
        assert r.status_code == 200, r.text
        detail = r.json()
        assert detail["manifest"]["complexity"] == "ADVANCED_RED_TEAM"
        assert detail["download_url"].endswith(f"/api/v1/hub/assets/scenario/{slug}/download")

        r = await ac.get(f"/api/v1/hub/assets/scenario/{slug}/signature")
        assert r.status_code == 200
        assert r.content == bytes.fromhex(signature)

        r = await ac.get(f"/api/v1/hub/assets/scenario/{slug}/download")
        assert r.status_code == 200, r.text
        assert r.content == blob
        assert r.headers["x-checksum-sha256"] == hashlib.sha256(blob).hexdigest()

        # The legacy scenario download path still serves the same bytes.
        r = await ac.get(f"/api/v1/hub/scenarios/{slug}/download")
        assert r.status_code == 200, r.text
        assert r.content == blob
    finally:
        settings.HUB_PACKAGE_DIR = original_dir


@needs_db
async def test_registry_token_validate_accepts_bearer_and_apikey(client):
    from tests.conftest import make_user

    ac, factory = client
    _, user_id, _ = await make_user(factory, email="token-validate@example.com")
    token = await _mint_token(factory, user_id, scopes=("packages:publish",))

    for headers in (
        {"Authorization": f"Bearer {token}"},
        {"Authorization": f"ApiKey {token}"},
    ):
        r = await ac.get("/api/v1/registry/tokens/validate", headers=headers)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["valid"] is True
        assert body["scopes"] == ["packages:publish"]
        assert body["quota"]["max_upload_bytes"] > 0
        assert body["user"]["user_id"] == user_id

    r = await ac.get(
        "/api/v1/registry/tokens/validate",
        headers={"Authorization": "Bearer ary_hub_live_not-a-real-key"},
    )
    assert r.status_code == 401
    r = await ac.get("/api/v1/registry/tokens/validate")
    assert r.status_code == 401
