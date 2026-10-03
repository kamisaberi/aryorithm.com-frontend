# Installation & Build

> **Status:** Draft — placeholder content. Final technical prose is forthcoming.


Building the daemon, nexus-ctl CLI, tests, and benchmarks.

## Build

CMake superbuild compiles daemon, CLI, and test harness together.

## Install

Binaries to /usr/local/bin, SPA to /opt/sentinel-nexus/web.

```bash
$ cmake -S sentinel-nexus -B build -DCMAKE_BUILD_TYPE=Release
$ cmake --build build -j$(nproc)
$ sudo cmake --install build
$ nexus-ctl --version
```

---

*Part of the sentinel-nexus documentation set. See mkdocs.yml for navigation.*
