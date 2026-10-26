"""Hub production blueprints + official appliance Matrix Selector tests."""

import base64
import hashlib
import io
import json
import zipfile

import pytest
from cryptography.hazmat.primitives.asymmetric import ed25519

from app.config import settings
from app.models.user import UserRole
from tests.conftest import auth_headers, make_user
from tests.test_hub_publish import _mint_token

needs_db = pytest.mark.asyncio


def _keypair():
    private = ed25519.Ed25519PrivateKey.generate()
    public_raw = private.public_key().public_bytes_raw()
    return private, public_raw.hex(), base64.b64encode(public_raw).decode()


def _blueprint_bundle(dag: str) -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as archive:
        archive.writestr("model_routes.yaml", dag)
        archive.writestr("README.md", "Signed production blueprint")
    return buffer.getvalue()


async def _publish_blueprint(ac, token, blob, manifest, signature, filename="site.blueprint"):
    return await ac.post(
        "/api/v1/hub/blueprints/publish",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": (filename, blob, "application/octet-stream")},
        data={"manifest": json.dumps(manifest), "signature": signature},
    )


@needs_db
async def test_blueprint_publish_catalog_and_yank(client, tmp_path, monkeypatch):
    ac, factory = client
    monkeypatch.setattr(settings, "HUB_BLUEPRINTS_DIR", str(tmp_path / "blueprints"))
    _, user_id, _ = await make_user(factory, email="bp-author@example.com")
    api_key = await _mint_token(factory, user_id)
    private, public_hex, _ = _keypair()

    dag = "version: 1\nstages:\n  - name: acquire\n    model: netflow-mae-v2\n"
    blob = _blueprint_bundle(dag)
    manifest = {
        "slug": "water_substation_alpha",
        "name": "Water Substation Alpha",
        "version": "1.0.0",
        "target_site": "Water-Plant-Amsterdam-01",
        "industry": "WATER_TREATMENT",
        "target_architecture": "x86_64",
        "description": "Production Edge Blueprint",
        "primary_interface": "ens160",
        "max_pipeline_latency_us": 100.0,
        "dependencies": {
            "packages": ["modbus_rate_limiter"],
            "models": ["industrial_anomaly_detector"],
        },
        "hardware_binding": {
            "primary_interface": "ens160",
            "af_xdp_mode": "SKB",
            "rss_queues": [0, 1, 2, 3],
            "cpu_affinity_cores": [2, 3, 4, 5],
            "require_physical_tpm": True,
        },
        "sla_guarantees": {
            "max_pipeline_latency_us": 100.0,
            "critical_clearing_time_ms": 38.4,
        },
        "author": "Aryorithm Certified Engineer",
        "author_public_key": public_hex,
    }
    signature = private.sign(blob).hex()

    r = await _publish_blueprint(ac, api_key, blob, manifest, signature)
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["status"] == "published"
    assert body["asset_type"] == "blueprint"
    assert body["verification"]["signature_verified"] is True
    assert body["verification"]["sha256"] == hashlib.sha256(blob).hexdigest()

    # Catalog filters + pagination metadata.
    r = await ac.get(
        "/api/v1/hub/blueprints",
        params={
            "q": "substation",
            "industry": "water_treatment",
            "target_arch": "x86_64",
            "page": 1,
            "limit": 20,
            "sort": "downloads",
        },
    )
    assert r.status_code == 200, r.text
    catalog = r.json()
    assert catalog["total"] == 1
    assert catalog["page"] == 1
    assert catalog["total_pages"] == 1
    item = catalog["results"][0]
    assert item["slug"] == "water_substation_alpha"
    assert item["author"] == "Aryorithm Certified Engineer"
    assert item["dependencies"]["packages"] == ["modbus_rate_limiter"]
    assert item["download_url"].endswith("/water_substation_alpha/download")

    # Detail exposes hardware/SLA metadata + raw-DAG link.
    r = await ac.get("/api/v1/hub/blueprints/water_substation_alpha")
    assert r.status_code == 200, r.text
    detail = r.json()
    assert detail["file_size_bytes"] == len(blob)
    assert detail["hardware_binding"]["af_xdp_mode"] == "SKB"
    assert detail["sla_guarantees"]["critical_clearing_time_ms"] == 38.4
    assert detail["raw_dag_url"].endswith("/raw-dag")

    # The raw DAG is extracted from the archive when not supplied in the manifest.
    r = await ac.get("/api/v1/hub/blueprints/water_substation_alpha/raw-dag")
    assert r.status_code == 200, r.text
    assert r.text == dag
    assert r.headers["content-type"].startswith("application/yaml")

    # Download streams the exact signed bytes and increments the counter.
    r = await ac.get("/api/v1/hub/blueprints/water_substation_alpha/download")
    assert r.status_code == 200, r.text
    assert r.content == blob
    assert r.headers["x-checksum-sha256"] == body["verification"]["sha256"]
    assert r.headers["x-signature-ed25519"] == signature
    r = await ac.get("/api/v1/hub/blueprints/water_substation_alpha")
    assert r.json()["downloads"] == 1

    # A different user cannot yank the author's blueprint.
    other_token, _, _ = await make_user(
        factory, email="bp-other@example.com", role=UserRole.SECOPS_ANALYST
    )
    r = await ac.delete(
        "/api/v1/hub/blueprints/water_substation_alpha",
        headers=auth_headers(other_token),
    )
    assert r.status_code == 403, r.text

    # The author can yank it; it disappears from the public surface.
    r = await ac.delete(
        "/api/v1/hub/blueprints/water_substation_alpha",
        headers={"Authorization": f"Bearer {api_key}"},
    )
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "yanked"
    assert (await ac.get("/api/v1/hub/blueprints/water_substation_alpha")).status_code == 404
    assert (await ac.get("/api/v1/hub/blueprints")).json()["total"] == 0


