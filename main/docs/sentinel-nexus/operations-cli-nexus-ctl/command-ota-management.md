# Command: `nexus-ctl ota`

Manages the staged model rollout lifecycle, inspects Canary cohort performance, advances deployment stages, and triggers emergency rollbacks.

---

## 1. Syntax

```bash
nexus-ctl ota [status | stage | advance | rollback] [OPTIONS]
```

---

## 2. Subcommands

### 1. `nexus-ctl ota status`
Displays the active model, candidate Canary model, and rollout progression:

```bash
nexus-ctl ota status
```

#### Output:
```text
================================================================================
                    CANARY OTA MODEL ROLLOUT CONTROLLER
================================================================================
Active Fleet Model     : network_threat_v1.onnx (SHA256: e9a2c31e...)
Candidate Model        : network_threat_v2_canary.onnx (SHA256: 3a7b41e2...)
Current Rollout Stage  : STAGE 2: CANARY_5_PCT (Active Cohort: 250 / 5,000 Nodes)
Stage Elapsed Time     : 14 hours, 22 minutes (Required Window: 24 hours)

Canary Cohort Health:
 • Mitigation Latency p50 : 0.82 µs (Nominal)
 • Mitigation Latency p99 : 0.84 µs (Meets < 1.0 ms SLA)
 • Consecutive SLA Breaches: 0 / 3
 • False Positive Surge   : 1.02x Baseline (Nominal)

RollbackGuard Status   : ARMED & HEALTHY (Zero Rollback Triggers Fired)
================================================================================
```

---

### 2. `nexus-ctl ota stage <ONNX_FILE>`
Submits an exported model artifact to the staging repository:

```bash
nexus-ctl ota stage /opt/sentinel/models/network_threat_v2.onnx \
    --manifest /opt/sentinel/models/network_threat_v2.manifest.json
```

---

### 3. `nexus-ctl ota advance`
Promotes a verified model to the next rollout stage:

```bash
nexus-ctl ota advance --force
```

Transitions: `SHADOW_MODE` $\to$ `CANARY_5_PCT` $\to$ `FLEET_WIDE`.

---

### 4. `nexus-ctl ota rollback`
Forces an immediate emergency rollback:

```bash
nexus-ctl ota rollback --reason "Operator manual abort: Latency jitter observed"
```

