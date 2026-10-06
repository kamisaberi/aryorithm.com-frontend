# Executive KPI Telemetry Cards & Live Metrics

The top navigation of the Web Command Center renders active Key Performance Indicator (KPI) telemetry cards, refreshed at 10 Hz from the SSE stream.

---

## 1. Dashboard KPI Cards Layout

```text
 ┌────────────────────┐ ┌────────────────────┐ ┌────────────────────┐ ┌────────────────────┐
 │ FLEET APPLIANCES   │ │ IN-KERNEL DROPS    │ │ MITIGATION SLA     │ │ ACTIVE MODEL       │
 │ 4,992 / 5,000      │ │ 1,420,891 pkts     │ │ 0.82 µs (Median)   │ │ network_threat_v2  │
 │ Status: 99.8% UP   │ │ Rate: 42,100 pps   │ │ p99 SLA: < 0.84 µs │ │ Status: FLEET-WIDE │
 └────────────────────┘ └────────────────────┘ └────────────────────┘ └────────────────────┘
```

---

## 2. Telemetry Card Invariants

* **Fleet Appliances:** Displays total registered nodes, active online connections, and degraded instances.
* **In-Kernel Drops:** Aggregates cumulative packets purged by Tier 2 `xdp_filter.o` across all edge nodes.
* **Mitigation SLA:** Displays median ($p50$) and 99th-percentile ($p99$) response times. Turns red if the fleet SLA exceeds $1.0\,\mu\text{s}$.
* **Active Model:** Displays the currently enforced ONNX model version, SHA-256 fingerprint, and rollout state (`SHADOW`, `CANARY`, `FLEET_WIDE`).

