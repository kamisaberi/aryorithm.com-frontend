# System Requirements & Prerequisites

Review the operating system baselines, hardware resource recommendations, and user privileges before executing `install.sh`.

---

## 1. Operating System Baseline

`sentinel-stack` is tested against modern 64-bit Linux distributions:

| Operating System | Distribution Baseline | Kernel Baseline | Supported Architectures |
| :--- | :--- | :--- | :--- |
| **Ubuntu Linux** | 24.04 LTS (Noble Numbat) | Kernel 6.8+ | `x86_64`, `aarch64` |
| **Ubuntu Linux** | 26.04 (Devel) | Kernel 6.8+ (GLIBC 2.43) | `x86_64`, `aarch64` |
| **Debian Linux** | 12 (Bookworm) | Kernel 6.1+ | `x86_64`, `aarch64` |

---

## 2. Hardware Resource Sizing

Compilation of deep C++20 templates and eBPF bytecode requires adequate RAM:

| Resource Profile | Minimal Deployment (Edge Gateway) | Recommended Build Host (Server / VM) |
| :--- | :--- | :--- |
| **CPU Allocation** | 4 Cores (2.0 GHz) | 16 to 32 Cores (Dynamic parallel build) |
| **System Memory (RAM)**| **8 GB RAM** (Compiler jobs capped at `-j2`) | **32 GB+ RAM** (Full parallel `-j$(nproc)`) |
| **Swap Space** | 4 GB Swap configured | 8 GB Swap |
| **Storage Space** | 25 GB Free NVMe SSD | 60 GB Free NVMe SSD |

---

## 3. Privileges & Execution Context

* **Superuser Privileges:** `sudo ./install.sh` is required to install system packages via APT, mount `/sys/fs/bpf`, write shared libraries to `/usr/local/lib/`, and register systemd service units.
* **Internet Access:** Initial installation requires outbound HTTP/HTTPS access to Ubuntu package mirrors and GitHub. (For offline deployments, refer to `architecture/air-gapped-installation-model.md`).

