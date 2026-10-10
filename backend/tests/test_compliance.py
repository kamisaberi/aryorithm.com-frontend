"""Compliance GRC route tests."""

import pytest
from sqlalchemy import select, func

from app.models.compliance import InsuranceProof
from tests.conftest import auth_headers, make_user

needs_db = pytest.mark.asyncio


@needs_db
async def test_framework_statuses(client):
    ac, factory = client
    token, _, _ = await make_user(factory)
    h = auth_headers(token)

    r = await ac.get("/api/v1/compliance/nis2", headers=h)
    assert r.status_code == 200
    body = r.json()
    assert body["overall_status"] == "COMPLIANT" and len(body["statutory_mandates"]) == 3

    r = await ac.get("/api/v1/compliance/iec62443", headers=h)
    assert r.json()["system_integrity"] == "PASS"

    r = await ac.get("/api/v1/compliance/cmmc", headers=h)
    assert r.status_code == 200 and len(r.json()["key_findings"]) == 4

    r = await ac.get("/api/v1/compliance/nis2")
    assert r.status_code == 401


@needs_db
async def test_export_json_and_pdf(client):
    ac, factory = client
    token, _, _ = await make_user(factory)
    h = auth_headers(token)

    r = await ac.post("/api/v1/compliance/export", json={"framework": "NIS2", "format": "JSON"}, headers=h)
    assert r.status_code == 200
    assert r.json()["manifest_sha256"] and "attachment" in r.headers["content-disposition"]

    r = await ac.post("/api/v1/compliance/export", json={"framework": "NIS2", "format": "PDF"}, headers=h)
    assert r.status_code == 200
    assert r.headers["content-type"] == "application/pdf" and len(r.content) > 0


@needs_db
async def test_sbom_attestation_insurance(client):
    ac, factory = client
    token, _, _ = await make_user(factory)
    h = auth_headers(token)

    r = await ac.get("/api/v1/compliance/sbom", headers=h)
    assert r.status_code == 200 and r.json()["bomFormat"] == "CycloneDX"

    r = await ac.get("/api/v1/compliance/attestation-logs", headers=h)
    assert r.status_code == 200 and r.json()[0]["verified"] is True

    r = await ac.get("/api/v1/compliance/insurance-proof", headers=h)
    assert r.status_code == 200
    assert r.json()["certified_tier"] == "TIER_A_PLUS"
    async with factory() as db:
        count = (await db.execute(select(func.count()).select_from(InsuranceProof))).scalar()
        assert count == 1
