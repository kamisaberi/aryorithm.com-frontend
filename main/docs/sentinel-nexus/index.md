# Sentinel-Nexus (`sentinel-nexus`)

**Central Fleet Command Plane, Collective Defense Grid & Continual AI Orchestrator**  
*Tier 6 Master Command Tier of the Aryorithm / Blackbox Sentinel Ecosystem*

---

## Executive Architectural Overview

`sentinel-nexus` is the high-performance, central fleet command plane and collective defense engine of the Aryorithm ecosystem. Implemented in native ISO C++20, it coordinates and defends up to **5,000 edge appliances (`blackbox-sentinel`)** across globally distributed or sovereign air-gapped industrial facilities.

At the core of `sentinel-nexus` is the **Sub-50ms Collective Defense Bus**: when any edge appliance detects and drops an active zero-day attack, Nexus broadcasts the threat indicator fleet-wide, programming all 5,000 remote Linux kernel eBPF tables in under $50\,\text{milliseconds}$ (*"Attacked Once, Immune Everywhere"*).

```text
====================================================================================================
                        SENTINEL-NEXUS FLEET COMMAND PLANE ARCHITECTURE
====================================================================================================
 [FLEET APPLIANCES]             UP TO 5,000 EDGE NODES (blackbox-sentinel daemons)
                                 ▲                │
            gRPC Port 50051      │ Telemetry Sync │ Collective Defense Rules (< 50ms)
            Mutual TLS 1.3       │ Heartbeats     ▼ Canary OTA Model Rollouts
 ┌───────────────────────────────┴─────────────────────────────────────────────────────────────────┐
 │ SENTINEL-NEXUS DAEMON (/usr/local/bin/sentinel-nexus)                                           │
 │                                                                                                 │
 │  ┌──────────────────────────────────────────────┐  ┌────────────────────────────────────────┐  │
 │  │ Sub-50ms Collective Defense Grid             │  │ DatasetCurator (Active Learning Bridge)│  │
 │  │ • Asynchronous Parallel gRPC Broadcast       │  │ • Uncertainty Sampling [0.40 - 0.60]   │  │
 │  │ • Originator Loopback Suppression            │  │ • Packages forge_dataset_*.csv Batches │  │
 │  └──────────────────────────────────────────────┘  └───────────────────┬────────────────────┘  │
 │                                                                        │ Inotify / REST Trigger│
 │  ┌──────────────────────────────────────────────┐                      ▼                       │
 │  │ Canary OTA Rollout Engine & RollbackGuard    │     ┌─────────────────────────────────────┐  │
 │  │ • Shadow Mode -> 5% Canary -> Fleet-Wide     │     │ Tier 4: xinfer-forge (forge-cli)    │  │
 │  │ • Automated Abort on >1000µs SLA Latency     │     │ • Self-Supervised Tabular MAE       │  │
 │  └──────────────────────────────────────────────┘     │ • Golden Attacks Safety Gate (100%) │  │
 │                                                       └─────────────────────────────────────┘  │
 │  ┌──────────────────────────────────────────────┐  ┌────────────────────────────────────────┐  │
 │  │ 4-Tier Hierarchical Asset Topology           │  │ Microsecond Residual XAI Aggregator    │  │
 │  │ Tenant -> Nexus Hub -> Sentinel -> Sensors   │  │ Top-3 Feature Attributions (< 80ns MRD)│  │
 │  └──────────────────────────────────────────────┘  └────────────────────────────────────────┘  │
 │                                                                                                │
 │  ┌──────────────────────────────────────────────┐  ┌────────────────────────────────────────┐  │
 │  │ Air-Gapped Web Command Center (Port 9443)    │  │ Real-Time SSE Push Stream (Port 9444)  │  │
 │  │ • HTML5 Canvas Radial Node Topology          │  │ • 100Hz Sub-10ms Telemetry Pipeline    │  │
 │  │ • Dynamic MITRE ATT&CK Heatmap (Zero CDNs)   │  │ • Decoupled Outbound SaaSConnector     │  │
 │  └──────────────────────────────────────────────┘  └────────────────────────────────────────┘  │
 └─────────────────────────────────────────────────────────────────────────────────────────────────┘
====================================================================================================
```

---

## Core Invariants

1. **Sub-50ms Collective Defense Bus:** Translates localized edge discoveries into fleet-wide in-kernel immunity in $< 50\,\text{ms}$, preventing lateral propagation across multi-site infrastructure.
2. **Autonomous Closed-Loop Adaptation:** Pairs with `xinfer-forge` to curate ambiguous traffic ($0.40 \le f(x) \le 0.60$), retrain models on-premises, and deploy candidate weights without human intervention.
3. **RollbackGuard SLA Enforcement:** Protects edge nodes during Canary rollouts; an operational latency spike exceeding $1{,}000\,\mu\text{s}$ triggers an automated, immediate rollback.
4. **Data Sovereignty ($0.00 Cloud Egress):** Operates on-premises within air-gapped enclaves. The embedded web management console (port 9443) enforces a **Zero-CDN guarantee**.
5. **Decoupled Outbound SaaS Connector:** Maintains a 4-tier asset tree (`Tenant` $\to$ `Nexus` $\to$ `Sentinel` $\to$ `Sensor`), transmitting health states to `app.aryorithm.com` over a decoupled, non-blocking outbound HTTPS client.

