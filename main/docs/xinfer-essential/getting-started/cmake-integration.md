# CMake Integration

Integrate `xinfer-essential` into external C++ applications using standard CMake patterns.

---

## 1. Using `find_package` (Installed Engine)

When `xinfer-essential` is installed globally (e.g., via `sudo ninja install`), consume it via its CMake configuration package:

```cmake
cmake_minimum_required(VERSION 3.24)
project(ThreatMitigationCore LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Locate xinfer-essential configuration
find_package(xinfer REQUIRED CONFIG)

add_executable(threat_monitor
    src/main.cpp
    src/flow_analyzer.cpp
)

# Link against the core interface target
target_link_libraries(threat_monitor
    PRIVATE
        xinfer::xinfer
)

# Enable aggressive optimization for the consumer
target_compile_options(threat_monitor PRIVATE -O3 -Wall -Wextra)
```

---

## 2. Using `FetchContent` (Direct Git Dependency)

To link `xinfer-essential` without requiring prior system installation, use CMake's `FetchContent` module:

```cmake
include(FetchContent)

FetchContent_Declare(
    xinfer_essential
    GIT_REPOSITORY https://github.com/kamisaberi/xinfer-essential.git
    GIT_TAG        v1.0.0
)

# Control build settings of the fetched dependency
set(XINFER_ENABLE_TESTS OFF CACHE BOOL "" FORCE)
set(XINFER_ENABLE_OPENVINO ON CACHE BOOL "" FORCE)

FetchContent_MakeAvailable(xinfer_essential)

add_executable(edge_agent src/main.cpp)
target_link_libraries(edge_agent PRIVATE xinfer::xinfer)
```

---

## 3. Header and Linker Flags Reference

When building projects manually or using custom build pipelines, specify the following compiler and linker options:

* **Include Path:** `-I/usr/local/include`
* **Library Flags:** `-L/usr/local/lib -lxinfer`
* **C++ Standard:** `-std=c++20`
* **Dynamic Linking:** `-Wl,-rpath,/usr/local/lib`

Ensure plugins can be found at runtime by setting the dynamic search environment variable if installed in non-standard paths:

```bash
export XINFER_PLUGIN_PATH=/usr/local/lib/xinfer-plugins
export LD_LIBRARY_PATH=/usr/local/lib:$LD_LIBRARY_PATH
```

