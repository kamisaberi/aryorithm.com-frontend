"""System routes served outside ``/api/v1``: health, root, compat stub."""

import pytest

from app.config import settings

needs_db = pytest.mark.asyncio


@needs_db
async def test_health(client):
    ac, _ = client
    r = await ac.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "healthy"
    assert body["app"] == settings.APP_NAME
    assert body["env"] == settings.APP_ENV


@needs_db
async def test_root(client):
    ac, _ = client
    r = await ac.get("/")
    assert r.status_code == 200
    body = r.json()
    assert body["app"] == settings.APP_NAME
    assert body["version"] == "1.0.0"
    assert body["docs"] == "/docs"


@needs_db
async def test_openai_compat_models_stub_is_public(client):
    """``/v1/models`` must stay unauthenticated (local dev-tool port probes).

    It deliberately shadows nothing under ``/api/v1/models``; the trailing
    slash variant is a registered alias.
    """
    ac, _ = client
    for path in ("/v1/models", "/v1/models/"):
        r = await ac.get(path)  # no auth on purpose
        assert r.status_code == 200, path
        assert r.json() == {"object": "list", "data": []}
