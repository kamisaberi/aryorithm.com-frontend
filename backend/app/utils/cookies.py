"""Shared-domain SSO cookie helpers (one login for dashboard + hub + main).

The backend mints the same JWTs as before; it additionally mirrors them into
two HttpOnly cookies. With ``COOKIE_DOMAIN=.aryorithm.com`` browsers attach
those cookies to every subdomain, so ``fetch(..., {credentials: "include"})``
from any of the three frontends arrives authenticated — bookmarks, typed
URLs and new tabs included (no link-ticket plumbing needed).

Security notes:
- HttpOnly: JS (and any XSS payload) can never read the tokens — strictly
  safer than the previous localStorage-only flow.
- SameSite=Lax: cross-*site* fetch/POST from attacker origins is never sent
  the cookie; our same-site (subdomain) API calls are. All state-changing
  routes are POST/PUT/PATCH/DELETE via fetch, and every GET is read-only, so
  Lax needs no extra CSRF token.
- Secure is derived from the request scheme (https on the host, plain http
  on localhost dev) so no per-env flag can be misconfigured.
- Local dev: COOKIE_DOMAIN is empty, so cookies are host-only
  (``Domain=localhost`` would be rejected by browsers).
"""

from fastapi import Request, Response

from app.config import settings


def _cookie_domain_kwargs() -> dict:
    if settings.COOKIE_DOMAIN.strip():
        return {"domain": settings.COOKIE_DOMAIN.strip()}
    return {}


def set_auth_cookies(
    response: Response,
    request: Request,
    access_token: str,
    refresh_token: str | None,
) -> None:
    """Mirror JWTs into the SSO cookies on login / register / refresh."""
    secure = request.url.scheme == "https"
    common = {
        "path": settings.COOKIE_PATH,
        "httponly": True,
        "secure": secure,
        "samesite": "lax",
        **_cookie_domain_kwargs(),
    }
    response.set_cookie(
        settings.COOKIE_ACCESS_NAME,
        access_token,
        max_age=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        **common,
    )
    if refresh_token:
        response.set_cookie(
            settings.COOKIE_REFRESH_NAME,
            refresh_token,
            max_age=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600,
            **common,
        )


def clear_auth_cookies(response: Response) -> None:
    """Remove the SSO cookies on logout (must match set-time domain/path)."""
    kwargs = {"path": settings.COOKIE_PATH, **_cookie_domain_kwargs()}
    response.delete_cookie(settings.COOKIE_ACCESS_NAME, **kwargs)
    response.delete_cookie(settings.COOKIE_REFRESH_NAME, **kwargs)


def get_cookie_tokens(request: Request) -> tuple[str | None, str | None]:
    """Return (access_token, refresh_token) from the SSO cookies, if present."""
    return (
        request.cookies.get(settings.COOKIE_ACCESS_NAME),
        request.cookies.get(settings.COOKIE_REFRESH_NAME),
    )
