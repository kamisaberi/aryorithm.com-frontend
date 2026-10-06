# Phase 3: Topological DAG Compilation (`03_build_all_tiers.sh`)

Phase 3 is the compilation engine of `sentinel-stack`. It compiles all six runtime tiers in strict topological order ($T_1 \to T_6$), updating `/etc/ld.so.cache` after each tier build to satisfy linker dependencies.

---

## 1. Script Implementation (`scripts/03_build_all_tiers.sh`)

```bash
#!/usr/bin/env bash
set -euo pipefail

SRC_DIR="/opt/sentinel-stack/src"
VENV_PATH="/opt/sentinel-stack/venv"
JOBS="${PARALLEL_JOBS:-$(nproc)}"

echo "[Phase 3] Starting topological compilation across all 6 tiers (Build Jobs: -j${JOBS})..."

# Helper function to compile CMake project
build_cmake_tier() {
    local tier_name="$1"
    local tier_path="$2"
    shift 2

    echo ""
    echo ">>> COMPILING TIER: ${tier_name} >>>"
    export CURRENT_BUILDING_TIER="${tier_name}"

    mkdir -p "${tier_path}/build"
    cd "${tier_path}/build"

    cmake -G Ninja \
        -DCMAKE_BUILD_TYPE=Release \
        -DCMAKE_CXX_COMPILER=clang++-16 \
        -DCMAKE_INSTALL_PREFIX=/usr/local \
        "$@" \
        ..

    ninja -j"${JOBS}"
    ninja install
    ldconfig # Enforce Intermediate Dynamic Linker Refresh!
}

# ------------------------------------------------------------------------------
# TIER 1: xinfer-essential (Universal Zero-Copy AI Runtime)
# ------------------------------------------------------------------------------
build_cmake_tier "xinfer" "${SRC_DIR}/xinfer" \
    -DXINFER_BUILD_TESTS=OFF \
    -DXINFER_ENABLE_OPENVINO=ON

# ------------------------------------------------------------------------------
# TIER 2: blackbox-essential (eBPF Kernel Filter & Mitigation Core)
# ------------------------------------------------------------------------------
# Compile eBPF Bytecode first
cd "${SRC_DIR}/blackbox/bpf"
chmod +x build_bpf.sh && ./build_bpf.sh
mkdir -p /usr/local/lib/bpf
cp xdp_filter.o /usr/local/lib/bpf/

build_cmake_tier "blackbox" "${SRC_DIR}/blackbox" \
    -DBLACKBOX_BUILD_TESTS=OFF \
    -DBLACKBOX_ENABLE_TPM=ON

# ------------------------------------------------------------------------------
# TIER 3: blackbox-sentinel (Commercial Edge XDR Daemon)
# ------------------------------------------------------------------------------
build_cmake_tier "sentinel" "${SRC_DIR}/sentinel" \
    -DSENTINEL_BUILD_TESTS=OFF

# ------------------------------------------------------------------------------
# TIER 4: xinfer-forge (Continual Active Learning Daemon)
# ------------------------------------------------------------------------------
echo ""
echo ">>> INSTALLING TIER: xinfer-forge >>>"
cd "${SRC_DIR}/forge"
"${VENV_PATH}/bin/pip" install .
ln -sf "${VENV_PATH}/bin/forge-cli" /usr/local/bin/forge-cli

# ------------------------------------------------------------------------------
# TIER 5: sentinel-lab (Academic Benchmark Research Testbed)
# ------------------------------------------------------------------------------
build_cmake_tier "sentinel-lab" "${SRC_DIR}/lab" \
    -DENABLE_OPENVINO=ON \
    -DBUILD_BENCHMARKS=ON

# ------------------------------------------------------------------------------
# TIER 6: sentinel-nexus (Central Fleet Command Hub)
# ------------------------------------------------------------------------------
build_cmake_tier "sentinel-nexus" "${SRC_DIR}/nexus" \
    -DNEXUS_BUILD_CLI=ON \
    -DNEXUS_BUILD_TESTS=OFF

# Auto-harvest compiled binaries into sentinel-matrix shared mounts
if [ -d "/opt/sentinel-matrix" ]; then
    echo "[*] Bridging compiled binaries to sentinel-matrix..."
    mkdir -p /opt/sentinel-matrix/shared/lib
    /opt/sentinel-matrix/scripts/bundle_host_libs.sh || true
fi

echo "[+] Phase 3 Complete: All 6 tiers compiled and installed system-wide."
```

