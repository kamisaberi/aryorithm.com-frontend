# Technical Frequently Asked Questions (FAQ)

---

### Q1: How does the Collective Defense Bus achieve sub-50ms fanout across 5,000 appliances?
`sentinel-nexus` maintains persistent, open HTTP/2 multiplexed streams (`StreamFleetRules`) to all connected appliances over mutual TLS 1.3 on port 50051. When a threat indicator arrives, the `IocBroadcaster` iterates through its in-memory stream map in parallel, avoiding TCP handshakes, TLS renegotiations, or database lookups on the distribution path.

---

### Q2: What happens if an edge appliance loses connection to Nexus?
The edge appliance (`blackbox-sentinel`) operates with complete local autonomy:
* It continues evaluating network flows using its active in-memory model.
* It drops matching attacks in kernel driver space ($< 0.84\,\mu\text{s}$).
* Telemetry events are buffered locally in RAM ring buffers until the Nexus connection is re-established.

---

### Q3: Does `sentinel-nexus` require internet access to function?
**No.** `sentinel-nexus` is designed for sovereign, air-gapped deployments. In industrial plants and classified networks, it operates without WAN access. The embedded Web Command Center (port 9443) has **zero external CDN dependencies**, and all model retraining cycles (`xinfer-forge`) execute on-premises.

---

### Q4: How does `RollbackGuard` decide when to abort a Canary model?
During the Canary phase (where 5% of the fleet runs the candidate model in active mitigation), `RollbackGuard` tracks latency metrics reported via heartbeats. If any appliance reports mitigation latency exceeding **$1{,}000\,\mu\text{s}$ ($1.0\,\text{ms}$)** for 3 consecutive intervals, or if the drop rate surges by more than $500\%$ over moving baseline averages, `RollbackGuard` triggers an immediate rollback to the previous baseline model within $50\,\text{ms}$.

---

### Q5: Can I manage multiple distinct organizations on a single Nexus instance?
**Yes.** `sentinel-nexus` enforces a multi-tenant hierarchy (`Tenant` $\to$ `Nexus` $\to$ `Sentinel` $\to$ `Sensor`). All database records, telemetry queues, and API queries are partitioned strictly by `tenant_id`.

