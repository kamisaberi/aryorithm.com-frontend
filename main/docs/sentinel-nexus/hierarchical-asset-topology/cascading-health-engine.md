# Cascading Health Engine & State Machine

`sentinel-nexus` maintains active operational health states for all entities across the 4-tier asset tree. Health state transitions propagate hierarchically to reflect operational disruptions accurately.

---

## 1. The Four Health States

```text
 ┌───────────────┐
 │    ONLINE     │ Node and connected sensors operating within nominal bounds.
 └───────┬───────┘
         │ eBPF drop rate surge (> 20%) OR Subsystem enters DEGRADED mode
         ▼
 ┌───────────────┐
 │   DEGRADED    │ Traffic passes; mitigation active; potential anomaly under review.
 └───────┬───────┘
         │ Node heartbeats cease for > 15 seconds
         ▼
 ┌───────────────┐
 │  UNREACHABLE  │ Appliance stopped communicating; network link suspected down.
 └───────┬───────┘
         │ Operator clean shutdown received (DeregisterAppliance RPC)
         ▼
 ┌───────────────┐
 │    OFFLINE    │ Graceful shutdown confirmed; phantom alerts suppressed.
 └───────────────┘
```

---

## 2. Cascading Tree Propagation Rules

* **Parent Degradation:** If an edge appliance node enters `DEGRADED`, all attached Tier 4 sensors are marked with a warning badge on the Web Command Center.
* **Parent Unreachability:** If an appliance transitions to `UNREACHABLE` or `OFFLINE`, all subordinate sensors transition to `INHERITED_OFFLINE` automatically.
* **Automatic Recovery:** When the appliance resumes valid mTLS heartbeats on port 50051, the entire sub-tree transitions back to `ONLINE` within a single polling interval ($5.0\text{ seconds}$).

