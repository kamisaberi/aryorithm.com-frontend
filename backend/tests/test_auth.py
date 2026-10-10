"""Authentication & multi-tenancy route tests."""

import pytest

from app.models.user import UserRole
from tests.conftest import auth_headers, make_user

needs_db = pytest.mark.asyncio


@needs_db
async def test_register_login_refresh_flow(client):
    ac, _ = client
    r = await ac.post("/api/v1/auth/register", json={
        "name": "Ada", "email": "ada@example.com", "password": "password123"})
    assert r.status_code == 201, r.text
    body = r.json()
    assert set(body) >= {"access_token", "refresh_token", "expires_in"}

    r = await ac.post("/api/v1/auth/login", json={"email": "ada@example.com", "password": "password123"})
    assert r.status_code == 200
    tokens = r.json()

    r = await ac.get("/api/v1/auth/me", headers=auth_headers(tokens["access_token"]))
    me = r.json()
    assert r.status_code == 200
    assert me["email"] == "ada@example.com" and me["role"] == "tenant_admin"
    assert me["tenants"][0]["name"] == "Ada's Organization"

    r = await ac.post("/api/v1/auth/refresh", json={"refresh_token": tokens["refresh_token"]})
    assert r.status_code == 200 and r.json()["access_token"]


@needs_db
async def test_register_validation_errors(client):
    ac, _ = client
    r = await ac.post("/api/v1/auth/register", json={"name": "Bo", "email": "bo@example.com", "password": "short"})
    assert r.status_code == 400
    await ac.post("/api/v1/auth/register", json={"name": "Bo", "email": "bo@example.com", "password": "password123"})
    r = await ac.post("/api/v1/auth/register", json={"name": "Bo", "email": "bo@example.com", "password": "password123"})
    assert r.status_code == 409


@needs_db
async def test_login_failures(client):
    ac, factory = client
    await make_user(factory, email="cy@example.com")
    r = await ac.post("/api/v1/auth/login", json={"email": "cy@example.com", "password": "wrongpass1"})
    assert r.status_code == 401
    r = await ac.post("/api/v1/auth/login", json={"email": "nobody@example.com", "password": "password123"})
    assert r.status_code == 401
    await make_user(factory, email="off@example.com", active=False)
    r = await ac.post("/api/v1/auth/login", json={"email": "off@example.com", "password": "password123"})
    assert r.status_code == 403
    r = await ac.post("/api/v1/auth/refresh", json={"refresh_token": "garbage"})
    assert r.status_code == 401
    r = await ac.get("/api/v1/auth/me")
    assert r.status_code == 401


@needs_db
async def test_tenant_admin_endpoints(client):
    ac, factory = client
    admin_token, _, _ = await make_user(factory, email="admin@example.com")
    analyst_token, _, _ = await make_user(factory, email="analyst@example.com", role=UserRole.SECOPS_ANALYST)

    r = await ac.get("/api/v1/auth/tenants", headers=auth_headers(admin_token))
    assert r.status_code == 200 and len(r.json()["tenants"]) == 1
    r = await ac.get("/api/v1/auth/tenants", headers=auth_headers(analyst_token))
    assert r.status_code == 403

    r = await ac.post("/api/v1/auth/tenants", json={"name": "EuroGrid", "tier": "ENTERPRISE"},
                      headers=auth_headers(admin_token))
    assert r.status_code == 201 and r.json()["tier"] == "ENTERPRISE"
    r = await ac.post("/api/v1/auth/tenants", json={"name": "Bad", "tier": "ULTRA"},
                      headers=auth_headers(admin_token))
    assert r.status_code == 400


@needs_db
async def test_webauthn_stubs(client):
    ac, _ = client
    r = await ac.post("/api/v1/auth/webauthn/challenge", json={"email": "a@example.com"})
    assert r.status_code == 200 and "challenge" in r.json()
    r = await ac.post("/api/v1/auth/webauthn/verify", json={"credential_id": "x", "signature": "y"})
    assert r.status_code == 501
