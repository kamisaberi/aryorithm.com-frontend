# Command: `nexus-ctl report`

Compiles automated regulatory compliance audit scorecards across all connected fleet assets, evaluating configurations and telemetry against **CMMC 2.0 Level 2**, **IEC 62443**, and **EU NIS 2**.

---

## 1. Syntax

```bash
nexus-ctl report [cmmc | scada | nis2] [OPTIONS]
```

### Options

| Flag | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `--format [text\|json\|pdf]` | String | `text` | Output presentation format. |
| `--output PATH` | File Path | stdout | Destination file for exported compliance bundle. |
| `--tenant-id STR` | String | All | Scope report to a specific enterprise tenant. |

---

## 2. Generating an IEC 62443 Audit Report

```bash
nexus-ctl report scada --format text
```

### Terminal Output:
```text
================================================================================
           IEC 62443-3-3 INDUSTRIAL AUTOMATION COMPLIANCE AUDIT
================================================================================
Tenant Scope           : tenant-municipal-utility-bavaria
Evaluated Appliances   : 4,992 Managed Nodes
Target Security Level  : SL 3 / SL 4

Foundational Requirements Evaluation:
 [PASS] FR 3 - System Integrity (SR 3.1 & SR 3.5)
        • Proof: In-kernel Modbus/S7 APDU validation active on 4,992/4,992 nodes.
        • Zero unvalidated industrial writes passed in last 30 days.

 [PASS] FR 5 - Zone Segmentation (SR 5.1 & SR 5.2)
        • Proof: Native eBPF/XDP boundary filters active on all ingress conduits.
        • Sub-microsecond drop SLA verified: Fleet median p50 = 0.82 µs.

 [PASS] FR 7 - Resource Availability (SR 7.1 & SR 7.2)
        • Proof: Zero-SKB allocation prevents memory starvation under 10GbE floods.
        • Total unhandled packet drops: 0.

--------------------------------------------------------------------------------
COMPLIANCE STATUS: 100% CONFORMANT (SL 3 / SL 4 CERTIFIED)
================================================================================
```

