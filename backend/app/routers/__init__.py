"""API route handlers."""

from app.routers import auth, fleet, threats, ai, compliance, dfir, range as range_router, settings, overview, tenants, models, ota

__all__ = [
    "auth",
    "fleet",
    "threats",
    "ai",
    "compliance",
    "dfir",
    "range_router",
    "settings",
    "overview",
    "tenants",
    "models",
    "ota",
]
