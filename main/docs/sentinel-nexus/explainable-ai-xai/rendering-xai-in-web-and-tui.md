# Live XAI Visualization: Web Command Center & Terminal TUI

`sentinel-nexus` renders Microsecond Residual Decomposition (MRD) attributions live across both the **Web Command Center (Port 9443)** and the **Terminal TUI (`nexus-tui`)**.

---

## 1. Web Command Center Rendering (HTML5 Canvas & SVG)

The Web Command Center visualizes feature deviations using SVG impact bars:

```text
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │ INCIDENT #1802 ATTRIBUTION BREAKDOWN                                       │
 ├─────────────────────────────────────────────────────────────────────────────┤
 │ Threat: MODBUS REGISTER TAMPER (T0855) | Score: 0.284 | In-Kernel Drop: OK  │
 ├─────────────────────────────────────────────────────────────────────────────┤
 │ [1] Modbus Setpoint 40001 (64.2%)                                           │
 │     Observed: 9,850 PSI | Normal: 2,100 PSI (Residual: +7,750 PSI)          │
 │     Impact: ████████████████████████████████                                │
 │                                                                             │
 │ [2] Flow Packet Rate (23.8%)                                                │
 │     Observed: 82,000 pps | Normal: 150 pps                                  │
 │     Impact: ████████████                                                    │
 │                                                                             │
 │ [3] Packet Inter-Arrival Jitter (12.0%)                                     │
 │     Observed: 0.001 ms | Normal: 12.5 ms                                    │
 │     Impact: ██████                                                          │
 └─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Terminal TUI Rendering (`make tui`)

In air-gapped server environments without desktop web browsers, system operators run the dual-panel terminal TUI:

```text
 ┌─ Sentinel-Nexus TUI v2.4 ─────────────────────────────── Top Attributions ─┐
 │ Node                 Status   Drops   SLA      │ Rank 1: MODBUS_REG_40001  │
 │ edge-substation-01   ONLINE   1,420   0.82 µs  │  Delta: +7,750 PSI (64%)  │
 │ edge-substation-02   ONLINE     840   0.81 µs  │ Rank 2: FLOW_PPS          │
 │ edge-substation-03   ONLINE      12   0.84 µs  │  Delta: +81,850 pps (24%) │
 │ > edge-water-plant   ONLINE   4,129   0.82 µs  │ Rank 3: IAT_MEAN          │
 └────────────────────────────────────────────────┴───────────────────────────┘
```

