# Zero-Downtime Atomic Model Hot-Reload Flow

In high-concurrency packet filtering, stopping the daemon or flushing in-kernel filter maps to update AI weights creates operational vulnerabilities.

`blackbox-sentinel` and `sentinel-nexus` coordinate **Zero-Downtime Atomic Hot-Reloads**.

---

## 1. Hot-Reload Sequence

```text
 [ Step 1: Download Complete & SHA-256 Verified on Edge Node ]
                              │
                              ▼ Local In-Memory Allocation
 ┌─────────────────────────────────────────────────────────────┐
 │ 1. xinfer::InferenceEngine loads candidate model into RAM   │
 │   - Compiles execution graph for target silicon (NPU/GPU)   │
 │   - Pins input/output scratchpad buffers                    │
 └────────────────────────────┬────────────────────────────────┘
                              │ Secondary Graph Ready
                              ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ 2. Atomic Pointer Swap (Zero Latency Penalty)               │
 │   - std::atomic<InferenceEngine*>::store(new_engine)        │
 │   - Active eBPF drop filters continue uninterrupted         │
 └────────────────────────────┬────────────────────────────────┘
                              │
                              ▼ Graceful Cleanup
 ┌─────────────────────────────────────────────────────────────┐
 │ 3. Drain and release memory of previous model version       │
 └─────────────────────────────────────────────────────────────┘
  TOTAL DOWNTIME: 0.00 Milliseconds (Zero Packet Loss)
```

---

## 2. Triggering Hot-Reloads via Command Line

Force an immediate edge model reload using `nexus-ctl`:

```bash
nexus-ctl ota reload --node edge-substation-alpha --version 2.4.0
```

### Verification
Query the edge node health status:

```bash
curl -k -s https://edge-substation-alpha:8443/api/v1/health | jq .active_model_sha256
# Expected Output: "e9a2c31e847b2c94b13a7b41e2d90100..."
```