@needs_db
async def test_blueprint_publish_auth_and_signature_validation(client, tmp_path, monkeypatch):
    ac, factory = client
    monkeypatch.setattr(settings, "HUB_BLUEPRINTS_DIR", str(tmp_path / "blueprints"))
    _, user_id, _ = await make_user(factory, email="bp-validation@example.com")
    api_key = await _mint_token(factory, user_id)
    no_scope_key = await _mint_token(factory, user_id, scopes=("packages:validate",))
    private, public_hex, _ = _keypair()
    blob = _blueprint_bundle("version: 1\n")
    signature = private.sign(blob).hex()
    manifest = {
        "slug": "validation-blueprint",
        "name": "Validation Blueprint",
        "author_public_key": public_hex,
    }

    r = await _publish_blueprint(ac, "bogus", blob, manifest, signature)
    assert r.status_code == 401
    r = await _publish_blueprint(ac, no_scope_key, blob, manifest, signature)
    assert r.status_code == 403
    r = await _publish_blueprint(ac, api_key, blob, {**manifest, "author_public_key": ""}, signature)
    assert r.status_code == 422
    r = await _publish_blueprint(ac, api_key, blob, manifest, "00" * 64)
    assert r.status_code == 422
    r = await _publish_blueprint(ac, api_key, b"", manifest, signature)
    assert r.status_code == 422
    r = await _publish_blueprint(ac, api_key, b"x" * 8, manifest, private.sign(b"x" * 8).hex(), "not-a-blueprint.txt")
    assert r.status_code == 422
    r = await ac.get("/api/v1/hub/blueprints", params={"sort": "bogus"})
    assert r.status_code == 400
    r = await ac.get("/api/v1/hub/blueprints", params={"target_arch": "mips"})
    assert r.status_code == 400


