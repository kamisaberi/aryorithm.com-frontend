"""Universal publish + hub model download tests."""

import hashlib
import json
import shutil

import pytest
from sqlalchemy import select

needs_db = pytest.mark.asyncio


def _ed25519_keypair():
    from cryptography.hazmat.primitives.asymmetric import ed25519

    priv = ed25519.Ed25519PrivateKey.generate()
    return priv, priv.public_key().public_bytes_raw().hex()


async def _mint_token(factory, user_id, scopes=("packages:publish",)):
    from app.models.hub import HubApiToken
    from app.services import hub_service as hub

    raw = hub.new_api_key()
    async with factory() as db:
        db.add(HubApiToken(
            token_id=hub.new_token_id(),
            name="test-dev",
            key_prefix=raw[:16],
            key_hash=hashlib.sha256(raw.encode()).hexdigest(),
            scopes=list(scopes),
            user_id=user_id,
        ))
        await db.commit()
    return raw


async def _publish(ac, token, asset_type, filename, blob, manifest, sig):
    return await ac.post(
        "/api/v1/hub/publish",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": (filename, blob, "application/octet-stream")},
        data={
            "asset_type": asset_type,
            "manifest": json.dumps(manifest),
            "signature": sig,
            "visibility": "public",
        },
    )


@needs_db
async def test_publish_all_asset_types(client):
    from tests.conftest import make_user

    ac, factory = client
    _, user_id, _ = await make_user(factory, email="dev@example.com")
    token = await _mint_token(factory, user_id)
    priv, pub = _ed25519_keypair()

    # package (.spkg)
    blob = b"SPKG1:test\n" + b"\x00" * 64
    sig = priv.sign(blob).hex()
    r = await _publish(ac, token, "package", "demo_guard.spkg", blob, {
        "slug": "demo-guard", "name": "Demo Guard", "tier": "lua",
        "author_public_key": pub, "target_protocol": "MODBUS_TCP",
    }, sig)
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["status"] == "success"
    assert body["asset_id"] == "org.aryorithm.package.demo-guard"
    assert body["download_url"].endswith("/api/v1/hub/packages/demo-guard/download")
    assert body["published_at"]

    # pcap
    blob = b"PCAP1:test\n" + b"\x00" * 64
    sig = priv.sign(blob).hex()
    r = await _publish(ac, token, "pcap", "demo.pcap", blob, {
        "slug": "demo-pcap", "title": "Demo Capture", "category": "MALWARE_C2",
        "target_protocol": "DNS", "author_public_key": pub,
    }, sig)
    assert r.status_code == 201, r.text
    assert r.json()["asset_id"] == "pcap-demo-pcap"

    # dataset
    blob = b"SLAB1:test\n" + b"\x00" * 64
    sig = priv.sign(blob).hex()
    r = await _publish(ac, token, "dataset", "demo.slab", blob, {
        "slug": "demo-set", "name": "Demo Set", "format": "SLAB_BINARY",
        "tensor_dimension": 8, "author_public_key": pub,
    }, sig)
    assert r.status_code == 201, r.text
    assert r.json()["asset_id"] == "slab-demo-set"

    # model (ONNX into the vault, DEVELOPMENT stage)
    blob = b"ONNX1:test\n" + b"\x00" * 64
    sig = priv.sign(blob).hex()
    r = await _publish(ac, token, "model", "demo_net.onnx", blob, {
        "slug": "demo-net", "name": "Demo Net", "format": "ONNX",
        "precision": "INT8", "version": "v0.1.0", "author_public_key": pub,
    }, sig)
    assert r.status_code == 201, r.text
    assert r.json()["download_url"].endswith("/api/v1/hub/models/demo-net/download")

    # duplicate slug -> 409
    r = await _publish(ac, token, "pcap", "demo.pcap", blob, {
        "slug": "demo-pcap", "title": "Demo Capture", "category": "MALWARE_C2",
        "author_public_key": pub,
    }, priv.sign(blob).hex())
    assert r.status_code == 409, r.text


