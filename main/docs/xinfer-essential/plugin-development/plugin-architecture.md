# Plugin Architecture & Dynamic Linker Mechanics

`xinfer-essential` decouples hardware acceleration runtimes (such as NVIDIA TensorRT, Intel OpenVINO, and Rockchip RKNN) from the foundational engine (`libxinfer.so`). Rather than statically or dynamically linking every vendor SDK into the main engine binary, backends are implemented as isolated, dynamically loaded shared libraries.

---

## 1. Why Dynamic Plugins?

* **Elimination of Dependency Bloat:** An edge node running an Intel NPU should not require NVIDIA CUDA drivers, Rockchip DRM libraries, or Qualcomm FastRPC packages to execute.
* **Resolution of Conflicting Vendor Symbols:** Different vendor SDKs often embed conflicting internal versions of common dependencies (such as Protobuf, OpenSSL, or Intel TBB). Dynamic isolation prevents symbol collision and memory corruption.
* **Independent Upgrade Cycles:** Hardware accelerator plugins can be updated, patched, or replaced on edge nodes without recompiling or redeploying the host application.

---

## 2. Dynamic Loader Flags: `RTLD_LAZY | RTLD_LOCAL`

Plugins are loaded using the POSIX `dlopen()` interface with strict encapsulation flags:

```text
Host Application (libxinfer.so)
       │
       ├── dlopen("libxinfer_openvino.so", RTLD_LAZY | RTLD_LOCAL)
       │      └─► Loads Intel Level Zero & OpenVINO symbols privately
       │
       └── dlopen("libxinfer_tensorrt.so", RTLD_LAZY | RTLD_LOCAL)
              └─► Loads CUDA & TensorRT symbols privately
```

### Loading Mechanism

```cpp
#include <dlfcn.h>
#include <string>
#include <xinfer/exception.hpp>

void* load_plugin_binary(const std::string& library_path) {
    // Clear any existing error flag
    ::dlerror();

    // RTLD_LAZY: Resolve symbols only as code instructions execute
    // RTLD_LOCAL: Symbols are NOT exported to subsequent libraries or host
    void* handle = ::dlopen(library_path.c_str(), RTLD_LAZY | RTLD_LOCAL);
    
    if (!handle) {
        const char* err_msg = ::dlerror();
        throw xinfer::InferenceException(
            xinfer::ErrorCode::ERR_PLUGIN_LOAD_FAILED,
            err_msg ? err_msg : "Unknown dynamic linker failure"
        );
    }
    
    return handle;
}
```

---

## 3. ABI Compatibility & Version Handshake

To prevent symbol mismatch bugs caused by compiler flags or ABI divergences, `xinfer-essential` enforces an immediate version handshake upon loading a plugin binary:

```cpp
#define XINFER_ABI_VERSION_MAJOR 1
#define XINFER_ABI_VERSION_MINOR 0
#define XINFER_ABI_VERSION_PATCH 0
#define XINFER_ABI_VERSION_STRING "1.0.0-cxx20"

extern "C" {
    // Each plugin MUST implement and export this un-mangled symbol
    XINFER_API const char* get_plugin_abi_version() {
        return XINFER_ABI_VERSION_STRING;
    }
}
```

The plugin loader invokes `get_plugin_abi_version()` immediately after `dlopen()`. If the returned string does not match `XINFER_ABI_VERSION_STRING`, `dlclose()` is executed immediately, and an `ERR_ABI_MISMATCH` exception is raised.

---

## 4. Plugin Discovery Paths

During initialization, `xinfer::PluginManager` searches the following paths in priority order:

1. Path defined by the environment variable `XINFER_PLUGIN_PATH`.
2. Explicit path specified in `EngineConfig::plugin_search_path`.
3. System default directory: `/usr/local/lib/xinfer-plugins/`.
4. Embedded application directory: `./plugins/`.

