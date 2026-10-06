# Dynamic MITRE ATT&CK Matrix Heatmap (`threat_matrix.js`)

The Web Command Center provides a dynamic **MITRE ATT&CK for Enterprise and ICS** tactical matrix. Cells update in real time as attack vectors are intercepted across the fleet.

---

## 1. Tactical Matrix Layout

```text
 ┌─────────────────┬─────────────────┬─────────────────┬─────────────────┐
 │ Initial Access  │ Execution       │ Persistence     │ Impair Control  │
 ├─────────────────┼─────────────────┼─────────────────┼─────────────────┤
 │ T1190           │ T1059           │ T1543           │ T0855           │
 │ Exploit Public  │ Command Script  │ Create Service  │ Unauthorized Cmd│
 │ [ 12 Events ]   │ [ 4 Events ]    │ [ 0 Events ]    │ [ 1,420 Drops ] │
 │                 │                 │                 │ (HOT RED CELL)  │
 ├─────────────────┼─────────────────┼─────────────────┼─────────────────┤
 │ T1133           │ T1203           │ T1547           │ T0831           │
 │ External Remote │ Client Exploit  │ Boot Autostart  │ Manipulate Ctrl │
 │ [ 2 Events ]    │ [ 0 Events ]    │ [ 0 Events ]    │ [ 842 Drops ]   │
 └─────────────────┴─────────────────┴─────────────────┴─────────────────┘
```

---

## 2. Dynamic Heatmap Scaling

Matrix cells are shaded dynamically based on rolling incident frequency ($N_{\text{incidents}}$):

$$\text{Shade Intensity} = \min\left(1.0,\, \frac{N_{\text{incidents}}}{50}\right)$$

* **Zero Incidents:** Dark Slate Gray (`#1E222B`).
* **Low Activity ($1 - 10$ events):** Amber Warning (`#FFB300`).
* **High Activity ($> 50$ events):** Saturated Red Alert (`#FF1744`).

Clicking any cell opens the **XAI Root-Cause Drawer**, displaying the top-3 feature attributions for that specific MITRE technique.

