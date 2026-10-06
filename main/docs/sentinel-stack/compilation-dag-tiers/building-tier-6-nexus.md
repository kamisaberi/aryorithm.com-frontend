# Tier 6 Build Mechanics: `sentinel-nexus` (`sentinel-nexus` & `nexus-ctl`)

`sentinel-nexus` is the master fleet command plane. It links against gRPC, Protocol Buffers, OpenSSL, and internal data structures, compiling the command daemon, operations CLI, and embedded web UI.

---

## 1. Compilation Commands

```bash
cd /opt/sentinel-stack/src/nexus
mkdir -p build && cd build

cmake -G Ninja \
    -DCMAKE_BUILD_TYPE=Release \
    -DCMAKE_CXX_COMPILER=clang++-16 \
    -DCMAKE_INSTALL_PREFIX=/usr/local \
    -DNEXUS_BUILD_CLI=ON \
    -DNEXUS_BUILD_TESTS=OFF ..

ninja -j"${PARALLEL_JOBS}"
ninja install
ldconfig
```

### Deployed Artifacts:
* `/usr/local/bin/sentinel-nexus`: Fleet command daemon.
* `/usr/local/bin/nexus-ctl`: Administrative CLI tool.

---

## 2. Verification Assertion

```bash
nexus-ctl --version
# Expected Output: nexus-ctl version 2.4.0 (Aryorithm Fleet Command CLI)
```

