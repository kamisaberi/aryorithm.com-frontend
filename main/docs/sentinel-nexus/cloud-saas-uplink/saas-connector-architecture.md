# SaaS Connector Architecture (`SaaSConnector.cpp`)

The `SaaSConnector` subsystem is an optional, outbound-only C++20 HTTPS client that connects on-premises `sentinel-nexus` hubs to the **Aryorithm Cloud SaaS Platform (`app.aryorithm.com`)**. It maintains high-level executive visibility across distributed multi-region facilities while preserving the **zero-ingress, air-gapped operational independence** of local hubs.

---

## 1. Outbound-Only Architecture

```text
 ┌─────────────────────────────────────────────────────────────┐
 │ ON-PREMISES SECURE ENCLAVE                                  │
 │                                                             │
 │  ┌───────────────────────────────────────────────────────┐  │
 │  │ sentinel-nexus Hub Core (NodeRegistry & StateDatabase)│  │
 │  └───────────────────────────┬───────────────────────────┘  │
 │                              │ In-Memory Read Snapshots     │
 │                              ▼                              │
 │  ┌───────────────────────────────────────────────────────┐  │
 │  │ SaaSConnector.cpp (Outbound Background Thread)        │  │
 │  │ • Isolated std::recursive_mutex                      │  │
 │  │ • 3-Second Socket Timeouts (SO_RCVTIMEO/SO_SNDTIMEO)  │  │
 │  │ • Non-Blocking Asynchronous Egress                    │  │
 │  └───────────────────────────┬───────────────────────────┘  │
 └──────────────────────────────┼──────────────────────────────┘
                                │
                                ▼ Outbound HTTPS TLS 1.3 (Port 443 Only)
                                │ ZERO INBOUND PORTS OPEN TO CLOUD
                                ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ Aryorithm Cloud SaaS Platform (app.aryorithm.com)           │
 │  - FastAPI Backend & PostgreSQL TimeScale Cluster           │
 │  - Multi-Tenant Executive CISO Dashboard                    │
 └─────────────────────────────────────────────────────────────┘
```

---

## 2. Critical Deadlock & Socket Timeout Invariants

During high-concurrency production runs, socket communication is protected by three architectural safeguards:

1. **`std::recursive_mutex` Re-entrancy:** Prevents thread self-deadlocks where `authenticate()` and `http_post_json()` attempt to acquire the authentication lock on the same thread.
2. **Explicit Socket Timeouts:** All TCP sockets enforce a **3-second timeout** (`SO_RCVTIMEO` and `SO_SNDTIMEO`), preventing daemon hangs during network degradation.
3. **HTTP `Content-Length` Parsing:** The socket reader parses `Content-Length` headers directly rather than waiting for EOF, preventing connection stalls.

