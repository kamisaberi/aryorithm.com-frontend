# Common Build & Compilation Errors

This guide provides remediation steps for compiler, CMake, and toolchain issues encountered when building `xinfer-essential` from source.

---

## 1. Compiler Toolchain & C++20 Feature Failures

### Symptom
```text
error: 'span' in namespace 'std' does not name a template type
error: concepts are not available with -std=c++17
fatal error: format: No such file or directory
```

### Cause
The compiler in use does not support ISO C++20 standard library features. GCC versions prior to 12.1.0 or Clang versions prior to 16.0.0 lack complete implementations of `<format>`, `<ranges>`, and concepts.

### Remediation
Explicitly specify Clang 16+ or GCC 12+ during CMake configuration:

```bash
# Ubuntu / Debian
sudo apt-get install -y clang-16 lld-16

# Configure with explicit compiler binaries
cmake -B build -G Ninja \
    -DCMAKE_CXX_COMPILER=clang++-16 \
    -DCMAKE_C_COMPILER=clang-16 \
    -DCMAKE_BUILD_TYPE=Release
```

---

## 2. GLIBC Version Collisions (`GLIBC_2.xx not found`)

### Symptom
```text
./hello_xinfer: /lib/x86_64-linux-gnu/libm.so.6: version 'GLIBC_2.43' not found (required by libxinfer.so)
```

### Cause
The engine binary was compiled on a host running an updated GNU C Library (e.g., Ubuntu 26.04 Noble/Devel with glibc 2.43) and subsequently copied to an older host environment (e.g., Ubuntu 22.04 LTS with glibc 2.35).

### Remediation
1. **Container Alignment:** Build inside a Docker container matching the target deployment baseline (`FROM ubuntu:24.04` or `FROM ubuntu:devel`).
2. **Static Toolchain Linking:** Ensure external system dependencies are resolved using the host target's native sysroot.

---

## 3. Missing Git Submodules

### Symptom
```text
fatal error: nlohmann/json.hpp: No such file or directory
CMake Error at cmake/FindOpenVINO.cmake: Submodule 'third_party/openvino-headers' not populated.
```

### Remediation
Update and initialize all nested Git submodules:

```bash
git submodule update --init --recursive
```

---

## 4. CMake Dependency Resolution Failures

### Symptom
```text
CMake Error at CMakeLists.txt:45 (find_package):
  By not providing "FindOpenSSL.cmake" in CMAKE_MODULE_PATH...
```

### Remediation
Install the necessary development libraries:

```bash
sudo apt-get install -y \
    pkg-config \
    libssl-dev \
    libfmt-dev \
    libspdlog-dev \
    ninja-build
```

