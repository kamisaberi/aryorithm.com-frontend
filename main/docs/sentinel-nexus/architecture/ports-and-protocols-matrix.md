# Network Ports, Protocols & Transport Routing Matrix

`sentinel-nexus` separates machine-to-machine fleet orchestration, administrative web interfaces, and real-time telemetry streaming onto discrete network ports to enforce access control boundaries.

---

## 1. Port Allocation Matrix

```text
               ┌────────────────────────────────────────────────────────┐
               │              SENTINEL-NEXUS NETWORK LISTENER           │
               └───────┬───────────────────┬────────────────────┬───────┘
                       │                   │                    │
                       ▼                   ▼                    ▼
                PORT 50051:         PORT 9443:           PORT 9444:
                gRPC (HTTP/2)       REST API & Web UI    Real-Time SSE Stream
                mTLS 1.3            HTTPS (TLS 1.3)      HTTP/1.1 EventStream
                       │                   │                    │
                       ▼                   ▼                    ▼
               Edge Appliances     Security Operators   Dashboard Canvas
               (blackbox-sentinel) & CI/CD Pipelines    (ws_client.js)
```

| Port | Transport Protocol | Application Protocol | Authentication Mechanism | Primary Consumers |
| :--- | :--- | :--- | :--- | :--- |
| **`50051`** | TCP / HTTP/2 | gRPC Protobuf | **Mutual TLS (mTLS 1.3)** with TPM-backed client certificates | Edge appliances (`blackbox-sentinel`) |
| **`9443`** | TCP / HTTPS | REST API & Web SPA | **Bearer JWT** (HMAC-SHA256 / Ed25519) | Web browsers, `nexus-ctl`, CI/CD pipelines |
| **`9444`** | TCP / HTTP | Server-Sent Events | Scoped Session Token / Local Loopback | Local dashboard canvas, internal bridges |
| **`443`** | TCP / HTTPS (Outbound)| Aryorithm Cloud REST | Bearer JWT (Renewed every 1 hour) | Aryorithm SaaS Cloud (`app.aryorithm.com`) |

---

## 2. Inbound Service Multiplexing

* **Port 50051 (Fleet RPC):** Rejects any connection that fails client certificate verification. Unauthenticated probes or HTTP/1.1 requests are terminated at the TLS handshake.
* **Port 9443 (Management Console):** Serves the embedded web application and REST endpoints. Strict Cross-Origin Resource Sharing (CORS) rules prevent cross-site scripting vulnerabilities.
* **Port 9444 (Telemetry Stream):** Maintains open, long-lived HTTP/1.1 connections streaming `text/event-stream` payloads without proxy buffering headers (`X-Accel-Buffering: no`).

