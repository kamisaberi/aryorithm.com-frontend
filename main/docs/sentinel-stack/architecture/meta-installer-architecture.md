# Meta-Installer Architecture & Systems Design

`sentinel-stack` operates as a non-interactive, topological meta-installer designed to provision the entire Aryorithm 6-tier runtime ecosystem on bare-metal systems, virtual appliances, or edge gateways.

---

## 1. Meta-Builder Architectural Pipeline

```text
 ┌─────────────────────────────────────────────────────────────┐
 │ sudo ./install.sh (Master Orchestrator Entrypoint)          │
 └──────────────────────────────┬──────────────────────────────┘
                                │ Linear Sequential Phase Dispatch
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
 ┌──────────────┐        ┌──────────────┐        ┌──────────────┐
 │ Phase 0:     │        │ Phase 1:     │        │ Phase 2:     │
 │ System Probe │───────►│ Dependencies │───────►│ Repositories │
 │ (00_check)   │        │ (01_deps)    │        │ (02_clone)   │
 └──────────────┘        └──────────────┘        └──────────────┘
                                                        │
        ┌───────────────────────────────────────────────┘
        ▼
 ┌──────────────┐        ┌──────────────┐        ┌──────────────┐
 │ Phase 3:     │        │ Phase 4:     │        │ Phase 5:     │
 │ Topological  │───────►│ Systemd Units│───────►│ Smoke Tests  │
 │ DAG Build    │        │ (04_systemd) │        │ (05_verify)  │
 └──────────────┘        └──────────────┘        └──────────────┘
```

---

## 2. Decoupled Modular Scripts

Rather than maintaining a monolithic, fragile thousand-line shell script, `sentinel-stack` partitions installation logic into modular, independently runnable phase scripts within `scripts/`:

* `scripts/00_check_system.sh`: Hardware checks, kernel capability probing, BPF filesystem mounting.
* `scripts/01_install_dependencies.sh`: APT packaging, `t64` library resolution, Python PEP 668 venv setup.
* `scripts/02_clone_repositories.sh`: Local rsync synchronization or shallow Git cloning across all 6 tiers.
* `scripts/03_build_all_tiers.sh`: The topological DAG compilation engine.
* `scripts/04_setup_systemd.sh`: Service unit deployment, capabilities, and real-time scheduling.
* `scripts/05_verify_installation.sh`: Automated post-install smoke test harness.

---

## 3. Execution Invariants

* **Idempotency:** Re-running `./install.sh` evaluates existing artifacts; already compiled tiers and configured environments are verified and preserved rather than rebuilt from scratch.
* **Fail-Fast Error Trapping:** Every script enforces strict POSIX bash safety flags:
  ```bash
  set -euo pipefail
  ```
  Any individual compilation error, missing header, or failed command immediately halts execution.

