# Common Build Errors

> **Status:** Draft — placeholder content. Final technical prose is forthcoming.


Missing compilers, CMake version mismatches, and missing drivers.

## cmake < 3.20

Upgrade or use the bundled cmake-installer script; the configure step fails fast with the exact version found.

## No C++20

GCC 12+ / Clang 16+ required; check with g++ --version and c++ -dM for __cplusplus.

```bash
$ g++ --version   # need 12+
$ cmake --version   # need 3.20+
$ ls /dev/rknpu* /dev/nvidia* 2>/dev/null  # accelerator nodes
```

---

*Part of the xinfer-essential documentation set. See mkdocs.yml for navigation.*
