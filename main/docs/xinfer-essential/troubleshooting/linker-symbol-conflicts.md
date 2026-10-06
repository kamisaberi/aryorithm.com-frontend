# Linker & Dynamic Symbol Conflict Diagnostics

Dynamic plugins and consumer binaries can encounter symbol visibility conflicts, One Definition Rule (ODR) violations, or library path lookup failures.

---

## 1. Undefined Reference to `xinfer::InferenceEngine`

### Symptom
```text
/usr/bin/ld: main.cpp:(.text+0x42): undefined reference to `xinfer::InferenceEngine::initialize()'
/usr/bin/ld: main.cpp:(.text+0x68): undefined reference to `xinfer::InferenceEngine::forward()'
clang-16: error: linker command failed with exit code 1
```

### Cause
The consumer application compiled against the header files (`<xinfer/xinfer.hpp>`) but did not link against the shared object (`libxinfer.so`), or the linker flag was placed before the source object on the command line.

### Remediation
Ensure `-lxinfer` is passed **after** your source files, and configure `RPATH`:

```bash
# Correct link invocation
clang++-16 -std=c++20 main.cpp -o main \
    -I/usr/local/include \
    -L/usr/local/lib \
    -lxinfer \
    -Wl,-rpath,/usr/local/lib
```

---

## 2. Resolving Shared Library Search Paths (`RPATH` vs. `LD_LIBRARY_PATH`)

### Symptom
```text
./main: error while loading shared libraries: libxinfer.so.1: cannot open shared object file: No such file or directory
```

### Remediation
If installed to `/usr/local/lib`, refresh the system dynamic linker cache:

```bash
sudo ldconfig
```

If deployed in a custom directory, set `LD_LIBRARY_PATH` or configure CMake with embedded `INSTALL_RPATH`:

```bash
export LD_LIBRARY_PATH=/opt/xinfer/lib:$LD_LIBRARY_PATH
```

In your project's `CMakeLists.txt`:
```cmake
set_target_properties(my_app PROPERTIES
    BUILD_WITH_INSTALL_RPATH TRUE
    INSTALL_RPATH "/usr/local/lib;/opt/xinfer/lib"
)
```

---

## 3. Detecting Leaking Plugin Symbols (ODR Violations)

If two dynamic plugins link conflicting versions of a third-party library (e.g., Protobuf or Intel TBB), the process may crash with `SIGSEGV` during `dlopen()`.

### Diagnostic Audit
Verify that the plugin shared library exports **only** the factory methods and hides internal dependencies:

```bash
nm -D --defined-only /usr/local/lib/xinfer-plugins/libxinfer_openvino.so | grep " T "
```

### Expected Output
```text
0000000000012040 T create_xinfer_plugin
0000000000012110 T destroy_xinfer_plugin
0000000000012130 T get_plugin_abi_version
```

If thousands of third-party symbols appear with global `T` visibility, the plugin was compiled without `-fvisibility=hidden`. Recompile the plugin with:

```cmake
set(CMAKE_CXX_VISIBILITY_PRESET hidden)
set(CMAKE_VISIBILITY_INLINES_HIDDEN ON)
```

