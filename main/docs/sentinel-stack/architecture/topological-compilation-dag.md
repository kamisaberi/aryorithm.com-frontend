# The Topological Compilation Directed Acyclic Graph (DAG)

Because each tier in the Aryorithm ecosystem links directly against the headers and shared objects of lower-level tiers, compiling out of order results in fatal dynamic linker errors.

`sentinel-stack` models the build process as a **Directed Acyclic Graph (DAG)** and executes a linear topological sort.

---

## 1. Mathematical Dependency Graph

Let $G = (V, E)$ represent the dependency graph, where vertices $V = \{T_1, T_2, T_3, T_4, T_5, T_6\}$ represent the ecosystem tiers:

$$V = \{ \text{xinfer}, \text{blackbox}, \text{sentinel}, \text{forge}, \text{lab}, \text{nexus} \}$$

The dependency edges $E$ denote compile-time and link-time requirements:

```text
               ┌────────────────────────────────────────────────────────┐
               │              TIER 1: xinfer-essential                  │
               │              Outputs: libxinfer.so                     │
               └──────────┬──────────────────┬──────────────────┬───────┘
                          │                  │                  │
                          ▼                  │                  │
 ┌─────────────────────────────────┐         │                  │
 │   TIER 2: blackbox-essential    │         │                  │
 │   Outputs: libblackbox.so       │         │                  │
 │            xdp_filter.o         │         │                  │
 └────────────────┬────────────────┘         │                  │
                  │                          │                  │
                  ▼                          ▼                  │
 ┌──────────────────────────────────────────────────┐           │
 │            TIER 3: blackbox-sentinel             │           │
 │            Outputs: sentinel daemon              │           │
 └────────────────────────┬─────────────────────────┘           │
                          │                                     │
                          ├──────────────────┐                  │
                          ▼                  ▼                  ▼
 ┌─────────────────────────────────┐   ┌─────────────────────────────────┐
 │       TIER 4: xinfer-forge      │   │       TIER 5: sentinel-lab      │
 │       Outputs: forge-cli        │   │       Outputs: sentinel_lab     │
 └────────────────┬────────────────┘   └────────────────┬────────────────┘
                  │                                     │
                  └──────────────────┬──────────────────┘
                                     │
                                     ▼
 ┌──────────────────────────────────────────────────────────────────────┐
 │                      TIER 6: sentinel-nexus                          │
 │                      Outputs: sentinel-nexus daemon, nexus-ctl CLI   │
 └──────────────────────────────────────────────────────────────────────┘
```

---

## 2. Linear Topological Order

The unique topological ordering evaluated by `03_build_all_tiers.sh` is:

$$\mathcal{T} = \langle T_1 \longrightarrow T_2 \longrightarrow T_3 \longrightarrow T_4 \longrightarrow T_5 \longrightarrow T_6 \rangle$$

1. **$T_1$ (`xinfer-essential`):** Universal C++20 AI inference runtime (`libxinfer.so`).
2. **$T_2$ (`blackbox-essential`):** In-kernel eBPF filter and active mitigation core (`libblackbox.so`). Links to $T_1$.
3. **$T_3$ (`blackbox-sentinel`):** Commercial edge XDR daemon (`sentinel`). Links to $T_1$ and $T_2$.
4. **$T_4$ (`xinfer-forge`):** Continual active learning engine (`forge-cli`). Consumes $T_1$ ONNX specifications.
5. **$T_5$ (`sentinel-lab`):** Open academic benchmark testbed (`sentinel_lab`). Links to $T_1$ and $T_2$.
6. **$T_6$ (`sentinel-nexus`):** Central command plane (`sentinel-nexus`). Coordinates $T_3$, $T_4$, and $T_5$.

