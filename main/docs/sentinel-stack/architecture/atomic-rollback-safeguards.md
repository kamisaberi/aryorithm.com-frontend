# Atomic Rollback Safeguards & Failure Containment

If compilation fails mid-stream (e.g., compiler OOM or missing dependency), leaving partially installed shared libraries in `/usr/local/lib` can break future builds or leave the host in an un-bootable state.

`sentinel-stack` implements **Atomic Rollback Safeguards** and state tracking.

---

## 1. Shell Trap Error Handling (`scripts/00_check_system.sh`)

Every installation phase registers an automated POSIX shell trap:

```bash
# State tracking variables
INSTALL_PHASE="INITIALIZING"
PREVIOUS_TIERS_BUILT=()

cleanup_on_error() {
    local exit_code=$?
    echo ""
    echo "================================================================================"
    echo "[-] FATAL ERROR ENCOUNTERED IN PHASE: ${INSTALL_PHASE}"
    echo "[-] Command exited with status: ${exit_code}"
    echo "================================================================================"
    
    # 1. Rollback partial tier installation
    if [ -n "${CURRENT_BUILDING_TIER:-}" ]; then
        echo "[*] Rolling back partial artifacts for tier: ${CURRENT_BUILDING_TIER}..."
        rm -f "/usr/local/lib/lib${CURRENT_BUILDING_TIER}.so"*
        rm -rf "/usr/local/include/${CURRENT_BUILDING_TIER}"
    fi

    # 2. Refresh dynamic linker cache to maintain clean system state
    ldconfig

    echo "[*] System restored to clean state. See /var/log/sentinel_install.log for details."
    exit "${exit_code}"
}

trap cleanup_on_error ERR INT TERM
```

---

## 2. Failure Containment Invariants

* **Isolated Build Trees:** All compilation executes inside segregated build subdirectories (`build/`). Partial compilation objects (`.o`) never touch `/usr/local/` until the target passes all link tests.
* **Service Safety:** If Tier 6 fails to compile, existing Tier 3 services are not restarted with mismatched library versions.

