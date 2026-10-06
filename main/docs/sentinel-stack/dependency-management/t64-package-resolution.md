# Managing Ubuntu 24.04/26.04 64-bit `time_t` (`t64`) Transitions

Ubuntu 24.04 (Noble Numbat) and Ubuntu 26.04 introduced the widespread **`t64` architecture transition** to address the year-2038 problem (Y2038) on 32-bit platforms, renaming hundreds of core shared library packages (e.g., `libprotobuf-dev` and `libgrpc++-dev` dependencies).

---

## 1. The `t64` Package Rename Matrix

Attempting to install hardcoded legacy package names causes broken package graph errors on Ubuntu 24.04+:

| Component | Legacy Package Name (< 24.04) | Ubuntu 24.04 / 26.04 Transition (`t64`) |
| :--- | :--- | :--- |
| **Protocol Buffers Core** | `libprotobuf32` | `libprotobuf32t64` |
| **C++ gRPC Runtime** | `libgrpc++1.51` | `libgrpc++1.51t64` or `libgrpc++-dev` meta |
| **ELF Object Access** | `libelf1` | `libelf1t64` |
| **Asynchronous Event Loop**| `libevent-2.1-7` | `libevent-2.1-7t64` |
| **String Formatting** | `libfmt9` | `libfmt9t64` |

---

## 2. Metapackage Resolution Strategy

Rather than querying architecture-specific runtime `.so` packages directly, `sentinel-stack` references standard virtual metapackages (`*-dev`) that map to the appropriate `t64` library variant:

```bash
# Correct abstraction in scripts/01_install_dependencies.sh:
apt-get install -y \
    libprotobuf-dev \
    protobuf-compiler-grpc \
    libgrpc++-dev \
    libelf-dev \
    libfmt-dev
```

This decoupling ensures that whether `sentinel-stack` executes on Ubuntu 22.04 LTS, Ubuntu 24.04 LTS, or Ubuntu 26.04 Devel, APT resolves the correct architecture symbols without manual user intervention.

