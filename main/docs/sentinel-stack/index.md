# Sentinel-Stack (`sentinel-stack`)

**1-Click Topological DAG Meta-Installer & Master Deployment Orchestrator**  
*Tier 8 Meta-Deployment Tier of the Aryorithm / Blackbox Sentinel Ecosystem*

---

## Executive Architectural Overview

`sentinel-stack` is the master build automation, dependency resolver, and deployment orchestrator for the entire Aryorithm 8-tier ecosystem. Executing via a single command (**`sudo ./install.sh`**), it validates host kernel capabilities, resolves complex package transitions (**Ubuntu 24.04/26.04 `t64` year-2038 libraries and PEP 668 Python environments**), and compiles all six runtime tiers in strict topological dependency order.

Upon build completion, `sentinel-stack` deploys hardened systemd service units with real-time priority (`SCHED_RR`), configures the in-kernel BPF virtual filesystem (`bpffs`), runs automated post-installation smoke tests, and harvests dynamic libraries into `sentinel-matrix/shared/lib/` for immediate digital twin simulation.

```text
====================================================================================================
                        SENTINEL-STACK 1-CLICK TOPOLOGICAL COMPILATION DAG
====================================================================================================
 [ENTRY POINT]                 sudo ./install.sh (or sudo make all)
                                      │
                                      ▼ PHASE 0: SYSTEM VALIDATION (00_check_system.sh)
                               Probes Linux Kernel >= 5.15, mounts bpffs, calculates RAM/CPU
                                      │
                                      ▼ PHASE 1: DEPENDENCY RESOLUTION (01_install_dependencies.sh)
                               Installs Clang-16, LLVM, t64 packages, builds /opt/sentinel-stack/venv
                                      │
                                      ▼ PHASE 2: REPOSITORY SYNC (02_clone_repositories.sh)
                               Local rsync or shallow git clone across all 6 tier repositories
                                      │
                                      ▼ PHASE 3: TOPOLOGICAL COMPILATION (03_build_all_tiers.sh)
 ┌────────────────────────────────────┴────────────────────────────────────────────────────────────┐
 │  [TIER 1: AI INFERENCE]        xinfer-essential (libxinfer.so -> /usr/local/lib)                │
 │                                 │                                                               │
 │                                 ▼ ldconfig                                                      │
 │  [TIER 2: ACTIVE MITIGATION]   blackbox-essential (xdp_filter.o, libblackbox.so)                │
 │                                 │                                                               │
 │                                 ▼ ldconfig                                                      │
 │  [TIER 3: EDGE XDR APPLIANCE]  blackbox-sentinel (sentinel daemon, 26 subsystems, 30 plugins)   │
 │                                 │                                                               │
 │                                 ▼ /opt/sentinel-stack/venv                                      │
 │  [TIER 4: CONTINUAL AI]        xinfer-forge (forge-cli -> /usr/local/bin/forge-cli)             │
 │                                 │                                                               │
 │                                 ▼ cmake build                                                   │
 │  [TIER 5: RESEARCH TESTBED]    sentinel-lab (sentinel_lab binary, SLAB protocol tools)          │
 │                                 │                                                               │
 │                                 ▼ gRPC HTTP/2                                                   │
 │  [TIER 6: COMMAND PLANE]       sentinel-nexus (sentinel-nexus daemon, nexus-ctl CLI, web SPA)  │
 └────────────────────────────────────┬────────────────────────────────────────────────────────────┘
                                      │
                                      ▼ PHASE 4: SYSTEMD DAEMONIZATION (04_setup_systemd.sh)
                               Deploys sentinel-nexus.service & blackbox-sentinel.service (SCHED_RR)
                                      │
                                      ▼ PHASE 5: POST-BUILD SMOKE TESTS (05_verify_installation.sh)
                               Runs 6-tier quality gate assertions; validates ports 50051, 9443, 9444
                                      │
                                      ▼ BRIDGE TO CYBER-RANGE (sentinel-matrix)
                               Auto-harvests host binaries and dynamic libs (ldd) into shared/lib/
====================================================================================================
```

---

## Core Invariants

1. **Zero-Prompt Automation:** Executes end-to-end non-interactively without pausing for APT debconf prompts, git credential queries, or manual intervention.
2. **Strict Topological Invariance:** Tiers compile strictly in acyclic dependency order ($T_1 \to T_2 \to T_3 \to T_4 \to T_5 \to T_6$); the dynamic linker cache (`ldconfig`) is updated after each tier build to satisfy subsequent link dependencies.
3. **PEP 668 & `t64` Compliance:** Bypasses Ubuntu 24.04/26.04 `externally-managed-environment` restrictions using an isolated virtual environment at `/opt/sentinel-stack/venv`, resolving all 64-bit time `t64` package names.
4. **Dynamic RAM Throttling:** Calculates host memory per CPU core, dynamically throttling compiler parallelism (e.g., `make -j2` under $< 8\text{ GB}$ RAM) to prevent internal compiler Out-of-Memory (OOM) fatal crashes.
5. **Turn-Key Cyber-Range Bridge:** Harvests host-compiled binaries and dynamic libraries (`libabsl`, `libre2`, `libgrpc++`) directly into `sentinel-matrix/shared/lib/` for zero-friction digital twin execution.

