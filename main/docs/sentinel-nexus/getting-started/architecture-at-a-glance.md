# Architecture at a Glance

The diagram below maps the interaction between edge defense appliances (`blackbox-sentinel`), the central command hub (`sentinel-nexus`), continual AI retraining (`xinfer-forge`), and cloud visibility (`app.aryorithm.com`).

---

```text
 ┌──────────────────────────────────────────────────────────────────────────────────────────┐
 │ CLOUD SAAS PORTAL: app.aryorithm.com (Optional Multi-Tenant Executive Dashboard)         │
 └──────────────────────────────────────────▲───────────────────────────────────────────────┘
                                            │ Outbound HTTPS Sync (POST /api/v1/fleet/sync)
                                            │ Decoupled SaaSConnector ($0.00 Egress Local)
 ┌──────────────────────────────────────────┴───────────────────────────────────────────────┐
 │ SENTINEL-NEXUS CENTRAL COMMAND PLANE (Tier 6 Hub)                                        │
 │                                                                                          │
 │  ┌──────────────────────────────────────────────┐  ┌──────────────────────────────────┐  │
 │  │ Sub-50ms Collective Defense Bus              │  │ DatasetCurator (Active Learning) │  │
 │  │ • Fans out FleetDefenseRules to 5,000 nodes  │  │ • Curation window: [0.40 - 0.60] │  │
 │  │ • Originator loopback suppression            │  │ • Emits forge_dataset_*.csv      │  │
 │  └──────────────────────┬───────────────────────┘  └────────────────┬─────────────────┘  │
 │                         │                                           │                    │
 │                         │                                           ▼ File Watcher       │
 │                         │                      ┌──────────────────────────────────────┐  │
 │                         │                      │ Tier 4: xinfer-forge Continual AI    │  │
 │                         │                      │ • Self-Supervised Tabular MAE        │  │
 │                         │                      │ • Golden Attacks Safety Gate (100%)  │  │
 │                         │                      │ • Automated ONNX Opset 17 Export     │  │
 │                         │                      └────────────────────┬─────────────────┘  │
 │                         │                                           │                    │
 │                         ▼ Bi-Directional mTLS Channels              ▼ POST /ota/stage    │
 │  ┌──────────────────────────────────────────────────────────────────┴─────────────────┐  │
 │  │ gRPC Fleet Service (Port 50051)                                                    │  │
 │  │ • StreamFleetRules (< 50ms propagation) • SubmitHeartbeats • Canary OTA Updates    │  │
 │  └──────────────────────┬─────────────────────────────────────────────────────────────┘  │
 └─────────────────────────┼────────────────────────────────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐ Parallel Distribution
        ▼                  ▼                  ▼ (Up to 5,000 Nodes)
 ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
 │ Appliance 1  │   │ Appliance 2  │   │ Appliance N  │
 │ (Substation) │   │ (Water Plant)│   │ (Hospital)   │
 └──────────────┘   └──────────────┘   └──────────────┘
```

