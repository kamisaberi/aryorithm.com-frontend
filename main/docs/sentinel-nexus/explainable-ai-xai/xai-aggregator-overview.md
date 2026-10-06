# Edge Explainable AI (XAI) Attribution Aggregator Overview

In high-concurrency packet filtering, traditional post-hoc explainability techniques (such as kernel SHAP or LIME) are computationally prohibitive: evaluating thousands of model permutations introduces seconds of calculation delay, making real-time attribution impossible at line rate.

`sentinel-nexus` aggregates **Microsecond Residual Decomposition (MRD)** records computed in under **$80\,\text{nanoseconds}$** by edge appliances, providing security operations centers (SOCs) and compliance auditors with clear physical root-cause attributions for every automated mitigation.

---

## 1. End-to-End XAI Ingestion Architecture

```text
 [ EDGE APPLIANCE: blackbox-sentinel ]
  • Autoencoder flags threat: Reconstruction MSE > 0.082
  • In-process MRD decomposes element residuals in < 80 ns:
    e_j = (x_j - x̂_j)²
  • Identifies top-3 feature contributors
                     │
                     ▼ Emits ThreatIoC with XAI Payload over gRPC (Port 50051)
 ┌─────────────────────────────────────────────────────────────┐
 │ SENTINEL-NEXUS XAI AGGREGATOR (XaiAggregator.cpp)           │
 ├─────────────────────────────────────────────────────────────┤
 │ 1. Ingests raw residual vectors & observed values           │
 │ 2. Translates tensor indices via SemanticDictionary.hpp     │
 │ 3. Normalizes contribution percentages (∑ Pct = 100%)       │
 │ 4. Indexes record into Global Threat Cache alongside MITRE  │
 └─────────────────────────────┬───────────────────────────────┘
                               │
        ┌──────────────────────┴──────────────────────┐
        ▼ Query /api/v1/threats/xai                   ▼ Push via Port 9444 SSE
 ┌─────────────────────────────┐               ┌─────────────────────────────┐
 │ Compliance Audit Export     │               │ Web Command Center & TUI    │
 │ (Judicial Proof Bundle)     │               │ (Live Attribution Visualizer│
 └─────────────────────────────┘               └─────────────────────────────┘
```

---

## 2. Invariants & Performance

* **Zero Inference Stall:** Edge appliances compute feature attributions directly from the forward-pass output tensor without re-evaluating the neural network.
* **Semantic Normalization:** Converts abstract continuous values ($[-1.0, 1.0]$) back into physical units (e.g., $9{,}850\,\text{PSI}$, $3{,}600\,\text{RPM}$, $75{,}000\,\text{pps}$).
* **Centralized Correlation:** Correlates simultaneous attributions across multiple substations to identify coordinated campaign signatures.

