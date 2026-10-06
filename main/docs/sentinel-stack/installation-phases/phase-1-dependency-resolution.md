# Phase 1: Dependency Resolution & Packaging (`01_install_dependencies.sh`)

Phase 1 resolves all native compilers, build systems, 64-bit `t64` libraries, and kernel development headers via APT, and provisions the isolated Python virtual environment at `/opt/sentinel-stack/venv`.

---

## 1. Script Implementation (`scripts/01_install_dependencies.sh`)

```bash
#!/usr/bin/env bash
set -euo pipefail

echo "[Phase 1] Resolving toolchain, system libraries, and Python venv..."

export DEBIAN_FRONTEND=noninteractive
APT_OPTS=(-y -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold")

# 1. Update Package Indices
apt-get update "${APT_OPTS[@]}"

# 2. Install Core Build Toolchain & Compilers
apt-get install "${APT_OPTS[@]}" \
    build-essential \
    clang-16 \
    lld-16 \
    llvm-16 \
    cmake \
    ninja-build \
    pkg-config \
    git \
    rsync \
    curl \
    libelf-dev \
    zlib1g-dev \
    libbpf-dev \
    linux-headers-$(uname -r)

# 3. Install Modern t64 Runtime & Protobuf/gRPC Dependencies
# Handles Ubuntu 24.04/26.04 64-bit time_t transition packages cleanly
apt-get install "${APT_OPTS[@]}" \
    libssl-dev \
    libgrpc++-dev \
    protobuf-compiler-grpc \
    libprotobuf-dev \
    nlohmann-json3-dev \
    libfmt-dev \
    libspdlog-dev \
    libtss2-dev \
    tpm2-tools

# 4. Provision Isolated Python Virtual Environment (PEP 668 Compliant)
apt-get install "${APT_OPTS[@]}" python3-full python3-venv python3-pip

VENV_PATH="/opt/sentinel-stack/venv"
if [ ! -d "${VENV_PATH}" ]; then
    echo "[*] Creating isolated virtual environment at ${VENV_PATH}..."
    mkdir -p /opt/sentinel-stack
    python3 -m venv "${VENV_PATH}"
fi

# Upgrade pip and install machine learning wheels
"${VENV_PATH}/bin/pip" install --upgrade pip setuptools wheel
"${VENV_PATH}/bin/pip" install \
    torch torchvision --index-url https://download.pytorch.org/whl/cpu \
    onnx \
    onnxruntime \
    numpy \
    pyyaml \
    requests \
    tqdm

echo "[+] Phase 1 Complete: All OS toolchains and virtual environment provisioned."
```

---

## 2. Invariants Enforced

* **PEP 668 Compliance:** Python packages are never installed globally using `sudo pip install`; everything is isolated within `/opt/sentinel-stack/venv`.
* **Non-Interactive Execution:** APT flags bypass all interactive dialogs.

