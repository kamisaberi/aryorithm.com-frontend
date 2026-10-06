# Air-Gapped Web Console Architecture (Port 9443 HTTPS)

The `sentinel-nexus` Web Command Center provides security operations centers (SOCs) and industrial plant managers with centralized visibility over 5,000 edge appliances. Built as an embedded Single-Page Application (SPA), it operates with **zero external CDN dependencies**, eliminating external data leakage and loading delays in air-gapped environments.

---

## 1. Web Serving & Data Flow Architecture

```text
 [ Web Browser / SOC Video Wall ]
                 │
                 ├── HTTPS TLS 1.3 (Port 9443): REST API & HTML5 Assets
                 │
                 └── HTTP EventStream (Port 9444): Real-Time SSE Stream (< 10ms Push)
                 │
                 ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ sentinel-nexus Embedded Web Engine                          │
 ├─────────────────────────────────────────────────────────────┤
 │ • Port 9443: Static Asset Router & REST API (/api/v1/*)     │
 │ • Port 9444: Dedicated SSE Push Server (SseBroadcaster.cpp)│
 │ • Security : Strict Content-Security-Policy (CSP)           │
 └──────────────────────────────┬──────────────────────────────┘
                                │ In-Process State Access
                                ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ NodeRegistry, CollectiveDefenseBus, and XaiAggregator       │
 └─────────────────────────────────────────────────────────────┘
```

---

## 2. The Zero-CDN Guarantee

In compliance with sovereign defense and critical infrastructure standards:
* **No External Scripts:** All client scripts (`app.js`, `fleet_topology.js`, `threat_matrix.js`) are compiled directly into the C++ binary as gzip-compressed byte arrays.
* **No Remote Fonts or Stylesheets:** Typography relies on system font stacks (`system-ui`, `-apple-system`, `Segoe UI`, `Roboto`), avoiding requests to Google Fonts or Typekit.
* **Vector Graphics:** Icons and device markers use inline SVG vectors, requiring no font-based icon CDNs (e.g., FontAwesome).