@needs_db
async def test_appliance_matrix_publish_download_and_deprecate(client, tmp_path, monkeypatch):
    ac, factory = client
    monkeypatch.setattr(settings, "HUB_APPLIANCES_DIR", str(tmp_path / "appliances"))
    monkeypatch.setattr(settings, "ARYORITHM_AUTHORITY_PUBLIC_KEY_B64", "")
    authority, _, authority_b64 = _keypair()
    monkeypatch.setattr(settings, "ARYORITHM_MASTER_PUBLIC_KEY_B64", authority_b64)

    admin_token, _, _ = await make_user(
        factory, email="authority@example.com", role=UserRole.SUPER_ADMIN
    )
    user_token, _, _ = await make_user(factory, email="not-authority@example.com")

    blob = b"ARYOPACK\x00" + b"official-payload" * 256
    metadata = {
        "slug": "sentinel-v2.5.0-x86_64-water-community",
        "title": "Sentinel Core v2.5.0 (Water Utility Edition - Intel x86)",
        "version": "2.5.0",
        "architecture": "x86_64-openvino",
        "industry": "water",
        "license_tier": "community",
        "verified_health_checks": "21/21",
    }
    signature = authority.sign(blob).hex()

    # Only super_admin can upload .aryopack files.
    r = await ac.post(
        "/api/v1/hub/appliances/publish",
        headers=auth_headers(user_token),
        files={"file": ("sentinel.aryopack", blob, "application/octet-stream")},
        data={"metadata": json.dumps(metadata), "authority_signature": signature},
    )
    assert r.status_code == 403, r.text
    assert "super_admin" in r.json()["detail"]

    r = await ac.post(
        "/api/v1/hub/appliances/publish",
        headers=auth_headers(admin_token),
        files={"file": ("sentinel.aryopack", blob, "application/octet-stream")},
        data={"metadata": json.dumps(metadata), "authority_signature": signature},
    )
    assert r.status_code == 201, r.text
    published = r.json()
    assert published["status"] == "published"
    assert published["asset_type"] == "appliance"
    assert published["authority_root_verified"] is True

    r = await ac.get("/api/v1/hub/appliances/matrix")
    assert r.status_code == 200, r.text
    matrix = r.json()
    assert matrix["latest_version"] == "2.5.0"
    assert len(matrix["supported_architectures"]) == 4
    assert len(matrix["supported_industries"]) == 6
    assert len(matrix["supported_licenses"]) == 3

    r = await ac.get(
        "/api/v1/hub/appliances",
        params={
            "arch": "x86_64-openvino",
            "industry": "water",
            "license": "community",
        },
    )
    assert r.status_code == 200, r.text
    listing = r.json()
    assert listing["total"] == 1
    release = listing["releases"][0]
    assert release["slug"] == metadata["slug"]
    assert release["install_command"] == "sudo ./sentinel.aryopack"
    assert release["download_url"].endswith(f"/{metadata['slug']}/download")

    r = await ac.get(f"/api/v1/hub/appliances/{metadata['slug']}")
    assert r.status_code == 200, r.text
    assert r.json()["download_count"] == 0
    assert r.json()["sha256_checksum"] == hashlib.sha256(blob).hexdigest()

    r = await ac.get(f"/api/v1/hub/appliances/{metadata['slug']}/download")
    assert r.status_code == 200, r.text
    assert r.content == blob
    assert r.headers["x-checksum-sha256"] == hashlib.sha256(blob).hexdigest()
    assert (await ac.get(f"/api/v1/hub/appliances/{metadata['slug']}")).json()["download_count"] == 1

    # Non-admin cannot deprecate.
    r = await ac.delete(
        f"/api/v1/hub/appliances/{metadata['slug']}",
        headers=auth_headers(user_token),
    )
    assert r.status_code == 403

    r = await ac.delete(
        f"/api/v1/hub/appliances/{metadata['slug']}",
        headers=auth_headers(admin_token),
    )
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "deprecated"
    assert (await ac.get(f"/api/v1/hub/appliances/{metadata['slug']}")).status_code == 404
    assert (
        await ac.get(
            "/api/v1/hub/appliances",
            params={"arch": "x86_64-openvino", "industry": "water", "license": "community"},
        )
    ).json()["total"] == 0

    # A deprecated slug can be re-released after a fresh signature check.
    r = await ac.post(
        "/api/v1/hub/appliances/publish",
        headers=auth_headers(admin_token),
        files={"file": ("sentinel.aryopack", blob, "application/octet-stream")},
        data={"metadata": json.dumps(metadata), "authority_signature": signature},
    )
    assert r.status_code == 201, r.text
    assert (await ac.get(f"/api/v1/hub/appliances/{metadata['slug']}")).status_code == 200


@needs_db
async def test_appliance_publish_rejects_bad_authority_signature_and_metadata(client, tmp_path, monkeypatch):
    ac, factory = client
    monkeypatch.setattr(settings, "HUB_APPLIANCES_DIR", str(tmp_path / "appliances"))
    monkeypatch.setattr(settings, "ARYORITHM_AUTHORITY_PUBLIC_KEY_B64", "")
    authority, _, authority_b64 = _keypair()
    other, _, _ = _keypair()
    monkeypatch.setattr(settings, "ARYORITHM_MASTER_PUBLIC_KEY_B64", authority_b64)
    admin_token, _, _ = await make_user(
        factory, email="authority-validation@example.com", role=UserRole.SUPER_ADMIN
    )
    blob = b"ARYOPACK" + b"\x00" * 64
    good = {
        "slug": "bad-signature-appliance",
        "title": "Bad Signature Appliance",
        "version": "2.5.0",
        "architecture": "x86_64-openvino",
        "industry": "water",
        "license_tier": "community",
    }

    r = await ac.post(
        "/api/v1/hub/appliances/publish",
        headers=auth_headers(admin_token),
        files={"file": ("bad.aryopack", blob, "application/octet-stream")},
        data={"metadata": json.dumps(good), "authority_signature": other.sign(blob).hex()},
    )
    assert r.status_code == 422, r.text
    assert "Authority Root" in r.json()["detail"]

    r = await ac.post(
        "/api/v1/hub/appliances/publish",
        headers=auth_headers(admin_token),
        files={"file": ("bad.aryopack", blob, "application/octet-stream")},
        data={
            "metadata": json.dumps({**good, "architecture": "mips"}),
            "authority_signature": authority.sign(blob).hex(),
        },
    )
    assert r.status_code == 422, r.text
    r = await ac.get("/api/v1/hub/appliances", params={"arch": "mips"})
    assert r.status_code == 400
