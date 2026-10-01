"""Debug runner: print EVERYTHING the backend receives, in ONE terminal.

Run this INSTEAD of plain uvicorn while debugging the sender::

    .\\.venv\\Scripts\\python.exe run_debug.py

It serves the exact same app (``app.main:app`` on 127.0.0.1:8000) but with a
patched HTTP protocol that dumps, for every TCP connection:

* ``[wire] CONNECT <ip:port>``            -- connection opened
* ``[wire] <ip:port> RX <n> bytes:``      -- EVERY raw byte received,
  followed by the content decoded as UTF-8 (garbage shown as-is)
* ``[wire] CLOSE <ip:port>``              -- connection closed (+ error, if any)

On top of that, the app's own ``RequestDumpMiddleware`` /
``log_error_dump`` (see ``app/request_logging.py``) still print the parsed
``[http]`` / ``[http-error]`` lines with headers + JSON body + status.

How to read the output for your case
------------------------------------
* ``CONNECT`` immediately followed by ``CLOSE`` with zero ``RX`` lines in
  between  =>  the sender opened TCP and sent NOTHING (crashed between
  connect() and send(), or a port probe). There is no HTTP to parse;
  fix/debug on the SENDER side around its connect/send call.
* ``RX`` with a truncated/incomplete ``POST ...`` and a ``Content-Length``
  larger than the bytes shown  =>  sender declared more bytes than it sent
  (classic cause of ``Invalid HTTP request received`` + ``connection lost``).
* ``RX`` with full ``POST /api/v1/fleet/sync`` + JSON  =>  compare the JSON
  keys against ``app/schemas/fleet.py`` (``FleetSyncRequest``); any mismatch
  is then printed by the ``[http-error] ... status=422`` line right after.
"""

import asyncio

import uvicorn
from uvicorn.protocols.http.httptools_impl import HttpToolsProtocol

HOST, PORT = "127.0.0.1", 8000
MAX_WIRE_CHARS = 8000


class DumpHTTPProtocol(HttpToolsProtocol):
    """httptools protocol that dumps raw wire bytes to the terminal."""

    def connection_made(self, transport: asyncio.BaseTransport) -> None:  # type: ignore[override]
        super().connection_made(transport)
        print(f"[wire] CONNECT {self.client}", flush=True)

    def data_received(self, data: bytes) -> None:
        text = data.decode("utf-8", "replace")
        if len(text) > MAX_WIRE_CHARS:
            text = text[:MAX_WIRE_CHARS] + f"…<truncated, {len(data)} bytes total>"
        print(f"[wire] {self.client} RX {len(data)} bytes:", flush=True)
        print(text, flush=True)
        print("-" * 70, flush=True)
        super().data_received(data)

    def connection_lost(self, exc: Exception | None) -> None:
        print(f"[wire] CLOSE {self.client} exc={exc!r}", flush=True)
        super().connection_lost(exc)


if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=HOST,
        port=PORT,
        http=DumpHTTPProtocol,  # type: ignore[arg-type]
        log_level="info",
    )