@needs_db
async def test_publish_auth_and_validation(client):
    from tests.conftest import make_user

    ac, factory = client
    _, user_id, _ = await make_user(factory, email="dev2@example.com")
    token = await _mint_token(factory, user_id)
    scoped_out = await _mint_token(factory, user_id, scopes=("packages:validate",))
    priv, pub = _ed25519_keypair()
    blob = b"X" * 32
    good_sig = priv.sign(blob).hex()
    meta = {"slug": "x", "title": "X", "category": "SCADA_ICS", "author_public_key": pub}

    r = await _publish(ac, "bogus", "pcap", "x.pcap", blob, meta, good_sig)
    assert r.status_code == 401
    r = await _publish(ac, scoped_out, "pcap", "x.pcap", blob, meta, good_sig)
    assert r.status_code == 403
    r = await _publish(ac, token, "firmware", "x.pcap", blob, meta, good_sig)
    assert r.status_code == 400
    r = await _publish(ac, token, "pcap", "x.pcap", blob, {"slug": "x"}, good_sig)
    assert r.status_code == 422  # missing title/category
    r = await _publish(ac, token, "pcap", "x.pcap", blob, meta, "00" * 64)
    assert r.status_code == 422  # bad signature
    r = await _publish(ac, token, "pcap", "x.pcap", b"", meta, good_sig)
    assert r.status_code == 422  # empty file


@needs_db
async def test_hub_model_download(client):
    from tests.conftest import make_user

    ac, factory = client
    _, user_id, _ = await make_user(factory, email="dev3@example.com")
    token = await _mint_token(factory, user_id)
    priv, pub = _ed25519_keypair()
    blob = b"ONNX1:dl\n" + b"\x00" * 64
    r = await _publish(ac, token, "model", "dl_net.onnx", blob, {
        "slug": "dl-net", "name": "DL Net", "format": "ONNX",
        "precision": "INT8", "author_public_key": pub,
    }, priv.sign(blob).hex())
    assert r.status_code == 201, r.text

    r = await ac.get("/api/v1/hub/models/dl-net/download",
                     params={"format": "ONNX", "precision": "INT8"})
    assert r.status_code == 200, r.text
    assert r.headers["content-type"] == "application/octet-stream"
    assert len(r.headers.get("x-aryorithm-sha256", "")) == 64
    assert len(r.headers.get("x-aryorithm-signature-ed25519", "")) == 128
    assert r.content == blob

    r = await ac.get("/api/v1/hub/models/dl-net/download",
                     params={"format": "RKNN"})
    assert r.status_code == 404
    assert (await ac.get("/api/v1/hub/models/nope/download")).status_code == 404


@needs_db
async def test_client_publish_token_chain(client):
    """Documented web-app flow: credentials -> JWT -> API token -> publish."""
    ac, _factory = client

    # 1) credentials -> JWT (register creates the account, login issues the token)
    creds = {"name": "Web Client", "email": "webclient@example.com", "password": "supersecret1"}
    r = await ac.post("/api/v1/auth/register", json=creds)
    assert r.status_code == 201, r.text
    r = await ac.post("/api/v1/auth/login",
                      json={"email": creds["email"], "password": creds["password"]})
    assert r.status_code == 200, r.text
    jwt = r.json()["access_token"]

    # 2) JWT -> long-lived API token (raw key returned once, hash stored)
    r = await ac.post("/api/v1/registry/tokens",
                      json={"name": "web-client", "scopes": ["packages:publish"],
                            "expires_in_days": 30},
                      headers={"Authorization": f"Bearer {jwt}"})
    assert r.status_code == 201, r.text
    api_key = r.json()["api_key"]
    assert api_key.startswith("ary_hub_")

    # 3) publish with the API token
    from app.services import hub_library as lib

    priv, pub = _ed25519_keypair()
    blob = b"CHAIN1:pcap\n" + b"\x00" * 32
    artifact_dir = lib.vault_root("pcaps") / "chain-verify"
    try:
        r = await _publish(ac, api_key, "pcap", "chain.pcap", blob, {
            "slug": "chain-verify", "title": "Chain Verify", "category": "SCADA_ICS",
            "target_protocol": "MODBUS_TCP", "attack_type": "RECON", "source_origin": "TEST",
            "short_description": "e2e", "technical_analysis": "e2e", "author_public_key": pub,
        }, priv.sign(blob).hex())
        assert r.status_code == 201, r.text
        assert r.json()["asset_id"] == "pcap-chain-verify"

        # the ApiKey scheme is legacy-only: /hub/publish accepts Bearer only
        r = await ac.post(
            "/api/v1/hub/publish",
            headers={"Authorization": f"ApiKey {api_key}"},
            files={"asset_type": (None, "pcap"), "file": ("chain.pcap", blob),
                   "manifest": (None, "{}"), "signature": (None, "0" * 128)},
        )
        assert r.status_code == 401
    finally:
        # keep the repo clean: this slug exists only for this test
        shutil.rmtree(lib.vault_root("pcaps") / "chain-verify", ignore_errors=True)
