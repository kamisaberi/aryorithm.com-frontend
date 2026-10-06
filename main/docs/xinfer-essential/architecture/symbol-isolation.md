# Symbol Isolation & Dynamic Linker Boundaries

Edge security appliances often link against complex, conflicting software stacks: varying versions of OpenSSL, Protobuf, gRPC, Level Zero, or CUDA runtimes. Unrestricted symbol visibility across shared library boundaries leads to One Definition Rule (ODR) violations, symbol collision, and difficult-to-diagnose runtime crashes.

`xinfer-essential` enforces strict dynamic linker boundaries.

---

## 1. Symbol Visibility Rules

The core engine and all dynamic plugins are compiled with hidden symbol visibility by default:

```cmake
# Enforced globally across all CMake targets in xinfer-essential
set(CMAKE_CXX_VISIBILITY_PRESET hidden)
set(CMAKE_VISIBILITY_INLINES_HIDDEN ON)
```

Only classes, functions, and interfaces explicitly decorated with the `XINFER_API` macro are exported in the dynamic symbol table (`.dynsym`).

```cpp
#if defined(_WIN32) || defined(__CYGWIN__)
  #if defined(XINFER_BUILD_EXPORT)
    #define XINFER_API __declspec(dllexport)
  #else
    #define XINFER_API __declspec(dllimport)
  #endif
#else
  #if defined(__GNUC__) && __GNUC__ >= 4
    #define XINFER_API __attribute__((visibility("default")))
  #else
    #define XINFER_API
  #endif
#endif
```

---

## 2. Dynamic Plugin Loading via `dlopen`

Acceleration backend plugins (`libxinfer_openvino.so`, `libxinfer_tensorrt.so`) are loaded dynamically at runtime using `dlopen`. 

To prevent plugin-specific symbols (e.g., vendor-bundled dependencies like Protobuf or TBB) from polluting the host namespace, `xinfer-essential` isolates plugin symbols using explicit loader flags:

```cpp
void* handle = dlopen(plugin_path.c_str(), RTLD_LAZY | RTLD_LOCAL);
if (!handle) {
    throw InferenceException(
        ErrorCode::ERR_PLUGIN_LOAD_FAILED,
        fmt::format("Failed to load plugin {}: {}", plugin_path, dlerror())
    );
}
```

### Linker Flags Rationale

* **`RTLD_LAZY`:** Resolves undefined symbol relocations only as execution instructions require them, reducing engine startup latency.
* **`RTLD_LOCAL`:** Symbols defined inside the loaded plugin are **not** made available to subsequently loaded libraries or the host application. This isolates conflicting vendor library versions.

---

## 3. ABI Boundary Verification: Factory Symbol Export

Plugins export a single, un-mangled C-linkage entry symbol to instantiate backend handles:

```cpp
extern "C" {
    XINFER_API xinfer::IInferencePlugin* create_xinfer_plugin();
    XINFER_API void destroy_xinfer_plugin(xinfer::IInferencePlugin* plugin);
    XINFER_API const char* get_plugin_abi_version();
}
```

### Loading Routine

```cpp
// 1. Resolve ABI version string
using GetAbiVerFn = const char* (*)();
auto get_abi_ver = reinterpret_cast<GetAbiVerFn>(dlsym(handle, "get_plugin_abi_version"));

if (!get_abi_ver || std::string_view(get_abi_ver()) != XINFER_ABI_VERSION_STRING) {
    dlclose(handle);
    throw InferenceException(ErrorCode::ERR_ABI_MISMATCH, "Plugin ABI version mismatch");
}

// 2. Resolve Factory Constructor
using CreatePluginFn = xinfer::IInferencePlugin* (*)();
auto create_plugin = reinterpret_cast<CreatePluginFn>(dlsym(handle, "create_xinfer_plugin"));

// 3. Instantiate Plugin Interface Object
xinfer::IInferencePlugin* plugin_instance = create_plugin();
```

---

## 4. Validating Shared Library Symbols

Use `nm` to confirm internal symbols are hidden from the export table:

```bash
nm -D --defined-only lib/libxinfer.so
```

### Expected Output
The output should contain only `xinfer::` names explicitly marked with `XINFER_API`:

```text
0000000000021a40 T create_xinfer_plugin
0000000000021b10 T destroy_xinfer_plugin
000000000001f3e0 T _ZN6xinfer15InferenceEngine7forwardEv
000000000001ef10 T _ZN6xinfer15InferenceEngine10initializeEv
```

Internal framework symbols, vendor dependencies, and utility routines must not appear in the dynamic symbol table.

