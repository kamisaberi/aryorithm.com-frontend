# Debugging Missing Linux Kernel Headers during eBPF Compilation

Phase 3 compiles the in-kernel eBPF filter (`blackbox/bpf/xdp_filter.c`). If the host system's kernel development headers do not match the running kernel release (`uname -r`), compilation halts.

---

## 1. Symptom & Error Trace

```text
In file included from xdp_filter.c:1:
/usr/include/linux/bpf.h:11:10: fatal error: 'linux/types.h' file not found
#include <linux/types.h>
          ^~~~~~~~~~~~~~~
1 error generated.
[-] eBPF compilation failed!
```

---

## 2. Diagnosing Kernel Header Version Mismatch

Verify whether the installed headers match your active kernel:

```bash
# Check running kernel release
uname -r

# Inspect installed header directories
ls -d /usr/src/linux-headers-*
```

### The "Updated But Un-Rebooted" Trap:
If `uname -r` outputs `6.8.0-31-generic`, but `/usr/src/` only contains `linux-headers-6.8.0-35-generic`, an automated `apt upgrade` updated the kernel packages on disk, but the host has not yet rebooted into the new kernel.

---

## 3. Remediation

### Scenario A: Reboot Host (Recommended)
Reboot the machine into the updated kernel release:

```bash
sudo reboot
```

### Scenario B: Install Exact Matching Headers
If rebooting is restricted, install the header package matching the active running kernel:

```bash
sudo apt-get update
sudo apt-get install -y linux-headers-$(uname -r)
```

Verify that `/usr/src/linux-headers-$(uname -r)` exists, then restart installation: `sudo ./install.sh`.

