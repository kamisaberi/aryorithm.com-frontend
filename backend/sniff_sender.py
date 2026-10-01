"""TCP wire tap: print EVERYTHING the sender puts on the wire.

Why this exists: ``HTTP connection made -> HTTP connection lost`` with no
request line in between means the peer opened TCP and closed it WITHOUT
sending a complete HTTP request. Nothing reaches FastAPI in that case, so
no middleware or exception handler can ever log it -- the bytes must be
captured at TCP level. That is what this script does.

Usage:
  1. Keep the backend running on 127.0.0.1:8000 as usual.
  2. Run this tap:  ``python sniff_sender.py``  (listens on 127.0.0.1:8001)
  3. Point sentinel-nexus at ``http://127.0.0.1:8001`` temporarily.

  Every chunk in BOTH directions is printed with timestamp, direction and
  size, plus connections that open and close without sending anything
  (those are exactly your ``made -> lost`` lines).

Stdlib only (asyncio). Nothing is modified in transit -- bytes are
forwarded verbatim to 127.0.0.1:8000.
"""

import asyncio
import datetime

LISTEN_HOST, LISTEN_PORT = "127.0.0.1", 8001
TARGET_HOST, TARGET_PORT = "127.0.0.1", 8000


def _stamp() -> str:
    return datetime.datetime.now().strftime("%H:%M:%S.%f")[:-3]


def show(tag: str, data: bytes) -> None:
    """Print one chunk: direction, size and content (text + safe decode)."""
    text = data.decode("utf-8", "replace")
    print(f"[{_stamp()}] {tag} {len(data)} bytes:", flush=True)
    print(text, flush=True)
    print("-" * 70, flush=True)


async def _pipe(reader: asyncio.StreamReader, writer: asyncio.StreamWriter, tag: str) -> None:
    try:
        while True:
            chunk = await reader.read(65536)
            if not chunk:
                print(f"[{_stamp()}] {tag} EOF (peer closed this direction)", flush=True)
                break
            show(tag, chunk)
            writer.write(chunk)
            await writer.drain()
    except (ConnectionResetError, BrokenPipeError) as exc:
        print(f"[{_stamp()}] {tag} connection reset: {exc!r}", flush=True)
    except Exception as exc:  # noqa: BLE001 - debug tap, must never die silently
        print(f"[{_stamp()}] {tag} pipe error: {exc!r}", flush=True)
    finally:
        try:
            writer.close()
        except Exception:  # noqa: BLE001 - best effort close
            pass


async def handle(client_r: asyncio.StreamReader, client_w: asyncio.StreamWriter) -> None:
    peer = client_w.get_extra_info("peername")
    print(f"[{_stamp()}] CONNECT from {peer} (nothing received yet)", flush=True)
    try:
        server_r, server_w = await asyncio.open_connection(TARGET_HOST, TARGET_PORT)
    except Exception as exc:
        print(f"[{_stamp()}] cannot reach backend {TARGET_HOST}:{TARGET_PORT}: {exc!r}", flush=True)
        client_w.close()
        return
    await asyncio.gather(
        _pipe(client_r, server_w, "C->S"),
        _pipe(server_r, client_w, "S->C"),
    )
    print(f"[{_stamp()}] CLOSE {peer}", flush=True)


async def main() -> None:
    server = await asyncio.start_server(handle, LISTEN_HOST, LISTEN_PORT)
    print(
        f"TAP listening on {LISTEN_HOST}:{LISTEN_PORT} "
        f"-> forwarding verbatim to {TARGET_HOST}:{TARGET_PORT}",
        flush=True,
    )
    print("Point the sender at :8001 now. Ctrl+C to stop.", flush=True)
    async with server:
        await server.serve_forever()


if __name__ == "__main__":
    asyncio.run(main())
