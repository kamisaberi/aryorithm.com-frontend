"""FastAPI application entry point."""

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.config import settings
from app.database import engine, Base
from app.request_logging import (
    RequestDumpMiddleware,
    log_error_dump,
    silence_invalid_http_request_warning,
)

# Import ORM models so Base.metadata.create_all() creates all tables.
import app.models  # noqa: F401
from app.routers import auth, fleet, threats, ai, compliance, dfir, range as range_router, settings as settings_router, overview, stream, tenants, models as models_router, ota as ota_router, plans as plans_router, cps as cps_router, identity as identity_router, soc as soc_router, support as support_router, licenses as licenses_router, hub as hub_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup: create tables (use Alembic in production)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    # Shutdown: dispose engine
    await engine.dispose()


app = FastAPI(
    title=settings.APP_NAME,
    description="Aryorithm Technologies — Backend API",
    version="1.0.0",
    debug=settings.DEBUG,
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Full request dump (method/path/headers/raw body) + drop uvicorn's bare
# "Invalid HTTP request received." warning in favour of the detailed dump.
app.add_middleware(RequestDumpMiddleware)
silence_invalid_http_request_warning()


@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """422 handler that prints the exact headers/body that failed validation."""
    errors = jsonable_encoder(exc.errors())
    await log_error_dump(request, 422, errors)
    return JSONResponse(status_code=422, content={"detail": errors})


@app.exception_handler(StarletteHTTPException)
async def http_error_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    """4xx/5xx handler that prints the exact headers/body of the failed request."""
    if exc.status_code >= 400:
        await log_error_dump(request, exc.status_code, exc.detail)
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers=exc.headers,
    )


@app.exception_handler(Exception)
async def unhandled_error_handler(request: Request, exc: Exception) -> JSONResponse:
    """500 handler that prints the exact headers/body of the crashed request."""
    import traceback

    traceback.print_exc()
    await log_error_dump(request, 500, f"{type(exc).__name__}: {exc}")
    return JSONResponse(status_code=500, content={"detail": "Internal Server Error"})

# Include all routers
app.include_router(auth.router, prefix="/api/v1")
app.include_router(fleet.router, prefix="/api/v1")
app.include_router(threats.router, prefix="/api/v1")
app.include_router(ai.router, prefix="/api/v1")
app.include_router(compliance.router, prefix="/api/v1")
app.include_router(dfir.router, prefix="/api/v1")
app.include_router(range_router.router, prefix="/api/v1")
app.include_router(settings_router.router, prefix="/api/v1")
app.include_router(overview.router, prefix="/api/v1")
app.include_router(stream.router, prefix="/api/v1")
app.include_router(tenants.router, prefix="/api/v1")
app.include_router(models_router.router, prefix="/api/v1")
app.include_router(ota_router.router, prefix="/api/v1")
app.include_router(plans_router.router, prefix="/api/v1")
app.include_router(cps_router.router, prefix="/api/v1")
app.include_router(identity_router.router, prefix="/api/v1")
app.include_router(soc_router.router, prefix="/api/v1")
app.include_router(support_router.router, prefix="/api/v1")
app.include_router(licenses_router.router, prefix="/api/v1")
app.include_router(licenses_router.legacy_router, prefix="/api/v1")
app.include_router(hub_router.plugins_router, prefix="/api/v1")
app.include_router(hub_router.registry_router, prefix="/api/v1")
app.include_router(hub_router.sync_router, prefix="/api/v1")
app.include_router(hub_router.telemetry_router, prefix="/api/v1")


@app.get("/v1/models", include_in_schema=False)
async def openai_compat_models():
    """Public stub for local dev-tool probing (e.g. OpenCode CLI).

    Unauthenticated `GET /v1/models` (OpenAI-style) port probes must not
    hit the authenticated threat-model inventory at GET /api/v1/models.
    Returns an empty OpenAI-compatible list so probes get 200, not 401.
    """
    return {"object": "list", "data": []}


@app.get("/v1/models/", include_in_schema=False)
async def openai_compat_models_slash():
    """Trailing-slash alias of the public /v1/models stub."""
    return {"object": "list", "data": []}


@app.get("/health", tags=["System"])
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "app": settings.APP_NAME, "env": settings.APP_ENV}


@app.get("/", tags=["System"])
async def root():
    """Root endpoint."""
    return {
        "app": settings.APP_NAME,
        "version": "1.0.0",
        "docs": "/docs",
    }
