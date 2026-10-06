# Dynamic Linker Cache Refreshes (`ldconfig`)

In Linux, newly installed shared libraries in `/usr/local/lib` are invisible to downstream compiler link steps until the system dynamic linker cache (`/etc/ld.so.cache`) is refreshed.

---

## 1. The Inter-Tier Linker Refresh Invariant

`03_build_all_tiers.sh` enforces an explicit `ldconfig` run immediately after installing each tier:

```bash
# Topological step:
build_tier_1
ninja install
ldconfig # Updates /etc/ld.so.cache with libxinfer.so

build_tier_2
ninja install
ldconfig # Updates /etc/ld.so.cache with libblackbox.so

build_tier_3 # Successfully resolves -lxinfer and -lblackbox!
```

---

## 2. Custom Library Search Path Configuration

Phase 1 registers `/usr/local/lib` and the plugin directory in `/etc/ld.so.conf.d/sentinel.conf`:

```text
/usr/local/lib
/usr/local/lib/sentinel-plugins
/usr/local/lib/matrix-deps
```

This guarantees that both the host operating system and container runtimes resolve Aryorithm shared libraries without requiring manual `LD_LIBRARY_PATH` exports.

