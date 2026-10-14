"""Hub library tests: PCAP vault, SLAB datasets, twin scenarios."""

import pytest

needs_db = pytest.mark.asyncio


@needs_db
async def test_library_seed_and_filters(client):
    ac, factory = client

    for path, total in [("/api/v1/hub/pcaps", 5),
                        ("/api/v1/hub/datasets", 3),
                        ("/api/v1/hub/scenarios", 3)]:
        r = await ac.get(path)
        assert r.status_code == 200, (path, r.text)
        body = r.json()
        assert len(body) == total, (path, len(body))

    r = await ac.get("/api/v1/hub/pcaps", params={"category": "SCADA_ICS"})
    assert r.status_code == 200 and len(r.json()) == 4
    r = await ac.get("/api/v1/hub/pcaps", params={"category": "BOGUS"})
    assert r.status_code == 400
    r = await ac.get("/api/v1/hub/pcaps", params={"protocol": "iec_60870"})
    assert r.status_code == 200 and len(r.json()) == 1
    r = await ac.get("/api/v1/hub/pcaps", params={"search": "triton"})
    assert r.status_code == 200 and len(r.json()) == 1

    r = await ac.get("/api/v1/hub/datasets", params={"format": "SLAB_BINARY"})
    assert r.status_code == 200 and len(r.json()) == 3
    r = await ac.get("/api/v1/hub/datasets", params={"format": "NOPE"})
    assert r.status_code == 400
    r = await ac.get("/api/v1/hub/datasets", params={"dimension": 42})
    assert r.status_code == 200 and len(r.json()) == 1

    r = await ac.get("/api/v1/hub/scenarios", params={"complexity": "ADVANCED_RED_TEAM"})
    assert r.status_code == 200 and len(r.json()) == 2
    r = await ac.get("/api/v1/hub/scenarios", params={"complexity": "NOPE"})
    assert r.status_code == 400
    r = await ac.get("/api/v1/hub/scenarios", params={"sector": "healthcare"})
    assert r.status_code == 200 and len(r.json()) == 1


@needs_db
async def test_library_detail_and_404s(client):
    ac, _ = client

    r = await ac.get("/api/v1/hub/pcaps/industroyer2-iec104")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["mitre_attack_ids"] == ["T0813", "T0855", "T0885"]
    assert body["recommended_spkg_id"] == "org.aryorithm.package.iec104_grid_shield"
    assert body["download_url"] == "/api/v1/hub/pcaps/industroyer2-iec104/download"
    assert body["category"] == "SCADA_ICS"

    r = await ac.get("/api/v1/hub/datasets/swat-water-testbed")
    assert r.status_code == 200, r.text
    assert r.json()["tensor_dimension"] == 51
    assert r.json()["format"] == "SLAB_BINARY"

    r = await ac.get("/api/v1/hub/scenarios/power-grid-blackout")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["complexity"] == "ADVANCED_RED_TEAM"
    assert body["node_topology"]["adversary_node"]["ip"] == "10.240.0.99"
    assert body["cli_pull_command"] == "make scenario-pull NAME=power_grid_blackout"

    for path in ["/api/v1/hub/pcaps/nope", "/api/v1/hub/datasets/nope",
                 "/api/v1/hub/scenarios/nope"]:
        assert (await ac.get(path)).status_code == 404, path


@needs_db
async def test_library_downloads(client):
    ac, factory = client

    for slug_path, filename in [
        ("pcaps/modbus-coil-abuse", "modbus_uiuc_scada_attack.pcap"),
        ("datasets/cicids2017-portscan", "cicids2017_portscan.slab"),
        ("scenarios/hospital-pacs-heist", "scenario_hospital_pacs_heist.tar.gz"),
    ]:
        r = await ac.get(f"/api/v1/hub/{slug_path}/download")
        assert r.status_code == 200, (slug_path, r.text)
        assert r.headers["content-type"] == "application/octet-stream"
        assert filename in r.headers["content-disposition"]
        assert len(r.headers.get("x-checksum-sha256", "")) == 64
        assert len(r.content) > 1000

    # Download counting + idempotent re-seed (no duplicates).
    from app.services import hub_library as lib

    async with factory() as db:
        from sqlalchemy import select

        from app.models.hub import HubPcap

        n_before = len((await db.execute(select(HubPcap))).scalars().all())
        await lib.ensure_seed(db)
        await db.commit()
        n_after = len((await db.execute(select(HubPcap))).scalars().all())
    assert n_before == n_after == 5

    r = await ac.get("/api/v1/hub/pcaps/modbus-coil-abuse")
    assert r.json()["download_count"] >= 1
