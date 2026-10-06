# Phase 0: System & Hardware Validation (`00_check_system.sh`)

Phase 0 interrogates the host operating system, probes the Linux kernel for eBPF features, calculates physical RAM to tune compiler parallelism, and ensures the BPF virtual filesystem (`bpffs`) is mounted.

---

## 1. Script Implementation (`scripts/00_check_system.sh`)

```bash
#!/usr/bin/env bash
set -euo pipefail

echo "[Phase 0] Interrogating host hardware and operating system..."

# 1. Enforce Root Privileges
if [ "$EUID" -ne 0 ]; then
    echo "[-] FATAL: Please run as root: sudo ./install.sh" >&2
    exit 1
fi

# 2. Validate Linux Distribution
if [ -f /etc/os-release ]; then
    # shellcheck source=/dev/null
    . /etc/os-release
    echo "[+] Detected OS: ${NAME} ${VERSION_ID} (${VERSION_CODENAME:-devel})"
    if [[ "${ID}" != "ubuntu" && "${ID}" != "debian" ]]; then
        echo "[!] WARN: Target OS is not Ubuntu/Debian. Installation may require manual dependency alignment."
    fi
fi

# 3. Validate Linux Kernel Version (Requires >= 5.15)
KERNEL_VER=$(uname -r | cut -d'-' -f1)
KERNEL_MAJOR=$(echo "${KERNEL_VER}" | cut -d'.' -f1)
KERNEL_MINOR=$(echo "${KERNEL_VER}" | cut -d'.' -f2)

if [ "${KERNEL_MAJOR}" -lt 5 ] || ([ "${KERNEL_MAJOR}" -eq 5 ] && [ "${KERNEL_MINOR}" -lt 15 ]); then
    echo "[-] FATAL: Kernel ${KERNEL_VER} is too old. Sentinel requires Linux Kernel >= 5.15 for eBPF/XDP." >&2
    exit 1
fi
echo "[+] Kernel Version ${KERNEL_VER} verified."

# 4. Ensure /sys/fs/bpf is mounted (bpffs)
if ! mount | grep -q 'type bpf'; then
    echo "[*] Mounting BPF filesystem (/sys/fs/bpf)..."
    mount -t bpf bpffs /sys/fs/bpf
fi
echo "[+] BPF virtual filesystem verified at /sys/fs/bpf."

# 5. Calculate RAM and Dynamic Compiler Parallelism
TOTAL_RAM_KB=$(grep MemTotal /proc/meminfo | awk '{print $2}')
TOTAL_RAM_GB=$((TOTAL_RAM_KB / 1024 / 1024))
CPU_CORES=$(nproc)

if [ "${TOTAL_RAM_GB}" -lt 8 ]; then
    echo "[!] WARN: Host RAM is ${TOTAL_RAM_GB}GB (< 8GB). Capping compiler to -j2 to avoid OOM crashes."
    export PARALLEL_JOBS=2
elif [ "${TOTAL_RAM_GB}" -lt 16 ]; then
    export PARALLEL_JOBS=$((CPU_CORES > 4 ? 4 : CPU_CORES))
else
    export PARALLEL_JOBS="${CPU_CORES}"
fi
echo "[+] System sizing verified: ${TOTAL_RAM_GB}GB RAM, ${CPU_CORES} Cores -> Build Jobs: -j${PARALLEL_JOBS}"
```

---

## 2. Invariants Checked

* **Superuser Privileges:** Aborts immediately if `$EUID` is non-zero.
* **Kernel Baseline:** Enforces Kernel $\ge 5.15$ (Kernel 6.8+ recommended for modern BTF CO-RE support).
* **RAM Throttling:** Caches `$PARALLEL_JOBS` into an environment configuration file consumed by Phase 3.

