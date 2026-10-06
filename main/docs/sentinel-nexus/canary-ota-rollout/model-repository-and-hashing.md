# Local Model Repository & Cryptographic Hashing

`sentinel-nexus` maintains a local, on-premises model repository in `/var/lib/sentinel-nexus/models/`. It serves verified ONNX models to edge appliances over authenticated HTTP streaming connections.

---

## 1. Repository Layout

```text
/var/lib/sentinel-nexus/models/
├── network_threat_v1.onnx               # Active Baseline Model
├── network_threat_v1.manifest.json       # SHA-256 & Verification Manifest
├── network_threat_v2_canary.onnx        # Candidate Model under Evaluation
├── network_threat_v2_canary.manifest.json
└── quarantine/                          # Quarantined models rejected by RollbackGuard
```

---

## 2. HTTP Streaming Download Endpoint (`GET /api/v1/models/{filename}`)

Edge appliances stream model files using chunked HTTP/2 transfers:

```text
Edge Appliance (blackbox-sentinel)                   Sentinel-Nexus Hub
       │                                                         │
       │ GET /api/v1/models/network_threat_v2.onnx               │
       │ Authorization: Bearer <APPLIANCE_JWT>                   │
       ├────────────────────────────────────────────────────────►│
       │                                                         │
       │◄────────────────────────────────────────────────────────┤
       │ 200 OK (Content-Type: application/octet-stream)         │
       │ X-Checksum-SHA256: e9a2c31e847b2c94b13a7b41e2...        │
       │ [Chunked Binary Stream: 7,412 Bytes]                    │
```

Before passing the model to `libxinfer.so`, the edge node computes the streaming SHA-256 hash. If the checksum does not match the `X-Checksum-SHA256` header, the file is deleted immediately.

