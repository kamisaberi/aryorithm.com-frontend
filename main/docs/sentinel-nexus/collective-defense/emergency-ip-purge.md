# Emergency Global False-Positive IP Purge

If a critical business partner IP, corporate gateway, or authorized engineering workstation is mistakenly blocked by an edge anomaly rule, security operators must be able to remove the block fleet-wide instantly.

`sentinel-nexus` provides an **Emergency Global IP Purge** command that removes the blocked address across all 5,000 edge kernel maps in **under $50\,\text{milliseconds}$**.

---

## 1. Global Purge Command Execution

### Via CLI (`nexus-ctl`):
```bash
nexus-ctl threat unblock --ip 198.51.100.42 --reason "Authorized Engineering Workstation"
```

### Via Web Command Center (Port 9443):
Navigate to **Threat Management $\to$ Active In-Kernel Rules**, select the target IP, and click **`[GLOBAL FLEET UNBLOCK]`**.

---

## 2. Purge Fanout Protocol

```text
 Administrator executes Global Unblock for 198.51.100.42
                           │
                           ▼ Broadcasts FleetDefenseRule with ttl_seconds = 0
 ┌─────────────────────────────────────────────────────────────┐
 │ Sentinel-Nexus Collective Defense Broadcaster               │
 └─────────────────────────┬───────────────────────────────────┘
                           │ Parallel gRPC Stream Fanout (< 50ms)
                           ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ 5,000 Remote Edge Appliances (blackbox-sentinel)            │
 ├─────────────────────────────────────────────────────────────┤
 │ KernelDropInjector reads ttl_seconds == 0:                  │
 │ -> Invokes BPF_MAP_DELETE_ELEM syscall on blocked_ip_map    │
 └─────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
 [ Traffic unblocked immediately across all global facilities ]
```

---

## 3. Audit Logging

Every emergency purge action generates a tamper-evident audit record logged to `data/nexus_state.json` containing the operator's identity, timestamp, and justification.

