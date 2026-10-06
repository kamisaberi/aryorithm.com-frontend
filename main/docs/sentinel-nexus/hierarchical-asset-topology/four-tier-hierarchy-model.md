# The 4-Tier Hierarchical Enterprise Asset Model

Enterprise security visibility requires structured representation of physical and logical infrastructure. Flattened asset lists fail in multi-facility deployments with thousands of field sensors.

`sentinel-nexus` models physical infrastructure using a **4-Tier Hierarchical Asset Topology**.

---

## 1. The 4-Tier Asset Hierarchy

```text
 [ TIER 1: ENTERPRISE TENANT ]
  tenant_id: "tenant-municipal-utility-bavaria"
  • Corporate organization, enterprise compliance scope, CISO governance.
                         │
                         ▼
 [ TIER 2: SENTINEL-NEXUS COMMAND HUB ]
  nexus_id: "nexus-central-munich" (IP: 10.240.0.10)
  • Regional fleet orchestrator, Collective Defense Bus, model staging.
                         │
                         ▼
 [ TIER 3: BLACKBOX-SENTINEL APPLIANCE NODES ]
  node_id: "edge-substation-alpha" (IP: 10.240.0.101)
  • Physical edge gateways, in-kernel eBPF filters, local SIEM engines.
                         │
                         ▼
 [ TIER 4: OPERATIONAL SENSORS, PLCs & ACTUATORS ]
  sensor_id: "modbus-10.240.0.101-502-u1" (Schneider Modicon M340 PLC)
  sensor_id: "s7-10.240.0.102-102-r0-s2"   (Siemens S7-1200 Controller)
  sensor_id: "dicom-10.240.0.103-104-aet1"  (GE Healthcare CT Scanner)
  • Physical field devices, industrial control loops, medical modalities.
```

---

## 2. Invariants & Data Aggregation

1. **Deterministic Relational Binding:** Every field sensor (Tier 4) belongs to exactly one edge appliance (Tier 3), which reports to a specific Nexus hub (Tier 2) under an enterprise tenant (Tier 1).
2. **Cascading Rollups:** If an edge appliance loses connection, all connected Tier 4 sensors automatically transition their operational state to match the parent node without requiring individual device ping probes.
3. **Multi-Tenant Isolation:** Policy rules, Canary OTA rollouts, and telemetry streams are partitioned strictly by `tenant_id`.

