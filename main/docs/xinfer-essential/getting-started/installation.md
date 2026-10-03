# Installation

> **Status:** Draft — placeholder content. Final technical prose is forthcoming.


Build from source, package managers, and binary installation.

## From source

Clone, configure with CMake, build, and install. See the commands below.

## Packages

Debian (.deb) and RPM repositories are published per release tag; air-gapped bundles (.snbundle) cover classified sites.

```bash
$ git clone https://github.com/kamisaberi/xinfer.git
$ cmake -S xinfer -B build -DCMAKE_BUILD_TYPE=Release
$ cmake --build build -j$(nproc)
$ sudo cmake --install build
```

---

*Part of the xinfer-essential documentation set. See mkdocs.yml for navigation.*
