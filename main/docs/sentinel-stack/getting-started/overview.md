# Meta-Builder Architecture: Automating the 6-Tier Ecosystem

Building, linking, and configuring a 6-tier cyber-physical security ecosystem from scratch typically requires executing dozens of disparate build steps: compiling eBPF bytecode with Clang BPF targets, generating gRPC Protobuf stubs, resolving shared library paths in `/etc/ld.so.conf.d/`, isolating Python machine learning environments, and authoring real-time systemd service units.

`sentinel-stack` acts as an **orchestrating meta-installer**, automating the entire multi-project lifecycle into a single pipeline.

---

## 1. Why a Topological Meta-Installer?

```text
 ┌─────────────────────────────────────────────────────────────┐
 │ THE MANUAL COMPILATION LABYRINTH:                           │
 │ 1. Developer builds Tier 3 (sentinel)                       │
 │    -> FAILS: Undefined reference to xinfer::InferenceEngine │
 │ 2. Developer builds Tier 1 (xinfer)                         │
 │    -> FAILS: Missing OpenVINO / Level Zero headers          │
 │ 3. Developer installs Python packages globally              │
 │    -> FAILS: PEP 668 externally-managed-environment         │
 │ 4. Developer starts daemon via systemd                      │
 │    -> FAILS: Missing CAP_NET_ADMIN; eBPF attach denied      │
 └──────────────────────────────┬──────────────────────────────┘
                                │
                                ▼ AUTOMATED BY SENTINEL-STACK
 ┌─────────────────────────────────────────────────────────────┐
 │ THE SENTINEL-STACK 1-COMMAND PARADIGM:                      │
 │ • Probes kernel, RAM, and mounts bpffs automatically        │
 │ • Resolves all OS dependencies non-interactively            │
 │ • Compiles Tiers 1 through 6 in mathematical DAG order      │
 │ • Deploys hardened systemd units with SCHED_RR real-time    │
 │ • Executes automated smoke tests across all 6 tiers         │
 └─────────────────────────────────────────────────────────────┘
```

---

## 2. Key Orchestration Responsibilities

* **Dependency Resolution:** Identifies and installs compilers (Clang 16+, GCC 12+), build systems (CMake, Ninja), kernel development headers, and runtime libraries.
* **Topological Sequentiality:** Ensures `libxinfer.so` exists before `libblackbox.so` compiles, and both shared libraries are indexed in `ldconfig` before `blackbox-sentinel` links.
* **Isolated Machine Learning Runtime:** Builds `/opt/sentinel-stack/venv` to run PyTorch and `forge-cli` without contaminating host operating system Python packages.
* **Matrix Handover:** Automatically copies compiled binaries and dependencies into `sentinel-matrix/shared/lib/`, allowing immediate transition into digital twin simulation.

