# Bridge Architecture: Host Compilation to Cyber-Range Handover

`sentinel-stack` links bare-metal compilation and containerized digital twin simulation. Rather than requiring developers to recompile the entire C++20 codebase inside Docker containers (which multiplies build times and consumes gigabytes of redundant container cache), `sentinel-stack` uses an automated **Binary & Dependency Bridge**.

---

## 1. Handover Pipeline Architecture

```text
 ┌─────────────────────────────────────────────────────────────┐
 │ BARE-METAL HOST BUILD (sentinel-stack Topological DAG)      │
 │  - Compiles Tiers 1-6 natively using Clang-16 (AVX2/AVX-512)│
 │  - Installs binaries to /usr/local/bin/ and /usr/local/lib/ │
 └──────────────────────────────┬──────────────────────────────┘
                                │ Post-Build Handover Trigger (Phase 3)
                                ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ AUTOMATED MATRIX BRIDGE (scripts/bridge_to_matrix.sh)        │
 ├─────────────────────────────────────────────────────────────┤
 │ 1. Binary Harvester  : Copies sentinel, nexus, nexus-ctl    │
 │                        to sentinel-matrix/shared/bin/       │
 │ 2. Dynamic Extractor : Resolves ldd dependencies (libabsl,  │
 │                        libre2, libgrpc) to shared/lib/      │
 │ 3. Assets Sync       : Syncs .proto and web SPA assets      │
 └──────────────────────────────┬──────────────────────────────┘
                                │ Ready for Launch
                                ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ CYBER-RANGE DIGITAL TWIN MESH (sentinel-matrix)             │
 │  - Direct Mount: ./shared/lib -> /usr/local/lib/matrix-deps │
 │  - Immediate Execution: make up -> make tui (Zero Build Lag)│
 └─────────────────────────────────────────────────────────────┘
```

---

## 2. Handover Invariants

1. **GLIBC 2.43 Forward Compatibility:** Because binaries compiled on Ubuntu 26.04 link against `GLIBC 2.43`, the bridge pairs these binaries with `sentinel-matrix` containers based on `ubuntu:devel`, preventing dynamic linker aborts.
2. **Zero In-Container Compilation:** Containers start instantly without running `cmake` or `ninja` internally.
3. **Atomic Synchronization:** Binaries are synced using atomic file operations, ensuring partially linked objects are never staged to container mount paths.

