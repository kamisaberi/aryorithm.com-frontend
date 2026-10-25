"""Tests for the Cloud Forge API (/api/v1/forge)."""

import hashlib

import pytest

needs_db = pytest.mark.asyncio


async def _mint_token(factory, user_id):
    from app.models.hub import HubApiToken
    from app.services import hub_service as hub

    raw = hub.new_api_key()
    async with factory() as db:
        db.add(
            HubApiToken(
                token_id=hub.new_token_id(),
                name="forge-test",
                key_prefix=raw[:16],
                key_hash=hashlib.sha256(raw.encode()).hexdigest(),
                scopes=["packages:publish"],
                user_id=user_id,
            )
        )
        await db.commit()
    return raw


def _auth(token):
    return {"Authorization": f"Bearer {token}"}


@needs_db
async def test_forge_train_poll_and_download(client, tmp_path, monkeypatch):
    from app.config import settings
    from tests.conftest import make_user

    ac, factory = client
    _, user_id, _ = await make_user(factory, email="forge@example.com")
    token = await _mint_token(factory, user_id)
    monkeypatch.setattr(settings, "FORGE_DIR", str(tmp_path / "forge"))
    monkeypatch.setattr(settings, "FORGE_SIMULATED_TRAINING_SECONDS", 0)

    dataset = b"S" * 640  # 5 fixed-width samples
    r = await ac.post(
        "/api/v1/forge/train",
        headers=_auth(token),
        data={"base_model": "models/netflow-mae-v2.onnx", "epochs": "3", "learning_rate": "0.0001"},
        files={"dataset": ("ambient.slab", dataset, "application/octet-stream")},
    )
    assert r.status_code == 202, r.text
    queued = r.json()
    assert queued["status"] == "queued"
    assert queued["dataset_samples"] == 5
    assert queued["target_hardware"] == "NVIDIA_TENSORRT_CUDA_H100"
    assert queued["poll_endpoint"].endswith(queued["job_id"])
    job_id = queued["job_id"]

    r = await ac.get(f"/api/v1/forge/jobs/{job_id}", headers=_auth(token))
    assert r.status_code == 200, r.text
    job = r.json()
    assert job["status"] == "completed"
    assert job["golden_gate"] == {
        "recall_retention_pct": 100.0,
        "degradation": 0.0,
        "passed": True,
    }
    assert job["quantization"]["format"] == "INT8_QDQ_ONNX"
    assert job["quantization"]["latency_ns"] == 18400
    assert job["quantization"]["model_size_bytes"] > 0
    assert job["download_url"].endswith(f"/api/v1/forge/models/{job_id}/download")

    r = await ac.get(f"/api/v1/forge/models/{job_id}/download", headers=_auth(token))
    assert r.status_code == 200, r.text
    assert r.headers["x-forge-job-id"] == job_id
    assert r.headers["x-forge-quantization"] == "INT8_QDQ_ONNX"
    assert r.headers["x-aryorithm-sha256"] == hashlib.sha256(r.content).hexdigest()
    assert "netflow-mae-v2_int8.onnx" in r.headers["content-disposition"]
    assert len(r.content) == job["quantization"]["model_size_bytes"]

    # Another non-admin user cannot read or download the job.
    from app.models.user import UserRole

    other_token, _other_id, _ = await make_user(
        factory, email="forge-other@example.com", role=UserRole.SECOPS_ANALYST
    )
    r = await ac.get(f"/api/v1/forge/jobs/{job_id}", headers=_auth(other_token))
    assert r.status_code == 403
    r = await ac.get(f"/api/v1/forge/models/{job_id}/download", headers=_auth(other_token))
    assert r.status_code == 403

    r = await ac.get("/api/v1/forge/jobs/job_gpu_missing", headers=_auth(token))
    assert r.status_code == 404


@needs_db
async def test_forge_requires_auth_and_rejects_empty_dataset(client):
    from tests.conftest import make_user

    ac, factory = client
    _, user_id, _ = await make_user(factory, email="forge-validation@example.com")
    token = await _mint_token(factory, user_id)

    r = await ac.post(
        "/api/v1/forge/train",
        data={"base_model": "models/netflow-mae-v2.onnx"},
        files={"dataset": ("empty.slab", b"", "application/octet-stream")},
    )
    assert r.status_code == 401

    r = await ac.post(
        "/api/v1/forge/train",
        headers=_auth(token),
        data={"base_model": "models/netflow-mae-v2.onnx"},
        files={"dataset": ("empty.slab", b"", "application/octet-stream")},
    )
    assert r.status_code == 422

    r = await ac.post(
        "/api/v1/forge/train",
        headers=_auth(token),
        data={"base_model": ""},
        files={"dataset": ("x.slab", b"X" * 128, "application/octet-stream")},
    )
    assert r.status_code == 422


@needs_db
async def test_forge_download_conflict_before_completion(client, tmp_path, monkeypatch):
    from app.config import settings
    from tests.conftest import make_user

    ac, factory = client
    _, user_id, _ = await make_user(factory, email="forge-pending@example.com")
    token = await _mint_token(factory, user_id)
    monkeypatch.setattr(settings, "FORGE_DIR", str(tmp_path / "forge-pending"))
    monkeypatch.setattr(settings, "FORGE_SIMULATED_TRAINING_SECONDS", 3600)

    r = await ac.post(
        "/api/v1/forge/train",
        headers=_auth(token),
        data={"base_model": "models/netflow-mae-v2.onnx"},
        files={"dataset": ("pending.slab", b"P" * 256, "application/octet-stream")},
    )
    assert r.status_code == 202, r.text
    job_id = r.json()["job_id"]

    r = await ac.get(f"/api/v1/forge/jobs/{job_id}", headers=_auth(token))
    assert r.status_code == 200
    assert r.json()["status"] == "queued"
    assert r.json()["golden_gate"] is None

    r = await ac.get(f"/api/v1/forge/models/{job_id}/download", headers=_auth(token))
    assert r.status_code == 409
