"""Shared-domain SSO cookie tests (one login for dashboard + hub + main).

Covers: cookie issuance on login/register/refresh, cookie-only /me,
cookie-only refresh, and global logout (revoke-all + cleared cookies).
"""

import pytest

needs_db = pytest.mark.asyncio


def _cookies_by_name(response):
    """Parse all Set-Cookie headers into {name: header} (httpx merges them)."""
    out = {}
    for value in response.headers.get_list("set-cookie"):
        name = value.split("=", 1)[0]
        out[name] = value
    return out


@needs_db
async def test_login_sets_sso_cookies(client):
    ac, _ = client
    r = await ac.post("/api/v1/auth/register", json={
        "name": "SSO", "email": "sso@example.com", "password": "password123"})
    assert r.status_code == 201, r.text
    cookies = _cookies_by_name(r)
    assert "ary_access" in cookies, cookies.keys()
    assert "ary_refresh" in cookies, cookies.keys()
    assert "httponly" in cookies["ary_access"].lower()
    assert "samesite=lax" in cookies["ary_access"].lower()
    assert "domain=" not in cookies["ary_access"].lower()  # dev: host-only
    # Tokens still returned in the body (existing clients unaffected).
    assert r.json()["access_token"]


@needs_db
async def test_me_with_cookie_only(client):
    ac, _ = client
    await ac.post("/api/v1/auth/register", json={
        "name": "SSO", "email": "sso2@example.com", "password": "password123"})
    # Fresh client with no Authorization header: the cookie jar (httpx keeps
    # cookies like a browser) authenticates /me on its own.
    r = await ac.get("/api/v1/auth/me")
    assert r.status_code == 200, r.text
    assert r.json()["email"] == "sso2@example.com"


@needs_db
async def test_refresh_with_cookie_only(client):
    ac, _ = client
    await ac.post("/api/v1/auth/register", json={
        "name": "SSO", "email": "sso3@example.com", "password": "password123"})
    # Empty body: the ary_refresh cookie is the credential.
    r = await ac.post("/api/v1/auth/refresh", json={})
    assert r.status_code == 200, r.text
    assert r.json()["access_token"]
    # Fresh access cookie mirrored back.
    assert "ary_access" in _cookies_by_name(r)


@needs_db
async def test_refresh_without_any_credential_401s(client):
    ac, _ = client
    r = await ac.post("/api/v1/auth/refresh", json={})
    assert r.status_code == 401


@needs_db
async def test_logout_revokes_and_clears(client):
    ac, _ = client
    await ac.post("/api/v1/auth/register", json={
        "name": "SSO", "email": "sso4@example.com", "password": "password123"})
    assert (await ac.get("/api/v1/auth/me")).status_code == 200

    r = await ac.post("/api/v1/auth/logout")
    assert r.status_code == 200, r.text
    cleared = _cookies_by_name(r)
    assert "ary_access" in cleared and "max-age=0" in cleared["ary_access"].lower()
    assert "ary_refresh" in cleared and "max-age=0" in cleared["ary_refresh"].lower()

    # Cookies wiped from the jar: /me now 401s (no Bearer anywhere).
    assert (await ac.get("/api/v1/auth/me")).status_code == 401
    # And the revoked refresh token is dead even if replayed explicitly.
    body_token = (await ac.post("/api/v1/auth/login", json={
        "email": "sso4@example.com", "password": "password123"})).json()["refresh_token"]
    await ac.post("/api/v1/auth/logout")
    r = await ac.post("/api/v1/auth/refresh", json={"refresh_token": body_token})
    assert r.status_code == 401, r.text
