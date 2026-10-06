# Building & Installing Sentinel-Nexus

This guide covers building the core `sentinel-nexus` daemon, the `nexus-ctl` operations CLI, and unit benchmarks from source.

---

## 1. Install System Dependencies

### Ubuntu 24.04 / 22.04 LTS

```bash
sudo apt-get update && sudo apt-get install -y \
    build-essential \
    clang-16 \
    lld-16 \
    cmake \
    ninja-build \
    pkg-config \
    libssl-dev \
    libgrpc++-dev \
    protobuf-compiler-grpc \
    libprotobuf-dev \
    nlohmann-json3-dev \
    git
```

---

## 2. Clone the Repository

```bash
git clone --recurse-submodules https://github.com/kamisaberi/sentinel-nexus.git
cd sentinel-nexus
```

---

## 3. Configure and Compile

Build using CMake and Ninja:

```bash
mkdir build && cd build

cmake -G Ninja \
    -DCMAKE_BUILD_TYPE=Release \
    -DCMAKE_CXX_COMPILER=clang++-16 \
    -DCMAKE_INSTALL_PREFIX=/usr/local \
    -DNEXUS_BUILD_TESTS=ON \
    -DNEXUS_BUILD_CLI=ON ..

ninja -j$(nproc)
```

### Generated Artifacts in `build/bin/`:
* `sentinel-nexus`: The master central fleet command daemon.
* `nexus-ctl`: Standalone C++20 operations and administration CLI.
* `nexus_tests`: Comprehensive GoogleTest integration and unit test suite.

---

## 4. Install System-Wide

Install binaries, configuration directories, and static web assets:

```bash
sudo ninja install
sudo ldconfig

# Initialize configuration and data directories
sudo mkdir -p /etc/sentinel-nexus/certs
sudo mkdir -p /var/lib/sentinel-nexus/data
sudo mkdir -p /var/lib/sentinel-nexus/models
sudo mkdir -p /var/lib/sentinel-nexus/forge_datasets
```

