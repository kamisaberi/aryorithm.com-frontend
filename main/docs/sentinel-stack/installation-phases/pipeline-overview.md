# Chronological Pipeline Execution: Phase 0 to Phase 5

The master orchestration script (`install.sh`) executes a linear, 6-phase pipeline. Each phase is implemented as a standalone POSIX script in `scripts/`, enforcing strict error trapping and logging to `/var/log/sentinel_install.log`.

---

## 1. Master Pipeline Flow

```text
 [ ENTER: sudo ./install.sh ]
              │
              ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ PHASE 0: SYSTEM VALIDATION (00_check_system.sh)             │
 │  - Verifies Ubuntu 24.04/26.04 & Kernel >= 5.15             │
 │  - Mounts /sys/fs/bpf (bpffs) and evaluates RAM ceiling     │
 └────────────────────────────┬────────────────────────────────┘
                              │
                              ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ PHASE 1: DEPENDENCY RESOLUTION (01_install_dependencies.sh) │
 │  - Installs Clang-16, LLVM, t64 packages, and CMake         │
 │  - Provisions isolated venv at /opt/sentinel-stack/venv     │
 └────────────────────────────┬────────────────────────────────┘
                              │
                              ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ PHASE 2: REPOSITORY SYNCHRONIZATION (02_clone_repositories) │
 │  - Discovers local sibling directories (rsync)              │
 │  - Or performs shallow Git clone across all 6 tiers         │
 └────────────────────────────┬────────────────────────────────┘
                              │
                              ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ PHASE 3: TOPOLOGICAL BUILD DAG (03_build_all_tiers.sh)      │
 │  - Sequential compile: xinfer -> blackbox -> sentinel...    │
 │  - Executes intermediate ldconfig cache refreshes           │
 └────────────────────────────┬────────────────────────────────┘
                              │
                              ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ PHASE 4: SYSTEMD DAEMONIZATION (04_setup_systemd.sh)        │
 │  - Generates service units with SCHED_RR priority 98        │
 │  - Binds Linux capabilities (CAP_NET_ADMIN, CAP_BPF)        │
 └────────────────────────────┬────────────────────────────────┘
                              │
                              ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ PHASE 5: POST-BUILD SMOKE TESTS (05_verify_installation.sh) │
 │  - 11-step quality gate validation                          │
 │  - Verifies ports 50051, 9443, and 9444 are listening      │
 └────────────────────────────┬────────────────────────────────┘
                              │
                              ▼
 [ EXIT: System Operational in < 8 Minutes ]
```

---

## 2. Master Entrypoint (`install.sh`)

```bash
#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="/var/log/sentinel_install.log"
exec > >(tee -a "${LOG_FILE}") 2>&1

echo "================================================================================"
echo "          ARYORITHM SENTINEL-STACK 1-CLICK TOPOLOGICAL INSTALLER               "
echo "================================================================================"
echo "[*] Installation log initialized at: ${LOG_FILE}"

# Execute 6 phases sequentially
"${SCRIPT_DIR}/scripts/00_check_system.sh"
"${SCRIPT_DIR}/scripts/01_install_dependencies.sh"
"${SCRIPT_DIR}/scripts/02_clone_repositories.sh"
"${SCRIPT_DIR}/scripts/03_build_all_tiers.sh"
"${SCRIPT_DIR}/scripts/04_setup_systemd.sh"
"${SCRIPT_DIR}/scripts/05_verify_installation.sh"

echo ""
echo "================================================================================"
echo "          INSTALLATION COMPLETE — ALL 6 TIERS SUCCESSFULLY DEPLOYED             "
echo "================================================================================"
```

