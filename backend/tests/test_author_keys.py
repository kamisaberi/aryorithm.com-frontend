"""Author public-key synchronization across identity, tokens and validation."""

import pytest

from tests.conftest import auth_headers, make_user

needs_db = pytest.mark.asyncio

KEY_A = "AB" * 32
KEY_B = "CD" * 32


@needs_db
async def test_author_key_round_trip_through_me_tokens_and_validation(client):
    ac, factory = client
    token, _user_id, _tenant_id = await make_user(
        factory, email="author-key@example.com"
    )

    # A user with no HubAuthor enrollment gets null, not an empty string.
    r = await ac.get("/api/v1/auth/me", headers=auth_headers(token))
    assert r.status_code == 200, r.text
    assert r.json()["author_public_key"] is None

    # Token minting before enrollment also reports null, and validation uses
    # the same live enrollment lookup.
    r = await ac.post(
        "/api/v1/registry/tokens",
        headers=auth_headers(token),
        json={
            "name": "author-key-cli-pre",
            "scopes": ["packages:publish"],
            "expires_in_days": 30,
        },
    )
    assert r.status_code == 201, r.text
    pre_enrollment = r.json()
    assert pre_enrollment["author_public_key"] is None
    pre_api_key = pre_enrollment["api_key"]

    r = await ac.get(
        "/api/v1/registry/tokens/validate",
        headers={"Authorization": f"ApiKey {pre_api_key}"},
    )
    assert r.status_code == 200, r.text
    assert r.json()["author_public_key"] is None

    # Strict enrollment format: exactly 64 hex characters.
    for bad_key in ("abc", "z" * 64, "0x" + "ab" * 32):
        r = await ac.put(
            "/api/v1/hub/author/key",
            headers=auth_headers(token),
            json={"author_public_key": bad_key},
        )
        assert r.status_code == 422, (bad_key, r.text)

    r = await ac.put(
        "/api/v1/hub/author/key",
        headers=auth_headers(token),
        json={"author_public_key": KEY_A},
    )
    assert r.status_code == 200, r.text
    enrolled = r.json()
    assert enrolled["status"] == "UPDATED"
    assert enrolled["author_public_key"] == KEY_A.lower()
    assert enrolled["author_id"]
    assert enrolled["updated_at"].endswith("Z")

    r = await ac.get("/api/v1/auth/me", headers=auth_headers(token))
    assert r.json()["author_public_key"] == KEY_A.lower()

    # A token minted before enrollment immediately sees the enrolled key.
    r = await ac.get(
        "/api/v1/registry/tokens/validate",
        headers={"Authorization": f"ApiKey {pre_api_key}"},
    )
    assert r.json()["author_public_key"] == KEY_A.lower()

    # Token minting returns the enrolled key alongside the new secret.
    r = await ac.post(
        "/api/v1/registry/tokens",
        headers=auth_headers(token),
        json={
            "name": "author-key-cli",
            "scopes": ["packages:publish"],
            "expires_in_days": 30,
        },
    )
    assert r.status_code == 201, r.text
    created = r.json()
    assert created["author_public_key"] == KEY_A.lower()
    assert created["scopes"] == ["packages:publish"]
    assert created["expires_at"]
    assert created["created_at"]

    api_key = created["api_key"]
    r = await ac.get(
        "/api/v1/registry/tokens/validate",
        headers={"Authorization": f"ApiKey {api_key}"},
    )
    assert r.status_code == 200, r.text
    assert r.json()["author_public_key"] == KEY_A.lower()

    # Validation also works with the JWT and returns the same key.
    r = await ac.get(
        "/api/v1/registry/tokens/validate",
        headers=auth_headers(token),
    )
    assert r.status_code == 200, r.text
    assert r.json()["author_public_key"] == KEY_A.lower()

    # Rotation keeps the same author identity and is immediately visible to
    # every existing token/session.
    r = await ac.put(
        "/api/v1/hub/author/key",
        headers=auth_headers(token),
        json={"author_public_key": KEY_B},
    )
    assert r.status_code == 200, r.text
    rotated = r.json()
    assert rotated["author_public_key"] == KEY_B.lower()
    assert rotated["author_id"] == enrolled["author_id"]

    r = await ac.get("/api/v1/auth/me", headers=auth_headers(token))
    assert r.json()["author_public_key"] == KEY_B.lower()

    r = await ac.get(
        "/api/v1/registry/tokens/validate",
        headers={"Authorization": f"ApiKey {api_key}"},
    )
    assert r.json()["author_public_key"] == KEY_B.lower()


@needs_db
async def test_author_key_enrollment_requires_login(client):
    ac, _factory = client
    r = await ac.put(
        "/api/v1/hub/author/key",
        json={"author_public_key": KEY_A},
    )
    assert r.status_code == 401
