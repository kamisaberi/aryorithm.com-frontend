# System-Wide Filesystem Layout & Installation Paths

`sentinel-stack` adheres strictly to the Linux **Filesystem Hierarchy Standard (FHS)**, placing shared libraries, binaries, configuration manifests, and data stores into predictable system paths.

---

## 1. Target Filesystem Tree

```text
/
├── usr/local/
│   ├── include/                              # C++20 Header APIs
│   │   ├── xinfer/                          # Tier 1 Headers (xinfer.hpp, tensor.hpp)
│   │   └── blackbox/                        # Tier 2 Headers (blackbox.hpp, xdp.hpp)
│   ├── lib/                                 # Native Shared Libraries
│   │   ├── libxinfer.so -> libxinfer.so.1
│   │   ├── libblackbox.so -> libblackbox.so.1
│   │   ├── bpf/                             # In-Kernel eBPF Bytecode
│   │   │   └── xdp_filter.o
│   │   └── sentinel-plugins/                # 30 Dynamic Protocol Dissectors
│   │       ├── libsentinel_plugin_modbus.so
│   │       └── libsentinel_plugin_s7comm.so
│   └── bin/                                 # Production Executables
│       ├── sentinel                         # Tier 3 Edge Appliance Daemon
│       ├── forge-cli                        # Tier 4 Continual AI CLI Wrapper
│       ├── sentinel_lab                     # Tier 5 Academic Research Testbed
│       ├── sentinel-nexus                   # Tier 6 Central Fleet Command Hub
│       └── nexus-ctl                        # Tier 6 Operations CLI
├── etc/
│   ├── sentinel/                            # Edge Appliance Configuration
│   │   ├── sentinel.yaml
│   │   └── certs/
│   └── sentinel-nexus/                      # Central Hub Configuration
│       ├── nexus.yaml
│       └── certs/
├── var/lib/sentinel-nexus/                  # Hub Data Directories
│   ├── data/                                # State Database (nexus_state.json)
│   ├── models/                              # Staged ONNX Neural Models
│   └── forge_datasets/                      # Active Learning Curated CSVs
└── opt/sentinel-stack/
    ├── venv/                                # Isolated PEP 668 Python Environment
    └── src/                                 # Cloned or rsynced source trees
```

---

## 2. Dynamic Linker Configuration

The installer registers `/usr/local/lib` in the dynamic linker configuration:

```bash
# /etc/ld.so.conf.d/sentinel.conf
/usr/local/lib
/usr/local/lib/sentinel-plugins
```

