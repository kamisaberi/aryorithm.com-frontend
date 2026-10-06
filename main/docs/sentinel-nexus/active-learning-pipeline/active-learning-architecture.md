# Active Learning Architecture: Edge Vector Ingestion to Forge Staging

`sentinel-nexus` functions as the central telemetry curator in the Aryorithm active learning flywheel. Instead of collecting millions of redundant benign flows, it ingests ambiguous network vectors identified by edge appliances, packages them into balanced training datasets, and coordinates continual retraining with `xinfer-forge`.

---

## 1. End-to-End Active Learning Pipeline

```text
 ┌─────────────────────────────────────────────────────────────┐
 │ 5,000 Edge Appliances (blackbox-sentinel)                   │
 │  - Real-time inference scores 32-dim flow vectors           │
 │  - Filters boundary cases where 0.40 <= Score <= 0.60       │
 └──────────────────────────────┬──────────────────────────────┘
                                │ Streaming gRPC StreamUncertainVectors
                                ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ Sentinel-Nexus Hub: Vector Ingest Queue (200k RAM Ring)     │
 │  - Lock-free concurrent ingestion                           │
 │  - Deduplicates repetitive protocol telemetry               │
 └──────────────────────────────┬──────────────────────────────┘
                                │ Dequeued by Curator Thread
                                ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ DatasetCurator.cpp (Batch Packaging Engine)                 │
 │  - Reaches Quota: 5,000 Ambiguous Vectors                   │
 │  - Writes: forge_dataset_<uuid>.csv & .manifest.json        │
 └──────────────────────────────┬──────────────────────────────┘
                                │ Inotify / REST Trigger
                                ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ Tier 4: xinfer-forge (Continual Retraining Daemon)          │
 │  - Self-Supervised Tabular MAE + InfoNCE Adaptation         │
 │  - Validates against Golden Attacks Safety Gate (100% Pass) │
 └──────────────────────────────┬──────────────────────────────┘
                                │ Emits network_threat_v2.onnx
                                ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ Nexus Canary OTA Rollout Engine: Staged Fleet Deployment    │
 └─────────────────────────────────────────────────────────────┘
```

---

## 2. Curation Invariants

1. **Information Density Invariant:** Only vectors lying on the model's decision boundary ($0.40 \le f(x) \le 0.60$) are curated. Redundant baseline flows ($f(x) < 0.10$) and clear exploits ($f(x) > 0.85$) are excluded.
2. **Zero-PII Assurance:** Ingested vectors contain only normalized floating-point statistics (durations, packet counts, byte ratios); payload text and credentials are completely excluded.
3. **Decoupled Processing:** Ingesting vectors into the ring queue consumes $< 25\,\text{ns}$ per vector, ensuring the gRPC communication threads are never stalled by disk I/O.

