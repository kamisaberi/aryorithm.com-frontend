# Building & Installing `xinfer-essential`

This guide covers building the core runtime library (`libxinfer.so`), its configuration tools, and the backend hardware plugins from source.

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
    libfmt-dev \
    libspdlog-dev \
    nlohmann-json3-dev
```

---

## 2. Clone the Repository

Clone the project repository along with its hardware abstraction submodules:

```bash
git clone --recurse-submodules https://github.com/kamisaberi/xinfer-essential.git
cd xinfer-essential
```

If you cloned without `--recurse-submodules`, initialize them manually:

```bash
git submodule update --init --recursive
```

---

## 3. Configure the Build Environment

`xinfer-essential` provides explicit CMake feature flags to control which hardware plugins are built. Backends whose SDKs are missing are disabled by default.

```bash
mkdir build && cd build

# Standard configuration with OpenVINO and CPU Fallback
cmake -G Ninja \
    -DCMAKE_BUILD_TYPE=Release \
    -DCMAKE_CXX_COMPILER=clang++-16 \
    -DCMAKE_INSTALL_PREFIX=/usr/local \
    -DXINFER_BUILD_PLUGINS=ON \
    -DXINFER_ENABLE_OPENVINO=ON \
    -DXINFER_ENABLE_TENSORRT=OFF \
    -DXINFER_ENABLE_TESTS=ON ..
```

### Common CMake Configuration Options

| Flag | Default | Description |
| :--- | :--- | :--- |
| `CMAKE_BUILD_TYPE` | `Release` | Build mode (`Release`, `Debug`, `RelWithDebInfo`). |
| `XINFER_ENABLE_CUDA` | `OFF` | Enables the NVIDIA CUDA memory allocator. |
| `XINFER_ENABLE_TENSORRT` | `OFF` | Compiles `libxinfer_tensorrt.so` plugin. |
| `XINFER_ENABLE_OPENVINO` | `ON` | Compiles `libxinfer_openvino.so` plugin. |
| `XINFER_ENABLE_RKNN` | `OFF` | Compiles `libxinfer_rknn.so` for Rockchip SoCs. |
| `XINFER_ENABLE_HAILO` | `OFF` | Compiles `libxinfer_hailo.so` for Hailo-8. |
| `XINFER_ENABLE_ZERO_COPY` | `ON` | Enables direct DMA-BUF and host-pinned memory hooks. |
| `XINFER_BUILD_TESTS` | `ON` | Compiles validation suites and unit tests. |

---

## 4. Compile the Codebase

Execute the build using Ninja:

```bash
ninja -j$(nproc)
```

The build produces the following core artifacts in `build/lib/` and `build/bin/`:

* `libxinfer.so`: The core runtime engine.
* `libxinfer_openvino.so`: Intel OpenVINO acceleration plugin (if enabled).
* `libxinfer_tensorrt.so`: NVIDIA TensorRT acceleration plugin (if enabled).
* `xinfer-diag`: Command-line diagnostics and hardware identification utility.

---

## 5. Install System-Wide

Install libraries, dynamic plugins, and C++ header interfaces to `/usr/local`:

```bash
sudo ninja install
sudo ldconfig
```

### Deployed File Hierarchy

```text
/usr/local/
├── include/
│   └── xinfer/
│       ├── xinfer.hpp
│       ├── inference_engine.hpp
│       ├── tensor.hpp
│       ├── memory.hpp
│       └── plugin_interface.hpp
├── lib/
│   ├── libxinfer.so -> libxinfer.so.1.0.0
│   ├── libxinfer.so.1
│   ├── libxinfer.so.1.0.0
│   └── xinfer-plugins/
│       ├── libxinfer_openvino.so
│       └── libxinfer_tensorrt.so
└── bin/
    └── xinfer-diag
```

