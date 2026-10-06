# eBPF Compiler Toolchains & Kernel Header Alignment

Compiling in-kernel eBPF packet mitigation filters (`xdp_filter.o`) requires strict alignment between the host Clang/LLVM toolchain and the active kernel's internal header structures.

---

## 1. Toolchain Prerequisite Matrix

To compile eBPF bytecode targeting the Linux BPF virtual machine, `sentinel-stack` installs:

* **Compiler:** `clang-16` (Enforces modern BPF JIT instruction generation).
* **Assembler / Linker:** `llvm-16` and `lld-16`.
* **Object Stripper:** `llvm-strip-16` (Preserves `.BTF` debug sections while unlinking non-essential symbols).
* **Kernel Headers:** `linux-headers-$(uname -r)` matching the active running kernel release.

---

## 2. Dynamic Target Architecture Resolution

In `blackbox/bpf/build_bpf.sh`, the compiler target is resolved dynamically based on host architecture:

```bash
ARCH=$(uname -m | sed 's/x86_64/x86/' | sed 's/aarch64/arm64/')

clang-16 -O2 -g \
    -target bpf \
    -D__TARGET_ARCH_${ARCH} \
    -I/usr/include \
    -I/usr/include/$(uname -m)-linux-gnu \
    -c xdp_filter.c -o xdp_filter.o
```

---

## 3. Kernel Header Mismatch Safeguards

If a user upgrades their Linux kernel via `apt upgrade` but has not rebooted, `uname -r` will reference the old kernel while `/usr/src/` contains headers for the new kernel.

`00_check_system.sh` detects this discrepancy before compilation begins:

```bash
if [ ! -d "/usr/src/linux-headers-$(uname -r)" ]; then
    echo "[!] WARN: Headers for running kernel $(uname -r) not found. Installing..."
    apt-get install -y linux-headers-$(uname -r) || {
        echo "[-] FATAL: Kernel headers missing. Please reboot into your updated kernel." >&2
        exit 1
    }
fi
```

