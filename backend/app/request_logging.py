"""Full request dumping + suppression of uvicorn's bare protocol warning.

Background: the line ``WARNING: Invalid HTTP request received.`` is emitted
by uvicorn's HTTP protocol handler (h11/httptools) on the ``uvicorn.error``
logger when raw bytes fail HTTP parsing -- i.e. *before* the request ever
reaches FastAPI. It contains no method/path/headers/body, so it is useless
for debugging sender/backend mismatches.

This module:
1. Drops that bare warning via a logging filter (attached to both
   ``uvicorn`` and ``uvicorn.error`` loggers).
2. Logs the FULL request (method, path, query, client, headers with secrets
   redacted, raw body) for every request that reaches the app, plus the
   response status -- via ``RequestDumpMiddleware``.
3. Provides ``log_error_dump()`` used by the exception handlers in
   ``app.main`` so any 422/400/401/500 prints headers + raw body + error
   detail to the uvicorn terminal.
"""

import logging

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

terminal_log = logging.getLogger("uvicorn.error")

MAX_BODY_CHARS = 8000
_DROPPED_WARNING = "Invalid HTTP request received."


def redacted_headers(request: Request) -> dict[str, str]:
    """Headers dict with secrets redacted (lengths preserved for debugging)."""
    out: dict[str, str] = {}
    for key, value in request.headers.items():
        low = key.lower()
        if low == "authorization":
            out[key] = value[:24] + f"…<{len(value)} chars>" if len(value) > 28 else "****"
        elif low in ("x-api-key", "cookie", "set-cookie"):
            out[key] = "****"
        else:
            out[key] = value
    return out


def body_preview(raw: bytes) -> str:
    """Decode raw body for terminal output, truncated with total size noted."""
    text = raw.decode("utf-8", "replace")
    if len(text) > MAX_BODY_CHARS:
        text = text[:MAX_BODY_CHARS] + f"…<truncated, {len(raw)} bytes total>"
    return text


def _emit(line: str, level: int = logging.INFO) -> None:
    """Emit to uvicorn terminal via logger AND print (visible either way)."""
    terminal_log.log(level, line)
    print(line, flush=True)


class RequestDumpMiddleware(BaseHTTPMiddleware):
    """Log full incoming request + outgoing status for every request."""

    async def dispatch(self, request: Request, call_next):  # type: ignore[no-untyped-def]
        try:
            raw = await request.body()
        except Exception as exc:  # e.g. client disconnected mid-body
            _emit(
                f"[http] {request.method} {request.url.path} "
                f"BODY_READ_ERROR: {exc!r}",
                logging.ERROR,
            )
            raw = b""
        query = f"?{request.url.query}" if request.url.query else ""
        client = request.client.host if request.client else "?"
        _emit(
            f"[http] {request.method} {request.url.path}{query} from={client} "
            f"headers={redacted_headers(request)} body={body_preview(raw)!r}"
        )
        try:
            response = await call_next(request)
        except Exception:
            _emit(
                f"[http] {request.method} {request.url.path} -> EXCEPTION "
                f"(see traceback below)",
                logging.ERROR,
            )
            raise
        _emit(f"[http] {request.method} {request.url.path} -> {response.status_code}")
        return response


async def log_error_dump(request: Request, status_code: int, detail: object) -> None:
    """Print method/path/headers/raw-body/error-detail for a failed request."""
    try:
        raw = await request.body()
    except Exception as exc:
        raw = f"<body unreadable: {exc!r}>".encode()
    query = f"?{request.url.query}" if request.url.query else ""
    client = request.client.host if request.client else "?"
    _emit(
        f"[http-error] {request.method} {request.url.path}{query} "
        f"from={client} status={status_code} "
        f"headers={redacted_headers(request)} "
        f"body={body_preview(raw)!r} detail={detail!r}",
        logging.ERROR,
    )


class _DropBareProtocolWarning(logging.Filter):
    """Drop uvicorn's content-free 'Invalid HTTP request received.' warning."""

    def filter(self, record: logging.LogRecord) -> bool:
        try:
            return _DROPPED_WARNING not in record.getMessage()
        except Exception:
            return True


def silence_invalid_http_request_warning() -> None:
    """Attach the drop-filter (idempotent, reload-safe)."""
    for name in ("uvicorn", "uvicorn.error"):
        logger = logging.getLogger(name)
        if not any(isinstance(f, _DropBareProtocolWarning) for f in logger.filters):
            logger.addFilter(_DropBareProtocolWarning())
