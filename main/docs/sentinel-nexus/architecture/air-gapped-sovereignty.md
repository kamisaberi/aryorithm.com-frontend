# Air-Gapped Data Sovereignty & $0.00 Cloud Egress

`sentinel-nexus` is architected for complete air-gapped sovereignty. In municipal water utilities, nuclear power stations, and defense operations centers, the platform functions autonomously without WAN connectivity.

---

## 1. Sovereign On-Premises Topology

```text
 ┌─────────────────────────────────────────────────────────────┐
 │ AIR-GAPPED INDUSTRIAL FACILITY                              │
 │                                                             │
 │  ┌───────────────────────┐        ┌───────────────────────┐ │
 │  │ blackbox-sentinel (1) │        │ blackbox-sentinel (N) │ │
 │  └───────────┬───────────┘        └───────────┬───────────┘ │
 │              │ Internal Network (10.240.0.0/24)│            │
 │              └────────────────┬───────────────┘             │
 │                               ▼                             │
 │               ┌───────────────────────────────┐             │
 │               │ sentinel-nexus Fleet Hub      │             │
 │               │ • Port 50051: Fleet gRPC      │             │
 │               │ • Port 9443: Web Console      │             │
 │               │ • Port 9444: Real-Time SSE    │             │
 │               │ • 100% On-Premises Execution  │             │
 │               └───────────────────────────────┘             │
 └─────────────────────────────────────────────────────────────┘
                                 ║
                                 ╫ PHYSICAL AIR-GAP (NO INTERNET ROUTE)
                                 ║
                         [ PUBLIC CLOUD ]
```

---

## 2. Data Sovereignty Guarantees

* **Zero Telemetry Leakage:** Ingress network flows, raw PCAP files, and asset metadata remain inside the customer's on-premises boundary.
* **$0.00 Cloud Egress Fees:** Fleet coordination, active learning curation, and Canary model rollouts execute entirely over local Ethernet/fiber links.
* **Zero External Dependencies:** The web command center embeds all HTML, CSS, JavaScript, and SVG vector graphics directly in the C++ binary—making zero outbound requests to external CDNs.

