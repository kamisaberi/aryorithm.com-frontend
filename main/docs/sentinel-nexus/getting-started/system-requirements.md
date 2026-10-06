# System Requirements & Prerequisites

Review the toolchain, network configuration, and hardware requirements before building and running `sentinel-nexus`.

---

## 1. Operating System Baseline

* **Operating System:** 64-bit Linux (Ubuntu 22.04 LTS, Ubuntu 24.04 LTS, or Ubuntu 26.04 Devel).
* **Linux Kernel:** Kernel version **>= 5.15** (Kernel **>= 6.8** recommended).
* **C++ Toolchain:** Clang 16.0+ or GCC 12.1+ supporting **ISO C++20**.
* **Core Libraries:** `libgrpc++-dev`, `protobuf-compiler-grpc`, `libssl-dev`, `nlohmann-json3-dev`.

---

## 2. Hardware Resource Sizing

Hardware requirements scale based on the number of managed edge appliances:

| Managed Fleet Sizing | CPU Cores | System RAM | NVMe SSD Storage | Network Interface |
| :--- | :--- | :--- | :--- | :--- |
| **Small Fleet (< 100 Nodes)** | 8 Cores (3.0 GHz) | 16 GB DDR4/DDR5 | 100 GB NVMe | 1 GbE RJ45 |
| **Regional Hub (100 - 1,000 Nodes)** | 16 Cores (AMD/Xeon)| 32 GB DDR5 ECC | 500 GB NVMe | 10 GbE SFP+ |
| **Enterprise Grid (Up to 5,000 Nodes)**| 32 Cores (64 Threads)| 64 GB DDR5 ECC | 2 TB Enterprise NVMe| Dual 10/25 GbE |

---

## 3. Network Ports & Firewall Rules

Ensure the following ports are open on the host:

| Port Number | Protocol | Direction | Subsystem Purpose |
| :--- | :--- | :--- | :--- |
| **`50051`** | TCP / HTTP/2 | Inbound | Mutual TLS (mTLS) gRPC interface for edge appliance connections. |
| **`9443`** | TCP / HTTPS | Inbound | Air-gapped Web Command Center and administrative REST API. |
| **`9444`** | TCP / HTTP | Inbound | Real-time Server-Sent Events (SSE) streaming endpoint. |
| **`443`** | TCP / HTTPS | Outbound | Optional outbound link to Aryorithm SaaS (`app.aryorithm.com`). |

