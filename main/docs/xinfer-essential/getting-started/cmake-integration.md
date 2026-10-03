# CMake Integration

> **Status:** Draft — placeholder content. Final technical prose is forthcoming.


Link libxinfer.so via find_package or target_link_libraries.

## find_package style

Preferred for system installs: find_library + find_path, then target_link_libraries.

## Vendored style

add_subdirectory(xinfer) exposes the xinfer::xinfer target with identical ABI.

```cmake
find_library(XINFER_LIB xinfer REQUIRED PATHS /usr/local/lib)
find_path(XINFER_INCLUDE_DIR xinfer/xinfer.hpp)
add_executable(app src/main.cpp)
target_link_libraries(app PRIVATE ${XINFER_LIB} pthread)
```

---

*Part of the xinfer-essential documentation set. See mkdocs.yml for navigation.*
