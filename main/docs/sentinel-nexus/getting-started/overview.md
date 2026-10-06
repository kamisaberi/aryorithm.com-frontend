# Central Fleet Command Plane & Collective Defense Architecture

Managing cybersecurity across distributed critical infrastructure—such as dozens of regional water treatment plants, hundreds of electrical substations, or thousands of maritime vessels—presents operational challenges:

* **Siloed Defenses:** When an edge appliance encounters an unknown zero-day exploit, other regional nodes remain vulnerable until centralized security teams release signatures days or weeks later.
* **Model Management Friction:** Deploying machine learning updates to thousands of edge appliances requires manual staging and risks deploying models that breach sub-microsecond line-rate SLAs.
* **Asset Fragmentation:** Industrial sites feature diverse sensors (Modbus PLCs, Siemens controllers, DICOM scanners, IP cameras) lacking unified hierarchical visibility.

`sentinel-nexus` is the **central nervous system** that unifies edge defense appliances into an autonomous collective defense grid.

---

## 1. The "Attacked Once, Immune Everywhere" Paradigm

```text
 1. ADVERSARY LAUNCHES ZERO-DAY ATTACK:
    Target: Electrical Substation Alpha (Munich East)
    Mitigation: In-kernel eBPF drop executed in 0.82 µs.
              │
              ▼ Emits Threat IoC to Nexus Hub via gRPC Port 50051 (Transit: ~14 ms)
 2. NEXUS COLLECTIVE DEFENSE BUS:
    Evaluates severity, checks originator loop suppression, and fans out rule.
              │
              ▼ Parallel Fanout over Streaming gRPC Channels (Transit: ~18 ms)
 3. FLEET-WIDE IMMUNITY ENFORCED:
    Target: 4,999 Remaining Substations across Europe
    Reaction: KernelDropInjector writes IP to blocked_ip_map in driver space.
              │
              ▼
 TOTAL FLEET SYNCHRONIZATION TIME: 32 ms (< 50 ms SLA Bound)
```

---

## 2. Core Pillars of `sentinel-nexus`

* **Collective Defense Engine:** Distributes threat signatures across the fleet in $< 50\,\text{ms}$, stopping automated worm propagation and coordinated botnet sweeps.
* **Dataset Curator for Active Learning:** Filters ambiguous flow records ($0.40 \le f(x) \le 0.60$) and packages them into training batches for `xinfer-forge`.
* **Canary OTA Staging & RollbackGuard:** Manages staged rollouts (`Shadow Mode` $\to$ `5% Canary` $\to$ `Fleet-Wide`), monitoring edge latency and executing emergency rollbacks if performance degrades.
* **Air-Gapped Web Command Center:** Serves an administrative dashboard on port **9443** (HTML5 Canvas radial topology, MITRE ATT&CK matrix) with a real-time Server-Sent Events (SSE) telemetry stream on port **9444**.

