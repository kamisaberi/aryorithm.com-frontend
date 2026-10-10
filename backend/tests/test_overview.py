"""Mission-control, streaming, and tenant-command route tests."""

import pytest

from tests.conftest import auth_headers, make_user, nexus_key_headers

needs_db = pytest.mark.asyncio


@needs_db
async def test_overview_endpoints(client):
    ac, factory = client
    token, _, _ = await make_user(factory)
    h = auth_headers(token)

    r = await ac.get("/api/v1/overview/metrics", headers=h)
    assert r.status_code == 200
    assert r.json() == {"online_nodes": 124, "total_drops": 142080, "mean_sla_us": 0.84, "stable_model": "v2.4"}

    r = await ac.get("/api/v1/overview/threat-map", headers=h)
    assert len(r.json()["coordinates"]) == 2

    r = await ac.get("/api/v1/overview/latency-distribution", headers=h)
    assert set(r.json()) == {"p50", "p90", "p95", "p99", "p999"}

    r = await ac.get("/api/v1/xai/recent", headers=h)
    assert r.status_code == 200 and len(r.json()) == 2
    r = await ac.get("/api/v1/xai/recent", params={"limit": 51}, headers=h)
    assert r.status_code == 422

    r = await ac.get("/api/v1/xai/inc-001", headers=h)
    assert r.status_code == 200 and r.json()["incident_id"] == "inc-001"

    r = await ac.get("/api/v1/overview/metrics")
    assert r.status_code == 401


@needs_db
async def test_sse_streams_emit_events(client):
    # NOTE: httpx ASGITransport buffers the whole body, so an infinite SSE
    # stream can never be consumed over HTTP in-process. Exercise the route
    # functions directly: auth is the shared get_current_user dependency
    # (covered on every other endpoint), format via the live generator.
    import json as _json

    from sqlalchemy import select

    from app.models.user import User
    from app.routers.stream import event_generator, stream_telemetry, stream_threats

    ac, factory = client
    _, user_id, _ = await make_user(factory)
    async with factory() as db:
        user = (await db.execute(select(User).where(User.id == user_id))).scalar_one()

    for view in (stream_telemetry, stream_threats):
        resp = await view(user)
        assert resp.media_type == "text/event-stream"
        assert resp.headers["Cache-Control"] == "no-cache"
        first = await resp.body_iterator.__anext__()
        assert first.startswith("event: heartbeat_sync\ndata: ")
        payload = _json.loads(first.split("data: ", 1)[1])
        assert "timestamp" in payload
        second = await resp.body_iterator.__anext__()
        assert second.startswith("event: drop_event\n")

    gen = event_generator()
    assert (await gen.__anext__()).startswith("event: heartbeat_sync\n")
    await gen.aclose()


@needs_db
async def test_tenant_pending_commands(client):
    ac, factory = client
    token, _, tenant_id = await make_user(factory)

    r = await ac.get(f"/api/v1/tenants/{tenant_id}/commands/pending", headers=nexus_key_headers())
    assert r.status_code == 200 and r.json() == []
    r = await ac.get(f"/api/v1/tenants/{tenant_id}/commands/pending", headers=auth_headers(token))
    assert r.status_code == 200
    r = await ac.get(f"/api/v1/tenants/{tenant_id}/commands/pending")
    assert r.status_code == 401
