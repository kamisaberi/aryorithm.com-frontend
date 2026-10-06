# Master Stack Configuration Manifest (`configs/stack.yaml`)

`sentinel-stack` reads its default compilation flags, repository branches, filesystem prefixes, and systemd options from `configs/stack.yaml`. This file allows operators to tailor the build process for specific enterprise environments or embedded platforms.

---

## 1. Master Configuration Schema (`configs/stack.yaml`)

```yaml
version: "1.0.0"

# ==============================================================================
# 1. GLOBAL SYSTEM PATHS & COMPILER SIZING
# ==============================================================================
global:
  install_prefix: "/usr/local"          # Base FHS prefix for binaries and libraries
  config_dir: "/etc/sentinel"           # Base directory for YAML runtime manifests
  runtime_data_dir: "/var/lib/sentinel" # Base directory for models and state journals
  venv_path: "/opt/sentinel-stack/venv" # Isolated Python virtual environment
  source_dir: "/opt/sentinel-stack/src" # Cloned source trees
  force_clean_build: false              # If true, purges build/ directories before compiling

build_options:
  cxx_compiler: "clang++-16"            # clang++-16 or g++-12
  c_compiler: "clang-16"                # clang-16 or gcc-12
  build_type: "Release"                 # Release, Debug, RelWithDebInfo
  enable_lto: false                     # Enable Link-Time Optimization (-flto)
  enable_native_arch: false             # Target host microarchitecture (-march=native)
  max_parallel_jobs: 0                  # 0 = Auto-calculate based on available RAM

# ==============================================================================
# 2. TIER REPOSITORY SOURCES & PINNED TAGS
# ==============================================================================
repositories:
  xinfer_essential:
    git_url: "https://github.com/kamisaberi/xinfer.git"
    branch: "main"                      # Release tag or branch (e.g. v1.0.0)
    cmake_flags:
      - "-DXINFER_BUILD_TESTS=OFF"
      - "-DXINFER_ENABLE_OPENVINO=ON"
      - "-DXINFER_ENABLE_ZERO_COPY=ON"

  blackbox_essential:
    git_url: "https://github.com/kamisaberi/blackbox.git"
    branch: "main"
    cmake_flags:
      - "-DBLACKBOX_BUILD_TESTS=OFF"
      - "-DBLACKBOX_ENABLE_TPM=ON"

  blackbox_sentinel:
    git_url: "https://github.com/kamisaberi/blackbox-sentinel.git"
    branch: "main"
    cmake_flags:
      - "-DSENTINEL_BUILD_TESTS=OFF"
      - "-DSENTINEL_BUILD_PLUGINS=ON"

  xinfer_forge:
    git_url: "https://github.com/kamisaberi/xinfer-forge.git"
    branch: "main"
    pip_install_flags:
      - "--no-cache-dir"

  sentinel_lab:
    git_url: "https://github.com/kamisaberi/sentinel-lab.git"
    branch: "main"
    cmake_flags:
      - "-DENABLE_OPENVINO=ON"
      - "-DBUILD_BENCHMARKS=ON"

  sentinel_nexus:
    git_url: "https://github.com/kamisaberi/sentinel-nexus.git"
    branch: "main"
    cmake_flags:
      - "-DNEXUS_BUILD_CLI=ON"
      - "-DNEXUS_BUILD_TESTS=OFF"

# ==============================================================================
# 3. SENTINEL-MATRIX INTEGRATION BRIDGE
# ==============================================================================
matrix_bridge:
  enabled: true
  matrix_dir: "/opt/sentinel-matrix"
  harvest_libraries: true
  sync_web_assets: true
```
```

---

## 2. Passing Custom Manifests

Override the default manifest at launch using the `--config` flag:

```bash
sudo ./install.sh --config /path/to/custom_stack.yaml
```

